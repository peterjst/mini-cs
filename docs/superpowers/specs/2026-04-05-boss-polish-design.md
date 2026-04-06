# Boss Polish — Intensive Atmosphere, Smarter Combat, Rewarding Kill

## Overview

Polish the boss encounter into a full climactic arc: atmospheric escalation through phases, smarter combat with a charge attack and adaptive AI, and a spectacular kill payoff. Also strengthen the phase transition shield.

## 1. Atmosphere Escalation

### Heartbeat System

A procedural heartbeat sound (two-thump pattern via Web Audio oscillators) runs continuously while the boss is alive.

| Phase | BPM | Gain |
|-------|-----|------|
| 1     | 60  | 0.15 |
| 2     | 90  | 0.25 |
| 3     | 120 | 0.35 |

- New `Sound.bossHeartbeat` — plays a single two-thump beat; called from the game loop on a frame-based interval timer (60/BPM seconds between calls)
- BPM and gain lerp smoothly on phase transition (not instant)
- Heartbeat timer ticked from game loop alongside `_updateBossShield` / `_updateBossBarrage`
- On boss death: quick fade-out over ~0.3s, then stop (clear interval timer)

### Color Grading Shifts

Lerp post-processing uniforms over ~2s on each phase transition. Values are additive overlays on top of the map's base color grade.

| Parameter       | Phase 1   | Phase 2   | Phase 3   |
|-----------------|-----------|-----------|-----------|
| Red tint mult   | 1.0       | 1.08      | 1.15      |
| Vignette add    | +0.1      | +0.2      | +0.35     |
| Contrast        | base      | 1.1       | 1.15      |
| Saturation      | base      | base      | 0.85      |

- Store boss atmosphere overlay state in a `_bossAtmosphere` object
- Each frame, lerp current values toward target values (`lerpSpeed = 1.0`, so ~2s to converge)
- On boss death: lerp back to map defaults over ~1.5s

### Phase Transition Punch

On each phase change (in addition to existing shield + sound):

- Screen shake at intensity 0.15 (stronger than grenade's 0.08)
- Vignette flash: spike to +0.5 above current target, ease back over 0.5s

## 2. Combat — Charge Attack

### Trigger

Boss evaluates a charge every ~10s (evaluation timer). Charge is chosen when all conditions are met:

- Player is 8–25 units away
- Clear line-of-sight to player (raycast against walls)
- Not currently in barrage, shield, or charge recovery
- Random roll passes phase-based chance:

| Phase | Chance per eval | Effective cooldown after charge |
|-------|-----------------|-------------------------------|
| 1     | 20%             | 12s                           |
| 2     | 40%             | 10s                           |
| 3     | 60%             | 7s                            |

Approximate frequency: Phase 1 ~once/50s, Phase 2 ~once/25s, Phase 3 ~once/17s.

### Telegraph (0.8s wind-up)

- Boss stops moving and faces player
- Boss model emissive ramps up (crimson glow intensifies over 0.8s)
- New `Sound.bossChargeWindup` — rising growl/scrape tone, ~0.8s duration

### Charge Execution

- Boss sprints at 2.5x base speed toward player's position (snapshotted at charge start — not tracking, player can dodge)
- Duration cap: 1.5s or until hitting a wall / reaching target position
- **Hit:** If boss reaches within 2 units of player: 40 damage (normal difficulty, scaled by difficulty multiplier), new `Sound.bossChargeMelee` (heavy impact thud), screen shake intensity 0.2
- **Miss:** If boss hits wall or time expires: 0.5s recovery stun (stands still, vulnerable)

### State Fields

- `_bossChargeState`: `'idle'` | `'windup'` | `'charging'` | `'recovery'`
- `_bossChargeTimer`: countdown for current state
- `_bossChargeEvalTimer`: countdown until next charge evaluation
- `_bossChargeCooldown`: post-charge cooldown
- `_bossChargeTarget`: snapshotted player position

## 3. Combat — Adaptive Tactics

### Behavior Tracking

Boss maintains a rolling ~10s window of player behavior:

- `_bossPlayerCampScore`: Increments each frame the player stays within ~4 units of the same spot. Decays when player moves. Range 0–1 (normalized).
- `_bossPlayerAggroScore`: Increments each frame the player moves toward the boss / closes distance. Decays when player retreats or holds. Range 0–1 (normalized).
- `_bossPlayerTrackPos`: Last-known player position for delta tracking, updated each frame.

### Response Thresholds

Evaluated every ~3s. Threshold for activation: score > 0.6.

**Player is camping** (`campScore > 0.6`):
- Barrage cooldown reduced by 30%
- Charge chance per eval doubled (capped at 80%)
- Boss prioritizes moving toward player (bias toward RUSH and chase behaviors)

**Player is rushing** (`aggroScore > 0.6`):
- Boss prefers HOLD and RETREAT_FIRE combat moves
- Gunfire accuracy bonus +10%
- Charge min range reduced from 8 to 4 units (punish close approaches)

**Neutral** (neither threshold met):
- No modifications to default behavior

Implementation layers on top of existing combat move selection — biases existing weights and cooldowns, does not add new state machines.

## 4. Boss Kill Payoff

### Extended Slow-Mo

- Duration: 0.4s at 0.3x speed (vs normal kill: 0.05s at 0.7x)

### Screen Flash

- White CSS overlay, starts at opacity 0.6, fades to 0 over 0.5s
- Element: reuse or create a `#boss-flash` full-screen div

### Boss Explosion Particles

- New `GAME.particles.spawnBossExplosion(pos)` method
- Sparks: 20–30 particles, orange/yellow, fast outward velocity, lifetime ~0.8s
- Debris: 10–15 particles, dark grey/red, slower with gravity, lifetime ~1.2s

### Screen Shake

- Intensity 0.3, duration ~0.5s (3.75x a grenade explosion)

### Minion Chain-Death

- All enemies with `_isBossMinion = true` die ~0.3s after boss death
- Each spawns a small spark/blood burst at their position via existing particle system
- Creates a cascade effect across the map

### Victory Stinger Sound

- New `Sound.bossVictory` — triumphant major chord (brass-like oscillators) layered over sub-bass boom
- Duration ~2s, plays alongside existing `bossDeath` rumble
- `bossDeath` = destruction layer, `bossVictory` = triumph layer

### Announcement

- "BOSS ELIMINATED" announcement gets a gold color CSS class (`.boss-eliminated`) for boss kills only
- Distinct from the standard white announcement text

## 5. Shield Buff

Strengthen the phase transition shield:

| Parameter       | Current | New   |
|-----------------|---------|-------|
| Damage reduction| 95%     | 98%   |
| Duration        | 4s      | 6s    |

- `amount = Math.round(amount * 0.02)` (was `* 0.05`)
- `_bossShieldTimer = 6.0` (was `4.0`)

## Files Modified

| File | Changes |
|------|---------|
| `js/enemies.js` | Charge attack, adaptive tactics, shield buff, atmosphere state fields, charge state machine |
| `js/main.js` | Atmosphere color grade lerping, kill payoff sequence (slow-mo, flash, shake, minion chain-death, announcement), heartbeat tick, adaptive behavior tracking |
| `js/sound.js` | `bossHeartbeat`, `bossChargeWindup`, `bossChargeMelee`, `bossVictory` |
| `index.html` | `#boss-flash` overlay div, `.boss-eliminated` CSS class |
| `REQUIREMENTS.md` | All new mechanics documented |
