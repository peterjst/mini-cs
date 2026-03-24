# Bot AI Enhancement — Design Spec

Make bots behave like real players instead of NPCs. Five interconnected systems: field of view, purposeful navigation, ambush behavior, distance-based sound awareness, and pre-aiming with corner checking.

## 1. Field of View (120° Vision Cone)

Add an angle check to `_canSeePlayer()` before the existing raycast. The bot's facing direction (derived from `mesh.rotation.y`) defines a forward vector. If the angle between forward and the direction-to-player exceeds 60° (half of 120°), return `false`.

**Implementation**: Compute `cos(angle)` via dot product between the bot's forward vector and the normalized vector to the player. If the result is less than `cos(60°) ≈ 0.5`, the player is outside the bot's FOV.

**Difficulty scaling on peripheral awareness**: If the player is in the outer 30° of the cone (angle between 30°–60° from center), add a flat penalty to reaction delay (avoids multiplicative stacking with existing personality and difficulty multipliers):
- Easy: +0.3s additional reaction delay for peripheral detections
- Normal: +0.15s
- Hard: +0.05s
- Elite: No penalty

**Team mode**: FOV applies uniformly to all targets. `_findNearestTarget` (used for bot-vs-bot combat in team mode) must also respect FOV — add the same dot-product check so bots cannot detect enemies behind them regardless of whether the target is the player or another bot.

**Edge case**: Bots in ATTACK state already track the player with `_facePlayer()`, so their FOV naturally stays centered on the target. FOV matters most during PATROL, INVESTIGATE, RETREAT, and the new AMBUSH state.

## 2. Purposeful Navigation (Personality-Driven Strategic Positioning)

Replace random waypoint selection in PATROL with a weighted scoring system. When a bot reaches a waypoint, each candidate gets scored and the bot picks from the top options.

### Scoring Factors

- **Sightline quality**: Raycast from the waypoint in 4 cardinal directions (+X, -X, +Z, -Z). Score = sum of unobstructed distances (capped at sight range). Only scored for the already-reachable candidate set (filtered by the existing wall raycast at line 1076).
- **Proximity to last-known player area**: If the bot or a teammate has seen the player recently, waypoints toward that area score higher. Creates hunting behavior.
- **Time since last visited**: Each bot maintains a `_waypointVisitTimes` array (one timestamp per waypoint index, initialized to 0, reset between rounds). Waypoints not visited recently score higher. Prevents looping and creates natural clearing/sweep patterns.
- **Distance from other bots**: Waypoints far from teammates score slightly higher. Prevents clumping and creates map spread. Bot positions are passed as an array parameter to the scoring function, computed once per scoring call in the PATROL state behavior block from `EnemyManager.enemies`.

### Personality Weighting

- **Aggressive**: Heavily weights proximity to last-known player position. Hunts actively. Low weight on sightline quality (pushes rather than holds angles).
- **Cautious**: Heavily weights sightline quality. Seeks positions with long sightlines and nearby cover. Holds strong positions rather than pushing.
- **Balanced**: Even weights across all factors.

### Difficulty Scaling (Random Noise on Scores)

- Easy: ±60% noise (semi-random, occasionally good picks)
- Normal: ±30% noise
- Hard: ±15% noise
- Elite: ±5% noise (near-optimal positioning)

Uses existing waypoint arrays from maps. Scoring happens at waypoint selection time only, not every frame. The scoring function should be extracted as a testable method: `_scoreWaypoint(candidate, context)` where context includes ally positions, last-known player position, and visit timestamps.

## 3. Ambush (New AMBUSH State)

Add `AMBUSH = 6` to the FSM. The bot holds position near cover, faces the expected approach direction, and waits for the player to enter its FOV before opening fire.

### Entry Conditions (all must be true)

- Bot is in PATROL or INVESTIGATE
- Bot received a sound alert (has an investigate position)
- Bot is near cover (wall within 2 units, reusing `_findNearestCover` logic)
- Personality roll passes (rolled **once per sound event** in `reportSound`, not per frame): Cautious 60%, Balanced 30%, Aggressive 10%

### Behavior

- **Hold position**: Bot stops moving
- **Face approach direction**: Orients toward the sound source / last-known player direction (using the imprecise position from the sound system)
- **Wait**: Up to a personality-based timeout (cautious waits longer, 6–10s)
- **Spring the trap**: When the player enters FOV and reaction delay passes, transition to ATTACK. At this transition, set `_hasReacted = true` and reduce `_reactionDelay` by the difficulty-based bonus multiplier (bot was pre-aimed and expecting the player). Also set `_engageStartHP = this.health`.
- **Timeout**: If the player doesn't appear, transition to PATROL with the next waypoint scored toward the sound's origin

### Difficulty Scaling

| Factor | Easy | Normal | Hard | Elite |
|--------|------|--------|------|-------|
| Personality roll modifier | ×0.5 (halved) | ×1.0 | ×1.1 (+10%) | ×1.2 (+20%) |
| Wait timeout | 3–5s | 6–10s | 6–10s | 8–12s |
| Reaction delay bonus | None (×1.0) | ×0.7 | ×0.5 | ×0.4 |

### Transitions Out

- **→ ATTACK**: Player enters FOV and reaction passes. Set `_hasReacted = true`, apply reaction delay bonus, set `_engageStartHP`.
- **→ PATROL**: Timeout expires.
- **→ RETREAT**: Bot takes damage while in AMBUSH and `health < maxHealth * personality.retreatHP`. This check lives in the AMBUSH state block of `update()`, evaluated each frame — if `this.health < this._ambushEntryHP * this.personality.retreatHP`, find a retreat waypoint and transition.
- **→ ATTACK**: Bot takes damage while in AMBUSH but HP is above retreat threshold and attacker is visible (canSee). Set `_engageStartHP = this.health`.

