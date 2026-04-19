// js/ui/menu.js — Menu flythrough camera, menu scene building, quick play, fade
// Extracted from main.js. Uses GAME.* for shared state.
(function() {
  'use strict';

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
    var camera = GAME.camera;

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

  // ── Build Menu Scene ───────────────────────────────────
  function _buildMenuScene() {
    var camera = GAME.camera;
    var renderer = GAME._renderer;
    var weapons = GAME.weaponSystem;

    var scene = new THREE.Scene();
    GAME.scene = scene;
    scene.add(camera);

    // Pick a random map
    _ftMapIndex = Math.floor(Math.random() * GAME.getMapCount());
    _ftPathIndex = 0;
    _ftProgress = 0;

    GAME.buildMap(scene, _ftMapIndex, renderer);
    GAME.applyColorGrade();
    if (GAME.particles) {
      GAME.particles.dispose();
      GAME.particles.init(scene);
    }

    // Spawn birds for atmosphere
    var def = GAME.getMapDef(_ftMapIndex);
    GAME.birds.spawn(Math.max(def.size.x, def.size.z));
    if (weapons) weapons.setBirdsRef(GAME.birds.list);

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

  // ── Quick Play ─────────────────────────────────────────
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

  // ── Fade Menu and Start ────────────────────────────────
  function _fadeMenuAndStart(startFn) {
    var dom = GAME.dom;
    if (GAME.isMobile && GAME.fullscreen) GAME.fullscreen.toggle();
    if (dom && dom.menuContent) {
      dom.menuContent.classList.add('fade-out');
      setTimeout(function() {
        dom.menuContent.classList.remove('fade-out');
        startFn();
      }, 300);
    } else {
      startFn();
    }
  }

  GAME._fadeMenuAndStart = _fadeMenuAndStart;

  // ── Update Quick Play Info ─────────────────────────────
  function _updateQuickPlayInfo() {
    var s = _getQuickPlaySettings();
    var mapName = s.mapMode === 'shuffle' ? 'Shuffle' : GAME.getMapDef(s.mapIndex).name;
    var modeLabel = s.mode === 'competitive' ? 'Competitive' : s.mode === 'survival' ? 'Survival' : s.mode === 'gungame' ? 'Gun Game' : 'Deathmatch';
    var diffLabel = s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1);
    var dom = GAME.dom;
    if (dom && dom.quickPlayInfo) {
      dom.quickPlayInfo.textContent = modeLabel + ' \u00B7 ' + diffLabel + ' \u00B7 ' + mapName;
    }
  }

  GAME._updateQuickPlayInfo = _updateQuickPlayInfo;

  // ── Expose Menu API ────────────────────────────────────
  GAME.menu = {
    buildScene: _buildMenuScene,
    fadeAndStart: _fadeMenuAndStart,
    updateQuickPlayInfo: _updateQuickPlayInfo,
    getQuickPlaySettings: _getQuickPlaySettings
  };

})();
