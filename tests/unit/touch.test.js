import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
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

describe('Auto-fire', () => {
  it('should set GAME.touchFiring to false when no enemies exist', () => {
    GAME.isMobile = true;
    GAME.touchFiring = true;
    GAME.touch.update();
    expect(GAME.touchFiring).toBe(false);
    GAME.isMobile = false; // restore
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
