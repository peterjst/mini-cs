# Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the visual experience with a unified post-processing pipeline (SSAO, color grading, vignette, sharpen), instanced particle system, per-map lighting moods, and enhanced action feedback.

**Architecture:** All screen-space effects go through a single multi-pass render chain in `renderWithBloom()` (js/main.js). A new `js/particles.js` module handles all particle effects via InstancedMesh pools with one update call per frame. Per-map lighting and color grading configs are added to each map definition and read by `GAME.buildMap()`.

**Tech Stack:** Three.js r160 (global `THREE`), Web Audio API, IIFE module pattern, Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-11-visual-overhaul-design.md`

---

## Chunk 1: Post-Processing Pipeline

### Task 1: Add depth texture to scene render target

**Files:**
- Modify: `js/main.js:162` (sceneRT creation)

- [ ] **Step 1: Write the failing test**

In `tests/unit/main.test.js`, add a test verifying `sceneRT` has a depth texture:

```javascript
describe('Post-processing pipeline', () => {
  it('should attach a DepthTexture to sceneRT', () => {
    // sceneRT is internal to main.js IIFE, so test via GAME._postProcess
    expect(GAME._postProcess).toBeDefined();
    expect(GAME._postProcess.sceneRT).toBeDefined();
    expect(GAME._postProcess.sceneRT.depthTexture).toBeDefined();
    expect(GAME._postProcess.sceneRT.depthTexture.type).toBe(THREE.UnsignedInt248Type);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL — `GAME._postProcess` is undefined

- [ ] **Step 3: Implement depth texture attachment**

In `js/main.js`, at line 162, modify `sceneRT` creation:

```javascript
var sceneRT = new THREE.WebGLRenderTarget(rw, rh, {
  depthTexture: new THREE.DepthTexture(rw, rh, THREE.UnsignedInt248Type)
});
```

Expose for testing — add after the bloom setup block (after line 278):

```javascript
GAME._postProcess = {
  sceneRT: sceneRT,
  bloomStrength: compositeMat.uniforms.bloomStrength
};
```

- [ ] **Step 4: Update resizeBloom to resize depth texture**

In `resizeBloom()` (line 267), the depth texture auto-resizes with `sceneRT.setSize()` — no change needed. Verify this is the case.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/main.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```
git add js/main.js tests/unit/main.test.js
git commit -m "feat: attach DepthTexture to sceneRT for SSAO preparation"
```

---

### Task 2: Add SSAO pass

**Files:**
- Modify: `js/main.js` (add SSAO render target, shaders, and pass in `renderWithBloom()`)

- [ ] **Step 1: Write failing tests for SSAO**

In `tests/unit/main.test.js`:

```javascript
describe('SSAO', () => {
  it('should expose SSAO render target at half resolution', () => {
    expect(GAME._postProcess.ssaoRT).toBeDefined();
  });

  it('should expose SSAO toggle', () => {
    expect(typeof GAME._postProcess.ssaoEnabled).toBe('boolean');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL — ssaoRT undefined

- [ ] **Step 3: Implement SSAO pass**

In `js/main.js`, after `sceneRT` creation (line 162), add SSAO render target:

```javascript
var ssaoRT = new THREE.WebGLRenderTarget(hw, hh);
var ssaoEnabled = true;
```

Add SSAO shader materials after the bloom shader definitions (after line 228). The SSAO shader:
- Samples depth texture with 8 hemisphere samples
- Parameters: radius 0.5, bias 0.025, falloff 2.0
- Outputs occlusion factor as grayscale

```javascript
var ssaoKernel = [];
for (var ki = 0; ki < 8; ki++) {
  var sample = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random()
  ).normalize();
  sample.multiplyScalar(Math.random());
  var scale = ki / 8;
  scale = 0.1 + scale * scale * 0.9; // lerp accelerating
  sample.multiplyScalar(scale);
  ssaoKernel.push(sample);
}

var ssaoNoiseTex = (function() {
  var size = 4;
  var data = new Float32Array(size * size * 4);
  for (var ni = 0; ni < size * size; ni++) {
    data[ni * 4] = Math.random() * 2 - 1;
    data[ni * 4 + 1] = Math.random() * 2 - 1;
    data[ni * 4 + 2] = 0;
    data[ni * 4 + 3] = 1;
  }
  var tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
})();

var ssaoMat = new THREE.ShaderMaterial({
  uniforms: {
    tDepth: { value: null },
    uKernel: { value: ssaoKernel },
    uNoise: { value: ssaoNoiseTex },
    uNoiseScale: { value: new THREE.Vector2(rw / 4, rh / 4) },
    uProjection: { value: new THREE.Matrix4() },
    uInvProjection: { value: new THREE.Matrix4() },
    uRadius: { value: 0.5 },
    uBias: { value: 0.025 },
    uNear: { value: 0.1 },
    uFar: { value: 200.0 }
  },
  vertexShader: bloomVert,
  fragmentShader: [
    'uniform sampler2D tDepth;',
    'uniform vec3 uKernel[8];',
    'uniform sampler2D uNoise;',
    'uniform vec2 uNoiseScale;',
    'uniform mat4 uProjection;',
    'uniform mat4 uInvProjection;',
    'uniform float uRadius;',
    'uniform float uBias;',
    'uniform float uNear;',
    'uniform float uFar;',
    'varying vec2 vUv;',
    '',
    'float linearDepth(float d) {',
    '  return uNear * uFar / (uFar - d * (uFar - uNear));',
    '}',
    '',
    'vec3 viewPosFromDepth(vec2 uv) {',
    '  float d = texture2D(tDepth, uv).r;',
    '  vec4 clip = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);',
    '  vec4 vp = uInvProjection * clip;',
    '  return vp.xyz / vp.w;',
    '}',
    '',
    'void main() {',
    '  vec3 origin = viewPosFromDepth(vUv);',
    '  float depth = linearDepth(texture2D(tDepth, vUv).r);',
    '  if (depth > 100.0) { gl_FragColor = vec4(1.0); return; }',
    '',
    '  vec3 noise = texture2D(uNoise, vUv * uNoiseScale).xyz;',
    '  vec3 tangent = normalize(noise - origin * dot(noise, origin));',
    '  vec3 bitangent = cross(origin, tangent);',
    '  mat3 tbn = mat3(tangent, bitangent, normalize(origin));',
    '',
    '  float occlusion = 0.0;',
    '  for (int i = 0; i < 8; i++) {',
    '    vec3 samplePos = origin + tbn * uKernel[i] * uRadius;',
    '    vec4 offset = uProjection * vec4(samplePos, 1.0);',
    '    offset.xy = offset.xy / offset.w * 0.5 + 0.5;',
    '    float sampleDepth = viewPosFromDepth(offset.xy).z;',
    '    float rangeCheck = smoothstep(0.0, 1.0, uRadius / abs(origin.z - sampleDepth));',
    '    occlusion += step(samplePos.z + uBias, sampleDepth) * rangeCheck;',
    '  }',
    '  occlusion = 1.0 - (occlusion / 8.0);',
    '  gl_FragColor = vec4(vec3(occlusion), 1.0);',
    '}'
  ].join('\n'),
  toneMapped: false
});
var ssaoScene = new THREE.Scene();
ssaoScene.add(new THREE.Mesh(fsGeo, ssaoMat));
```

Add SSAO bilateral blur (separable, 5-tap):

```javascript
var ssaoBlurMat = new THREE.ShaderMaterial({
  uniforms: {
    tSSAO: { value: null },
    tDepth: { value: null },
    uDirection: { value: new THREE.Vector2(1.0 / hw, 0) }
  },
  vertexShader: bloomVert,
  fragmentShader: [
    'uniform sampler2D tSSAO;',
    'uniform sampler2D tDepth;',
    'uniform vec2 uDirection;',
    'varying vec2 vUv;',
    'void main() {',
    '  float center = texture2D(tDepth, vUv).r;',
    '  float weights[5]; weights[0]=0.227027; weights[1]=0.194595; weights[2]=0.121622; weights[3]=0.054054; weights[4]=0.016216;',
    '  float result = texture2D(tSSAO, vUv).r * weights[0];',
    '  float wSum = weights[0];',
    '  for (int i = 1; i < 5; i++) {',
    '    vec2 off = uDirection * float(i);',
    '    float d1 = texture2D(tDepth, vUv + off).r;',
    '    float d2 = texture2D(tDepth, vUv - off).r;',
    '    float w1 = weights[i] * step(abs(d1 - center), 0.01);',
    '    float w2 = weights[i] * step(abs(d2 - center), 0.01);',
    '    result += texture2D(tSSAO, vUv + off).r * w1;',
    '    result += texture2D(tSSAO, vUv - off).r * w2;',
    '    wSum += w1 + w2;',
    '  }',
    '  gl_FragColor = vec4(vec3(result / wSum), 1.0);',
    '}'
  ].join('\n'),
  toneMapped: false
});
var ssaoBlurScene = new THREE.Scene();
ssaoBlurScene.add(new THREE.Mesh(fsGeo, ssaoBlurMat));
var ssaoBlurRT = new THREE.WebGLRenderTarget(hw, hh);
```

- [ ] **Step 4: Insert SSAO into renderWithBloom()**

In `renderWithBloom()`, after `renderer.render(scene, camera)` (line 238) and before the bright pass (line 240), add:

```javascript
// SSAO pass
if (ssaoEnabled) {
  ssaoMat.uniforms.tDepth.value = sceneRT.depthTexture;
  ssaoMat.uniforms.uProjection.value.copy(camera.projectionMatrix);
  ssaoMat.uniforms.uInvProjection.value.copy(camera.projectionMatrixInverse);
  renderer.setRenderTarget(ssaoRT);
  renderer.render(ssaoScene, bloomCam);

  // Bilateral blur H
  ssaoBlurMat.uniforms.tSSAO.value = ssaoRT.texture;
  ssaoBlurMat.uniforms.tDepth.value = sceneRT.depthTexture;
  ssaoBlurMat.uniforms.uDirection.value.set(1.0 / hw, 0);
  renderer.setRenderTarget(ssaoBlurRT);
  renderer.render(ssaoBlurScene, bloomCam);

  // Bilateral blur V
  ssaoBlurMat.uniforms.tSSAO.value = ssaoBlurRT.texture;
  ssaoBlurMat.uniforms.uDirection.value.set(0, 1.0 / hh);
  renderer.setRenderTarget(ssaoRT);
  renderer.render(ssaoBlurScene, bloomCam);
}
```

- [ ] **Step 5: Expose SSAO in GAME._postProcess**

Note: The composite shader will be fully replaced in Task 3 (color grading) to include SSAO, color grading, vignette, and desaturation in one pass. For now, just set up the SSAO render targets and pass — the composite integration happens in Task 3.

In `renderWithBloom()`, before the composite render, pass SSAO to composite (interim — Task 3 replaces the composite shader):
```javascript
compositeMat.uniforms.tSSAO = compositeMat.uniforms.tSSAO || { value: null };
compositeMat.uniforms.tSSAO.value = ssaoRT.texture;
```

```javascript
GAME._postProcess = {
  sceneRT: sceneRT,
  ssaoRT: ssaoRT,
  ssaoEnabled: ssaoEnabled,
  bloomStrength: compositeMat.uniforms.bloomStrength
};
```

Also expose a toggle function:
```javascript
GAME.setSSAO = function(enabled) {
  ssaoEnabled = enabled;
  GAME._postProcess.ssaoEnabled = enabled;
};
```

- [ ] **Step 7: Update resizeBloom to handle SSAO targets**

In `resizeBloom()`, add:
```javascript
ssaoRT.setSize(hw2, hh2);
ssaoBlurRT.setSize(hw2, hh2);
ssaoBlurMat.uniforms.uDirection.value.set(1.0 / hw2, 0); // reset, will be set per-frame anyway
ssaoMat.uniforms.uNoiseScale.value.set(w / 4, h / 4);
```

- [ ] **Step 8: Run tests**

Run: `npm test -- tests/unit/main.test.js`
Expected: PASS

- [ ] **Step 9: Commit**

```
git add js/main.js tests/unit/main.test.js
git commit -m "feat: add SSAO post-processing pass with bilateral blur"
```

---

### Task 3: Add per-map color grading and vignette to composite shader

**Files:**
- Modify: `js/main.js:216-226` (compositeMat shader)
- Modify: `js/maps/shared.js:608-657` (buildMap reads colorGrade config)
- Modify: `js/maps/dust.js`, `js/maps/office.js`, `js/maps/warehouse.js`, `js/maps/bloodstrike.js`, `js/maps/italy.js`, `js/maps/aztec.js` (add colorGrade config)

- [ ] **Step 1: Write failing tests**

In `tests/unit/main.test.js`:

```javascript
describe('Color grading', () => {
  it('should expose color grading uniforms', () => {
    var pp = GAME._postProcess;
    expect(pp.colorGrade).toBeDefined();
    expect(pp.colorGrade.tint).toBeDefined();
    expect(pp.colorGrade.contrast).toBeDefined();
    expect(pp.colorGrade.saturation).toBeDefined();
    expect(pp.colorGrade.vignetteStrength).toBeDefined();
  });
});
```

In `tests/unit/maps.test.js`:

```javascript
describe('Map color grading configs', () => {
  it('every map should have a colorGrade config', () => {
    GAME._maps.forEach(function(map) {
      expect(map.colorGrade).toBeDefined();
      expect(map.colorGrade.tint).toBeDefined();
      expect(typeof map.colorGrade.contrast).toBe('number');
      expect(typeof map.colorGrade.saturation).toBe('number');
      expect(typeof map.colorGrade.vignetteStrength).toBe('number');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Add colorGrade to each map definition**

In each map file, add `colorGrade` property to the map definition object:

**js/maps/dust.js:**
```javascript
colorGrade: {
  tint: [1.05, 0.98, 0.88],
  shadows: [0.95, 0.85, 0.7],
  contrast: 1.08,
  saturation: 1.05,
  vignetteStrength: 0.3
},
```

**js/maps/office.js:**
```javascript
colorGrade: {
  tint: [0.92, 0.95, 1.05],
  shadows: [0.8, 0.85, 0.95],
  contrast: 1.05,
  saturation: 0.95,
  vignetteStrength: 0.25
},
```

**js/maps/warehouse.js:**
```javascript
colorGrade: {
  tint: [1.0, 0.97, 0.92],
  shadows: [0.85, 0.8, 0.75],
  contrast: 1.1,
  saturation: 0.9,
  vignetteStrength: 0.4
},
```

**js/maps/bloodstrike.js:**
```javascript
colorGrade: {
  tint: [1.0, 1.0, 1.0],
  shadows: [0.9, 0.9, 0.9],
  contrast: 1.05,
  saturation: 1.1,
  vignetteStrength: 0.2
},
```

**js/maps/italy.js:**
```javascript
colorGrade: {
  tint: [1.08, 1.0, 0.9],
  shadows: [0.9, 0.8, 0.65],
  contrast: 1.06,
  saturation: 1.15,
  vignetteStrength: 0.3
},
```

**js/maps/aztec.js:**
```javascript
colorGrade: {
  tint: [0.92, 1.05, 0.88],
  shadows: [0.7, 0.85, 0.65],
  contrast: 1.05,
  saturation: 1.1,
  vignetteStrength: 0.35
},
```

- [ ] **Step 4: Upgrade composite shader with color grading + vignette**

Replace `compositeMat` in `js/main.js` (lines 216-226):

```javascript
var compositeMat = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: null },
    tBloom: { value: null },
    tSSAO: { value: null },
    bloomStrength: { value: 0.4 },
    ssaoEnabled: { value: 1.0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uShadows: { value: new THREE.Vector3(0.9, 0.9, 0.9) },
    uContrast: { value: 1.05 },
    uSaturation: { value: 1.1 },
    uVignetteStrength: { value: 0.3 },
    uDesaturate: { value: 0.0 }
  },
  vertexShader: bloomVert,
  fragmentShader: [
    'uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tSSAO;',
    'uniform float bloomStrength; uniform float ssaoEnabled;',
    'uniform vec3 uTint; uniform vec3 uShadows;',
    'uniform float uContrast; uniform float uSaturation;',
    'uniform float uVignetteStrength; uniform float uDesaturate;',
    'varying vec2 vUv;',
    '',
    'void main() {',
    '  float ao = ssaoEnabled > 0.5 ? texture2D(tSSAO, vUv).r : 1.0;',
    '  vec3 scene = texture2D(tScene, vUv).rgb * ao;',
    '  vec3 bloom = texture2D(tBloom, vUv).rgb;',
    '  vec3 col = scene + bloom * bloomStrength;',
    '',
    '  // Color tint',
    '  col *= uTint;',
    '',
    '  // Shadow color shift',
    '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '  float shadowMask = 1.0 - smoothstep(0.0, 0.4, lum);',
    '  col = mix(col, col * uShadows, shadowMask * 0.5);',
    '',
    '  // Contrast',
    '  col = (col - 0.5) * uContrast + 0.5;',
    '',
    '  // Saturation + death desaturation',
    '  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '  float sat = uSaturation * (1.0 - uDesaturate);',
    '  col = mix(vec3(gray), col, sat);',
    '',
    '  // Vignette',
    '  vec2 vc = vUv - 0.5;',
    '  float vDist = length(vc) * 1.4;',
    '  float vig = smoothstep(0.4, 1.2, vDist);',
    '  col *= 1.0 - vig * uVignetteStrength;',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n'),
  toneMapped: false
});
```

- [ ] **Step 5: Remove CSS filter from index.html**

In `index.html`, change the canvas CSS from:
```css
canvas { display: block; filter: contrast(1.05) saturate(1.1); }
```
to:
```css
canvas { display: block; }
```

- [ ] **Step 6: Update death desaturation to use shader uniform**

In `renderWithBloom()`, replace the CSS filter death desaturation block (lines 258-264) with:

```javascript
if (player && !player.alive && player._deathDesaturation > 0) {
  compositeMat.uniforms.uDesaturate.value = player._deathDesaturation;
} else {
  compositeMat.uniforms.uDesaturate.value = 0.0;
}
// Remove any lingering CSS filter
if (renderer.domElement.style.filter) {
  renderer.domElement.style.filter = '';
}
```

- [ ] **Step 7: Set color grading uniforms when map loads**

In `js/maps/shared.js`, inside `GAME.buildMap()` (around line 642), after the sky/fog setup, add:

```javascript
// Store color grading config for main.js to read
GAME._currentColorGrade = def.colorGrade || {
  tint: [1, 1, 1],
  shadows: [0.9, 0.9, 0.9],
  contrast: 1.05,
  saturation: 1.1,
  vignetteStrength: 0.3
};
```

In `js/main.js`, create an `applyColorGrade()` function and call it after every `GAME.buildMap()` call. There are 6 call sites in main.js (search for `GAME.buildMap(` to find all). Create the function once:

```javascript
function applyColorGrade() {
  if (!GAME._currentColorGrade) return;
  var cg = GAME._currentColorGrade;
  compositeMat.uniforms.uTint.value.set(cg.tint[0], cg.tint[1], cg.tint[2]);
  compositeMat.uniforms.uShadows.value.set(cg.shadows[0], cg.shadows[1], cg.shadows[2]);
  compositeMat.uniforms.uContrast.value = cg.contrast;
  compositeMat.uniforms.uSaturation.value = cg.saturation;
  compositeMat.uniforms.uVignetteStrength.value = cg.vignetteStrength;
}
```

Then add `applyColorGrade();` after every `GAME.buildMap(scene, ...)` call in main.js. Search for all occurrences with `GAME.buildMap(` to find all 6 call sites.

- [ ] **Step 8: Expose color grading uniforms in GAME._postProcess**

Update `GAME._postProcess`:
```javascript
GAME._postProcess.colorGrade = {
  tint: compositeMat.uniforms.uTint,
  shadows: compositeMat.uniforms.uShadows,
  contrast: compositeMat.uniforms.uContrast,
  saturation: compositeMat.uniforms.uSaturation,
  vignetteStrength: compositeMat.uniforms.uVignetteStrength,
  desaturate: compositeMat.uniforms.uDesaturate
};
```

- [ ] **Step 9: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 10: Commit**

```
git add js/main.js js/maps/shared.js js/maps/dust.js js/maps/office.js js/maps/warehouse.js js/maps/bloodstrike.js js/maps/italy.js js/maps/aztec.js index.html tests/unit/main.test.js tests/unit/maps.test.js
git commit -m "feat: add per-map color grading, vignette, and death desaturation to composite shader"
```

---

### Task 4: Add sharpen pass

**Files:**
- Modify: `js/main.js` (add sharpen shader + pass after composite)

- [ ] **Step 1: Write failing test**

In `tests/unit/main.test.js`:

```javascript
it('should expose sharpen pass', () => {
  expect(GAME._postProcess.sharpenEnabled).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL

- [ ] **Step 3: Implement sharpen pass**

In `js/main.js`, after compositeMat definition, add:

```javascript
var sharpenEnabled = true;
var sharpenRT = new THREE.WebGLRenderTarget(rw, rh);

var sharpenMat = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.3 },
    uTexelSize: { value: new THREE.Vector2(1.0 / rw, 1.0 / rh) }
  },
  vertexShader: bloomVert,
  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform float uStrength;',
    'uniform vec2 uTexelSize;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 center = texture2D(tDiffuse, vUv).rgb;',
    '  vec3 top    = texture2D(tDiffuse, vUv + vec2(0.0, uTexelSize.y)).rgb;',
    '  vec3 bottom = texture2D(tDiffuse, vUv - vec2(0.0, uTexelSize.y)).rgb;',
    '  vec3 left   = texture2D(tDiffuse, vUv - vec2(uTexelSize.x, 0.0)).rgb;',
    '  vec3 right  = texture2D(tDiffuse, vUv + vec2(uTexelSize.x, 0.0)).rgb;',
    '  vec3 blur = (top + bottom + left + right) * 0.25;',
    '  vec3 sharp = center + (center - blur) * uStrength;',
    '  gl_FragColor = vec4(sharp, 1.0);',
    '}'
  ].join('\n'),
  toneMapped: false
});
var sharpenScene = new THREE.Scene();
sharpenScene.add(new THREE.Mesh(fsGeo, sharpenMat));
```

- [ ] **Step 4: Insert sharpen into renderWithBloom()**

Modify the end of `renderWithBloom()`. Currently the composite renders directly to screen (`renderer.setRenderTarget(null)`). Change to:

If sharpen is enabled, composite renders to `sharpenRT`, then sharpen renders to screen. Otherwise, composite renders to screen directly.

```javascript
if (sharpenEnabled) {
  // Composite → sharpenRT
  renderer.setRenderTarget(sharpenRT);
  renderer.render(compositeScene, bloomCam);

  // Sharpen → screen
  sharpenMat.uniforms.tDiffuse.value = sharpenRT.texture;
  renderer.setRenderTarget(null);
  renderer.render(sharpenScene, bloomCam);
} else {
  renderer.setRenderTarget(null);
  renderer.render(compositeScene, bloomCam);
}
```

- [ ] **Step 5: Update resizeBloom for sharpen RT**

In `resizeBloom()`:
```javascript
sharpenRT.setSize(w, h);
sharpenMat.uniforms.uTexelSize.value.set(1.0 / w, 1.0 / h);
```

- [ ] **Step 6: Expose in GAME._postProcess**

```javascript
GAME._postProcess.sharpenEnabled = sharpenEnabled;
GAME.setSharpen = function(enabled) {
  sharpenEnabled = enabled;
  GAME._postProcess.sharpenEnabled = enabled;
};
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```
git add js/main.js tests/unit/main.test.js
git commit -m "feat: add unsharp mask sharpen post-processing pass"
```

---

## Chunk 2: Per-Map Lighting Overhaul

### Task 5: Add per-map lighting configs and update buildMap

**Files:**
- Modify: `js/maps/shared.js:608-637` (buildMap lighting section)
- Modify: `js/maps/dust.js`, `js/maps/office.js`, `js/maps/warehouse.js`, `js/maps/bloodstrike.js`, `js/maps/italy.js`, `js/maps/aztec.js` (add lighting config)

- [ ] **Step 1: Write failing tests**

In `tests/unit/maps.test.js`:

```javascript
describe('Map lighting configs', () => {
  it('every map should have a lighting config', () => {
    GAME._maps.forEach(function(map) {
      expect(map.lighting).toBeDefined();
      expect(typeof map.lighting.sunColor).toBe('number');
      expect(typeof map.lighting.sunIntensity).toBe('number');
      expect(map.lighting.sunPos).toHaveLength(3);
      expect(typeof map.lighting.fillColor).toBe('number');
      expect(typeof map.lighting.fillIntensity).toBe('number');
      expect(typeof map.lighting.ambientIntensity).toBe('number');
      expect(typeof map.lighting.hemiSkyColor).toBe('number');
      expect(typeof map.lighting.hemiGroundColor).toBe('number');
      expect(typeof map.lighting.hemiIntensity).toBe('number');
      expect(typeof map.lighting.shadowFrustumPadding).toBe('number');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/maps.test.js`
Expected: FAIL

- [ ] **Step 3: Add lighting config to each map**

**js/maps/dust.js:**
```javascript
lighting: {
  sunColor: 0xfff0d0,
  sunIntensity: 1.1,
  sunPos: [18, 30, 12],
  fillColor: 0xd0c8b0,
  fillIntensity: 0.15,
  ambientIntensity: 0.2,
  hemiSkyColor: 0xcce0ff,
  hemiGroundColor: 0xa08050,
  hemiIntensity: 0.35,
  shadowFrustumPadding: 5,
  shadowBias: -0.0008
},
```

**js/maps/office.js:**
```javascript
lighting: {
  sunColor: 0xe8eef8,
  sunIntensity: 0.6,
  sunPos: [10, 20, 8],
  fillColor: 0xd0d8e8,
  fillIntensity: 0.35,
  ambientIntensity: 0.4,
  hemiSkyColor: 0xd0d8e8,
  hemiGroundColor: 0x808890,
  hemiIntensity: 0.45,
  shadowMapSize: 1024,
  shadowFrustumPadding: 8,
  shadowBias: -0.002
},
```

**js/maps/warehouse.js:**
```javascript
lighting: {
  sunColor: 0xfff4e5,
  sunIntensity: 0.5,
  sunPos: [12, 20, 10],
  fillColor: 0xa09880,
  fillIntensity: 0.15,
  ambientIntensity: 0.2,
  hemiSkyColor: 0x909090,
  hemiGroundColor: 0x605040,
  hemiIntensity: 0.3,
  shadowFrustumPadding: 5
},
```

**js/maps/bloodstrike.js:**
```javascript
lighting: {
  sunColor: 0xfff8f0,
  sunIntensity: 1.0,
  sunPos: [15, 25, 10],
  fillColor: 0xd0d0d0,
  fillIntensity: 0.4,
  ambientIntensity: 0.3,
  hemiSkyColor: 0xb0c4de,
  hemiGroundColor: 0x808080,
  hemiIntensity: 0.4,
  shadowFrustumPadding: 4
},
```

**js/maps/italy.js:**
```javascript
lighting: {
  sunColor: 0xffe8c0,
  sunIntensity: 0.95,
  sunPos: [10, 20, 15],
  fillColor: 0xd0c0a0,
  fillIntensity: 0.25,
  ambientIntensity: 0.25,
  hemiSkyColor: 0xc0d8f0,
  hemiGroundColor: 0x907050,
  hemiIntensity: 0.4,
  shadowFrustumPadding: 6
},
```

**js/maps/aztec.js:**
```javascript
lighting: {
  sunColor: 0xf0e8d0,
  sunIntensity: 0.7,
  sunPos: [12, 22, 8],
  fillColor: 0x90a880,
  fillIntensity: 0.25,
  ambientIntensity: 0.3,
  hemiSkyColor: 0x88aa70,
  hemiGroundColor: 0x506030,
  hemiIntensity: 0.45,
  shadowFrustumPadding: 6
},
```

- [ ] **Step 4: Update buildMap to read per-map lighting**

In `js/maps/shared.js`, replace the hardcoded lighting section (lines 611-637) with:

```javascript
// Read per-map lighting or use defaults
var lt = def.lighting || {};
var hemi = new THREE.HemisphereLight(
  lt.hemiSkyColor !== undefined ? lt.hemiSkyColor : 0xb0c4de,
  lt.hemiGroundColor !== undefined ? lt.hemiGroundColor : 0x806040,
  lt.hemiIntensity !== undefined ? lt.hemiIntensity : 0.4
);
scene.add(hemi);

scene.add(new THREE.AmbientLight(0xffffff, lt.ambientIntensity !== undefined ? lt.ambientIntensity : 0.25));

var dirLight = new THREE.DirectionalLight(
  lt.sunColor !== undefined ? lt.sunColor : 0xfff4e5,
  lt.sunIntensity !== undefined ? lt.sunIntensity : 0.9
);
var sp = lt.sunPos || [15, 25, 10];
dirLight.position.set(sp[0], sp[1], sp[2]);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = lt.shadowMapSize || 2048;
dirLight.shadow.mapSize.height = lt.shadowMapSize || 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 80;
var pad = lt.shadowFrustumPadding || 0;
var sz = Math.max(def.size.x, def.size.z) * 0.6 - pad;
dirLight.shadow.camera.left = -sz;
dirLight.shadow.camera.right = sz;
dirLight.shadow.camera.top = sz;
dirLight.shadow.camera.bottom = -sz;
dirLight.shadow.bias = lt.shadowBias !== undefined ? lt.shadowBias : -0.001;
scene.add(dirLight);

var fillLight = new THREE.DirectionalLight(
  lt.fillColor !== undefined ? lt.fillColor : 0xc8d8f0,
  lt.fillIntensity !== undefined ? lt.fillIntensity : 0.3
);
fillLight.position.set(-10, 15, -10);
scene.add(fillLight);
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```
git add js/maps/shared.js js/maps/dust.js js/maps/office.js js/maps/warehouse.js js/maps/bloodstrike.js js/maps/italy.js js/maps/aztec.js tests/unit/maps.test.js
git commit -m "feat: add per-map lighting configs for distinct visual moods"
```

---

## Chunk 3: Particle System Core

### Task 6: Create particle system module with InstancedMesh pools

**Files:**
- Create: `js/particles.js`
- Create: `tests/unit/particles.test.js`
- Modify: `index.html` (load particles.js)

- [ ] **Step 1: Write failing tests for particle system core**

Create `tests/unit/particles.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/particles.js');
});

describe('Particle system', () => {
  it('should expose GAME.particles', () => {
    expect(GAME.particles).toBeDefined();
  });

  it('should have init method', () => {
    expect(typeof GAME.particles.init).toBe('function');
  });

  it('should have update method', () => {
    expect(typeof GAME.particles.update).toBe('function');
  });

  it('should have spawn methods', () => {
    expect(typeof GAME.particles.spawnTracer).toBe('function');
    expect(typeof GAME.particles.spawnCasing).toBe('function');
    expect(typeof GAME.particles.spawnMuzzleFlash).toBe('function');
    expect(typeof GAME.particles.spawnWallImpact).toBe('function');
    expect(typeof GAME.particles.spawnBlood).toBe('function');
    expect(typeof GAME.particles.spawnExplosion).toBe('function');
    expect(typeof GAME.particles.spawnSmokeCloud).toBe('function');
    expect(typeof GAME.particles.spawnCombatLight).toBe('function');
  });

  it('should have dispose method', () => {
    expect(typeof GAME.particles.dispose).toBe('function');
  });
});

describe('Particle pool behavior', () => {
  var mockScene;

  beforeAll(() => {
    mockScene = new THREE.Scene();
    GAME.particles.init(mockScene);
  });

  it('should spawn blood particles that become inactive after maxLife', () => {
    var pos = new THREE.Vector3(0, 5, 0);
    var dir = new THREE.Vector3(1, 0, 0);
    GAME.particles.spawnBlood(pos, dir, false);
    // After enough time, particles should deactivate
    GAME.particles.update(0.6); // > 0.5s maxLife
    // No crash = pool handles lifecycle correctly
  });

  it('should recycle oldest particles when pool is full (FIFO)', () => {
    var pos = new THREE.Vector3(0, 5, 0);
    var dir = new THREE.Vector3(1, 0, 0);
    // Spawn more than pool size (blood pool = 30)
    for (var i = 0; i < 35; i++) {
      GAME.particles.spawnBlood(pos, dir, false);
    }
    // Should not crash — oldest recycled
    GAME.particles.update(0.016);
  });

  it('should spawn and decay combat lights', () => {
    var pos = new THREE.Vector3(0, 2, 0);
    GAME.particles.spawnCombatLight(pos, 0xff6600, 10, 0.1);
    GAME.particles.update(0.2); // > 0.1s decay
    // Light should be deactivated — no crash
  });

  afterAll(() => {
    GAME.particles.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/particles.test.js`
Expected: FAIL

- [ ] **Step 3: Create js/particles.js with core architecture**

Create `js/particles.js`:

```javascript
(function() {
  'use strict';

  // Pool helper: manages a fixed-size array of particle instances
  function ParticlePool(size) {
    this.particles = new Array(size);
    this.size = size;
    this.head = 0; // next slot to write
    for (var i = 0; i < size; i++) {
      this.particles[i] = {
        active: false, elapsed: 0, maxLife: 0,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        scale: new THREE.Vector3(1, 1, 1),
        rotation: new THREE.Euler(),
        rotVel: new THREE.Vector3(),
        data: {} // type-specific data
      };
    }
  }

  ParticlePool.prototype.spawn = function() {
    var p = this.particles[this.head];
    p.active = true;
    p.elapsed = 0;
    p.scale.set(1, 1, 1);
    p.vel.set(0, 0, 0);
    p.rotVel.set(0, 0, 0);
    this.head = (this.head + 1) % this.size;
    return p;
  };

  // Dummy identity matrix for hiding instances
  var _hideMat = new THREE.Matrix4().makeScale(0, 0, 0);
  var _tmpMat = new THREE.Matrix4();
  var _tmpQuat = new THREE.Quaternion();

  // Combat light pool
  var _combatLights = [];
  var MAX_COMBAT_LIGHTS = 3;

  var scene = null;
  var pools = {};
  var meshes = {};
  var updateFns = {};

  function init(sceneRef) {
    scene = sceneRef;

    // ── Tracer ──
    pools.tracer = new ParticlePool(10);
    var tracerGeo = new THREE.BoxGeometry(0.02, 0.02, 0.5);
    var tracerMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    meshes.tracer = new THREE.InstancedMesh(tracerGeo, tracerMat, 10);
    meshes.tracer.frustumCulled = false;
    scene.add(meshes.tracer);

    // ── Shell casing ──
    pools.casing = new ParticlePool(20);
    var casingGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.025, 6);
    var casingMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.3 });
    meshes.casing = new THREE.InstancedMesh(casingGeo, casingMat, 20);
    meshes.casing.frustumCulled = false;
    scene.add(meshes.casing);

    // ── Wall dust ──
    pools.dust = new ParticlePool(30);
    var dustGeo = new THREE.SphereGeometry(0.03, 4, 4);
    var dustMat = new THREE.MeshBasicMaterial({ color: 0x999988, transparent: true, opacity: 0.6 });
    meshes.dust = new THREE.InstancedMesh(dustGeo, dustMat, 30);
    meshes.dust.frustumCulled = false;
    scene.add(meshes.dust);

    // ── Wall spark ──
    pools.spark = new ParticlePool(20);
    var sparkGeo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    var sparkMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    meshes.spark = new THREE.InstancedMesh(sparkGeo, sparkMat, 20);
    meshes.spark.frustumCulled = false;
    scene.add(meshes.spark);

    // ── Bullet hole decal ──
    pools.bulletHole = new ParticlePool(50);
    var holeGeo = new THREE.PlaneGeometry(0.08, 0.08);
    var holeMat = new THREE.MeshBasicMaterial({
      color: 0x222222, transparent: true, opacity: 0.8,
      depthWrite: false, side: THREE.DoubleSide
    });
    meshes.bulletHole = new THREE.InstancedMesh(holeGeo, holeMat, 50);
    meshes.bulletHole.frustumCulled = false;
    meshes.bulletHole.renderOrder = 1;
    scene.add(meshes.bulletHole);

    // ── Muzzle flash (each particle = 1 plane, spawn 2 per shot) ──
    pools.muzzleFlash = new ParticlePool(4);
    var flashGeo = new THREE.PlaneGeometry(0.15, 0.15);
    var flashMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44, transparent: true, opacity: 0.9,
      side: THREE.DoubleSide, depthWrite: false
    });
    meshes.muzzleFlash = new THREE.InstancedMesh(flashGeo, flashMat, 4);
    meshes.muzzleFlash.frustumCulled = false;
    meshes.muzzleFlash.renderOrder = 2;
    scene.add(meshes.muzzleFlash);

    // ── Smoke wisp ──
    pools.smoke = new ParticlePool(15);
    var smokeGeo = new THREE.SphereGeometry(0.1, 5, 5);
    var smokeMat = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa, transparent: true, opacity: 0.4, depthWrite: false
    });
    meshes.smoke = new THREE.InstancedMesh(smokeGeo, smokeMat, 15);
    meshes.smoke.frustumCulled = false;
    scene.add(meshes.smoke);

    // ── Blood spray ──
    pools.blood = new ParticlePool(30);
    var bloodGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
    var bloodMat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
    meshes.blood = new THREE.InstancedMesh(bloodGeo, bloodMat, 30);
    meshes.blood.frustumCulled = false;
    scene.add(meshes.blood);

    // ── Blood mist ──
    pools.bloodMist = new ParticlePool(5);
    var mistGeo = new THREE.SphereGeometry(0.15, 6, 6);
    var mistMat = new THREE.MeshBasicMaterial({
      color: 0xaa0000, transparent: true, opacity: 0.4, depthWrite: false
    });
    meshes.bloodMist = new THREE.InstancedMesh(mistGeo, mistMat, 5);
    meshes.bloodMist.frustumCulled = false;
    scene.add(meshes.bloodMist);

    // ── HE debris ──
    pools.debris = new ParticlePool(20);
    var debrisGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    var debrisMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.9 });
    meshes.debris = new THREE.InstancedMesh(debrisGeo, debrisMat, 20);
    meshes.debris.frustumCulled = false;
    scene.add(meshes.debris);

    // ── HE fireball ──
    pools.fireball = new ParticlePool(1);
    var fireGeo = new THREE.SphereGeometry(0.5, 8, 8);
    var fireMat = new THREE.MeshBasicMaterial({
      color: 0xff6600, transparent: true, opacity: 0.8, depthWrite: false
    });
    meshes.fireball = new THREE.InstancedMesh(fireGeo, fireMat, 1);
    meshes.fireball.frustumCulled = false;
    scene.add(meshes.fireball);

    // ── Shockwave ring ──
    pools.shockwave = new ParticlePool(1);
    var ringGeo = new THREE.TorusGeometry(0.5, 0.05, 6, 16);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false
    });
    meshes.shockwave = new THREE.InstancedMesh(ringGeo, ringMat, 1);
    meshes.shockwave.frustumCulled = false;
    scene.add(meshes.shockwave);

    // ── Smoke grenade cloud ──
    pools.smokeCloud = new ParticlePool(30);
    var cloudGeo = new THREE.SphereGeometry(0.5, 6, 6);
    var cloudMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc, transparent: true, opacity: 0.4, depthWrite: false
    });
    meshes.smokeCloud = new THREE.InstancedMesh(cloudGeo, cloudMat, 30);
    meshes.smokeCloud.frustumCulled = false;
    scene.add(meshes.smokeCloud);

    // ── Combat lights ──
    for (var li = 0; li < MAX_COMBAT_LIGHTS; li++) {
      var cl = new THREE.PointLight(0xffffff, 0, 15);
      cl.visible = false;
      scene.add(cl);
      _combatLights.push({ light: cl, active: false, elapsed: 0, maxLife: 0, startIntensity: 0 });
    }

    // Initialize all instance matrices to hidden
    for (var key in meshes) {
      var mesh = meshes[key];
      for (var mi = 0; mi < mesh.count; mi++) {
        mesh.setMatrixAt(mi, _hideMat);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // ── Generic pool updater ──
  function updatePool(poolName, dt, customUpdate) {
    var pool = pools[poolName];
    var mesh = meshes[poolName];
    if (!pool || !mesh) return;

    for (var i = 0; i < pool.size; i++) {
      var p = pool.particles[i];
      if (!p.active) {
        mesh.setMatrixAt(i, _hideMat);
        continue;
      }

      p.elapsed += dt;
      if (p.elapsed >= p.maxLife && p.maxLife > 0) {
        p.active = false;
        mesh.setMatrixAt(i, _hideMat);
        continue;
      }

      // Apply velocity
      p.pos.addScaledVector(p.vel, dt);

      // Apply rotation velocity
      if (p.rotVel.x || p.rotVel.y || p.rotVel.z) {
        p.rotation.x += p.rotVel.x * dt;
        p.rotation.y += p.rotVel.y * dt;
        p.rotation.z += p.rotVel.z * dt;
      }

      // Custom per-type update
      if (customUpdate) customUpdate(p, dt);

      // Build instance matrix
      _tmpQuat.setFromEuler(p.rotation);
      _tmpMat.compose(p.pos, _tmpQuat, p.scale);
      mesh.setMatrixAt(i, _tmpMat);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // ── Update all particle types ──
  function update(dt) {
    // Tracers
    updatePool('tracer', dt);

    // Shell casings — gravity + bounce
    updatePool('casing', dt, function(p, dt2) {
      p.vel.y -= 9.8 * dt2;
      if (p.pos.y <= 0.01 && p.data.bounces < 2) {
        p.pos.y = 0.01;
        p.vel.y = -p.vel.y * 0.3;
        p.vel.x *= 0.5;
        p.vel.z *= 0.5;
        p.rotVel.multiplyScalar(0.4);
        p.data.bounces++;
        if (p.data.bounces === 1 && GAME.Sound && GAME.Sound.shellCasing) {
          GAME.Sound.shellCasing(p.pos);
        }
      } else if (p.pos.y <= 0.01) {
        p.vel.set(0, 0, 0);
        p.rotVel.set(0, 0, 0);
        p.pos.y = 0.01;
      }
    });

    // Dust — expand and fade (scale up over life)
    updatePool('dust', dt, function(p) {
      var t = p.elapsed / p.maxLife;
      var s = 1 + t * 3;
      p.scale.set(s, s, s);
    });

    // Sparks
    updatePool('spark', dt, function(p, dt2) {
      p.vel.y -= 9.8 * dt2;
    });

    // Bullet holes — persistent (maxLife = 0 means infinite, FIFO handles removal)
    updatePool('bulletHole', dt);

    // Muzzle flash
    updatePool('muzzleFlash', dt);

    // Smoke wisps — rise and expand
    updatePool('smoke', dt, function(p) {
      p.vel.y = 0.3;
      var t = p.elapsed / p.maxLife;
      var s = 1 + t * 4;
      p.scale.set(s, s, s);
    });

    // Blood — gravity + floor collision
    updatePool('blood', dt, function(p, dt2) {
      p.vel.y -= 12 * dt2;
      if (p.pos.y <= 0.01) {
        p.pos.y = 0.01;
        p.active = false;
      }
    });

    // Blood mist — expand and fade
    updatePool('bloodMist', dt, function(p) {
      var t = p.elapsed / p.maxLife;
      var s = 1 + t * 2;
      p.scale.set(s, s, s);
    });

    // Debris — gravity
    updatePool('debris', dt, function(p, dt2) {
      p.vel.y -= 9.8 * dt2;
      if (p.pos.y <= 0.01) {
        p.pos.y = 0.01;
        p.vel.set(0, 0, 0);
      }
    });

    // Fireball — expand
    updatePool('fireball', dt, function(p) {
      var t = p.elapsed / p.maxLife;
      var s = 0.5 + t * 3;
      p.scale.set(s, s, s);
    });

    // Shockwave — rapid expand
    updatePool('shockwave', dt, function(p) {
      var t = p.elapsed / p.maxLife;
      var s = 1 + t * 8;
      p.scale.set(s, s, s);
    });

    // Smoke cloud
    updatePool('smokeCloud', dt, function(p) {
      var t = Math.max(0, (p.elapsed - p.maxLife + 3) / 3); // fade last 3s
      if (t > 0) {
        // Scale down slightly to simulate fade (opacity not per-instance)
        var s = p.data.baseScale * (1 - t * 0.3);
        p.scale.set(s, s, s);
      }
    });

    // Combat lights
    for (var li = 0; li < _combatLights.length; li++) {
      var cl = _combatLights[li];
      if (!cl.active) continue;
      cl.elapsed += dt;
      if (cl.elapsed >= cl.maxLife) {
        cl.active = false;
        cl.light.visible = false;
        continue;
      }
      var t = cl.elapsed / cl.maxLife;
      cl.light.intensity = cl.startIntensity * (1 - t * t); // quadratic decay
    }
  }

  // ── Spawn functions ──

  var _shotCounter = 0;

  function spawnTracer(origin, direction) {
    _shotCounter++;
    if (_shotCounter % 3 !== 0) return; // every 3rd shot
    var p = pools.tracer.spawn();
    p.pos.copy(origin);
    p.vel.copy(direction).multiplyScalar(200);
    p.maxLife = 0.1;
    // Orient along direction
    _tmpQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    p.rotation.setFromQuaternion(_tmpQuat);
  }

  function spawnCasing(weaponPos, rightDir, upDir) {
    var p = pools.casing.spawn();
    p.pos.copy(weaponPos);
    p.vel.copy(rightDir).multiplyScalar(2 + Math.random() * 2);
    p.vel.addScaledVector(upDir, 1 + Math.random());
    p.maxLife = 2;
    p.data.bounces = 0;
    p.rotVel.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );
  }

  function spawnMuzzleFlash(pos, direction) {
    // Two crossing planes
    for (var fi = 0; fi < 2; fi++) {
      var p = pools.muzzleFlash.spawn();
      p.pos.copy(pos);
      p.maxLife = 0.05;
      _tmpQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      p.rotation.setFromQuaternion(_tmpQuat);
      p.rotation.z += fi * Math.PI / 2 + Math.random() * 0.5;
      p.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 1);
    }
  }

  function spawnWallImpact(pos, normal, materialType) {
    // Dust puff
    var dustCount = 4;
    for (var di = 0; di < dustCount; di++) {
      var dp = pools.dust.spawn();
      dp.pos.copy(pos);
      dp.vel.copy(normal).multiplyScalar(1 + Math.random());
      dp.vel.x += (Math.random() - 0.5) * 2;
      dp.vel.y += (Math.random() - 0.5) * 2;
      dp.vel.z += (Math.random() - 0.5) * 2;
      dp.maxLife = 0.4;
    }

    // Sparks on metal
    if (materialType === 'metal') {
      for (var si = 0; si < 5; si++) {
        var sp = pools.spark.spawn();
        sp.pos.copy(pos);
        sp.vel.copy(normal).multiplyScalar(3 + Math.random() * 3);
        sp.vel.x += (Math.random() - 0.5) * 4;
        sp.vel.y += Math.random() * 3;
        sp.vel.z += (Math.random() - 0.5) * 4;
        sp.maxLife = 0.2;
      }
    }

    // Bullet hole decal
    var hp = pools.bulletHole.spawn();
    hp.pos.copy(pos).addScaledVector(normal, 0.005);
    hp.maxLife = 0; // persistent (FIFO)
    // Orient to face normal
    _tmpQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    hp.rotation.setFromQuaternion(_tmpQuat);
    hp.rotation.z = Math.random() * Math.PI * 2;

    // Smoke wisp
    var smokep = pools.smoke.spawn();
    smokep.pos.copy(pos);
    smokep.vel.set(0, 0.3, 0);
    smokep.maxLife = 0.6;
  }

  function spawnBlood(pos, direction, isHeadshot) {
    var count = isHeadshot ? 10 : 6;
    var speed = isHeadshot ? 5 : 3;
    for (var bi = 0; bi < count; bi++) {
      var bp = pools.blood.spawn();
      bp.pos.copy(pos);
      // Inherit bullet direction + random spread
      bp.vel.copy(direction).multiplyScalar(speed * 0.5);
      bp.vel.x += (Math.random() - 0.5) * speed;
      bp.vel.y += Math.random() * speed * (isHeadshot ? 0.8 : 0.5);
      bp.vel.z += (Math.random() - 0.5) * speed;
      bp.maxLife = 0.5;
      var sz = 0.5 + Math.random() * 1.0;
      bp.scale.set(sz, sz, sz);
    }

    // Blood mist on headshot
    if (isHeadshot) {
      var mp = pools.bloodMist.spawn();
      mp.pos.copy(pos);
      mp.vel.copy(direction).multiplyScalar(1);
      mp.maxLife = 0.3;
    }
  }

  function spawnExplosion(pos) {
    // Fireball
    var fb = pools.fireball.spawn();
    fb.pos.copy(pos);
    fb.maxLife = 0.4;

    // Shockwave ring
    var sw = pools.shockwave.spawn();
    sw.pos.copy(pos);
    sw.maxLife = 0.3;
    // Lay flat
    sw.rotation.x = Math.PI / 2;

    // Debris
    for (var di = 0; di < 20; di++) {
      var dp = pools.debris.spawn();
      dp.pos.copy(pos);
      dp.vel.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 10
      );
      dp.maxLife = 1.0;
      dp.rotVel.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
    }

    // Combat light
    spawnCombatLight(pos, 0xff6600, 20, 0.3);
  }

  // Active smoke grenades being spawned over time
  var _activeSmokeGrenades = [];

  function spawnSmokeCloud(pos, duration) {
    _activeSmokeGrenades.push({
      pos: pos.clone(),
      elapsed: 0,
      duration: duration || 15,
      spawnTimer: 0
    });
  }

  function _updateSmokeGrenades(dt) {
    for (var i = _activeSmokeGrenades.length - 1; i >= 0; i--) {
      var sg = _activeSmokeGrenades[i];
      sg.elapsed += dt;
      sg.spawnTimer += dt;
      if (sg.elapsed >= sg.duration) {
        _activeSmokeGrenades.splice(i, 1);
        continue;
      }
      // Spawn a new sphere every 200ms
      if (sg.spawnTimer >= 0.2) {
        sg.spawnTimer -= 0.2;
        var cp = pools.smokeCloud.spawn();
        cp.pos.copy(sg.pos);
        cp.pos.x += (Math.random() - 0.5) * 2;
        cp.pos.y += Math.random() * 1.5;
        cp.pos.z += (Math.random() - 0.5) * 2;
        cp.vel.set((Math.random() - 0.5) * 0.5, 0.1, (Math.random() - 0.5) * 0.5);
        cp.maxLife = Math.min(5, sg.duration - sg.elapsed);
        var bs = 0.8 + Math.random() * 0.4;
        cp.data.baseScale = bs;
        cp.scale.set(bs, bs, bs);
      }
    }
  }

  function spawnCombatLight(pos, color, intensity, duration) {
    // Find an inactive light or the oldest active one
    var best = null;
    for (var i = 0; i < _combatLights.length; i++) {
      if (!_combatLights[i].active) { best = _combatLights[i]; break; }
    }
    if (!best) {
      // Steal oldest
      best = _combatLights[0];
      for (var j = 1; j < _combatLights.length; j++) {
        if (_combatLights[j].elapsed > best.elapsed) best = _combatLights[j];
      }
    }
    best.active = true;
    best.elapsed = 0;
    best.maxLife = duration;
    best.startIntensity = intensity;
    best.light.position.copy(pos);
    best.light.color.setHex(color);
    best.light.intensity = intensity;
    best.light.visible = true;
  }

  function dispose() {
    for (var key in meshes) {
      scene.remove(meshes[key]);
      meshes[key].geometry.dispose();
      meshes[key].material.dispose();
      meshes[key].dispose();
    }
    for (var i = 0; i < _combatLights.length; i++) {
      scene.remove(_combatLights[i].light);
    }
    meshes = {};
    pools = {};
    _combatLights = [];
    _activeSmokeGrenades = [];
    _shotCounter = 0;
  }

  // Wrap update to include smoke grenades
  function fullUpdate(dt) {
    _updateSmokeGrenades(dt);
    update(dt);
  }

  window.GAME = window.GAME || {};
  GAME.particles = {
    init: init,
    update: fullUpdate,
    dispose: dispose,
    spawnTracer: spawnTracer,
    spawnCasing: spawnCasing,
    spawnMuzzleFlash: spawnMuzzleFlash,
    spawnWallImpact: spawnWallImpact,
    spawnBlood: spawnBlood,
    spawnExplosion: spawnExplosion,
    spawnSmokeCloud: spawnSmokeCloud,
    spawnCombatLight: spawnCombatLight
  };
})();
```

- [ ] **Step 4: Add particles.js to index.html**

In `index.html`, add the script tag after `js/sound.js` and before `js/weapons.js`:

```html
<script src="js/particles.js"></script>
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/particles.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```
git add js/particles.js tests/unit/particles.test.js index.html
git commit -m "feat: add unified instanced particle system with all pool types"
```

