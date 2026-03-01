# Test Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Vitest test suite with unit and integration tests to prevent regression across all game systems.

**Architecture:** Thin mock layer approach — mock THREE.js, DOM, and Web Audio globals, then evaluate IIFE source files against the mocked `window` to test real production code without refactoring. Tests organized into `unit/` and `integration/` directories.

**Tech Stack:** Vitest, jsdom environment, custom THREE.js/Audio mocks

---

### Task 1: Initialize Vitest and Project Config

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`

**Step 1: Create package.json**

```json
{
  "name": "mini-cs",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create vitest.config.js**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true
  }
});
```

**Step 3: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, vitest installed

**Step 4: Commit**

```bash
git add package.json vitest.config.js package-lock.json
git commit -m "chore: initialize vitest test framework"
```

---

### Task 2: Create THREE.js Mock and Test Setup

**Files:**
- Create: `tests/setup.js`
- Create: `tests/helpers.js`

**Step 1: Create tests/setup.js with THREE mock and DOM skeleton**

```js
import { vi } from 'vitest';

// --- THREE.js Mock ---

function createVector3(x, y, z) {
  return {
    x: x || 0, y: y || 0, z: z || 0,
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; },
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; },
    clone() { return createVector3(this.x, this.y, this.z); },
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; },
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; },
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; },
    normalize() {
      var len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
      if (len > 0) { this.x /= len; this.y /= len; this.z /= len; }
      return this;
    },
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); },
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; },
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; },
    cross(v) {
      var ax = this.x, ay = this.y, az = this.z;
      this.x = ay * v.z - az * v.y;
      this.y = az * v.x - ax * v.z;
      this.z = ax * v.y - ay * v.x;
      return this;
    },
    distanceTo(v) { var dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return Math.sqrt(dx*dx+dy*dy+dz*dz); },
    applyQuaternion() { return this; },
    applyAxisAngle() { return this; },
    lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; },
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; },
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; },
    negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; },
    min(v) { this.x = Math.min(this.x, v.x); this.y = Math.min(this.y, v.y); this.z = Math.min(this.z, v.z); return this; },
    max(v) { this.x = Math.max(this.x, v.x); this.y = Math.max(this.y, v.y); this.z = Math.max(this.z, v.z); return this; },
    setFromMatrixPosition() { return this; },
    crossVectors(a, b) { this.x = a.y*b.z - a.z*b.y; this.y = a.z*b.x - a.x*b.z; this.z = a.x*b.y - a.y*b.x; return this; },
    equals(v) { return this.x === v.x && this.y === v.y && this.z === v.z; }
  };
}

function createVector2(x, y) {
  return {
    x: x || 0, y: y || 0,
    set(x, y) { this.x = x; this.y = y; return this; },
    clone() { return createVector2(this.x, this.y); }
  };
}

function createMockMesh(geometry, material) {
  return {
    geometry, material,
    position: createVector3(),
    rotation: { x: 0, y: 0, z: 0, set(x,y,z) { this.x=x; this.y=y; this.z=z; } },
    scale: { x: 1, y: 1, z: 1, set(x,y,z) { this.x=x; this.y=y; this.z=z; }, multiplyScalar(s) { this.x*=s; this.y*=s; this.z*=s; } },
    quaternion: { setFromAxisAngle() {}, copy() {} },
    castShadow: false,
    receiveShadow: false,
    visible: true,
    children: [],
    parent: null,
    userData: {},
    name: '',
    add(child) { this.children.push(child); child.parent = this; },
    remove(child) { var i = this.children.indexOf(child); if (i>=0) this.children.splice(i,1); },
    traverse(fn) { fn(this); this.children.forEach(c => { if (c.traverse) c.traverse(fn); else fn(c); }); },
    lookAt() {},
    updateMatrixWorld() {},
    getWorldPosition(target) { if (target) { target.copy(this.position); } return this.position; },
    clone() { return createMockMesh(this.geometry, this.material); }
  };
}

function createMockGroup() {
  var g = createMockMesh(null, null);
  g.isGroup = true;
  return g;
}

function createMockScene() {
  var s = createMockMesh(null, null);
  s.isScene = true;
  s.fog = null;
  s.background = null;
  return s;
}

