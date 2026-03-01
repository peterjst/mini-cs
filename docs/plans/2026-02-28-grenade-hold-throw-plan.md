# CS-Style Grenade Hold & Throw — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all three grenade types (HE, Smoke, Flash) equippable and holdable in hand before throwing, matching CS grenade flow.

**Architecture:** Unify Smoke and Flash into the weapon switching system alongside the existing HE grenade. Add a grenade equip state with pin-pull animation delay. Remap buy keys so Kevlar+Helmet uses [6] and HE grenade uses [7]. Build first-person models for Smoke and Flash grenades.

**Tech Stack:** Three.js r160.1 (procedural geometry), vanilla JS IIFE modules, Web Audio API.

---

### Task 1: Remap Buy Keys — Kevlar to [6], HE Grenade to [7]

**Files:**
- Modify: `index.html` (buy menu HTML, ~lines 1476-1491)
- Modify: `js/main.js` (key handlers, ~lines 1392-1409)

**Step 1: Update buy menu HTML in `index.html`**

Find the buy item entries and swap the key labels. Change the HE Grenade key display from `[6]` to `[7]`, and Kevlar+Helmet from `[7]` to `[6]`. Reorder the HTML so items appear in key order (grenade `[6]` → armor `[7]` becomes armor `[6]` → grenade `[7]`):

```html
<!-- BEFORE (current order): grenade [6], armor [7], smoke [8], flash [9] -->
<!-- AFTER (new order): armor [6], grenade [7], smoke [8], flash [9] -->

<div class="buy-item" data-item="armor">
  <span><span class="item-name">Kevlar + Helmet</span><span class="item-key">[6]</span></span>
  <span class="item-price">$1000</span>
</div>
<div class="buy-item" data-item="grenade">
  <span><span class="item-name">HE Grenade</span><span class="item-key">[7]</span></span>
  <span class="item-price">$300</span>
</div>
<div class="buy-item" data-item="smoke">
  <span><span class="item-name">Smoke Grenade</span><span class="item-key">[8]</span></span>
  <span class="item-price">$300</span>
</div>
<div class="buy-item" data-item="flash">
  <span><span class="item-name">Flashbang</span><span class="item-key">[9]</span></span>
  <span class="item-price">$200</span>
</div>
```

**Step 2: Update buy-phase key handlers in `js/main.js` (~lines 1392-1400)**

Swap the key bindings so `'6'` triggers `tryBuy('armor')` and `'7'` triggers `tryBuy('grenade')`:

```javascript
// BEFORE:
if (k === '6') tryBuy('grenade');
if (k === '7') tryBuy('armor');

// AFTER:
if (k === '6') tryBuy('armor');
if (k === '7') tryBuy('grenade');
```

**Step 3: Update in-game key handlers in `js/main.js` (~lines 1401-1409)**

Change HE grenade equip key from `'6'` to `'7'` (keep `'g'` as alternate):

```javascript
// BEFORE:
if (k === '6' || k === 'g') weapons.switchTo('grenade');

// AFTER:
if (k === '7' || k === 'g') weapons.switchTo('grenade');
```

**Step 4: Test in browser**

Open `index.html`, start a game. Press B to open buy menu. Verify:
- [6] buys Kevlar+Helmet
- [7] buys HE Grenade
- [8] buys Smoke
- [9] buys Flashbang
- In combat, [7] or [G] switches to HE grenade

**Step 5: Commit**

```bash
git add index.html js/main.js
git commit -m "feat: remap buy keys — Kevlar to [6], HE grenade to [7]"
```

---

### Task 2: Add Smoke and Flash to Weapon Switching System

**Files:**
- Modify: `js/weapons.js` (~lines 735, 800-825, 1310-1327)

**Step 1: Add `smoke` and `flash` to the `owned` object**

In the WeaponSystem constructor (~line 735), the `owned` object currently has `grenade: false` but not smoke/flash. Add them:

```javascript
// BEFORE:
this.owned = { knife: true, pistol: true, smg: false, shotgun: false, rifle: false, awp: false, grenade: false };

// AFTER:
this.owned = { knife: true, pistol: true, smg: false, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
```

**Step 2: Update `switchTo()` to handle smoke and flash (~lines 1310-1327)**

Extend the grenade-specific logic to also handle smoke and flash:

