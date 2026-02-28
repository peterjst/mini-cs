# Season Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 12 features across game feel, tactical depth, and progression to elevate the Mini CS gameplay experience.

**Architecture:** All changes are additive to existing IIFE modules (`sound.js`, `weapons.js`, `enemies.js`, `player.js`, `main.js`, `index.html`). No new files needed. Each feature is self-contained — new sounds go in `sound.js`, new weapons/grenades in `weapons.js`, new HUD/UI in `main.js` + `index.html`, new progression in `main.js`. The game uses `window.GAME` namespace with lazy initialization throughout.

**Tech Stack:** Three.js r160.1 (global `THREE`), Web Audio API, vanilla JS (IIFE pattern), localStorage for persistence.

**Design doc:** `docs/plans/2026-02-28-season-update-design.md`

---

## Task 1: Add SMG (MP5) Weapon Definition and Buy Integration

**Files:**
- Modify: `js/weapons.js` (line 218-225 — WEAPON_DEFS object)
- Modify: `js/weapons.js` (line 552-575 — `_createWeaponModel` dispatch)
- Modify: `js/main.js` (line 1356-1368 — buy keybinds and weapon switch keys)
- Modify: `js/main.js` (line 2727-2770 — `tryBuy()` function)
- Modify: `js/main.js` (line 2772-2799 — `updateBuyMenu()` function)
- Modify: `index.html` (buy menu HTML — add SMG buy item)
- Modify: `js/sound.js` — add `smgShot()` sound function
- Modify: `js/enemies.js` (line 36-46 — `getBotWeapon()` to include SMG)

**Step 1: Add SMG to WEAPON_DEFS**

In `js/weapons.js` at line 222, add after the pistol entry:

```javascript
smg:     { name: 'SMG (MP5)',       damage: 22,  fireRate: 12,  magSize: 25,       reserveAmmo: 75,       reloadTime: 2.2, price: 1250, range: 150, auto: true,  isKnife: false, isGrenade: false, spread: 0.045, pellets: 1, penetration: 1, penDmgMult: 0.4, killReward: 600 },
```

**Step 2: Add SMG model builder**

In `js/weapons.js`, add `_buildSMG` method after the existing `_buildPistol` method (~line 678). Build a compact SMG: short barrel, box receiver, folding stock, front grip, magazine. Use ~30 parts with existing cached materials from `M()`:

```javascript
WeaponSystem.prototype._buildSMG = function(g, m) {
  // Receiver body
  P(g, 0.05, 0.06, 0.22, m.darkBlued, 0, 0, 0);
  // Barrel — shorter than rifle
  PC(g, 0.015, 0.015, 0.2, 8, m.blued, 0, 0.01, -0.21);
  // Barrel shroud (perforated)
  PC(g, 0.022, 0.022, 0.14, 8, m.darkBlued, 0, 0.01, -0.18);
  // Front sight
  P(g, 0.008, 0.025, 0.008, m.darkAlum, 0, 0.04, -0.28);
  // Rear sight
  P(g, 0.03, 0.02, 0.008, m.darkAlum, 0, 0.04, 0.02);
  // Magazine — curved
  P(g, 0.025, 0.12, 0.04, m.blued, 0, -0.09, -0.02);
  PR(g, 0.025, 0.04, 0.04, m.blued, 0, -0.15, -0.04, 0.15, 0, 0);
  // Trigger guard
  P(g, 0.035, 0.005, 0.06, m.darkBlued, 0, -0.035, 0.02);
  P(g, 0.005, 0.025, 0.005, m.darkAlum, 0, -0.02, 0.015);
  // Pistol grip
  P(g, 0.025, 0.07, 0.035, m.polymer, 0, -0.07, 0.04);
  PR(g, 0.025, 0.03, 0.035, m.polymer, 0, -0.1, 0.05, 0.2, 0, 0);
  // Folding stock — collapsed
  P(g, 0.01, 0.04, 0.12, m.darkBlued, 0, 0.02, 0.12);
  P(g, 0.01, 0.04, 0.03, m.darkBlued, 0, -0.01, 0.22);
  // Stock end plate
  P(g, 0.025, 0.05, 0.01, m.polymer, 0, -0.01, 0.24);
  // Charging handle
  P(g, 0.03, 0.015, 0.015, m.darkAlum, 0, 0.035, 0.06);
  // Front grip
  P(g, 0.02, 0.05, 0.03, m.polymer, 0, -0.05, -0.1);
  PR(g, 0.02, 0.02, 0.03, m.polymer, 0, -0.075, -0.105, 0.15, 0, 0);
  // Ejection port
  P(g, 0.015, 0.02, 0.03, m.gunMetalDark, 0.025, 0.01, 0.04);
  // Safety selector
  P(g, 0.005, 0.02, 0.005, m.chrome, -0.027, 0.01, 0.03);
  // Cocking knob
  PC(g, 0.008, 0.008, 0.01, 6, m.chrome, 0.03, 0.035, 0.06);
  // Sling mount front
  PC(g, 0.005, 0.005, 0.01, 6, m.darkAlum, 0, -0.02, -0.22);
  // Sling mount rear
  PC(g, 0.005, 0.005, 0.01, 6, m.darkAlum, 0, 0.02, 0.18);
  // Muzzle
  PC(g, 0.017, 0.013, 0.02, 8, m.gunMetalDark, 0, 0.01, -0.31);
  // Bolt (visible through ejection port)
  P(g, 0.012, 0.015, 0.025, m.chrome, 0.024, 0.01, 0.04);
};
```

**Step 3: Add SMG to weapon model dispatch**

In `js/weapons.js` `_createWeaponModel` (~line 562), add after the pistol case:

```javascript
} else if (this.current === 'smg') {
  this._buildSMG(g, m);
```

**Step 4: Add SMG shot sound**

In `js/sound.js`, add `smgShot` to the Sound object (before the closing `};` of the Sound literal around line 1037):

```javascript
smgShot: function() {
  // Snappy, higher-pitched than rifle
  noiseBurst({ freq: 2500, duration: 0.03, gain: 0.18, filterType: 'bandpass', delay: 0 });
  noiseBurst({ freq: 800, duration: 0.05, gain: 0.14, filterType: 'lowpass', delay: 0 });
  resTone({ freq: 600, duration: 0.04, gain: 0.08, delay: 0 });
  resTone({ freq: 1200, duration: 0.02, gain: 0.05, delay: 0.01 });
  noiseBurst({ freq: 4000, duration: 0.015, gain: 0.06, filterType: 'highpass', delay: 0.005 });
},
```

