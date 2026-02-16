# Game Design Improvements: Missions + Round Perks

## Context
The game has a solid core shooting loop and a rank/XP system, but two key gaps limit stickiness and fun:
1. **No reason to come back tomorrow** — every session feels the same, no rotating goals
2. **No build variety** — every match plays out identically, no strategic choices between rounds

These are the two most impactful modern game design patterns (used by Fortnite, Valorant, Hades, Vampire Survivors) and both are feasible to add.

---

## Feature 1: Daily/Weekly Mission System (Stickiness)

**What**: 3 daily missions + 1 weekly mission shown on the main menu. Completing them awards bonus XP. They refresh on a timer.

**Mission pool (~14 missions)**:
- Combat: "Get 5 headshots", "Get 10 kills", "Get a Triple Kill", "Get a knife kill"
- Tactical: "Win a round using only pistol", "Kill 3 enemies while crouching", "Win a round without taking damage"
- Survival: "Reach wave 5 in Survival", "Reach wave 5 on Dust"
- Economy: "Earn $5000 in a single match"
- Streak: "Get a Rampage (5 kill streak)"
- Weekly: "Win 3 competitive matches" (300 XP), "Get 25 headshots" (350 XP), "Reach wave 10 in Survival" (500 XP)

**Rewards**: Daily missions 75-150 XP each, weekly 300-500 XP

**Storage**: `localStorage('miniCS_missions')` with date-based refresh (24h daily, 7d weekly)

### Implementation Details

#### `js/main.js` — Core mission logic

**Data structures** (add near top, after STREAK_NAMES):
```javascript
var MISSION_POOL = [
  // Combat missions
  { id: 'headshots_5', type: 'match', desc: 'Get 5 headshots', target: 5, tracker: 'headshots', reward: 75 },
  { id: 'kills_10', type: 'match', desc: 'Get 10 kills', target: 10, tracker: 'kills', reward: 80 },
  { id: 'triple_kill', type: 'match', desc: 'Get a Triple Kill', target: 1, tracker: 'triple_kill', reward: 100 },
  { id: 'pistol_round', type: 'round', desc: 'Win a round using only pistol', target: 1, tracker: 'pistol_win', reward: 120 },
  { id: 'knife_kill', type: 'match', desc: 'Get a knife kill', target: 1, tracker: 'knife_kills', reward: 150 },

  // Tactical missions
  { id: 'crouch_kills_3', type: 'match', desc: 'Kill 3 enemies while crouching', target: 3, tracker: 'crouch_kills', reward: 90 },
  { id: 'no_damage_round', type: 'round', desc: 'Win a round without taking damage', target: 1, tracker: 'no_damage_win', reward: 150 },

  // Survival missions
  { id: 'survival_wave_5', type: 'survival', desc: 'Reach wave 5 in Survival', target: 5, tracker: 'survival_wave', reward: 100 },
  { id: 'survival_dust', type: 'survival', desc: 'Reach wave 5 on Dust (Survival)', target: 5, tracker: 'survival_dust', reward: 120 },

  // Economy missions
  { id: 'earn_5000', type: 'match', desc: 'Earn $5000 in a single match', target: 5000, tracker: 'money_earned', reward: 100 },

  // Streak missions
  { id: 'rampage', type: 'match', desc: 'Get a Rampage (5 kill streak)', target: 1, tracker: 'rampage', reward: 150 },

  // Weekly missions (higher reward)
  { id: 'weekly_wins_3', type: 'weekly', desc: 'Win 3 competitive matches', target: 3, tracker: 'weekly_wins', reward: 300 },
  { id: 'weekly_headshots_25', type: 'weekly', desc: 'Get 25 headshots (any mode)', target: 25, tracker: 'weekly_headshots', reward: 350 },
  { id: 'weekly_survival_wave_10', type: 'weekly', desc: 'Reach wave 10 in Survival', target: 10, tracker: 'weekly_survival', reward: 500 }
];
```

**State variables** (add near other game state vars):
```javascript
var activeMissions = { daily1: null, daily2: null, daily3: null, weekly: null };
var lastMissionRefresh = { daily: 0, weekly: 0 };
```

**Functions to add**:
- `generateMissions()` — pick 3 random non-duplicate daily + 1 weekly from pool
- `checkMissionRefresh()` — compare timestamps, clear expired slots, regenerate
- `loadMissionState()` / `saveMissionState()` — localStorage read/write
- `trackMissionEvent(eventType, value)` — update progress for all active missions matching tracker, check completion, award XP, show notification
- `updateMissionUI()` — render mission cards in menu DOM
- `showMissionComplete(desc, reward)` — reuse existing `showAnnouncement()` function

**Call in `init()`**: `loadMissionState()` → `checkMissionRefresh()` → `updateMissionUI()`

