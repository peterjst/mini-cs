import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/weapons.js');
});

describe('WEAPON_DEFS', () => {
  var DEFS;
  beforeAll(() => { DEFS = GAME.WEAPON_DEFS; });

  it('should define all 9 weapons', () => {
    var expected = ['knife', 'pistol', 'smg', 'shotgun', 'rifle', 'awp', 'grenade', 'smoke', 'flash'];
    expect(Object.keys(DEFS).sort()).toEqual(expected.sort());
  });

  it('should have required fields on every weapon', () => {
    var fields = ['damage', 'fireRate', 'magSize', 'price', 'isGrenade'];
    Object.keys(DEFS).forEach(key => {
      fields.forEach(field => {
        expect(DEFS[key]).toHaveProperty(field);
      });
    });
  });

  it('should have correct damage values', () => {
    expect(DEFS.knife.damage).toBe(55);
    expect(DEFS.pistol.damage).toBe(28);
    expect(DEFS.smg.damage).toBe(22);
    expect(DEFS.shotgun.damage).toBe(18);
    expect(DEFS.rifle.damage).toBe(36);
    expect(DEFS.awp.damage).toBe(115);
    expect(DEFS.grenade.damage).toBe(98);
    expect(DEFS.smoke.damage).toBe(0);
    expect(DEFS.flash.damage).toBe(0);
  });

  it('should have correct prices', () => {
    expect(DEFS.knife.price).toBe(0);
    expect(DEFS.pistol.price).toBe(0);
    expect(DEFS.smg.price).toBe(1250);
    expect(DEFS.shotgun.price).toBe(1800);
    expect(DEFS.rifle.price).toBe(2700);
    expect(DEFS.awp.price).toBe(4750);
    expect(DEFS.grenade.price).toBe(300);
    expect(DEFS.smoke.price).toBe(300);
    expect(DEFS.flash.price).toBe(200);
  });

  it('should flag grenades correctly', () => {
    expect(DEFS.grenade.isGrenade).toBe(true);
    expect(DEFS.smoke.isGrenade).toBe(true);
    expect(DEFS.flash.isGrenade).toBe(true);
    expect(DEFS.rifle.isGrenade).toBe(false);
    expect(DEFS.knife.isGrenade).toBe(false);
  });

  it('should flag knife correctly', () => {
    expect(DEFS.knife.isKnife).toBe(true);
    expect(DEFS.pistol.isKnife).toBe(false);
  });

  it('should have AWP sniper properties', () => {
    expect(DEFS.awp.isSniper).toBe(true);
    expect(DEFS.awp.spreadScoped).toBeDefined();
    expect(DEFS.awp.boltCycleTime).toBeDefined();
    expect(DEFS.awp.movementMult).toBeDefined();
  });

  it('should have HE grenade blast properties', () => {
    expect(DEFS.grenade.fuseTime).toBe(1.8);
    expect(DEFS.grenade.blastRadius).toBe(16);
  });

  it('shotgun should fire multiple pellets', () => {
    expect(DEFS.shotgun.pellets).toBe(8);
    expect(DEFS.pistol.pellets).toBe(1);
  });
});

describe('Recoil constants', () => {
  var DEFS;
  beforeAll(() => { DEFS = GAME.WEAPON_DEFS; });

  it('every non-grenade weapon should have recoilUp, recoilSide, fovPunch, and screenShake', () => {
    ['knife', 'pistol', 'smg', 'shotgun', 'rifle', 'awp'].forEach(w => {
      expect(DEFS[w].recoilUp).toBeTypeOf('number');
      expect(DEFS[w].recoilSide).toBeTypeOf('number');
      expect(DEFS[w].fovPunch).toBeTypeOf('number');
      expect(DEFS[w].screenShake).toBeTypeOf('number');
    });
  });

  it('AWP should have the highest recoilUp', () => {
    expect(DEFS.awp.recoilUp).toBeGreaterThan(DEFS.rifle.recoilUp);
    expect(DEFS.awp.recoilUp).toBeGreaterThan(DEFS.shotgun.recoilUp);
  });

  it('knife should have zero recoil values', () => {
    expect(DEFS.knife.recoilUp).toBe(0);
    expect(DEFS.knife.recoilSide).toBe(0);
    expect(DEFS.knife.fovPunch).toBe(0);
    expect(DEFS.knife.screenShake).toBe(0);
  });
});

describe('SKIN_DEFS', () => {
  var SKINS;
  beforeAll(() => { SKINS = GAME.SKIN_DEFS; });

  it('should define 6 skins (0-5)', () => {
    expect(Object.keys(SKINS).length).toBe(6);
    for (var i = 0; i <= 5; i++) {
      expect(SKINS[i]).toBeDefined();
      expect(SKINS[i].name).toBeDefined();
    }
  });

  it('should have increasing XP thresholds', () => {
    var xpValues = [0, 500, 2000, 5000, 12000, 25000];
    for (var i = 1; i <= 5; i++) {
      expect(SKINS[i].xp).toBe(xpValues[i]);
    }
  });

  it('default skin should have no XP requirement', () => {
    expect(SKINS[0].xp).toBeUndefined();
  });
});

