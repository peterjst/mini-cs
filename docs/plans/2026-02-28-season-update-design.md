# Season Update — Design Document

Date: 2026-02-28

A broad polish pass across game feel, tactical depth, and progression. 12 features that collectively elevate the gameplay experience.

---

## Game Feel & Polish

### 1. Footstep Audio

Procedural footsteps via Web Audio, synced to movement speed.

| Movement | Interval | Gain | Band | Bot Awareness Radius |
|----------|----------|------|------|---------------------|
| Walk | 0.5s | 0.08 | 200-800Hz | 8u |
| Sprint | 0.35s | 0.15 | 150-1000Hz | 20u |
| Crouch-walk | 0.7s | 0.03 | 300-600Hz | 3u |

Sound: Short noise burst (50ms), bandpass filtered per movement type.

Landing thud: Low-freq oscillator (80Hz, 100ms decay) + noise burst.

Bot awareness uses existing `reportSound()` system. Creates the classic CS shift-walk-to-stay-silent dynamic.

### 2. Weapon Inspect Animation

- Trigger: Hold F (when not AWP-scoped)
- Animation: Weapon rotates Y +45deg, tilts X -15deg, shifts right +0.1u over 0.6s (smooth lerp). Returns over 0.4s on release.
- Cancelled by firing, reloading, switching, or sprinting.

### 3. Enhanced Camera Feel

- Strafe tilt: Camera rolls +/-1.5deg when strafing (lerp at 6x dt)
- Fall landing: FOV punches 75 -> 80 over 50ms, recovers over 200ms (falls > 1.5u)
- Sprint FOV: Widens to 80 while sprinting (lerp at 4x dt), returns to 75 on stop

### 4. Ambient Map Audio

Per-map ambient loops using Web Audio oscillators + filtered noise. Master gain 0.03-0.05. Starts on round begin, stops on round end.

| Map | Sound | Implementation |
|-----|-------|----------------|
| Dust | Desert wind | Brown noise, bandpass 100-400Hz, slow LFO volume modulation |
| Office | Fluorescent hum | 120Hz sawtooth (gain 0.02), slight detuned pair for beating |
| Warehouse | Industrial drone | Low noise 60-200Hz + metallic ping (random 8-15s interval) |
| Bloodstrike | Crowd roar | Filtered noise 200-2000Hz, medium gain, pulsing |
| Italy | Village ambience | Wind (brown noise) + distant church bell (sine 800Hz, every 20-30s) |
| Aztec | Jungle | Noise 1-4kHz (insects) + bird chirp (sine sweep 1-2kHz, every 10-20s) |

### 5. Kill Sound + MVP Sting

- Kill dink: Sine ping 1200Hz, 80ms decay, gain 0.15. Headshot kill: 1800Hz + second harmonic.
- MVP sting: 3-note ascending chord (C5-E5-G5, 150ms each, triangle wave) at round end for top performer.

---

## Tactical Depth

### 6. Smoke Grenade ($300)

- Buy: Slot 8, max 1, $300
- Throw: Same parabolic arc as HE. 1s fuse delay after impact.
- Visual: 20-25 semi-transparent gray spheres (opacity 0.4-0.6) within 5u radius. Drift and rotate slowly.
- Duration: 8s active, 2s fade-out.
- AI: Raycasts through smoke volume fail (distance from ray to smoke center < 5u). Bots won't path through smoke. Bots in ATTACK who lose sight switch to INVESTIGATE.
- Player: Bullets pass through (raycasts unaffected). Visual obstruction only.

### 7. Flashbang ($200)

- Buy: Slot 9, max 2, $200
- Throw: Same arc. 1.5s fuse.
- Player effect: White overlay if detonation is in FOV (dot product > 0.3) and within 25u. Intensity = dot x (1 - dist/25). Duration = intensity x 3 seconds.
- Bot effect: Bots within 15u with LOS enter BLINDED sub-state: stop firing, turn randomly, 0.3x speed, 2s duration. Elite bots: 50% chance to dodge (no effect).
- Sound: White noise + 4kHz sine, 200ms, gain 0.3.
- Visual: PointLight intensity 50, distance 30, 100ms at detonation point.

### 8. SMG — MP5 ($1250)

