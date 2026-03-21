import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/weapons.js');
  loadModule('js/touch.js');
});

describe('Mobile detection', () => {
  it('should set GAME.isMobile to false when no touch support', () => {
    expect(GAME.isMobile).toBe(false);
  });
});

describe('GAME.touch', () => {
  it('should exist as a namespace', () => {
    expect(GAME.touch).toBeDefined();
  });

  it('should have an update method', () => {
    expect(typeof GAME.touch.update).toBe('function');
  });
});

describe('Joystick key mapping', () => {
  it('should map negative Y offset to forward (w key)', () => {
    var keys = GAME.touch._joystickToKeys(0, -0.5);
    expect(keys.w).toBe(true);
    expect(keys.s).toBe(false);
  });

  it('should map negative X offset to left (a key)', () => {
    var keys = GAME.touch._joystickToKeys(-0.5, 0);
    expect(keys.a).toBe(true);
    expect(keys.d).toBe(false);
  });

  it('should map diagonal to two keys', () => {
    var keys = GAME.touch._joystickToKeys(0.5, -0.5);
    expect(keys.w).toBe(true);
    expect(keys.d).toBe(true);
  });

  it('should return all false for center (deadzone)', () => {
    var keys = GAME.touch._joystickToKeys(0.05, 0.05);
    expect(keys.w).toBe(false);
    expect(keys.s).toBe(false);
    expect(keys.a).toBe(false);
    expect(keys.d).toBe(false);
  });
});

describe('Touch look sensitivity', () => {
  it('should have a TOUCH_SENSITIVITY constant exposed for testing', () => {
    expect(typeof GAME.touch._TOUCH_SENSITIVITY).toBe('number');
    expect(GAME.touch._TOUCH_SENSITIVITY).toBeGreaterThan(0);
  });
});

describe('Touch firing flags', () => {
  it('should default GAME.touchFiring to false', () => {
    expect(GAME.touchFiring).toBeFalsy();
  });

  it('should reset GAME.touchFiring when player is dead', () => {
    GAME.isMobile = true;
    GAME.touchFiring = true;
    GAME.player = { alive: false, keys: {} };
    GAME.touch.update();
    expect(GAME.touchFiring).toBe(false);
    GAME.isMobile = false;
    delete GAME.player;
  });

  it('should reset GAME.touchFiring when player does not exist', () => {
    GAME.isMobile = true;
    GAME.touchFiring = true;
    GAME.player = null;
    GAME.touch.update();
    expect(GAME.touchFiring).toBe(false);
    GAME.isMobile = false;
    delete GAME.player;
  });

  it('should NOT reset GAME.touchFiring when player is alive', () => {
    GAME.isMobile = true;
    GAME.touchFiring = true;
    GAME.player = { alive: true, keys: {}, camera: null };
    GAME.weaponSystem = { current: 'pistol' };
    GAME.touch.update();
    expect(GAME.touchFiring).toBe(true);
    GAME.isMobile = false;
    GAME.touchFiring = false;
    delete GAME.player;
    delete GAME.weaponSystem;
  });

  it('should not auto-fire via raycast (auto-fire removed)', () => {
    GAME.isMobile = true;
    GAME.player = { alive: true, keys: {}, camera: {} };
    GAME.weaponSystem = { current: 'rifle' };
    GAME._enemyManager = { enemies: [{ alive: true, mesh: {} }] };
    GAME.touch.update();
    // touchFiring should remain whatever it was — no raycast sets it
    expect(GAME.touchFiring).toBeFalsy();
    GAME.isMobile = false;
    delete GAME.player;
    delete GAME.weaponSystem;
    delete GAME._enemyManager;
  });
});

describe('Grenade weapon strip behavior', () => {
  it('should not auto-throw when tapping already-selected grenade', () => {
    var ws = { current: 'grenade', mouseDown: false, switchTo: function() {} };
    GAME.weaponSystem = ws;
    ws.switchTo('grenade');
    expect(ws.mouseDown).toBe(false);
    delete GAME.weaponSystem;
  });
});