#### Tracking hooks (all in `js/main.js`)

**In `onEnemyKilled()` (~line 1331)**:
```javascript
trackMissionEvent('kills', 1);
if (isHeadshot) {
  trackMissionEvent('headshots', 1);
  trackMissionEvent('weekly_headshots', 1);
}
if (player.crouching) trackMissionEvent('crouch_kills', 1);
if (weapons.current === 'knife') trackMissionEvent('knife_kills', 1);
```

**In `checkKillStreak()` (after streak announcement)**:
```javascript
if (killStreak === 3) trackMissionEvent('triple_kill', 1);
if (killStreak === 5) trackMissionEvent('rampage', 1);
```

**In `endRound()` (~line 903)**:
```javascript
if (playerWon) {
  if (!weapons.owned.shotgun && !weapons.owned.rifle) trackMissionEvent('pistol_win', 1);
  if (player.health >= 100) trackMissionEvent('no_damage_win', 1);
}
```

**In `endMatch()` (~line 926)**:
```javascript
if (playerScore > botScore) trackMissionEvent('weekly_wins', 1);
trackMissionEvent('money_earned', player.money - 800);
```

**In survival wave end**:
```javascript
trackMissionEvent('survival_wave', survivalWave);
trackMissionEvent('weekly_survival', survivalWave);
```

#### `index.html` — Mission UI

**HTML** (add inside `#menu-content`, after controls-wrap):
```html
<div class="missions-wrap">
  <div class="missions-title">DAILY MISSIONS</div>
  <div id="mission-daily-list" class="mission-list"></div>
  <div class="missions-title" style="margin-top:16px;">WEEKLY MISSION</div>
  <div id="mission-weekly" class="mission-card"></div>
</div>
```

**CSS** — mission-card styling with:
- Subtle border `rgba(255,255,255,0.1)`, hover glow `rgba(79,195,247,0.3)`
- Completed state: strikethrough, green border, opacity 0.5
- Layout: description left, progress center ("3/5"), reward right ("+75 XP")

---

## Feature 2: Round Perk System (Fun / Replayability)

**What**: After winning a competitive round, player picks 1 of 3 random perks. Perks stack across rounds, reset each new match. No perk on loss = meaningful win reward.

**Perk pool (12 perks)**:

| Perk | Effect | Integration File:Line |
|------|--------|----------------------|
| Stopping Power | +25% weapon damage | `weapons.js:896` damage calc |
| Quick Hands | 30% faster reload | `weapons.js:1084` reload timer |
| Fleet Foot | +20% move speed | `player.js` MOVE_SPEED usage |
| Thick Skin | +25 HP at round start | `main.js` startRound |
| Scavenger | +$150 per kill ($450 total) | `main.js:1338` kill bonus |
| Marksman | Headshot 3x (vs 2.5x) | `weapons.js:896` HS multiplier |
| Steady Aim | 30% tighter spread | `weapons.js:831` spread calc |
| Iron Lungs | Crouch accuracy 60% (vs 40%) | `weapons.js:848` crouch modifier |
| Blast Radius | Grenade radius +30% | `weapons.js` grenade explosion |
| Quick Draw | 25% faster weapon switch | `weapons.js` switch delay |
| Ghost | Enemy reaction +30% slower | `enemies.js` reaction delay |
| Juggernaut | Take 15% less damage | `player.js` takeDamage |

### Implementation Details

#### `js/main.js` — Perk state & selection

**Data structures**:
```javascript
var PERK_POOL = [
  { id: 'stopping_power', name: 'Stopping Power', desc: '+25% weapon damage', icon: '⚡' },
  { id: 'quick_hands', name: 'Quick Hands', desc: '30% faster reload', icon: '⚙' },
  { id: 'fleet_foot', name: 'Fleet Foot', desc: '+20% move speed', icon: '👟' },
  { id: 'thick_skin', name: 'Thick Skin', desc: '+25 HP at round start', icon: '🛡' },
  { id: 'scavenger', name: 'Scavenger', desc: '+$150 bonus per kill', icon: '💰' },
  { id: 'marksman', name: 'Marksman', desc: 'Headshot multiplier 3×', icon: '🎯' },
  { id: 'steady_aim', name: 'Steady Aim', desc: '30% tighter spread', icon: '🔍' },
  { id: 'iron_lungs', name: 'Iron Lungs', desc: 'Crouch accuracy 60%', icon: '🫁' },
  { id: 'blast_radius', name: 'Blast Radius', desc: 'Grenade radius +30%', icon: '💣' },
  { id: 'quick_draw', name: 'Quick Draw', desc: '25% faster weapon switch', icon: '🔫' },
  { id: 'ghost', name: 'Ghost', desc: 'Enemies detect you 30% slower', icon: '👻' },
  { id: 'juggernaut', name: 'Juggernaut', desc: 'Take 15% less damage', icon: '🦾' }
];

var activePerks = [];
var perkChoices = [];
```