| Property | Value |
|----------|-------|
| Damage | 22 |
| Fire rate | 12/s |
| Magazine | 25 |
| Reserve | 75 |
| Reload | 2.2s |
| Spread | 0.045 |
| Wall pen | 1 wall, 0.4x damage |
| Price | $1250 |
| Kill reward | $600 |

Buy: Slot 2 (between pistol and shotgun). Compact SMG model (~30 parts). Higher-pitched sound than rifle (600Hz sine + mid-freq noise). The $600 kill reward makes eco-round SMG buys profitable.

### 9. Helmet + Kevlar ($1000)

- Kevlar only ($650): Body damage absorption 50% (unchanged)
- Kevlar + Helmet ($1000): Body absorption 50% + headshot multiplier reduced from 2.5x to 1.5x (except AWP, always 2.5x)
- Buy flow: Slot 7 buys kevlar. If kevlar already owned, slot 7 offers helmet upgrade for $350.
- HUD: Armor bar shows helmet icon when owned.
- Bot economy: Hard/Elite bots buy helmet when affordable.

---

## Progression & Retention

### 10. Weapon Skins System

5 procedural skins per weapon, unlocked at XP milestones. Purely cosmetic.

| Tier | Name | Unlock | Visual |
|------|------|--------|--------|
| 0 | Default | Free | Current look |
| 1 | Field-Tested | 500 XP | Desaturated, lower metalness |
| 2 | Carbon | 2000 XP | Dark matte black (metalness 0.2, roughness 0.8) |
| 3 | Tiger | 5000 XP | Orange-black striped bands on barrel/receiver |
| 4 | Neon | 12000 XP | Cyan/magenta/lime emissive trim (emissiveIntensity 0.3) |
| 5 | Gold | 25000 XP | Gold finish (#FFD700, metalness 0.9, roughness 0.15) |

Implementation: Material overrides on weapon mesh parts during `buildWeaponModel`. Skins override 2-3 key parts (barrel, receiver, stock). Stored in localStorage. Equip UI: "Loadout" button on main menu with weapon x skin swatch grid.

### 11. End-of-Match Stats Screen

Full-screen overlay replacing simple round-end announcement. Appears 2s after final round.

Stats tracked: shots fired/hit (accuracy %), headshots/kills (HS %), damage dealt/taken, kills per weapon, deaths, money spent, grenades thrown.

Layout shows K/D/accuracy/HS% prominently, weapon breakdown as horizontal bars, XP earned, current rank. Two buttons: Play Again (rematch) and Main Menu.

### 12. Daily Challenge System

3 challenges rotate daily (date-seeded RNG from pool of 15). Reset at midnight UTC.

Challenge pool:

| Challenge | Condition | XP |
|-----------|-----------|-----|
| Headhunter | 10 headshots | 75 |
| Pistol Pro | 5 pistol kills | 50 |
| Eco Warrior | Win round spending <= $1000 | 100 |
| Spray Control | 3 rifle kills without releasing trigger | 75 |
| Sniper Elite | 3 AWP kills | 75 |
| Knife Fighter | 2 knife kills | 100 |
| Survivor | Win with <= 10 HP | 80 |
| Bomb Expert | Plant bomb 2 times | 60 |
| Defuser | Defuse bomb 1 time | 80 |
| Grenadier | 2 grenade kills | 60 |
| Flawless | Win round without taking damage | 120 |
| Marathon | Play 3 complete matches | 50 |
| Streak | 3-kill streak | 75 |
| Utility User | Use all grenade types in one match | 60 |
| Clutch | Win 1vX (last alive, 2+ enemies) | 150 |

Selection: `seed = Math.floor(Date.now() / 86400000)` -> seeded RNG picks 3. UI: "Daily" section on main menu with progress bars. Storage in localStorage.

---

## Dependencies & Ordering

Features are largely independent. Recommended build order:

1. SMG + Helmet (weapon/armor additions, foundational)
2. Smoke + Flashbang (new grenade types, extend existing grenade system)
3. Footsteps + Ambient audio + Kill sound (audio pass)
4. Camera feel + Weapon inspect (animation pass)
5. End-of-match stats (UI, needs stat tracking counters added early)
6. Weapon skins (cosmetic, independent)
7. Daily challenges (progression, independent)
