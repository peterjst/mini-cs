import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/ui/touch.js');
  loadModule('js/core/fullscreen.js');
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
    document.documentElement.requestFullscreen = function() { return Promise.resolve(); };
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

describe('F11 keybind', () => {
  var origRequest;

  beforeAll(() => {
    GAME.fullscreen.init();
  });

  beforeEach(() => {
    origRequest = document.documentElement.requestFullscreen;
  });

  afterEach(() => {
    document.documentElement.requestFullscreen = origRequest;
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should call toggle when F11 is pressed', () => {
    var called = false;
    document.documentElement.requestFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F11' }));
    expect(called).toBe(true);
  });

  it('should not trigger on other keys', () => {
    var called = false;
    document.documentElement.requestFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10' }));
    expect(called).toBe(false);
  });
});

describe('popstate handler', () => {
  afterEach(() => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should call exitFullscreen when back button pressed during fullscreen', () => {
    var called = false;
    var origExit = document.exitFullscreen;
    document.exitFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    window.dispatchEvent(new PopStateEvent('popstate', {}));
    expect(called).toBe(true);
    document.exitFullscreen = origExit;
  });

  it('should not call exitFullscreen when not in fullscreen', () => {
    var called = false;
    var origExit = document.exitFullscreen;
    document.exitFullscreen = function() { called = true; return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    window.dispatchEvent(new PopStateEvent('popstate', {}));
    expect(called).toBe(false);
    document.exitFullscreen = origExit;
  });
});

describe('orientation lock', () => {
  var origIsMobile, origOrientation;

  beforeEach(() => {
    origIsMobile = GAME.isMobile;
    origOrientation = screen.orientation;
  });

  afterEach(() => {
    GAME.isMobile = origIsMobile;
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    Object.defineProperty(screen, 'orientation', { value: origOrientation, writable: true, configurable: true });
  });

  it('should call screen.orientation.lock on mobile when entering fullscreen', () => {
    GAME.isMobile = true;
    var lockCalled = false;
    Object.defineProperty(screen, 'orientation', {
      value: { lock: function() { lockCalled = true; return Promise.resolve(); }, unlock: function() {} },
      writable: true, configurable: true
    });
    var origRequest = document.documentElement.requestFullscreen;
    document.documentElement.requestFullscreen = function() { return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(lockCalled).toBe(true);
    document.documentElement.requestFullscreen = origRequest;
  });

  it('should call screen.orientation.unlock on mobile when exiting fullscreen', () => {
    GAME.isMobile = true;
    var unlockCalled = false;
    Object.defineProperty(screen, 'orientation', {
      value: { lock: function() { return Promise.resolve(); }, unlock: function() { unlockCalled = true; } },
      writable: true, configurable: true
    });
    var origRequest = document.documentElement.requestFullscreen;
    var origExit = document.exitFullscreen;
    document.documentElement.requestFullscreen = function() { return Promise.resolve(); };
    document.exitFullscreen = function() { return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(unlockCalled).toBe(true);
    document.documentElement.requestFullscreen = origRequest;
    document.exitFullscreen = origExit;
  });

  it('should not call orientation lock on desktop', () => {
    GAME.isMobile = false;
    var lockCalled = false;
    Object.defineProperty(screen, 'orientation', {
      value: { lock: function() { lockCalled = true; return Promise.resolve(); }, unlock: function() {} },
      writable: true, configurable: true
    });
    var origRequest = document.documentElement.requestFullscreen;
    document.documentElement.requestFullscreen = function() { return Promise.resolve(); };
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    GAME.fullscreen.toggle();
    expect(lockCalled).toBe(false);
    document.documentElement.requestFullscreen = origRequest;
  });
});

describe('button state updates', () => {
  it('should add fs-active class to menu button when fullscreenchange fires as active', () => {
    var btn = document.createElement('div');
    btn.id = 'fullscreen-btn';
    document.body.appendChild(btn);
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, writable: true, configurable: true });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(btn.classList.contains('fs-active')).toBe(true);
    document.body.removeChild(btn);
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  });

  it('should remove fs-active class when fullscreenchange fires as inactive', () => {
    var btn = document.createElement('div');
    btn.id = 'fullscreen-btn';
    btn.classList.add('fs-active');
    document.body.appendChild(btn);
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(btn.classList.contains('fs-active')).toBe(false);
    document.body.removeChild(btn);
  });
});