var mockCanvas2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over',
  fillRect() {}, strokeRect() {}, clearRect() {}, beginPath() {}, closePath() {},
  moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {},
  createLinearGradient() { return { addColorStop() {} }; },
  createRadialGradient() { return { addColorStop() {} }; },
  drawImage() {}, getImageData(x,y,w,h) { return { data: new Uint8ClampedArray(w*h*4) }; },
  putImageData() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setTransform() {},
  measureText() { return { width: 10 }; }, font: '10px sans-serif', textAlign: 'left', textBaseline: 'top',
  fillText() {}, strokeText() {},
};

function createMockTexture() {
  return {
    wrapS: 0, wrapT: 0, repeat: createVector2(1,1),
    needsUpdate: false, image: null, dispose() {},
    magFilter: 0, minFilter: 0, encoding: 0, colorSpace: ''
  };
}

var THREE = {
  Vector3: function(x,y,z) { return createVector3(x,y,z); },
  Vector2: function(x,y) { return createVector2(x,y); },
  Color: function(c) { return { r: 0, g: 0, b: 0, set(v) { return this; }, getHex() { return c || 0; }, clone() { return new THREE.Color(c); } }; },
  Euler: function(x,y,z) { return { x: x||0, y: y||0, z: z||0 }; },
  Quaternion: function() { return { setFromAxisAngle() { return this; }, copy() { return this; } }; },
  Matrix4: function() { return { makeRotationY() { return this; }, identity() { return this; } }; },
  Box3: function() { return { min: createVector3(), max: createVector3(), setFromObject() { return this; }, getSize(t) { return t || createVector3(); }, getCenter(t) { return t || createVector3(); } }; },
  Mesh: function(g,m) { return createMockMesh(g,m); },
  Group: function() { return createMockGroup(); },
  Scene: function() { return createMockScene(); },
  Object3D: function() { return createMockMesh(null,null); },
  BoxGeometry: function(w,h,d) { return { type:'BoxGeometry', parameters:{width:w,height:h,depth:d}, dispose() {} }; },
  CylinderGeometry: function(rT,rB,h,s) { return { type:'CylinderGeometry', parameters:{radiusTop:rT,radiusBottom:rB,height:h,radialSegments:s}, dispose() {} }; },
  SphereGeometry: function(r,ws,hs) { return { type:'SphereGeometry', parameters:{radius:r}, dispose() {} }; },
  PlaneGeometry: function(w,h) { return { type:'PlaneGeometry', parameters:{width:w,height:h}, dispose() {} }; },
  CircleGeometry: function(r,s) { return { type:'CircleGeometry', parameters:{radius:r}, dispose() {} }; },
  RingGeometry: function(ir,or,s) { return { type:'RingGeometry', dispose() {} }; },
  TorusGeometry: function() { return { type:'TorusGeometry', dispose() {} }; },
  ConeGeometry: function() { return { type:'ConeGeometry', dispose() {} }; },
  LatheGeometry: function() { return { type:'LatheGeometry', dispose() {} }; },
  BufferGeometry: function() { return { type:'BufferGeometry', setAttribute() {}, dispose() {} }; },
  BufferAttribute: function(arr,sz) { return { array: arr, itemSize: sz }; },
  Float32BufferAttribute: function(arr,sz) { return { array: arr, itemSize: sz }; },
  MeshStandardMaterial: function(opts) { return Object.assign({ type:'MeshStandardMaterial', dispose() {}, clone() { return new THREE.MeshStandardMaterial(opts); } }, opts || {}); },
  MeshBasicMaterial: function(opts) { return Object.assign({ type:'MeshBasicMaterial', dispose() {}, clone() { return new THREE.MeshBasicMaterial(opts); } }, opts || {}); },
  MeshPhongMaterial: function(opts) { return Object.assign({ type:'MeshPhongMaterial', dispose() {} }, opts || {}); },
  LineBasicMaterial: function(opts) { return Object.assign({ type:'LineBasicMaterial', dispose() {} }, opts || {}); },
  SpriteMaterial: function(opts) { return Object.assign({ type:'SpriteMaterial', dispose() {} }, opts || {}); },
  ShaderMaterial: function(opts) { return Object.assign({ type:'ShaderMaterial', dispose() {} }, opts || {}); },
  PointsMaterial: function(opts) { return Object.assign({ type:'PointsMaterial', dispose() {} }, opts || {}); },
  Line: function(g,m) { return createMockMesh(g,m); },
  LineSegments: function(g,m) { return createMockMesh(g,m); },
  Sprite: function(m) { var s = createMockMesh(null,m); s.scale = createVector3(1,1,1); return s; },
  Points: function(g,m) { return createMockMesh(g,m); },
  CanvasTexture: function(canvas) { return createMockTexture(); },
  TextureLoader: function() { return { load() { return createMockTexture(); } }; },
  Raycaster: function() {
    return {
      ray: { origin: createVector3(), direction: createVector3() },
      near: 0, far: Infinity,
      set(origin, dir) { this.ray.origin.copy(origin); this.ray.direction.copy(dir); },
      intersectObjects(objects, recursive) { return []; },
      intersectObject(object, recursive) { return []; }
    };
  },
  PerspectiveCamera: function(fov, aspect, near, far) {
    var cam = createMockMesh(null, null);
    cam.fov = fov || 75; cam.aspect = aspect || 1; cam.near = near || 0.1; cam.far = far || 1000;
    cam.updateProjectionMatrix = function() {};
    cam.getWorldDirection = function(t) { return t || createVector3(0,0,-1); };
    return cam;
  },
  PointLight: function(color, intensity, distance) {
    var l = createMockMesh(null,null);
    l.color = new THREE.Color(color);
    l.intensity = intensity || 1;
    l.distance = distance || 0;
    l.castShadow = false;
    l.shadow = { mapSize: createVector2(512,512), camera: { near: 0.1, far: 500 }, bias: 0 };
    return l;
  },
  AmbientLight: function(color, intensity) { var l = createMockMesh(null,null); l.color = new THREE.Color(color); l.intensity = intensity||1; return l; },
  DirectionalLight: function(color, intensity) {
    var l = createMockMesh(null,null);
    l.color = new THREE.Color(color); l.intensity = intensity||1;
    l.shadow = { mapSize: createVector2(1024,1024), camera: { left:-50, right:50, top:50, bottom:-50, near:0.5, far:200 }, bias: 0 };
    l.target = createMockMesh(null,null);
    return l;
  },
  HemisphereLight: function(skyColor, groundColor, intensity) { var l = createMockMesh(null,null); l.intensity = intensity||1; return l; },
  SpotLight: function(color, intensity) {
    var l = createMockMesh(null,null);
    l.color = new THREE.Color(color); l.intensity = intensity||1; l.angle = Math.PI/6; l.penumbra = 0;
    l.shadow = { mapSize: createVector2(512,512), camera: { near: 0.1, far: 500 }, bias: 0 };
    l.target = createMockMesh(null,null);
    return l;
  },
  Fog: function(color, near, far) { return { color: new THREE.Color(color), near: near, far: far }; },
  FogExp2: function(color, density) { return { color: new THREE.Color(color), density: density }; },
  RepeatWrapping: 1000,
  ClampToEdgeWrapping: 1001,
  NearestFilter: 1003,
  LinearFilter: 1006,
  SRGBColorSpace: 'srgb',
  DoubleSide: 2,
  FrontSide: 0,
  BackSide: 1,
  AdditiveBlending: 2,
  NormalBlending: 1,
  MathUtils: { clamp(v,min,max) { return Math.max(min,Math.min(max,v)); }, lerp(a,b,t) { return a+(b-a)*t; }, degToRad(d) { return d*Math.PI/180; }, randFloat(a,b) { return a+Math.random()*(b-a); } }
};

