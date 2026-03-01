import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/player.js');
  loadModule('js/weapons.js');
});

describe('economy integration', () => {
  var player, weapons;

  beforeEach(() => {
    var camera = new THREE.PerspectiveCamera();
    var scene = new THREE.Scene();
    player = new GAME.Player(camera);
    weapons = new GAME.WeaponSystem(camera, scene);
  });

  it('player starts with $800', () => {
    expect(player.money).toBe(800);
  });

  it('player cannot afford rifle ($2700) with starting money', () => {
    var canAfford = player.money >= GAME.WEAPON_DEFS.rifle.price;
    expect(canAfford).toBe(false);
  });

  it('player can afford SMG ($1250) with enough money', () => {
    player.money = 2000;
    var canAfford = player.money >= GAME.WEAPON_DEFS.smg.price;
    expect(canAfford).toBe(true);
  });

  it('buying SMG should deduct $1250', () => {
    player.money = 2000;
    player.money -= GAME.WEAPON_DEFS.smg.price;
    expect(player.money).toBe(750);
  });

  it('grenade costs $300', () => {
    expect(GAME.WEAPON_DEFS.grenade.price).toBe(300);
  });

  it('flash costs $200', () => {
    expect(GAME.WEAPON_DEFS.flash.price).toBe(200);
  });

  it('free weapons (knife, pistol) cost $0', () => {
    expect(GAME.WEAPON_DEFS.knife.price).toBe(0);
    expect(GAME.WEAPON_DEFS.pistol.price).toBe(0);
  });

  it('AWP is the most expensive weapon', () => {
    var defs = GAME.WEAPON_DEFS;
    var maxPrice = Math.max(...Object.values(defs).map(d => d.price));
    expect(defs.awp.price).toBe(maxPrice);
  });
});
