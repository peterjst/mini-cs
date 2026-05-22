// js/core/renderer.js — Three.js setup, post-processing (bloom, sharpen, SSAO)
// Exposes: GAME._renderer, GAME.camera, GAME.scene, GAME.renderFrame,
//          GAME.resizeBloom, GAME.applyColorGrade, GAME._warmUpShaders,
//          GAME._postProcess, GAME.setSharpen, GAME.setSSAO, GAME._contextLost

(function() {
  'use strict';

  // ── Three.js Setup ───────────────────────────────────────
  var renderer = new THREE.WebGLRenderer({ antialias: !GAME.isMobile, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Detect ANGLE backend (Chrome/Edge on Windows use ANGLE to translate
  // WebGL -> D3D11). ANGLE adds significant per-pixel and per-shader cost vs
  // native GL on Mac (Metal) or Android (GLES). Cap DPR more aggressively on
  // ANGLE so Ultra/High don't oversample on integrated Windows GPUs.
  var _isAngle = false;
  try {
    var _gl = renderer.getContext && renderer.getContext();
    var _dbg = _gl && _gl.getExtension && _gl.getExtension('WEBGL_debug_renderer_info');
    if (_dbg) {
      var _rs = _gl.getParameter(_dbg.UNMASKED_RENDERER_WEBGL) || '';
      _isAngle = /ANGLE/i.test(_rs);
    }
  } catch (e) { /* extension unavailable — assume not ANGLE */ }
  GAME._isAngle = _isAngle;
  var DPR_MAX = _isAngle ? 1.5 : 2;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_MAX));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.prepend(renderer.domElement);

  // [QDIAG] Wrap render() to accumulate per-frame stats. Three.js zeros
  // info.render at the start of every render() call (when autoReset=true)
  // and even disabling autoReset proved unreliable across r160's render
  // path. The wrap snapshots info.render.calls/triangles AFTER each pass
  // and sums them into GAME._qdiagStats, which renderWithBloom resets at
  // frame start. Quality.js reads the accumulated total.
  GAME._qdiagStats = { calls: 0, triangles: 0, points: 0, lines: 0 };
  if (renderer.render) {
    var _origRender = renderer.render.bind(renderer);
    renderer.render = function(scene, camera) {
      _origRender(scene, camera);
      if (renderer.info && renderer.info.render) {
        GAME._qdiagStats.calls += renderer.info.render.calls;
        GAME._qdiagStats.triangles += renderer.info.render.triangles;
        GAME._qdiagStats.points += renderer.info.render.points;
        GAME._qdiagStats.lines += renderer.info.render.lines;
      }
    };
  }

  // ── WebGL Context Loss Recovery ─────────────────────────────
  var _contextLost = false;
  renderer.domElement.addEventListener('webglcontextlost', function(e) {
    e.preventDefault();
    _contextLost = true;
    console.warn('[mini-cs] WebGL context lost — pausing render');
  });
  renderer.domElement.addEventListener('webglcontextrestored', function() {
    _contextLost = false;
    _postFxWarmed = false;
    console.log('[mini-cs] WebGL context restored — resuming');
    // Re-apply quality settings (forces shadow map + render target rebuild)
    if (GAME.quality) {
      GAME.quality.reapply();
    }
    resizeBloom();
  });

  var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  var scene = new THREE.Scene();

  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeBloom();
  });

  // ── Post-Processing Bloom ─────────────────────────────────
  var bloomVert = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';

  var pr = Math.min(window.devicePixelRatio, DPR_MAX);
  var rw = Math.floor(window.innerWidth * pr);
  var rh = Math.floor(window.innerHeight * pr);
  var hw = Math.floor(rw / 2), hh = Math.floor(rh / 2);

  var sceneRT  = new THREE.WebGLRenderTarget(rw, rh, {
    depthTexture: new THREE.DepthTexture(rw, rh, THREE.UnsignedInt248Type)
  });
  var brightRT = new THREE.WebGLRenderTarget(hw, hh);
  var blurHRT  = new THREE.WebGLRenderTarget(hw, hh);
  var blurVRT  = new THREE.WebGLRenderTarget(hw, hh);

  var bloomCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var fsGeo = new THREE.PlaneGeometry(2, 2);

  // Bright-pass: extract pixels above luminance threshold
  var brightPassMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, threshold: { value: 0.75 }, softKnee: { value: 0.5 } },
    vertexShader: bloomVert,
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float threshold; uniform float softKnee; varying vec2 vUv;',
      'void main(){',
      '  vec4 c=texture2D(tDiffuse,vUv);',
      '  float br=dot(c.rgb,vec3(0.2126,0.7152,0.0722));',
      '  float knee=threshold*softKnee;',
      '  float s=br-threshold+knee;',
      '  s=clamp(s,0.0,2.0*knee);',
      '  s=s*s/(4.0*knee+0.00001);',
      '  float w=max(s,br-threshold)/max(br,0.00001);',
      '  gl_FragColor=vec4(c.rgb*clamp(w,0.0,1.0),1.0);',
      '}'
    ].join('\n'),
    toneMapped: false
  });

  // Gaussian blur (9-tap separable)
  var blurFrag = [
    'uniform sampler2D tDiffuse; uniform vec2 direction; varying vec2 vUv;',
    'void main(){',
    '  vec4 s=vec4(0.0);',
    '  s+=texture2D(tDiffuse,vUv)*0.227027;',
    '  for(int i=1;i<5;i++){',
    '    vec2 o=direction*float(i);',
    '    float w=i==1?0.1945946:i==2?0.1216216:i==3?0.054054:0.016216;',
    '    s+=texture2D(tDiffuse,vUv+o)*w;',
    '    s+=texture2D(tDiffuse,vUv-o)*w;',
    '  }',
    '  gl_FragColor=s;',
    '}'
  ].join('\n');

  var blurHMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2(1.0 / hw, 0) } },
    vertexShader: bloomVert, fragmentShader: blurFrag, toneMapped: false
  });
  var blurVMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, direction: { value: new THREE.Vector2(0, 1.0 / hh) } },
    vertexShader: bloomVert, fragmentShader: blurFrag, toneMapped: false
  });

  // Composite: blend scene + bloom + SSAO + color grading + vignette
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

  // Mini-scenes for each pass
  var brightScene = new THREE.Scene(); brightScene.add(new THREE.Mesh(fsGeo, brightPassMat));
  var blurHScene  = new THREE.Scene(); blurHScene.add(new THREE.Mesh(fsGeo, blurHMat));
  var blurVScene  = new THREE.Scene(); blurVScene.add(new THREE.Mesh(fsGeo, blurVMat));
  var compositeScene = new THREE.Scene(); compositeScene.add(new THREE.Mesh(fsGeo, compositeMat));

  // ── Sharpen Pass (unsharp mask) ────────────────────────
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

  // ── SSAO Pass ───────────────────────────────────────────
  var ssaoRT = new THREE.WebGLRenderTarget(hw, hh);
  var ssaoEnabled = false;

  var ssaoKernel = [];
  for (var ki = 0; ki < 8; ki++) {
    var sample = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random()
    ).normalize();
    sample.multiplyScalar(Math.random());
    var scale = ki / 8;
    scale = 0.1 + scale * scale * 0.9;
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

  // SSAO bilateral blur (separable, 5-tap)
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

  // ── Post-process config ─────────────────────────────────
  GAME._postProcess = {
    sceneRT: sceneRT,
    ssaoRT: ssaoRT,
    ssaoEnabled: ssaoEnabled,
    bloomStrength: compositeMat.uniforms.bloomStrength,
    sharpenEnabled: sharpenEnabled,
    colorGrade: {
      tint: compositeMat.uniforms.uTint,
      shadows: compositeMat.uniforms.uShadows,
      contrast: compositeMat.uniforms.uContrast,
      saturation: compositeMat.uniforms.uSaturation,
      vignetteStrength: compositeMat.uniforms.uVignetteStrength,
      desaturate: compositeMat.uniforms.uDesaturate
    }
  };

  GAME.setSharpen = function(enabled) {
    sharpenEnabled = enabled;
    GAME._postProcess.sharpenEnabled = enabled;
  };

  GAME.setSSAO = function(enabled) {
    ssaoEnabled = enabled;
    GAME._postProcess.ssaoEnabled = enabled;
  };

  // Initialize adaptive quality system
  if (GAME.quality && GAME.quality.init) {
    GAME.quality.init(renderer, resizeBloom);
  }

  // ── applyColorGrade ─────────────────────────────────────
  function applyColorGrade() {
    if (!GAME._currentColorGrade) return;
    var cg = GAME._currentColorGrade;
    compositeMat.uniforms.uTint.value.set(cg.tint[0], cg.tint[1], cg.tint[2]);
    compositeMat.uniforms.uShadows.value.set(cg.shadows[0], cg.shadows[1], cg.shadows[2]);
    compositeMat.uniforms.uContrast.value = cg.contrast;
    compositeMat.uniforms.uSaturation.value = cg.saturation;
    compositeMat.uniforms.uVignetteStrength.value = cg.vignetteStrength;
  }

  // ── warmUpShaders ───────────────────────────────────────
  // Pre-compile every shader permutation the adaptive quality system can
  // transition between (shadows OFF, PCF, PCFSoft). On Windows ANGLE this
  // turns 3× ~150-500ms compile hitches into one masked load-time cost — and
  // because Office/Dust/etc. each carry their own unique material set, we must
  // re-run this on every map load (not just session start).
  //
  // We use sync renderer.compile() and force a draw to a 1×1 RT per
  // permutation. compile() alone only creates program objects; the GLSL→D3D11
  // HLSL link is deferred to first-use, so without the force-draw the first
  // real gameplay frame hitches 100-300ms per material. compileAsync was
  // tried but is fire-and-forget here — the promise was discarded, so the
  // first real frame still drove the link. The 1×1 draw pays link cost up
  // front for negligible pixel cost.
  //
  // The post-fx scenes (bloom/composite/sharpen/ssao) live in their own scene
  // objects that don't change between maps — pre-warm them once per session.
  var _postFxWarmed = false;
  var _warmupRT = new THREE.WebGLRenderTarget(1, 1);

  function addWarmupMeshes() {
    var s = GAME.scene;
    var tmpObjs = [];

    // LineBasicMaterial (enemy/player tracers)
    var lMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    var lGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -0.001)]);
    var lLine = new THREE.Line(lGeo, lMat);
    lLine.frustumCulled = false;
    s.add(lLine);
    tmpObjs.push({ mesh: lLine, geo: lGeo, mat: lMat });

    // MeshBasicMaterial (explosions, smoke, sparks)
    var bMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    var bGeo = new THREE.PlaneGeometry(0.001, 0.001);
    var bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.copy(camera.position);
    s.add(bMesh);
    tmpObjs.push({ mesh: bMesh, geo: bGeo, mat: bMat });

    return tmpObjs;
  }

  function cleanupWarmupMeshes(tmpObjs) {
    var s = GAME.scene;
    for (var i = 0; i < tmpObjs.length; i++) {
      s.remove(tmpObjs[i].mesh);
      tmpObjs[i].geo.dispose();
      tmpObjs[i].mat.dispose();
    }
  }

  function warmUpShaders() {
    var dirLight = GAME._dirLight;
    var origCast = dirLight ? dirLight.castShadow : false;
    var origType = renderer.shadowMap.type;

    var tmpObjs = addWarmupMeshes();

    function compileScene() {
      // Sync compile creates the program object; the follow-up render forces
      // the GPU driver to actually link it before the next real frame draws.
      renderer.compile(GAME.scene, camera);
      renderer.setRenderTarget(_warmupRT);
      renderer.render(GAME.scene, camera);
      renderer.setRenderTarget(null);
    }

    try {
      // Permutation 1: shadows OFF (Minimal / Very Low tiers)
      if (dirLight) dirLight.castShadow = false;
      compileScene();

      // Permutation 2: PCF shadows (Low / Medium tiers)
      if (dirLight) dirLight.castShadow = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      compileScene();

      // Permutation 3: PCFSoft shadows (High / Ultra tiers)
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      compileScene();

      // Post-fx pipeline shaders only need to compile once per session — the
      // bloom/composite/sharpen/ssao scenes are static (they don't change with
      // the map). Skip on subsequent map loads to avoid an unnecessary visible
      // render pass during the load transition.
      if (!_postFxWarmed) {
        renderWithBloom();
        _postFxWarmed = true;
      }
    } finally {
      // Always restore renderer state and clean up tmp meshes, even on throw,
      // so a failed warmup does not leave the renderer in a half-modified state.
      if (dirLight) dirLight.castShadow = origCast;
      renderer.shadowMap.type = origType;
      cleanupWarmupMeshes(tmpObjs);
    }

    // Signal adaptive quality system that warmup is complete — resets the FPS
    // rolling window so the new map's perf samples don't mix with prior map.
    if (GAME.quality && GAME.quality.markWarmupComplete) {
      GAME.quality.markWarmupComplete();
    }
  }

  // ── renderWithBloom ─────────────────────────────────────
  function renderWithBloom() {
    var s = GAME.scene;

    // [QDIAG] Reset our explicit accumulator (see render() wrap below). The
    // accumulator is the only reliable source of per-frame stats because
    // Three.js zeros info.render on every render() call.
    if (GAME._qdiagStats) {
      GAME._qdiagStats.calls = 0;
      GAME._qdiagStats.triangles = 0;
      GAME._qdiagStats.points = 0;
      GAME._qdiagStats.lines = 0;
    }

    if (GAME._skyDome) {
      GAME._skyDome.position.copy(camera.position);
    }

    var player = GAME.player;
    var qCfg = GAME.quality ? GAME.quality.config : null;
    var useBloom = qCfg ? qCfg.bloom : true;
    var useSharpen = qCfg ? qCfg.sharpen : sharpenEnabled;
    var useSSAO = qCfg ? qCfg.ssao : ssaoEnabled;

    // Always render through the composite shader so color grading (tint,
    // shadow shift, contrast, saturation, vignette, death desaturation) is
    // applied uniformly across every quality tier. A prior "direct render
    // fast path" skipped the composite when bloom/SSAO/sharpen were all off
    // (Minimal..Medium), which made those tiers visibly brighter and flatter
    // than High/Ultra — a jarring shift on quality changes. Bloom/SSAO/
    // sharpen passes themselves remain individually gated below.
    renderer.setRenderTarget(sceneRT);
    renderer.render(s, camera);

    // SSAO pass
    if (useSSAO) {
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

    // Pass SSAO to composite
    compositeMat.uniforms.ssaoEnabled.value = useSSAO ? 1.0 : 0.0;
    compositeMat.uniforms.tSSAO.value = ssaoRT.texture;

    // Bloom passes (skip if bloom disabled — bloomStrength 0 masks stale texture).
    // Must restore bloomStrength on the enabled branch: every tier now runs
    // through composite, so an Ultra->Medium->Ultra cycle would otherwise
    // leave bloomStrength stuck at 0 from the disabled branch.
    if (useBloom) {
      compositeMat.uniforms.bloomStrength.value = 0.4;

      brightPassMat.uniforms.tDiffuse.value = sceneRT.texture;
      renderer.setRenderTarget(brightRT);
      renderer.render(brightScene, bloomCam);

      blurHMat.uniforms.tDiffuse.value = brightRT.texture;
      renderer.setRenderTarget(blurHRT);
      renderer.render(blurHScene, bloomCam);

      blurVMat.uniforms.tDiffuse.value = blurHRT.texture;
      renderer.setRenderTarget(blurVRT);
      renderer.render(blurVScene, bloomCam);

    } else {
      compositeMat.uniforms.bloomStrength.value = 0.0;
    }

    compositeMat.uniforms.tScene.value = sceneRT.texture;
    compositeMat.uniforms.tBloom.value = blurVRT.texture;

    if (useSharpen) {
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

    // Death desaturation via shader uniform
    if (player && !player.alive && player._deathDesaturation > 0) {
      compositeMat.uniforms.uDesaturate.value = player._deathDesaturation;
    } else {
      compositeMat.uniforms.uDesaturate.value = 0.0;
    }
    // Remove any lingering CSS filter
    if (renderer.domElement.style.filter) {
      renderer.domElement.style.filter = '';
    }
  }

  // ── resizeBloom ─────────────────────────────────────────
  function resizeBloom() {
    var p = renderer.getPixelRatio();
    var w = Math.floor(window.innerWidth * p);
    var h = Math.floor(window.innerHeight * p);
    var hw2 = Math.floor(w / 2), hh2 = Math.floor(h / 2);
    sceneRT.setSize(w, h);
    brightRT.setSize(hw2, hh2);
    blurHRT.setSize(hw2, hh2);
    blurVRT.setSize(hw2, hh2);
    blurHMat.uniforms.direction.value.set(1.0 / hw2, 0);
    blurVMat.uniforms.direction.value.set(0, 1.0 / hh2);
    sharpenRT.setSize(w, h);
    sharpenMat.uniforms.uTexelSize.value.set(1.0 / w, 1.0 / h);
    ssaoRT.setSize(hw2, hh2);
    ssaoBlurRT.setSize(hw2, hh2);
    ssaoBlurMat.uniforms.uDirection.value.set(1.0 / hw2, 0);
    ssaoMat.uniforms.uNoiseScale.value.set(w / 4, h / 4);
  }

  // ── Expose on GAME ──────────────────────────────────────
  GAME._renderer = renderer;
  GAME.camera = camera;
  GAME.scene = scene;
  GAME.renderFrame = renderWithBloom;
  GAME.resizeBloom = resizeBloom;
  GAME.applyColorGrade = applyColorGrade;
  GAME._warmUpShaders = warmUpShaders;

  // Expose _contextLost as a getter/setter so main.js reads live value
  Object.defineProperty(GAME, '_contextLost', {
    get: function() { return _contextLost; },
    set: function(v) { _contextLost = v; },
    configurable: true
  });

})();
