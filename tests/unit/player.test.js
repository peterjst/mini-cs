import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/player.js');
});

describe('Player constructor', () => {
  it('should initialize with 100 health', () => {
    var camera = new THREE.PerspectiveCamera();
    var p = new GAME.Player(camera);
    expect(p.health).toBe(100);
  });

  it('should initialize with 0 armor', () => {
    var camera = new THREE.PerspectiveCamera();
    var p = new GAME.Player(camera);
    expect(p.armor).toBe(0);
  });

  it('should initialize with 800 money', () => {
    var camera = new THREE.PerspectiveCamera();
    var p = new GAME.Player(camera);
    expect(p.money).toBe(800);
  });

  it('should be alive', () => {
    var camera = new THREE.PerspectiveCamera();
    var p = new GAME.Player(camera);
    expect(p.alive).toBe(true);
  });
});

describe('Player.takeDamage', () => {
  var player;

  beforeEach(() => {
    GAME.hasPerk = undefined;
    var camera = new THREE.PerspectiveCamera();
    player = new GAME.Player(camera);
  });

  it('should reduce health by damage amount (no armor)', () => {
    player.takeDamage(30);
    expect(player.health).toBe(70);
  });

  it('should absorb 50% of damage with armor', () => {
    player.armor = 100;
    player.takeDamage(40);
    // absorbed = min(100, 40*0.5) = 20
    // armor = 100 - 20 = 80
    // dmg = 40 - 20 = 20
    // health = 100 - 20 = 80
    expect(player.armor).toBe(80);
    expect(player.health).toBe(80);
  });

  it('should not absorb more than available armor', () => {
    player.armor = 10;
    player.takeDamage(60);
    // absorbed = min(10, 60*0.5) = 10
    // armor = 10 - 10 = 0
    // dmg = 60 - 10 = 50
    // health = 100 - 50 = 50
    expect(player.armor).toBe(0);
    expect(player.health).toBe(50);
  });

  it('should apply juggernaut perk (15% reduction)', () => {
    GAME.hasPerk = function(id) { return id === 'juggernaut'; };
    player.takeDamage(100);
    // dmg = 100 * 0.85 = 85
    expect(player.health).toBe(15);
  });

  it('should apply juggernaut + armor together', () => {
    GAME.hasPerk = function(id) { return id === 'juggernaut'; };
    player.armor = 100;
    player.takeDamage(100);
    // dmg = 100 * 0.85 = 85
    // absorbed = min(100, 85*0.5) = 42.5
    // armor = 100 - 42.5 = 57.5
    // dmg = 85 - 42.5 = 42.5
    // health = 100 - 42.5 = 57.5
    expect(player.armor).toBe(57.5);
    expect(player.health).toBe(57.5);
  });

  it('should set alive to false when health reaches 0', () => {
    player.takeDamage(100);
    expect(player.health).toBe(0);
    expect(player.alive).toBe(false);
  });

  it('should clamp health at 0 on overkill', () => {
    player.takeDamage(200);
    expect(player.health).toBe(0);
    expect(player.alive).toBe(false);
  });

  it('should not take damage when already dead', () => {
    player.alive = false;
    player.health = 0;
    player.takeDamage(50);
    expect(player.health).toBe(0);
  });
});

describe('Camera recoil', () => {
  var player;
  beforeEach(() => {
    player = new GAME.Player(new THREE.PerspectiveCamera());
    player.alive = true;
    player.pitch = 0;
    player.yaw = 0;
  });

  it('should have _recoilPitchOffset initialized to 0', () => {
    expect(player._recoilPitchOffset).toBe(0);
  });

  it('applyRecoil should modify pitch (kick up)', () => {
    player.applyRecoil(0.02, 0, 0);
    expect(player.pitch).toBeLessThan(0); // negative pitch = look up
  });

  it('applyRecoil should track recoil offset for recovery', () => {
    player.applyRecoil(0.02, 0, 0);
    expect(player._recoilPitchOffset).toBeGreaterThan(0);
  });

  it('recoil offset should decrease over updates (recovery)', () => {
    player.applyRecoil(0.05, 0, 0);
    var initialOffset = player._recoilPitchOffset;
    player.update(0.016);
    expect(player._recoilPitchOffset).toBeLessThan(initialOffset);
  });

  it('burst accumulation should increase recoil on rapid shots', () => {
    player.applyRecoil(0.02, 0, 0);
    var firstPitch = player.pitch;
    player.pitch = 0;
    player.applyRecoil(0.02, 0, 0); // immediate second shot
    // second shot should kick harder due to burst mult
    expect(player.pitch).toBeLessThan(firstPitch);
  });

  it('applyRecoil with fovPunch should set _fovPunch', () => {
    player._fovPunch = 0;
    player.applyRecoil(0.02, 0.005, 1.5);
    expect(player._fovPunch).toBe(1.5);
  });
});

describe('Head bob', () => {
  var player;
  beforeEach(() => {
    player = new GAME.Player(new THREE.PerspectiveCamera(), []);
    player.alive = true;
    player.onGround = true;
    player.position.set(0, 1.7, 0);
  });

  it('should have _headBobPhase initialized to 0', () => {
    expect(player._headBobPhase).toBe(0);
  });

  it('should advance _headBobPhase when walking', () => {
    player.keys.w = true;
    player._dir.set(0, 0, -1);
    player.update(0.016);
    expect(player._headBobPhase).toBeGreaterThan(0);
  });

  it('should not advance _headBobPhase when standing still', () => {
    player.update(0.016);
    expect(player._headBobPhase).toBe(0);
  });

  it('_headBobOffset should be a number after walking', () => {
    player.keys.w = true;
    player._dir.set(0, 0, -1);
    player.update(0.016);
    expect(player._headBobOffset).toBeTypeOf('number');
  });
});
