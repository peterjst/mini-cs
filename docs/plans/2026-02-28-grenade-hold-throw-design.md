# CS-Style Grenade Hold & Throw

## Problem
All grenades throw instantly on keypress. CS has a deliberate equip-hold-throw flow.

## Design

### Grenade Lifecycle
1. **Equip** — Player presses [7/G] (HE), [8] (Smoke), or [9] (Flash)
2. **Pin Pull** — ~0.5s delay with animation. Grenade model appears, pin pulls out. No firing allowed.
3. **Ready** — Grenade held in hand. Player moves freely. Left-click to throw.
4. **Throw** — Left-click launches projectile. Count decrements. Auto-switches to previous weapon.

No cooking. Fuse starts on release.

### Approach: Unified Grenade Weapon System
All three grenade types become switchable weapons in the weapon system. Smoke and Flash join HE in using `switchTo()` instead of direct throw functions.

State machine per grenade: `equipping → ready → throwing → switchBack`

### Input Mapping
| Key | Action (combat) | Action (buy phase) |
|-----|-----------------|-------------------|
| 6 | — | Buy Kevlar+Helmet ($1000) (was [7]) |
| 7 / G | Equip HE grenade | Buy HE grenade ($300) |
| 8 | Equip smoke grenade | Buy smoke grenade ($300) |
| 9 | Equip flashbang | Buy flashbang ($200) |
| Left-click | Throw held grenade | — |

### Visual
- First-person models for all three types (HE exists; Smoke and Flash need new models)
- Pin-pull animation: upward bob over 0.5s
- Throw animation: forward swing (reuse existing timing)

### HUD
- Grenade count display unchanged
- Ammo area shows grenade type name when held

### What's NOT Included
- No cooking (fuse on release only)
- No right-click underhand throw
- No trajectory preview