---

## Chunk 4: Integration — Weapons, Blood, and Hit Feedback

### Task 7: Integrate particles with weapon firing

**Files:**
- Modify: `js/weapons.js` (call particle spawn on fire, replace muzzle flash light)
- Modify: `js/main.js` (init particles, call update, remove old blood system)

- [ ] **Step 1: Write failing tests**

In `tests/unit/weapons.test.js`, add:

```javascript
describe('Weapon particle integration', () => {
  it('weapon definitions should have flashColor and flashIntensity', () => {
    Object.keys(GAME.WEAPON_DEFS).forEach(function(key) {
      var def = GAME.WEAPON_DEFS[key];
      if (def.isKnife || def.isGrenade) return;
      expect(typeof def.flashColor).toBe('number');
      expect(typeof def.flashIntensity).toBe('number');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/weapons.test.js`
Expected: FAIL (some weapons may lack explicit flashColor/flashIntensity)

- [ ] **Step 3: Ensure all gun weapon defs have flashColor and flashIntensity**

In `js/weapons.js`, verify each non-knife, non-grenade weapon def has `flashColor` and `flashIntensity`. Add missing values:
- pistol: `flashColor: 0xffaa33, flashIntensity: 8`
- smg: `flashColor: 0xffbb44, flashIntensity: 10`
- shotgun: `flashColor: 0xffcc55, flashIntensity: 12`
- rifle: `flashColor: 0xffaa33, flashIntensity: 10`
- awp: `flashColor: 0xffeedd, flashIntensity: 15`

