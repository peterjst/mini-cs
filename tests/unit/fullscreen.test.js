import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/touch.js');
  loadModule('js/fullscreen.js');
});

describe('GAME.fullscreen', () => {
  it('should exist as a namespace', () => {
    expect(GAME.fullscreen).toBeDefined();
  });

  it('should expose init, toggle, and isActive', () => {
    expect(typeof GAME.fullscreen.init).toBe('function');
    expect(typeof GAME.fullscreen.toggle).toBe('function');
    expect(typeof GAME.fullscreen.isActive).toBe('function');
  });
});

describe('isActive', () => {
  afterEach(() => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should return false when not in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    expect(GAME.fullscreen.isActive()).toBe(false);
  });

  it('should return true when in fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    expect(GAME.fullscreen.isActive()).toBe(true);
  });
});

describe('toggle', () => {
  var origRequest, origExit;

  beforeEach(() => {
    origRequest = document.documentElement.requestFullscreen;
    origExit = document.exitFullscreen;
  });

  afterEach(() => {
    document.documentElement.requestFullscreen = origRequest;
    document.exitFullscreen = origExit;
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should call requestFullscreen when not in fullscreen', () => {
    var called = false;
    document.documentElement.requestFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(called).toBe(true);
  });

  it('should call exitFullscreen when in fullscreen', () => {
    var called = false;
    document.exitFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(called).toBe(true);
  });

  it('should be a no-op when fullscreen API is unsupported', () => {
    document.documentElement.requestFullscreen = undefined;
    document.exitFullscreen = undefined;
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    expect(() => GAME.fullscreen.toggle()).not.toThrow();
  });
});