**Step 5: Add SMG to fire sound dispatch**

In `js/weapons.js` (~line 1092-1098), add SMG case in the fire sound block:

```javascript
else if (this.current === 'smg') GAME.Sound.smgShot();
```

Add this before the final `else GAME.Sound.pistolShot();` line.

**Step 6: Add SMG to buy system**

In `js/main.js`:

a) Buy keybinds (~line 1356-1361), add: `if (k === '2') tryBuy('smg');`

b) Weapon switch keys (~line 1363-1368), add: `if (k === '2') weapons.switchTo('smg');`

c) In `tryBuy()` (~line 2727), add SMG case:

```javascript
} else if (item === 'smg') {
  if (weapons.owned.smg) return;
  if (player.money < DEFS.smg.price) return;
  player.money -= DEFS.smg.price;
  weapons.giveWeapon('smg');
  weapons.switchTo('smg');
  bought = true;
```

d) In `updateBuyMenu()` (~line 2776), add:

```javascript
if (el.dataset.weapon === 'smg') {
  if (weapons.owned.smg) el.classList.add('owned');
  else if (player.money < DEFS.smg.price) el.classList.add('too-expensive');
}
```

**Step 7: Add SMG to buy menu HTML**

In `index.html`, in the buy menu section, add an SMG item (before shotgun):

```html
<div class="buy-item" data-weapon="smg"><span class="buy-key">2</span><span class="item-name">SMG (MP5)</span><span class="item-price">$1250</span></div>
```

**Step 8: Add SMG to bot weapon selection**

In `js/enemies.js` `getBotWeapon()` (~line 36-46), add SMG to the random selection:

```javascript
function getBotWeapon(roundNum) {
  if (roundNum <= 1) return 'pistol';
  if (roundNum <= 2) return Math.random() < 0.5 ? 'smg' : 'pistol';
  if (roundNum <= 4) {
    var r = Math.random();
    if (r < 0.3) return 'rifle';
    if (r < 0.6) return 'smg';
    return 'pistol';
  }
  var r = Math.random();
  if (r < 0.40) return 'rifle';
  if (r < 0.55) return 'smg';
  if (r < 0.75) return 'shotgun';
  if (r < 0.88) return 'awp';
  return 'pistol';
}
```

**Step 9: Handle SMG kill reward**

In `js/main.js`, wherever kill money bonus is awarded (search for `+= 300` kill reward), add conditional: if the player's current weapon has `killReward` in its def, use that instead of the default 300. This gives SMG its $600 kill reward.

**Step 10: Add SMG to weapon owned/ammo initialization**

In `js/weapons.js`, find where `this.owned` is initialized (search for `owned` object init). Add `smg: false`. Find where `this.ammo` and `this.reserve` are initialized and add SMG entries with its magSize/reserveAmmo.

**Step 11: Update REQUIREMENTS.md**

Add the SMG weapon to the weapons table and buy system documentation.

**Step 12: Commit**

```bash
git add js/weapons.js js/sound.js js/main.js js/enemies.js index.html REQUIREMENTS.md
git commit -m "feat: add SMG (MP5) weapon with $1250 price and $600 kill reward"
```

---

## Task 2: Add Helmet + Kevlar Armor System

**Files:**
- Modify: `js/main.js` (line 2760-2766 — armor buy logic)
- Modify: `js/main.js` — damage calculation where headshot multiplier is applied
- Modify: `js/main.js` (line 2772-2799 — `updateBuyMenu()`)
- Modify: `index.html` — armor bar HUD (add helmet icon)
- Modify: `index.html` — buy menu (update armor item text)

**Step 1: Add helmet state to player**

In `js/main.js`, find where `player.armor` is initialized (search `player.armor = 0`). Add `player.helmet = false` alongside it. In round reset, set `player.helmet = false` (armor carries over between rounds in CS, but for simplicity reset each round or preserve — follow CS: armor persists, helmet persists).

**Step 2: Modify armor buy logic**

In `tryBuy()` (~line 2760), replace the armor case:

```javascript
} else if (item === 'armor') {
  if (player.armor >= 100 && player.helmet) return;
  if (player.armor < 100) {
    if (player.money < 650) return;
    player.money -= 650;
    player.armor = 100;
    bought = true;
  } else if (!player.helmet) {
    if (player.money < 350) return;
    player.money -= 350;
    player.helmet = true;
    bought = true;
  }
} else if (item === 'helmet') {
  // Buy full kevlar+helmet combo
  if (player.armor >= 100 && player.helmet) return;
  var cost = 1000;
  if (player.armor >= 100) cost = 350; // Just need helmet
  if (player.helmet) cost = 650; // Just need kevlar
  if (player.money < cost) return;
  player.money -= cost;
  player.armor = 100;
  player.helmet = true;
  bought = true;
}
```

**Step 3: Add helmet buy key**

In buy keybinds (~line 1356), change key 7:
- `if (k === '7') tryBuy('armor');` — buys kevlar only
- `if (k === '8') tryBuy('helmet');` — buys kevlar+helmet (shift existing grenade key bindings)

Actually simpler: keep key 7 smart — if no armor, buy armor ($650). If armor but no helmet, buy helmet ($350). If both, do nothing. This matches the design. So the `tryBuy('armor')` logic handles it all:

```javascript
} else if (item === 'armor') {
  if (player.armor >= 100 && player.helmet) return; // Fully equipped
  if (player.armor < 100 && !player.helmet) {
    // Buy kevlar+helmet combo ($1000) if affordable, else just kevlar ($650)
    if (player.money >= 1000) {
      player.money -= 1000;
      player.armor = 100;
      player.helmet = true;
      bought = true;
    } else if (player.money >= 650) {
      player.money -= 650;
      player.armor = 100;
      bought = true;
    }
  } else if (player.armor >= 100 && !player.helmet) {
    if (player.money < 350) return;
    player.money -= 350;
    player.helmet = true;
    bought = true;
  } else if (player.armor < 100 && player.helmet) {
    if (player.money < 650) return;
    player.money -= 650;
    player.armor = 100;
    bought = true;
  }
}
```

**Step 4: Apply helmet headshot reduction**

Find where headshot damage multiplier is applied. In `js/weapons.js` or `js/main.js`, wherever the 2.5x headshot multiplier is used for player-to-enemy and enemy-to-player damage. For player taking damage, check `player.helmet` and reduce multiplier from 2.5x to 1.5x (unless AWP). Search for `2.5` or `headshot` in the codebase to find exact locations.