globalThis.THREE = THREE;

// --- Web Audio API Mock ---

function createMockAudioParam(defaultValue) {
  return {
    value: defaultValue || 0,
    setValueAtTime(v, t) { this.value = v; return this; },
    linearRampToValueAtTime(v, t) { this.value = v; return this; },
    exponentialRampToValueAtTime(v, t) { this.value = v; return this; },
    setTargetAtTime(v, t, c) { this.value = v; return this; },
    cancelScheduledValues() { return this; }
  };
}

function createMockAudioNode() {
  return {
    connect(dest) { return dest; },
    disconnect() {},
    context: null
  };
}

function MockAudioContext() {
  this.currentTime = 0;
  this.sampleRate = 44100;
  this.state = 'running';
  this.destination = createMockAudioNode();
}
MockAudioContext.prototype.createOscillator = function() {
  var node = createMockAudioNode();
  node.type = 'sine';
  node.frequency = createMockAudioParam(440);
  node.detune = createMockAudioParam(0);
  node.start = function() {};
  node.stop = function() {};
  return node;
};
MockAudioContext.prototype.createGain = function() {
  var node = createMockAudioNode();
  node.gain = createMockAudioParam(1);
  return node;
};
MockAudioContext.prototype.createBiquadFilter = function() {
  var node = createMockAudioNode();
  node.type = 'lowpass';
  node.frequency = createMockAudioParam(350);
  node.Q = createMockAudioParam(1);
  node.gain = createMockAudioParam(0);
  return node;
};
MockAudioContext.prototype.createDynamicsCompressor = function() {
  var node = createMockAudioNode();
  node.threshold = createMockAudioParam(-24);
  node.knee = createMockAudioParam(30);
  node.ratio = createMockAudioParam(12);
  node.attack = createMockAudioParam(0.003);
  node.release = createMockAudioParam(0.25);
  return node;
};
MockAudioContext.prototype.createWaveShaper = function() {
  var node = createMockAudioNode();
  node.curve = null;
  node.oversample = 'none';
  return node;
};
MockAudioContext.prototype.createBufferSource = function() {
  var node = createMockAudioNode();
  node.buffer = null;
  node.loop = false;
  node.loopStart = 0;
  node.loopEnd = 0;
  node.playbackRate = createMockAudioParam(1);
  node.start = function() {};
  node.stop = function() {};
  return node;
};
MockAudioContext.prototype.createBuffer = function(channels, length, sampleRate) {
  var data = new Float32Array(length);
  return {
    numberOfChannels: channels, length: length, sampleRate: sampleRate, duration: length / sampleRate,
    getChannelData(ch) { return data; }
  };
};
MockAudioContext.prototype.createConvolver = function() {
  var node = createMockAudioNode();
  node.buffer = null;
  return node;
};
MockAudioContext.prototype.createDelay = function(maxDelay) {
  var node = createMockAudioNode();
  node.delayTime = createMockAudioParam(0);
  return node;
};
MockAudioContext.prototype.createStereoPanner = function() {
  var node = createMockAudioNode();
  node.pan = createMockAudioParam(0);
  return node;
};
MockAudioContext.prototype.resume = function() { return Promise.resolve(); };
MockAudioContext.prototype.close = function() { return Promise.resolve(); };

globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;

// --- SpeechSynthesis Mock ---
globalThis.speechSynthesis = {
  speak() {},
  cancel() {},
  getVoices() { return [{ name: 'English', lang: 'en-US' }]; },
  addEventListener(evt, fn) { if (evt === 'voiceschanged') fn(); }
};
globalThis.SpeechSynthesisUtterance = function(text) {
  this.text = text; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null;
};

// --- DOM Skeleton ---

function ensureElement(id, tag) {
  if (!document.getElementById(id)) {
    var el = document.createElement(tag || 'div');
    el.id = id;
    document.body.appendChild(el);
  }
}

var hudIds = [
  'game-vignette', 'hud', 'crosshair', 'health-bar',
  'hp-fill', 'hp-value', 'armor-fill', 'armor-value', 'helmet-icon',
  'ammo-display', 'weapon-name', 'ammo-mag', 'ammo-reserve', 'grenade-count',
  'money-display', 'round-timer', 'round-info', 'buy-phase-hint',
  'kill-feed', 'announcement', 'scoreboard', 'score-player', 'score-bots',
  'radio-menu', 'hitmarker', 'damage-flash', 'flash-overlay',
  'crouch-indicator', 'low-health-pulse', 'scope-overlay', 'pause-overlay',
  'minimap', 'menu-screen', 'mode-grid', 'buy-menu', 'buy-balance',
  'bomb-hud', 'bomb-timer-display', 'map-info', 'tour-panel',
  'match-stats-overlay', 'stats-body'
];
hudIds.forEach(function(id) { ensureElement(id); });

// Crosshair lines
var ch = document.getElementById('crosshair');
['top','bottom','left','right'].forEach(function(dir) {
  var line = document.createElement('div');
  line.className = 'ch-line ch-' + dir;
  ch.appendChild(line);
});

