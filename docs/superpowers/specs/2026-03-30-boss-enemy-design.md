# Boss Enemy Design

## Overview

Introduce a Boss enemy archetype to Mini Counter-Strike. The Boss is a rare, climactic enemy that appears across all game modes, featuring massive health, unique abilities (grenade barrages and minion summons), a three-phase escalation system, and a visually distinct model. Implemented as an extension of the existing enemy system via an `isBoss` flag.

## Approach

Extend the existing enemy system in `js/enemies.js` rather than creating a separate module. The Boss reuses existing AI behavior states (PATROL, ATTACK, RETREAT, TAKE_COVER, etc.), collision, pathfinding, and personality systems. Boss-specific logic is gated behind the `isBoss` flag.

## Boss Stats & Scaling

The Boss scales with difficulty like regular bots, but at much higher values. Boss always uses the "aggressive" personality.

| Stat        | Easy | Normal | Hard | Elite |
|-------------|------|--------|------|-------|
| Health      | 200  | 350    | 500  | 700   |
| Speed       | 3.5  | 4.5    | 5.5  | 6.5   |
| Damage      | 8    | 12     | 16   | 20    |
| Fire Rate   | 1.5  | 2.2    | 2.8  | 3.5   |
| Accuracy    | 0.25 | 0.38   | 0.45 | 0.55  |
| Sight Range | 35   | 45     | 50   | 55    |

For reference, regular bots on Normal have 45 HP. The Boss on Normal has ~8x that.

### Rewards

- Money: $5000 (flat, all difficulties)
- XP: 5x the normal enemy XP value for that difficulty

## Visual Model

The Boss must be immediately recognizable. All procedural (Three.js geometry + PBR materials).

- **Scale:** 1.5x the size of a regular bot (taller and wider)
- **Color scheme:** Dark red/crimson body armor with black accents, distinct from tan/olive regular bots
- **Head:** Slightly larger with a visor/helmet effect (darker material, metallic sheen)
- **Shoulder pads:** Two additional box geometries on the shoulders to bulk up the silhouette
- **Health bar:** Floating health bar above the Boss, visible through walls within sight range

## Phase System

Three phases based on HP thresholds. Each phase transition triggers a brief emissive pulse flash on the Boss model as a visual cue.

### Phase 1 (100-50% HP) — Standard

- Uses normal AI behavior states (PATROL, ATTACK, TAKE_COVER, etc.)
- Grenade barrage ability every ~15 seconds
- Standard movement speed and fire rate

### Phase 2 (50-25% HP) — Escalation

- Fire rate increases by 25% from base
- Movement speed increases by 20% from base
- Grenade barrage cooldown drops to ~10 seconds
- Summons 2 regular bots as minions (one-time spawn at phase transition)
- Spends less time in cover, more time pushing the player

### Phase 3 (below 25% HP) — Desperate

- Fire rate increases by 50% from base
- Movement speed increases by 35% from base
- Grenade barrage cooldown drops to ~7 seconds, throws 4 grenades instead of 3
- Summons 3 more minions (one-time spawn at phase transition)
- Rarely takes cover, mostly attacks and chases
- Personality override: always pushes/rushes

**Minion details:** Summoned minions are regular bots at the current difficulty level. They spawn near the Boss's position. Max 5 minions alive at once (Phase 3 spawn is capped if Phase 2 minions are still alive).

## Abilities

### Grenade Barrage

- Grenades are thrown in a spread pattern around the player's position, not directly at it
- Each grenade lands at a random offset (5-10 units) from where the player was standing when the barrage started (targets position at launch, not tracking)
- 1-second wind-up: Boss raises arm (visual cue) + escalating low-frequency rumble sound (audio cue), audible at any distance
- Grenades are lobbed with visible arcs and standard fuse time before detonation
- Phase 1: 3 grenades every ~15s
- Phase 2: 3 grenades every ~10s
- Phase 3: 4 grenades every ~7s

The barrage is a "move or die" pressure tool — standing still means heavy damage, moving on the wind-up cue means most/all can be dodged.

### Minion Summon

- Phase 2 transition: spawns 2 regular bots near the Boss
- Phase 3 transition: spawns 3 regular bots near the Boss (capped at 5 total minions alive)
- Minions are standard enemies at the current difficulty level

## Spawn Rules Per Mode

### Survival Mode

- Boss spawns every 5th wave (wave 5, 10, 15, ...)
- Boss replaces one regular enemy in the spawn (total enemy count stays manageable)
- Boss stats scale with wave number on top of difficulty scaling (+10% HP per Boss appearance)

### Competitive Mode

- All 6 rounds are always played (match is no longer "first to 4 wins")
- Winner is whoever has the most round wins after 6 rounds
- Boss spawns in round 6 alongside 1-2 regular bots
- If the score is tied 3-3 after round 6, the Boss round is the tiebreaker — whoever won round 6 wins the match

### Gun Game

- Boss spawns when the player reaches the final weapon tier
- Player kills the Boss with whatever the final weapon is (not forced to knife)
- Killing the Boss completes the Gun Game
- All weapons are unlocked during the Boss phase; HUD displays: "BOSS FIGHT — All weapons unlocked!"
- No minion summons in this mode to keep it clean

### Deathmatch

- After the player reaches 30 kills, the Boss spawns
- Player must kill the Boss to end the match — the Boss fight is the finale

## HUD & UI

### Boss Health Bar

- Appears at top-center of the screen when the Boss is alive
- Label: "BOSS" in bold red text
- Segmented into 3 sections matching phase thresholds (100-50%, 50-25%, 25-0%) with subtle divider lines
- Color shifts per phase: green (Phase 1) -> orange (Phase 2) -> red (Phase 3)
- Fades out when Boss dies

### Notifications

- **Boss spawn:** Large center-screen text "BOSS INCOMING" + warning sound, displayed ~3 seconds
- **Phase transition:** Center-screen text flash "PHASE 2 — ESCALATION" / "PHASE 3 — DESPERATE", displayed ~2 seconds
- **Minion summon:** Small notification "REINFORCEMENTS INCOMING"
- **Boss kill:** Kill feed entry in distinct red color: "You eliminated the BOSS"

### Gun Game Boss Phase

- HUD message: "BOSS FIGHT — All weapons unlocked!"

## Sound Design

All procedural via Web Audio API, no audio files.

### Boss-Specific Sounds

- **Footsteps:** Heavier, lower-pitched version of regular bot footsteps — deeper thud to convey size
- **Grenade barrage wind-up:** Rising low-frequency rumble (ramping oscillator + distortion), ~1 second, audible at any distance
- **Grenade launch:** Rapid-fire "thoomp thoomp thoomp" — deeper than regular grenade throw, spaced ~0.5s apart
- **Phase transition:** Short metallic screech/roar — signals danger escalation
- **Boss spawn announcement:** Low horn/siren — two-tone descending, ominous
- **Minion summon:** Radio chatter burst (noise-filtered oscillator) — signals reinforcements
- **Boss death:** Extended explosion + low rumble fadeout — bigger and longer than regular enemy death, satisfying payoff
- **Boss gunfire:** Same as regular bot gunfire but slightly lower-pitched and louder to distinguish from regular bots