**Step 5: Update buy menu display**

In `updateBuyMenu()`, update the armor item text to show current state:
- No armor: "Kevlar + Helmet $1000"
- Kevlar only: "Helmet $350"
- Helmet only: "Kevlar $650"
- Both: "OWNED"

**Step 6: Add helmet icon to HUD**

In `index.html`, next to the armor bar, add a small helmet indicator:
```html
<span id="helmet-icon" style="display:none;">&#x1F6E1;</span>
```

In `updateHUD()`, toggle `dom.helmetIcon.style.display = player.helmet ? 'inline' : 'none'`.

**Step 7: Reset helmet on round start and new match**

Wherever armor is reset between rounds/matches, also set `player.helmet = false` for new matches. For between-round resets: helmet persists (like CS).

**Step 8: Update REQUIREMENTS.md**

Document the helmet+kevlar system, prices, headshot reduction.

**Step 9: Commit**

```bash
git add js/main.js js/weapons.js index.html REQUIREMENTS.md
git commit -m "feat: add helmet+kevlar armor system with headshot damage reduction"
```

---

## Task 3: Add Smoke Grenade

**Files:**
- Modify: `js/weapons.js` (WEAPON_DEFS, grenade system, throw logic)
- Modify: `js/main.js` (buy system, keybinds, grenade HUD)
- Modify: `js/enemies.js` (line-of-sight check to respect smoke)
- Modify: `js/sound.js` (smoke pop sound)
- Modify: `index.html` (buy menu, grenade count display)

**Step 1: Add smoke grenade tracking to WeaponSystem**

In `js/weapons.js`, alongside `grenadeCount`, add `smokeCount` (default 0). Add `this.owned.smoke = false` in the owned init.

**Step 2: Create SmokeGrenadeObj class**

In `js/weapons.js`, after `GrenadeObj`, add `SmokeGrenadeObj`. It reuses the same physics (gravity, wall bounce, ground bounce) from `GrenadeObj` but on fuse expiry (1.0s), instead of exploding, it creates a smoke cloud:

```javascript
function SmokeGrenadeObj(scene, pos, vel, walls) {
  // Same physics as GrenadeObj
  this.alive = true;
  this.fuseTimer = 1.0;
  this.velocity = vel.clone();
  this.scene = scene;
  this.walls = walls;
  this._rc = new THREE.Raycaster();

  // Green-tinted grenade model (simpler than HE)
  var g = new THREE.Group();
  var body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5, metalness: 0.3 })
  );
  g.add(body);
  g.position.copy(pos);
  scene.add(g);
  this.mesh = g;

  // Smoke cloud state
  this.smokeActive = false;
  this.smokeTimer = 0;
  this.smokeDuration = 8;
  this.smokeFadeTime = 2;
  this.smokeParticles = [];
  this.smokeCenter = null;
  this.smokeRadius = 5;
}
```

Physics update method: same wall-bounce/gravity as GrenadeObj. On fuse expiry, call `_deploySmoke()`:

```javascript
SmokeGrenadeObj.prototype._deploySmoke = function() {
  this.scene.remove(this.mesh);
  this.smokeActive = true;
  this.smokeCenter = this.mesh.position.clone();
  this.smokeCenter.y = 0;

  // Create 20 smoke sphere particles
  var mat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5, depthWrite: false });
  for (var i = 0; i < 20; i++) {
    var size = 1.2 + Math.random() * 1.5;
    var sphere = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 6), mat.clone());
    sphere.position.set(
      this.smokeCenter.x + (Math.random() - 0.5) * this.smokeRadius * 1.5,
      0.5 + Math.random() * 3,
      this.smokeCenter.z + (Math.random() - 0.5) * this.smokeRadius * 1.5
    );
    this.scene.add(sphere);
    this.smokeParticles.push(sphere);
  }
};
```

Smoke update: drift particles slowly, handle fade-out after duration:

```javascript
SmokeGrenadeObj.prototype.updateSmoke = function(dt) {
  if (!this.smokeActive) return true; // still alive (physics phase)
  this.smokeTimer += dt;

  if (this.smokeTimer > this.smokeDuration + this.smokeFadeTime) {
    // Remove all particles
    for (var i = 0; i < this.smokeParticles.length; i++) {
      this.scene.remove(this.smokeParticles[i]);
    }
    return false; // done
  }

  var fadeStart = this.smokeDuration;
  for (var i = 0; i < this.smokeParticles.length; i++) {
    var p = this.smokeParticles[i];
    // Slow drift
    p.position.y += 0.1 * dt;
    p.rotation.y += 0.2 * dt;

    // Fade out
    if (this.smokeTimer > fadeStart) {
      var fade = 1 - (this.smokeTimer - fadeStart) / this.smokeFadeTime;
      p.material.opacity = 0.5 * Math.max(0, fade);
    }
  }
  return true; // still active
};
```

**Step 3: Expose active smokes to enemies**

Add `GAME._activeSmokes = []` in weapons.js or main.js. When a smoke deploys, push its center + radius. When it expires, remove it.

**Step 4: Modify bot line-of-sight for smoke**

In `js/enemies.js`, `_canSeePlayer()` (~line 645), after the distance/range check and before the wall raycast, add smoke check:

```javascript
// Check smoke obstruction
var smokes = GAME._activeSmokes || [];
for (var s = 0; s < smokes.length; s++) {
  var smoke = smokes[s];
  // Check if line from bot to player passes through smoke sphere
  var toSmoke = smoke.center.clone().sub(myPos);
  var proj = toSmoke.dot(toPlayer); // project smoke center onto LOS line
  if (proj > 0 && proj < dist) {
    var closest = myPos.clone().add(toPlayer.clone().multiplyScalar(proj));
    var distToSmoke = closest.distanceTo(smoke.center);
    if (distToSmoke < smoke.radius) return false;
  }
}
```

**Step 5: Add smoke buy integration**

Buy key: `if (k === '8') tryBuy('smoke');`

In `tryBuy()`:
```javascript
} else if (item === 'smoke') {
  if (weapons.smokeCount >= 1) return;
  if (player.money < 300) return;
  player.money -= 300;
  weapons.smokeCount++;
  bought = true;
}
```

**Step 6: Add smoke throw mechanism**

In WeaponSystem, add a method to throw smoke. This can be triggered by a dedicated key (e.g., pressing 8 while not in buy menu throws if owned), or by switching to a "smoke" slot. Simpler approach: add key `8` outside buy mode to throw smoke grenade directly (like a quick-use utility).

