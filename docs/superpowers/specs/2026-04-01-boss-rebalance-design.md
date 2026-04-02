# Boss Rebalance Design

## Problem
The boss dies too quickly (a single AK-47 burst can kill it) and doesn't feel threatening even on Hard difficulty. The fight lacks tension and tactical depth.

## Goals
- Boss fights should last: Easy ~15s, Normal ~30s, Hard ~50s, Elite ~75s
- Boss should feel like a tanky bullet sponge with distinct phase mechanics
- Minion waves should be the primary source of pressure, escalating by phase
- Players should not be able to burst-kill through phase transitions

## Changes

### 1. HP Rebalancing

| Difficulty | Current HP | New HP |
|------------|-----------|--------|
| Easy       | 200       | 800    |
| Normal     | 350       | 1500   |
| Hard       | 500       | 2800   |
| Elite      | 700       | 4500   |

### 2. Phase Transition Shield

- Activates on entering phase 2 (50% HP) and phase 3 (25% HP)
- Duration: 3 seconds
- Blocks 85% of incoming damage
- HP floors at 1 while shield is active (boss cannot be killed during shield)
- Visual: semi-transparent emissive sphere around boss, crimson/orange glow, pulses in opacity, fades out over the last 0.5s
- Audio: reuses existing `bossPhaseTransition` sound (no new sounds needed)
- Boss health bar shows tint or icon while shield is active

### 3. Minion Escalation

#### Phase transition spawns (immediate, alongside shield activation)
- Phase 2 entry: 3 minions (up from 2)
- Phase 3 entry: 5 minions (up from 3)

#### Periodic spawn timer (new)
- Phase 1: every 15s, spawns 2 minions
- Phase 2: every 10s, spawns 3 minions
- Phase 3: every 6s, spawns 4 minions
- Timer starts after phase transition shield drops
- No spawns while shield is active

#### Minion cap
- Max 8 minions alive at any time
- Prevents map from becoming unplayable while maintaining pressure in phase 3

#### Visual distinction
- Boss minions (`_isBossMinion = true`) get a red-tinted emissive glow (low intensity, e.g. 0xff2200 at 0.15) on their body material to distinguish from regular round bots

### 4. Phase Stat Escalation (Unchanged)

Phase multipliers remain as-is:
- Phase 1: base stats
- Phase 2 (<=50% HP): 1.25x fire rate, 1.2x speed
- Phase 3 (<=25% HP): 1.5x fire rate, 1.35x speed

Barrage cooldowns remain as-is:
- Phase 1: 15s cooldown, 3 grenades
- Phase 2: 10s cooldown, 3 grenades
- Phase 3: 7s cooldown, 4 grenades

### 5. No Changes

- Boss base damage/accuracy/speed per difficulty (unchanged)
- Boss grenade barrage mechanics (unchanged)
- Boss model/sounds (unchanged, except new shield visual)
- Boss spawn conditions per game mode (unchanged)

## Files to Modify
- `js/enemies.js` — HP values, shield logic, minion spawn timer, minion cap, shield visual, minion visual tint
- `index.html` — possible HUD changes for shield indicator on boss health bar
- `REQUIREMENTS.md` — update boss stats, document shield mechanic, update minion spawning rules
- `test/` — update/add tests for new boss behavior