```javascript
WeaponSystem.prototype.switchTo = function(weapon) {
  if (weapon === 'grenade') {
    if (this.grenadeCount <= 0) return false;
    if (this.current === 'grenade') return false;
    this._prevWeapon = this.current;
  } else if (weapon === 'smoke') {
    if (this.smokeCount <= 0) return false;
    if (this.current === 'smoke') return false;
    this._prevWeapon = this.current;
  } else if (weapon === 'flash') {
    if (this.flashCount <= 0) return false;
    if (this.current === 'flash') return false;
    this._prevWeapon = this.current;
  } else {
    if (!this.owned[weapon] || this.current === weapon) return false;
  }
  this._unscope();
  this._boltCycling = false;
  this._boltTimer = 0;
  this.current = weapon;
  this.reloading = false;
  this.reloadTimer = 0;
  this._createWeaponModel();
  if (GAME.Sound) GAME.Sound.switchWeapon();
  return true;
};
```

**Step 3: Update `_createWeaponModel()` to build smoke/flash models (~lines 800-825)**

Add branches for `smoke` and `flash` in the model creation. For now, use placeholder models (will be refined in Task 4):

```javascript
// After the existing grenade branch:
} else if (this.current === 'grenade') {
  this._buildGrenadeModel(g, m);
} else if (this.current === 'smoke') {
  this._buildSmokeHandModel(g, m);
} else if (this.current === 'flash') {
  this._buildFlashHandModel(g, m);
}
```

**Step 4: Update in-game key handlers in `js/main.js` (~lines 1401-1409)**

Change smoke and flash from direct throw to switchTo:

```javascript
// BEFORE:
if (k === '8') weapons.throwSmoke();
if (k === '9') weapons.throwFlash();

// AFTER:
if (k === '8') weapons.switchTo('smoke');
if (k === '9') weapons.switchTo('flash');
```

**Step 5: Commit**

```bash
git add js/weapons.js js/main.js
git commit -m "feat: add smoke and flash to weapon switching system"
```

---

### Task 3: Implement Grenade Equip Animation (Pin-Pull Delay)

**Files:**
- Modify: `js/weapons.js` (switchTo, update, tryFire methods)

**Step 1: Add grenade equip state properties to constructor (~line 735 area)**

```javascript
this._grenadeEquipping = false;
this._grenadeEquipTimer = 0;
this._grenadeEquipDuration = 0.5; // 0.5s pin-pull delay
```

**Step 2: Set equip state in `switchTo()` for grenade types**

When switching to any grenade type, set the equipping flag. Add this just before `this._createWeaponModel()` in switchTo, inside each grenade branch:

```javascript
// For grenade, smoke, and flash branches, after setting this.current:
this._grenadeEquipping = true;
this._grenadeEquipTimer = 0;
```

**Step 3: Update the equip animation in the `update()` method**

Find the `update(dt)` method in WeaponSystem. Add grenade equip animation logic. During equipping, bob the weapon model upward (simulating pin pull):

```javascript
// Add inside update(dt), near the top:
if (this._grenadeEquipping) {
  this._grenadeEquipTimer += dt;
  if (this._grenadeEquipTimer >= this._grenadeEquipDuration) {
    this._grenadeEquipping = false;
  }
  // Pin-pull bob animation: rise up then settle back
  if (this.weaponModel) {
    var t = this._grenadeEquipTimer / this._grenadeEquipDuration;
    var bob = Math.sin(t * Math.PI) * 0.05; // 0.05 unit upward arc
    this.weaponModel.position.y = -0.28 + bob;
  }
}
```

**Step 4: Block firing during equip animation in `tryFire()`**

At the top of `tryFire()` (~line 1376), add a guard:

```javascript
if (this._grenadeEquipping) return null;
```

**Step 5: Test in browser**

Buy an HE grenade, press [7]. Verify:
- Grenade model appears with upward bob animation over ~0.5s
- Cannot throw during the animation
- After animation completes, left-click throws

**Step 6: Commit**

```bash
git add js/weapons.js
git commit -m "feat: add pin-pull equip animation for grenades"
```

---

### Task 4: Build First-Person Models for Smoke and Flash Grenades

**Files:**
- Modify: `js/weapons.js` (add two new build methods)

**Step 1: Add `_buildSmokeHandModel()` method**

Add after `_buildGrenadeModel()` (~line 1210). Style: dark green cylinder with silver top cap, matching the thrown SmokeGrenadeObj model but larger for first-person view:

```javascript
WeaponSystem.prototype._buildSmokeHandModel = function(g, m) {
  // Body — dark green cylinder
  PC(g, 0.05, 0.05, 0.13, 10, m.grenade, 0, 0.02, -0.05);
  // Override body color to dark green
  g.children[g.children.length - 1].material = new THREE.MeshStandardMaterial({
    color: 0x2e7d32, roughness: 0.5, metalness: 0.3
  });
  // Top cap
  PC(g, 0.03, 0.05, 0.02, 8, m.grenTop, 0, 0.095, -0.05);
  // Fuse cap
  PC(g, 0.015, 0.015, 0.015, 6, m.chrome, 0, 0.115, -0.05);
  // Spoon lever
  P(g, 0.015, 0.1, 0.02, m.aluminum, 0.045, 0.04, -0.05);
  // Pin ring
  PC(g, 0.016, 0.016, 0.01, 6, m.chrome, 0.06, 0.09, -0.05);
  // Label band (green-tinted)
  PC(g, 0.052, 0.052, 0.015, 10, new THREE.MeshStandardMaterial({
    color: 0x4caf50, roughness: 0.6, metalness: 0.1
  }), 0, 0.05, -0.05);
};
```

**Step 2: Add `_buildFlashHandModel()` method**

Add after `_buildSmokeHandModel()`. Style: light gray/silver cylinder, shorter and rounder, matching FlashGrenadeObj:

```javascript
WeaponSystem.prototype._buildFlashHandModel = function(g, m) {
  // Body — light gray cylinder
  PC(g, 0.045, 0.045, 0.11, 10, m.grenade, 0, 0.02, -0.05);
  g.children[g.children.length - 1].material = new THREE.MeshStandardMaterial({
    color: 0xcccccc, roughness: 0.3, metalness: 0.6
  });
  // Top cap
  PC(g, 0.028, 0.045, 0.025, 8, m.grenTop, 0, 0.09, -0.05);
  // Fuse cap
  PC(g, 0.015, 0.015, 0.015, 6, m.chrome, 0, 0.11, -0.05);
  // Spoon lever
  P(g, 0.015, 0.1, 0.02, m.aluminum, 0.045, 0.03, -0.05);
  // Pin ring
  PC(g, 0.016, 0.016, 0.01, 6, m.chrome, 0.06, 0.085, -0.05);
  // Blue band (flashbang identifier)
  PC(g, 0.048, 0.048, 0.012, 10, new THREE.MeshStandardMaterial({
    color: 0x42a5f5, roughness: 0.5, metalness: 0.2
  }), 0, 0.055, -0.05);
};
```

**Step 3: Test in browser**

Buy each grenade type. Verify each shows a distinct first-person model:
- HE: olive drab with orange band (existing)
- Smoke: dark green with green band
- Flash: light gray/silver with blue band

**Step 4: Commit**

```bash
git add js/weapons.js
git commit -m "feat: add first-person models for smoke and flash grenades"
```

---

### Task 5: Unify Throw Logic for All Grenade Types

**Files:**
- Modify: `js/weapons.js` (tryFire, throwSmoke, throwFlash methods)

**Step 1: Extend `tryFire()` to handle smoke and flash throws (~lines 1385-1400)**

Currently `tryFire()` only handles `def.isGrenade` which matches HE. Add smoke and flash weapon definitions to WEAPON_DEFS, or detect grenade types by name. The simplest approach: check `this.current` for grenade types in tryFire:

```javascript
// In tryFire(), replace the existing grenade block with:
var isGrenadeType = (this.current === 'grenade' || this.current === 'smoke' || this.current === 'flash');

if (isGrenadeType) {
  if (this.current === 'grenade') {
    if (this.grenadeCount <= 0) return null;
    this.grenadeCount--;
    this._throwGrenade();
    if (GAME.Sound) GAME.Sound.grenadeThrow();
    if (GAME.Sound) GAME.Sound.radioVoice('Fire in the hole!');
    if (this.grenadeCount <= 0) this.owned.grenade = false;
  } else if (this.current === 'smoke') {
    if (this.smokeCount <= 0) return null;
    this.smokeCount--;
    this._throwSmokeGrenade();
    if (GAME.Sound) GAME.Sound.grenadeThrow();
  } else if (this.current === 'flash') {
    if (this.flashCount <= 0) return null;
    this.flashCount--;
    this._throwFlashGrenade();
    if (GAME.Sound) GAME.Sound.grenadeThrow();
  }

  this.lastFireTime = now;
  // Switch back to previous weapon
  var switchTo = this._prevWeapon || 'pistol';
  if (!this.owned[switchTo]) switchTo = 'pistol';
  this.current = switchTo;
  this._createWeaponModel();
  return [{ type: 'grenade_thrown', damage: 0 }];
}
```

**Step 2: Create `_throwSmokeGrenade()` and `_throwFlashGrenade()` internal methods**