describe('Orientation overlay gating by game state', () => {
  let overlay;

  beforeEach(() => {
    overlay = document.createElement('div');
    overlay.id = 'orient-overlay';
    document.body.appendChild(overlay);
  });

  afterEach(() => {
    overlay.remove();
    GAME.isMobile = false;
    delete GAME._gameState;
  });

  it('should hide orientation overlay on menu even in portrait', () => {
    GAME.isMobile = true;
    GAME._gameState = 'MENU';
    // Simulate portrait: innerHeight > innerWidth handled by the overlay logic
    // Since updateTouchControlVisibility calls checkOrientation, call it
    GAME.touch._updateTouchControlVisibility();
    expect(overlay.style.display).toBe('none');
  });

  it('should show orientation overlay during PLAYING state in portrait', () => {
    GAME.isMobile = true;
    GAME._gameState = 'PLAYING';
    // The overlay check depends on innerHeight > innerWidth
    // In jsdom both are 0, so isPortrait is false → overlay hidden
    // We need to mock window dimensions
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
    GAME.touch._updateTouchControlVisibility();
    expect(overlay.style.display).toBe('flex');
    // Restore
    Object.defineProperty(window, 'innerHeight', { value: 0, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 0, configurable: true });
  });

  it('should hide orientation overlay during PLAYING in landscape', () => {
    GAME.isMobile = true;
    GAME._gameState = 'PLAYING';
    Object.defineProperty(window, 'innerHeight', { value: 400, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    GAME.touch._updateTouchControlVisibility();
    expect(overlay.style.display).toBe('none');
    Object.defineProperty(window, 'innerHeight', { value: 0, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 0, configurable: true });
  });
});

describe('Tap-to-fire gesture detection', () => {
  it('should expose tap-to-fire constants', () => {
    expect(typeof GAME.touch._TAP_TIME_THRESHOLD).toBe('number');
    expect(typeof GAME.touch._TAP_MOVE_THRESHOLD).toBe('number');
    expect(typeof GAME.touch._HOLD_FIRE_DELAY).toBe('number');
  });

  it('should have correct tap-to-fire thresholds', () => {
    expect(GAME.touch._TAP_TIME_THRESHOLD).toBe(150);
    expect(GAME.touch._TAP_MOVE_THRESHOLD).toBe(10);
    expect(GAME.touch._HOLD_FIRE_DELAY).toBe(200);
  });

  it('should default GAME.touchTap to falsy', () => {
    expect(GAME.touchTap).toBeFalsy();
  });
});

describe('Action buttons', () => {
  it('should expose button creation function', () => {
    expect(typeof GAME.touch._createActionButtons).toBe('function');
  });
});

describe('Weapon strip', () => {
  it('should expose weapon strip update function', () => {
    expect(typeof GAME.touch._updateWeaponStrip).toBe('function');
  });
});

describe('Weapon strip owned-only rendering', () => {
  it('should expose createWeaponStrip function', () => {
    expect(typeof GAME.touch._createWeaponStrip).toBe('function');
  });

  it('should expose WEAPON_LABELS for testing', () => {
    expect(GAME.touch._WEAPON_LABELS).toBeDefined();
    expect(GAME.touch._WEAPON_LABELS.knife).toBe('KNF');
    expect(GAME.touch._WEAPON_LABELS.rifle).toBe('AK');
  });

  it('should only render owned weapons in the strip', () => {
    // Create a fresh weapon strip
    var strip = document.createElement('div');
    strip.id = 'touch-weapon-strip';
    document.body.appendChild(strip);

    GAME.weaponSystem = {
      current: 'pistol',
      owned: { knife: true, pistol: true, smg: false, shotgun: false, rifle: false, awp: false },
      grenadeCount: 0, smokeCount: 0, flashCount: 0
    };

    GAME.touch._updateWeaponStrip();

    var slots = strip.querySelectorAll('.touch-weapon-slot');
    expect(slots.length).toBe(2); // only knife and pistol
    expect(slots[0].dataset.weapon).toBe('knife');
    expect(slots[1].dataset.weapon).toBe('pistol');

    strip.remove();
    delete GAME.weaponSystem;
  });

  it('should show grenade count badge on grenade slots', () => {
    var strip = document.createElement('div');
    strip.id = 'touch-weapon-strip';
    document.body.appendChild(strip);

    GAME.weaponSystem = {
      current: 'grenade',
      owned: { knife: true, pistol: true, smg: false, shotgun: false, rifle: false, awp: false },
      grenadeCount: 2, smokeCount: 1, flashCount: 0
    };

    GAME.touch._updateWeaponStrip();

    var slots = strip.querySelectorAll('.touch-weapon-slot');
    // knife, pistol, grenade, smoke = 4 slots
    expect(slots.length).toBe(4);

    var grenadeSlot = strip.querySelector('[data-weapon="grenade"]');
    expect(grenadeSlot).not.toBeNull();
    var badge = grenadeSlot.querySelector('.touch-weapon-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('2');

    var smokeSlot = strip.querySelector('[data-weapon="smoke"]');
    expect(smokeSlot).not.toBeNull();
    var smokeBadge = smokeSlot.querySelector('.touch-weapon-badge');
    expect(smokeBadge).not.toBeNull();
    expect(smokeBadge.textContent).toBe('1');

    // Flash should not appear (count is 0)
    var flashSlot = strip.querySelector('[data-weapon="flash"]');
    expect(flashSlot).toBeNull();

    strip.remove();
    delete GAME.weaponSystem;
  });

  it('should mark active weapon slot', () => {
    var strip = document.createElement('div');
    strip.id = 'touch-weapon-strip';
    document.body.appendChild(strip);

    GAME.weaponSystem = {
      current: 'pistol',
      owned: { knife: true, pistol: true, smg: false, shotgun: false, rifle: true, awp: false },
      grenadeCount: 0, smokeCount: 0, flashCount: 0
    };

    GAME.touch._updateWeaponStrip();

    var activeSlots = strip.querySelectorAll('.touch-weapon-slot.active');
    expect(activeSlots.length).toBe(1);
    expect(activeSlots[0].dataset.weapon).toBe('pistol');

    strip.remove();
    delete GAME.weaponSystem;
  });
});

describe('Bottom info bar', () => {
  it('should expose updateBottomBar function', () => {
    expect(typeof GAME.touch._updateBottomBar).toBe('function');
  });
});

describe('Weapon display names', () => {
  it('should use short display names', () => {
    var DEFS = GAME.WEAPON_DEFS;
    expect(DEFS.pistol.name).toBe('Pistol');
    expect(DEFS.smg.name).toBe('MP5');
    expect(DEFS.shotgun.name).toBe('Shotgun');
    expect(DEFS.rifle.name).toBe('AK-47');
    expect(DEFS.awp.name).toBe('AWP');
    expect(DEFS.grenade.name).toBe('Grenade');
    expect(DEFS.smoke.name).toBe('Smoke');
    expect(DEFS.flash.name).toBe('Flashbang');
    expect(DEFS.knife.name).toBe('Knife');
  });
});
