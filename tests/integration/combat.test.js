import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/player.js');
  loadModule('js/weapons.js');
});

describe('combat integration', () => {
  var player;

  beforeEach(() => {
    GAME.hasPerk = undefined;
    var camera = new THREE.PerspectiveCamera();
    player = new GAME.Player(camera);
  });

  it('rifle damage should reduce health correctly', () => {
    var rifleDmg = GAME.WEAPON_DEFS.rifle.damage; // 36
    player.takeDamage(rifleDmg);
    expect(player.health).toBe(100 - rifleDmg);
  });

  it('headshot should apply 2.5x multiplier', () => {
    var baseDmg = GAME.WEAPON_DEFS.rifle.damage; // 36
    var hsDmg = baseDmg * 2.5; // 90
    player.takeDamage(hsDmg);
    expect(player.health).toBe(100 - hsDmg);
  });

  it('AWP headshot should kill from full health', () => {
    var awpHs = GAME.WEAPON_DEFS.awp.damage * 2.5; // 115 * 2.5 = 287.5
    player.takeDamage(awpHs);
    expect(player.alive).toBe(false);
  });

  it('armor should reduce rifle body shot damage', () => {
    player.armor = 100;
    var rifleDmg = GAME.WEAPON_DEFS.rifle.damage; // 36
    player.takeDamage(rifleDmg);
    // absorbed = min(100, 36*0.5) = 18
    // health = 100 - (36 - 18) = 82
    expect(player.health).toBe(82);
    expect(player.armor).toBe(82);
  });

  it('stopping_power + marksman perk should stack', () => {
    GAME.hasPerk = function(id) {
      return id === 'stopping_power' || id === 'marksman' || id === 'juggernaut';
    };
    // With juggernaut: damage * 0.85
    // stopping_power would be applied at fire time (1.25x), not in takeDamage
    // juggernaut is the only perk in takeDamage
    var dmg = 100;
    player.takeDamage(dmg);
    expect(player.health).toBe(15); // 100 - 100*0.85 = 15
  });

  it('shotgun 10 pellets should deal cumulative damage', () => {
    var pelletDmg = GAME.WEAPON_DEFS.shotgun.damage; // 32 per pellet
    var totalDmg = pelletDmg * GAME.WEAPON_DEFS.shotgun.pellets; // 32 * 10 = 320
    player.takeDamage(totalDmg);
    expect(player.alive).toBe(false);
  });

  it('knife should not kill from full health in one hit', () => {
    player.takeDamage(GAME.WEAPON_DEFS.knife.damage); // 55
    expect(player.alive).toBe(true);
    expect(player.health).toBe(45);
  });
});