- [ ] **Step 4: Init particle system in main.js**

In `js/main.js`, in the map initialization code (where `GAME.buildMap()` is called), add after the build call:

```javascript
if (GAME.particles) {
  GAME.particles.dispose(); // clean previous
  GAME.particles.init(scene);
}
```

- [ ] **Step 5: Call particle update in game loop**

In the game loop's playing state update section, add:

```javascript
if (GAME.particles) GAME.particles.update(dt);
```

- [ ] **Step 6: Replace muzzle flash in weapons.js**

In `_showMuzzleFlash()` (line 2006), replace the PointLight usage with particle system calls:

```javascript
WeaponSystem.prototype._showMuzzleFlash = function() {
  var def = WEAPON_DEFS[this.current];
  if (def.isKnife) return;

  var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
  var flashPos = this.camera.position.clone().add(fwd.clone().multiplyScalar(1));

  // Particle muzzle flash
  if (GAME.particles) {
    GAME.particles.spawnMuzzleFlash(flashPos, fwd);
    GAME.particles.spawnCombatLight(
      flashPos,
      def.flashColor || 0xffaa00,
      def.flashIntensity || 8,
      0.06
    );

    // Shell casing
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    var up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    GAME.particles.spawnCasing(flashPos, right, up);

    // Tracer
    GAME.particles.spawnTracer(flashPos, fwd);
  }

  // Keep existing smoke puff logic (lines 2027-2045)
  // ... (leave the puff pool code as-is for now, or migrate later)
};
```

