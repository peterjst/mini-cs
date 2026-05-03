import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/systems/weapons.js');
});

describe('WEAPON_DEFS', () => {
  var DEFS;
  beforeAll(() => { DEFS = GAME.WEAPON_DEFS; });

  it('should expose AMMO_PRICE_PER_MAG = 50', () => {
    expect(GAME.AMMO_PRICE_PER_MAG).toBe(50);
  });

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
    expect(DEFS.shotgun.damage).toBe(32);
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
    expect(DEFS.shotgun.price).toBe(1300);
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
    expect(DEFS.shotgun.pellets).toBe(10);
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

  it('knife should have correct range and feedback values', () => {
    expect(DEFS.knife.recoilUp).toBe(0);
    expect(DEFS.knife.recoilSide).toBe(0);
    expect(DEFS.knife.range).toBe(5);
    expect(DEFS.knife.fovPunch).toBe(1.5);
    expect(DEFS.knife.screenShake).toBe(0.04);
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
    expect(ws.reserve.pistol).toBe(GAME.WEAPON_DEFS.pistol.reserveCap);
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

  it('giveWeapon initializes reserve to reserveFloor, not cap', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.giveWeapon('rifle');
    expect(ws.reserve.rifle).toBe(GAME.WEAPON_DEFS.rifle.reserveFloor);
    expect(ws.reserve.rifle).toBe(60);
    expect(ws.ammo.rifle).toBe(GAME.WEAPON_DEFS.rifle.magSize);
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

describe('Per-weapon muzzle flash', () => {
  it('should define flashColor per weapon in WEAPON_DEFS', () => {
    var defs = GAME.WEAPON_DEFS;
    expect(defs.rifle.flashColor).toBeDefined();
    expect(defs.awp.flashColor).toBeDefined();
    expect(defs.pistol.flashColor).toBeDefined();
  });

  it('should define flashIntensity per weapon in WEAPON_DEFS', () => {
    var defs = GAME.WEAPON_DEFS;
    expect(defs.rifle.flashIntensity).toBeGreaterThan(0);
    expect(defs.awp.flashIntensity).toBeGreaterThan(defs.pistol.flashIntensity);
  });
});

describe('Enhanced visual recoil', () => {
  it('should kick weapon model back on fire', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'rifle';
    var restZ = ws.weaponModel.position.z;
    ws._applyVisualRecoil();
    expect(ws.weaponModel.position.z).toBeGreaterThan(restZ);
  });

  it('should accumulate burst drift over sustained fire', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'rifle';
    ws._burstDriftY = 0;
    ws._applyVisualRecoil();
    ws._applyVisualRecoil();
    ws._applyVisualRecoil();
    expect(ws._burstDriftY).toBeGreaterThan(0);
  });

  it('should recover burst drift over time', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'rifle';
    ws._burstDriftY = 0.05;
    ws.update(0.1, null, 0, 0);
    expect(ws._burstDriftY).toBeLessThan(0.05);
  });

  it('should accumulate burst spread on sustained fire', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'rifle';
    ws._burstSpread = 0;
    ws._applyVisualRecoil();
    ws._applyVisualRecoil();
    ws._applyVisualRecoil();
    expect(ws._burstSpread).toBeGreaterThan(0);
  });

  it('should recover burst spread over time', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'rifle';
    ws._burstSpread = 0.05;
    ws.update(0.1, null, 0, 0);
    expect(ws._burstSpread).toBeLessThan(0.05);
  });
});

describe('Weapon particle integration', () => {
  it('weapon definitions should have flashColor and flashIntensity', () => {
    Object.keys(GAME.WEAPON_DEFS).forEach(function(key) {
      var def = GAME.WEAPON_DEFS[key];
      if (def.isKnife || def.isGrenade) return;
      expect(typeof def.flashColor).toBe('number');
      expect(typeof def.flashIntensity).toBe('number');
    });
  });
});

