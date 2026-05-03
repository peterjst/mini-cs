# Tour Mode Unlimited Supplies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player every weapon and grenade with unlimited reserve and unlimited throwable counts in tour mode. Magazine-and-reload cadence stays intact.

**Architecture:** Use `Infinity` as the value for `reserve[*]`, `grenadeCount`, `smokeCount`, `flashCount`. Existing weapon math (`Infinity - n`, `Math.min`, `<= 0` gates) already behaves correctly. `WEAPON_DEFS.knife` already uses `Infinity` for `magSize`/`reserveCap`, so this isn't a new pattern. A small `WeaponSystem.giveUnlimitedSupplies()` helper centralizes the change so it can be unit-tested directly. HUD and mobile touch UI get small format tweaks to render `∞` instead of the JS string `"Infinity"`.

**Tech Stack:** Plain JS (IIFE pattern, no ES modules), Three.js r160.1 (global `THREE`), Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-05-03-tour-unlimited-supplies-design.md`

---

## File Map

| File | Change |
|---|---|
| `js/systems/weapons.js` | Add `WeaponSystem.prototype.giveUnlimitedSupplies()` |
| `js/core/main.js` | Call helper in `startTour` after `resetAmmo()`; expand `owned` set |
| `js/ui/hud.js` | Format `Infinity` as `∞` in mag/reserve/grenade-count displays |
| `js/ui/touch.js` | Same format change at three sites in mobile UI |
| `tests/unit/weapons.test.js` | Add tests for `giveUnlimitedSupplies()` and Infinity-safe math |
| `tests/unit/hud.test.js` | Add tests for `∞` formatting |

Tour mode wiring (`startTour`) is heavy to mock (scene/map/player init), so it is verified via manual QA only. The unit-testable surface is the `giveUnlimitedSupplies()` helper plus the formatting logic.

---

## Task 1: Add `giveUnlimitedSupplies()` helper to WeaponSystem

**Files:**
- Modify: `js/systems/weapons.js` (add new prototype method, place it directly after `resetAmmo` at line 742)
- Test: `tests/unit/weapons.test.js`

- [ ] **Step 1: Write failing tests**

Append this `describe` block to the end of `tests/unit/weapons.test.js`:

```js
describe('giveUnlimitedSupplies (tour mode helper)', () => {
  function makeWS() {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    return new GAME.WeaponSystem(camera, scene);
  }

  it('marks every non-knife firearm and every grenade type as owned', () => {
    var ws = makeWS();
    ws.giveUnlimitedSupplies();
    expect(ws.owned.knife).toBe(true);
    expect(ws.owned.pistol).toBe(true);
    expect(ws.owned.smg).toBe(true);
    expect(ws.owned.shotgun).toBe(true);
    expect(ws.owned.rifle).toBe(true);
    expect(ws.owned.awp).toBe(true);
    expect(ws.owned.grenade).toBe(true);
    expect(ws.owned.smoke).toBe(true);
    expect(ws.owned.flash).toBe(true);
  });

  it('sets every firearm reserve to Infinity', () => {
    var ws = makeWS();
    ws.giveUnlimitedSupplies();
    expect(ws.reserve.pistol).toBe(Infinity);
    expect(ws.reserve.smg).toBe(Infinity);
    expect(ws.reserve.shotgun).toBe(Infinity);
    expect(ws.reserve.rifle).toBe(Infinity);
    expect(ws.reserve.awp).toBe(Infinity);
  });

  it('fills firearm magazines to magSize', () => {
    var ws = makeWS();
    ws.giveUnlimitedSupplies();
    expect(ws.ammo.pistol).toBe(GAME.WEAPON_DEFS.pistol.magSize);
    expect(ws.ammo.smg).toBe(GAME.WEAPON_DEFS.smg.magSize);
    expect(ws.ammo.rifle).toBe(GAME.WEAPON_DEFS.rifle.magSize);
    expect(ws.ammo.awp).toBe(GAME.WEAPON_DEFS.awp.magSize);
  });

  it('sets all three grenade counts to Infinity', () => {
    var ws = makeWS();
    ws.giveUnlimitedSupplies();
    expect(ws.grenadeCount).toBe(Infinity);
    expect(ws.smokeCount).toBe(Infinity);
    expect(ws.flashCount).toBe(Infinity);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/weapons.test.js -t "giveUnlimitedSupplies"`
Expected: FAIL with `ws.giveUnlimitedSupplies is not a function`.

- [ ] **Step 3: Implement the helper**

In `js/systems/weapons.js`, directly after the `resetAmmo` method (which currently ends at line 742), add:

```js
  WeaponSystem.prototype.giveUnlimitedSupplies = function() {
    for (var key in WEAPON_DEFS) {
      this.owned[key] = true;
      var def = WEAPON_DEFS[key];
      if (!def.isGrenade && !def.isKnife) {
        this.ammo[key] = def.magSize;
        this.reserve[key] = Infinity;
      }
    }
    this.grenadeCount = Infinity;
    this.smokeCount = Infinity;
    this.flashCount = Infinity;
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/weapons.test.js -t "giveUnlimitedSupplies"`
Expected: PASS (4 tests).

Then run the full weapons suite to confirm no regressions:

Run: `npx vitest run tests/unit/weapons.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add js/systems/weapons.js tests/unit/weapons.test.js
git commit -m "feat(weapons): add giveUnlimitedSupplies() helper for tour mode"
```

---

## Task 2: Verify Infinity-safe math in fire/reload/throw paths

**Files:**
- Test: `tests/unit/weapons.test.js`

This task adds regression tests proving the existing weapon math is safe under `Infinity`. No production code changes — these tests guard the assumption that the design relies on. Add them to the same `describe` block from Task 1.

- [ ] **Step 1: Write the failing tests** (they will actually pass on first run; this confirms our assumption)

Append inside the `describe('giveUnlimitedSupplies (tour mode helper)', ...)` block from Task 1:

```js
  it('reload preserves Infinity reserve and refills mag to magSize', () => {
    var ws = makeWS();
    ws.giveUnlimitedSupplies();
    ws.current = 'rifle';
    ws.ammo.rifle = 0;
    var reloadTime = GAME.WEAPON_DEFS.rifle.reloadTime;
    ws.startReload();
    expect(ws.reloading).toBe(true);
    // Advance time past reloadTime to complete reload
    ws.update(reloadTime + 0.01, null, 0, 0);
    expect(ws.reloading).toBe(false);
    expect(ws.ammo.rifle).toBe(GAME.WEAPON_DEFS.rifle.magSize);
    expect(ws.reserve.rifle).toBe(Infinity);
  });

  it('startReload is allowed when reserve is Infinity', () => {
    var ws = makeWS();
    ws.giveUnlimitedSupplies();
    ws.current = 'pistol';
    ws.ammo.pistol = 0; // empty mag
    ws.startReload();
    expect(ws.reloading).toBe(true);
  });

  it('grenade throw keeps Infinity count and keeps owned flag true', () => {
    var ws = makeWS();
    ws.giveUnlimitedSupplies();
    // Stub the heavy throw side-effects (mesh creation, scene add, sound)
    ws._throwGrenade = function() {};
    ws._throwSmokeGrenade = function() {};
    ws._throwFlashGrenade = function() {};
    ws._createWeaponModel = function() {};
    ws._prevWeapon = 'rifle';

    ws.current = 'grenade';
    ws.tryFire(0, []);
    expect(ws.grenadeCount).toBe(Infinity);
    expect(ws.owned.grenade).toBe(true);

    ws.current = 'smoke';
    ws.tryFire(10, []);
    expect(ws.smokeCount).toBe(Infinity);
    expect(ws.owned.smoke).toBe(true);

    ws.current = 'flash';
    ws.tryFire(20, []);
    expect(ws.flashCount).toBe(Infinity);
    expect(ws.owned.flash).toBe(true);
  });
```

Note: `tryFire` requires either `document.pointerLockElement` OR `GAME.isMobile`. The vitest setup likely doesn't satisfy pointer lock; if the test exits early with `null`, set `GAME.isMobile = true` at the start of the throw test (and reset it after). Check the existing `weapons.test.js` for how other fire-path tests handle this — copy the pattern if they set a guard.

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/unit/weapons.test.js -t "giveUnlimitedSupplies"`
Expected: 7 PASS total. If the throw test fails because `tryFire` returns `null` early, prepend `GAME.isMobile = true;` inside that test (and reset to its prior value via `afterEach` or a try/finally).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/weapons.test.js
git commit -m "test(weapons): pin Infinity-safe math for reload and grenade throw"
```

---

## Task 3: Wire `giveUnlimitedSupplies()` into `startTour`

**Files:**
- Modify: `js/core/main.js:1010-1014`

- [ ] **Step 1: Read the current block**

Lines 1010–1014 of `js/core/main.js` currently read:

```js
    player.money = 1000000;
    weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, awp: true, grenade: false };
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();
```

- [ ] **Step 2: Replace with the unlimited setup**

Edit those lines to:

```js
    player.money = 1000000;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons.giveUnlimitedSupplies();
    weapons._createWeaponModel();
```

The `weapons.owned = {...}` line is removed because `giveUnlimitedSupplies()` sets every key in `WEAPON_DEFS` to `true` (including knife, pistol, smg, shotgun, rifle, awp, grenade, smoke, flash). The `resetAmmo()` call is kept first so the helper's mag/reserve assignments overwrite the cap-based values cleanly.

- [ ] **Step 3: Run the full test suite to verify no regressions**

Run: `npm test`
Expected: all PASS. If anything related to tour mode changed behavior, address it before commit.

- [ ] **Step 4: Commit**

```bash
git add js/core/main.js
git commit -m "feat(modes): tour mode grants full arsenal with unlimited supplies"
```

---

## Task 4: HUD formatting — render `∞` for unlimited supplies

**Files:**
- Modify: `js/ui/hud.js:38-47, 55-57`
- Test: `tests/unit/hud.test.js`

- [ ] **Step 1: Open `tests/unit/hud.test.js` and find the existing ammo-display test block**

Look for the `describe` block that exercises `updateHUD` ammo rendering. We will add new test cases that set `weapons.reserve[current] = Infinity` and assert the rendered text. Match the existing mock patterns (don't reinvent them).

- [ ] **Step 2: Write the failing tests**

Add the following tests inside the existing HUD-update describe block in `tests/unit/hud.test.js`. Adapt the mock variable names to whatever the file already uses (e.g. `mockDom`, `mockWeapons`):

```js
  it('renders firearm reserve as "∞" when reserve is Infinity', () => {
    mockWeapons.current = 'rifle';
    mockWeapons.ammo.rifle = 30;
    mockWeapons.reserve.rifle = Infinity;
    GAME.hud.update();
    expect(mockDom.ammoReserve.textContent).toBe('∞');
    expect(mockDom.ammoMag.textContent).toBe(30);
  });

  it('renders grenade primary line as "HE x∞" when grenadeCount is Infinity', () => {
    mockWeapons.current = 'grenade';
    mockWeapons.grenadeCount = Infinity;
    GAME.hud.update();
    expect(mockDom.ammoMag.textContent).toBe('HE x∞');
  });

  it('renders smoke primary line as "SM x∞" when smokeCount is Infinity', () => {
    mockWeapons.current = 'smoke';
    mockWeapons.smokeCount = Infinity;
    GAME.hud.update();
    expect(mockDom.ammoMag.textContent).toBe('SM x∞');
  });

  it('renders flash primary line as "FL x∞" when flashCount is Infinity', () => {
    mockWeapons.current = 'flash';
    mockWeapons.flashCount = Infinity;
    GAME.hud.update();
    expect(mockDom.ammoMag.textContent).toBe('FL x∞');
  });

  it('renders secondary grenade strip with "∞" when all counts are Infinity', () => {
    mockWeapons.current = 'pistol';
    mockWeapons.grenadeCount = Infinity;
    mockWeapons.smokeCount = Infinity;
    mockWeapons.flashCount = Infinity;
    GAME.hud.update();
    expect(mockDom.grenadeCount.textContent).toBe('HE x∞  SM x∞  FL x∞');
  });
```

If the existing tests don't set `mockWeapons.reloading`, `mockWeapons.isScoped`, etc., look at the closest existing test in the file and copy its setup before each new test. Don't introduce a new `beforeEach` — extend the existing one if needed.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/unit/hud.test.js -t "Infinity"`
Expected: 5 tests FAIL because the textContent is `"Infinity"` (the JS default string for `Infinity`), `"HE xInfinity"`, etc.

- [ ] **Step 4: Implement the formatting in `js/ui/hud.js`**

Add a helper at the top of the IIFE (just after `var announcementTimeout = null;` on line 7):

```js
  function fmtCount(n) {
    return n === Infinity ? '∞' : n;
  }
```

Replace the grenade primary lines (currently lines 38–42) so they read:

```js
      if (weapons.current === 'grenade') {
        dom.ammoMag.textContent = 'HE x' + fmtCount(weapons.grenadeCount);
      } else if (weapons.current === 'smoke') {
        dom.ammoMag.textContent = 'SM x' + fmtCount(weapons.smokeCount);
      } else if (weapons.current === 'flash') {
        dom.ammoMag.textContent = 'FL x' + fmtCount(weapons.flashCount);
      }
```

Replace the firearm reserve line (currently line 47) so it reads:

```js
      dom.ammoReserve.textContent = fmtCount(weapons.reserve[weapons.current]);
```

Replace the secondary grenade-strip lines (currently lines 55–57) so they read:

```js
    if (weapons.grenadeCount > 0) nadeParts.push('HE x' + fmtCount(weapons.grenadeCount));
    if (weapons.smokeCount > 0) nadeParts.push('SM x' + fmtCount(weapons.smokeCount));
    if (weapons.flashCount > 0) nadeParts.push('FL x' + fmtCount(weapons.flashCount));
```

The `> 0` guards still work because `Infinity > 0 === true`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/hud.test.js`
Expected: all PASS, including the 5 new tests.

- [ ] **Step 6: Commit**

```bash
git add js/ui/hud.js tests/unit/hud.test.js
git commit -m "feat(hud): render unlimited reserve and grenade counts as infinity glyph"
```

---

## Task 5: Mobile touch UI formatting — render `∞` for unlimited supplies

**Files:**
- Modify: `js/ui/touch.js:362-368, 510-512, 516-517`

This file generally lacks unit-test coverage for the bottom-bar render path; the existing tests focus on weapon switching and gestures. Format changes here are validated by manual mobile QA. Code-review the diff carefully.

- [ ] **Step 1: Add the same `fmtCount` helper local to touch.js**

Near the top of the touch.js IIFE (just inside the `(function() { 'use strict'; ...` block), add:

```js
  function fmtCount(n) {
    return n === Infinity ? '∞' : n;
  }
```

Don't reuse hud.js's `fmtCount` (each file is its own IIFE). One-line duplication beats coupling.

- [ ] **Step 2: Update the inventory wheel grenade badge (around lines 362-368)**

The current block reads:

```js
      if (weapon === 'grenade' || weapon === 'smoke' || weapon === 'flash') {
        var count = weapon === 'grenade' ? ws.grenadeCount :
                    weapon === 'smoke' ? ws.smokeCount : ws.flashCount;
        if (count > 0) {
          var badge = document.createElement('span');
          badge.className = 'touch-weapon-badge';
          badge.textContent = count;
          slot.appendChild(badge);
        }
```

Change `badge.textContent = count;` to:

```js
          badge.textContent = fmtCount(count);
```

The `count > 0` check is still safe (`Infinity > 0` is true).

- [ ] **Step 3: Update the bottom ammo readout for grenades (around lines 510-512)**

The current block reads:

```js
    } else if (def.isGrenade) {
      var count = ws.current === 'grenade' ? ws.grenadeCount :
                  ws.current === 'smoke' ? ws.smokeCount : ws.flashCount;
      bottomAmmoMagEl.textContent = '×' + count;
```

Change the last line to:

```js
      bottomAmmoMagEl.textContent = '×' + fmtCount(count);
```

- [ ] **Step 4: Update the bottom firearm reserve (around line 517)**

The current line reads:

```js
      bottomAmmoReserveEl.textContent = ws.reserve[ws.current];
```

Change to:

```js
      bottomAmmoReserveEl.textContent = fmtCount(ws.reserve[ws.current]);
```

- [ ] **Step 5: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add js/ui/touch.js
git commit -m "feat(touch): render unlimited reserve and grenade counts as infinity glyph"
```

---

## Task 6: Manual QA checklist

No code changes. Execute these checks in a real browser before considering the work complete.

- [ ] **Desktop:** Launch the game, open the menu, click a tour map.
- [ ] **Inventory check:** Press the weapon-cycle keys (or scroll) — confirm SMG, HE grenade, smoke, flashbang are all selectable in addition to the existing knife/pistol/shotgun/rifle/AWP.
- [ ] **Firearms reload:** Equip the rifle, fire to empty, reload — HUD should show mag refilled to 30, reserve should display `∞`.
- [ ] **Grenade throw:** Switch to HE, throw it, verify the count remains `∞` and the HE option remains in the inventory. Repeat for smoke and flashbang.
- [ ] **HUD secondary strip:** Confirm the secondary grenade strip near the HUD shows `HE x∞  SM x∞  FL x∞`.
- [ ] **Exit and re-enter:** Exit tour to the menu, start a competitive or deathmatch round — confirm normal finite ammo and grenade counts (no leakage from tour state).
- [ ] **Mobile (if available):** Same checks against the bottom ammo bar and the inventory wheel badges.

---

## Self-Review Notes

**Spec coverage:**
- "Tour grants every weapon" → Task 3 (`giveUnlimitedSupplies` sets every `WEAPON_DEFS` key as owned).
- "Reserve is unlimited" → Task 1 (helper) + Task 2 (math test) + Task 3 (wire-in).
- "Grenade counts unlimited" → Task 1 + Task 2 + Task 3.
- "Mag-and-reload cadence preserved" → Task 1 fills mags to `magSize`; Task 2 proves reload still completes and mag fills correctly.
- "HUD shows `∞`" → Task 4 (HUD) + Task 5 (mobile touch UI).
- "No leakage to other modes" → covered by manual QA checklist Task 6 (mode-entry resets exist already and zero out grenade counts/reserves).
- "No new HUD elements" → Tasks 4 and 5 only edit existing format paths.
- "Buy menu untouched" → not modified; tour does not open it.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" present. Every code step shows the actual code.

**Type/name consistency:** `giveUnlimitedSupplies` used identically in Tasks 1, 2, and 3. `fmtCount` defined separately in `hud.js` (Task 4) and `touch.js` (Task 5) — intentional, called out in Task 5.

**Decomposition note:** Considered putting tour-specific logic directly in `startTour` instead of a helper. Chose the helper because (a) it's directly unit-testable, (b) `startTour` is heavy to mock in tests, (c) the helper name documents intent better than the inline assignment did.