Store `_ambushEntryHP = this.health` when entering AMBUSH for the damage threshold check.

## 4. Distance-Based Sound Awareness

Modify `EnemyManager.reportSound()` to pass imprecise positions based on distance instead of the exact player position.

### Three Distance Tiers

| Tier | Range | Position Error | Feel |
|------|-------|----------------|------|
| Close | <8 units | Exact position | "Right around the corner" |
| Mid-range | 8–20 units | ±3 units (random offset) | "Somewhere over there" |
| Far | >20 units | ±8 units (random offset) | "Vague direction" |

### Personality Modifiers

- **Cautious**: One tier better precision — close range extends to 12 units, mid-range extends to 25 units. More attentive listeners.
- **Aggressive/Balanced**: Standard thresholds.

### Difficulty Scaling

| Factor | Easy | Normal | Hard | Elite |
|--------|------|--------|------|-------|
| Close threshold | 5 units | 8 units | 8 units | 10 units |
| Mid error | ±6 units | ±3 units | ±2.25 units | ±1.5 units |
| Far error | ±16 units | ±8 units | ±6 units | ±4 units |

### Team Mode

`reportSound` receives a `team` parameter indicating which team produced the sound. Bots ignore sounds from their own team. In non-team modes, the parameter is null and all bots respond (current behavior).

### Integration with Ambush

When a bot enters AMBUSH from a sound alert, it faces the imprecise position it received — not the real player position. A far sound may cause the bot to face slightly the wrong direction, which the player can exploit.

## 5. Pre-Aiming + Corner Checking

### Pre-Aiming Threat Angles

While moving between waypoints, the bot orients toward the nearest threat angle (openings where enemies could appear) instead of facing its movement direction.

**How it works**:
- Raycast in 8 directions (reusing `COLLISION_DIRS`) to detect nearby walls. Openings between walls (doorways, corridor ends, corners) are threat angles.
- Bot's aim rotates toward the nearest opening while the body continues along the path.
- If no openings detected (open area), default to facing movement direction.
- Refresh rate: Recalculate every 0.5s (not every frame).

**Rotation ownership**: `_moveToward` receives a `skipRotation` boolean flag. When pre-aiming is active (bot has a valid threat angle target), pass `skipRotation = true` and handle rotation separately via a `_faceDirection(targetAngle, dt)` call. When no threat angle exists, pass `skipRotation = false` for default movement-direction facing.

### Corner Checking (Pause-and-Slice)

When a bot detects a wall corner within 3 units ahead (wall on one side, open on the other), it briefly pauses and sweeps its facing angle around the corner before committing.

- If the sweep reveals the player (FOV + raycast), transition to ATTACK.
- If clear, proceed.
- Applies in PATROL, INVESTIGATE, and CHASE states. Not during RETREAT.
- **Stuck detection**: Reset `_stuckTimer` to 0 when entering a corner check pause, so the 4-second stuck teleport is not triggered by deliberate pauses.

### Personality Influence

| Trait | Cautious | Balanced | Aggressive |
|-------|----------|----------|------------|
| Corner check rate | 100% | 60% | 25% |
| Sweep width | 90° | 60° | 45° |
| Sweep style | Slow, methodical | Standard | Quick |

### Difficulty Scaling

| Factor | Easy | Normal | Hard | Elite |
|--------|------|--------|------|-------|
| Corner check rate | ×0.5 of personality base | ×1.0 | ×1.15 | ×1.25 |
| Pre-aim refresh | 1.0s | 0.5s | 0.4s | 0.3s |
| Sweep pause duration | 0.3–0.5s | 0.3–0.5s | 0.3–0.5s | 0.2s |

## State Machine Summary

Updated FSM with 7 states:

```
PATROL → CHASE (sees player) | AMBUSH (hears player + near cover + personality roll)
CHASE → ATTACK (in range) | INVESTIGATE (lost sight)
ATTACK → INVESTIGATE (lost sight) | RETREAT (low HP) | TAKE_COVER (reloading)
INVESTIGATE → ATTACK/CHASE (sees player) | AMBUSH (hears new sound + conditions met) | PATROL (timeout)
RETREAT → ATTACK (arrived + can fight) | PATROL (arrived + can't fight)
TAKE_COVER → ATTACK (done reloading + sees player) | PATROL (done + no target)
AMBUSH → ATTACK (player enters FOV) | PATROL (timeout) | RETREAT (took damage, low HP)
```

## Files Modified

- `js/enemies.js` — All 5 systems (FOV check, navigation scoring, AMBUSH state, sound precision, pre-aim + corner check)
- `REQUIREMENTS.md` — Update bot AI section with new behaviors, states, and difficulty scaling
- `tests/unit/enemies.test.js` — Tests for FOV, navigation scoring, ambush entry/exit, sound precision, corner checking

## Testability Notes

- **FOV**: Construct Enemy with known `mesh.rotation.y`, call `_canSeePlayer` with positions at known angles.
- **Navigation**: Extract scoring as `_scoreWaypoint(candidate, context)` method for direct unit testing.
- **Ambush**: Set up entry conditions, verify state transitions. Personality roll uses injectable random or seeded value for deterministic tests.
- **Sound**: Call `reportSound` with known positions/distances, verify `_investigatePos` falls within expected error bounds.
- **Corner checking**: Expose corner-detection as a pure function taking raycast results. Reset stuck timer is testable via state inspection.

## Approach

Layered enhancement on the existing FSM. Each system is independently testable and builds on existing code patterns (raycasts, personality weights, difficulty params). No changes to map files or waypoint data needed.
