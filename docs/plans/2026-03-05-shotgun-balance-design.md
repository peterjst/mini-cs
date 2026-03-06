# Shotgun Balance — Dominant Close-Range Design

## Problem
The shotgun (Nova) is uncompetitive against the AK-47 on indoor maps like Office. Its low damage per pellet, tiny range, and wide spread make it a poor choice even in close quarters where it should excel.

## Goal
Make the shotgun THE dominant weapon in indoor/close-range combat. If you're in a hallway with a shotgun user, you should be dead.

## Approach
Stat buffs only — no new mechanics, no distance falloff system, no code paths. Purely WEAPON_DEFS changes.

## Current vs Proposed Stats

| Stat | Current | Proposed | Change |
|------|---------|----------|--------|
| damage | 18 | 32 | +78% |
| range | 30 | 55 | +83% |
| pellets | 8 | 10 | +25% |
| spread | 0.09 | 0.07 | -22% (tighter) |
| fireRate | 1.2 | 1.5 | +25% |
| price | 1800 | 1300 | -28% |
| magSize | 6 | 8 | +33% |
| reserveAmmo | 24 | 32 | +33% |

## Balance Analysis

### Damage at Various Ranges
- **Point blank (all 10 pellets):** 320 dmg — overkill at every difficulty
- **Indoor (~20 units, ~7 pellets):** ~224 dmg — guaranteed one-shot on elite (80 HP)
- **Edge of range (~45 units, ~4 pellets):** ~128 dmg — one-shots easy/normal/hard, two-shots elite
- **Outdoors (>55 units):** 0 dmg — hard cutoff, AK dominates

### What Keeps It Fair
- Zero wall penetration
- 2.8s reload with 8 shells is punishing
- Range 55 is <30% of AK's 200 — dead weight on outdoor maps
- 1.5 rps vs AK's 10 rps — miss and you're exposed

### Economy Impact
At $1300, cheaper than SMG ($1250), making it the go-to eco buy on indoor maps like Office.

## Implementation
Changes required:
1. Update shotgun line in WEAPON_DEFS (js/weapons.js line 237)
2. Update REQUIREMENTS.md weapon stats section
3. Update tests to reflect new values
