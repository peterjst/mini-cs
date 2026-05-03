import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/core/player.js');
  loadModule('js/core/sound.js');
  loadModule('js/systems/weapons.js');
  loadModule('js/systems/enemies.js');
  loadModule('js/core/renderer.js');
  loadModule('js/effects/effects.js');
  loadModule('js/effects/birds.js');
  loadModule('js/ui/minimap.js');
  loadModule('js/ui/hud.js');
  loadModule('js/ui/buy.js');
  loadModule('js/ui/menu.js');
  loadModule('js/systems/progression.js');
  loadModule('js/systems/bomb.js');
  loadModule('js/systems/boss.js');
  loadModule('js/systems/shuffle.js');
  loadModule('js/modes/competitive.js');
  loadModule('js/modes/survival.js');
  loadModule('js/modes/gungame.js');
  loadModule('js/modes/deathmatch.js');
  loadModule('js/core/main.js');
});

describe('GAME.subTick', () => {
  it('exists on GAME', () => {
    expect(typeof GAME.subTick).toBe('function');
  });

  it('calls fn once with full dt when dt <= maxStep', () => {
    var calls = [];
    GAME.subTick(0.020, 0.025, function(stepDt) { calls.push(stepDt); });
    expect(calls.length).toBe(1);
    expect(calls[0]).toBeCloseTo(0.020, 6);
  });

  it('calls fn N times with stepDt = dt/N when dt > maxStep', () => {
    var calls = [];
    GAME.subTick(0.060, 0.025, function(stepDt) { calls.push(stepDt); });
    // 0.060 / 0.025 = 2.4 → ceil = 3 substeps, each 0.020s
    expect(calls.length).toBe(3);
    calls.forEach(c => expect(c).toBeCloseTo(0.020, 6));
  });

  it('caps substeps at MAX_SUBSTEPS=4', () => {
    var calls = [];
    // 1.0 / 0.025 = 40 substeps requested → must cap at 4
    GAME.subTick(1.0, 0.025, function(stepDt) { calls.push(stepDt); });
    expect(calls.length).toBe(4);
    // Each step receives 0.25s (cap stretches the step)
    calls.forEach(c => expect(c).toBeCloseTo(0.25, 6));
  });

  it('total stepDt sums to dt (exactly)', () => {
    var sum = 0;
    GAME.subTick(0.073, 0.025, function(stepDt) { sum += stepDt; });
    expect(sum).toBeCloseTo(0.073, 6);
  });

  it('does nothing when dt is zero or negative', () => {
    var calls = 0;
    GAME.subTick(0, 0.025, function() { calls++; });
    GAME.subTick(-0.01, 0.025, function() { calls++; });
    expect(calls).toBe(0);
  });
});
