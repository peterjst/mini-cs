import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/weapons.js');
});

describe('Knife cone detection', () => {
  it('knife should have isKnife flag and range of 5', () => {
    var def = GAME.WEAPON_DEFS.knife;
    expect(def.isKnife).toBe(true);
    expect(def.range).toBe(5);
  });

  it('knife should define cone angle of 45 degrees', () => {
    expect(GAME.KNIFE_CONE_ANGLE).toBeCloseTo(Math.PI / 4, 2);
  });

  it('knife should use 9 rays for cone sweep', () => {
    expect(GAME.KNIFE_CONE_RAYS).toBe(9);
  });
});