**Step 7: Add smoke pop sound**

In `js/sound.js`:
```javascript
smokePop: function() {
  noiseBurst({ freq: 300, duration: 0.3, gain: 0.12, filterType: 'lowpass', delay: 0 });
  noiseBurst({ freq: 1500, duration: 0.15, gain: 0.06, filterType: 'bandpass', delay: 0.05 });
},
```

**Step 8: Update grenade HUD**

Update the grenade count display to show both HE and smoke counts.

**Step 9: Update REQUIREMENTS.md and commit**

```bash
git add js/weapons.js js/main.js js/enemies.js js/sound.js index.html REQUIREMENTS.md
git commit -m "feat: add smoke grenade with AI vision blocking"
```

---

## Task 4: Add Flashbang Grenade

**Files:**
- Modify: `js/weapons.js` (flashbang tracking, throw)
- Modify: `js/main.js` (buy system, flash effect overlay, keybinds)
- Modify: `js/enemies.js` (BLINDED sub-state)
- Modify: `js/sound.js` (flashbang bang sound)
- Modify: `index.html` (flash overlay div, buy menu)

**Step 1: Add flash overlay HTML**

In `index.html`, add inside the HUD:
```html
<div id="flash-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:999;transition:opacity 0.05s;"></div>
```

**Step 2: Add flashbang tracking**

In `js/weapons.js`, add `this.flashCount = 0` alongside `grenadeCount` and `smokeCount`.

**Step 3: Create FlashGrenadeObj class**

Same physics as smoke/HE grenade. Fuse time: 1.5s. On detonation:
- Spawn PointLight (intensity 50, distance 30) for 100ms
- Play flash bang sound
- Return detonation position to main loop for player/bot flash calculations

```javascript
function FlashGrenadeObj(scene, pos, vel, walls) {
  // Same physics body as other grenades
  this.alive = true;
  this.fuseTimer = 1.5;
  this.velocity = vel.clone();
  this.scene = scene;
  this.walls = walls;
  this._rc = new THREE.Raycaster();

  var g = new THREE.Group();
  var body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.6 })
  );
  g.add(body);
  g.position.copy(pos);
  scene.add(g);
  this.mesh = g;
}
```

On detonation, return `{ position: this.mesh.position.clone(), type: 'flash' }`.

**Step 4: Process flash effect on player**

In `js/main.js`, when flash detonates:

```javascript
function processFlashbang(flashPos, playerCamera) {
  var toFlash = flashPos.clone().sub(playerCamera.position);
  var dist = toFlash.length();
  if (dist > 25) return;

  toFlash.normalize();
  var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(playerCamera.quaternion);
  var dot = fwd.dot(toFlash);

  if (dot > 0.3) {
    var intensity = dot * (1 - dist / 25);
    var duration = intensity * 3;
    // Apply white flash overlay
    dom.flashOverlay.style.opacity = Math.min(1, intensity);
    // Fade out over duration
    flashFadeTimer = duration;
    flashFadeTotal = duration;
  }
}
```

In the game loop, fade out the flash overlay:
```javascript
if (flashFadeTimer > 0) {
  flashFadeTimer -= dt;
  var alpha = Math.max(0, flashFadeTimer / flashFadeTotal);
  dom.flashOverlay.style.opacity = alpha;
}
```

**Step 5: Add BLINDED sub-state to bots**

In `js/enemies.js`, add a `_blindTimer` property. When flash detonates, check each bot:

```javascript
function applyFlashToEnemies(flashPos, enemies, walls) {
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;
    var dist = e.mesh.position.distanceTo(flashPos);
    if (dist > 15) continue;
    // LOS check
    var rc = new THREE.Raycaster();
    var dir = flashPos.clone().sub(e.mesh.position).normalize();
    rc.set(e.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), dir);
    rc.far = dist;
    var hits = rc.intersectObjects(walls, false);
    if (hits.length > 0 && hits[0].distance < dist - 0.5) continue; // Blocked
    // Elite bots: 50% dodge
    if (e.difficultyName === 'elite' && Math.random() < 0.5) continue;
    e._blindTimer = 2.0;
  }
}
```

In the bot update loop, when `_blindTimer > 0`: stop firing, move at 0.3x speed, rotate randomly, decrement timer.

**Step 6: Add flash buy/throw integration**

Buy key: `if (k === '9') tryBuy('flash');` — max 2, $200 each.

Throw key outside buy: `if (k === '9') weapons.throwFlash();`

**Step 7: Add flash bang sound**

In `js/sound.js`:
```javascript
flashBang: function() {
  noiseBurst({ freq: 4000, duration: 0.2, gain: 0.3, filterType: 'highpass', delay: 0 });
  resTone({ freq: 4000, duration: 0.15, gain: 0.2, delay: 0 });
  noiseBurst({ freq: 8000, duration: 0.1, gain: 0.15, filterType: 'highpass', delay: 0.02 });
},
```

**Step 8: Update grenade HUD, REQUIREMENTS.md, commit**

```bash
git add js/weapons.js js/main.js js/enemies.js js/sound.js index.html REQUIREMENTS.md
git commit -m "feat: add flashbang grenade with player flash and bot blinding"
```

---

## Task 5: Add Footstep Audio System

**Files:**
- Modify: `js/sound.js` (add footstep sound functions)
- Modify: `js/player.js` (trigger footsteps based on movement)
- Modify: `js/enemies.js` (bot awareness of footstep sounds)

**Step 1: Add footstep sounds to sound.js**

Add three footstep variants + landing thud:

```javascript
footstepWalk: function() {
  noiseBurst({ freq: 500, duration: 0.05, gain: 0.08, filterType: 'bandpass', delay: 0 });
},
footstepSprint: function() {
  noiseBurst({ freq: 600, duration: 0.06, gain: 0.15, filterType: 'bandpass', delay: 0 });
  noiseBurst({ freq: 200, duration: 0.03, gain: 0.06, filterType: 'lowpass', delay: 0.01 });
},
footstepCrouch: function() {
  noiseBurst({ freq: 450, duration: 0.04, gain: 0.03, filterType: 'bandpass', delay: 0 });
},
landingThud: function() {
  var c = ensureCtx();
  var t = c.currentTime;
  var osc = c.createOscillator();
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
  var g = c.createGain();
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.12);
  noiseBurst({ freq: 300, duration: 0.06, gain: 0.1, filterType: 'lowpass', delay: 0 });
},
```

