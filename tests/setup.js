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
  createImageData(w,h) { return { data: new Uint8ClampedArray(w*h*4), width: w, height: h }; },
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
  Euler: function(x,y,z) { return { x: x||0, y: y||0, z: z||0, set(x,y,z) { this.x=x; this.y=y; this.z=z; return this; }, setFromQuaternion() { return this; } }; },
  Quaternion: function() { return { setFromAxisAngle() { return this; }, copy() { return this; }, setFromUnitVectors() { return this; }, setFromEuler() { return this; } }; },
  Matrix4: function() { return { makeRotationY() { return this; }, identity() { return this; }, copy() { return this; }, makeScale() { return this; }, compose() { return this; } }; },
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
  BufferGeometry: function() { return { type:'BufferGeometry', setAttribute() {}, setFromPoints() {}, dispose() {} }; },
  BufferAttribute: function(arr,sz) { return { array: arr, itemSize: sz }; },
  Float32BufferAttribute: function(arr,sz) { return { array: arr, itemSize: sz }; },
  MeshStandardMaterial: function(opts) { return Object.assign({ type:'MeshStandardMaterial', dispose() {}, clone() { return new THREE.MeshStandardMaterial(opts); } }, opts || {}); },
  MeshBasicMaterial: function(opts) { return Object.assign({ type:'MeshBasicMaterial', dispose() {}, clone() { return new THREE.MeshBasicMaterial(opts); } }, opts || {}); },
  MeshPhysicalMaterial: function(opts) { return Object.assign({ type:'MeshPhysicalMaterial', dispose() {}, clone() { return new THREE.MeshPhysicalMaterial(opts); } }, opts || {}); },
  MeshPhongMaterial: function(opts) { return Object.assign({ type:'MeshPhongMaterial', dispose() {} }, opts || {}); },
  LineBasicMaterial: function(opts) { return Object.assign({ type:'LineBasicMaterial', dispose() {} }, opts || {}); },
  SpriteMaterial: function(opts) { return Object.assign({ type:'SpriteMaterial', dispose() {} }, opts || {}); },
  ShaderMaterial: function(opts) { return Object.assign({ type:'ShaderMaterial', dispose() {} }, opts || {}); },
  PointsMaterial: function(opts) { return Object.assign({ type:'PointsMaterial', dispose() {} }, opts || {}); },
  Line: function(g,m) { return createMockMesh(g,m); },
  LineSegments: function(g,m) { return createMockMesh(g,m); },
  Sprite: function(m) { var s = createMockMesh(null,m); s.scale = createVector3(1,1,1); return s; },
  Points: function(g,m) { return createMockMesh(g,m); },
  InstancedMesh: function(g,m,count) {
    var im = createMockMesh(g,m);
    im.count = count;
    im.frustumCulled = true;
    im.renderOrder = 0;
    im.instanceMatrix = { needsUpdate: false };
    im.setMatrixAt = function() {};
    im.dispose = function() {};
    return im;
  },
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
  WebGLRenderer: function(opts) {
    var canvas = document.createElement('canvas');
    return {
      domElement: canvas,
      setSize() {}, setPixelRatio() {}, setClearColor() {},
      setRenderTarget() {}, render() {}, dispose() {}, clear() {},
      shadowMap: { enabled: false, type: 0 },
      toneMapping: 0, toneMappingExposure: 1, outputColorSpace: 'srgb',
      getSize(target) { return target ? target.set(800, 600) : { width: 800, height: 600 }; }
    };
  },
  WebGLRenderTarget: function(w, h, opts) {
    var rt = { texture: createMockTexture(), setSize() {}, dispose() {} };
    if (opts && opts.depthTexture) rt.depthTexture = opts.depthTexture;
    return rt;
  },
  DepthTexture: function(w, h, type) {
    return { width: w, height: h, type: type || 0, dispose() {} };
  },
  OrthographicCamera: function(left, right, top, bottom, near, far) {
    var cam = createMockMesh(null, null);
    cam.left = left; cam.right = right; cam.top = top; cam.bottom = bottom;
    cam.near = near || 0.1; cam.far = far || 1000;
    cam.updateProjectionMatrix = function() {};
    return cam;
  },
  PMREMGenerator: function() {
    return {
      fromScene: function() { return { texture: createMockTexture() }; },
      dispose: function() {}
    };
  },
  PCFSoftShadowMap: 2,
  ACESFilmicToneMapping: 4,
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
  DataTexture: function(data, w, h, format, type) { var t = createMockTexture(); t.image = { data: data, width: w, height: h }; t.format = format; t.type = type; return t; },
  RGBAFormat: 1023,
  FloatType: 1015,
  UnsignedInt248Type: 1020,
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
MockAudioContext.prototype.createPanner = function() {
  var node = createMockAudioNode();
  node.panningModel = 'equalpower';
  node.distanceModel = 'inverse';
  node.refDistance = 1;
  node.maxDistance = 10000;
  node.rolloffFactor = 1;
  node.setPosition = function() {};
  node.setOrientation = function() {};
  node.positionX = createMockAudioParam(0);
  node.positionY = createMockAudioParam(0);
  node.positionZ = createMockAudioParam(0);
  return node;
};
Object.defineProperty(MockAudioContext.prototype, 'listener', {
  get: function() {
    if (!this._listener) {
      this._listener = {
        positionX: createMockAudioParam(0),
        positionY: createMockAudioParam(0),
        positionZ: createMockAudioParam(0),
        forwardX: createMockAudioParam(0),
        forwardY: createMockAudioParam(0),
        forwardZ: createMockAudioParam(-1),
        upX: createMockAudioParam(0),
        upY: createMockAudioParam(1),
        upZ: createMockAudioParam(0),
        setPosition: function() {},
        setOrientation: function() {}
      };
    }
    return this._listener;
  }
});
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