describe('WeaponSystem', () => {
  it('should initialize with knife and pistol owned', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    expect(ws.owned.knife).toBe(true);
    expect(ws.owned.pistol).toBe(true);
    expect(ws.owned.rifle).toBe(false);
    expect(ws.owned.awp).toBe(false);
  });

  it('should start with pistol as current weapon', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    expect(ws.current).toBe('pistol');
  });

  it('should initialize ammo from WEAPON_DEFS', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    expect(ws.ammo.pistol).toBe(GAME.WEAPON_DEFS.pistol.magSize);
    expect(ws.reserve.pistol).toBe(GAME.WEAPON_DEFS.pistol.reserveAmmo);
  });

  it('should initialize vertical sway offset to 0', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    expect(ws._swayOffsetY).toBe(0);
  });

  it('should initialize sprint blend state', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    expect(ws._sprinting).toBe(false);
    expect(ws._sprintBlend).toBe(0);
  });

  it('should initialize _lastPitch to 0', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    expect(ws._lastPitch).toBe(0);
  });

  it('should have a setSprinting method', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    expect(typeof ws.setSprinting).toBe('function');
  });

  it('setSprinting should update _sprinting state', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.setSprinting(true);
    expect(ws._sprinting).toBe(true);
    ws.setSprinting(false);
    expect(ws._sprinting).toBe(false);
  });
});

describe('WeaponSystem vertical sway', () => {
  it('should offset weapon Y opposite to pitch delta', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    // Simulate looking up (positive pitch delta)
    ws._lastPitch = 0;
    ws.update(1/60, null, 0, 0.1); // pitch = 0.1, deltaPitch = 0.1
    // _swayOffsetY should move in the direction of deltaPitch * 0.6
    // After one frame: target = 0.1 * 0.6 = 0.06, lerp from 0 at rate 6
    expect(ws._swayOffsetY).not.toBe(0);
  });

  it('should lerp vertical sway back toward zero when pitch stops moving', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws._swayOffsetY = 0.02;
    ws._lastPitch = 0.5;
    // Same pitch = no delta, should lerp toward 0
    ws.update(1/60, null, 0, 0.5);
    expect(Math.abs(ws._swayOffsetY)).toBeLessThan(0.02);
  });
});

describe('WeaponSystem sprint tilt', () => {
  it('should blend sprint tilt when sprinting', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.setSprinting(true);
    // Run several frames to allow blend to increase
    for (var i = 0; i < 30; i++) {
      ws.update(1/60, null, 0, 0);
    }
    expect(ws._sprintBlend).toBeGreaterThan(0);
  });

  it('should blend sprint tilt back to 0 when not sprinting', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws._sprintBlend = 0.8;
    ws.setSprinting(false);
    for (var i = 0; i < 30; i++) {
      ws.update(1/60, null, 0, 0);
    }
    expect(ws._sprintBlend).toBeLessThan(0.8);
  });

  it('should apply sprint offsets to weapon position and rotation when sprinting', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.setSprinting(true);
    // Run enough frames for sprint blend to be significant
    for (var i = 0; i < 60; i++) {
      ws.update(1/60, null, 0, 0);
    }
    // Sprint should lower weapon (Y offset -0.06) and shift X (-0.08)
    // and tilt Z (~0.26 rad)
    var blend = ws._sprintBlend;
    expect(blend).toBeGreaterThan(0.5);
    // The weapon position Y should be lower than rest (-0.28)
    expect(ws.weaponModel.position.y).toBeLessThan(-0.28);
    // The weapon rotation Z should include sprint tilt
    expect(ws.weaponModel.rotation.z).toBeGreaterThan(0);
  });
});

describe('Multi-phase reload animation', () => {
  it('should initialize _reloadPhase to -1', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    expect(ws._reloadPhase).toBe(-1);
  });

  it('should set _reloadPhase to 0 on startReload', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'pistol';
    ws.ammo.pistol = 0;
    ws.reserve.pistol = 12;
    ws.startReload();
    expect(ws._reloadPhase).toBe(0);
  });

  it('should create _magDropMesh on startReload', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'pistol';
    ws.ammo.pistol = 0;
    ws.reserve.pistol = 12;
    ws.startReload();
    expect(ws._magDropMesh).not.toBeNull();
    expect(ws._magDropMesh).toBeDefined();
  });

  it('should progress through phases during reload', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'pistol';
    ws.ammo.pistol = 0;
    ws.reserve.pistol = 12;
    var reloadTime = GAME.WEAPON_DEFS.pistol.reloadTime;
    ws.startReload();
    expect(ws._reloadPhase).toBe(0);

    // Advance past 30% of reload time to enter phase 1
    var timeToPhase1 = reloadTime * 0.35;
    ws.update(timeToPhase1, null, 0, 0);
    expect(ws._reloadPhase).toBe(1);

    // Advance past 70% of reload time to enter phase 2
    var timeToPhase2 = reloadTime * 0.4;
    ws.update(timeToPhase2, null, 0, 0);
    expect(ws._reloadPhase).toBe(2);
  });
});