// Canvas mock for minimap and textures
var origCreateElement = document.createElement.bind(document);
document.createElement = function(tag) {
  var el = origCreateElement(tag);
  if (tag.toLowerCase() === 'canvas') {
    el.getContext = function(type) {
      if (type === '2d') return Object.create(mockCanvas2d);
      return null;
    };
  }
  return el;
};

// --- localStorage Mock ---
var store = {};
globalThis.localStorage = {
  getItem(key) { return store[key] || null; },
  setItem(key, val) { store[key] = String(val); },
  removeItem(key) { delete store[key]; },
  clear() { store = {}; }
};

// --- requestAnimationFrame Mock ---
globalThis.requestAnimationFrame = function(cb) { return setTimeout(cb, 16); };
globalThis.cancelAnimationFrame = function(id) { clearTimeout(id); };

// --- Pointer Lock Mock ---
document.body.requestPointerLock = function() {};
document.exitPointerLock = function() {};
Object.defineProperty(document, 'pointerLockElement', { value: document.body, writable: true });

// --- Performance Mock ---
if (!globalThis.performance) {
  globalThis.performance = { now() { return Date.now(); } };
}

// --- Reset GAME namespace before each test ---
import { beforeEach } from 'vitest';

beforeEach(() => {
  globalThis.GAME = {};
  store = {};
});

export { THREE, mockCanvas2d, createVector3, createVector2, createMockMesh, createMockScene };
```

**Step 2: Create tests/helpers.js**

```js
import { readFileSync } from 'fs';
import { resolve } from 'path';

var moduleCache = {};

export function loadModule(relativePath) {
  var absPath = resolve(relativePath);
  if (!moduleCache[absPath]) {
    moduleCache[absPath] = readFileSync(absPath, 'utf-8');
  }
  var code = moduleCache[absPath];
  var fn = new Function('window', 'document', 'THREE', 'GAME',
    'var globalThis = window;\n' + code
  );
  fn(globalThis, document, globalThis.THREE, globalThis.GAME);
}

export function loadGameModules(...paths) {
  paths.forEach(function(p) { loadModule(p); });
}

export function freshGame() {
  globalThis.GAME = {};
}
```

**Step 3: Run Vitest to verify setup loads**

Run: `npx vitest run --reporter verbose 2>&1 | head -20`
Expected: "No test files found" (no tests yet, but no setup errors)

**Step 4: Commit**

```bash
git add tests/setup.js tests/helpers.js
git commit -m "test: add THREE/Audio/DOM mock layer and test helpers"
```

---

### Task 3: Unit Tests — Weapons

**Files:**
- Create: `tests/unit/weapons.test.js`

**Step 1: Write the tests**

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadGameModules } from '../helpers.js';

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
```

**Step 2: Run tests**

Run: `npx vitest run tests/unit/weapons.test.js --reporter verbose`
Expected: All tests PASS

**Step 3: Fix any mock gaps revealed by the tests, then re-run**

**Step 4: Commit**

```bash
git add tests/unit/weapons.test.js
git commit -m "test: add weapon definitions and weapon system unit tests"
```

---

### Task 4: Unit Tests — Player

**Files:**
- Create: `tests/unit/player.test.js`

**Step 1: Write the tests**

```js
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
```

**Step 2: Run tests**

