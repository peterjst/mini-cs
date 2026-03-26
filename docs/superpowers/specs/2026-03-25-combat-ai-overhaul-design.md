# Combat AI Overhaul — Design Spec

## Problem Statement

Three issues make bot combat feel robotic and exploitable:

1. **Combat disengagement**: Bots in ATTACK state stop firing and look sideways mid-fight, even in open areas. Caused by spurious state transitions (momentary LOS loss during strafing) and aim drift during burst cooldowns.
2. **Suicidal cover-seeking**: When hurt, bots run toward distant cover (up to 10 units away), turning their back to the player and dying en route.
3. **Mechanical oscillation**: Strafe patterns are short-interval ping-pong (0.15–1.2s with guaranteed direction reversal), creating visibly robotic left-right movement.

## Solution Overview

Replace the one-dimensional strafe-only combat movement with a richer system of 5 combat movement sub-behaviors, fix state transition bugs, enforce a "never turn your back" rule, and add timing variation to break oscillation patterns.

---

## Section 1: Combat Movement Sub-Behaviors

Replace the current always-strafe pattern in ATTACK state with a weighted random choice from 5 combat movement types.

### Movement Types

| Movement | Description | Duration | When Preferred |
|----------|-------------|----------|----------------|
| **Strafe** | Lateral movement with wider randomized intervals (0.5–1.8s) | 1–3s | Default fallback, mid-range |
| **Push** | Move toward player at 70% speed while firing | 1–2s | Aggressive personality, player far, high HP |
| **Hold** | Stand still (or nearly still) and fire accurately | 0.8–1.5s | Close range, mid-burst, any personality |
| **Retreat-fire** | Back away from player while maintaining aim and firing | 1–2s | Low HP, cautious personality, player close |
| **Rush-to-cover** | Move to nearby cover (<4 units only) while facing player | Until arrival | Cover very close, bot hurt or reloading |

### Selection Mechanism

When a combat movement expires, roll a new one using personality-weighted base probabilities:

| Movement | Aggressive | Balanced | Cautious |
|----------|-----------|----------|----------|
| Strafe | 25% | 35% | 30% |
| Push | 35% | 15% | 5% |
| Hold | 15% | 20% | 15% |
| Retreat-fire | 10% | 20% | 35% |
| Rush-to-cover | 15% | 10% | 15% |

### Context Modifiers

Weights are adjusted dynamically before each roll:

- **HP below 40%**: Push weight x0.5, Retreat-fire weight x2.0
- **Player within 5 units**: Push weight x0.5, Hold weight x1.5, Retreat-fire weight x1.5
- **Player beyond 15 units**: Push weight x1.5, Hold weight x1.5
- **No nearby cover (<4 units)**: Rush-to-cover weight set to 0, redistributed proportionally to other options

After modifier application, weights are renormalized to sum to 1.0.

### Key Rule

Bot always faces the player during all 5 movement types. `_facePlayer` remains active throughout. No combat movement type turns the bot's back to the player.

---

## Section 2: Fix Combat Disengagement

### Problem A: Spurious State Transitions Out of ATTACK

When a bot in ATTACK state momentarily loses line-of-sight (e.g., thin pillar briefly blocks raycast during a strafe), it immediately transitions to INVESTIGATE — resetting the burst, lowering the weapon, and causing the bot to look away.

**Fix**: Add a LOS grace period of 0.5 seconds. When a bot in ATTACK state loses LOS:
- Start a `_losGraceTimer` instead of immediately transitioning
- Continue firing at the last known player position during the grace period (creates natural suppressive fire)
- Only transition to INVESTIGATE if LOS remains broken for the full 0.5s
- If LOS is regained during the grace period, reset the timer and continue ATTACK normally

### Problem B: Aim Drift During Burst Cooldowns

Between bursts (0.3–0.5s cooldown), the aim system can drift because there's no active firing to anchor attention.

**Fix**: Keep aim tracking (`_aimCurrent` lerp toward player via `_facePlayer` at full lerp rate) running continuously in ATTACK state, regardless of burst/cooldown phase. The bot always tracks the player — just doesn't always pull the trigger.

---

## Section 3: Smart Cover Decisions

### Distance Cap

Only seek cover if a valid cover point is within 4 units (reduced from current 10-unit max acceptance within the 12-unit raycast). Cover must be basically adjacent — a quick sidestep, not a cross-map sprint.

### No Close Cover Fallback

If no cover exists within 4 units, stay in ATTACK state and use Retreat-fire combat movement instead. The bot backs away while shooting rather than making a suicidal run. This is always better than exposing the back.

### Facing Constraint During Rush-to-Cover

When moving to nearby cover, the bot moves at 80% speed but keeps facing the player (strafing/backing toward cover rather than turning and sprinting). Slightly slower arrival but never exposes the back.

### Retreat State Facing Constraint

RETREAT state (triggered at low HP personality threshold) also gets the facing constraint:
- Bot backs toward the retreat waypoint while facing the player at 1.0x speed (reduced from 1.3x)
- If the retreat path requires turning a corner (LOS to player is lost), the bot can then turn and sprint normally at 1.3x speed

### Cover Search Integration

The existing 3-second cooldown on cover searches stays. The search now uses the 4-unit distance cap. The TAKE_COVER transition only fires if close cover is actually found.

---

## Section 4: Natural Timing and Anti-Oscillation

### Wider Duration Ranges

Each combat movement type has its own randomized duration (see Section 1 table). Sequential movement rolls naturally break rhythmic patterns since the bot might push for 1.5s, then hold for 0.8s, then strafe for 2s.

### Strafe Direction Persistence

Instead of always reversing strafe direction on timer expiry, 40% chance to continue the same direction for another interval. Creates occasional longer lateral commits rather than constant ping-pong.

### Micro-Pauses

15% chance of a 0.2–0.4s pause between movement transitions. Bot briefly stops, re-aims, then commits to the next movement. Simulates human decision-making hesitation.

### Jiggle-Peek Cap

Keep jiggle-peeking for cautious bots but:
- Widen interval to 0.2–0.5s (from 0.15–0.35s)
- Cap jiggle sequences to 3–5 repetitions before forcing a different movement type
- Prevents infinite oscillation

---

## Files Modified

| File | Changes |
|------|---------|
| `js/enemies.js` | Combat movement sub-behavior system, LOS grace period, cover distance cap, facing constraints, timing changes |
| `REQUIREMENTS.md` | Update AI sections to reflect all changes |

## Testing Strategy

- Unit tests for combat movement weight calculation and normalization with context modifiers
- Unit tests for LOS grace timer behavior (start, reset, expire)
- Unit tests for cover distance cap filtering
- Manual playtesting across all difficulty levels and personalities to verify feel
