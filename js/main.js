// js/main.js — Game init, loop, state machine, rounds, buy system, HUD
// Uses GAME.buildMap, GAME.Player, GAME.WeaponSystem, GAME.EnemyManager, GAME.WEAPON_DEFS

(function() {
  'use strict';

  // ── Game States ──────────────────────────────────────────
  var MENU = 'MENU', BUY_PHASE = 'BUY_PHASE', PLAYING = 'PLAYING',
      ROUND_END = 'ROUND_END', MATCH_END = 'MATCH_END', TOURING = 'TOURING',
      SURVIVAL_BUY = 'SURVIVAL_BUY', SURVIVAL_WAVE = 'SURVIVAL_WAVE', SURVIVAL_DEAD = 'SURVIVAL_DEAD',
      PAUSED = 'PAUSED', GUNGAME_ACTIVE = 'GUNGAME_ACTIVE', GUNGAME_END = 'GUNGAME_END',
      DEATHMATCH_ACTIVE = 'DEATHMATCH_ACTIVE', DEATHMATCH_END = 'DEATHMATCH_END';

  // ── DOM refs ─────────────────────────────────────────────
  var dom = {
    menuScreen:   document.getElementById('menu-screen'),
    modeGrid:     document.getElementById('mode-grid'),
    modeBack:     document.getElementById('mode-back'),
    compStartBtn: document.getElementById('comp-start-btn'),
    survStartBtn: document.getElementById('surv-start-btn'),
    ggStartBtn:   document.getElementById('gg-start-btn'),
    dmStartBtn2:  document.getElementById('dm-start-btn'),
    quickPlayBtn:   document.getElementById('quick-play-btn'),
    quickPlayInfo:  document.getElementById('quick-play-info'),
    menuContent:    document.getElementById('menu-content'),
    missionsFooter: document.getElementById('missions-footer-btn'),
    historyFooter:  document.getElementById('history-footer-btn'),
    tourFooter:     document.getElementById('tour-footer-btn'),
    controlsFooter: document.getElementById('controls-footer-btn'),
    loadoutFooter:  document.getElementById('loadout-footer-btn'),
    loadoutOverlay: document.getElementById('loadout-overlay'),
    loadoutClose:   document.getElementById('loadout-close'),
    loadoutWeapons: document.getElementById('loadout-weapons'),
    loadoutSkins:   document.getElementById('loadout-skins'),
    controlsOverlay: document.getElementById('controls-overlay'),
    controlsClose:  document.getElementById('controls-close'),
    missionsOverlay: document.getElementById('missions-overlay'),
    missionsClose:  document.getElementById('missions-close'),
    hud:          document.getElementById('hud'),
    crosshair:    document.getElementById('crosshair'),
    hpFill:       document.getElementById('hp-fill'),
    hpValue:      document.getElementById('hp-value'),
    armorFill:    document.getElementById('armor-fill'),
    armorValue:   document.getElementById('armor-value'),
    helmetIcon:   document.getElementById('helmet-icon'),
    weaponName:   document.getElementById('weapon-name'),
    ammoMag:      document.getElementById('ammo-mag'),
    ammoReserve:  document.getElementById('ammo-reserve'),
    moneyDisplay: document.getElementById('money-display'),
    roundTimer:   document.getElementById('round-timer'),
    roundInfo:    document.getElementById('round-info'),
    buyPhaseHint: document.getElementById('buy-phase-hint'),
    killFeed:     document.getElementById('kill-feed'),
    announcement: document.getElementById('announcement'),
    scoreboard:   document.getElementById('scoreboard'),
    scorePlayer:  document.getElementById('score-player'),
    scoreBots:    document.getElementById('score-bots'),
    scorePlayerLabel: document.getElementById('score-player-label'),
    scoreBotsLabel:   document.getElementById('score-bots-label'),
    mapInfo:      document.getElementById('map-info'),
    compMapModeRow: document.getElementById('comp-map-mode-row'),
    survMapModeRow: document.getElementById('surv-map-mode-row'),
    ggMapModeRow:  document.getElementById('gg-map-mode-row'),
    dmMapModeRow:  document.getElementById('dm-map-mode-row'),
    compModeRow:  document.getElementById('comp-mode-row'),
    compTeamOptions: document.getElementById('comp-team-options'),
    compObjectiveRow: document.getElementById('comp-objective-row'),
    compSideRow:  document.getElementById('comp-side-row'),
    bombHud:      document.getElementById('bomb-hud'),
    bombTimerDisplay: document.getElementById('bomb-timer-display'),
    bombActionHint: document.getElementById('bomb-action-hint'),
    bombProgressWrap: document.getElementById('bomb-progress-wrap'),
    bombProgressBar: document.getElementById('bomb-progress-bar'),
    buyMenu:      document.getElementById('buy-menu'),
    buyBalance:   document.querySelector('.buy-balance'),
    bloodSplatter: document.getElementById('blood-splatter'),
    damageFlash:  document.getElementById('damage-flash'),
    flashOverlay: document.getElementById('flash-overlay'),
    matchEnd:     document.getElementById('match-end'),
    matchResult:  document.getElementById('match-result'),
    finalScore:   document.getElementById('final-score'),
    restartBtn:   document.getElementById('restart-btn'),
    menuBtn:      document.getElementById('menu-btn'),
    grenadeCount: document.getElementById('grenade-count'),
    historyPanel: document.getElementById('history-panel'),
    historyStats: document.getElementById('history-stats'),
    historyList:  document.getElementById('history-list'),
    historyClose: document.getElementById('history-close'),
    tourPanel:    document.getElementById('tour-panel'),
    tourPanelClose: document.getElementById('tour-panel-close'),
    tourExitBtn:  document.getElementById('tour-exit-btn'),
    tourMapLabel: document.getElementById('tour-map-label'),
    hitmarker:    document.getElementById('hitmarker'),
    dmgContainer: document.getElementById('dmg-container'),
    streakAnnounce: document.getElementById('streak-announce'),
    minimapCanvas: document.getElementById('minimap'),
    crouchIndicator: document.getElementById('crouch-indicator'),
    waveCounter:  document.getElementById('wave-counter'),
    rankDisplay:  document.getElementById('rank-display'),
    matchXpBreakdown: document.getElementById('match-xp-breakdown'),
    survivalBestDisplay: document.getElementById('survival-best-display'),
    survivalEnd:  document.getElementById('survival-end'),
    survivalWaveResult: document.getElementById('survival-wave-result'),
    survivalStatsDisplay: document.getElementById('survival-stats-display'),
    survivalXpBreakdown: document.getElementById('survival-xp-breakdown'),
    survivalRestartBtn: document.getElementById('survival-restart-btn'),
    survivalMenuBtn: document.getElementById('survival-menu-btn'),
    pauseOverlay: document.getElementById('pause-overlay'),
    pauseResumeBtn: document.getElementById('pause-resume-btn'),
    pauseMenuBtn: document.getElementById('pause-menu-btn'),
    lowHealthPulse: document.getElementById('low-health-pulse'),
    scopeOverlay: document.getElementById('scope-overlay'),
    gungameBestDisplay: document.getElementById('gungame-best-display'),
    gungameEnd: document.getElementById('gungame-end'),
    gungameTimeResult: document.getElementById('gungame-time-result'),
    gungameStatsDisplay: document.getElementById('gungame-stats-display'),
    gungameXpBreakdown: document.getElementById('gungame-xp-breakdown'),
    gungameRestartBtn: document.getElementById('gungame-restart-btn'),
    gungameMenuBtn: document.getElementById('gungame-menu-btn'),
    gungameLevel: document.getElementById('gungame-level'),
    dmBestDisplay: document.getElementById('dm-best-display'),
    dmEnd: document.getElementById('deathmatch-end'),
    dmKillResult: document.getElementById('dm-kill-result'),
    dmStatsDisplay: document.getElementById('dm-stats-display'),
    dmXpBreakdown: document.getElementById('dm-xp-breakdown'),
    dmRestartBtn: document.getElementById('dm-restart-btn'),
    dmMenuBtn: document.getElementById('dm-menu-btn'),
    dmKillCounter: document.getElementById('dm-kill-counter'),
    dmRespawnTimer: document.getElementById('dm-respawn-timer'),
    radioMenu:    document.getElementById('radio-menu'),
  };

  // ── Three.js Setup ───────────────────────────────────────
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.prepend(renderer.domElement);

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

  var pr = Math.min(window.devicePixelRatio, 2);
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
  var ssaoEnabled = true;

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

  function applyColorGrade() {
    if (!GAME._currentColorGrade) return;
    var cg = GAME._currentColorGrade;
    compositeMat.uniforms.uTint.value.set(cg.tint[0], cg.tint[1], cg.tint[2]);
    compositeMat.uniforms.uShadows.value.set(cg.shadows[0], cg.shadows[1], cg.shadows[2]);
    compositeMat.uniforms.uContrast.value = cg.contrast;
    compositeMat.uniforms.uSaturation.value = cg.saturation;
    compositeMat.uniforms.uVignetteStrength.value = cg.vignetteStrength;
  }

  function renderWithBloom() {
    if (GAME._skyDome) {
      GAME._skyDome.position.copy(camera.position);
    }
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);

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

    // Pass SSAO to composite
    compositeMat.uniforms.ssaoEnabled.value = ssaoEnabled ? 1.0 : 0.0;
    compositeMat.uniforms.tSSAO.value = ssaoRT.texture;

    brightPassMat.uniforms.tDiffuse.value = sceneRT.texture;
    renderer.setRenderTarget(brightRT);
    renderer.render(brightScene, bloomCam);

    blurHMat.uniforms.tDiffuse.value = brightRT.texture;
    renderer.setRenderTarget(blurHRT);
    renderer.render(blurHScene, bloomCam);

    blurVMat.uniforms.tDiffuse.value = blurHRT.texture;
    renderer.setRenderTarget(blurVRT);
    renderer.render(blurVScene, bloomCam);

    compositeMat.uniforms.tScene.value = sceneRT.texture;
    compositeMat.uniforms.tBloom.value = blurVRT.texture;

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

  function resizeBloom() {
    var p = Math.min(window.devicePixelRatio, 2);
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

  // ── Game Variables ───────────────────────────────────────
  var gameState = MENU;
  var player, weapons, enemyManager;
  var mapWalls = [];
  var currentMapIndex = 0;
  var startingMapIndex = 0;
  var roundNumber = 0;
  var playerScore = 0, botScore = 0;
  var roundTimer = 0, phaseTimer = 0;
  var TOTAL_ROUNDS = 6;
  var BUY_PHASE_TIME = 10, ROUND_TIME = 90, ROUND_END_TIME = 5;
  var buyMenuOpen = false;
  var radioMenuOpen = false;
  var radioAutoCloseTimer = null;
  var RADIO_LINES = [
    'Go go go!',
    'Fire in the hole!',
    'Contact!',
    'Need backup',
    'Affirmative',
    'Negative'
  ];
  var announcementTimeout = null;
  var damageFlashTimer = 0;
  var matchKills = 0, matchDeaths = 0, matchHeadshots = 0;
  var matchRoundsWon = 0;
  var matchShotsFired = 0, matchShotsHit = 0, matchDamageDealt = 0;
  var matchNadesUsed = { he: false, smoke: false, flash: false };
  var pausedFromState = null; // state to resume to when unpausing

  // ── Team Mode Config ───────────────────────────────────
  var teamMode = false;           // true when playing team match
  var teamObjective = 'elimination'; // 'elimination' or 'bomb'
  var playerTeam = 'ct';          // 'ct' or 't'
  var TEAM_SIZES = { easy: 2, normal: 3, hard: 4, elite: 5 };

  // ── Bomb Defusal State ────────────────────────────────
  var bombPlanted = false;
  var bombTimer = 0;
  var BOMB_FUSE_TIME = 40;
  var BOMB_PLANT_TIME = 3;
  var BOMB_DEFUSE_TIME = 5;
  var bombPlantProgress = 0;      // 0-1 progress for planting
  var bombDefuseProgress = 0;     // 0-1 progress for defusing
  var bombCarrierBot = null;      // T-side bot carrying the bomb (or null if player has it)
  var playerHasBomb = false;      // true if player (T side) has the bomb
  var bombMesh = null;            // 3D mesh of planted bomb
  var bombPlantedPos = null;      // {x, z} where bomb was planted
  var bombSites = [];             // bombsite data from map
  var bombTickTimer = 0;          // timer for tick sound interval
  var droppedBombMesh = null;     // 3D mesh of dropped bomb on ground
  var droppedBombPos = null;      // position of dropped bomb

  // ── Difficulty ─────────────────────────────────────────
  var selectedDifficulty = localStorage.getItem('miniCS_difficulty') || 'normal';
  var DIFF_XP_MULT = { easy: 0.5, normal: 1, hard: 1.5, elite: 2.5 };

  // ── Map Mode (fixed / rotate) ────────────────────────
  var selectedMapMode = localStorage.getItem('miniCS_mapMode') || 'fixed';
  var selectedMapModeForMatch = 'fixed';

  // ── Menu Flythrough Camera Paths ────────────────────────
  // One per map (indexed same as GAME._maps)
  // Each keyframe: { position: {x,y,z}, lookAt: {x,y,z}, duration: seconds }
  var _menuFlythroughPaths = [
    // Dust (50x50) — sweep through market, past vehicle, overview
    [
      { position: {x:-22,y:3,z:-22}, lookAt: {x:0,y:2,z:0}, duration: 6 },
      { position: {x:-10,y:4,z:-15}, lookAt: {x:5,y:2,z:5}, duration: 5 },
      { position: {x:10,y:6,z:0}, lookAt: {x:-5,y:1,z:10}, duration: 5 },
      { position: {x:15,y:3,z:15}, lookAt: {x:-10,y:2,z:-5}, duration: 5 },
      { position: {x:-15,y:8,z:10}, lookAt: {x:0,y:0,z:0}, duration: 5 }
    ],
    // Office (40x40) — through corridors, past desks
    [
      { position: {x:-16,y:3,z:-16}, lookAt: {x:0,y:2,z:0}, duration: 5 },
      { position: {x:-5,y:4,z:-10}, lookAt: {x:10,y:2,z:5}, duration: 5 },
      { position: {x:10,y:3,z:0}, lookAt: {x:-5,y:2,z:10}, duration: 5 },
      { position: {x:5,y:5,z:12}, lookAt: {x:-10,y:1,z:-5}, duration: 5 },
      { position: {x:-12,y:4,z:5}, lookAt: {x:5,y:2,z:-10}, duration: 5 }
    ],
    // Warehouse (60x50) — ground floor, up to platforms, overview
    [
      { position: {x:-25,y:3,z:-20}, lookAt: {x:0,y:4,z:0}, duration: 5 },
      { position: {x:-10,y:6,z:-15}, lookAt: {x:10,y:4,z:10}, duration: 5 },
      { position: {x:15,y:8,z:0}, lookAt: {x:-5,y:2,z:15}, duration: 6 },
      { position: {x:20,y:10,z:15}, lookAt: {x:-10,y:4,z:-10}, duration: 5 },
      { position: {x:-20,y:12,z:10}, lookAt: {x:0,y:0,z:0}, duration: 5 }
    ],
    // Bloodstrike (60x44) — corridor loop, past corners and platforms
    [
      { position: {x:-24,y:3,z:-14}, lookAt: {x:0,y:3,z:-14}, duration: 5 },
      { position: {x:24,y:4,z:-18}, lookAt: {x:24,y:3,z:10}, duration: 5 },
      { position: {x:20,y:6,z:16}, lookAt: {x:-10,y:3,z:16}, duration: 5 },
      { position: {x:-24,y:4,z:18}, lookAt: {x:-24,y:3,z:-5}, duration: 5 },
      { position: {x:0,y:10,z:0}, lookAt: {x:0,y:0,z:0}, duration: 6 }
    ],
    // Italy (55x50) — piazza, alleys, buildings
    [
      { position: {x:-24,y:3,z:-20}, lookAt: {x:0,y:2,z:0}, duration: 5 },
      { position: {x:-5,y:5,z:-15}, lookAt: {x:5,y:2,z:5}, duration: 5 },
      { position: {x:10,y:4,z:0}, lookAt: {x:-5,y:3,z:10}, duration: 6 },
      { position: {x:15,y:3,z:12}, lookAt: {x:-10,y:2,z:-5}, duration: 5 },
      { position: {x:-15,y:8,z:5}, lookAt: {x:0,y:1,z:0}, duration: 5 }
    ],
    // Aztec (70x60) — temple, river, bridge
    [
      { position: {x:-20,y:4,z:20}, lookAt: {x:10,y:2,z:0}, duration: 5 },
      { position: {x:0,y:3,z:10}, lookAt: {x:15,y:4,z:18}, duration: 5 },
      { position: {x:15,y:6,z:10}, lookAt: {x:-10,y:0,z:-10}, duration: 6 },
      { position: {x:10,y:3,z:-15}, lookAt: {x:-18,y:3,z:-18}, duration: 5 },
      { position: {x:-15,y:10,z:0}, lookAt: {x:0,y:0,z:0}, duration: 5 }
    ],
    // Arena (40x40) — cross corridors, center platform
    [
      { position: {x:-16,y:3,z:-16}, lookAt: {x:0,y:2,z:0}, duration: 5 },
      { position: {x:14,y:4,z:-14}, lookAt: {x:-5,y:2,z:5}, duration: 5 },
      { position: {x:14,y:3,z:14}, lookAt: {x:-14,y:2,z:-5}, duration: 5 },
      { position: {x:-14,y:5,z:14}, lookAt: {x:0,y:1,z:0}, duration: 5 },
      { position: {x:0,y:8,z:0}, lookAt: {x:5,y:0,z:5}, duration: 6 }
    ]
  ];

  // Flythrough state
  var _ftPathIndex = 0;   // current keyframe index
  var _ftProgress = 0;    // 0-1 progress between current and next keyframe
  var _ftMapIndex = -1;   // which map is currently built for menu background

  GAME._menuFlythroughPaths = _menuFlythroughPaths;

  GAME.updateMenuFlythrough = function(dt) {
    if (_ftMapIndex < 0) return;
    var path = _menuFlythroughPaths[_ftMapIndex];
    if (!path || path.length < 2) return;

    var curr = path[_ftPathIndex];
    var next = path[(_ftPathIndex + 1) % path.length];

    _ftProgress += dt / curr.duration;

    if (_ftProgress >= 1) {
      _ftProgress -= 1;
      _ftPathIndex = (_ftPathIndex + 1) % path.length;
      curr = path[_ftPathIndex];
      next = path[(_ftPathIndex + 1) % path.length];
    }

    // Smooth interpolation using smoothstep
    var t = _ftProgress * _ftProgress * (3 - 2 * _ftProgress);

    camera.position.set(
      curr.position.x + (next.position.x - curr.position.x) * t,
      curr.position.y + (next.position.y - curr.position.y) * t,
      curr.position.z + (next.position.z - curr.position.z) * t
    );

    var lx = curr.lookAt.x + (next.lookAt.x - curr.lookAt.x) * t;
    var ly = curr.lookAt.y + (next.lookAt.y - curr.lookAt.y) * t;
    var lz = curr.lookAt.z + (next.lookAt.z - curr.lookAt.z) * t;
    camera.lookAt(lx, ly, lz);
    camera.updateProjectionMatrix();
  };

  function _buildMenuScene() {
    scene = new THREE.Scene();
    scene.add(camera);

    // Pick a random map
    _ftMapIndex = Math.floor(Math.random() * GAME.getMapCount());
    _ftPathIndex = 0;
    _ftProgress = 0;

    GAME.buildMap(scene, _ftMapIndex, renderer);
    applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }

    // Spawn birds for atmosphere
    var def = GAME.getMapDef(_ftMapIndex);
    spawnBirds(Math.max(def.size.x, def.size.z));

    // Start ambient sound for this map
    if (GAME.Sound) {
      GAME.Sound.startAmbient(def.name);
      if (GAME.Sound.initReverb) GAME.Sound.initReverb(def.name);
    }

    // Hide weapon model during menu flythrough
    if (weapons && weapons.weaponModel) weapons.weaponModel.visible = false;

    // Position camera at first keyframe
    var firstKf = _menuFlythroughPaths[_ftMapIndex][0];
    camera.position.set(firstKf.position.x, firstKf.position.y, firstKf.position.z);
    camera.lookAt(firstKf.lookAt.x, firstKf.lookAt.y, firstKf.lookAt.z);
    camera.fov = 75;
    camera.updateProjectionMatrix();
  }

  GAME.buildMenuScene = _buildMenuScene;

  // ── Quick Play ───────────────────────────────────────────
  var _qpGridIds = {
    competitive: 'comp-map-grid',
    survival: 'surv-map-grid',
    gungame: 'gg-map-grid',
    deathmatch: 'dm-config-map-grid'
  };

  function _getQuickPlaySettings() {
    var mode = localStorage.getItem('miniCS_lastMode') || 'competitive';
    var difficulty = localStorage.getItem('miniCS_difficulty') || 'normal';
    var mapMode = localStorage.getItem('miniCS_mapMode') || 'fixed';
    var gridId = _qpGridIds[mode] || 'comp-map-grid';
    var mapIndex = parseInt(localStorage.getItem('miniCS_lastMap_' + gridId)) || 0;
    if (mapIndex >= GAME.getMapCount()) mapIndex = 0;

    // First-time fallback: random map
    if (!localStorage.getItem('miniCS_lastMode')) {
      mapIndex = Math.floor(Math.random() * GAME.getMapCount());
    }

    return { mode: mode, difficulty: difficulty, mapMode: mapMode, mapIndex: mapIndex };
  }

  GAME.getQuickPlaySettings = _getQuickPlaySettings;

  function _fadeMenuAndStart(startFn) {
    if (dom.menuContent) {
      dom.menuContent.classList.add('fade-out');
      setTimeout(function() {
        dom.menuContent.classList.remove('fade-out');
        startFn();
      }, 300);
    } else {
      startFn();
    }
  }

  function _updateQuickPlayInfo() {
    var s = _getQuickPlaySettings();
    var mapName = GAME.getMapDef(s.mapIndex).name;
    var modeLabel = s.mode === 'competitive' ? 'Competitive' : s.mode === 'survival' ? 'Survival' : s.mode === 'gungame' ? 'Gun Game' : 'Deathmatch';
    var diffLabel = s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1);
    if (dom.quickPlayInfo) {
      dom.quickPlayInfo.textContent = modeLabel + ' \u00B7 ' + diffLabel + ' \u00B7 ' + mapName;
    }
  }

  // ── Kill Streaks ───────────────────────────────────────
  var killStreak = 0;
  var streakTimeout = null;
  var STREAK_NAMES = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE', 8: 'UNSTOPPABLE', 12: 'GODLIKE' };

  // ── Mission System ───────────────────────────────────────
  var MISSION_POOL = [
    { id: 'headshots_5', type: 'match', desc: 'Get 5 headshots', target: 5, tracker: 'headshots', reward: 75 },
    { id: 'kills_10', type: 'match', desc: 'Get 10 kills', target: 10, tracker: 'kills', reward: 80 },
    { id: 'triple_kill', type: 'match', desc: 'Get a Triple Kill', target: 1, tracker: 'triple_kill', reward: 100 },
    { id: 'pistol_round', type: 'round', desc: 'Win a round using only pistol', target: 1, tracker: 'pistol_win', reward: 120 },
    { id: 'knife_kill', type: 'match', desc: 'Get a knife kill', target: 1, tracker: 'knife_kills', reward: 150 },
    { id: 'crouch_kills_3', type: 'match', desc: 'Kill 3 enemies while crouching', target: 3, tracker: 'crouch_kills', reward: 90 },
    { id: 'no_damage_round', type: 'round', desc: 'Win a round without taking damage', target: 1, tracker: 'no_damage_win', reward: 150 },
    { id: 'survival_wave_5', type: 'survival', desc: 'Reach wave 5 in Survival', target: 5, tracker: 'survival_wave', reward: 100 },
    { id: 'survival_dust', type: 'survival', desc: 'Reach wave 5 on Dust (Survival)', target: 5, tracker: 'survival_dust', reward: 120 },
    { id: 'earn_5000', type: 'match', desc: 'Earn $5000 in a single match', target: 5000, tracker: 'money_earned', reward: 100 },
    { id: 'rampage', type: 'match', desc: 'Get a Rampage (5 kill streak)', target: 1, tracker: 'rampage', reward: 150 },
    { id: 'weekly_wins_3', type: 'weekly', desc: 'Win 3 competitive matches', target: 3, tracker: 'weekly_wins', reward: 300 },
    { id: 'weekly_headshots_25', type: 'weekly', desc: 'Get 25 headshots (any mode)', target: 25, tracker: 'weekly_headshots', reward: 350 },
    { id: 'weekly_survival_wave_10', type: 'weekly', desc: 'Reach wave 10 in Survival', target: 10, tracker: 'weekly_survival', reward: 500 },
    { id: 'gungame_complete', type: 'match', desc: 'Complete a Gun Game', target: 1, tracker: 'gungame_complete', reward: 100 },
    { id: 'gungame_fast', type: 'match', desc: 'Complete Gun Game under 3 minutes', target: 1, tracker: 'gungame_fast', reward: 150 },
    { id: 'awp_kills_3', type: 'match', desc: 'Get 3 AWP kills', target: 3, tracker: 'awp_kills', reward: 75 },
    { id: 'smg_kills_5', type: 'match', desc: 'Get 5 SMG kills', target: 5, tracker: 'smg_kills', reward: 60 },
    { id: 'shotgun_kills_3', type: 'match', desc: 'Get 3 shotgun kills', target: 3, tracker: 'shotgun_kills', reward: 75 },
    { id: 'grenade_kills_2', type: 'match', desc: 'Get 2 grenade kills', target: 2, tracker: 'grenade_kills', reward: 60 },
    { id: 'utility_all', type: 'match', desc: 'Use all grenade types in one match', target: 1, tracker: 'all_nades', reward: 80 },
    { id: 'dm_kills_15', type: 'match', desc: 'Get 15 kills in Deathmatch', target: 15, tracker: 'dm_kills', reward: 90 },
    { id: 'accuracy_60', type: 'match', desc: 'Finish a match with 60%+ accuracy', target: 1, tracker: 'high_accuracy', reward: 120 }
  ];
  var activeMissions = { daily1: null, daily2: null, daily3: null, weekly: null };
  var lastMissionRefresh = { daily: 0, weekly: 0 };

  // ── Round Perk System ────────────────────────────────────
  var PERK_POOL = [
    { id: 'stopping_power', name: 'Stopping Power', desc: '+25% weapon damage', icon: '\u26A1' },
    { id: 'quick_hands', name: 'Quick Hands', desc: '30% faster reload', icon: '\u2699' },
    { id: 'fleet_foot', name: 'Fleet Foot', desc: '+20% move speed', icon: '\uD83D\uDC5F' },
    { id: 'thick_skin', name: 'Thick Skin', desc: '+25 HP at round start', icon: '\uD83D\uDEE1' },
    { id: 'scavenger', name: 'Scavenger', desc: '+$150 bonus per kill', icon: '\uD83D\uDCB0' },
    { id: 'marksman', name: 'Marksman', desc: 'Headshot multiplier 3\u00D7', icon: '\uD83C\uDFAF' },
    { id: 'steady_aim', name: 'Steady Aim', desc: '30% tighter spread', icon: '\uD83D\uDD0D' },
    { id: 'iron_lungs', name: 'Iron Lungs', desc: 'Crouch accuracy 60%', icon: '\uD83E\uDEC1' },
    { id: 'blast_radius', name: 'Blast Radius', desc: 'Grenade radius +30%', icon: '\uD83D\uDCA3' },
    { id: 'ghost', name: 'Ghost', desc: 'Enemies detect you 30% slower', icon: '\uD83D\uDC7B' },
    { id: 'juggernaut', name: 'Juggernaut', desc: 'Take 15% less damage', icon: '\uD83E\uDDBE' }
  ];
  var activePerks = [];
  var perkChoices = [];
  var lastRoundWon = false;
  var perkScreenOpen = false;

  // ── Screen Shake ───────────────────────────────────────
  var shakeIntensity = 0;
  var shakeTimer = 0;

  // ── Hitmarker ──────────────────────────────────────────
  var hitmarkerTimer = 0;

  // ── Minimap ────────────────────────────────────────────
  var minimapCtx = dom.minimapCanvas ? dom.minimapCanvas.getContext('2d') : null;
  var minimapWallSegments = [];
  var minimapFrame = 0;
  var minimapScale = 1;
  var minimapCenter = { x: 0, z: 0 };

  // ── Rank System ────────────────────────────────────────
  var RANKS = [
    { name: 'Silver I',        xp: 0,     color: '#8a8a8a' },
    { name: 'Silver II',       xp: 100,   color: '#9a9a9a' },
    { name: 'Silver III',      xp: 250,   color: '#aaaaaa' },
    { name: 'Silver IV',       xp: 500,   color: '#b0b0b0' },
    { name: 'Silver Elite',    xp: 800,   color: '#c0c0c0' },
    { name: 'Silver Elite Master', xp: 1200, color: '#d0d0d0' },
    { name: 'Gold Nova I',     xp: 1700,  color: '#c8a832' },
    { name: 'Gold Nova II',    xp: 2300,  color: '#d4b440' },
    { name: 'Gold Nova III',   xp: 3000,  color: '#e0c050' },
    { name: 'Gold Nova Master', xp: 4000, color: '#ecd060' },
    { name: 'Master Guardian I', xp: 5200, color: '#4fc3f7' },
    { name: 'Master Guardian II', xp: 6600, color: '#29b6f6' },
    { name: 'Master Guardian Elite', xp: 8200, color: '#039be5' },
    { name: 'Distinguished MG', xp: 10000, color: '#0288d1' },
    { name: 'Legendary Eagle',  xp: 12500, color: '#ab47bc' },
    { name: 'Legendary Eagle Master', xp: 15500, color: '#8e24aa' },
    { name: 'Supreme Master',   xp: 19000, color: '#ff7043' },
    { name: 'Global Elite',     xp: 23000, color: '#ffd740' },
  ];

  function getTotalXP() {
    return parseInt(localStorage.getItem('miniCS_xp')) || 0;
  }
  function setTotalXP(xp) {
    localStorage.setItem('miniCS_xp', xp);
  }
  function getRankForXP(xp) {
    var rank = RANKS[0];
    for (var i = RANKS.length - 1; i >= 0; i--) {
      if (xp >= RANKS[i].xp) { rank = RANKS[i]; rank.index = i; break; }
    }
    return rank;
  }
  function getNextRank(rank) {
    var idx = rank.index !== undefined ? rank.index : 0;
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  }
  function updateRankDisplay() {
    var xp = getTotalXP();
    var rank = getRankForXP(xp);
    var next = getNextRank(rank);
    var progress = 0;
    if (next) {
      progress = Math.min(100, ((xp - rank.xp) / (next.xp - rank.xp)) * 100);
    } else {
      progress = 100;
    }
    dom.rankDisplay.innerHTML =
      '<div class="rank-badge" style="color:' + rank.color + '; border-color:' + rank.color + ';">' + rank.name + '</div>' +
      '<div class="rank-xp-bar"><div class="rank-xp-fill" style="width:' + progress + '%; background:' + rank.color + ';"></div></div>' +
      '<div class="rank-xp-text">' + xp + ' XP' + (next ? ' / ' + next.xp : ' (MAX)') + '</div>';
  }

  function calculateXP(kills, headshots, roundsWon, matchWin, diffMult) {
    var baseXP = (kills * 10) + (headshots * 5) + (roundsWon * 20) + (matchWin ? 50 : 0);
    return Math.round(baseXP * diffMult);
  }

  function awardXP(xpEarned) {
    var oldXP = getTotalXP();
    var oldRank = getRankForXP(oldXP);
    var newXP = oldXP + xpEarned;
    setTotalXP(newXP);
    var newRank = getRankForXP(newXP);
    if (newRank.index > oldRank.index) {
      // Rank up!
      if (GAME.Sound) GAME.Sound.rankUp();
      var flash = document.createElement('div');
      flash.className = 'rankup-flash';
      document.body.appendChild(flash);
      setTimeout(function() { flash.remove(); }, 1600);
    }
    return { oldRank: oldRank, newRank: newRank, ranked_up: newRank.index > oldRank.index };
  }

  // ── Survival Mode ──────────────────────────────────────
  var survivalWave = 0;
  var survivalKills = 0;
  var survivalHeadshots = 0;
  var survivalMapIndex = 0;
  var survivalLastMapData = null;

  function getSurvivalBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_survivalBest')) || {}; }
    catch(e) { return {}; }
  }
  function setSurvivalBest(mapName, wave) {
    var best = getSurvivalBest();
    if (!best[mapName] || wave > best[mapName]) {
      best[mapName] = wave;
      localStorage.setItem('miniCS_survivalBest', JSON.stringify(best));
    }
  }



  // ── Gun Game Mode ─────────────────────────────────────
  var GUNGAME_WEAPONS = ['knife', 'pistol', 'shotgun', 'rifle', 'awp', 'knife'];
  var GUNGAME_NAMES = ['Knife', 'Pistol', 'Shotgun', 'AK-47', 'AWP', 'Knife (Final)'];
  var GUNGAME_BOT_COUNT = 4;
  var GUNGAME_BOT_RESPAWN_DELAY = 3;
  var gungameLevel = 0;
  var gungameKills = 0;
  var gungameDeaths = 0;
  var gungameHeadshots = 0;
  var gungameStartTime = 0;
  var gungameMapIndex = 0;
  var gungameLastMapData = null;
  var gungameRespawnQueue = [];

  // ── Deathmatch Mode ────────────────────────────────────
  var DEATHMATCH_KILL_TARGET = 30;
  var DEATHMATCH_TIME_LIMIT = 300; // 5 minutes
  var DEATHMATCH_BOT_RESPAWN_DELAY = 3;
  var DEATHMATCH_PLAYER_RESPAWN_DELAY = 3;
  var dmKills = 0;
  var dmDeaths = 0;
  var dmHeadshots = 0;
  var dmStartTime = 0;
  var dmTimer = 0;
  var dmMapIndex = 0;
  var dmLastMapData = null;
  var dmRespawnQueue = [];
  var dmPlayerDeadTimer = 0;
  var dmSpawnProtection = 0;

  function getGunGameBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_gungameBest')) || {}; }
    catch(e) { return {}; }
  }
  function setGunGameBest(mapName, seconds) {
    var best = getGunGameBest();
    if (!best[mapName] || seconds < best[mapName]) {
      best[mapName] = seconds;
      localStorage.setItem('miniCS_gungameBest', JSON.stringify(best));
    }
  }
  function updateGunGameBestDisplay() {
    var best = getGunGameBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) {
        var s = best[mapNames[i]];
        var m = Math.floor(s / 60), sec = Math.floor(s % 60);
        parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': ' + m + ':' + (sec < 10 ? '0' : '') + sec);
      }
    }
    if (dom.gungameBestDisplay) dom.gungameBestDisplay.textContent = parts.length > 0 ? 'BEST TIMES — ' + parts.join(' | ') : 'No records yet';
  }

  // ── Deathmatch Best Scores ─────────────────────────────
  function getDMBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_dmBest')) || {}; }
    catch(e) { return {}; }
  }
  function setDMBest(mapName, kills) {
    var best = getDMBest();
    if (!best[mapName] || kills > best[mapName]) {
      best[mapName] = kills;
      localStorage.setItem('miniCS_dmBest', JSON.stringify(best));
    }
  }
  function updateDMBestDisplay() {
    var best = getDMBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': ' + best[mapNames[i]] + ' kills');
    }
    if (dom.dmBestDisplay) dom.dmBestDisplay.textContent = parts.length > 0 ? 'BEST — ' + parts.join(' | ') : 'No records yet';
  }

  // ── Blood Particles (delegated to particle system) ─────
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

  // ── Bullet Hole Decals ────────────────────────────────
  var _bulletHoleGeo = null;
  var bulletHoles = [];
  var MAX_BULLET_HOLES = 60;

  function spawnBulletHole(point, normal) {
    if (!_bulletHoleGeo) {
      _bulletHoleGeo = new THREE.PlaneGeometry(0.08, 0.08);
    }
    var mat = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    var decal = new THREE.Mesh(_bulletHoleGeo, mat);
    decal.position.copy(point);
    decal.position.add(normal.clone().multiplyScalar(0.005));
    decal.lookAt(point.x + normal.x, point.y + normal.y, point.z + normal.z);
    decal.rotateZ(Math.random() * Math.PI * 2);
    var s = 0.7 + Math.random() * 0.6;
    decal.scale.set(s, s, 1);
    scene.add(decal);
    bulletHoles.push({ mesh: decal, mat: mat, age: 0 });
    if (bulletHoles.length > MAX_BULLET_HOLES) {
      var old = bulletHoles.shift();
      scene.remove(old.mesh);
      old.mat.dispose();
    }
  }

  function updateBulletHoles(dt) {
    for (var i = bulletHoles.length - 1; i >= 0; i--) {
      var bh = bulletHoles[i];
      bh.age += dt;
      if (bh.age > 12) {
        bh.mat.opacity -= dt * (0.8 / 3);
        if (bh.mat.opacity <= 0) {
          scene.remove(bh.mesh);
          bh.mat.dispose();
          bulletHoles.splice(i, 1);
        }
      }
    }
  }

  GAME.spawnBulletHole = spawnBulletHole;
  GAME._bulletHoles = bulletHoles;
  GAME.MAX_BULLET_HOLES = MAX_BULLET_HOLES;

  // ── Impact Dust Puffs ───────────────────────────────
  var _dustGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
  var _dustPool = [];
  var _dustPoolSize = 20;
  var _dustParticles = [];

  function _initDustPool() {
    for (var i = 0; i < _dustPoolSize; i++) {
      var mat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0 });
      var m = new THREE.Mesh(_dustGeo, mat);
      m.visible = false;
      scene.add(m);
      _dustPool.push({ mesh: m, mat: mat });
    }
  }

  var _dustIdx = 0;

  function spawnImpactDust(point, normal, surfaceColor) {
    if (_dustPool.length === 0) _initDustPool();
    var dustColor = surfaceColor || 0xaaaaaa;
    var count = 3 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count; i++) {
      var d = _dustPool[_dustIdx];
      _dustIdx = (_dustIdx + 1) % _dustPoolSize;
      d.mat.color.setHex(dustColor);
      d.mat.opacity = 0.6;
      d.mesh.visible = true;
      d.mesh.position.copy(point);
      var spread = 0.5;
      var vx = normal.x * 2 + (Math.random() - 0.5) * spread;
      var vy = normal.y * 2 + Math.random() * 1.5;
      var vz = normal.z * 2 + (Math.random() - 0.5) * spread;
      _dustParticles.push({
        pool: d, vx: vx, vy: vy, vz: vz, age: 0, maxLife: 0.3
      });
    }
  }

  function updateImpactDust(dt) {
    for (var i = _dustParticles.length - 1; i >= 0; i--) {
      var p = _dustParticles[i];
      p.age += dt;
      if (p.age >= p.maxLife) {
        p.pool.mesh.visible = false;
        p.pool.mat.opacity = 0;
        _dustParticles.splice(i, 1);
        continue;
      }
      p.vy -= 9.8 * dt;
      p.pool.mesh.position.x += p.vx * dt;
      p.pool.mesh.position.y += p.vy * dt;
      p.pool.mesh.position.z += p.vz * dt;
      p.pool.mat.opacity = 0.6 * (1 - p.age / p.maxLife);
    }
  }

  GAME.spawnImpactDust = spawnImpactDust;

  // ── Footstep Dust ────────────────────────────────────
  var footDustPool = [];
  var footDustIdx = 0;
  var FOOT_DUST_MAX = 12;

  (function initFootDust() {
    if (typeof THREE === 'undefined') return;
    var geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    var mat = new THREE.MeshBasicMaterial({ color: 0xccaa77, transparent: true, opacity: 0.5, depthWrite: false });
    for (var i = 0; i < FOOT_DUST_MAX; i++) {
      var m = new THREE.Mesh(geo, mat.clone());
      m.visible = false;
      footDustPool.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.4 });
    }
  })();

  GAME.spawnFootstepDust = function(position) {
    for (var i = 0; i < 3; i++) {
      var p = footDustPool[footDustIdx];
      if (!p) return;
      footDustIdx = (footDustIdx + 1) % FOOT_DUST_MAX;
      p.mesh.position.set(
        position.x + (Math.random() - 0.5) * 0.3,
        position.y + 0.05,
        position.z + (Math.random() - 0.5) * 0.3
      );
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = 0.5 + Math.random() * 0.3;
      p.vz = (Math.random() - 0.5) * 0.5;
      p.life = 0;
      p.mesh.visible = true;
      p.mesh.material.opacity = 0.5;
      if (scene) scene.add(p.mesh);
    }
  };

  function updateFootDust(dt) {
    for (var i = 0; i < FOOT_DUST_MAX; i++) {
      var p = footDustPool[i];
      if (!p || !p.mesh.visible) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        if (scene) scene.remove(p.mesh);
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 2 * dt;
      p.mesh.material.opacity = 0.5 * (1 - p.life / p.maxLife);
    }
  }

  // ── Directional Damage Indicators ─────────────────────
  var damageIndicators = [];
  var damageIndicatorContainer = document.getElementById('damage-indicators');

  GAME.showDamageIndicator = function(attackerPos) {
    if (!player || !player.alive) return;
    if (!damageIndicatorContainer) return;
    var dx = attackerPos.x - player.position.x;
    var dz = attackerPos.z - player.position.z;
    var angleToAttacker = Math.atan2(dx, -dz);
    var relativeAngle = angleToAttacker - player.yaw;
    while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
    while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

    var arc = document.createElement('div');
    arc.className = 'damage-arc';
    arc.style.transform = 'rotate(' + (relativeAngle * 180 / Math.PI) + 'deg)';
    damageIndicatorContainer.appendChild(arc);
    damageIndicators.push({ el: arc, timer: 1.0 });
  };

  function updateDamageIndicators(dt) {
    for (var i = damageIndicators.length - 1; i >= 0; i--) {
      var ind = damageIndicators[i];
      ind.timer -= dt;
      ind.el.style.opacity = Math.max(0, ind.timer);
      if (ind.timer <= 0) {
        ind.el.remove();
        damageIndicators.splice(i, 1);
      }
    }
  }

  // ── Kill Micro Slow-Motion ───────────────────────────────
  GAME.killSlowMo = { active: false, timer: 0, scale: 1.0 };

  function triggerKillSlowMo() {
    if (killStreak > 2) return; // skip during rapid multi-kills
    GAME.killSlowMo.active = true;
    GAME.killSlowMo.timer = 0.05;
    GAME.killSlowMo.scale = 0.7;
  }

  // ── Kill Camera Kick ─────────────────────────────────────
  GAME.killKick = { active: false, timer: 0, magnitude: 0, phase: 'snap' };
  GAME._hitFeedback = { hitTimer: 0, killTimer: 0 };

  function triggerKillKick(isHeadshot) {
    if (GAME.killKick.active) return; // no stacking
    GAME.killKick.active = true;
    GAME.killKick.timer = 0;
    GAME.killKick.magnitude = isHeadshot ? 0.023 : 0.015;
    GAME.killKick.phase = 'snap';
  }
  GAME.triggerKillKick = triggerKillKick;

  function applyKillKick(dt) {
    var k = GAME.killKick;
    if (!k.active) return;
    k.timer += dt;
    if (k.phase === 'snap') {
      // Snap up over 0.05s
      var snapT = Math.min(1, k.timer / 0.05);
      player.pitch -= k.magnitude * snapT * dt * 20;
      if (k.timer >= 0.05) {
        k.phase = 'ease';
        k.timer = 0;
      }
    } else {
      // Ease back over 0.15s
      var easeT = Math.min(1, k.timer / 0.15);
      player.pitch += k.magnitude * (1 - easeT) * dt * 10;
      if (k.timer >= 0.15) {
        k.active = false;
      }
    }
  }

  // ── Screen Blood Splatter ────────────────────────────────
  var bloodSplatterTimer = 0;

  GAME.triggerBloodSplatter = function(damage) {
    if (damage < 30) return;
    var intensity = Math.min(1, damage / 80);
    if (dom.bloodSplatter) dom.bloodSplatter.style.opacity = intensity * 0.8;
    bloodSplatterTimer = 2.0;
  };

  function updateBloodSplatter(dt) {
    if (bloodSplatterTimer > 0) {
      bloodSplatterTimer -= dt;
      if (bloodSplatterTimer < 1.0 && dom.bloodSplatter) {
        dom.bloodSplatter.style.opacity = bloodSplatterTimer * 0.8;
      }
      if (bloodSplatterTimer <= 0 && dom.bloodSplatter) {
        dom.bloodSplatter.style.opacity = 0;
      }
    }
  }

  // ── Birds ──────────────────────────────────────────────
  var birds = [];
  var BIRD_COUNT = 5;
  var BIRD_MONEY = 200;
  var _birdId = 0;
  var _birdMapSize = 50;
  var _featherGeo = null;
  var _birdBodyMat = null, _birdWingMat = null, _birdBeakMat = null;

  function getBirdMaterials() {
    if (!_birdBodyMat) {
      _birdBodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.1 });
      _birdWingMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.75, metalness: 0.1 });
      _birdBeakMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.6, metalness: 0.2 });
    }
  }

  function createBird(mapSize) {
    getBirdMaterials();
    var group = new THREE.Group();
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), _birdBodyMat);
    body.scale.set(1, 0.8, 1.8);
    group.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), _birdBodyMat);
    head.position.set(0, 0.08, -0.32);
    group.add(head);
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), _birdBeakMat);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.04, -0.48);
    group.add(beak);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.18), _birdWingMat);
    tail.position.set(0, 0.04, 0.3);
    tail.rotation.x = 0.2;
    group.add(tail);
    var leftPivot = new THREE.Group();
    leftPivot.position.set(0.18, 0.05, 0);
    var leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.22), _birdWingMat);
    leftWing.position.set(0.22, 0, 0);
    leftPivot.add(leftWing);
    group.add(leftPivot);
    var rightPivot = new THREE.Group();
    rightPivot.position.set(-0.18, 0.05, 0);
    var rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.22), _birdWingMat);
    rightWing.position.set(-0.22, 0, 0);
    rightPivot.add(rightWing);
    group.add(rightPivot);

    var half = mapSize * 0.4;
    var cx = (Math.random() - 0.5) * 2 * half;
    var cz = (Math.random() - 0.5) * 2 * half;
    var radius = 5 + Math.random() * 12;
    var height = 10 + Math.random() * 10;
    var speed = 0.3 + Math.random() * 0.4;
    var angle = Math.random() * Math.PI * 2;
    var flapSpeed = 6 + Math.random() * 4;

    group.position.set(cx + Math.cos(angle) * radius, height, cz + Math.sin(angle) * radius);
    scene.add(group);

    return {
      id: _birdId++, mesh: group, alive: true,
      leftPivot: leftPivot, rightPivot: rightPivot,
      cx: cx, cz: cz, radius: radius, height: height,
      speed: speed, angle: angle, flapSpeed: flapSpeed,
      flapPhase: Math.random() * Math.PI * 2, respawnTimer: 0,
    };
  }

  function spawnBirds(mapSize) {
    birds = [];
    _birdId = 0;
    _birdMapSize = mapSize;
    for (var i = 0; i < BIRD_COUNT; i++) birds.push(createBird(mapSize));
    weapons.setBirdsRef(birds);
  }

  function updateBirds(dt) {
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];
      if (!b.alive) {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) {
          b.alive = true;
          var half = _birdMapSize * 0.4;
          b.cx = (Math.random() - 0.5) * 2 * half;
          b.cz = (Math.random() - 0.5) * 2 * half;
          b.radius = 5 + Math.random() * 12;
          b.height = 10 + Math.random() * 10;
          b.angle = Math.random() * Math.PI * 2;
          b.mesh.visible = true;
          b.mesh.position.set(b.cx + Math.cos(b.angle) * b.radius, b.height, b.cz + Math.sin(b.angle) * b.radius);
          scene.add(b.mesh);
        }
        continue;
      }
      b.angle += b.speed * dt;
      b.mesh.position.set(b.cx + Math.cos(b.angle) * b.radius, b.height + Math.sin(b.angle * 2) * 0.5, b.cz + Math.sin(b.angle) * b.radius);
      b.mesh.rotation.y = -b.angle + Math.PI / 2;
      b.mesh.rotation.z = Math.sin(b.angle) * 0.15;
      b.flapPhase += b.flapSpeed * dt;
      var flap = Math.sin(b.flapPhase) * 0.6;
      b.leftPivot.rotation.z = flap;
      b.rightPivot.rotation.z = -flap;
    }
  }

  function killBird(bird, hitPoint) {
    bird.alive = false;
    bird.respawnTimer = 15 + Math.random() * 10;
    if (!_featherGeo) _featherGeo = new THREE.BoxGeometry(0.06, 0.01, 0.1);
    for (var i = 0; i < 6; i++) {
      var feather = new THREE.Mesh(_featherGeo, _birdWingMat);
      feather.position.copy(hitPoint);
      var vel = new THREE.Vector3((Math.random()-0.5)*4, Math.random()*3, (Math.random()-0.5)*4);
      scene.add(feather);
      (function(f,v) {
        var life = 0;
        var iv = setInterval(function() {
          life += 0.016; v.y -= 9.8*0.016;
          f.position.add(v.clone().multiplyScalar(0.016));
          f.rotation.x += 5*0.016; f.rotation.z += 3*0.016;
          if (life > 1.5) { clearInterval(iv); if (f.parent) f.parent.remove(f); }
        }, 16);
      })(feather, vel);
    }
    bird.mesh.visible = false;
  }

  // ── Pointer Lock ─────────────────────────────────────────
  renderer.domElement.addEventListener('click', function() {
    if (gameState === PLAYING || gameState === BUY_PHASE || gameState === TOURING ||
        gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE ||
        gameState === DEATHMATCH_ACTIVE) {
      if (!document.pointerLockElement) renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', function() {
    if (!document.pointerLockElement && buyMenuOpen) {
      buyMenuOpen = false;
      dom.buyMenu.classList.remove('show');
    }
  });

  // ── Mission System Functions ─────────────────────────────
  function getMissionDef(id) {
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].id === id) return MISSION_POOL[i];
    }
    return null;
  }

  function generateDailyMissions() {
    var dailies = [];
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].type !== 'weekly') dailies.push(MISSION_POOL[i]);
    }
    var picked = [];
    for (var d = 0; d < 3; d++) {
      var m;
      do { m = dailies[Math.floor(Math.random() * dailies.length)]; }
      while (picked.indexOf(m.id) >= 0);
      picked.push(m.id);
      activeMissions['daily' + (d + 1)] = { id: m.id, progress: 0, completed: false };
    }
  }

  function generateWeeklyMission() {
    var weeklies = [];
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].type === 'weekly') weeklies.push(MISSION_POOL[i]);
    }
    var w = weeklies[Math.floor(Math.random() * weeklies.length)];
    activeMissions.weekly = { id: w.id, progress: 0, completed: false };
  }

  function checkMissionRefresh() {
    var now = Date.now();
    var DAY_MS = 24 * 60 * 60 * 1000;
    var WEEK_MS = 7 * DAY_MS;
    if (now - lastMissionRefresh.daily > DAY_MS) {
      activeMissions.daily1 = null;
      activeMissions.daily2 = null;
      activeMissions.daily3 = null;
      lastMissionRefresh.daily = now;
    }
    if (now - lastMissionRefresh.weekly > WEEK_MS) {
      activeMissions.weekly = null;
      lastMissionRefresh.weekly = now;
    }
    if (!activeMissions.daily1) generateDailyMissions();
    if (!activeMissions.weekly) generateWeeklyMission();
    saveMissionState();
  }

  function loadMissionState() {
    try {
      var saved = localStorage.getItem('miniCS_missions');
      if (saved) {
        var data = JSON.parse(saved);
        if (data.active) activeMissions = data.active;
        if (data.lastRefresh) lastMissionRefresh = data.lastRefresh;
      }
    } catch (e) {}
  }

  function saveMissionState() {
    localStorage.setItem('miniCS_missions', JSON.stringify({
      active: activeMissions,
      lastRefresh: lastMissionRefresh
    }));
  }

  function trackMissionEvent(eventType, value) {
    var slots = ['daily1', 'daily2', 'daily3', 'weekly'];
    for (var s = 0; s < slots.length; s++) {
      var mission = activeMissions[slots[s]];
      if (!mission || mission.completed) continue;
      var def = getMissionDef(mission.id);
      if (!def || def.tracker !== eventType) continue;
      mission.progress = Math.min(def.target, mission.progress + (value || 1));
      if (mission.progress >= def.target) {
        mission.completed = true;
        var oldXP = getTotalXP();
        setTotalXP(oldXP + def.reward);
        showAnnouncement('MISSION COMPLETE', def.desc + '  +' + def.reward + ' XP');
        if (GAME.Sound) GAME.Sound.killStreak(2);
        updateRankDisplay();
      }
    }
    saveMissionState();
    updateMissionUI();
  }

  function updateMissionUI() {
    var dailyList = document.getElementById('mission-daily-list');
    var weeklyEl = document.getElementById('mission-weekly');
    if (!dailyList || !weeklyEl) return;
    dailyList.innerHTML = '';
    var slots = ['daily1', 'daily2', 'daily3'];
    for (var i = 0; i < slots.length; i++) {
      var m = activeMissions[slots[i]];
      if (!m) continue;
      var def = getMissionDef(m.id);
      if (!def) continue;
      var card = document.createElement('div');
      card.className = 'mission-card' + (m.completed ? ' completed' : '');
      card.innerHTML =
        '<div class="mission-desc">' + def.desc + '</div>' +
        '<div class="mission-progress">' + m.progress + ' / ' + def.target + '</div>' +
        '<div class="mission-reward">' + (m.completed ? '\u2713' : '+' + def.reward + ' XP') + '</div>';
      dailyList.appendChild(card);
    }
    var wm = activeMissions.weekly;
    if (wm) {
      var wd = getMissionDef(wm.id);
      if (wd) {
        weeklyEl.className = 'mission-card' + (wm.completed ? ' completed' : '');
        weeklyEl.innerHTML =
          '<div class="mission-desc">' + wd.desc + '</div>' +
          '<div class="mission-progress">' + wm.progress + ' / ' + wd.target + '</div>' +
          '<div class="mission-reward">' + (wm.completed ? '\u2713' : '+' + wd.reward + ' XP') + '</div>';
      }
    }
  }

  function updateMissionOverlay() {
    var dailyList = document.getElementById('overlay-mission-daily-list');
    var weeklyEl = document.getElementById('overlay-mission-weekly');
    if (!dailyList || !weeklyEl) return;
    dailyList.innerHTML = '';
    var slots = ['daily1', 'daily2', 'daily3'];
    for (var i = 0; i < slots.length; i++) {
      var m = activeMissions[slots[i]];
      if (!m) continue;
      var def = getMissionDef(m.id);
      if (!def) continue;
      var card = document.createElement('div');
      card.className = 'mission-card' + (m.completed ? ' completed' : '');
      card.innerHTML =
        '<div class="mission-desc">' + def.desc + '</div>' +
        '<div class="mission-progress">' + m.progress + ' / ' + def.target + '</div>' +
        '<div class="mission-reward">' + (m.completed ? '\u2713' : '+' + def.reward + ' XP') + '</div>';
      dailyList.appendChild(card);
    }
    var wm = activeMissions.weekly;
    if (wm) {
      var wd = getMissionDef(wm.id);
      if (wd) {
        weeklyEl.className = 'mission-card' + (wm.completed ? ' completed' : '');
        weeklyEl.innerHTML =
          '<div class="mission-desc">' + wd.desc + '</div>' +
          '<div class="mission-progress">' + wm.progress + ' / ' + wd.target + '</div>' +
          '<div class="mission-reward">' + (wm.completed ? '\u2713' : '+' + wd.reward + ' XP') + '</div>';
      }
    }
  }

  // ── Perk System Functions ──────────────────────────────────
  function hasPerk(perkId) {
    for (var i = 0; i < activePerks.length; i++) {
      if (activePerks[i].id === perkId) return true;
    }
    return false;
  }

  function clearPerks() {
    activePerks = [];
    perkScreenOpen = false;
    updateActivePerkUI();
  }

  function updateActivePerkUI() {
    var container = document.getElementById('active-perks');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < activePerks.length; i++) {
      var el = document.createElement('div');
      el.className = 'active-perk';
      el.innerHTML = '<span class="active-perk-icon">' + activePerks[i].icon + '</span>' + activePerks[i].name;
      container.appendChild(el);
    }
  }

  function offerPerkChoice() {
    if (perkScreenOpen) return;
    perkScreenOpen = true;
    perkChoices = [];
    var available = [];
    for (var i = 0; i < PERK_POOL.length; i++) {
      if (!hasPerk(PERK_POOL[i].id)) available.push(PERK_POOL[i]);
    }
    for (var j = 0; j < 3 && available.length > 0; j++) {
      var idx = Math.floor(Math.random() * available.length);
      perkChoices.push(available[idx]);
      available.splice(idx, 1);
    }
    renderPerkChoices();
    var screen = document.getElementById('perk-screen');
    if (screen) screen.classList.add('show');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function renderPerkChoices() {
    var grid = document.getElementById('perk-choices');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < perkChoices.length; i++) {
      (function(perk) {
        var card = document.createElement('div');
        card.className = 'perk-card';
        card.innerHTML =
          '<div class="perk-icon">' + perk.icon + '</div>' +
          '<div class="perk-name">' + perk.name + '</div>' +
          '<div class="perk-desc">' + perk.desc + '</div>';
        card.addEventListener('click', function() { selectPerk(perk); });
        grid.appendChild(card);
      })(perkChoices[i]);
    }
  }

  function selectPerk(perk) {
    activePerks.push(perk);
    perkScreenOpen = false;
    var screen = document.getElementById('perk-screen');
    if (screen) screen.classList.remove('show');
    updateActivePerkUI();
    if (GAME.Sound) GAME.Sound.buy();
    startRound();
  }

  // Expose hasPerk for other modules
  GAME.hasPerk = hasPerk;

  // ── Initialize ───────────────────────────────────────────
  function init() {
    player = new GAME.Player(camera);
    scene.add(camera);
    weapons = new GAME.WeaponSystem(camera, scene);
    enemyManager = new GAME.EnemyManager(scene);
    GAME.reportPlayerSound = function(pos, radius) {
      if (enemyManager) enemyManager.reportSound(pos, 'footstep', radius);
    };
    if (GAME.Sound) GAME.Sound.init();

    // Apply saved difficulty
    GAME.setDifficulty(selectedDifficulty);
    initModeGrid();
    updateRankDisplay();
    setupInput();

    // Mission system init
    loadMissionState();
    checkMissionRefresh();
    updateMissionUI();
    _updateQuickPlayInfo();
  }

  function initModeGrid() {
    var grid = dom.modeGrid;
    var cards = grid.querySelectorAll('.mode-card');
    var back = dom.modeBack;

    // Populate map buttons for each mode config
    var mapCount = GAME._maps.length;
    var mapGrids = ['comp-map-grid', 'surv-map-grid', 'gg-map-grid', 'dm-config-map-grid'];
    mapGrids.forEach(function(gridId) {
      var el = document.getElementById(gridId);
      if (!el) return;
      var lastMap = parseInt(localStorage.getItem('miniCS_lastMap_' + gridId)) || 0;
      if (lastMap >= mapCount) lastMap = 0;
      el.innerHTML = '';
      for (var i = 0; i < mapCount; i++) {
        var btn = document.createElement('button');
        btn.className = 'config-map-btn' + (i === lastMap ? ' selected' : '');
        btn.dataset.map = i;
        btn.textContent = GAME._maps[i].name;
        el.appendChild(btn);
      }
      // Map button selection + save preference
      el.addEventListener('click', function(e) {
        var btn = e.target.closest('.config-map-btn');
        if (!btn) return;
        el.querySelectorAll('.config-map-btn').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        localStorage.setItem('miniCS_lastMap_' + gridId, btn.dataset.map);
      });
    });

    // Sync difficulty buttons with stored preference
    document.querySelectorAll('.config-diff-btn[data-diff]').forEach(function(btn) {
      btn.classList.toggle('selected', btn.dataset.diff === selectedDifficulty);
    });

    // Difficulty button click handling (all rows)
    // IMPORTANT: .config-diff-row is shared by difficulty AND other option rows (map mode, etc).
    // Always guard with a data-attribute check so clicks on non-difficulty buttons are ignored.
    document.querySelectorAll('.config-diff-row').forEach(function(row) {
      row.addEventListener('click', function(e) {
        var btn = e.target.closest('.config-diff-btn');
        if (!btn || !btn.dataset.diff) return;
        selectedDifficulty = btn.dataset.diff;
        GAME.setDifficulty(selectedDifficulty);
        localStorage.setItem('miniCS_difficulty', selectedDifficulty);
        // Update ALL difficulty rows to stay in sync
        document.querySelectorAll('.config-diff-btn[data-diff]').forEach(function(b) {
          b.classList.toggle('selected', b.dataset.diff === selectedDifficulty);
        });
      });
    });

    // ── Competitive Mode toggle (Solo / Team) ──
    var selectedCompMode = localStorage.getItem('miniCS_compMode') || 'solo';
    var selectedObjective = localStorage.getItem('miniCS_objective') || 'elimination';
    var selectedSide = localStorage.getItem('miniCS_side') || 'ct';

    function updateCompModeUI() {
      // Toggle Solo/Team buttons
      dom.compModeRow.querySelectorAll('.config-diff-btn').forEach(function(b) {
        b.classList.toggle('selected', b.dataset.compMode === selectedCompMode);
      });
      // Show/hide team options
      dom.compTeamOptions.style.display = selectedCompMode === 'team' ? 'block' : 'none';
      // Show/hide team size hints on difficulty buttons
      var hints = document.querySelectorAll('#comp-diff-row .team-size-hint');
      hints.forEach(function(h) { h.style.display = selectedCompMode === 'team' ? 'inline' : 'none'; });
      // Objective buttons
      dom.compObjectiveRow.querySelectorAll('.config-diff-btn').forEach(function(b) {
        b.classList.toggle('selected', b.dataset.objective === selectedObjective);
      });
      // Side buttons
      dom.compSideRow.querySelectorAll('.config-diff-btn').forEach(function(b) {
        b.classList.toggle('selected', b.dataset.side === selectedSide);
      });
      // Map mode buttons (sync all mode panels)
      var mapModeRows = [dom.compMapModeRow, dom.survMapModeRow, dom.ggMapModeRow, dom.dmMapModeRow];
      mapModeRows.forEach(function(row) {
        if (!row) return;
        row.querySelectorAll('.config-diff-btn').forEach(function(b) {
          b.classList.toggle('selected', b.dataset.mapMode === selectedMapMode);
        });
      });
    }

    dom.compModeRow.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-comp-mode]');
      if (!btn) return;
      selectedCompMode = btn.dataset.compMode;
      localStorage.setItem('miniCS_compMode', selectedCompMode);
      updateCompModeUI();
    });

    dom.compObjectiveRow.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-objective]');
      if (!btn) return;
      selectedObjective = btn.dataset.objective;
      localStorage.setItem('miniCS_objective', selectedObjective);
      updateCompModeUI();
    });

    dom.compSideRow.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-side]');
      if (!btn) return;
      selectedSide = btn.dataset.side;
      localStorage.setItem('miniCS_side', selectedSide);
      updateCompModeUI();
    });

    // ── Map Mode toggle (Fixed / Rotate) ──
    [dom.compMapModeRow, dom.survMapModeRow, dom.ggMapModeRow, dom.dmMapModeRow].forEach(function(row) {
      if (!row) return;
      row.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-map-mode]');
        if (!btn) return;
        selectedMapMode = btn.dataset.mapMode;
        localStorage.setItem('miniCS_mapMode', selectedMapMode);
        updateCompModeUI();
      });
    });

    updateCompModeUI();

    // Card click → expand
    cards.forEach(function(card) {
      card.addEventListener('click', function(e) {
        if (grid.classList.contains('expanded')) return;
        if (e.target.closest('button')) return;
        grid.classList.add('expanded');
        card.classList.add('active');
      });
    });

    // Back button → collapse
    back.addEventListener('click', function() {
      grid.classList.remove('expanded');
      cards.forEach(function(c) { c.classList.remove('active'); });
    });

    // Start buttons
    dom.compStartBtn.addEventListener('click', function() {
      var mapEl = document.querySelector('#comp-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      if (selectedCompMode === 'team') {
        teamMode = true;
        teamObjective = selectedObjective;
        playerTeam = selectedSide;
      } else {
        teamMode = false;
      }
      _fadeMenuAndStart(function() { startMatch(mapIdx); });
    });

    dom.survStartBtn.addEventListener('click', function() {
      var mapEl = document.querySelector('#surv-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      _fadeMenuAndStart(function() { startSurvival(mapIdx); });
    });

    dom.ggStartBtn.addEventListener('click', function() {
      var mapEl = document.querySelector('#gg-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      _fadeMenuAndStart(function() { startGunGame(mapIdx); });
    });

    dom.dmStartBtn2.addEventListener('click', function() {
      var mapEl = document.querySelector('#dm-config-map-grid .config-map-btn.selected');
      var mapIdx = mapEl ? parseInt(mapEl.dataset.map) : 0;
      _fadeMenuAndStart(function() { startDeathmatch(mapIdx); });
    });

    // Quick Play button
    if (dom.quickPlayBtn) {
      dom.quickPlayBtn.addEventListener('click', function() {
        var s = _getQuickPlaySettings();
        selectedDifficulty = s.difficulty;
        GAME.setDifficulty(s.difficulty);
        selectedMapMode = s.mapMode;

        _fadeMenuAndStart(function() {
          if (s.mode === 'survival') {
            startSurvival(s.mapIndex);
          } else if (s.mode === 'gungame') {
            startGunGame(s.mapIndex);
          } else if (s.mode === 'deathmatch') {
            startDeathmatch(s.mapIndex);
          } else {
            startMatch(s.mapIndex);
          }
        });
      });
    }

    // Footer link → overlay toggles
    dom.controlsFooter.addEventListener('click', function() {
      dom.controlsOverlay.classList.add('show');
    });
    dom.controlsClose.addEventListener('click', function() {
      dom.controlsOverlay.classList.remove('show');
    });

    // Loadout overlay
    var _loadoutWeapon = 'pistol';
    dom.loadoutFooter.addEventListener('click', function() {
      _loadoutWeapon = 'pistol';
      updateLoadoutUI();
      dom.loadoutOverlay.classList.add('show');
    });
    dom.loadoutClose.addEventListener('click', function() {
      dom.loadoutOverlay.classList.remove('show');
    });

    function updateLoadoutUI() {
      var skinWeapons = ['pistol', 'smg', 'shotgun', 'rifle', 'awp', 'knife'];
      var DEFS = GAME.WEAPON_DEFS;
      var SKINS = GAME.SKIN_DEFS;
      var equipped = weapons ? weapons.getEquippedSkins() : {};
      var xp = parseInt(localStorage.getItem('miniCS_xp')) || 0;

      // Weapon tabs
      var whtml = '';
      for (var w = 0; w < skinWeapons.length; w++) {
        var wk = skinWeapons[w];
        var active = wk === _loadoutWeapon ? ' active' : '';
        whtml += '<button class="loadout-weapon-btn' + active + '" data-loadout-weapon="' + wk + '">' + (DEFS[wk] ? DEFS[wk].name.split(' ')[0] : wk) + '</button>';
      }
      dom.loadoutWeapons.innerHTML = whtml;

      // Skin cards
      var shtml = '';
      for (var id in SKINS) {
        var s = SKINS[id];
        var isEquipped = (equipped[_loadoutWeapon] || 0) == id;
        var locked = s.xp && xp < s.xp;
        var cls = 'skin-card' + (isEquipped ? ' equipped' : '') + (locked ? ' locked' : '');
        shtml += '<div class="' + cls + '" data-skin-id="' + id + '">' +
          s.name + (s.xp ? '<div class="skin-xp">' + (locked ? s.xp + ' XP' : 'Unlocked') + '</div>' : '') +
          '</div>';
      }
      dom.loadoutSkins.innerHTML = shtml;

      // Click handlers
      dom.loadoutWeapons.querySelectorAll('.loadout-weapon-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          _loadoutWeapon = btn.dataset.loadoutWeapon;
          updateLoadoutUI();
        });
      });
      dom.loadoutSkins.querySelectorAll('.skin-card:not(.locked)').forEach(function(card) {
        card.addEventListener('click', function() {
          if (weapons) weapons.setSkin(_loadoutWeapon, parseInt(card.dataset.skinId));
          updateLoadoutUI();
        });
      });
    }

    dom.missionsFooter.addEventListener('click', function() {
      updateMissionOverlay();
      dom.missionsOverlay.classList.add('show');
    });
    dom.missionsClose.addEventListener('click', function() {
      dom.missionsOverlay.classList.remove('show');
    });

    dom.historyFooter.addEventListener('click', function() {
      renderHistory();
      dom.historyPanel.classList.add('show');
    });

    dom.tourFooter.addEventListener('click', function() {
      dom.tourPanel.classList.add('show');
    });

    // ESC key: pause/resume during game, close overlays in menu
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (gameState === PAUSED) { resumeGame(); return; }
        if (gameState === MENU) {
          dom.controlsOverlay.classList.remove('show');
          dom.missionsOverlay.classList.remove('show');
          return;
        }
        pauseGame();
      }
    });
  }

  // ── Pause ──────────────────────────────────────────────
  function pauseGame() {
    if (gameState === PAUSED) return;
    var pausable = (gameState === PLAYING || gameState === BUY_PHASE ||
                    gameState === ROUND_END || gameState === TOURING ||
                    gameState === SURVIVAL_BUY || gameState === SURVIVAL_WAVE ||
                    gameState === GUNGAME_ACTIVE || gameState === DEATHMATCH_ACTIVE);
    if (!pausable) return;
    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    pausedFromState = gameState;
    gameState = PAUSED;
    if (document.pointerLockElement) document.exitPointerLock();
    dom.pauseOverlay.classList.add('show');
  }

  function resumeGame() {
    if (gameState !== PAUSED) return;
    gameState = pausedFromState;
    pausedFromState = null;
    lastTime = 0; // reset dt so no big jump
    dom.pauseOverlay.classList.remove('show');
    renderer.domElement.requestPointerLock();
  }

  function setupInput() {
    document.addEventListener('keydown', function(e) {
      var k = e.key.toLowerCase();

      // Pause toggle
      if (k === 'p') {
        if (gameState === PAUSED) resumeGame();
        else pauseGame();
        return;
      }

      if (gameState === PAUSED) return;

      // Radio menu
      if (k === 'z' && !buyMenuOpen) {
        radioMenuOpen = !radioMenuOpen;
        dom.radioMenu.classList.toggle('show', radioMenuOpen);
        if (radioMenuOpen) {
          if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
          radioAutoCloseTimer = setTimeout(function() {
            radioMenuOpen = false;
            dom.radioMenu.classList.remove('show');
          }, 3000);
        } else {
          if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
        }
        return;
      }

      // Radio command selection
      if (radioMenuOpen && k >= '1' && k <= '6') {
        var idx = parseInt(k) - 1;
        var line = RADIO_LINES[idx];
        if (GAME.Sound && GAME.Sound.radioVoice(line)) {
          addRadioFeed(line);
        }
        radioMenuOpen = false;
        dom.radioMenu.classList.remove('show');
        if (radioAutoCloseTimer) clearTimeout(radioAutoCloseTimer);
        return;
      }

      if (k === '1') weapons.switchTo('knife');
      if (k === '2') {
        if (weapons.owned.smg && weapons.current !== 'smg') weapons.switchTo('smg');
        else weapons.switchTo('pistol');
      }
      if (k === 'r') weapons.startReload();

      // Block weapon switching in gun game (weapon is forced by level)
      if (gameState === GUNGAME_ACTIVE && (k >= '1' && k <= '6')) return;

      // Skip buy phase with F1
      if (k === 'f1' && gameState === BUY_PHASE) {
        e.preventDefault();
        phaseTimer = 0;
      }

      var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY || gameState === DEATHMATCH_ACTIVE || gameState === TOURING);

      if (k === 'b' && isBuyPhase) {
        buyMenuOpen = !buyMenuOpen;
        dom.buyMenu.classList.toggle('show', buyMenuOpen);
        updateBuyMenu();
      }

      if (isBuyPhase && buyMenuOpen) {
        if (k === '2') tryBuy('smg');
        if (k === '3') tryBuy('shotgun');
        if (k === '4') tryBuy('rifle');
        if (k === '5') tryBuy('awp');
        if (k === '6') tryBuy('armor');
        if (k === '7') tryBuy('grenade');
        if (k === '8') tryBuy('smoke');
        if (k === '9') tryBuy('flash');
      } else {
        if (k === '3') weapons.switchTo('shotgun');
        if (k === '4') weapons.switchTo('rifle');
        if (k === '5') weapons.switchTo('awp');
        if (k === '7' || k === 'g') weapons.switchTo('grenade');
        if (k === '8') weapons.switchTo('smoke');
        if (k === '9') weapons.switchTo('flash');
        if (k === 'f') {
          var wdef = GAME.WEAPON_DEFS[weapons.current];
          if (wdef && wdef.isSniper) weapons._toggleScope();
          else weapons._inspecting = true;
        }
      }

      if (k === 'tab') {
        e.preventDefault();
        dom.scoreboard.classList.add('show');
      }
    });

    document.addEventListener('keyup', function(e) {
      var ku = e.key.toLowerCase();
      if (ku === 'tab') dom.scoreboard.classList.remove('show');
      if (ku === 'f' && weapons) weapons._inspecting = false;
    });

    document.querySelectorAll('.buy-item').forEach(function(el) {
      el.addEventListener('click', function() {
        if (el.dataset.weapon) tryBuy(el.dataset.weapon);
        if (el.dataset.item) tryBuy(el.dataset.item);
      });
    });

    dom.restartBtn.addEventListener('click', function() {
      dom.matchEnd.classList.remove('show');
      startMatch();
    });
    dom.menuBtn.addEventListener('click', goToMenu);
    dom.pauseResumeBtn.addEventListener('click', resumeGame);
    dom.pauseMenuBtn.addEventListener('click', function() {
      resumeGame();
      goToMenu();
    });

    dom.historyClose.addEventListener('click', function() {
      dom.historyPanel.classList.remove('show');
    });

    // Tour mode
    dom.tourPanelClose.addEventListener('click', function() {
      dom.tourPanel.classList.remove('show');
    });
    dom.tourExitBtn.addEventListener('click', function() {
      goToMenu();
    });
    document.querySelectorAll('.tour-map-btn:not(.survival-map-btn)').forEach(function(btn) {
      btn.addEventListener('click', function() {
        startTour(parseInt(btn.dataset.map));
      });
    });

    dom.survivalRestartBtn.addEventListener('click', function() {
      dom.survivalEnd.classList.remove('show');
      startSurvival(survivalMapIndex);
    });
    dom.survivalMenuBtn.addEventListener('click', function() {
      dom.survivalEnd.classList.remove('show');
      goToMenu();
    });

    dom.gungameRestartBtn.addEventListener('click', function() {
      dom.gungameEnd.classList.remove('show');
      startGunGame(gungameMapIndex);
    });
    dom.gungameMenuBtn.addEventListener('click', function() {
      dom.gungameEnd.classList.remove('show');
      goToMenu();
    });
    dom.dmRestartBtn.addEventListener('click', function() {
      dom.dmEnd.classList.remove('show');
      startDeathmatch(dmMapIndex);
    });
    dom.dmMenuBtn.addEventListener('click', function() {
      dom.dmEnd.classList.remove('show');
      goToMenu();
    });
  }

  // ── Hit Feedback Helpers ──────────────────────────────────
  function showHitmarker(isHeadshot) {
    dom.hitmarker.classList.toggle('headshot', isHeadshot);
    dom.hitmarker.classList.add('show');
    hitmarkerTimer = 0.15;
    if (GAME.Sound) GAME.Sound.hitmarkerTick();
  }

  function showDamageNumber(point, damage, isHeadshot) {
    var screenPos = point.clone().project(camera);
    var x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    var y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
    // Only show if in front of camera
    if (screenPos.z > 1) return;

    var el = document.createElement('div');
    el.className = 'dmg-number ' + (isHeadshot ? 'headshot' : 'body');
    el.textContent = Math.round(damage);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    dom.dmgContainer.appendChild(el);
    setTimeout(function() { el.remove(); }, 850);
  }

  function checkKillStreak() {
    killStreak++;
    var name = null;
    if (killStreak >= 12) name = STREAK_NAMES[12];
    else if (killStreak >= 8) name = STREAK_NAMES[8];
    else if (killStreak >= 5) name = STREAK_NAMES[5];
    else if (STREAK_NAMES[killStreak]) name = STREAK_NAMES[killStreak];

    if (name) {
      dom.streakAnnounce.textContent = name;
      dom.streakAnnounce.classList.add('show');
      if (streakTimeout) clearTimeout(streakTimeout);
      streakTimeout = setTimeout(function() {
        dom.streakAnnounce.classList.remove('show');
      }, 2000);
      var tier = killStreak >= 12 ? 5 : killStreak >= 8 ? 4 : killStreak >= 5 ? 3 : killStreak - 1;
      if (GAME.Sound) GAME.Sound.killStreak(tier);
    }
    // Mission tracking for streaks
    if (killStreak === 3) trackMissionEvent('triple_kill', 1);
    if (killStreak === 5) trackMissionEvent('rampage', 1);
  }

  function triggerScreenShake(intensity) {
    shakeIntensity = Math.min(shakeIntensity + intensity, 1.5);
    shakeTimer = 0.25;
  }
  GAME.triggerScreenShake = triggerScreenShake;

  function applyScreenShake(dt) {
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      player.pitch += (Math.random() - 0.5) * shakeIntensity * 0.12;
      player.yaw += (Math.random() - 0.5) * shakeIntensity * 0.08;
      shakeIntensity *= 0.85;
    }
  }

  // ── Minimap ───────────────────────────────────────────────
  function cacheMinimapWalls(walls, mapSize) {
    minimapWallSegments = [];
    var mx = mapSize ? mapSize.x : 50;
    var mz = mapSize ? mapSize.z : 50;
    minimapScale = 160 / Math.max(mx, mz);
    minimapCenter = { x: 0, z: 0 };

    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (!w.geometry || !w.geometry.parameters) continue;
      var p = w.geometry.parameters;
      var pos = w.position;
      // Only take walls that are on the ground floor (or close)
      if (pos.y > 6) continue;
      var hw = (p.width || p.radiusTop * 2 || 0.5) / 2;
      var hd = (p.depth || p.radiusTop * 2 || 0.5) / 2;
      minimapWallSegments.push({
        x: pos.x - hw, z: pos.z - hd,
        w: p.width || p.radiusTop * 2 || 0.5,
        d: p.depth || p.radiusTop * 2 || 0.5
      });
    }
  }

  function updateMinimap() {
    if (!minimapCtx) return;
    minimapFrame++;
    if (minimapFrame % 3 !== 0) return;

    var ctx = minimapCtx;
    var cw = 180, ch = 180;
    var cx = cw / 2, cy = ch / 2;
    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(cx, cy, 88, 0, Math.PI * 2);
    ctx.fill();

    var playerYaw = player.yaw;
    var px = player.position.x;
    var pz = player.position.z;
    var sc = minimapScale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerYaw);

    // Draw walls
    ctx.fillStyle = 'rgba(150,150,150,0.4)';
    for (var i = 0; i < minimapWallSegments.length; i++) {
      var seg = minimapWallSegments[i];
      var rx = (seg.x - px) * sc;
      var rz = (seg.z - pz) * sc;
      var rw = seg.w * sc;
      var rd = seg.d * sc;
      ctx.fillRect(rx, rz, rw, rd);
    }

    // Draw enemies (red dots)
    var enemies = enemyManager.enemies;
    var now = performance.now() / 1000;
    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      if (!e.alive) continue;
      // Show if enemy fired recently (within 2s) or in attack/chase state
      var recentlyFired = (now - e.lastFireTime) < 2;
      if (!recentlyFired && e.state === 0) continue; // PATROL and hasn't fired
      var ex = (e.mesh.position.x - px) * sc;
      var ez = (e.mesh.position.z - pz) * sc;
      var dist = Math.sqrt(ex * ex + ez * ez);
      if (dist > 85) continue;
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.arc(ex, ez, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Player triangle (always centered, pointing up)
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  // ── Match / Round Management ─────────────────────────────
  function startMatch(startMapIdx) {
    localStorage.setItem('miniCS_lastMode', 'competitive');
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.matchEnd.classList.remove('show');
    dom.historyPanel.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');

    GAME.setDifficulty(selectedDifficulty);

    playerScore = 0;
    botScore = 0;
    roundNumber = 0;
    startingMapIndex = startMapIdx || 0;
    currentMapIndex = startingMapIndex;
    selectedMapModeForMatch = selectedMapMode;
    matchKills = 0;
    matchDeaths = 0;
    matchHeadshots = 0;
    matchRoundsWon = 0;
    matchShotsFired = 0;
    matchShotsHit = 0;
    matchDamageDealt = 0;
    matchNadesUsed = { he: false, smoke: false, flash: false };
    killStreak = 0;
    player.money = 800;

    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
    weapons.grenadeCount = 0;
    weapons.smokeCount = 0;
    weapons.flashCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();
    player.armor = 0;
    player.helmet = false;

    clearPerks();
    startRound();
  }

  function startRound() {
    roundNumber++;
    if (roundNumber > TOTAL_ROUNDS || playerScore >= 4 || botScore >= 4) {
      endMatch();
      return;
    }

    if (selectedMapModeForMatch === 'rotate') {
      var mapCount = GAME.getMapCount();
      if (mapCount > 1) {
        var newMap;
        do { newMap = Math.floor(Math.random() * mapCount); } while (newMap === currentMapIndex);
        currentMapIndex = newMap;
      }
    }
    // In fixed mode, currentMapIndex stays as set in startMatch
    killStreak = 0;

    scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, currentMapIndex, renderer);
    applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;

    if (teamMode) {
      // Team mode — spawn at team-specific locations
      var mySpawns = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
      player.reset(mySpawns[0]);
    } else {
      player.reset(mapData.playerSpawn);
    }
    if (hasPerk('thick_skin')) player.health = Math.min(125, player.health + 25);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);
    weapons.resetForRound();
    if (GAME.Sound && GAME.Sound.restoreAudio) GAME.Sound.restoreAudio();

    if (teamMode) {
      var teamSize = TEAM_SIZES[selectedDifficulty] || 3;
      var allyCount = teamSize - 1; // player is one member
      var enemyCount = teamSize;
      var mySpawns = playerTeam === 'ct' ? mapData.ctSpawns : mapData.tSpawns;
      var oppSpawns = playerTeam === 'ct' ? mapData.tSpawns : mapData.ctSpawns;
      enemyManager.spawnTeamBots(mySpawns, oppSpawns, mapData.waypoints, mapWalls,
        allyCount, enemyCount, roundNumber, playerTeam);
    } else {
      var botCount = GAME.getDifficulty().botCount;
      enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, roundNumber);
    }

    // Reset bomb state for bomb defusal mode
    if (teamMode && teamObjective === 'bomb') {
      bombPlanted = false;
      bombTimer = 0;
      bombPlantProgress = 0;
      bombDefuseProgress = 0;
      bombPlantedPos = null;
      bombTickTimer = 0;
      bombSites = mapData.bombsites || [];
      if (bombMesh && scene) { scene.remove(bombMesh); bombMesh = null; }
      if (droppedBombMesh && scene) { scene.remove(droppedBombMesh); droppedBombMesh = null; }
      droppedBombPos = null;

      // Assign bomb carrier
      if (playerTeam === 't') {
        playerHasBomb = true;
        bombCarrierBot = null;
      } else {
        playerHasBomb = false;
        // Give bomb to a random T-side bot
        var tBots = enemyManager.getAliveOfTeam('t');
        bombCarrierBot = tBots.length > 0 ? tBots[Math.floor(Math.random() * tBots.length)] : null;
      }

      // Build bombsite markers
      buildBombsiteMarkers(scene, bombSites);

      dom.bombHud.style.display = 'block';
      dom.bombTimerDisplay.textContent = '';
      dom.bombActionHint.textContent = '';
      dom.bombProgressWrap.style.display = 'none';
    } else {
      dom.bombHud.style.display = 'none';
    }

    spawnBirds(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);

    cacheMinimapWalls(mapWalls, mapData.size);

    gameState = BUY_PHASE;
    phaseTimer = BUY_PHASE_TIME;
    roundTimer = ROUND_TIME;

    updateHUD();
    if (teamMode) {
      var sideLabel = playerTeam === 'ct' ? 'Counter-Terrorist' : 'Terrorist';
      showAnnouncement('ROUND ' + roundNumber, sideLabel + ' — ' + mapData.name);
    } else {
      showAnnouncement('ROUND ' + roundNumber, 'Map: ' + mapData.name);
    }

    dom.roundInfo.textContent = 'Round ' + roundNumber + ' / ' + TOTAL_ROUNDS;
    dom.mapInfo.textContent = 'Map: ' + mapData.name;

    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
  }

  // ── Bomb Defusal Helpers ────────────────────────────────

  function buildBombsiteMarkers(scene, sites) {
    if (!sites) return;
    for (var i = 0; i < sites.length; i++) {
      var site = sites[i];
      // Glowing ring on the ground
      var ringGeo = new THREE.CylinderGeometry(site.radius, site.radius, 0.05, 32);
      var ringMat = new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.25, roughness: 0.5
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(site.x, 0.03, site.z);
      scene.add(ring);

      // Floating letter marker (simple box arrangement)
      var letterMat = new THREE.MeshStandardMaterial({
        color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.5
      });
      var letterBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.1), letterMat);
      letterBox.position.set(site.x, 3.5, site.z);
      scene.add(letterBox);

      // Subtle point light at site
      var light = new THREE.PointLight(0xff4400, 0.3, 8);
      light.position.set(site.x, 2, site.z);
      scene.add(light);
    }
  }

  function isNearBombsite(pos) {
    for (var i = 0; i < bombSites.length; i++) {
      var s = bombSites[i];
      var dx = pos.x - s.x, dz = pos.z - s.z;
      if (Math.sqrt(dx * dx + dz * dz) <= s.radius) return s;
    }
    return null;
  }

  function createPlantedBomb(pos) {
    var group = new THREE.Group();
    // Bomb body
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), bodyMat);
    body.position.y = 0.125;
    group.add(body);
    // Blinking light
    var lightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
    var lightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lightMat);
    lightMesh.position.set(0, 0.3, 0);
    group.add(lightMesh);
    group.position.set(pos.x, 0, pos.z);
    group._blinkLight = lightMesh;
    group._blinkMat = lightMat;
    group._blinkTimer = 0;
    return group;
  }

  function createDroppedBomb(pos) {
    var mat = new THREE.MeshStandardMaterial({ color: 0x555500, emissive: 0x332200, emissiveIntensity: 0.3, roughness: 0.5 });
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), mat);
    mesh.position.set(pos.x, 0.125, pos.z);
    return mesh;
  }

  function updateBombLogic(dt) {
    if (!teamMode || teamObjective !== 'bomb' || gameState !== PLAYING) return;

    var ppos = player.position;

    // Handle dropped bomb pickup (T-side player walks over it)
    if (droppedBombPos && playerTeam === 't' && player.alive && !playerHasBomb) {
      var dx = ppos.x - droppedBombPos.x, dz = ppos.z - droppedBombPos.z;
      if (Math.sqrt(dx * dx + dz * dz) < 2) {
        playerHasBomb = true;
        if (droppedBombMesh) { scene.remove(droppedBombMesh); droppedBombMesh = null; }
        droppedBombPos = null;
        dom.bombActionHint.textContent = 'You picked up the bomb';
        setTimeout(function() { if (dom.bombActionHint.textContent === 'You picked up the bomb') dom.bombActionHint.textContent = ''; }, 2000);
      }
    }

    // Bot bomb carrier death — drop the bomb
    if (bombCarrierBot && !bombCarrierBot.alive && !bombPlanted) {
      droppedBombPos = { x: bombCarrierBot.mesh.position.x, z: bombCarrierBot.mesh.position.z };
      droppedBombMesh = createDroppedBomb(droppedBombPos);
      scene.add(droppedBombMesh);
      bombCarrierBot = null;
      if (GAME.Sound) GAME.Sound.announcer('Bomb carrier down');
    }

    if (!bombPlanted) {
      // ── PRE-PLANT PHASE ──

      // Show plant hint for T-side player with bomb
      if (playerTeam === 't' && playerHasBomb && player.alive) {
        var nearSite = isNearBombsite(ppos);
        if (nearSite) {
          dom.bombActionHint.textContent = 'Hold E to plant — Site ' + nearSite.name;
          if (player.keys && player.keys.e) {
            bombPlantProgress += dt / BOMB_PLANT_TIME;
            dom.bombProgressWrap.style.display = 'block';
            dom.bombProgressWrap.className = 'planting';
            dom.bombProgressBar.style.width = (bombPlantProgress * 100) + '%';
            if (bombPlantProgress >= 1) {
              // Bomb planted!
              bombPlanted = true;
              bombTimer = BOMB_FUSE_TIME;
              bombPlantedPos = { x: ppos.x, z: ppos.z };
              bombMesh = createPlantedBomb(bombPlantedPos);
              scene.add(bombMesh);
              playerHasBomb = false;
              bombPlantProgress = 0;
              dom.bombProgressWrap.style.display = 'none';
              dom.bombActionHint.textContent = '';
              if (GAME.Sound) GAME.Sound.bombPlant();
              if (GAME.Sound) GAME.Sound.announcer('Bomb has been planted');
              // T team gets plant bonus
              if (playerTeam === 't') player.money = Math.min(16000, player.money + 800);
            }
          } else {
            bombPlantProgress = 0;
            dom.bombProgressWrap.style.display = 'none';
          }
        } else {
          dom.bombActionHint.textContent = playerHasBomb ? 'Go to a bombsite to plant' : '';
          bombPlantProgress = 0;
          dom.bombProgressWrap.style.display = 'none';
        }
      }

      // Bot bomb carrier AI — move toward nearest bombsite and auto-plant
      if (bombCarrierBot && bombCarrierBot.alive) {
        var botPos = bombCarrierBot.mesh.position;
        var nearSite = isNearBombsite(botPos);
        if (nearSite) {
          // Bot is at bombsite — auto-plant over time
          bombPlantProgress += dt / BOMB_PLANT_TIME;
          if (bombPlantProgress >= 1) {
            bombPlanted = true;
            bombTimer = BOMB_FUSE_TIME;
            bombPlantedPos = { x: botPos.x, z: botPos.z };
            bombMesh = createPlantedBomb(bombPlantedPos);
            scene.add(bombMesh);
            bombCarrierBot = null;
            bombPlantProgress = 0;
            if (GAME.Sound) GAME.Sound.bombPlant();
            if (GAME.Sound) GAME.Sound.announcer('Bomb has been planted');
          }
        } else {
          // Move carrier bot toward nearest bombsite
          bombPlantProgress = 0;
          if (bombSites.length > 0) {
            var nearest = bombSites[0];
            var nd = Infinity;
            for (var si = 0; si < bombSites.length; si++) {
              var sdx = botPos.x - bombSites[si].x, sdz = botPos.z - bombSites[si].z;
              var sd = sdx * sdx + sdz * sdz;
              if (sd < nd) { nd = sd; nearest = bombSites[si]; }
            }
            // Override patrol target to bombsite
            bombCarrierBot._investigatePos = { x: nearest.x, z: nearest.z };
            bombCarrierBot._investigateTimer = 0;
            bombCarrierBot._lookAroundTimer = 999;
            if (bombCarrierBot.state === 0) bombCarrierBot.state = 3; // INVESTIGATE
          }
        }
      }

    } else {
      // ── POST-PLANT PHASE ──

      // Countdown
      bombTimer -= dt;

      // Bomb ticking sound
      bombTickTimer -= dt;
      var tickInterval = bombTimer > 10 ? 1.0 : bombTimer > 5 ? 0.5 : 0.2;
      if (bombTickTimer <= 0) {
        if (GAME.Sound) GAME.Sound.bombTick(bombTimer);
        bombTickTimer = tickInterval;
      }

      // Blink planted bomb light
      if (bombMesh && bombMesh._blinkLight) {
        bombMesh._blinkTimer += dt;
        var blinkRate = bombTimer > 10 ? 1.0 : bombTimer > 5 ? 0.5 : 0.2;
        var on = Math.sin(bombMesh._blinkTimer / blinkRate * Math.PI) > 0;
        bombMesh._blinkMat.emissiveIntensity = on ? 1.0 : 0.1;
      }

      // Display timer
      var secs = Math.ceil(bombTimer);
      dom.bombTimerDisplay.textContent = 'BOMB: ' + (secs > 0 ? secs + 's' : 'DETONATING');
      dom.bombTimerDisplay.style.color = bombTimer <= 10 ? '#ff0000' : '#ff4444';

      // Defuse logic — CT player near planted bomb
      if (playerTeam === 'ct' && player.alive && bombPlantedPos) {
        var ddx = ppos.x - bombPlantedPos.x, ddz = ppos.z - bombPlantedPos.z;
        if (Math.sqrt(ddx * ddx + ddz * ddz) < 3.5) {
          dom.bombActionHint.textContent = 'Hold E to defuse';
          if (player.keys && player.keys.e) {
            bombDefuseProgress += dt / BOMB_DEFUSE_TIME;
            dom.bombProgressWrap.style.display = 'block';
            dom.bombProgressWrap.className = 'defusing';
            dom.bombProgressBar.style.width = (bombDefuseProgress * 100) + '%';
            if (bombDefuseProgress >= 1) {
              // Bomb defused!
              bombPlanted = false;
              bombDefuseProgress = 0;
              dom.bombProgressWrap.style.display = 'none';
              dom.bombTimerDisplay.textContent = '';
              dom.bombActionHint.textContent = '';
              if (bombMesh) { scene.remove(bombMesh); bombMesh = null; }
              if (GAME.Sound) GAME.Sound.bombDefuse();
              if (GAME.Sound) GAME.Sound.announcer('Bomb has been defused');
              player.money = Math.min(16000, player.money + 500);
              endRound(true); // CT wins
              return;
            }
          } else {
            bombDefuseProgress = 0;
            dom.bombProgressWrap.style.display = 'none';
          }
        } else {
          dom.bombActionHint.textContent = '';
          bombDefuseProgress = 0;
          dom.bombProgressWrap.style.display = 'none';
        }
      }

      // Bomb detonation
      if (bombTimer <= 0) {
        bombPlanted = false;
        dom.bombTimerDisplay.textContent = '';
        dom.bombActionHint.textContent = '';
        dom.bombProgressWrap.style.display = 'none';
        if (bombMesh) { scene.remove(bombMesh); bombMesh = null; }
        // Explosion effect at bomb site
        if (GAME.Sound) GAME.Sound.grenadeExplode();
        // T wins
        endRound(playerTeam === 't');
        return;
      }
    }
  }

  function endRound(playerWon) {
    // Clean up bomb HUD
    dom.bombHud.style.display = 'none';
    bombPlantProgress = 0;
    bombDefuseProgress = 0;

    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    gameState = ROUND_END;
    phaseTimer = ROUND_END_TIME;
    lastRoundWon = playerWon;

    if (playerWon) {
      playerScore++;
      matchRoundsWon++;
      player.money = Math.min(16000, player.money + 3000);
      showAnnouncement('ROUND WIN', '+$3000');
      if (GAME.Sound) GAME.Sound.roundWin();
      if (teamMode) {
        var winTeamName = playerTeam === 'ct' ? 'Counter-terrorists' : 'Terrorists';
        if (GAME.Sound) GAME.Sound.announcer(winTeamName + ' win');
      } else {
        if (GAME.Sound) GAME.Sound.announcer('Counter-terrorists win');
      }

      // Mission tracking for round wins
      if (!weapons.owned.shotgun && !weapons.owned.rifle && !weapons.owned.awp) trackMissionEvent('pistol_win', 1);
      if (player.health >= 100) trackMissionEvent('no_damage_win', 1);
    } else {
      botScore++;
      player.money = Math.min(16000, player.money + 1400);
      showAnnouncement(player.alive ? 'TIME UP' : 'YOU DIED', '+$1400');
      if (GAME.Sound) GAME.Sound.roundLose();
      if (teamMode) {
        var loseTeamName = playerTeam === 'ct' ? 'Terrorists' : 'Counter-terrorists';
        if (GAME.Sound) GAME.Sound.announcer(loseTeamName + ' win');
      } else {
        if (GAME.Sound) GAME.Sound.announcer('Terrorists win');
      }
    }

    killStreak = 0;
    updateScoreboard();
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  function endMatch() {
    radioMenuOpen = false;
    dom.radioMenu.classList.remove('show');
    if (GAME.Sound) GAME.Sound.stopAmbient();
    gameState = MATCH_END;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var result = playerScore > botScore ? 'VICTORY' : playerScore < botScore ? 'DEFEAT' : 'DRAW';
    dom.matchResult.textContent = result;
    dom.matchResult.style.color = playerScore > botScore ? '#4caf50' : playerScore < botScore ? '#ef5350' : '#fff';
    dom.finalScore.textContent = playerScore + ' \u2014 ' + botScore;

    // Mission tracking for match end
    if (playerScore > botScore) trackMissionEvent('weekly_wins', 1);
    trackMissionEvent('money_earned', player.money - 800);
    var endAccuracy = matchShotsFired > 0 ? (matchShotsHit / matchShotsFired * 100) : 0;
    if (endAccuracy >= 60) trackMissionEvent('high_accuracy', 1);

    // XP calculation
    var isWin = playerScore > botScore;
    var diffMult = DIFF_XP_MULT[selectedDifficulty] || 1;
    var xpEarned = calculateXP(matchKills, matchHeadshots, matchRoundsWon, isWin, diffMult);
    var rankResult = awardXP(xpEarned);

    // Show stats + XP breakdown
    var accuracy = matchShotsFired > 0 ? Math.round(matchShotsHit / matchShotsFired * 100) : 0;
    var hsPercent = matchKills > 0 ? Math.round(matchHeadshots / matchKills * 100) : 0;

    dom.matchXpBreakdown.innerHTML =
      '<div style="display:flex;justify-content:space-around;margin-bottom:10px;font-size:13px;color:#aaa;">' +
        '<div><span style="color:#fff;font-size:18px;">' + matchKills + ' / ' + matchDeaths + '</span><br>K / D</div>' +
        '<div><span style="color:#fff;font-size:18px;">' + accuracy + '%</span><br>Accuracy</div>' +
        '<div><span style="color:#fff;font-size:18px;">' + hsPercent + '%</span><br>HS %</div>' +
        '<div><span style="color:#fff;font-size:18px;">' + matchDamageDealt + '</span><br>Damage</div>' +
      '</div>' +
      '<div class="xp-line"><span>Kills (' + matchKills + ')</span><span class="xp-val">+' + (matchKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + matchHeadshots + ')</span><span class="xp-val">+' + (matchHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>Rounds Won (' + matchRoundsWon + ')</span><span class="xp-val">+' + (matchRoundsWon * 20) + '</span></div>' +
      (isWin ? '<div class="xp-line"><span>Match Win</span><span class="xp-val">+50</span></div>' : '') +
      '<div class="xp-line"><span>Difficulty (' + selectedDifficulty + ')</span><span class="xp-val">x' + diffMult + '</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.matchEnd.classList.add('show');

    if (GAME.Sound && playerScore > botScore) GAME.Sound.mvpSting();

    saveMatchHistory(result, xpEarned);
    updateRankDisplay();
  }

  // ── Gun Game Mode ─────────────────────────────────────────
  function startGunGame(mapIndex) {
    localStorage.setItem('miniCS_lastMode', 'gungame');
    teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.gungameEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');

    gungameMapIndex = mapIndex;
    gungameLevel = 0;
    gungameKills = 0;
    gungameDeaths = 0;
    gungameHeadshots = 0;
    gungameStartTime = performance.now() / 1000;
    gungameRespawnQueue = [];
    killStreak = 0;
    player.money = 0;

    GAME.setDifficulty(selectedDifficulty);

    // Build map
    scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, gungameMapIndex, renderer);
    applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;
    gungameLastMapData = mapData;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    // Force knife as starting weapon
    weapons.forceWeapon('knife');

    // Spawn bots
    var botCount = GUNGAME_BOT_COUNT;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, 3);

    spawnBirds(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    cacheMinimapWalls(mapWalls, mapData.size);

    gameState = GUNGAME_ACTIVE;

    // HUD setup for gun game
    dom.moneyDisplay.style.display = 'none';
    dom.gungameLevel.classList.add('show');
    dom.roundInfo.textContent = 'GUN GAME';
    updateGunGameLevelHUD();

    showAnnouncement('GUN GAME', 'Get a kill with each weapon!');
    if (GAME.Sound) GAME.Sound.roundStart();
    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
  }

  function updateGunGameLevelHUD() {
    dom.gungameLevel.textContent = 'LEVEL ' + (gungameLevel + 1) + '/6 \u2014 ' + GUNGAME_NAMES[gungameLevel];
  }

  function advanceGunGameLevel() {
    gungameLevel++;
    if (gungameLevel >= GUNGAME_WEAPONS.length) {
      endGunGame();
      return;
    }
    var weaponId = GUNGAME_WEAPONS[gungameLevel];
    weapons.forceWeapon(weaponId);
    updateGunGameLevelHUD();

    if (gungameLevel === GUNGAME_WEAPONS.length - 1) {
      showAnnouncement('FINAL WEAPON', 'Get a knife kill to win!');
    } else {
      showAnnouncement('LEVEL ' + (gungameLevel + 1), GUNGAME_NAMES[gungameLevel]);
    }
    if (GAME.Sound) GAME.Sound.switchWeapon();
  }

  function gunGamePlayerDied() {
    gungameDeaths++;
    // Instant respawn: reset player at spawn, keep current weapon level
    var mapData = gungameLastMapData;
    player.reset(mapData.playerSpawn);
    player.armor = 0;
    player.helmet = false;
    player.setWalls(mapWalls);
    weapons.cleanupDroppedWeapon();
    weapons.forceWeapon(GUNGAME_WEAPONS[gungameLevel]);
    killStreak = 0;
  }

  function gunGameQueueBotRespawn(enemy) {
    // Remove the dead enemy mesh
    enemy.destroy();
    // Find a far spawn point from player
    var mapData = gungameLastMapData;
    var wps = mapData.waypoints;
    var px = player.position.x, pz = player.position.z;
    var bestWP = wps[0], bestDist = 0;
    for (var i = 0; i < wps.length; i++) {
      var dx = wps[i].x - px, dz = wps[i].z - pz;
      var d = dx * dx + dz * dz;
      if (d > bestDist) { bestDist = d; bestWP = wps[i]; }
    }
    var angle = Math.random() * Math.PI * 2;
    var offset = 1 + Math.random() * 3;
    var spawnPos = { x: bestWP.x + Math.cos(angle) * offset, z: bestWP.z + Math.sin(angle) * offset };
    gungameRespawnQueue.push({ timer: GUNGAME_BOT_RESPAWN_DELAY, spawnPos: spawnPos, id: enemy.id });
  }

  function updateGunGameRespawns(dt) {
    for (var i = gungameRespawnQueue.length - 1; i >= 0; i--) {
      gungameRespawnQueue[i].timer -= dt;
      if (gungameRespawnQueue[i].timer <= 0) {
        var entry = gungameRespawnQueue.splice(i, 1)[0];
        var mapData = gungameLastMapData;
        var newEnemy = new GAME._Enemy(
          scene, entry.spawnPos, mapData.waypoints, mapWalls, entry.id, 3
        );
        enemyManager.enemies.push(newEnemy);
      }
    }
  }

  function endGunGame() {
    if (GAME.Sound) GAME.Sound.stopAmbient();
    gameState = GUNGAME_END;
    dom.hud.style.display = 'none';
    dom.moneyDisplay.style.display = '';
    dom.gungameLevel.classList.remove('show');
    if (document.pointerLockElement) document.exitPointerLock();

    var elapsed = (performance.now() / 1000) - gungameStartTime;
    var mins = Math.floor(elapsed / 60);
    var secs = Math.floor(elapsed % 60);
    var timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;

    // Save best time
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[gungameMapIndex] || 'dust';
    setGunGameBest(mapName, elapsed);

    dom.gungameTimeResult.textContent = 'Time: ' + timeStr;
    dom.gungameStatsDisplay.textContent = gungameKills + ' Kills | ' + gungameDeaths + ' Deaths | ' + gungameHeadshots + ' Headshots';

    // XP calculation: (kills * 10 + headshots * 5 + (6 - deaths) * 10) * diffMult * 0.8
    var diffMult = DIFF_XP_MULT[selectedDifficulty] || 1;
    var deathBonus = Math.max(0, 6 - gungameDeaths) * 10;
    var timeBonus = elapsed < 180 ? 50 : 0;
    var rawXP = gungameKills * 10 + gungameHeadshots * 5 + deathBonus + timeBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.8);
    var rankResult = awardXP(xpEarned);

    dom.gungameXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + gungameKills + ')</span><span class="xp-val">+' + (gungameKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + gungameHeadshots + ')</span><span class="xp-val">+' + (gungameHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>Low Deaths Bonus</span><span class="xp-val">+' + deathBonus + '</span></div>' +
      (timeBonus ? '<div class="xp-line"><span>Speed Bonus (&lt;3 min)</span><span class="xp-val">+' + timeBonus + '</span></div>' : '') +
      '<div class="xp-line"><span>Difficulty (' + selectedDifficulty + ')</span><span class="xp-val">x' + diffMult + '</span></div>' +
      '<div class="xp-line"><span>Gun Game multiplier</span><span class="xp-val">x0.8</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.gungameEnd.classList.add('show');
    updateRankDisplay();

    // Mission tracking
    trackMissionEvent('gungame_complete', 1);
    if (elapsed < 180) trackMissionEvent('gungame_fast', 1);

    showAnnouncement('GUN GAME COMPLETE', timeStr);
  }

  // ── Deathmatch Mode ─────────────────────────────────────
  function startDeathmatch(mapIndex) {
    localStorage.setItem('miniCS_lastMode', 'deathmatch');
    teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.dmEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');
    dom.gungameLevel.classList.remove('show');

    dmMapIndex = mapIndex;
    dmKills = 0;
    dmDeaths = 0;
    dmHeadshots = 0;
    dmTimer = DEATHMATCH_TIME_LIMIT;
    dmStartTime = performance.now() / 1000;
    dmRespawnQueue = [];
    dmPlayerDeadTimer = 0;
    dmSpawnProtection = 0;
    killStreak = 0;
    matchKills = 0;
    matchDeaths = 0;
    matchHeadshots = 0;
    matchShotsFired = 0;
    matchShotsHit = 0;
    matchDamageDealt = 0;
    player.money = 800;

    GAME.setDifficulty(selectedDifficulty);

    // Build map
    scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, dmMapIndex, renderer);
    applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;
    dmLastMapData = mapData;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    // Start with pistol + knife
    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
    weapons.grenadeCount = 0;
    weapons.smokeCount = 0;
    weapons.flashCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Spawn bots
    var diff = GAME.getDifficulty();
    var botCount = diff.botCount || 3;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, 3);

    spawnBirds(mapData.size ? Math.max(mapData.size.x, mapData.size.z) : 50);
    cacheMinimapWalls(mapWalls, mapData.size);

    gameState = DEATHMATCH_ACTIVE;

    // HUD setup
    dom.moneyDisplay.style.display = '';
    dom.dmKillCounter.style.display = 'block';
    dom.dmRespawnTimer.style.display = 'none';
    dom.roundInfo.textContent = 'DEATHMATCH';
    updateDMKillCounter();

    showAnnouncement('DEATHMATCH', 'First to ' + DEATHMATCH_KILL_TARGET + ' kills!');
    if (GAME.Sound) GAME.Sound.roundStart();
    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
  }

  function updateDMKillCounter() {
    var mins = Math.floor(dmTimer / 60);
    var secs = Math.floor(dmTimer % 60);
    dom.dmKillCounter.textContent = 'KILLS: ' + dmKills + ' / ' + DEATHMATCH_KILL_TARGET + '  |  ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
    dom.roundTimer.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function dmPlayerDied() {
    dmDeaths++;
    matchDeaths++;
    dmPlayerDeadTimer = DEATHMATCH_PLAYER_RESPAWN_DELAY;
    dom.dmRespawnTimer.style.display = 'block';
  }

  function dmPlayerRespawn() {
    // Pick spawn furthest from enemies
    var mapData = dmLastMapData;
    var spawns = mapData.botSpawns.concat([mapData.playerSpawn]);
    var bestSpawn = mapData.playerSpawn;
    var bestMinDist = 0;

    for (var s = 0; s < spawns.length; s++) {
      var minDist = Infinity;
      for (var e = 0; e < enemyManager.enemies.length; e++) {
        var en = enemyManager.enemies[e];
        var dx = spawns[s].x - en.mesh.position.x;
        var dz = spawns[s].z - en.mesh.position.z;
        var d = dx * dx + dz * dz;
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestSpawn = spawns[s];
      }
    }

    player.reset(bestSpawn);
    player.setWalls(mapWalls);
    weapons.cleanupDroppedWeapon();
    weapons._createWeaponModel();
    weapons.resetAmmo();
    killStreak = 0;
    dmSpawnProtection = 1.5;
    if (GAME.Sound && GAME.Sound.restoreAudio) GAME.Sound.restoreAudio();
    dmPlayerDeadTimer = 0;
    dom.dmRespawnTimer.style.display = 'none';
  }

  function dmQueueBotRespawn(enemy) {
    enemy.destroy();
    var mapData = dmLastMapData;
    var wps = mapData.waypoints;
    var px = player.position.x, pz = player.position.z;
    var bestWP = wps[0], bestDist = 0;
    for (var i = 0; i < wps.length; i++) {
      var dx = wps[i].x - px, dz = wps[i].z - pz;
      var d = dx * dx + dz * dz;
      if (d > bestDist) { bestDist = d; bestWP = wps[i]; }
    }
    var angle = Math.random() * Math.PI * 2;
    var offset = 1 + Math.random() * 3;
    var spawnPos = { x: bestWP.x + Math.cos(angle) * offset, z: bestWP.z + Math.sin(angle) * offset };

    // Determine weapon based on elapsed time
    var elapsed = (performance.now() / 1000) - dmStartTime;
    var roundNum = elapsed < 60 ? 1 : elapsed < 120 ? 3 : 5;

    dmRespawnQueue.push({ timer: DEATHMATCH_BOT_RESPAWN_DELAY, spawnPos: spawnPos, id: enemy.id, roundNum: roundNum });
  }

  function updateDMRespawns(dt) {
    for (var i = dmRespawnQueue.length - 1; i >= 0; i--) {
      dmRespawnQueue[i].timer -= dt;
      if (dmRespawnQueue[i].timer <= 0) {
        var entry = dmRespawnQueue.splice(i, 1)[0];
        var mapData = dmLastMapData;
        var newEnemy = new GAME._Enemy(
          scene, entry.spawnPos, mapData.waypoints, mapWalls, entry.id, entry.roundNum
        );
        enemyManager.enemies.push(newEnemy);
      }
    }
  }

  function endDeathmatch() {
    if (GAME.Sound) GAME.Sound.stopAmbient();
    gameState = DEATHMATCH_END;
    dom.hud.style.display = 'none';
    dom.dmKillCounter.style.display = 'none';
    dom.dmRespawnTimer.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var elapsed = (performance.now() / 1000) - dmStartTime;
    var mins = Math.floor(elapsed / 60);
    var secs = Math.floor(elapsed % 60);
    var timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;

    // Save best
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[dmMapIndex] || 'dust';
    setDMBest(mapName, dmKills);

    // Mission tracking for DM end
    var dmEndAccuracy = matchShotsFired > 0 ? (matchShotsHit / matchShotsFired * 100) : 0;
    if (dmEndAccuracy >= 60) trackMissionEvent('high_accuracy', 1);

    var kd = dmDeaths > 0 ? (dmKills / dmDeaths).toFixed(2) : dmKills.toFixed(2);
    dom.dmKillResult.textContent = dmKills + ' Kills in ' + timeStr;
    dom.dmStatsDisplay.textContent = dmDeaths + ' Deaths | K/D: ' + kd + ' | ' + dmHeadshots + ' Headshots';

    // XP
    var diffMult = DIFF_XP_MULT[selectedDifficulty] || 1;
    var kdBonus = Math.max(0, Math.floor((dmKills - dmDeaths) * 5));
    var rawXP = dmKills * 10 + dmHeadshots * 5 + kdBonus;
    var xpEarned = Math.round(rawXP * diffMult * 0.7);
    var rankResult = awardXP(xpEarned);

    dom.dmXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + dmKills + ')</span><span class="xp-val">+' + (dmKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + dmHeadshots + ')</span><span class="xp-val">+' + (dmHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>K/D Bonus</span><span class="xp-val">+' + kdBonus + '</span></div>' +
      '<div class="xp-line"><span>Difficulty (' + selectedDifficulty + ')</span><span class="xp-val">x' + diffMult + '</span></div>' +
      '<div class="xp-line"><span>DM multiplier</span><span class="xp-val">x0.7</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.dmEnd.classList.add('show');
    updateRankDisplay();

    if (dmKills >= DEATHMATCH_KILL_TARGET) {
      showAnnouncement('VICTORY', dmKills + ' kills!');
    } else {
      showAnnouncement('TIME UP', dmKills + ' kills');
    }
  }

  function goToMenu() {
    gameState = MENU;
    dom.matchEnd.classList.remove('show');
    dom.survivalEnd.classList.remove('show');
    dom.gungameEnd.classList.remove('show');
    dom.dmEnd.classList.remove('show');
    dom.dmKillCounter.style.display = 'none';
    dom.dmRespawnTimer.style.display = 'none';
    dom.hud.style.display = 'none';
    dom.hud.classList.remove('tour-mode');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';
    dom.waveCounter.classList.remove('show');
    dom.gungameLevel.classList.remove('show');
    dom.moneyDisplay.style.display = '';
    dom.menuScreen.classList.remove('hidden');
    // Collapse mode grid if expanded
    dom.modeGrid.classList.remove('expanded');
    dom.modeGrid.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('active'); });
    // Close overlays
    dom.controlsOverlay.classList.remove('show');
    dom.missionsOverlay.classList.remove('show');
    if (GAME.Sound) GAME.Sound.stopAmbient();
    if (document.pointerLockElement) document.exitPointerLock();
    updateRankDisplay();
    updateMissionUI();
    _updateQuickPlayInfo();
    _buildMenuScene();
  }

  function startTour(mapIndex) {
    dom.tourPanel.classList.remove('show');
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.add('tour-mode');
    dom.tourExitBtn.style.display = 'block';

    scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, mapIndex, renderer);
    applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    player.money = 1000000;
    weapons.owned = { knife: true, pistol: true, shotgun: true, rifle: true, awp: true, grenade: false };
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    spawnBirds(Math.max(mapData.size.x, mapData.size.z));


    dom.tourMapLabel.textContent = 'Tour: ' + mapData.name;
    dom.tourMapLabel.style.display = 'block';

    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
    gameState = TOURING;
  }

  // ── Survival Mode ─────────────────────────────────────────
  function updateSurvivalBestDisplay() {
    var best = getSurvivalBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': Wave ' + best[mapNames[i]]);
    }
    if (dom.survivalBestDisplay) dom.survivalBestDisplay.textContent = parts.length > 0 ? 'BEST — ' + parts.join(' | ') : 'No records yet';
  }

  function startSurvival(mapIndex) {
    localStorage.setItem('miniCS_lastMode', 'survival');
    teamMode = false;
    dom.menuScreen.classList.add('hidden');
    dom.hud.style.display = 'block';
    dom.hud.classList.remove('tour-mode');
    dom.survivalEnd.classList.remove('show');
    dom.tourExitBtn.style.display = 'none';
    dom.tourMapLabel.style.display = 'none';

    survivalMapIndex = mapIndex;
    survivalWave = 0;
    survivalKills = 0;
    survivalHeadshots = 0;
    killStreak = 0;
    player.money = 800;

    weapons.owned = { knife: true, pistol: true, shotgun: false, rifle: false, awp: false, grenade: false, smoke: false, flash: false };
    weapons.grenadeCount = 0;
    weapons.smokeCount = 0;
    weapons.flashCount = 0;
    weapons.current = 'pistol';
    weapons.resetAmmo();
    weapons._createWeaponModel();

    // Build map
    scene = new THREE.Scene();

    for (var bhi = 0; bhi < bulletHoles.length; bhi++) bulletHoles[bhi].mat.dispose();
    bulletHoles.length = 0;
    _dustParticles.length = 0;
    weapons.scene = scene;
    enemyManager.scene = scene;
    scene.add(camera);

    var mapData = GAME.buildMap(scene, survivalMapIndex, renderer);
    applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }
    mapWalls = mapData.walls;
    survivalLastMapData = mapData;

    player.reset(mapData.playerSpawn);
    player.setWalls(mapWalls);
    weapons.setWallsRef(mapWalls);

    spawnBirds(Math.max(mapData.size.x, mapData.size.z));

    cacheMinimapWalls(mapWalls, mapData.size);

    dom.waveCounter.classList.add('show');
    dom.roundInfo.textContent = '';
    if (GAME.Sound) { GAME.Sound.startAmbient(mapData.name); if (GAME.Sound.initReverb) GAME.Sound.initReverb(mapData.name); }
    startSurvivalWave();
  }

  function startSurvivalWave() {
    survivalWave++;
    killStreak = 0;

    // Calculate wave difficulty
    var botCount = Math.min(8, 1 + Math.floor(survivalWave * 0.7));
    var waveHP = 20 + survivalWave * 12;
    var waveSpeed = Math.min(14, 5 + survivalWave * 0.5);
    var waveAccuracy = Math.min(0.9, 0.25 + survivalWave * 0.04);
    var waveDamage = 8 + survivalWave * 2;
    var waveFireRate = Math.min(5, 1.5 + survivalWave * 0.3);

    // Set temporary difficulty for this wave
    GAME.setDifficulty('normal'); // base
    var diff = GAME.getDifficulty();
    // Override with wave-scaled values
    var waveDiff = {
      health: waveHP, speed: waveSpeed, fireRate: waveFireRate,
      damage: waveDamage, accuracy: waveAccuracy,
      sight: 45, attackRange: 28, botCount: botCount
    };
    // Temporarily set wave difficulty
    GAME.DIFFICULTIES._survivalWave = waveDiff;
    GAME.setDifficulty('_survivalWave');

    // Clear old enemies and spawn new
    enemyManager.clearAll();
    var mapData = survivalLastMapData;
    enemyManager.spawnBots(mapData.botSpawns, mapData.waypoints, mapWalls, botCount, mapData.size, mapData.playerSpawn, survivalWave);

    weapons.resetForRound();
    dom.waveCounter.textContent = 'WAVE ' + survivalWave;

    gameState = SURVIVAL_WAVE;
    showAnnouncement('WAVE ' + survivalWave, botCount + ' enemies');
    if (GAME.Sound) GAME.Sound.roundStart();
  }

  function endSurvivalWave() {
    // Wave cleared — restore 60% of max HP
    player.health = Math.min(100, player.health + 60);
    player.money = Math.min(16000, player.money + 200 + survivalWave * 50);
    showAnnouncement('WAVE CLEARED', 'Buy phase — 8s');
    if (GAME.Sound) GAME.Sound.roundWin();

    // Mission tracking for survival waves
    trackMissionEvent('survival_wave', survivalWave);
    trackMissionEvent('weekly_survival', survivalWave);
    var mapNames = ['survival_dust', 'survival_office', 'survival_warehouse', 'survival_bloodstrike', 'survival_italy', 'survival_aztec', 'survival_arena'];
    if (mapNames[survivalMapIndex]) trackMissionEvent(mapNames[survivalMapIndex], survivalWave);

    gameState = SURVIVAL_BUY;
    phaseTimer = 8;
    buyMenuOpen = false;
    dom.buyMenu.classList.remove('show');
  }

  function endSurvival() {
    if (GAME.Sound) GAME.Sound.stopAmbient();
    gameState = SURVIVAL_DEAD;
    dom.hud.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();

    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var mapName = mapNames[survivalMapIndex] || 'dust';
    setSurvivalBest(mapName, survivalWave - 1);

    dom.survivalWaveResult.textContent = 'Survived ' + (survivalWave - 1) + ' Waves';
    dom.survivalStatsDisplay.textContent = survivalKills + ' Kills | ' + survivalHeadshots + ' Headshots';

    // XP for survival (0.7x multiplier)
    var xpEarned = Math.round((survivalKills * 10 + survivalHeadshots * 5 + (survivalWave - 1) * 15) * 0.7);
    var rankResult = awardXP(xpEarned);
    dom.survivalXpBreakdown.innerHTML =
      '<div class="xp-line"><span>Kills (' + survivalKills + ')</span><span class="xp-val">+' + (survivalKills * 10) + '</span></div>' +
      '<div class="xp-line"><span>Headshots (' + survivalHeadshots + ')</span><span class="xp-val">+' + (survivalHeadshots * 5) + '</span></div>' +
      '<div class="xp-line"><span>Waves (' + (survivalWave - 1) + ')</span><span class="xp-val">+' + ((survivalWave - 1) * 15) + '</span></div>' +
      '<div class="xp-line"><span>Survival multiplier</span><span class="xp-val">x0.7</span></div>' +
      '<div class="xp-total">Total: +' + xpEarned + ' XP</div>' +
      (rankResult.ranked_up ? '<div style="color:#ffca28;margin-top:4px;">RANKED UP: ' + rankResult.newRank.name + '!</div>' : '');

    dom.survivalEnd.classList.add('show');
    updateRankDisplay();

    // Clean up wave difficulty
    delete GAME.DIFFICULTIES._survivalWave;
  }

  // ── Match History ──────────────────────────────────────
  function saveMatchHistory(result, xpEarned) {
    var history = getMatchHistory();
    history.unshift({
      date: new Date().toISOString(),
      result: result,
      playerScore: playerScore,
      botScore: botScore,
      rounds: roundNumber,
      kills: matchKills,
      deaths: matchDeaths,
      headshots: matchHeadshots,
      difficulty: selectedDifficulty,
      xpEarned: xpEarned || 0
    });
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem('miniCS_history', JSON.stringify(history));
  }

  function getMatchHistory() {
    try {
      return JSON.parse(localStorage.getItem('miniCS_history')) || [];
    } catch(e) { return []; }
  }

  function getStats() {
    var history = getMatchHistory();
    var wins = 0, losses = 0, draws = 0, totalKills = 0, totalDeaths = 0, totalHS = 0;
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      if (m.result === 'VICTORY') wins++;
      else if (m.result === 'DEFEAT') losses++;
      else draws++;
      totalKills += m.kills || 0;
      totalDeaths += m.deaths || 0;
      totalHS += m.headshots || 0;
    }
    var hsPercent = totalKills > 0 ? Math.round((totalHS / totalKills) * 100) : 0;
    return {
      matches: history.length,
      wins: wins, losses: losses, draws: draws,
      winRate: history.length > 0 ? Math.round((wins / history.length) * 100) : 0,
      kills: totalKills, deaths: totalDeaths,
      headshots: totalHS, hsPercent: hsPercent
    };
  }

  function renderHistory() {
    var stats = getStats();
    dom.historyStats.innerHTML =
      '<div class="stat-box"><div class="stat-val">' + stats.matches + '</div><div class="stat-label">Matches</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.wins + '/' + stats.losses + '/' + stats.draws + '</div><div class="stat-label">W / L / D</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.winRate + '%</div><div class="stat-label">Win Rate</div></div>' +
      '<div class="stat-box"><div class="stat-val">' + stats.hsPercent + '%</div><div class="stat-label">HS %</div></div>';

    var history = getMatchHistory();
    if (history.length === 0) {
      dom.historyList.innerHTML = '<div class="history-empty">No matches played yet.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      var cls = m.result === 'VICTORY' ? 'he-win' : m.result === 'DEFEAT' ? 'he-loss' : 'he-draw';
      var dateStr = '';
      try {
        var d = new Date(m.date);
        dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      } catch(e) {}
      html += '<div class="history-entry">' +
        '<span class="he-result ' + cls + '">' + m.result + '</span>' +
        '<span class="he-score">' + m.playerScore + ' - ' + m.botScore + '</span>' +
        '<span class="he-kd">' + (m.kills || 0) + 'K / ' + (m.deaths || 0) + 'D</span>' +
        '<span class="he-date">' + (m.difficulty ? m.difficulty.toUpperCase() + ' ' : '') + dateStr + '</span>' +
        '</div>';
    }
    dom.historyList.innerHTML = html;
  }

  // ── Buy System ───────────────────────────────────────────
  function tryBuy(item) {
    var isBuyPhase = (gameState === BUY_PHASE || gameState === SURVIVAL_BUY || gameState === DEATHMATCH_ACTIVE || gameState === TOURING);
    if (!isBuyPhase) return;
    var DEFS = GAME.WEAPON_DEFS;

    var bought = false;
    if (item === 'smg') {
      if (weapons.owned.smg) return;
      if (player.money < DEFS.smg.price) return;
      player.money -= DEFS.smg.price;
      weapons.giveWeapon('smg');
      weapons.switchTo('smg');
      bought = true;
    } else if (item === 'shotgun') {
      if (weapons.owned.shotgun) return;
      if (player.money < DEFS.shotgun.price) return;
      player.money -= DEFS.shotgun.price;
      weapons.giveWeapon('shotgun');
      weapons.switchTo('shotgun');
      bought = true;
    } else if (item === 'rifle') {
      if (weapons.owned.rifle) return;
      if (player.money < DEFS.rifle.price) return;
      player.money -= DEFS.rifle.price;
      weapons.giveWeapon('rifle');
      weapons.switchTo('rifle');
      bought = true;
    } else if (item === 'awp') {
      if (weapons.owned.awp) return;
      if (player.money < DEFS.awp.price) return;
      player.money -= DEFS.awp.price;
      weapons.giveWeapon('awp');
      weapons.switchTo('awp');
      bought = true;
    } else if (item === 'grenade') {
      if (weapons.grenadeCount >= 1) return;
      if (player.money < DEFS.grenade.price) return;
      player.money -= DEFS.grenade.price;
      weapons.buyGrenade();
      bought = true;
    } else if (item === 'armor') {
      if (player.armor >= 100 && player.helmet) return; // Fully equipped
      if (player.armor < 100 && !player.helmet) {
        // Buy kevlar+helmet combo ($1000) if affordable, else just kevlar ($650)
        if (player.money >= 1000) {
          player.money -= 1000;
          player.armor = 100;
          player.helmet = true;
          bought = true;
        } else if (player.money >= 650) {
          player.money -= 650;
          player.armor = 100;
          bought = true;
        }
      } else if (player.armor >= 100 && !player.helmet) {
        if (player.money < 350) return;
        player.money -= 350;
        player.helmet = true;
        bought = true;
      } else if (player.armor < 100 && player.helmet) {
        if (player.money < 650) return;
        player.money -= 650;
        player.armor = 100;
        bought = true;
      }
    } else if (item === 'smoke') {
      if (weapons.smokeCount >= 1) return;
      if (player.money < 300) return;
      player.money -= 300;
      weapons.smokeCount++;
      weapons.owned.smoke = true;
      bought = true;
    } else if (item === 'flash') {
      if (weapons.flashCount >= 2) return;
      if (player.money < 200) return;
      player.money -= 200;
      weapons.flashCount++;
      weapons.owned.flash = true;
      bought = true;
    }
    if (bought && GAME.Sound) GAME.Sound.buy();
    updateBuyMenu();
    updateHUD();
  }

  function updateBuyMenu() {
    dom.buyBalance.textContent = 'Balance: $' + player.money;
    var DEFS = GAME.WEAPON_DEFS;

    document.querySelectorAll('.buy-item').forEach(function(el) {
      el.classList.remove('owned', 'too-expensive');
      if (el.dataset.weapon === 'smg') {
        if (weapons.owned.smg) el.classList.add('owned');
        else if (player.money < DEFS.smg.price) el.classList.add('too-expensive');
      }
      if (el.dataset.weapon === 'shotgun') {
        if (weapons.owned.shotgun) el.classList.add('owned');
        else if (player.money < DEFS.shotgun.price) el.classList.add('too-expensive');
      }
      if (el.dataset.weapon === 'rifle') {
        if (weapons.owned.rifle) el.classList.add('owned');
        else if (player.money < DEFS.rifle.price) el.classList.add('too-expensive');
      }
      if (el.dataset.weapon === 'awp') {
        if (weapons.owned.awp) el.classList.add('owned');
        else if (player.money < DEFS.awp.price) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'grenade') {
        if (weapons.grenadeCount >= 1) el.classList.add('owned');
        else if (player.money < DEFS.grenade.price) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'smoke') {
        if (weapons.smokeCount >= 1) el.classList.add('owned');
        else if (player.money < 300) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'flash') {
        if (weapons.flashCount >= 2) el.classList.add('owned');
        else if (player.money < 200) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'armor') {
        if (player.armor >= 100 && player.helmet) {
          el.classList.add('owned');
          el.querySelector('.item-name').textContent = 'Kevlar + Helmet';
          el.querySelector('.item-price').textContent = 'OWNED';
        } else if (player.armor >= 100 && !player.helmet) {
          el.querySelector('.item-name').textContent = 'Helmet';
          el.querySelector('.item-price').textContent = '$350';
          if (player.money < 350) el.classList.add('too-expensive');
        } else if (player.armor < 100 && player.helmet) {
          el.querySelector('.item-name').textContent = 'Kevlar';
          el.querySelector('.item-price').textContent = '$650';
          if (player.money < 650) el.classList.add('too-expensive');
        } else {
          el.querySelector('.item-name').textContent = 'Kevlar + Helmet';
          el.querySelector('.item-price').textContent = '$1000';
          if (player.money < 650) el.classList.add('too-expensive');
        }
      }
    });
  }

  // ── Flashbang processing ────────────────────────────────
  var flashFadeTimer = 0;
  var _bloomBoostTimer = 0;
  var flashFadeTotal = 0;

  function processFlashbang(flashPos) {
    var toFlash = flashPos.clone().sub(camera.position);
    var dist = toFlash.length();
    if (dist > 25) return;

    toFlash.normalize();
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    var dot = fwd.dot(toFlash);

    // Flash even if not looking directly (reduced effect)
    var intensity = Math.max(0, (dot + 0.2) / 1.2) * (1 - dist / 25);
    if (intensity > 0.05) {
      var duration = intensity * 3;
      if (dom.flashOverlay) {
        dom.flashOverlay.style.opacity = Math.min(1, intensity);
      }
      flashFadeTimer = duration;
      flashFadeTotal = duration;

      if (GAME._postProcess && GAME._postProcess.bloomStrength) {
        GAME._postProcess.bloomStrength.value = 1.0;
        _bloomBoostTimer = 0.2;
      }
    }

    // Flash bots
    for (var i = 0; i < enemyManager.enemies.length; i++) {
      var e = enemyManager.enemies[i];
      if (!e.alive) continue;
      var eDist = e.mesh.position.distanceTo(flashPos);
      if (eDist > 15) continue;
      // Elite bots: 50% dodge
      if (selectedDifficulty === 'elite' && Math.random() < 0.5) continue;
      e._blindTimer = 2.0 * (1 - eDist / 15);
    }
  }

  // ── Grenade Explosion Damage ────────────────────────────
  function processExplosions(explosions) {
    if (!explosions) return;
    for (var i = 0; i < explosions.length; i++) {
      var exp = explosions[i];

      // Handle flashbang
      if (exp.type === 'flash') {
        processFlashbang(exp.position);
        continue;
      }

      var pos = exp.position;
      var radius = exp.radius;
      var maxDmg = exp.damage;

      triggerScreenShake(0.08);

      // Spawn explosion particle effects
      if (GAME.particles) {
        GAME.particles.spawnExplosion(pos);
      }

      for (var j = 0; j < enemyManager.enemies.length; j++) {
        var enemy = enemyManager.enemies[j];
        if (!enemy.alive) continue;
        var dist = enemy.mesh.position.distanceTo(pos);
        if (dist < radius) {
          var dmgFactor = 1 - (dist / radius);
          var dmg = Math.round(maxDmg * dmgFactor);
          if (dmg > 0) {
            var nadeDir = new THREE.Vector3();
            nadeDir.subVectors(enemy.mesh.position, pos).normalize();
            enemy._lastHitDir = nadeDir;
            enemy._headshotKill = false;
            var killed = enemy.takeDamage(dmg);
            if (GAME.particles) {
              GAME.particles.spawnBlood(enemy.mesh.position, nadeDir, false);
            }
            if (killed) {
              onEnemyKilled(enemy, false, pos);
              addKillFeed('You [HE]', 'Bot ' + (enemy.id + 1));
              trackMissionEvent('grenade_kills', 1);
            }
          }
        }
      }

      if (player.alive) {
        var playerDist = player.position.distanceTo(pos);
        if (playerDist < radius) {
          var playerDmgFactor = 1 - (playerDist / radius);
          var playerDmg = Math.round(maxDmg * 0.6 * playerDmgFactor);
          if (playerDmg > 0) {
            player.takeDamage(playerDmg);
            if (!player.alive) { weapons._unscope(); weapons.dropWeapon(player.position, player.yaw); }
            damageFlashTimer = 0.2;
            triggerScreenShake(0.03);
            if (GAME.Sound) GAME.Sound.playerHurt();
          }
        }
      }
    }
  }

  // ── Common kill handling ────────────────────────────────
  function onEnemyKilled(enemy, isHeadshot, point) {
    matchKills++;
    survivalKills++;
    if (isHeadshot) {
      matchHeadshots++;
      survivalHeadshots++;
    }
    // Kill dink sound
    if (GAME.Sound) {
      if (isHeadshot) { GAME.Sound.killDinkHeadshot(); GAME.Sound.killThumpHeadshot(); }
      else { GAME.Sound.killDink(); GAME.Sound.killThump(); }
      if (GAME.Sound.killConfirm) GAME.Sound.killConfirm();
    }
    triggerKillSlowMo();
    triggerKillKick(isHeadshot);
    GAME._hitFeedback.killTimer = 0.2;

    if (gameState === GUNGAME_ACTIVE) {
      gungameKills++;
      if (isHeadshot) gungameHeadshots++;
      checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
      // Queue bot respawn instead of waiting for all dead
      gunGameQueueBotRespawn(enemy);
      // Remove from enemies array
      var idx = enemyManager.enemies.indexOf(enemy);
      if (idx >= 0) enemyManager.enemies.splice(idx, 1);
      // Advance weapon level
      advanceGunGameLevel();
    } else if (gameState === DEATHMATCH_ACTIVE) {
      dmKills++;
      if (isHeadshot) dmHeadshots++;
      var wdef = weapons ? GAME.WEAPON_DEFS[weapons.current] : null;
      var baseReward = (wdef && wdef.killReward) ? wdef.killReward : 300;
      var killBonus = hasPerk('scavenger') ? Math.round(baseReward * 1.5) : baseReward;
      player.money = Math.min(16000, player.money + killBonus);
      checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
      // Queue bot respawn
      dmQueueBotRespawn(enemy);
      var idx2 = enemyManager.enemies.indexOf(enemy);
      if (idx2 >= 0) enemyManager.enemies.splice(idx2, 1);
      // Check win
      if (dmKills >= DEATHMATCH_KILL_TARGET) {
        endDeathmatch();
      }
    } else {
      var wdef2 = weapons ? GAME.WEAPON_DEFS[weapons.current] : null;
      var baseReward2 = (wdef2 && wdef2.killReward) ? wdef2.killReward : 300;
      var killBonus = hasPerk('scavenger') ? Math.round(baseReward2 * 1.5) : baseReward2;
      player.money = Math.min(16000, player.money + killBonus);
      checkKillStreak();
      if (GAME.Sound) GAME.Sound.kill();
    }

    // Mission tracking
    trackMissionEvent('kills', 1);
    if (isHeadshot) {
      trackMissionEvent('headshots', 1);
      trackMissionEvent('weekly_headshots', 1);
    }
    if (player.crouching) trackMissionEvent('crouch_kills', 1);
    if (weapons.current === 'knife') trackMissionEvent('knife_kills', 1);
    if (weapons.current === 'awp') trackMissionEvent('awp_kills', 1);
    if (weapons.current === 'smg') trackMissionEvent('smg_kills', 1);
    if (weapons.current === 'shotgun') trackMissionEvent('shotgun_kills', 1);
    if (gameState === DEATHMATCH_ACTIVE) trackMissionEvent('dm_kills', 1);
  }

  // ── Shooting hit processing ────────────────────────────
  function processShootResults(results) {
    if (!results) return;
    matchShotsFired++;
    for (var ri = 0; ri < results.length; ri++) {
      var result = results[ri];
      if (result.type === 'enemy') {
        // Friendly fire disabled in team mode
        if (teamMode && result.enemy.team === playerTeam) continue;
        matchShotsHit++;
        matchDamageDealt += result.damage;
        // Store hit info for death animation
        var shootDir = new THREE.Vector3();
        shootDir.subVectors(result.point, player.position).normalize();
        result.enemy._lastHitDir = shootDir;
        result.enemy._headshotKill = result.headshot;
        var killed = result.enemy.takeDamage(result.damage);
        showHitmarker(result.headshot);
        showDamageNumber(result.point, result.damage, result.headshot);
        spawnBloodBurst(result.point, result.headshot, result.direction);
        GAME._hitFeedback.hitTimer = 0.1;
        if (result.headshot && GAME.Sound) GAME.Sound.headshotDink();

        if (killed) {
          onEnemyKilled(result.enemy, result.headshot, result.point);
          var hsTag = result.headshot ? ' (HEADSHOT)' : '';
          addKillFeed('You', 'Bot ' + (result.enemy.id + 1) + hsTag);
        }
      } else if (result.type === 'grenade_thrown') {
        // Track nade usage for all_nades challenge
        if (result.grenadeType === 'grenade') matchNadesUsed.he = true;
        else if (result.grenadeType === 'smoke') matchNadesUsed.smoke = true;
        else if (result.grenadeType === 'flash') matchNadesUsed.flash = true;
        if (matchNadesUsed.he && matchNadesUsed.smoke && matchNadesUsed.flash) {
          trackMissionEvent('all_nades', 1);
        }
      } else if (result.type === 'bird') {
        killBird(result.bird, result.point);
        player.money = Math.min(16000, player.money + BIRD_MONEY);
        addKillFeed('You', 'Bird');
        showHitmarker(false);
        if (GAME.Sound) GAME.Sound.hitMarker();
      }
    }
  }

  // ── HUD Updates ──────────────────────────────────────────
  function updateHUD() {
    dom.hpFill.style.width = player.health + '%';
    dom.hpValue.textContent = Math.ceil(player.health);
    dom.armorFill.style.width = player.armor + '%';
    dom.armorValue.textContent = Math.ceil(player.armor);
    if (dom.helmetIcon) dom.helmetIcon.style.display = player.helmet ? 'inline' : 'none';

    var def = weapons.getCurrentDef();
    var statusSuffix = weapons.reloading ? ' (Reloading...)' : weapons._boltCycling ? ' (Cycling...)' : '';
    dom.weaponName.textContent = def.name + statusSuffix;

    // Scope overlay
    var isScoped = weapons.isScoped();
    dom.scopeOverlay.classList.toggle('show', isScoped);
    dom.crosshair.style.display = isScoped ? 'none' : '';

    if (def.isKnife) {
      dom.ammoMag.textContent = '\u2014';
      dom.ammoReserve.textContent = '';
    } else if (def.isGrenade) {
      if (weapons.current === 'grenade') {
        dom.ammoMag.textContent = 'HE x' + weapons.grenadeCount;
      } else if (weapons.current === 'smoke') {
        dom.ammoMag.textContent = 'SM x' + weapons.smokeCount;
      } else if (weapons.current === 'flash') {
        dom.ammoMag.textContent = 'FL x' + weapons.flashCount;
      }
      dom.ammoReserve.textContent = '';
    } else {
      dom.ammoMag.textContent = weapons.ammo[weapons.current];
      dom.ammoReserve.textContent = weapons.reserve[weapons.current];
    }

    if (gameState !== GUNGAME_ACTIVE) {
      dom.moneyDisplay.textContent = '$' + player.money;
    }

    var nadeParts = [];
    if (weapons.grenadeCount > 0) nadeParts.push('HE x' + weapons.grenadeCount);
    if (weapons.smokeCount > 0) nadeParts.push('SM x' + weapons.smokeCount);
    if (weapons.flashCount > 0) nadeParts.push('FL x' + weapons.flashCount);
    if (nadeParts.length > 0) {
      dom.grenadeCount.textContent = nadeParts.join('  ');
      dom.grenadeCount.classList.add('show');
    } else {
      dom.grenadeCount.classList.remove('show');
    }

    // Timer
    if (gameState === GUNGAME_ACTIVE) {
      var elapsed = (performance.now() / 1000) - gungameStartTime;
      var gm = Math.floor(elapsed / 60);
      var gs = Math.floor(elapsed % 60);
      dom.roundTimer.textContent = gm + ':' + (gs < 10 ? '0' : '') + gs;
      dom.roundTimer.style.color = '#ff9800';
    } else if (gameState === SURVIVAL_WAVE || gameState === SURVIVAL_BUY) {
      if (gameState === SURVIVAL_BUY) {
        var st = phaseTimer;
        dom.roundTimer.textContent = '0:' + (st < 10 ? '0' : '') + Math.floor(st);
        dom.roundTimer.style.color = st <= 3 ? '#ef5350' : '#ffca28';
      } else {
        dom.roundTimer.textContent = '';
      }
    } else {
      var t = gameState === BUY_PHASE ? phaseTimer : roundTimer;
      var mins = Math.floor(t / 60);
      var secs = Math.floor(t % 60);
      dom.roundTimer.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      dom.roundTimer.style.color = t <= 10 ? '#ef5350' : '#fff';
    }

    dom.buyPhaseHint.style.display = gameState === BUY_PHASE ? '' : 'none';

    // Dynamic crosshair — reflects base spread + burst spread
    var spread = def.spread || 0;
    if (player.crouching) spread *= 0.6;
    spread += (weapons._burstSpread || 0);
    var gap = Math.max(3, Math.round(spread * 280 + 3));
    var len = Math.max(8, Math.round(spread * 120 + 10));
    // Hit feedback — expand crosshair
    if (GAME._hitFeedback.hitTimer > 0) {
      GAME._hitFeedback.hitTimer -= _frameDt;
      gap += 2;
    }

    dom.crosshair.style.setProperty('--ch-gap', gap + 'px');
    dom.crosshair.style.setProperty('--ch-len', len + 'px');

    // Kill feedback — red flash
    if (GAME._hitFeedback.killTimer > 0) {
      GAME._hitFeedback.killTimer -= _frameDt;
      dom.crosshair.style.setProperty('--ch-color', 'rgba(255, 60, 60, 0.9)');
    } else {
      dom.crosshair.style.setProperty('--ch-color', 'rgba(200, 255, 200, 0.9)');
    }

    // Crouch indicator
    dom.crouchIndicator.classList.toggle('show', player.crouching);

    // Weapon crouching state
    weapons.setCrouching(player.crouching);

    // Low health heartbeat pulse
    if (player.health <= 25 && player.alive) {
      dom.lowHealthPulse.style.display = 'block';
      dom.lowHealthPulse.classList.toggle('critical', player.health <= 15);
    } else {
      dom.lowHealthPulse.style.display = 'none';
    }
  }

  function updateScoreboard() {
    dom.scorePlayer.textContent = playerScore;
    dom.scoreBots.textContent = botScore;
    if (teamMode) {
      dom.scorePlayerLabel.textContent = playerTeam === 'ct' ? 'Counter-Terrorists' : 'Terrorists';
      dom.scoreBotsLabel.textContent = playerTeam === 'ct' ? 'Terrorists' : 'Counter-Terrorists';
    } else {
      dom.scorePlayerLabel.textContent = 'You';
      dom.scoreBotsLabel.textContent = 'Terrorists';
    }
  }

  function addKillFeed(killer, victim) {
    var entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.innerHTML = '<span class="killer">' + killer + '</span> \u25ba <span class="victim">' + victim + '</span>';
    dom.killFeed.appendChild(entry);
    setTimeout(function() { entry.remove(); }, 3500);
  }

  function addRadioFeed(text) {
    var entry = document.createElement('div');
    entry.className = 'radio-entry';
    entry.textContent = '[RADIO] ' + text;
    dom.killFeed.appendChild(entry);
    setTimeout(function() { entry.remove(); }, 2000);
  }
  GAME._addRadioFeed = addRadioFeed;

  function showAnnouncement(text, sub) {
    if (announcementTimeout) clearTimeout(announcementTimeout);
    dom.announcement.innerHTML = text + (sub ? '<div class="sub">' + sub + '</div>' : '');
    dom.announcement.classList.add('show');
    announcementTimeout = setTimeout(function() {
      dom.announcement.classList.remove('show');
    }, 2500);
  }

  // ── Game Loop ────────────────────────────────────────────
  var lastTime = 0;
  var _frameDt = 0.016;

  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    var now = timestamp / 1000;
    var dt = Math.min(lastTime ? now - lastTime : 0.016, 0.05);
    _frameDt = dt;
    lastTime = now;

    // Kill slow-motion
    var realDt = dt;
    if (GAME.killSlowMo.active) {
      dt *= GAME.killSlowMo.scale;
      GAME.killSlowMo.timer -= realDt;
      if (GAME.killSlowMo.timer <= 0) {
        GAME.killSlowMo.active = false;
        GAME.killSlowMo.scale = 1.0;
      }
    }

    if (gameState === MENU || gameState === MATCH_END || gameState === PAUSED || gameState === GUNGAME_END) {
      if (gameState === MENU) {
        GAME.updateMenuFlythrough(dt);
        updateBirds(dt);
      }
      renderWithBloom();
      return;
    }
    if (gameState === SURVIVAL_DEAD) {
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      renderWithBloom();
      return;
    }

    // Hitmarker fade
    if (hitmarkerTimer > 0) {
      hitmarkerTimer -= dt;
      if (hitmarkerTimer <= 0) {
        dom.hitmarker.classList.remove('show');
        dom.hitmarker.classList.remove('headshot');
      }
    }

    // Tour Mode
    if (gameState === TOURING) {
      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      if (GAME.Sound && GAME.Sound.updateListener) {
        GAME.Sound.updateListener(camera);
      }
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      weapons.setSprinting(player.keys.shift && !player.crouching && player.velocity.length() > 0.5);
      weapons.setVelocity(player._smoothVelX || 0, player._smoothVelZ || 0);
      updateBirds(dt);
      weapons.update(dt, null, null, player.pitch);
      weapons.setCrouching(player.crouching);

      if (weapons.mouseDown) {
        var results = weapons.tryFire(now, []);
        if (results) {
          for (var ti = 0; ti < results.length; ti++) {
            if (results[ti].type === 'bird') {
              killBird(results[ti].bird, results[ti].point);
              if (GAME.Sound) GAME.Sound.hitMarker();
            }
          }
        }
      }

      applyScreenShake(dt);
      applyKillKick(dt);

      renderWithBloom();
      return;
    }

    // Buy Phase (match or survival)
    if (gameState === BUY_PHASE || gameState === SURVIVAL_BUY) {
      phaseTimer -= dt;
      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      if (GAME.Sound && GAME.Sound.updateListener) {
        GAME.Sound.updateListener(camera);
      }
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      weapons.setSprinting(player.keys.shift && !player.crouching && player.velocity.length() > 0.5);
      weapons.setVelocity(player._smoothVelX || 0, player._smoothVelZ || 0);
      updateBirds(dt);
      var buyExplosions = weapons.update(dt, null, null, player.pitch);
      if (buyExplosions) processExplosions(buyExplosions);
      if (phaseTimer <= 0) {
        if (gameState === SURVIVAL_BUY) {
          startSurvivalWave();
        } else {
          gameState = PLAYING;
          buyMenuOpen = false;
          dom.buyMenu.classList.remove('show');
          showAnnouncement('GO!');
          if (GAME.Sound) GAME.Sound.roundStart();
          // Random bot says "Go go go!" at round start
          setTimeout(function() {
            if (GAME.Sound) GAME.Sound.radioVoice('Go go go!');
            addRadioFeed('Go go go!');
          }, 800);
        }
      }

      updateHUD();
      updateMinimap();
      renderWithBloom();
      return;
    }

    // Round End
    if (gameState === ROUND_END) {
      phaseTimer -= dt;
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      updateBirds(dt);
      weapons.setSprinting(player.keys.shift && !player.crouching && player.velocity.length() > 0.5);
      weapons.setVelocity(player._smoothVelX || 0, player._smoothVelZ || 0);
      var endExplosions = weapons.update(dt, null, null, player.pitch);
      if (endExplosions) processExplosions(endExplosions);
      if (phaseTimer <= 0) {
        if (lastRoundWon && activePerks.length < PERK_POOL.length) {
          offerPerkChoice();
        } else {
          startRound();
        }
      }
      renderWithBloom();
      return;
    }

    // Playing / Survival Wave / Gun Game
    if (gameState === PLAYING || gameState === SURVIVAL_WAVE || gameState === GUNGAME_ACTIVE || gameState === DEATHMATCH_ACTIVE) {
      if (gameState === PLAYING) roundTimer -= dt;

      GAME._weaponMoveMult = weapons.getMovementMult();
      GAME._scopeFovTarget = weapons.getScopeFovTarget();
      player.update(dt);
      if (GAME.Sound && GAME.Sound.updateListener) {
        GAME.Sound.updateListener(camera);
      }
      if (!player.alive) {
        player.updateDeath(dt);
        weapons.updateDroppedWeapon(dt, player.walls);
      }
      weapons.setMoving(player.velocity.length() > 0.5);
      weapons.setStrafeDir(player.keys.a ? -1 : player.keys.d ? 1 : 0);
      weapons.setSprinting(player.keys.shift && !player.crouching && player.velocity.length() > 0.5);
      weapons.setVelocity(player._smoothVelX || 0, player._smoothVelZ || 0);
      var explosions = weapons.update(dt, null, null, player.pitch);

      if (damageFlashTimer > 0) damageFlashTimer -= dt;

      if (_bloomBoostTimer > 0) {
        _bloomBoostTimer -= dt;
        if (_bloomBoostTimer <= 0 && GAME._postProcess && GAME._postProcess.bloomStrength) {
          GAME._postProcess.bloomStrength.value = 0.4;
        }
      }

      // Flash overlay fade
      if (flashFadeTimer > 0) {
        flashFadeTimer -= dt;
        var alpha = Math.max(0, flashFadeTimer / flashFadeTotal);
        if (dom.flashOverlay) dom.flashOverlay.style.opacity = alpha;
      }

      applyScreenShake(dt);
      applyKillKick(dt);

      if (explosions) processExplosions(explosions);

      // Shooting
      if (weapons.mouseDown && player.alive) {
        var results = weapons.tryFire(now, enemyManager.enemies);
        if (results) {
          processShootResults(results);
          // Report sound to enemy AI — gunfire is loud
          enemyManager.reportSound(player.position, 'gunshot', 40);
        }
      }

      updateBirds(dt);

      // Enemy AI
      if (player.alive || teamMode) {
        var enemyResult = enemyManager.update(dt, player.position, player.alive, now, teamMode ? playerTeam : null);
        var dmg = enemyResult.damage;
        if (dmg > 0 && player.alive && !(gameState === DEATHMATCH_ACTIVE && dmSpawnProtection > 0)) {
          player.takeDamage(dmg);
          if (!player.alive) { weapons._unscope(); weapons.dropWeapon(player.position, player.yaw); }
          damageFlashTimer = 0.15;
          triggerScreenShake(0.02);
          if (GAME.Sound) GAME.Sound.playerHurt();
          if (GAME.showDamageIndicator && enemyResult.attackerPos) {
            GAME.showDamageIndicator(enemyResult.attackerPos);
          }
          if (GAME.triggerBloodSplatter) GAME.triggerBloodSplatter(dmg);
        }
      }

      // Bomb defusal logic
      updateBombLogic(dt);

      // End conditions (bomb logic may have already ended the round via endRound)
      if (gameState === PLAYING) {
        if (teamMode) {
          // Team mode end conditions
          var oppTeam = playerTeam === 'ct' ? 't' : 'ct';
          var oppAllDead = enemyManager.teamAllDead(oppTeam);
          var allyAllDead = enemyManager.teamAllDead(playerTeam);

          if (teamObjective === 'bomb' && bombPlanted) {
            // Bomb is planted — only bomb timer or defuse can end the round
            // Exception: if all CTs die, Ts win immediately
            var ctTeam = playerTeam === 'ct' ? playerTeam : oppTeam;
            var ctAllDead = playerTeam === 'ct' ? (!player.alive && allyAllDead) : oppAllDead;
            if (ctAllDead) {
              if (playerTeam !== 'ct') endRound(true); else { matchDeaths++; endRound(false); }
            }
            // Bomb detonation/defuse handled in updateBombLogic
          } else if (oppAllDead) {
            // All enemies eliminated — player's team wins
            endRound(true);
          } else if (!player.alive && allyAllDead) {
            // Player and all allies dead
            matchDeaths++;
            endRound(false);
          } else if (roundTimer <= 0) {
            // Time up — CT wins in bomb defusal (no plant), loss in elimination
            if (teamObjective === 'bomb') {
              endRound(playerTeam === 'ct');
            } else {
              endRound(false);
            }
          }
        } else {
          if (enemyManager.allDead()) endRound(true);
          else if (!player.alive) { matchDeaths++; endRound(false); }
          else if (roundTimer <= 0) endRound(false);
        }
      } else if (gameState === SURVIVAL_WAVE) {
        if (enemyManager.allDead()) endSurvivalWave();
        else if (!player.alive) endSurvival();
      } else if (gameState === GUNGAME_ACTIVE) {
        // Player death — instant respawn
        if (!player.alive) gunGamePlayerDied();
        // Bot respawn queue
        updateGunGameRespawns(dt);
      } else if (gameState === DEATHMATCH_ACTIVE) {
        // Timer countdown
        dmTimer -= dt;
        updateDMKillCounter();

        // Spawn protection countdown
        if (dmSpawnProtection > 0) dmSpawnProtection -= dt;

        // Player death handling with 3s respawn delay
        if (!player.alive && dmPlayerDeadTimer === 0) {
          dmPlayerDied();
        }
        if (dmPlayerDeadTimer > 0) {
          dmPlayerDeadTimer -= dt;
          dom.dmRespawnTimer.textContent = 'RESPAWN IN ' + Math.ceil(dmPlayerDeadTimer);
          if (dmPlayerDeadTimer <= 0) {
            dmPlayerDeadTimer = -1;
            dmPlayerRespawn();
          }
        }

        // Bot respawn queue
        updateDMRespawns(dt);

        // Time up
        if (dmTimer <= 0) {
          endDeathmatch();
        }
      }


      updateBulletHoles(dt);
      updateImpactDust(dt);
      updateFootDust(dt);
      updateDamageIndicators(dt);
      updateBloodSplatter(dt);
      updateHUD();
      updateMinimap();

      // Spawn protection visual (blue tint pulse)
      if (gameState === DEATHMATCH_ACTIVE && dmSpawnProtection > 0) {
        dom.damageFlash.style.background = 'radial-gradient(ellipse at center, transparent 60%, rgba(100,200,255,0.3) 100%)';
        dom.damageFlash.style.opacity = Math.sin(performance.now() / 100) * 0.1 + 0.15;
      } else {
        dom.damageFlash.style.background = '';
        dom.damageFlash.style.opacity = damageFlashTimer > 0 ? Math.min(1, damageFlashTimer / 0.1) : 0;
      }
    }

    if (GAME.particles) GAME.particles.update(dt);

    renderWithBloom();
  }

  // ── Start ────────────────────────────────────────────────
  init();
  if (renderer && renderer.domElement) _buildMenuScene();
  requestAnimationFrame(gameLoop);
})();