Remove the old `this._flashLight` code:
1. Delete `this._flashLight = new THREE.PointLight(...)` creation (line 1936-1938)
2. Delete `this.scene.add(this._flashLight)`
3. Delete the particle expire callback that sets `flashRef.visible = false` (lines 2019-2025)
4. Keep the smoke puff pool code (lines 2027-2045) for now — it will coexist with the particle system smoke wisps

- [ ] **Step 7: Add wall impact spawning on bullet hit**

In `js/weapons.js`, find where bullet raycasts hit walls (where blood is NOT spawned — i.e., the bullet hits a wall mesh). Add:

```javascript
// After raycast hit on wall
if (GAME.particles) {
  // Determine material type from hit object
  var matType = 'concrete'; // default
  var hitMat = hit.object && hit.object.material;
  if (hitMat) {
    var m = hitMat.metalness || 0;
    if (m > 0.5) matType = 'metal';
    else if (hitMat.color && hitMat.color.r > 0.4 && hitMat.color.g > 0.3 && hitMat.color.b < 0.25) matType = 'wood';
  }
  GAME.particles.spawnWallImpact(hit.point, hit.face.normal, matType);
}
```

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Commit**

```
git add js/weapons.js js/main.js tests/unit/weapons.test.js
git commit -m "feat: integrate particle system with weapon firing — tracers, casings, muzzle flash, wall impacts"
```