**Functions to add**:
- `offerPerkChoice()` — pick 3 random perks (excluding already active), show perk screen, exit pointer lock
- `renderPerkChoices()` — create 3 clickable perk card DOM elements
- `selectPerk(perk)` — push to activePerks, hide screen, update HUD, call `startRound()`
- `hasPerk(perkId)` — check if perk is active (returns boolean)
- `clearPerks()` — empty activePerks, clear HUD
- `updateActivePerkUI()` — render small perk icons in HUD

**Expose to other modules**: `GAME.hasPerk = hasPerk` (so weapons.js, player.js, enemies.js can check perks)

**Modify `endRound()` (~line 903)**: On player win, after ROUND_END_TIME elapses, call `offerPerkChoice()` instead of `startRound()`. On loss, still call `startRound()` directly.

**Modify game loop ROUND_END handler (~line 1557)**: When player won, don't auto-call `startRound()` (perk selection screen handles the transition via `selectPerk()` → `startRound()`).

**`startMatch()` (~line 829)**: Call `clearPerks()`.

#### `index.html` — Perk selection screen + HUD

**Perk selection overlay**:
```html
<div id="perk-screen">
  <h1>CHOOSE A PERK</h1>
  <div class="perk-subtitle">Bonus for winning the round</div>
  <div id="perk-choices" class="perk-grid"></div>
  <div class="perk-hint">Click a perk to continue</div>
</div>
```

**Active perks HUD** (top-left, below minimap):
```html
<div id="active-perks"></div>
```

**CSS** — Perk card styling:
- Full-screen dark overlay (`rgba(0,0,0,0.92)`, z-index 25)
- 3 cards in a row, 260px wide, subtle blue border
- Hover: lift up 4px, glow, border brightens (Hades/Slay the Spire feel)
- Icon 48px, name in blue, description in muted white
- Active perk HUD: small pills with icon + name, stacked vertically

#### Perk effect integration across modules

**`js/weapons.js`**:
- Spread calc (~line 831): `if (GAME.hasPerk('steady_aim')) spread *= 0.7;`
- Crouch spread (~line 848): `spread *= GAME.hasPerk('iron_lungs') ? 0.4 : 0.6;`
- Headshot mult (~line 896): `def.damage * (GAME.hasPerk('marksman') ? 3.0 : 2.5)`
- Reload timer (~line 1084): `this.reloadTimer -= dt * (GAME.hasPerk('quick_hands') ? 1.3 : 1.0);`
- Grenade blast: `radius * (GAME.hasPerk('blast_radius') ? 1.3 : 1.0)`

**`js/player.js`**:
- Move speed: `speed * (GAME.hasPerk('fleet_foot') ? 1.2 : 1.0)`
- `takeDamage()`: `dmg * (GAME.hasPerk('juggernaut') ? 0.85 : 1.0)`

**`js/enemies.js`**:
- Reaction delay: check `GAME.hasPerk('ghost')` → multiply by 1.3

**`js/main.js`**:
- Kill bonus in `onEnemyKilled()`: `hasPerk('scavenger') ? 450 : 300`
- Round start: `if (hasPerk('thick_skin')) player.health = Math.min(125, player.health + 25);`

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `js/main.js` | Mission system (pool, state, tracking, UI), perk system (pool, state, selection, effects), expose `GAME.hasPerk` |
| `index.html` | Mission panel HTML+CSS, perk selection screen HTML+CSS, active perks HUD |
| `js/weapons.js` | 5 perk hooks (spread, crouch spread, HS mult, reload speed, grenade radius) |
| `js/player.js` | 2 perk hooks (move speed, damage reduction) |
| `js/enemies.js` | 1 perk hook (ghost reaction delay) |
| `REQUIREMENTS.md` | Document both new systems fully |

---

## Verification Checklist

1. Open game — verify daily/weekly missions appear on main menu with progress bars
2. Play match — kill enemies, verify mission progress updates
3. Complete a mission mid-game — verify "MISSION COMPLETE" announcement + XP award
4. Win a round — verify perk selection screen appears with 3 unique choices
5. Select a perk — verify it appears in HUD and effect works (e.g. Stopping Power = faster kills)
6. Lose a round — verify NO perk offered
7. Win multiple rounds — verify perks stack, already-picked perks don't reappear in choices
8. Start new match — verify all perks reset
9. Close browser, reopen — verify missions persist with correct progress
10. Test daily refresh — adjust localStorage timestamp, verify missions regenerate