describe('Grenade explosion FX delegation', () => {
  it('GrenadeObj._explode should not add FX meshes to the scene (pooled particles handle FX)', () => {
    var scene = new THREE.Scene();
    var pos = new THREE.Vector3(0, 1, 0);
    var vel = new THREE.Vector3(0, 0, 0);
    var grenade = new GAME._GrenadeObj(scene, pos, vel, []);
    // Constructor added the grenade mesh
    var childrenAfterConstruct = scene.children.length;
    expect(childrenAfterConstruct).toBeGreaterThan(0);

    grenade.fuseTimer = 0;
    var explosion = grenade.update(0.016);
    expect(explosion).toBeTruthy();
    expect(explosion.radius).toBeGreaterThan(0);
    expect(explosion.damage).toBeGreaterThan(0);

    // After explode: grenade mesh removed, no extra FX meshes/lights added.
    // Pooled GAME.particles.spawnExplosion (called from processExplosions) owns the FX.
    expect(scene.children.length).toBe(childrenAfterConstruct - 1);
  });

  it('GrenadeObj._explode should not schedule a setInterval animation loop', () => {
    var scene = new THREE.Scene();
    var grenade = new GAME._GrenadeObj(scene, new THREE.Vector3(), new THREE.Vector3(), []);
    var intervalSpy = vi.spyOn(globalThis, 'setInterval');
    grenade.fuseTimer = 0;
    grenade.update(0.016);
    expect(intervalSpy).not.toHaveBeenCalled();
    intervalSpy.mockRestore();
  });
});

describe('Weapon pendulum swing', () => {
  it('should track velocity for pendulum calculation', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'rifle';
    expect(ws._pendulumVelX).toBeDefined();
    expect(ws._pendulumVelZ).toBeDefined();
  });

  it('should swing when velocity changes', () => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    var ws = new GAME.WeaponSystem(camera, scene);
    ws.current = 'rifle';
    ws.setVelocity(5, 0);
    ws.update(0.016, null, 0, 0);
    ws.setVelocity(-5, 0);
    ws.update(0.016, null, 0, 0);
    expect(Math.abs(ws._pendulumSwing)).toBeGreaterThan(0);
  });
});

describe('WeaponSystem.resetForRound — reserve floor-if-below', () => {
  function makeWs() {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    return new GAME.WeaponSystem(camera, scene);
  }

  it('tops up reserve to floor when below', () => {
    var ws = makeWs();
    ws.giveWeapon('rifle');
    ws.reserve.rifle = 10; // below floor (60)
    ws.resetForRound();
    expect(ws.reserve.rifle).toBe(60);
  });

  it('preserves reserve when at or above floor', () => {
    var ws = makeWs();
    ws.giveWeapon('rifle');
    ws.reserve.rifle = 120; // above floor (60), below cap (150)
    ws.resetForRound();
    expect(ws.reserve.rifle).toBe(120);
  });

  it('preserves reserve at exact floor', () => {
    var ws = makeWs();
    ws.giveWeapon('rifle');
    ws.reserve.rifle = 60;
    ws.resetForRound();
    expect(ws.reserve.rifle).toBe(60);
  });

  it('preserves reserve at cap', () => {
    var ws = makeWs();
    ws.giveWeapon('rifle');
    ws.reserve.rifle = 150;
    ws.resetForRound();
    expect(ws.reserve.rifle).toBe(150);
  });

  it('tops magazine in gun to magSize', () => {
    var ws = makeWs();
    ws.giveWeapon('rifle');
    ws.ammo.rifle = 5;
    ws.resetForRound();
    expect(ws.ammo.rifle).toBe(GAME.WEAPON_DEFS.rifle.magSize);
  });

  it('does not touch un-owned weapons', () => {
    var ws = makeWs();
    // rifle is not owned by default
    ws.reserve.rifle = 0;
    ws.resetForRound();
    // rifle reserve stays untouched (we only refill owned)
    expect(ws.reserve.rifle).toBe(0);
  });

  it('skips grenade slot', () => {
    var ws = makeWs();
    ws.owned.smg = true;
    ws.reserve.smg = 10;
    ws.grenadeCount = 1;
    ws.resetForRound();
    // SMG reserve gets refilled to floor 50
    expect(ws.reserve.smg).toBe(50);
    // grenade count unchanged
    expect(ws.grenadeCount).toBe(1);
  });
});

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