Extract the throw logic from the existing `throwSmoke()` and `throwFlash()` public methods into internal methods that don't check counts (since tryFire already does):

```javascript
WeaponSystem.prototype._throwSmokeGrenade = function() {
  var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
  var pos = this.camera.position.clone().add(fwd.clone().multiplyScalar(1.2));
  var vel = fwd.clone().multiplyScalar(18);
  vel.y += 5;
  var nade = new SmokeGrenadeObj(this.scene, pos, vel, this._wallsRef);
  this._grenades.push(nade);
};

WeaponSystem.prototype._throwFlashGrenade = function() {
  var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
  var pos = this.camera.position.clone().add(fwd.clone().multiplyScalar(1.2));
  var vel = fwd.clone().multiplyScalar(18);
  vel.y += 5;
  var nade = new FlashGrenadeObj(this.scene, pos, vel, this._wallsRef);
  this._grenades.push(nade);
};
```

**Step 3: Keep old `throwSmoke()` / `throwFlash()` as wrappers or remove**

Since main.js no longer calls them directly (changed to switchTo in Task 2), these public methods can be removed. However, check if anything else references them first. If nothing does, remove them. If bots use them, keep them.

**Step 4: Add smoke/flash WEAPON_DEFS entries (needed for fireRate check in tryFire)**

Add minimal weapon definitions so tryFire can read `fireRate`:

```javascript
// Add to WEAPON_DEFS object:
smoke_grenade: { name: 'Smoke Grenade', damage: 0, fireRate: 0.8, magSize: 1, reserveAmmo: 0, reloadTime: 0, price: 300, range: 0, auto: false, isKnife: false, isGrenade: true, spread: 0, pellets: 1, penetration: 0, penDmgMult: 0 },
flash_grenade: { name: 'Flashbang', damage: 0, fireRate: 0.8, magSize: 1, reserveAmmo: 0, reloadTime: 0, price: 200, range: 0, auto: false, isKnife: false, isGrenade: true, spread: 0, pellets: 1, penetration: 0, penDmgMult: 0 },
```

But since `this.current` is `'smoke'` not `'smoke_grenade'`, either rename or map. Simplest: in tryFire, skip the `WEAPON_DEFS[this.current]` lookup for grenade types and handle them before the def lookup. The existing code already does `var def = WEAPON_DEFS[this.current]` — for smoke/flash this would be undefined. So handle the `isGrenadeType` check BEFORE the def lookup.

**Step 5: Test in browser**

Buy all three grenade types. For each:
- Press the equip key → grenade appears in hand with pin-pull animation
- Left-click → grenade throws, switches back to previous weapon
- Verify HE explodes, smoke deploys smoke cloud, flash blinds

**Step 6: Commit**

```bash
git add js/weapons.js
git commit -m "feat: unify throw logic for all grenade types via tryFire"
```

---

### Task 6: Update Ownership Tracking for Smoke and Flash

**Files:**
- Modify: `js/weapons.js` (buyGrenade area, round reset)
- Modify: `js/main.js` (tryBuy, round reset)

**Step 1: Set `owned.smoke` and `owned.flash` when purchasing**

In `tryBuy()` in main.js (~lines 2845-2856), set ownership when buying:

```javascript
} else if (item === 'smoke') {
  if (weapons.smokeCount >= 1) return;
  if (player.money < 300) return;
  player.money -= 300;
  weapons.smokeCount++;
  weapons.owned.smoke = true;  // ADD THIS
  bought = true;
} else if (item === 'flash') {
  if (weapons.flashCount >= 2) return;
  if (player.money < 200) return;
  player.money -= 200;
  weapons.flashCount++;
  weapons.owned.flash = true;  // ADD THIS
  bought = true;
}
```

**Step 2: Clear smoke/flash ownership on throw when count reaches 0**

In the tryFire grenade block (from Task 5):

```javascript
} else if (this.current === 'smoke') {
  // ... existing throw code ...
  if (this.smokeCount <= 0) this.owned.smoke = false;
} else if (this.current === 'flash') {
  // ... existing throw code ...
  if (this.flashCount <= 0) this.owned.flash = false;
}
```

**Step 3: Reset ownership on round reset**

Find the round reset code (search for where `grenadeCount = 0` is set). Ensure smoke/flash ownership also resets:

```javascript
weapons.owned.smoke = false;
weapons.owned.flash = false;
```

**Step 4: Test in browser**

- Buy smoke, press [8] to equip, throw it. Press [8] again — should not switch (no smoke left).
- Buy 2 flashbangs, throw one, press [9] — should still equip (1 left). Throw second, press [9] — should not switch.

