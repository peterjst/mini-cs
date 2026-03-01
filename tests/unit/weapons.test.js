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
});