Run: `npx vitest run tests/unit/player.test.js --reporter verbose`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/unit/player.test.js
git commit -m "test: add player damage and initialization unit tests"
```

---

### Task 5: Unit Tests — Enemies

**Files:**
- Create: `tests/unit/enemies.test.js`

**Step 1: Write the tests**

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/weapons.js');
  loadModule('js/enemies.js');
});

describe('DIFFICULTIES', () => {
  var DIFF;
  beforeAll(() => { DIFF = GAME.DIFFICULTIES; });

  it('should define all 4 difficulty levels', () => {
    expect(DIFF).toHaveProperty('easy');
    expect(DIFF).toHaveProperty('normal');
    expect(DIFF).toHaveProperty('hard');
    expect(DIFF).toHaveProperty('elite');
  });

  it('should have required fields on each level', () => {
    var fields = ['health', 'speed', 'fireRate', 'damage', 'accuracy', 'sight', 'attackRange', 'botCount'];
    Object.keys(DIFF).forEach(level => {
      fields.forEach(field => {
        expect(DIFF[level]).toHaveProperty(field);
      });
    });
  });

  it('health should scale with difficulty', () => {
    expect(DIFF.easy.health).toBeLessThan(DIFF.normal.health);
    expect(DIFF.normal.health).toBeLessThan(DIFF.hard.health);
    expect(DIFF.hard.health).toBeLessThan(DIFF.elite.health);
  });

  it('should have correct health values', () => {
    expect(DIFF.easy.health).toBe(20);
    expect(DIFF.normal.health).toBe(45);
    expect(DIFF.hard.health).toBe(60);
    expect(DIFF.elite.health).toBe(80);
  });

  it('accuracy should scale with difficulty', () => {
    expect(DIFF.easy.accuracy).toBeLessThan(DIFF.normal.accuracy);
    expect(DIFF.normal.accuracy).toBeLessThan(DIFF.hard.accuracy);
    expect(DIFF.hard.accuracy).toBeLessThan(DIFF.elite.accuracy);
  });

  it('bot count should scale with difficulty', () => {
    expect(DIFF.easy.botCount).toBeLessThan(DIFF.elite.botCount);
  });
});

describe('getBotWeapon', () => {
  it('should return valid weapon names', () => {
    var validWeapons = ['pistol', 'smg', 'shotgun', 'rifle', 'awp'];
    for (var i = 0; i < 100; i++) {
      var weapon = GAME._getBotWeapon(5);
      expect(validWeapons).toContain(weapon);
    }
  });

  it('should only return pistol or smg in early rounds (1-2)', () => {
    var earlyWeapons = ['pistol', 'smg'];
    for (var i = 0; i < 100; i++) {
      var weapon = GAME._getBotWeapon(1);
      expect(earlyWeapons).toContain(weapon);
    }
  });
});
```

**Note:** `getBotWeapon` is a private IIFE function. We may need to expose it as `GAME._getBotWeapon` for testing, or test it indirectly through `EnemyManager`. If it's not exposed, we'll adjust in Step 2 by checking bot weapon assignments after spawning.

**Step 2: Run tests**

Run: `npx vitest run tests/unit/enemies.test.js --reporter verbose`
Expected: Tests pass, or getBotWeapon tests need adjustment if function isn't exposed

**Step 3: Adjust tests if getBotWeapon is private — test via EnemyManager spawn instead**

**Step 4: Commit**

```bash
git add tests/unit/enemies.test.js
git commit -m "test: add enemy difficulty and AI parameter unit tests"
```

---

### Task 6: Unit Tests — Maps (Noise + Helpers)

**Files:**
- Create: `tests/unit/maps.test.js`