**Step 2: Add footstep timer to player.js**

In `Player` constructor, add:
```javascript
this._footstepTimer = 0;
this._footstepInterval = 0.5; // Updated per frame based on movement type
```

In `Player.update()`, after movement calculation, if player is on ground and moving:

```javascript
// Footstep audio
if (this.onGround && this._dir.lengthSq() > 0.01 && this.alive) {
  var isSprinting = this.keys.shift && !this.crouching;
  var isCrouching = this.crouching;
  this._footstepInterval = isSprinting ? 0.35 : (isCrouching ? 0.7 : 0.5);
  this._footstepTimer += dt;
  if (this._footstepTimer >= this._footstepInterval) {
    this._footstepTimer = 0;
    if (GAME.Sound) {
      if (isSprinting) GAME.Sound.footstepSprint();
      else if (isCrouching) GAME.Sound.footstepCrouch();
      else GAME.Sound.footstepWalk();
    }
    // Report sound for bot awareness
    var radius = isSprinting ? 20 : (isCrouching ? 3 : 8);
    if (GAME.reportPlayerSound) GAME.reportPlayerSound(this.position, radius);
  }
} else {
  this._footstepTimer = 0;
}
```

**Step 3: Add landing sound trigger**

In `player.js`, where landing is detected (~line 227, `if (this.onGround && !this._wasOnGround)`):

```javascript
if (GAME.Sound) GAME.Sound.landingThud();
if (GAME.reportPlayerSound) GAME.reportPlayerSound(this.position, 15);
```

**Step 4: Add `reportPlayerSound` to enemies.js**

Expose `GAME.reportPlayerSound` that iterates all enemies and calls the existing `reportSound`-like logic for each bot within the given radius:

```javascript
GAME.reportPlayerSound = function(pos, radius) {
  if (!currentEnemies) return;
  for (var i = 0; i < currentEnemies.length; i++) {
    var e = currentEnemies[i];
    if (!e.alive || e.state !== PATROL) continue;
    var d = e.mesh.position.distanceTo(pos);
    if (d < radius) {
      e.state = INVESTIGATE;
      e._investigatePos = pos.clone();
    }
  }
};
```

**Step 5: Update REQUIREMENTS.md and commit**

```bash
git add js/sound.js js/player.js js/enemies.js REQUIREMENTS.md
git commit -m "feat: add procedural footstep audio with bot awareness"
```

---

## Task 6: Add Ambient Map Audio

**Files:**
- Modify: `js/sound.js` (ambient sound system with per-map profiles)
- Modify: `js/main.js` (start/stop ambient on round begin/end)

**Step 1: Add ambient sound system to sound.js**

Add an ambient manager with start/stop methods:

```javascript
var _ambientNodes = [];
var _ambientGain = null;

startAmbient: function(mapName) {
  this.stopAmbient();
  var c = ensureCtx();
  _ambientGain = c.createGain();
  _ambientGain.gain.value = 0;
  _ambientGain.connect(masterGain);
  // Fade in
  _ambientGain.gain.linearRampToValueAtTime(0.04, c.currentTime + 2);

  if (mapName === 'dust' || mapName === 'Desert Market') {
    // Desert wind: brown noise, bandpass 100-400Hz, LFO volume
    var buf = getNoiseBuffer(4);
    var src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 250; bp.Q.value = 0.5;
    var lfo = c.createOscillator(); lfo.frequency.value = 0.15; lfo.type = 'sine';
    var lfoGain = c.createGain(); lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain); lfoGain.connect(_ambientGain.gain);
    src.connect(bp); bp.connect(_ambientGain);
    src.start(); lfo.start();
    _ambientNodes.push(src, lfo);
  }
  // ... similar blocks for each map
},

stopAmbient: function() {
  for (var i = 0; i < _ambientNodes.length; i++) {
    try { _ambientNodes[i].stop(); } catch(e) {}
    try { _ambientNodes[i].disconnect(); } catch(e) {}
  }
  _ambientNodes = [];
  if (_ambientGain) { _ambientGain.disconnect(); _ambientGain = null; }
},
```

Add similar blocks for: office (120Hz hum), warehouse (drone + pings), bloodstrike (crowd noise), italy (wind + bells), aztec (insects + birds).

**Step 2: Trigger ambient start/stop in main.js**

When a round begins (entering PLAYING/BUY_PHASE state): `if (GAME.Sound) GAME.Sound.startAmbient(currentMapName);`

When returning to menu or match ends: `if (GAME.Sound) GAME.Sound.stopAmbient();`

**Step 3: Update REQUIREMENTS.md and commit**

```bash
git add js/sound.js js/main.js REQUIREMENTS.md
git commit -m "feat: add per-map ambient audio with procedural soundscapes"
```

---

## Task 7: Add Kill Sound and MVP Sting

**Files:**
- Modify: `js/sound.js` (kill dink, headshot dink, MVP sting sounds)
- Modify: `js/main.js` (trigger kill sound on confirmed kill, MVP at round end)

**Step 1: Add kill sounds to sound.js**

```javascript
killDink: function() {
  var c = ensureCtx();
  var t = c.currentTime;
  var osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, t);
  var g = c.createGain();
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(g); g.connect(masterGain);
  osc.start(t); osc.stop(t + 0.08);
},

killDinkHeadshot: function() {
  var c = ensureCtx();
  var t = c.currentTime;
  // Primary tone
  var osc = c.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(1800, t);
  var g = c.createGain();
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g); g.connect(masterGain);
  osc.start(t); osc.stop(t + 0.1);
  // Harmonic
  var osc2 = c.createOscillator(); osc2.type = 'sine';
  osc2.frequency.setValueAtTime(3600, t);
  var g2 = c.createGain();
  g2.gain.setValueAtTime(0.06, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc2.connect(g2); g2.connect(masterGain);
  osc2.start(t); osc2.stop(t + 0.08);
},

mvpSting: function() {
  var c = ensureCtx();
  var t = c.currentTime;
  var notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  for (var i = 0; i < notes.length; i++) {
    var osc = c.createOscillator(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(notes[i], t + i * 0.15);
    var g = c.createGain();
    g.gain.setValueAtTime(0, t + i * 0.15);
    g.gain.linearRampToValueAtTime(0.12, t + i * 0.15 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
    osc.connect(g); g.connect(masterGain);
    osc.start(t + i * 0.15);
    osc.stop(t + i * 0.15 + 0.3);
  }
},
```