// Canvas mock for minimap and textures — must be before element creation
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

var hudIds = [
  'game-vignette', 'hud', 'crosshair', 'health-bar',
  'hp-fill', 'hp-value', 'armor-fill', 'armor-value', 'helmet-icon',
  'ammo-display', 'weapon-name', 'ammo-mag', 'ammo-reserve', 'grenade-count',
  'money-display', 'round-timer', 'round-info', 'buy-phase-hint',
  'kill-feed', 'announcement', 'scoreboard', 'score-player', 'score-bots',
  'score-player-label', 'score-bots-label',
  'radio-menu', 'hitmarker', 'damage-flash', 'flash-overlay',
  'crouch-indicator', 'low-health-pulse', 'scope-overlay', 'pause-overlay',
  'menu-screen', 'mode-grid', 'mode-back', 'buy-menu', 'buy-balance',
  'bomb-hud', 'bomb-timer-display', 'bomb-action-hint', 'bomb-progress-wrap', 'bomb-progress-bar',
  'map-info', 'tour-panel', 'tour-panel-close', 'tour-exit-btn', 'tour-map-label',
  'match-stats-overlay', 'stats-body',
  'quick-play-btn', 'quick-play-info', 'menu-content',
  'comp-start-btn', 'surv-start-btn', 'gg-start-btn', 'dm-start-btn',
  'missions-footer-btn', 'history-footer-btn', 'tour-footer-btn',
  'controls-footer-btn', 'loadout-footer-btn',
  'loadout-overlay', 'loadout-close', 'loadout-weapons', 'loadout-skins',
  'controls-overlay', 'controls-close',
  'missions-overlay', 'missions-close',
  'match-end', 'match-result', 'final-score', 'restart-btn', 'menu-btn',
  'history-panel', 'history-stats', 'history-list', 'history-close',
  'dmg-container', 'streak-announce',
  'wave-counter', 'rank-display', 'match-xp-breakdown',
  'survival-best-display', 'survival-end', 'survival-wave-result',
  'survival-stats-display', 'survival-xp-breakdown',
  'survival-restart-btn', 'survival-menu-btn',
  'pause-resume-btn', 'pause-menu-btn',
  'gungame-best-display', 'gungame-end', 'gungame-time-result',
  'gungame-stats-display', 'gungame-xp-breakdown',
  'gungame-restart-btn', 'gungame-menu-btn', 'gungame-level',
  'dm-best-display', 'deathmatch-end', 'dm-kill-result',
  'dm-stats-display', 'dm-xp-breakdown',
  'dm-restart-btn', 'dm-menu-btn', 'dm-kill-counter', 'dm-respawn-timer',
  'comp-map-mode-row', 'surv-map-mode-row', 'gg-map-mode-row', 'dm-map-mode-row',
  'comp-mode-row', 'comp-team-options', 'comp-objective-row', 'comp-side-row',
  'mission-daily-list', 'mission-weekly',
  'overlay-mission-daily-list', 'overlay-mission-weekly',
  'active-perks', 'perk-screen', 'perk-choices'
];
hudIds.forEach(function(id) { ensureElement(id); });

// Minimap needs to be a canvas element
ensureElement('minimap', 'canvas');

// Crosshair lines
var ch = document.getElementById('crosshair');
['top','bottom','left','right'].forEach(function(dir) {
  var line = document.createElement('div');
  line.className = 'ch-line ch-' + dir;
  ch.appendChild(line);
});

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

// --- Initialize GAME namespace ---
globalThis.GAME = {};

// --- Reset localStorage before each test ---
import { beforeEach } from 'vitest';

beforeEach(() => {
  store = {};
});

export { THREE, mockCanvas2d, createVector3, createVector2, createMockMesh, createMockScene };