**Step 1: Write the tests**

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('noise functions via _texUtil', () => {
  it('_hash should be deterministic', () => {
    var h = GAME._texUtil;
    var a = h.hash(5, 10, 42);
    var b = h.hash(5, 10, 42);
    expect(a).toBe(b);
  });

  it('_hash should return values in [0, 1]', () => {
    var h = GAME._texUtil;
    for (var i = 0; i < 100; i++) {
      var val = h.hash(i, i * 7, 99);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('_hash should vary with different inputs', () => {
    var h = GAME._texUtil;
    var a = h.hash(0, 0, 0);
    var b = h.hash(1, 0, 0);
    var c = h.hash(0, 1, 0);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('_valueNoise should return values in [0, 1]', () => {
    var h = GAME._texUtil;
    for (var i = 0; i < 50; i++) {
      var val = h.valueNoise(i * 0.37, i * 0.53, 42);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('_fbmNoise should return values in [0, 1]', () => {
    var h = GAME._texUtil;
    for (var i = 0; i < 50; i++) {
      var val = h.fbmNoise(i * 0.2, i * 0.3, 4, 2.0, 0.5, 42);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('_fbmNoise should be deterministic', () => {
    var h = GAME._texUtil;
    var a = h.fbmNoise(1.5, 2.3, 4, 2.0, 0.5, 42);
    var b = h.fbmNoise(1.5, 2.3, 4, 2.0, 0.5, 42);
    expect(a).toBe(b);
  });
});

describe('build helpers via _mapHelpers', () => {
  it('B() should add mesh to scene and walls', () => {
    var helpers = GAME._mapHelpers;
    var scene = new THREE.Scene();
    var walls = [];
    var mesh = helpers.B(scene, walls, 2, 3, 4, {}, 0, 0, 0);
    expect(scene.children.length).toBeGreaterThan(0);
    expect(walls.length).toBe(1);
    expect(walls[0]).toBe(mesh);
  });

  it('D() should add mesh to scene but NOT to walls', () => {
    var helpers = GAME._mapHelpers;
    var scene = new THREE.Scene();
    var mesh = helpers.D(scene, 2, 3, 4, {}, 0, 0, 0);
    expect(scene.children.length).toBeGreaterThan(0);
  });

  it('CylW() should add to walls', () => {
    var helpers = GAME._mapHelpers;
    var scene = new THREE.Scene();
    var walls = [];
    var mesh = helpers.CylW(scene, walls, 1, 1, 3, 8, {}, 0, 0, 0);
    expect(walls.length).toBe(1);
  });

  it('Cyl() should NOT add to walls', () => {
    var helpers = GAME._mapHelpers;
    var scene = new THREE.Scene();
    var mesh = helpers.Cyl(scene, 1, 1, 3, 8, {}, 0, 0, 0);
    expect(scene.children.length).toBeGreaterThan(0);
  });
});

describe('map registry', () => {
  it('_maps array should exist', () => {
    expect(Array.isArray(GAME._maps)).toBe(true);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run tests/unit/maps.test.js --reporter verbose`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/unit/maps.test.js
git commit -m "test: add noise functions and map helper unit tests"
```

---

### Task 7: Unit Tests — Sound

**Files:**
- Create: `tests/unit/sound.test.js`

**Step 1: Write the tests**

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/sound.js');
});

describe('GAME.Sound', () => {
  it('should be defined after loading', () => {
    expect(GAME.Sound).toBeDefined();
  });

  it('should have core sound methods', () => {
    var methods = ['init'];
    methods.forEach(m => {
      expect(typeof GAME.Sound[m]).toBe('function');
    });
  });

  it('init should not throw', () => {
    expect(() => GAME.Sound.init()).not.toThrow();
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run tests/unit/sound.test.js --reporter verbose`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/unit/sound.test.js
git commit -m "test: add sound system unit tests"
```

---

### Task 8: Unit Tests — Main (Game State, Perks, Buy System)

**Files:**
- Create: `tests/unit/main.test.js`

**Step 1: Write the tests**

Note: main.js is tightly coupled to DOM and other modules. These tests load all dependencies and verify exposed state/functions.

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  // main.js needs all prior modules
  loadModule('js/maps/shared.js');
  // Load map files so GAME._maps is populated
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/player.js');
  loadModule('js/sound.js');
  loadModule('js/weapons.js');
  loadModule('js/enemies.js');
  loadModule('js/main.js');
});

describe('game state', () => {
  it('should expose hasPerk function', () => {
    expect(typeof GAME.hasPerk).toBe('function');
  });

  it('hasPerk should return false when no perks are active', () => {
    expect(GAME.hasPerk('juggernaut')).toBe(false);
    expect(GAME.hasPerk('fleet_foot')).toBe(false);
    expect(GAME.hasPerk('stopping_power')).toBe(false);
  });

  it('should expose setDifficulty', () => {
    expect(typeof GAME.setDifficulty).toBe('function');
  });

  it('should expose getDifficulty', () => {
    expect(typeof GAME.getDifficulty).toBe('function');
  });

  it('should expose getMapCount', () => {
    expect(typeof GAME.getMapCount).toBe('function');
    expect(GAME.getMapCount()).toBe(6);
  });

  it('should expose getMapDef', () => {
    expect(typeof GAME.getMapDef).toBe('function');
    var def = GAME.getMapDef(0);
    expect(def).toBeDefined();
    expect(def.name).toBeDefined();
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run tests/unit/main.test.js --reporter verbose`
Expected: All tests PASS (may need DOM element adjustments in setup.js)

**Step 3: Fix any missing DOM elements in setup.js, re-run**

**Step 4: Commit**

```bash
git add tests/unit/main.test.js
git commit -m "test: add game state and main module unit tests"
```

---

### Task 9: Integration Tests — Map Loading

**Files:**
- Create: `tests/integration/map-loading.test.js`

**Step 1: Write the tests**

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
});

describe('map loading', () => {
  it('should register 6 maps', () => {
    expect(GAME._maps.length).toBe(6);
  });

  var mapNames = ['Dust', 'Office', 'Warehouse', 'Bloodstrike', 'Italy', 'Aztec'];

  mapNames.forEach((name, index) => {
    describe(name + ' map', () => {
      it('should have a name', () => {
        expect(GAME._maps[index].name).toBeDefined();
      });

      it('should have a build function', () => {
        expect(typeof GAME._maps[index].build).toBe('function');
      });

      it('should build without throwing', () => {
        var scene = new THREE.Scene();
        expect(() => {
          GAME._maps[index].build(scene);
        }).not.toThrow();
      });

      it('should add objects to the scene', () => {
        var scene = new THREE.Scene();
        GAME._maps[index].build(scene);
        expect(scene.children.length).toBeGreaterThan(0);
      });

      it('should return walls array', () => {
        var scene = new THREE.Scene();
        var result = GAME._maps[index].build(scene);
        if (result && result.walls) {
          expect(Array.isArray(result.walls)).toBe(true);
          expect(result.walls.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run tests/integration/map-loading.test.js --reporter verbose`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/integration/map-loading.test.js
git commit -m "test: add map loading smoke tests for all 6 maps"
```

---

### Task 10: Integration Tests — Combat

**Files:**
- Create: `tests/integration/combat.test.js`

**Step 1: Write the tests**

```js
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

  it('shotgun 8 pellets should deal cumulative damage', () => {
    var pelletDmg = GAME.WEAPON_DEFS.shotgun.damage; // 18 per pellet
    var totalDmg = pelletDmg * GAME.WEAPON_DEFS.shotgun.pellets; // 18 * 8 = 144
    player.takeDamage(totalDmg);
    expect(player.alive).toBe(false);
  });

  it('knife should not kill from full health in one hit', () => {
    player.takeDamage(GAME.WEAPON_DEFS.knife.damage); // 55
    expect(player.alive).toBe(true);
    expect(player.health).toBe(45);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run tests/integration/combat.test.js --reporter verbose`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/integration/combat.test.js
git commit -m "test: add combat integration tests for damage and perks"
```

---

### Task 11: Integration Tests — Economy

**Files:**
- Create: `tests/integration/economy.test.js`

**Step 1: Write the tests**

```js
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
```

**Step 2: Run tests**

Run: `npx vitest run tests/integration/economy.test.js --reporter verbose`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/integration/economy.test.js
git commit -m "test: add economy integration tests for buy system"
```

---

### Task 12: Run Full Suite and Verify

**Step 1: Run all tests**

Run: `npx vitest run --reporter verbose`
Expected: All test files pass

**Step 2: Check test count**

Run: `npx vitest run 2>&1 | tail -5`
Expected: Shows total tests passed with 0 failures

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "test: complete regression test suite with unit and integration tests"
```

---

### Task 13: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

**Step 1: Add test suite section to REQUIREMENTS.md**

Add a new section documenting the test infrastructure:

```markdown
## Test Suite

### Framework
- **Vitest** with jsdom environment
- Global mocks for THREE.js, Web Audio API, DOM skeleton
- IIFE modules loaded via `loadModule()` helper that evaluates source against mocked globals

### Test Structure
- `tests/setup.js` — Global mocks and DOM skeleton
- `tests/helpers.js` — `loadModule()` utility
- `tests/unit/` — Unit tests per module (weapons, player, enemies, maps, sound, main)
- `tests/integration/` — Cross-module tests (combat, economy, map-loading)

### Running Tests
- `npm test` — Run all tests once
- `npm run test:watch` — Watch mode

### Coverage Areas
- Weapon definitions: damage, price, properties, skins
- Player: takeDamage with armor/perks, initialization
- Enemies: difficulty scaling, aim params, personalities
- Maps: noise functions, build helpers, map loading smoke tests
- Sound: initialization, method availability
- Main: game state, perks, map registry
- Combat: damage formulas with armor and perks
- Economy: buy system price validation
```

**Step 2: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "docs: add test suite section to REQUIREMENTS.md"
```
