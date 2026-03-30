# Enemy AI Active Movement Design

## Problem

Enemies frequently stand completely still — during combat (HOLD move, micro-pauses, burst cooldowns), while patrolling (waypoint pauses), and while investigating (stationary rotation). On hard/elite difficulty this makes them feel broken and easy to kill.

## Goal

Eliminate all "sitting duck" moments. Enemies should always have visible motion. Scale activity level by difficulty: easy bots can be slower and more passive, hard/elite bots should be relentlessly active.

## Design

### 1. Difficulty-Scaled Idle Elimination

#### HOLD Combat Move Durations

| Difficulty | Duration | Behavior |
|------------|----------|----------|
| Easy | 0.8-1.5s (unchanged) | Full decelerate to zero |
| Normal | 0.5-1.0s | Full decelerate to zero |
| Hard | 0.3-0.6s | Micro-strafe drift at ~15-20% speed instead of zero |
| Elite | Removed from pool | Weight redistributed to strafe/push |

#### Micro-Pause Between Combat Moves

| Difficulty | Chance | Duration | Behavior |
|------------|--------|----------|----------|
| Easy | 15% | 0.2-0.4s | Dead stop (unchanged) |
| Normal | 10% | 0.15-0.3s | Dead stop |
| Hard | 5% | 0.1-0.2s | Slow drift at ~10% speed |
| Elite | 0% | N/A | No micro-pauses |

#### Burst Cooldown Between Bursts

| Difficulty | Cooldown Range |
|------------|---------------|
| Easy | 0.3-0.8s (unchanged) |
| Normal | 0.25-0.6s |
| Hard | 0.2-0.4s |
| Elite | 0.15-0.3s |

#### Investigate State Look-Around Time

| Difficulty | Duration | Behavior |
|------------|----------|----------|
| Easy | 3-4s (unchanged) | Stationary rotation |
| Normal | 2.5-3.5s | Stationary rotation |
| Hard | 1.5-2s | Slow movement in small circle while rotating |
| Elite | 1.0-1.5s | Slow movement in small circle while rotating |

#### Patrol Pause at Waypoints

| Difficulty | Pause Duration |
|------------|---------------|
| Easy | personality.patrolPause (unchanged) |
| Normal | personality.patrolPause * 0.7 |
| Hard | personality.patrolPause * 0.3 |
| Elite | 0 (no pause) |

### 2. Active Repositioning (New Combat Move)

New `COMBAT_MOVE.REPOSITION` — bot moves to a new angle on the player while maintaining roughly the same engagement distance.

#### Target Selection

1. Calculate current angle from player to enemy
2. Cast rays at 30, 45, 60, 90 degree offsets (both clockwise and counter-clockwise) from that angle
3. For each candidate point (at current distance from player along that ray):
   - Check walkability: no wall within 1 unit of candidate position
   - Check LOS to player from candidate position (prefer positions with LOS)
   - Score: LOS bonus (50) + distance-from-current-pos bonus (prefer farther repositions)
4. Pick highest-scoring candidate
5. Fallback: if no valid reposition point found, reroll as push or strafe

#### Movement During Reposition

- Move at full base speed toward target point
- Continue firing if LOS to player exists during movement
- Face player while moving (use `_facePlayer` + `_moveToward` with `skipRotation`)
- Duration: until arrival or 2s max, whichever comes first

#### Weight in Combat Move Pool

| Personality | Base Weight |
|-------------|------------|
| Aggressive | 0.20 |
| Balanced | 0.15 |
| Cautious | 0.10 |

Weight doubles if the bot has been in a stale position (see Section 3).

#### Stale Position Trigger

Independent of weighted random selection, a stale position check forces REPOSITION:

| Difficulty | Stale Threshold |
|------------|----------------|
| Easy | 6.0s |
| Normal | 4.0s |
| Hard | 2.5s |
| Elite | 1.8s |

Also triggered when bot takes 3+ hits without having moved more than 2 units from the position where the first hit landed.

### 3. Continuous Combat Movement

Zero fully-stationary frames during ATTACK state.

#### HOLD Becomes Micro-Drift

On hard/elite, HOLD behavior changes from `_currentSpeed *= 0.9` (decelerate to zero) to slow random drift at 15-20% of base speed. Small random direction changes every 0.3-0.5s. On elite, HOLD is removed entirely (weight set to 0, redistributed).

#### Micro-Pause Becomes Slow Drift

On hard/elite, during the brief pause between combat moves, the bot drifts at ~10% of base speed in its current direction instead of stopping completely. On elite, micro-pauses are removed entirely.

#### Reload Auto-Strafe

When reloading while in ATTACK state (and NOT transitioning to TAKE_COVER), the bot auto-strafes at 60% of base speed. Uses the existing `_strafe()` method. This replaces the current behavior where a reloading bot in ATTACK simply stands still.

#### Stale Position Failsafe

If a bot in ATTACK state hasn't moved more than 1 unit from its position 2 seconds ago, force a combat move reroll excluding HOLD. This catches any edge case where movement code fails to produce actual displacement (wall collisions, stuck states, etc.).

Implementation: track `_combatStalePos` and `_combatStaleTimer`. Every frame in ATTACK, increment timer. When timer exceeds 2s, check displacement. If < 1 unit, reroll. Reset timer and position after reroll.

## Files Changed

- `js/enemies.js` — all behavioral changes (combat moves, difficulty scaling, repositioning)
- `REQUIREMENTS.md` — document new behaviors and tuning values

## Testing

- Difficulty-scaled parameter values: verify HOLD durations, micro-pause chances, burst cooldowns, investigate times, patrol pauses match tables above for each difficulty
- REPOSITION target selection: verify candidate scoring, fallback behavior, and max duration cap
- Stale position failsafe: verify reroll triggers when bot hasn't moved > 1 unit in 2s during ATTACK
- Reload auto-strafe: verify bot strafes during reload in ATTACK state
- Existing AI tests continue to pass