**Step 2: Trigger kill sounds in main.js**

Wherever a kill is confirmed (enemy HP reaches 0), call:
```javascript
if (GAME.Sound) {
  if (wasHeadshot) GAME.Sound.killDinkHeadshot();
  else GAME.Sound.killDink();
}
```

Search for `addKillFeed` calls — that's where kills are confirmed.

**Step 3: Trigger MVP sting at round end**

In the round end logic, after announcer, play MVP sting if player was top performer:
```javascript
if (GAME.Sound && playerScore > botScore) GAME.Sound.mvpSting();
```

**Step 4: Update REQUIREMENTS.md and commit**

```bash
git add js/sound.js js/main.js REQUIREMENTS.md
git commit -m "feat: add kill dink sound and MVP sting audio"
```

---

## Task 8: Add Enhanced Camera Feel

**Files:**
- Modify: `js/player.js` (strafe tilt, fall FOV punch)

**Step 1: Add strafe tilt**

In `Player` constructor, add `this._strafeTilt = 0;`

In `Player.update()`, after the camera rotation is set (~line 236):

```javascript
// Strafe tilt
var targetTilt = 0;
if (this.keys.a && !this.keys.d) targetTilt = 1.5 * Math.PI / 180;  // Tilt right when strafing left
else if (this.keys.d && !this.keys.a) targetTilt = -1.5 * Math.PI / 180;
this._strafeTilt += (targetTilt - this._strafeTilt) * Math.min(1, 6 * dt);
this.camera.rotation.z = this._strafeTilt;
```

**Step 2: Add fall FOV punch**

In `Player.update()`, where landing is detected (~line 227):

```javascript
if (this.onGround && !this._wasOnGround && this.velocity.y <= 0) {
  this._landDip = -0.12;
  // FOV punch on significant fall
  if (this._fallDistance > 1.5) {
    this._fovPunch = 5; // Extra 5 degrees
  }
}
```

Track fall distance: set `this._fallStartY` when leaving ground, compute distance on landing.

Decay FOV punch in the FOV calculation area:
```javascript
if (this._fovPunch > 0) {
  this._fovPunch -= this._fovPunch * 10 * dt; // Fast decay
  if (this._fovPunch < 0.1) this._fovPunch = 0;
}
this._targetFov += this._fovPunch;
```

**Step 3: Update REQUIREMENTS.md and commit**

```bash
git add js/player.js REQUIREMENTS.md
git commit -m "feat: add strafe tilt and fall FOV punch camera effects"
```

---

## Task 9: Add Weapon Inspect Animation

**Files:**
- Modify: `js/weapons.js` (inspect state, animation in update loop)
- Modify: `js/main.js` (F key handling change — inspect when not scoped)

**Step 1: Add inspect state to WeaponSystem**

In `js/weapons.js`, in the WeaponSystem constructor, add:
```javascript
this._inspecting = false;
this._inspectLerp = 0; // 0 = normal, 1 = fully inspected
```

**Step 2: Add inspect animation in weapon update**

In the weapon update method (search for view bob / weapon position updates), add:

```javascript
// Weapon inspect animation
if (this._inspecting) {
  this._inspectLerp = Math.min(1, this._inspectLerp + dt / 0.6);
} else {
  this._inspectLerp = Math.max(0, this._inspectLerp - dt / 0.4);
}
if (this._inspectLerp > 0 && this.weaponModel) {
  this.weaponModel.rotation.y = this._inspectLerp * 0.785; // 45 degrees
  this.weaponModel.rotation.x += this._inspectLerp * (-0.26); // -15 degrees
  this.weaponModel.position.x += this._inspectLerp * 0.1;
}
```

**Step 3: Cancel inspect on actions**

When firing, reloading, switching, or sprinting starts, set `this._inspecting = false`.

**Step 4: Wire F key for inspect**

In `js/main.js`, the F key currently toggles AWP scope (~line 1367). Change to:
- If current weapon is AWP: toggle scope (existing behavior)
- Otherwise: set `weapons._inspecting = true` on keydown, `false` on keyup

Add keyup handler for F to stop inspect.

**Step 5: Update REQUIREMENTS.md and commit**

```bash
git add js/weapons.js js/main.js REQUIREMENTS.md
git commit -m "feat: add weapon inspect animation on F key"
```

---

## Task 10: Add End-of-Match Stats Screen

**Files:**
- Modify: `js/main.js` (stat tracking counters, stats screen rendering)
- Modify: `index.html` (stats screen HTML/CSS)

**Step 1: Add stat tracking counters**

In `js/main.js`, at match initialization, add:
```javascript
var matchStats = {
  shotsFired: 0, shotsHit: 0, headshots: 0, kills: 0, deaths: 0,
  damageDelt: 0, damageTaken: 0, killsByWeapon: {},
  moneySpent: 0, grenadesThrown: 0
};
```

Increment these at appropriate points:
- `shotsFired++` when player fires (in the fire result handler)
- `shotsHit++` when a hit registers
- `killsByWeapon[weaponName]++` on kill
- `damageDelt += damage` on hit
- `damageTaken += damage` when player takes damage
- `grenadesThrown++` on grenade throw

**Step 2: Add stats screen HTML**

In `index.html`, add a new overlay div (similar to match-end):

```html
<div id="stats-screen" class="overlay-screen">
  <h1 id="stats-result">VICTORY</h1>
  <div id="stats-score"></div>
  <div id="stats-grid">
    <div class="stat-box"><div class="stat-val" id="stat-kd"></div><div class="stat-label">K / D</div></div>
    <div class="stat-box"><div class="stat-val" id="stat-accuracy"></div><div class="stat-label">Accuracy</div></div>
    <div class="stat-box"><div class="stat-val" id="stat-hs"></div><div class="stat-label">HS %</div></div>
    <div class="stat-box"><div class="stat-val" id="stat-damage"></div><div class="stat-label">Damage</div></div>
  </div>
  <div id="stats-weapons"></div>
  <div id="stats-xp"></div>
  <div class="stats-buttons">
    <button id="stats-play-again">PLAY AGAIN</button>
    <button id="stats-main-menu">MAIN MENU</button>
  </div>
</div>
```

**Step 3: Style the stats screen**

Add CSS for the stats grid (flexbox), weapon breakdown (horizontal bars), and buttons.

**Step 4: Render stats on match end**

In `endMatch()`, instead of showing the simple match-end overlay, populate and show the stats screen:

```javascript
var accuracy = matchStats.shotsFired > 0 ? Math.round(matchStats.shotsHit / matchStats.shotsFired * 100) : 0;
var hsPercent = matchStats.kills > 0 ? Math.round(matchStats.headshots / matchStats.kills * 100) : 0;
dom.statKd.textContent = matchStats.kills + ' / ' + matchStats.deaths;
dom.statAccuracy.textContent = accuracy + '%';
dom.statHs.textContent = hsPercent + '%';
dom.statDamage.textContent = matchStats.damageDelt;
// Weapon breakdown bars...
```

**Step 5: Wire Play Again and Main Menu buttons**

- Play Again: restart the same mode/map/difficulty
- Main Menu: return to menu screen

**Step 6: Update REQUIREMENTS.md and commit**

```bash
git add js/main.js index.html REQUIREMENTS.md
git commit -m "feat: add detailed end-of-match stats screen"
```

---

## Task 11: Add Weapon Skins System

**Files:**
- Modify: `js/weapons.js` (skin material overrides in model builders)
- Modify: `js/main.js` (loadout UI, skin selection, localStorage)
- Modify: `index.html` (loadout screen HTML/CSS)

**Step 1: Define skin data**

In `js/weapons.js`, add skin definitions after the material cache:

```javascript
var SKIN_DEFS = {
  0: { name: 'Default' },
  1: { name: 'Field-Tested', xp: 500, overrides: { barrel: { roughness: 0.5, metalness: 0.4, color: 0x2a2a2a }, receiver: { roughness: 0.5, metalness: 0.4, color: 0x2a2a2a } } },
  2: { name: 'Carbon', xp: 2000, overrides: { barrel: { roughness: 0.8, metalness: 0.2, color: 0x111111 }, receiver: { roughness: 0.8, metalness: 0.2, color: 0x111111 }, stock: { roughness: 0.8, metalness: 0.2, color: 0x111111 } } },
  3: { name: 'Tiger', xp: 5000, overrides: { barrel: { color: 0xff8800, metalness: 0.6 }, receiver: { color: 0x111111, metalness: 0.7 } } },
  4: { name: 'Neon', xp: 12000, overrides: { barrel: { emissive: 0x00ffff, emissiveIntensity: 0.3 }, receiver: { emissive: 0x00ffff, emissiveIntensity: 0.3 } } },
  5: { name: 'Gold', xp: 25000, overrides: { barrel: { color: 0xffd700, metalness: 0.9, roughness: 0.15 }, receiver: { color: 0xffd700, metalness: 0.9, roughness: 0.15 }, stock: { color: 0xdaa520, metalness: 0.8, roughness: 0.2 } } }
};
GAME.SKIN_DEFS = SKIN_DEFS;
```

**Step 2: Apply skins in weapon model builders**

In each `_buildXxx` method, after building the base model, check equipped skin and override materials on tagged parts. Tag key mesh parts during build (e.g., `mesh.userData.skinPart = 'barrel'`), then apply:

```javascript
WeaponSystem.prototype._applySkin = function(group) {
  var skinId = this._equippedSkins[this.current] || 0;
  if (skinId === 0) return;
  var skin = SKIN_DEFS[skinId];
  if (!skin || !skin.overrides) return;
  group.traverse(function(child) {
    if (child.isMesh && child.userData.skinPart && skin.overrides[child.userData.skinPart]) {
      var o = skin.overrides[child.userData.skinPart];
      child.material = child.material.clone();
      if (o.color !== undefined) child.material.color.setHex(o.color);
      if (o.roughness !== undefined) child.material.roughness = o.roughness;
      if (o.metalness !== undefined) child.material.metalness = o.metalness;
      if (o.emissive !== undefined) child.material.emissive = new THREE.Color(o.emissive);
      if (o.emissiveIntensity !== undefined) child.material.emissiveIntensity = o.emissiveIntensity;
    }
  });
};
```

Call `this._applySkin(g)` at the end of `_createWeaponModel`.

**Step 3: Add skin tags to weapon model parts**

In each build method, tag the barrel, receiver, and stock meshes:
```javascript
barrelMesh.userData.skinPart = 'barrel';
receiverMesh.userData.skinPart = 'receiver';
stockMesh.userData.skinPart = 'stock';
```

This requires updating each `_buildXxx` method to assign variables to key parts and tag them.

**Step 4: Load/save equipped skins from localStorage**

```javascript
this._equippedSkins = JSON.parse(localStorage.getItem('miniCS_skins') || '{}');
```

Save on change:
```javascript
localStorage.setItem('miniCS_skins', JSON.stringify(this._equippedSkins));
```

**Step 5: Add loadout UI**

In `index.html`, add a "LOADOUT" button on the main menu. Clicking opens an overlay with a grid of weapons and their available skins. Each skin shows name + lock/unlock status based on current XP.

**Step 6: Check XP unlock status**

In loadout UI rendering: `var xp = parseInt(localStorage.getItem('miniCS_xp')) || 0;` — show locked skins grayed out.

**Step 7: Update REQUIREMENTS.md and commit**

```bash
git add js/weapons.js js/main.js index.html REQUIREMENTS.md
git commit -m "feat: add procedural weapon skins system with XP unlocks"
```

---

## Task 12: Add Daily Challenge System

**Files:**
- Modify: `js/main.js` (challenge definitions, tracking, UI, seeded selection)
- Modify: `index.html` (daily challenge section on menu)

**Step 1: Define challenge pool**

In `js/main.js`:

```javascript
var DAILY_CHALLENGES = [
  { id: 'headhunter',    name: 'Headhunter',    desc: 'Get 10 headshots',                       target: 10, xp: 75,  track: 'headshots' },
  { id: 'pistol_pro',    name: 'Pistol Pro',     desc: 'Kill 5 enemies with pistol',             target: 5,  xp: 50,  track: 'pistol_kills' },
  { id: 'eco_warrior',   name: 'Eco Warrior',    desc: 'Win a round spending $1000 or less',     target: 1,  xp: 100, track: 'eco_wins' },
  { id: 'spray_control', name: 'Spray Control',  desc: 'Get 3 rifle kills in a single spray',    target: 3,  xp: 75,  track: 'spray_kills' },
  { id: 'sniper_elite',  name: 'Sniper Elite',   desc: 'Get 3 AWP kills',                        target: 3,  xp: 75,  track: 'awp_kills' },
  { id: 'knife_fighter', name: 'Knife Fighter',  desc: 'Get 2 knife kills',                      target: 2,  xp: 100, track: 'knife_kills' },
  { id: 'survivor',      name: 'Survivor',       desc: 'Win with 10 HP or less',                 target: 1,  xp: 80,  track: 'low_hp_wins' },
  { id: 'bomb_expert',   name: 'Bomb Expert',    desc: 'Plant the bomb 2 times',                 target: 2,  xp: 60,  track: 'plants' },
  { id: 'defuser',       name: 'Defuser',        desc: 'Defuse the bomb',                        target: 1,  xp: 80,  track: 'defuses' },
  { id: 'grenadier',     name: 'Grenadier',      desc: 'Get 2 grenade kills',                    target: 2,  xp: 60,  track: 'grenade_kills' },
  { id: 'flawless',      name: 'Flawless',       desc: 'Win a round without taking damage',      target: 1,  xp: 120, track: 'flawless_rounds' },
  { id: 'marathon',      name: 'Marathon',        desc: 'Play 3 complete matches',                target: 3,  xp: 50,  track: 'matches_played' },
  { id: 'streak',        name: 'Streak',          desc: 'Get a 3-kill streak',                    target: 1,  xp: 75,  track: 'streaks' },
  { id: 'utility_user',  name: 'Utility User',   desc: 'Use all grenade types in one match',     target: 1,  xp: 60,  track: 'all_nades' },
  { id: 'clutch',        name: 'Clutch',          desc: 'Win a 1vX (last alive, 2+ enemies)',     target: 1,  xp: 150, track: 'clutches' }
];
```

**Step 2: Seeded daily selection**

```javascript
function getDailyChallenges() {
  var dayIndex = Math.floor(Date.now() / 86400000);
  var saved = JSON.parse(localStorage.getItem('miniCS_daily') || '{}');
  if (saved.day === dayIndex) return saved;

  // Seeded random selection of 3
  function seededRandom(seed) { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var seed = dayIndex;
  var indices = [];
  while (indices.length < 3) {
    seed = (seed * 16807) % 2147483647;
    var idx = Math.floor(seededRandom(seed) * DAILY_CHALLENGES.length);
    if (indices.indexOf(idx) === -1) indices.push(idx);
  }

  var challenges = indices.map(function(i) {
    return { id: DAILY_CHALLENGES[i].id, progress: 0 };
  });

  saved = { day: dayIndex, challenges: challenges };
  localStorage.setItem('miniCS_daily', JSON.stringify(saved));
  return saved;
}
```

**Step 3: Track daily challenge progress**

Add a `trackDailyEvent(trackKey, amount)` function that checks if any active challenge uses that track key and increments progress:

```javascript
function trackDailyEvent(trackKey, amount) {
  var daily = getDailyChallenges();
  var changed = false;
  for (var i = 0; i < daily.challenges.length; i++) {
    var ch = daily.challenges[i];
    var def = DAILY_CHALLENGES.find(function(d) { return d.id === ch.id; });
    if (def && def.track === trackKey && ch.progress < def.target) {
      ch.progress = Math.min(def.target, ch.progress + (amount || 1));
      changed = true;
      if (ch.progress >= def.target) {
        awardXP(def.xp);
        showAnnouncement('Daily: ' + def.name + ' +' + def.xp + ' XP');
      }
    }
  }
  if (changed) localStorage.setItem('miniCS_daily', JSON.stringify(daily));
}
```

**Step 4: Sprinkle tracking calls throughout existing code**

- On headshot kill: `trackDailyEvent('headshots', 1)`
- On pistol kill: `trackDailyEvent('pistol_kills', 1)`
- On AWP kill: `trackDailyEvent('awp_kills', 1)`
- On knife kill: `trackDailyEvent('knife_kills', 1)`
- On grenade kill: `trackDailyEvent('grenade_kills', 1)`
- On match complete: `trackDailyEvent('matches_played', 1)`
- On bomb plant: `trackDailyEvent('plants', 1)`
- On defuse: `trackDailyEvent('defuses', 1)`
- On streak: `trackDailyEvent('streaks', 1)`
- etc.

**Step 5: Add daily challenge UI to menu**

In `index.html`, add a "DAILY" section on the main menu:

```html
<div id="daily-challenges">
  <h3>DAILY CHALLENGES</h3>
  <div id="daily-list"></div>
</div>
```

In `js/main.js`, populate on menu show:

```javascript
function updateDailyUI() {
  var daily = getDailyChallenges();
  var html = '';
  for (var i = 0; i < daily.challenges.length; i++) {
    var ch = daily.challenges[i];
    var def = DAILY_CHALLENGES.find(function(d) { return d.id === ch.id; });
    var pct = Math.min(100, Math.round(ch.progress / def.target * 100));
    var done = ch.progress >= def.target;
    html += '<div class="daily-card' + (done ? ' done' : '') + '">' +
      '<div class="daily-name">' + def.name + '</div>' +
      '<div class="daily-desc">' + def.desc + '</div>' +
      '<div class="daily-bar"><div class="daily-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="daily-reward">+' + def.xp + ' XP</div>' +
      '</div>';
  }
  dom.dailyList.innerHTML = html;
}
```

**Step 6: Style daily challenge cards**

Add CSS for `.daily-card`, `.daily-bar`, `.daily-fill`, `.done` states.

**Step 7: Update REQUIREMENTS.md and commit**

```bash
git add js/main.js index.html REQUIREMENTS.md
git commit -m "feat: add daily challenge system with 15 rotating challenges"
```

---

## Summary

| Task | Feature | Primary Files |
|------|---------|---------------|
| 1 | SMG (MP5) | weapons.js, sound.js, main.js, enemies.js, index.html |
| 2 | Helmet + Kevlar | main.js, weapons.js, index.html |
| 3 | Smoke Grenade | weapons.js, main.js, enemies.js, sound.js, index.html |
| 4 | Flashbang Grenade | weapons.js, main.js, enemies.js, sound.js, index.html |
| 5 | Footstep Audio | sound.js, player.js, enemies.js |
| 6 | Ambient Map Audio | sound.js, main.js |
| 7 | Kill Sound + MVP | sound.js, main.js |
| 8 | Camera Feel | player.js |
| 9 | Weapon Inspect | weapons.js, main.js |
| 10 | Stats Screen | main.js, index.html |
| 11 | Weapon Skins | weapons.js, main.js, index.html |
| 12 | Daily Challenges | main.js, index.html |

Each task commits independently. Tasks 1-4 are the highest impact (new gameplay mechanics). Tasks 5-9 are polish. Tasks 10-12 are progression/retention.