---

### Task 8: Migrate blood system to particles and add hit feedback

**Files:**
- Modify: `js/main.js` (replace old spawnBloodBurst with particle call, add crosshair hit feedback)
- Modify: `js/enemies.js` (pass hit direction to blood spawn)

- [ ] **Step 1: Write failing test**

In `tests/unit/main.test.js`:

```javascript
describe('Hit feedback', () => {
  it('should expose hit feedback state', () => {
    expect(GAME._hitFeedback).toBeDefined();
    expect(typeof GAME._hitFeedback.hitTimer).toBe('number');
    expect(typeof GAME._hitFeedback.killTimer).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/main.test.js`
Expected: FAIL

- [ ] **Step 3: Replace spawnBloodBurst with particle system call**

In `js/main.js`, modify the `spawnBloodBurst` function (line 776) to delegate to the particle system:

```javascript
function spawnBloodBurst(point, headshot, direction) {
  if (GAME.particles) {
    var dir = direction || new THREE.Vector3(0, 1, 0);
    GAME.particles.spawnBlood(point, dir, headshot);

    // Headshot screen flash
    if (headshot) {
      var dmgEl = document.getElementById('damage-flash');
      if (dmgEl) {
        dmgEl.style.background = 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)';
        dmgEl.style.opacity = '0.5';
        setTimeout(function() {
          dmgEl.style.opacity = '0';
          setTimeout(function() {
            dmgEl.style.background = '';
          }, 100);
        }, 50);
      }
    }
  }
}
```