**Step 5: Commit**

```bash
git add js/weapons.js js/main.js
git commit -m "feat: track smoke/flash ownership for weapon switching"
```

---

### Task 7: Update HUD and Ammo Display for Held Grenades

**Files:**
- Modify: `js/main.js` (HUD update section)

**Step 1: Update ammo display for grenade types**

Find where the HUD ammo display is updated (search for `grenade-count` or ammo display logic). When the current weapon is a grenade type, show the grenade name instead of ammo count. The current code likely shows mag/reserve for the current weapon. For grenade types, display the type name and remaining count.

```javascript
// In the HUD update section, when displaying ammo:
if (weapons.current === 'grenade') {
  dom.ammoDisplay.textContent = 'HE x' + weapons.grenadeCount;
} else if (weapons.current === 'smoke') {
  dom.ammoDisplay.textContent = 'SM x' + weapons.smokeCount;
} else if (weapons.current === 'flash') {
  dom.ammoDisplay.textContent = 'FL x' + weapons.flashCount;
}
```

**Step 2: Test in browser**

Equip each grenade type and verify the ammo display shows the correct label and count.

**Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: update HUD ammo display for held grenades"
```

---

### Task 8: Handle Edge Cases and Polish

**Files:**
- Modify: `js/weapons.js`
- Modify: `js/main.js`

**Step 1: Prevent switching to grenade if already holding another grenade type**

In `switchTo()`, if currently holding a grenade type and trying to switch to another grenade type, switch back first:

```javascript
// At the top of switchTo(), before the grenade branches:
var currentIsGrenade = (this.current === 'grenade' || this.current === 'smoke' || this.current === 'flash');
var targetIsGrenade = (weapon === 'grenade' || weapon === 'smoke' || weapon === 'flash');
if (currentIsGrenade && targetIsGrenade && this.current !== weapon) {
  // Switching between grenade types — update _prevWeapon only if it's not already a grenade
  // (keep the original non-grenade weapon to return to after throw)
}
```

**Step 2: Handle quick-switch cancellation**

If the player presses a weapon key (1-5) while holding a grenade, it should switch to that weapon without throwing. The existing switchTo logic already handles this since switching to a non-grenade weapon just does a normal weapon switch.

Verify: if currently holding grenade, pressing [1] for knife should switch to knife without throwing.

**Step 3: Ensure `_prevWeapon` doesn't get set to a grenade type**

When switching between grenade types, don't overwrite `_prevWeapon` with the current grenade — keep the last non-grenade weapon:

```javascript
// In each grenade branch of switchTo():
if (!currentIsGrenade) {
  this._prevWeapon = this.current;
}
```

**Step 4: Reset grenade equip state on weapon switch away**

If the player switches away during pin-pull animation, clear the equip state:

```javascript
// At the top of switchTo(), add:
this._grenadeEquipping = false;
this._grenadeEquipTimer = 0;
```

**Step 5: Test edge cases in browser**

- Buy HE + Smoke. Press [7] (HE), then immediately press [8] (Smoke) — should switch to smoke, throw smoke, return to previous gun.
- Press [7] to equip HE, then press [1] for knife — should cancel grenade and switch to knife without throwing.
- Throw last grenade — should auto-switch back to previous weapon.

**Step 6: Commit**

```bash
git add js/weapons.js js/main.js
git commit -m "feat: handle grenade switching edge cases"
```

---

### Task 9: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

**Step 1: Update grenade sections**

Update all references to grenade mechanics:
- Grenade lifecycle (equip → pin-pull → hold → throw)
- Key bindings: Kevlar [6], HE [7], Smoke [8], Flash [9]
- Pin-pull animation duration (0.5s)
- No cooking mechanic
- First-person models for all three types
- Smoke and Flash now use weapon switching system

**Step 2: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with grenade hold-and-throw mechanics"
```

---

### Task Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Remap buy keys (Kevlar→[6], HE→[7]) | index.html, main.js |
| 2 | Add smoke/flash to weapon switching | weapons.js, main.js |
| 3 | Grenade equip animation (pin-pull) | weapons.js |
| 4 | First-person models for smoke/flash | weapons.js |
| 5 | Unify throw logic via tryFire | weapons.js |
| 6 | Ownership tracking for smoke/flash | weapons.js, main.js |
| 7 | HUD ammo display for held grenades | main.js |
| 8 | Edge cases and polish | weapons.js, main.js |
| 9 | Update REQUIREMENTS.md | REQUIREMENTS.md |