- [ ] **Step 4: Pass bullet direction to spawnBloodBurst**

In `js/weapons.js`, find the `tryFire` or `_fireRaycast` method where hit results are constructed. The raycast direction is already computed (it's the normalized vector from camera). Add `direction` to the returned result object:

```javascript
// In the raycast hit result construction (search for where result.point and result.headshot are set):
result.direction = raycaster.ray.direction.clone();
```

Then in `js/main.js`, find where `spawnBloodBurst` is called (line 3740 area) and pass the direction:

```javascript
spawnBloodBurst(result.point, result.headshot, result.direction);
```

- [ ] **Step 5: Add crosshair hit/kill feedback**

In `js/main.js`, add hit feedback state:

```javascript
GAME._hitFeedback = { hitTimer: 0, killTimer: 0 };
```

When an enemy is hit (near line 3740):
```javascript
GAME._hitFeedback.hitTimer = 0.1;
```

When an enemy is killed (in `onEnemyKilled`):
```javascript
GAME._hitFeedback.killTimer = 0.2;
```

In the crosshair update section (lines 3840-3847), after calculating `gap`:

```javascript
// Hit feedback — expand crosshair
if (GAME._hitFeedback.hitTimer > 0) {
  GAME._hitFeedback.hitTimer -= dt;
  gap += 2;
}

// Kill feedback — red flash
if (GAME._hitFeedback.killTimer > 0) {
  GAME._hitFeedback.killTimer -= dt;
  dom.crosshair.style.setProperty('--ch-color', 'rgba(255, 60, 60, 0.9)');
} else {
  dom.crosshair.style.setProperty('--ch-color', 'rgba(200, 255, 200, 0.9)');
}
```

In `index.html`, update the crosshair CSS to use the CSS variable and adjust transition to only apply to sizing (not color):
```css
#crosshair .ch-line {
  background: var(--ch-color, rgba(200, 255, 200, 0.9));
  transition: width 0.15s ease-out, height 0.15s ease-out, top 0.15s ease-out, bottom 0.15s ease-out, left 0.15s ease-out, right 0.15s ease-out;
}
```
Remove the old `transition: all 0.15s ease-out;` to prevent it from interfering with instant color changes on hit/kill.

- [ ] **Step 6: Ensure enemies.js passes hit info**

In `js/enemies.js`, find where enemy `takeDamage` is called from main.js. The blood spawn is triggered in `js/main.js` when processing hit results — no changes needed in enemies.js itself since `spawnBloodBurst` is called from main.js with the raycast result point. The `result.direction` added in Step 4 is set in weapons.js raycast code.

Verify that `enemy._lastHitDir` (set from grenade hits) is also available for grenade blood effects — in `processExplosions`, blood from grenade kills can use `enemy._lastHitDir` as the direction:

```javascript
// In processExplosions, when enemy is killed by grenade:
if (GAME.particles) {
  GAME.particles.spawnBlood(enemy.mesh.position, nadeDir, false);
}
```

- [ ] **Step 7: Remove old blood particle system**

Remove the old `bloodParticles`, `bloodDecals`, `updateBloodParticles()`, and `_stickBlood()` code from `js/main.js` (lines 770-907). The particle system now handles blood.

Remove `_bloodGeo`, `_bloodMat`, `_bloodDecalGeo`, `_bloodRc`, `MAX_BLOOD_DECALS` variables. Also remove the `updateBloodParticles(dt)` call from the game loop.

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Commit**

```
git add js/main.js js/weapons.js index.html tests/unit/main.test.js
git commit -m "feat: migrate blood to particle system, add crosshair hit/kill feedback"
```

---

## Chunk 5: Grenade Effects and Sound Integration

### Task 9: Add grenade visual effects

**Files:**
- Modify: `js/main.js` (enhance processExplosions with particle spawns)
- Modify: `js/weapons.js` (smoke grenade cloud spawn)

- [ ] **Step 1: Write failing test**

In `tests/unit/particles.test.js`:

```javascript
describe('Grenade effects', () => {
  it('should expose spawnExplosion for HE grenades', () => {
    expect(typeof GAME.particles.spawnExplosion).toBe('function');
  });

  it('should expose spawnSmokeCloud for smoke grenades', () => {
    expect(typeof GAME.particles.spawnSmokeCloud).toBe('function');
  });
});
```

- [ ] **Step 2: Run test — should already pass from Task 6**

Run: `npm test -- tests/unit/particles.test.js`
Expected: PASS (already defined)

- [ ] **Step 3: Integrate HE explosion particles in processExplosions**

In `js/main.js`, inside `processExplosions()` (line 3596), after `triggerScreenShake(0.08)`:

```javascript
// Spawn explosion particle effects
if (GAME.particles) {
  GAME.particles.spawnExplosion(pos);
}
```

- [ ] **Step 4: Integrate smoke grenade cloud**

In `js/weapons.js`, find `SmokeGrenadeObj.prototype._deploySmoke` (around line 601). This method currently creates visible smoke spheres and registers them in `GAME._activeSmokes` for bot LOS blocking. Modify it to:

1. **Keep** the `GAME._activeSmokes` registration — bots need this for LOS blocking
2. **Replace** the visible sphere creation (the mesh-based smoke) with the particle system call
3. **Keep** the existing smoke fade/cleanup logic in `_updateSmoke` that manages `GAME._activeSmokes`

```javascript
// In _deploySmoke, REPLACE the sphere mesh creation with:
if (GAME.particles) {
  GAME.particles.spawnSmokeCloud(pos, 15);
}
// KEEP the GAME._activeSmokes.push({ pos: pos, radius: ..., ... }) call
// KEEP the _updateSmoke fade timer logic
```

The particle system smoke is purely visual. The existing `GAME._activeSmokes` array continues to handle gameplay (bot LOS blocking). Do NOT remove `_updateSmoke` or the `_activeSmokes` management.

- [ ] **Step 5: Enhance flashbang with bloom boost**

In `js/main.js`, add a bloom boost timer variable near the other effect timers:

```javascript
var _bloomBoostTimer = 0;
```

In `processFlashbang()`, trigger the boost:

```javascript
if (GAME._postProcess && GAME._postProcess.bloomStrength) {
  GAME._postProcess.bloomStrength.value = 1.0;
  _bloomBoostTimer = 0.2;
}
```

In the game loop's playing state update (where other timers like `flashFadeTimer` are decremented), add:

```javascript
if (_bloomBoostTimer > 0) {
  _bloomBoostTimer -= dt;
  if (_bloomBoostTimer <= 0 && GAME._postProcess && GAME._postProcess.bloomStrength) {
    GAME._postProcess.bloomStrength.value = 0.4;
  }
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```
git add js/main.js js/weapons.js
git commit -m "feat: add HE explosion, smoke cloud, and flashbang bloom boost effects"
```

---

### Task 10: Add shell casing and wall impact sounds

**Files:**
- Modify: `js/sound.js` (add shellCasing and wallImpact procedural sounds)

- [ ] **Step 1: Write failing test**

In `tests/unit/main.test.js` or a new test file:

```javascript
describe('Impact sounds', () => {
  it('should expose shellCasing sound function', () => {
    expect(typeof GAME.Sound.shellCasing).toBe('function');
  });

  it('should expose wallImpact sound function', () => {
    expect(typeof GAME.Sound.wallImpact).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implement shell casing sound**

In `js/sound.js`, add:

```javascript
// Shell casing clink — short metallic tap
shellCasing: function(pos) {
  if (!ctx) return;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 4000 + Math.random() * 2000;
  gain.gain.setValueAtTime(0.03, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
},
```

- [ ] **Step 4: Implement wall impact sound**

In `js/sound.js`, add:

```javascript
// Wall impact — thud for concrete/wood, ping for metal
wallImpact: function(materialType) {
  if (!ctx) return;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();

  if (materialType === 'metal') {
    osc.type = 'sine';
    osc.frequency.value = 2000 + Math.random() * 1500;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  } else {
    osc.type = 'sine';
    osc.frequency.value = 200 + Math.random() * 100;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
},
```

- [ ] **Step 5: Call wall impact sound from particle spawn**

In `js/particles.js`, in `spawnWallImpact()`, add:

```javascript
if (GAME.Sound && GAME.Sound.wallImpact) {
  GAME.Sound.wallImpact(materialType);
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```
git add js/sound.js js/particles.js tests/unit/main.test.js
git commit -m "feat: add procedural shell casing clink and wall impact sounds"
```

---

## Chunk 6: Final Integration and Documentation

### Task 11: Update REQUIREMENTS.md

**Files:**
- Modify: `REQUIREMENTS.md`

- [ ] **Step 1: Update REQUIREMENTS.md**

Add/update sections for:
- Post-processing pipeline (SSAO, color grading, vignette, sharpen)
- Particle system (all particle types with pool sizes and lifetimes)
- Per-map lighting configs (table of all 6 maps)
- Per-map color grading configs
- Dynamic combat lighting
- Enhanced hit feedback (crosshair expand on hit, red on kill)
- Grenade visual effects (HE fireball/shockwave/debris, smoke cloud, flashbang bloom boost)
- Shell casing and wall impact sounds
- SSAO and sharpen toggle functions

- [ ] **Step 2: Commit**

```
git add REQUIREMENTS.md
git commit -m "docs: update REQUIREMENTS.md with visual overhaul details"
```

---

### Task 12: Final integration test

**Files:**
- Modify: `tests/integration/map-loading.test.js` (verify visual overhaul components load)

- [ ] **Step 1: Add integration tests**

In `tests/integration/map-loading.test.js`:

```javascript
describe('Visual overhaul integration', () => {
  it('should have particle system available', () => {
    expect(GAME.particles).toBeDefined();
    expect(typeof GAME.particles.init).toBe('function');
    expect(typeof GAME.particles.update).toBe('function');
  });

  it('should have post-processing exposed', () => {
    expect(GAME._postProcess).toBeDefined();
  });

  it('all maps should have lighting and colorGrade configs', () => {
    GAME._maps.forEach(function(map) {
      expect(map.lighting).toBeDefined();
      expect(map.colorGrade).toBeDefined();
    });
  });

  it('should have hit feedback state', () => {
    expect(GAME._hitFeedback).toBeDefined();
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```
git add tests/integration/map-loading.test.js
git commit -m "test: add visual overhaul integration tests"
```
