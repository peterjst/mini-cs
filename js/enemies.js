// js/enemies.js — Bot AI: patrol, chase, attack, investigate, retreat, cover, ambush
// Attaches GAME.EnemyManager

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var DIFFICULTIES = {
    easy:   { health: 20,  speed: 4,   fireRate: 1.2, damage: 5,  accuracy: 0.2,  sight: 25, attackRange: 18, botCount: 2, soundCloseRange: 5,  soundMidRange: 15, soundMidError: 6,  soundFarError: 16 },
    normal: { health: 45,  speed: 6,   fireRate: 2,   damage: 9,  accuracy: 0.35, sight: 35, attackRange: 22, botCount: 3, soundCloseRange: 8,  soundMidRange: 20, soundMidError: 3,  soundFarError: 8 },
    hard:   { health: 60,  speed: 6.8, fireRate: 2.4, damage: 11, accuracy: 0.42, sight: 40, attackRange: 25, botCount: 4, soundCloseRange: 8,  soundMidRange: 20, soundMidError: 2.25, soundFarError: 6 },
    elite:  { health: 80,  speed: 7.8, fireRate: 3,   damage: 14, accuracy: 0.52, sight: 45, attackRange: 28, botCount: 5, soundCloseRange: 10, soundMidRange: 22, soundMidError: 1.5, soundFarError: 4 }
  };
  var currentDifficulty = DIFFICULTIES.normal;

  // ── States ─────────────────────────────────────────────
  var PATROL = 0, CHASE = 1, ATTACK = 2, INVESTIGATE = 3, RETREAT = 4, TAKE_COVER = 5, AMBUSH = 6;

  // ── Personality Types ──────────────────────────────────
  var PERSONALITY = {
    aggressive: { speedMult: 1.15, aimSpeedMult: 1.2, reactionMult: 0.7, retreatHP: 0.15, patrolPause: 0.2, burstMin: 3, burstMax: 5, markerColor: 0xff4500 },
    balanced:   { speedMult: 1.0,  aimSpeedMult: 1.0, reactionMult: 1.0, retreatHP: 0.30, patrolPause: 0.3, burstMin: 2, burstMax: 4, markerColor: 0xff0000 },
    cautious:   { speedMult: 0.85, aimSpeedMult: 0.9, reactionMult: 1.3, retreatHP: 0.50, patrolPause: 0.5, burstMin: 2, burstMax: 3, markerColor: 0xcc0000 }
  };
  var PERSONALITY_KEYS = ['aggressive', 'balanced', 'cautious'];

  var NAV_WEIGHTS = {
    aggressive: { sightline: 0.2, playerProximity: 0.5, recency: 0.2, allySpread: 0.1 },
    balanced:   { sightline: 0.25, playerProximity: 0.25, recency: 0.25, allySpread: 0.25 },
    cautious:   { sightline: 0.5, playerProximity: 0.15, recency: 0.2, allySpread: 0.15 }
  };
  var NAV_NOISE = { easy: 0.6, normal: 0.3, hard: 0.15, elite: 0.05 };

  // ── Combat Movement Sub-Behaviors ──────────────────────
  var COMBAT_MOVE = { STRAFE: 0, PUSH: 1, HOLD: 2, RETREAT_FIRE: 3, RUSH_COVER: 4 };

  var COMBAT_BASE_WEIGHTS = {
    aggressive: { strafe: 0.25, push: 0.35, hold: 0.15, retreatFire: 0.10, rushCover: 0.15 },
    balanced:   { strafe: 0.35, push: 0.15, hold: 0.20, retreatFire: 0.20, rushCover: 0.10 },
    cautious:   { strafe: 0.30, push: 0.05, hold: 0.15, retreatFire: 0.35, rushCover: 0.15 }
  };

  var COMBAT_MOVE_DURATIONS = {
    strafe:      [1.0, 3.0],
    push:        [1.0, 2.0],
    hold:        [0.8, 1.5],
    retreatFire: [1.0, 2.0],
    rushCover:   [0, 0]  // duration = until arrival
  };

  function _calcCombatWeights(personalityKey, ctx) {
    var base = COMBAT_BASE_WEIGHTS[personalityKey] || COMBAT_BASE_WEIGHTS.balanced;
    var w = {
      strafe: base.strafe,
      push: base.push,
      hold: base.hold,
      retreatFire: base.retreatFire,
      rushCover: base.rushCover
    };

    // HP below 40%: push x0.5, retreatFire x2.0
    if (ctx.hpRatio < 0.4) {
      w.push *= 0.5;
      w.retreatFire *= 2.0;
    }

    // Player within 5 units: push x0.5, hold x1.5, retreatFire x1.5
    if (ctx.distToPlayer < 5) {
      w.push *= 0.5;
      w.hold *= 1.5;
      w.retreatFire *= 1.5;
    }

    // Player beyond 15 units: push x1.5, hold x1.5
    if (ctx.distToPlayer > 15) {
      w.push *= 1.5;
      w.hold *= 1.5;
    }

    // No nearby cover: zero out rushCover
    if (!ctx.hasNearbyCover) {
      w.rushCover = 0;
    }

    // Normalize to sum to 1.0
    var sum = w.strafe + w.push + w.hold + w.retreatFire + w.rushCover;
    if (sum > 0) {
      w.strafe /= sum;
      w.push /= sum;
      w.hold /= sum;
      w.retreatFire /= sum;
      w.rushCover /= sum;
    }

    return w;
  }

  // ── Aim difficulty scaling ─────────────────────────────
  var AIM_PARAMS = {
    easy:   { aimSpeed: 2.0, aimError: 2.5, reactionMin: 0.5, reactionMax: 0.8, errorRefreshMin: 0.6, errorRefreshMax: 1.2 },
    normal: { aimSpeed: 4.0, aimError: 1.5, reactionMin: 0.3, reactionMax: 0.6, errorRefreshMin: 0.4, errorRefreshMax: 1.0 },
    hard:   { aimSpeed: 7.0, aimError: 0.8, reactionMin: 0.2, reactionMax: 0.4, errorRefreshMin: 0.3, errorRefreshMax: 0.8 },
    elite:  { aimSpeed: 10.0, aimError: 0.3, reactionMin: 0.15, reactionMax: 0.25, errorRefreshMin: 0.3, errorRefreshMax: 0.6 }
  };

  // ── Bot Weapon Pool ────────────────────────────────────
  function getBotWeapon(roundNum) {
    if (roundNum <= 2) {
      return Math.random() < 0.3 ? 'smg' : 'pistol';
    }
    if (roundNum <= 4) {
      var r2 = Math.random();
      if (r2 < 0.35) return 'rifle';
      if (r2 < 0.65) return 'smg';
      return 'pistol';
    }
    var r = Math.random();
    if (r < 0.40) return 'rifle';
    if (r < 0.58) return 'smg';
    if (r < 0.78) return 'shotgun';
    if (r < 0.90) return 'awp';
    return 'pistol';
  }

  // ── Shadow helper ──────────────────────────────────────
  function shadow(m) { m.castShadow = true; m.receiveShadow = true; return m; }

  // ── Collision constants ───────────────────────────────────
  var ENEMY_RADIUS = 0.6;
  var COLLISION_DIRS = [
    new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
    new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1),
    new THREE.Vector3(0.707,0,0.707), new THREE.Vector3(-0.707,0,0.707),
    new THREE.Vector3(0.707,0,-0.707), new THREE.Vector3(-0.707,0,-0.707),
  ];

  // ── Single Enemy ─────────────────────────────────────────

  function Enemy(scene, spawnPos, waypoints, walls, id, roundNum, team) {
    this.scene = scene;
    this.walls = walls;
    this.waypoints = waypoints;
    this.id = id;
    this.team = team || null;
    this.alive = true;
    this.health = currentDifficulty.health;
    this.maxHealth = this.health;
    this.speed = currentDifficulty.speed;
    this.fireRate = currentDifficulty.fireRate;
    this.damage = currentDifficulty.damage;
    this.accuracy = currentDifficulty.accuracy;
    this.sightRange = currentDifficulty.sight;
    this.attackRange = currentDifficulty.attackRange;
    this.state = PATROL;
    this._blindTimer = 0;
    this.currentWaypoint = Math.floor(Math.random() * waypoints.length);
    this.patrolPauseTimer = 0;
    this.lastFireTime = 0;
    this._rc = new THREE.Raycaster();
    this._dir = new THREE.Vector3();

    // ── Personality ──────────────────────────────────────
    var pKey = PERSONALITY_KEYS[id % PERSONALITY_KEYS.length];
    this.personality = PERSONALITY[pKey];
    this.speed *= this.personality.speedMult;

    // ── Aim humanization ─────────────────────────────────
    var diffName = _getDiffName();
    var ap = AIM_PARAMS[diffName] || AIM_PARAMS.normal;
    this._aimSpeed = ap.aimSpeed * this.personality.aimSpeedMult;
    this._aimErrorMag = ap.aimError;
    this._reactionDelay = ap.reactionMin + Math.random() * (ap.reactionMax - ap.reactionMin);
    this._reactionDelay *= this.personality.reactionMult;
    this._reactionTimer = 0;
    this._hasReacted = false;
    this._peripheralDetection = false;
    this._aimCurrent = new THREE.Vector3();
    this._aimError = new THREE.Vector3();
    this._aimErrorTimer = 0;
    this._aimErrorRefreshMin = ap.errorRefreshMin;
    this._aimErrorRefreshMax = ap.errorRefreshMax;
    this._refreshAimError();

    // ── Burst firing ─────────────────────────────────────
    this._burstRemaining = 0;
    this._burstCooldown = 0;
    this._shotsInBurst = 0;

    // ── Combat movement sub-behaviors ─────────────────────
    this._combatMove = null;       // current movement type (COMBAT_MOVE enum)
    this._combatMoveTimer = 0;     // time spent in current movement
    this._combatMoveDuration = 0;  // how long current movement lasts
    this._microPauseTimer = 0;     // brief pause between movements

    // ── Strafing (used within strafe combat movement) ─────
    this._strafeDir = 1;
    this._strafeTimer = 0;
    this._strafeInterval = 0.5 + Math.random() * 0.8;
    this._jigglePeek = pKey === 'cautious' || Math.random() < 0.3;
    this._jiggleTimer = 0;
    this._jiggleInterval = 0.2 + Math.random() * 0.3;
    this._jiggleCount = 0;

    // ── LOS grace period ──────────────────────────────────
    this._losGraceTimer = 0;
    this._lastKnownPlayerPos = null;

    // ── Sprint burst ─────────────────────────────────────
    this._sprintTimer = 0;
    this._sprinting = false;

    // ── Investigate state ────────────────────────────────
    this._investigatePos = null;
    this._investigateTimer = 0;
    this._lookAroundTimer = 0;

    // ── Retreat state ────────────────────────────────────
    this._retreatTarget = null;
    this._engageStartHP = this.health;

    // ── Radio voice ────────────────────────────────────
    this._lastRadioTime = 0;
    this._saidNeedBackup = false;

    // ── Cover state ──────────────────────────────────────
    this._coverPos = null;
    this._coverTimer = 0;
    this._peekTimer = 0;
    this._isPeeking = false;
    this._coverSearchCooldown = 0;
    this._lastCoverSearch = 0;

    // ── Ambush state ───────────────────────────────────────
    this._ambushTimer = 0;
    this._ambushTimeout = 0;
    this._ambushEntryHP = this.health;

    // ── Bot weapon system ────────────────────────────────
    var weaponKey = getBotWeapon(roundNum || 1);
    var DEFS = GAME.WEAPON_DEFS;
    this._weaponDef = DEFS ? DEFS[weaponKey] : null;
    this._weaponKey = weaponKey;
    this._ammo = this._weaponDef ? this._weaponDef.magSize : 30;
    this._reloading = false;
    this._reloadTimer = 0;

    // ── Hit flinch ───────────────────────────────────────
    this._flinchOffset = new THREE.Vector3();
    this._flinchDecay = 0;

    // ── Movement acceleration ────────────────────────────
    this._currentSpeed = 0;
    this._targetSpeed = this.speed;

    // ── Footstep sounds ────────────────────────────────
    this._footstepTimer = 0;
    this._footstepInterval = 0.45;

    // ── Stuck detection ────────────────────────────────────
    this._stuckTimer = 0;
    this._lastStuckCheckPos = { x: spawnPos.x, z: spawnPos.z };

    // ── Waypoint scoring (purposeful navigation) ────────
    this._waypointVisitTimes = new Array(waypoints.length);
    for (var wvi = 0; wvi < waypoints.length; wvi++) this._waypointVisitTimes[wvi] = 0;

    // ── Pre-aiming threat angles ─────────────────────────
    this._preAimTimer = 0;
    this._preAimTarget = null;
    this._preAimRefresh = { easy: 1.0, normal: 0.5, hard: 0.4, elite: 0.3 }[diffName] || 0.5;

    // ── Weapon raise blend (0=idle, 1=aiming) ────────────
    this._aimBlend = 0;

    // ── Callout state ────────────────────────────────────
    this._lastSeenPlayerPos = null;
    this._lastSeenTime = 0;

    // ── Build mesh ───────────────────────────────────────
    this.mesh = new THREE.Group();
    this._buildModel(id);
    this.mesh.position.set(spawnPos.x, 0, spawnPos.z);
    scene.add(this.mesh);

    this._markerTime = Math.random() * Math.PI * 2;
  }

  // ── Geometry & Material Caches (shared across all enemies) ──

  var _geoCache = null;
  function _ensureGeoCache() {
    if (_geoCache) return;

    // Helper: build LatheGeometry from profile array [[y, radius], ...]
    function lathe(profile, segs) {
      var pts = [];
      for (var i = 0; i < profile.length; i++) {
        pts.push(new THREE.Vector2(profile[i][1], profile[i][0]));
      }
      return new THREE.LatheGeometry(pts, segs);
    }

    _geoCache = {
      // TRUNK — single continuous piece from pelvis to neck base
      // Eliminates pelvis/torso/neck junction gaps entirely
      // Placed at y=0.93; top at y=0.93+0.95=1.88
      trunk: lathe([
        [0, 0.25],       // pelvis bottom (wide, covers thigh tops)
        [0.07, 0.28],    // hips widest
        [0.14, 0.22],    // waist (narrow V-taper)
        [0.32, 0.27],    // ribs
        [0.50, 0.30],    // chest (widest)
        [0.67, 0.28],    // upper chest
        [0.82, 0.22],    // shoulder base
        [0.90, 0.15],    // neck base
        [0.95, 0.11]     // neck top (connects into head sphere)
      ], 12),

      // Vest shell — sits over chest portion of trunk
      // Placed at y=1.18; top at y=1.18+0.55=1.73
      vest: lathe([
        [0, 0.29],
        [0.15, 0.34],
        [0.30, 0.35],
        [0.45, 0.33],
        [0.55, 0.26]
      ], 12),

      // THIGH — from knee (y=0, bottom) to hip (y=0.48, top)
      // Placed at y=0.53; top at y=1.01 (sinks 0.08 into trunk at 0.93)
      upperLeg: lathe([
        [0, 0.10],       // knee end
        [0.10, 0.12],    // above knee
        [0.25, 0.145],   // quad bulge
        [0.40, 0.135],   // upper thigh
        [0.48, 0.14]     // hip end (wide, sinks into trunk)
      ], 10),

      // CALF — from ankle (y=0, bottom) to below-knee (y=0.42, top)
      // Placed at y=0.17; top at y=0.59 (overlaps knee at 0.57)
      lowerLeg: lathe([
        [0, 0.08],       // ankle (sinks into boot)
        [0.07, 0.10],    // above ankle
        [0.18, 0.115],   // calf bulge
        [0.34, 0.10],    // below knee
        [0.42, 0.105]    // knee junction (matches knee sphere)
      ], 10),

      // Knee sphere — bridges calf top and thigh bottom
      knee: new THREE.SphereGeometry(0.105, 8, 8),

      // BICEP — from elbow (y=0, bottom) to shoulder (y=0.38, top)
      // Flipped so thick shoulder end is at top, thin elbow at bottom
      upperArm: lathe([
        [0, 0.07],       // elbow end (bottom)
        [0.10, 0.085],
        [0.26, 0.10],    // bicep bulge
        [0.38, 0.09]     // shoulder end (top, sinks into shoulder sphere)
      ], 8),

      // FOREARM — from wrist (y=0, bottom) to elbow (y=0.32, top)
      forearm: lathe([
        [0, 0.055],      // wrist
        [0.08, 0.065],
        [0.22, 0.08],    // forearm widest
        [0.32, 0.075]    // elbow end (top, overlaps elbow sphere)
      ], 8),

      // Elbow sphere — bridges bicep bottom and forearm top
      elbow: new THREE.SphereGeometry(0.08, 8, 8),

      // Hand parts
      palm: new THREE.BoxGeometry(0.08, 0.04, 0.10),
      fingers: new THREE.BoxGeometry(0.07, 0.03, 0.06),
      thumb: new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6),

      // Head (bottom at 2.12-0.28=1.84, overlaps trunk top at 1.88)
      head: new THREE.SphereGeometry(0.28, 14, 10),

      // Face details
      nose: new THREE.ConeGeometry(0.035, 0.08, 8),
      brow: new THREE.BoxGeometry(0.24, 0.04, 0.08),
      jaw: new THREE.SphereGeometry(0.18, 10, 8),
      ear: new THREE.SphereGeometry(0.06, 8, 6),
      eyeball: new THREE.SphereGeometry(0.04, 8, 6),
      pupil: new THREE.SphereGeometry(0.025, 8, 6),

      // Helmet
      helmetDome: new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      helmetRim: new THREE.CylinderGeometry(0.34, 0.34, 0.05, 12),

      // Shoulder pads
      shoulder: new THREE.SphereGeometry(0.13, 8, 8),

      // Boots
      boot: new THREE.BoxGeometry(0.22, 0.22, 0.35),
      bootSole: new THREE.BoxGeometry(0.24, 0.04, 0.37),
      bootToe: new THREE.CylinderGeometry(0.10, 0.10, 0.20, 8, 1, false, 0, Math.PI),

      // Weapon parts
      barrel: new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8),
      receiver: new THREE.BoxGeometry(0.06, 0.1, 0.25),
      magazine: new THREE.BoxGeometry(0.04, 0.12, 0.04),
      stock: new THREE.BoxGeometry(0.04, 0.08, 0.18),

      // Marker
      marker: new THREE.BoxGeometry(0.3, 0.3, 0.3),

      // Terrorist head gear
      beanie: new THREE.SphereGeometry(0.31, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55),
      faceMask: new THREE.BoxGeometry(0.30, 0.14, 0.16)
    };
  }

  // Material palettes — 5 skin/cloth/vest/helmet variants + shared materials
  var _matPalettes = null;
  var _ctPalettes = null;
  var _tPalettes = null;
  var _sharedMats = null;
  function _ensureMatPalettes() {
    if (_matPalettes) return;

    var skinTones = [0xe8b89d, 0xc68642, 0x8d5524, 0xf1c27d, 0xd4a574];
    var clothColors = [0x1a1a1a, 0x2c1a0e, 0x1e2218, 0x3a2010, 0x141414]; // dark civilian
    var vestColors = [0x2a2010, 0x252525, 0x1a1a2a, 0x2a1e10, 0x1e1e1e]; // worn jackets
    var helmetColors = [0x0a0a0a, 0x0e0808, 0x080a08, 0x0c0c08, 0x080808]; // near-black beanies

    _matPalettes = [];
    for (var i = 0; i < 5; i++) {
      _matPalettes.push({
        skin: new THREE.MeshStandardMaterial({ color: skinTones[i], roughness: 0.85, metalness: 0.0 }),
        cloth: new THREE.MeshStandardMaterial({ color: clothColors[i], roughness: 0.9, metalness: 0.0 }),
        vest: new THREE.MeshStandardMaterial({ color: vestColors[i], roughness: 0.75, metalness: 0.05 }),
        helmet: new THREE.MeshStandardMaterial({ color: helmetColors[i], roughness: 0.55, metalness: 0.15 })
      });
    }

    // CT palettes (navy/blue theme)
    var ctSkinTones   = [0xe8b89d, 0xc68642, 0x8d5524, 0xf1c27d, 0xd4a574];
    var ctClothColors = [0x1a2a4a, 0x1e2848, 0x1a2640, 0x1c2c4e, 0x182444]; // navy
    var ctVestColors  = [0x2a4a7a, 0x2e4e7e, 0x284672, 0x2c4c78, 0x264470]; // blue vest
    var ctHelmetColors= [0x333333, 0x383838, 0x303030, 0x353535, 0x2e2e2e]; // dark helmet

    _ctPalettes = [];
    for (var ci = 0; ci < 5; ci++) {
      _ctPalettes.push({
        skin: new THREE.MeshStandardMaterial({ color: ctSkinTones[ci], roughness: 0.85, metalness: 0.0 }),
        cloth: new THREE.MeshStandardMaterial({ color: ctClothColors[ci], roughness: 0.9, metalness: 0.0 }),
        vest: new THREE.MeshStandardMaterial({ color: ctVestColors[ci], roughness: 0.75, metalness: 0.05 }),
        helmet: new THREE.MeshStandardMaterial({ color: ctHelmetColors[ci], roughness: 0.55, metalness: 0.15 })
      });
    }

    // T palettes (tan/brown theme)
    var tSkinTones   = [0xe8b89d, 0xc68642, 0x8d5524, 0xf1c27d, 0xd4a574];
    var tClothColors = [0x8b7355, 0x7a6648, 0x91795a, 0x84704f, 0x7e6a4c]; // tan/khaki
    var tVestColors  = [0x4a3728, 0x503c2d, 0x443225, 0x4c392a, 0x423024]; // brown vest
    var tHelmetColors= [0x222222, 0x1e1e1e, 0x252525, 0x202020, 0x1c1c1c]; // dark balaclava

    _tPalettes = [];
    for (var ti = 0; ti < 5; ti++) {
      _tPalettes.push({
        skin: new THREE.MeshStandardMaterial({ color: tSkinTones[ti], roughness: 0.85, metalness: 0.0 }),
        cloth: new THREE.MeshStandardMaterial({ color: tClothColors[ti], roughness: 0.9, metalness: 0.0 }),
        vest: new THREE.MeshStandardMaterial({ color: tVestColors[ti], roughness: 0.75, metalness: 0.05 }),
        helmet: new THREE.MeshStandardMaterial({ color: tHelmetColors[ti], roughness: 0.55, metalness: 0.15 })
      });
    }

    _sharedMats = {
      boot: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.05 }),
      sole: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, metalness: 0.0 }),
      gun: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.7 }),
      stockMat: new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7, metalness: 0.0 }),
      belt: new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.5, metalness: 0.2 }),
      plate: new THREE.MeshStandardMaterial({ color: 0x3a3a2a, roughness: 0.6, metalness: 0.1 }),
      rim: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.2 }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3, metalness: 0.0 }),
      pupil: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.0 }),
      maskMat: new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.95, metalness: 0.0 })
    };
  }

  // ── Bot Radio Helper ───────────────────────────────────

  function botRadio(enemy, text, cooldown) {
    var now = Date.now();
    if (cooldown && now - enemy._lastRadioTime < cooldown) return;
    enemy._lastRadioTime = now;
    if (GAME.Sound && GAME.Sound.radioVoice(text)) {
      if (GAME._addRadioFeed) GAME._addRadioFeed('Bot ' + (enemy.id + 1) + ': ' + text);
    }
  }

  // ── Humanoid Model Builder ─────────────────────────────

  Enemy.prototype._buildModel = function(id) {
    _ensureGeoCache();
    _ensureMatPalettes();

    var G = _geoCache;
    var pal = this.team === 'ct' ? _ctPalettes[id % 5] :
              this.team === 't'  ? _tPalettes[id % 5] :
              _matPalettes[id % 5];
    var S = _sharedMats;
    var m = this.mesh;

    // ═══════════════════════════════════════════════════════
    // Vertical layout (each part overlaps its neighbors):
    //   Boot top=0.22 → Calf 0.17-0.59 → Knee@0.57 → Thigh 0.53-1.01
    //   → Trunk 0.93-1.88 → Head@2.12 (bottom 1.84)
    // ═══════════════════════════════════════════════════════

    // ── Boots (angular — tactical boots ARE blocky) ──────
    var leftBoot = shadow(new THREE.Mesh(G.boot, S.boot));
    leftBoot.position.set(-0.15, 0.11, 0.03);
    m.add(leftBoot);
    var rightBoot = shadow(new THREE.Mesh(G.boot, S.boot));
    rightBoot.position.set(0.15, 0.11, 0.03);
    m.add(rightBoot);
    var leftSole = shadow(new THREE.Mesh(G.bootSole, S.sole));
    leftSole.position.set(-0.15, 0.02, 0.03);
    m.add(leftSole);
    var rightSole = shadow(new THREE.Mesh(G.bootSole, S.sole));
    rightSole.position.set(0.15, 0.02, 0.03);
    m.add(rightSole);
    var leftToe = shadow(new THREE.Mesh(G.bootToe, S.boot));
    leftToe.rotation.set(Math.PI / 2, 0, 0);
    leftToe.position.set(-0.15, 0.10, -0.15);
    m.add(leftToe);
    var rightToe = shadow(new THREE.Mesh(G.bootToe, S.boot));
    rightToe.rotation.set(Math.PI / 2, 0, 0);
    rightToe.position.set(0.15, 0.10, -0.15);
    m.add(rightToe);

    // ── Calves — bottom at 0.17 (sinks into boot), top at 0.59 ──
    var leftCalf = shadow(new THREE.Mesh(G.lowerLeg, pal.cloth));
    leftCalf.position.set(-0.15, 0.17, 0);
    m.add(leftCalf);
    var rightCalf = shadow(new THREE.Mesh(G.lowerLeg, pal.cloth));
    rightCalf.position.set(0.15, 0.17, 0);
    m.add(rightCalf);

    // ── Knees — at 0.57 (overlaps calf top 0.59 & thigh bottom 0.53) ──
    var leftKnee = shadow(new THREE.Mesh(G.knee, pal.cloth));
    leftKnee.position.set(-0.15, 0.57, 0);
    m.add(leftKnee);
    var rightKnee = shadow(new THREE.Mesh(G.knee, pal.cloth));
    rightKnee.position.set(0.15, 0.57, 0);
    m.add(rightKnee);

    // ── Thighs — bottom at 0.53 (overlaps knee), top at 1.01 ──
    var leftThigh = shadow(new THREE.Mesh(G.upperLeg, pal.cloth));
    leftThigh.position.set(-0.15, 0.53, 0);
    m.add(leftThigh);
    var rightThigh = shadow(new THREE.Mesh(G.upperLeg, pal.cloth));
    rightThigh.position.set(0.15, 0.53, 0);
    m.add(rightThigh);

    // ── Trunk (one piece: pelvis→waist→chest→neck) ──────
    // Bottom at 0.93 (thigh top 1.01 sinks 0.08 in), top at 1.88
    var trunk = shadow(new THREE.Mesh(G.trunk, pal.cloth));
    trunk.position.y = 0.93;
    m.add(trunk);

    // ── Vest shell over chest ───────────────────────────
    var vest = shadow(new THREE.Mesh(G.vest, pal.vest));
    vest.position.y = 1.18;
    m.add(vest);

    // ── Arms (bicep top sinks into shoulder sphere) ─────
    // Bicep: y=0 is elbow end, y=0.38 is shoulder end
    // Placed at local y=-0.34 → shoulder end at local 0.04 (inside shoulder r=0.13)
    // Elbow sphere at local y=-0.32 (overlaps bicep bottom at -0.34)
    // Forearm: y=0.32 is elbow end, placed so top overlaps elbow sphere

    // Right arm
    this._rightArmGroup = new THREE.Group();
    this._rightArmGroup.position.set(0.42, 1.75, 0);
    var rBicep = shadow(new THREE.Mesh(G.upperArm, pal.cloth));
    rBicep.position.set(0, -0.34, 0);
    this._rightArmGroup.add(rBicep);
    var rElbow = shadow(new THREE.Mesh(G.elbow, pal.cloth));
    rElbow.position.set(0, -0.32, 0);
    this._rightArmGroup.add(rElbow);
    var rForearm = shadow(new THREE.Mesh(G.forearm, pal.cloth));
    rForearm.position.set(0, -0.52, -0.12);
    rForearm.rotation.x = -0.7;
    this._rightArmGroup.add(rForearm);
    var rPalm = shadow(new THREE.Mesh(G.palm, pal.skin));
    rPalm.position.set(0, -0.55, -0.30);
    this._rightArmGroup.add(rPalm);
    var rFingers = shadow(new THREE.Mesh(G.fingers, pal.skin));
    rFingers.position.set(0, -0.56, -0.36);
    rFingers.rotation.x = 0.3;
    this._rightArmGroup.add(rFingers);
    var rThumb = shadow(new THREE.Mesh(G.thumb, pal.skin));
    rThumb.position.set(0.04, -0.55, -0.28);
    rThumb.rotation.z = 0.5;
    this._rightArmGroup.add(rThumb);
    this._rightArmGroup.rotation.x = -0.5;
    m.add(this._rightArmGroup);

    // Left arm
    this._leftArmGroup = new THREE.Group();
    this._leftArmGroup.position.set(-0.42, 1.75, 0);
    var lBicep = shadow(new THREE.Mesh(G.upperArm, pal.cloth));
    lBicep.position.set(0, -0.34, 0);
    this._leftArmGroup.add(lBicep);
    var lElbow = shadow(new THREE.Mesh(G.elbow, pal.cloth));
    lElbow.position.set(0, -0.32, 0);
    this._leftArmGroup.add(lElbow);
    var lForearm = shadow(new THREE.Mesh(G.forearm, pal.cloth));
    lForearm.position.set(0, -0.52, -0.18);
    lForearm.rotation.x = -0.9;
    this._leftArmGroup.add(lForearm);
    var lPalm = shadow(new THREE.Mesh(G.palm, pal.skin));
    lPalm.position.set(0, -0.51, -0.42);
    this._leftArmGroup.add(lPalm);
    var lFingers = shadow(new THREE.Mesh(G.fingers, pal.skin));
    lFingers.position.set(0, -0.52, -0.48);
    lFingers.rotation.x = 0.3;
    this._leftArmGroup.add(lFingers);
    var lThumb = shadow(new THREE.Mesh(G.thumb, pal.skin));
    lThumb.position.set(-0.04, -0.51, -0.40);
    lThumb.rotation.z = -0.5;
    this._leftArmGroup.add(lThumb);
    this._leftArmGroup.rotation.x = -0.75;
    m.add(this._leftArmGroup);

    // ── Head — at 2.12 (bottom 1.84, overlaps trunk top 1.88) ──
    var head = shadow(new THREE.Mesh(G.head, pal.skin));
    head.position.y = 2.12;
    m.add(head);

    // ── Face details ────────────────────────────────────
    var brow = new THREE.Mesh(G.brow, pal.skin);
    brow.position.set(0, 2.20, -0.24);
    m.add(brow);
    var nose = new THREE.Mesh(G.nose, pal.skin);
    nose.position.set(0, 2.08, -0.28);
    nose.rotation.x = -0.3;
    m.add(nose);
    var jaw = new THREE.Mesh(G.jaw, pal.skin);
    jaw.position.set(0, 2.00, -0.04);
    jaw.scale.set(1, 0.7, 0.9);
    m.add(jaw);
    var leftEar = new THREE.Mesh(G.ear, pal.skin);
    leftEar.position.set(-0.27, 2.12, 0);
    leftEar.scale.set(0.4, 1, 0.7);
    m.add(leftEar);
    var rightEar = new THREE.Mesh(G.ear, pal.skin);
    rightEar.position.set(0.27, 2.12, 0);
    rightEar.scale.set(0.4, 1, 0.7);
    m.add(rightEar);
    var leftEyeball = new THREE.Mesh(G.eyeball, S.eyeWhite);
    leftEyeball.position.set(-0.10, 2.15, -0.24);
    m.add(leftEyeball);
    var rightEyeball = new THREE.Mesh(G.eyeball, S.eyeWhite);
    rightEyeball.position.set(0.10, 2.15, -0.24);
    m.add(rightEyeball);
    var leftPupil = new THREE.Mesh(G.pupil, S.pupil);
    leftPupil.position.set(-0.10, 2.15, -0.27);
    m.add(leftPupil);
    var rightPupil = new THREE.Mesh(G.pupil, S.pupil);
    rightPupil.position.set(0.10, 2.15, -0.27);
    m.add(rightPupil);

    // ── Balaclava: dark knit cap + lower-face mask ──────
    var beanie = shadow(new THREE.Mesh(G.beanie, pal.helmet));
    beanie.position.y = 2.14;
    m.add(beanie);
    var maskMesh = new THREE.Mesh(G.faceMask, S.maskMat);
    maskMesh.position.set(0, 2.02, -0.20);
    m.add(maskMesh);

    // ── Weapon ──────────────────────────────────────────
    var weaponGroup = new THREE.Group();
    var barrel = shadow(new THREE.Mesh(G.barrel, S.gun));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.35);
    weaponGroup.add(barrel);
    var receiver = shadow(new THREE.Mesh(G.receiver, S.gun));
    receiver.position.set(0, 0, -0.05);
    weaponGroup.add(receiver);
    var magazine = shadow(new THREE.Mesh(G.magazine, S.gun));
    magazine.position.set(0, -0.08, -0.05);
    weaponGroup.add(magazine);
    var stock = shadow(new THREE.Mesh(G.stock, S.stockMat));
    stock.position.set(0, 0, 0.17);
    weaponGroup.add(stock);
    weaponGroup.position.set(0.15, 1.25, -0.45);
    m.add(weaponGroup);
    this._weaponGroup = weaponGroup;

    // ── Floating marker ─────────────────────────────────
    var markerColor = this.team === 'ct' ? 0x4f93f7 :
                      this.team === 't'  ? 0xff4500 :
                      this.personality.markerColor;
    var markerMat = new THREE.MeshBasicMaterial({ color: markerColor });
    this.marker = new THREE.Mesh(G.marker, markerMat);
    this.marker.position.y = 3.0;
    m.add(this.marker);
  };

  // ── Aim System ─────────────────────────────────────────

  Enemy.prototype._refreshAimError = function() {
    this._aimError.set(
      (Math.random() - 0.5) * 2 * this._aimErrorMag,
      (Math.random() - 0.5) * 1.5 * this._aimErrorMag,
      (Math.random() - 0.5) * 2 * this._aimErrorMag
    );
    this._aimErrorTimer = this._aimErrorRefreshMin + Math.random() * (this._aimErrorRefreshMax - this._aimErrorRefreshMin);
  };

  Enemy.prototype._updateAim = function(playerPos, dt) {
    // Target = player position + aim error (with distance falloff)
    var dist = this.mesh.position.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));
    var distFactor = 1.0 + Math.max(0, dist - 10) * 0.03;

    // Apply flinch offset
    var target = playerPos.clone();
    target.x += this._aimError.x * distFactor + this._flinchOffset.x;
    target.y += this._aimError.y * distFactor + this._flinchOffset.y;
    target.z += this._aimError.z * distFactor + this._flinchOffset.z;

    // Spray penalty — shots within burst degrade accuracy
    if (this._shotsInBurst > 0) {
      var sprayMult = 1 + this._shotsInBurst * 0.15;
      target.x += (Math.random() - 0.5) * this._aimErrorMag * sprayMult * 0.5;
      target.y += (Math.random() - 0.5) * this._aimErrorMag * sprayMult * 0.3;
    }

    // Lerp aim toward target
    var lerpFactor = 1 - Math.exp(-this._aimSpeed * dt);
    this._aimCurrent.lerp(target, lerpFactor);

    // Refresh error periodically
    this._aimErrorTimer -= dt;
    if (this._aimErrorTimer <= 0) this._refreshAimError();

    // Decay flinch
    if (this._flinchDecay > 0) {
      this._flinchDecay -= dt;
      this._flinchOffset.multiplyScalar(0.9);
      if (this._flinchDecay <= 0) this._flinchOffset.set(0, 0, 0);
    }
  };

  // ── Vision / LOS ───────────────────────────────────────

  Enemy.prototype._canSeePlayer = function(playerPos) {
    var myPos = this.mesh.position.clone();
    myPos.y = 1.5;
    var toPlayer = playerPos.clone().sub(myPos);
    var dist = toPlayer.length();
    if (dist > this.sightRange) return false;

    // FOV check — 120° cone (60° half-angle)
    var forward = new THREE.Vector3(
      -Math.sin(this.mesh.rotation.y),
      0,
      -Math.cos(this.mesh.rotation.y)
    );
    var toPlayerFlat = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
    var dot = forward.dot(toPlayerFlat);
    if (dot < 0.5) return false; // cos(60°) ≈ 0.5

    // Store whether detection is peripheral (outer 30° of cone) for reaction delay
    this._peripheralDetection = dot < 0.866; // cos(30°) ≈ 0.866

    // Check smoke obstruction
    var smokes = GAME._activeSmokes || [];
    for (var s = 0; s < smokes.length; s++) {
      var smoke = smokes[s];
      var toSmoke = smoke.center.clone().sub(myPos);
      toSmoke.y = 0;
      var dirFlat = toPlayer.clone();
      dirFlat.y = 0;
      var dirLen = dirFlat.length();
      if (dirLen < 0.01) continue;
      dirFlat.normalize();
      var proj = toSmoke.dot(dirFlat);
      if (proj > 0 && proj < dist) {
        var closest = myPos.clone().add(dirFlat.clone().multiplyScalar(proj));
        closest.y = 0;
        var distToSmoke = closest.distanceTo(new THREE.Vector3(smoke.center.x, 0, smoke.center.z));
        if (distToSmoke < smoke.radius) return false;
      }
    }

    toPlayer.normalize();
    this._rc.set(myPos, toPlayer);
    this._rc.far = dist;
    var hits = this._rc.intersectObjects(this.walls, false);
    return !(hits.length > 0 && hits[0].distance < dist - 0.5);
  };

  // ── Movement ───────────────────────────────────────────

  Enemy.prototype._moveToward = function(target, dt, speedOverride, skipRotation) {
    var pos = this.mesh.position;
    this._dir.set(target.x - pos.x, 0, target.z - pos.z);
    var dist = this._dir.length();
    if (dist < 1) return true;

    this._dir.normalize();

    // Smooth rotation
    if (!skipRotation) {
      var targetRot = Math.atan2(this._dir.x, this._dir.z) + Math.PI;
      var diff = targetRot - this.mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, 8 * dt);
    }

    // Acceleration
    this._targetSpeed = speedOverride || this.speed;
    this._currentSpeed += (this._targetSpeed - this._currentSpeed) * Math.min(1, 5 * dt);

    var step = this._currentSpeed * dt;
    this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), this._dir);
    this._rc.far = step + ENEMY_RADIUS;
    var hits = this._rc.intersectObjects(this.walls, false);
    if (hits.length === 0) {
      pos.x += this._dir.x * step;
      pos.z += this._dir.z * step;
    } else {
      // Wall slide — try both perpendicular directions
      var slideDir = new THREE.Vector3(-this._dir.z, 0, this._dir.x);
      this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), slideDir);
      this._rc.far = Math.abs(step * 0.5) + ENEMY_RADIUS;
      var slideHits = this._rc.intersectObjects(this.walls, false);
      if (slideHits.length === 0) {
        pos.x += slideDir.x * step * 0.5;
        pos.z += slideDir.z * step * 0.5;
      } else {
        // Try opposite perpendicular direction
        slideDir.set(this._dir.z, 0, -this._dir.x);
        this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), slideDir);
        this._rc.far = Math.abs(step * 0.5) + ENEMY_RADIUS;
        var slideHits2 = this._rc.intersectObjects(this.walls, false);
        if (slideHits2.length === 0) {
          pos.x += slideDir.x * step * 0.5;
          pos.z += slideDir.z * step * 0.5;
        }
      }
    }
    this._resolveCollisions();
    return false;
  };

  Enemy.prototype._faceDirection = function(targetRotY, dt, speed) {
    var diff = targetRotY - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, (speed || 8) * dt);
  };

  Enemy.prototype._findThreatAngle = function() {
    var pos = this.mesh.position;
    var origin = new THREE.Vector3(pos.x, 0.5, pos.z);
    var wallDists = [];
    for (var d = 0; d < COLLISION_DIRS.length; d++) {
      this._rc.set(origin, COLLISION_DIRS[d]);
      this._rc.far = 8;
      var hits = this._rc.intersectObjects(this.walls, false);
      wallDists.push(hits.length > 0 ? hits[0].distance : 8);
    }
    var bestOpening = null;
    var bestScore = 0;
    for (var i = 0; i < COLLISION_DIRS.length; i++) {
      var prev = (i + COLLISION_DIRS.length - 1) % COLLISION_DIRS.length;
      var next = (i + 1) % COLLISION_DIRS.length;
      if (wallDists[i] > 4 && (wallDists[prev] < 3 || wallDists[next] < 3)) {
        var score = wallDists[i];
        if (score > bestScore) {
          bestScore = score;
          bestOpening = Math.atan2(COLLISION_DIRS[i].x, COLLISION_DIRS[i].z) + Math.PI;
        }
      }
    }
    return bestOpening;
  };

  // Returns true if bot is close to a wall ahead (within 1.5 units).
  // When detected, immediately rotates bot toward the most open direction.
  Enemy.prototype._isFacingWall = function(dt) {
    var pos = this.mesh.position;
    var origin = new THREE.Vector3(pos.x, 0.5, pos.z);
    var forward = new THREE.Vector3(
      -Math.sin(this.mesh.rotation.y), 0, -Math.cos(this.mesh.rotation.y)
    );
    this._rc.set(origin, forward);
    this._rc.far = 1.5;
    var hits = this._rc.intersectObjects(this.walls, false);
    if (hits.length === 0) return false;

    // Find the most open direction via 8-direction raycast
    var bestDist = 0;
    var bestDir = null;
    for (var d = 0; d < COLLISION_DIRS.length; d++) {
      this._rc.set(origin, COLLISION_DIRS[d]);
      this._rc.far = 10;
      var dHits = this._rc.intersectObjects(this.walls, false);
      var dist = dHits.length > 0 ? dHits[0].distance : 10;
      if (dist > bestDist) {
        bestDist = dist;
        bestDir = COLLISION_DIRS[d];
      }
    }
    if (bestDir && dt) {
      var targetRot = Math.atan2(bestDir.x, bestDir.z) + Math.PI;
      this._faceDirection(targetRot, dt, 12);
    }
    return true;
  };

  Enemy.prototype._resolveCollisions = function() {
    var pos = this.mesh.position;
    var rc = this._rc;
    for (var i = 0; i < COLLISION_DIRS.length; i++) {
      var dir = COLLISION_DIRS[i];
      rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), dir);
      rc.far = ENEMY_RADIUS;
      var hits = rc.intersectObjects(this.walls, false);
      if (hits.length > 0) {
        var pushDist = ENEMY_RADIUS - hits[0].distance;
        pos.x -= dir.x * pushDist;
        pos.z -= dir.z * pushDist;
      }
    }
  };

  Enemy.prototype._facePlayer = function(playerPos, dt) {
    var dx = playerPos.x - this.mesh.position.x;
    var dz = playerPos.z - this.mesh.position.z;
    var targetRot = Math.atan2(dx, dz) + Math.PI;
    var diff = targetRot - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, 10 * dt);
  };

  // ── Strafing ───────────────────────────────────────────

  Enemy.prototype._strafe = function(playerPos, dt) {
    var pos = this.mesh.position;
    var dx = playerPos.x - pos.x;
    var dz = playerPos.z - pos.z;
    var len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.1) return;
    var perpX = -dz / len;
    var perpZ = dx / len;

    var strafeSpeed, step;

    // Jiggle peek — quick micro-movements
    if (this._jigglePeek) {
      strafeSpeed = this.speed * 0.8;
      this._jiggleTimer += dt;
      if (this._jiggleTimer >= this._jiggleInterval) {
        this._jiggleTimer = 0;
        this._strafeDir *= -1;
        this._jiggleCount++;
        this._jiggleInterval = 0.2 + Math.random() * 0.3;
      }
      step = strafeSpeed * dt * this._strafeDir * 0.5;
    } else {
      strafeSpeed = this.speed * 0.6;
      step = strafeSpeed * dt * this._strafeDir;
    }

    var strafeVec = new THREE.Vector3(perpX, 0, perpZ).normalize();
    this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), this._strafeDir > 0 ? strafeVec : strafeVec.clone().negate());
    this._rc.far = Math.abs(step) + ENEMY_RADIUS;
    var hits = this._rc.intersectObjects(this.walls, false);
    if (hits.length === 0) {
      pos.x += perpX * step;
      pos.z += perpZ * step;
    } else {
      this._strafeDir *= -1;
    }
    this._resolveCollisions();

    if (!this._jigglePeek) {
      this._strafeTimer += dt;
      if (this._strafeTimer >= this._strafeInterval) {
        this._strafeTimer = 0;
        this._strafeDir *= -1;
        this._strafeInterval = 0.4 + Math.random() * 0.8;
      }
    }
  };

  // ── Combat Movement Selection ────────────────────────────

  Enemy.prototype._rollCombatMove = function(playerPos, distToPlayer) {
    var pKey = PERSONALITY_KEYS[this.id % PERSONALITY_KEYS.length];

    // Check for nearby cover (quick 8-direction scan, 4-unit range)
    var hasNearbyCover = false;
    var pos = this.mesh.position;
    for (var ci = 0; ci < 8; ci++) {
      var ca = (ci / 8) * Math.PI * 2;
      this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), new THREE.Vector3(Math.cos(ca), 0, Math.sin(ca)));
      this._rc.far = 4;
      var ch = this._rc.intersectObjects(this.walls, false);
      if (ch.length > 0 && ch[0].distance > 1.5) { hasNearbyCover = true; break; }
    }

    var ctx = {
      hpRatio: this.health / this.maxHealth,
      distToPlayer: distToPlayer,
      hasNearbyCover: hasNearbyCover
    };

    var w = _calcCombatWeights(pKey, ctx);

    // Weighted random selection
    var r = Math.random();
    var cumulative = 0;
    var types = ['strafe', 'push', 'hold', 'retreatFire', 'rushCover'];
    var selected = COMBAT_MOVE.STRAFE; // fallback
    for (var ti = 0; ti < types.length; ti++) {
      cumulative += w[types[ti]];
      if (r <= cumulative) { selected = ti; break; }
    }

    this._combatMove = selected;
    this._combatMoveTimer = 0;

    // Set duration based on movement type
    if (selected === COMBAT_MOVE.RUSH_COVER) {
      this._combatMoveDuration = 0; // until arrival
      // Find cover now
      this._coverPos = this._findNearestCover(playerPos);
      if (!this._coverPos) {
        // No cover found — fall back to retreat-fire
        this._combatMove = COMBAT_MOVE.RETREAT_FIRE;
        selected = COMBAT_MOVE.RETREAT_FIRE;
      }
    }

    if (selected !== COMBAT_MOVE.RUSH_COVER) {
      var range = COMBAT_MOVE_DURATIONS[types[selected]];
      this._combatMoveDuration = range[0] + Math.random() * (range[1] - range[0]);
    }

    // 15% chance of micro-pause before starting the new movement
    if (Math.random() < 0.15) {
      this._microPauseTimer = 0.2 + Math.random() * 0.2;
    } else {
      this._microPauseTimer = 0;
    }

    // For strafe: 40% chance to keep same direction
    if (selected === COMBAT_MOVE.STRAFE && Math.random() >= 0.4) {
      this._strafeDir *= -1;
    }

    // Reset jiggle count when not strafing
    if (selected !== COMBAT_MOVE.STRAFE) {
      this._jiggleCount = 0;
    }
  };

  // ── Cover System ───────────────────────────────────────

  Enemy.prototype._findNearestCover = function(playerPos) {
    var pos = this.mesh.position;
    var bestScore = -Infinity;
    var bestSpot = null;
    var rc = this._rc;

    // 8-direction raycast to find nearby walls
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      var dx = Math.cos(angle);
      var dz = Math.sin(angle);
      var dir = new THREE.Vector3(dx, 0, dz);

      rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), dir);
      rc.far = 12;
      var hits = rc.intersectObjects(this.walls, false);
      if (hits.length > 0 && hits[0].distance > 1.5 && hits[0].distance < 10) {
        // Stand 1.2 units away from wall
        var wallDist = hits[0].distance;
        var coverX = pos.x + dx * (wallDist - 1.2);
        var coverZ = pos.z + dz * (wallDist - 1.2);

        // Score: prefer spots that block LOS to player
        var toPlayerX = playerPos.x - coverX;
        var toPlayerZ = playerPos.z - coverZ;
        var tpLen = Math.sqrt(toPlayerX * toPlayerX + toPlayerZ * toPlayerZ);
        if (tpLen < 0.1) continue;

        // Check if wall blocks LOS from cover spot to player
        var tpDir = new THREE.Vector3(toPlayerX / tpLen, 0, toPlayerZ / tpLen);
        rc.set(new THREE.Vector3(coverX, 1.0, coverZ), tpDir);
        rc.far = tpLen;
        var losHits = rc.intersectObjects(this.walls, false);
        var blocksLOS = losHits.length > 0 && losHits[0].distance < tpLen - 0.5;

        var score = blocksLOS ? 100 : 0;
        score -= wallDist * 2; // Prefer closer cover
        // Prefer cover away from player
        var dotToPlayer = dx * (playerPos.x - pos.x) + dz * (playerPos.z - pos.z);
        if (dotToPlayer < 0) score += 20;

        if (score > bestScore) {
          bestScore = score;
          bestSpot = { x: coverX, z: coverZ };
        }
      }
    }
    return bestSpot;
  };

  // ── Reload ─────────────────────────────────────────────

  Enemy.prototype._startReload = function() {
    if (this._reloading || !this._weaponDef) return;
    this._reloading = true;
    this._reloadTimer = this._weaponDef.reloadTime || 2.0;
    if (GAME.Sound) GAME.Sound.enemyReload();
  };

  // ── Main Update ────────────────────────────────────────

  Enemy.prototype.update = function(dt, playerPos, playerAlive, now) {
    if (!this.alive) return null;

    // Bob the marker
    this._markerTime += dt * 3;
    if (this.marker) {
      this.marker.position.y = 3.0 + Math.sin(this._markerTime) * 0.15;
    }

    // Reload timer
    if (this._reloading) {
      this._reloadTimer -= dt;
      if (this._reloadTimer <= 0) {
        this._reloading = false;
        this._ammo = this._weaponDef ? this._weaponDef.magSize : 30;
      }
    }

    // Blind timer (flashbang effect)
    if (this._blindTimer > 0) {
      this._blindTimer -= dt;
      // While blinded: stop firing, move slowly randomly, rotate randomly
      this._moveToward(
        this.mesh.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4)),
        dt, this.speed * 0.3
      );
      this.mesh.rotation.y += (Math.random() - 0.5) * 5 * dt;
      return null;
    }

    var canSee = playerAlive && this._canSeePlayer(playerPos);
    var distToPlayer = this.mesh.position.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));

    // Track last seen position for callouts/investigate
    if (canSee) {
      this._lastSeenPlayerPos = playerPos.clone();
      this._lastSeenTime = now;
    }

    // ── Reaction delay ───────────────────────────────────
    if (canSee && !this._hasReacted) {
      this._reactionTimer += dt;
      var effectiveDelay = (GAME.hasPerk && GAME.hasPerk('ghost')) ? this._reactionDelay * 1.3 : this._reactionDelay;
      // Peripheral awareness penalty (additive)
      if (this._peripheralDetection) {
        var diffName = _getDiffName();
        var peripheralPenalty = { easy: 0.3, normal: 0.15, hard: 0.05, elite: 0 };
        effectiveDelay += peripheralPenalty[diffName] || 0.15;
      }
      if (this._reactionTimer >= effectiveDelay) {
        this._hasReacted = true;
      }
    }
    if (!canSee) {
      this._reactionTimer = 0;
      this._hasReacted = false;
      this._peripheralDetection = false;
    }

    var canEngage = canSee && this._hasReacted;

    // ── Cover search cooldown ────────────────────────────
    this._coverSearchCooldown -= dt;

    // ── State Transitions ────────────────────────────────
    var prevState = this.state;

    if (this.state === PATROL) {
      if (canEngage) {
        this._engageStartHP = this.health;
        this.state = distToPlayer <= this.attackRange ? ATTACK : CHASE;
        botRadio(this, 'Contact!', 8000);
      }
    } else if (this.state === CHASE) {
      if (!playerAlive) { this.state = PATROL; }
      else if (!canSee) {
        // Lost sight — investigate last known position
        if (this._lastSeenPlayerPos) {
          this._investigatePos = this._lastSeenPlayerPos.clone();
          this._investigateTimer = 0;
          this._lookAroundTimer = 3 + Math.random();
          this.state = INVESTIGATE;
        } else {
          this.state = PATROL;
        }
      }
      else if (canEngage && distToPlayer <= this.attackRange) this.state = ATTACK;
    } else if (this.state === ATTACK) {
      if (!playerAlive) { this.state = PATROL; }
      else if (!canSee) {
        if (this._lastSeenPlayerPos) {
          this._investigatePos = this._lastSeenPlayerPos.clone();
          this._investigateTimer = 0;
          this._lookAroundTimer = 3 + Math.random();
          this.state = INVESTIGATE;
        } else {
          this.state = PATROL;
        }
      }
      else if (distToPlayer > this.attackRange) this.state = CHASE;
      // Check retreat condition
      else if (this.health < this._engageStartHP * this.personality.retreatHP) {
        this._retreatTarget = this._findRetreatWaypoint(playerPos);
        if (this._retreatTarget) {
          this.state = RETREAT;
          if (!this._saidNeedBackup) {
            this._saidNeedBackup = true;
            botRadio(this, 'Need backup', 0);
          }
        }
      }
      // Check if should take cover (reloading)
      else if (this._reloading && this._coverSearchCooldown <= 0) {
        var cover = this._findNearestCover(playerPos);
        if (cover) {
          this._coverPos = cover;
          this._coverTimer = this._reloadTimer + 1.0;
          this._peekTimer = 0;
          this._isPeeking = false;
          this.state = TAKE_COVER;
          this._coverSearchCooldown = 3;
        }
      }
    } else if (this.state === INVESTIGATE) {
      if (canEngage) {
        this._engageStartHP = this.health;
        this.state = distToPlayer <= this.attackRange ? ATTACK : CHASE;
      } else if (this._investigateTimer > this._lookAroundTimer) {
        this.state = PATROL;
      }
    } else if (this.state === RETREAT) {
      if (!playerAlive) this.state = PATROL;
      else if (!this._retreatTarget) this.state = PATROL;
      else {
        var retreatDist = this.mesh.position.distanceTo(
          new THREE.Vector3(this._retreatTarget.x, 0, this._retreatTarget.z)
        );
        if (retreatDist < 2) {
          // Arrived at retreat point — take cover or patrol
          if (canEngage && this.health > this._engageStartHP * 0.1) {
            this._engageStartHP = this.health;
            this.state = ATTACK;
          } else {
            this.state = PATROL;
          }
        }
      }
    } else if (this.state === TAKE_COVER) {
      if (!playerAlive) this.state = PATROL;
      else {
        this._coverTimer -= dt;
        if (this._coverTimer <= 0 && !this._reloading) {
          // Done taking cover — re-engage
          if (canEngage) {
            this._engageStartHP = this.health;
            this.state = ATTACK;
          } else {
            this.state = PATROL;
          }
        }
      }
    } else if (this.state === AMBUSH) {
      if (!playerAlive) { this.state = PATROL; }
      else {
        this._ambushTimer += dt;
        if (this._ambushTimer >= this._ambushTimeout) {
          this.state = PATROL;
        } else if (canEngage) {
          this._engageStartHP = this.health;
          var diffName = _getDiffName();
          var ambushReactionBonus = { easy: 1.0, normal: 0.7, hard: 0.5, elite: 0.4 };
          this._reactionDelay *= ambushReactionBonus[diffName] || 0.7;
          this._hasReacted = true;
          this.state = distToPlayer <= this.attackRange ? ATTACK : CHASE;
        } else if (this.health < this._ambushEntryHP * this.personality.retreatHP) {
          this._retreatTarget = this._findRetreatWaypoint(playerPos);
          if (this._retreatTarget) {
            this.state = RETREAT;
          } else {
            this.state = PATROL;
          }
        } else if (this.health < this._ambushEntryHP && canSee) {
          this._engageStartHP = this.health;
          this.state = distToPlayer <= this.attackRange ? ATTACK : CHASE;
        }
      }
    }

    // Reset burst and combat movement on state change away from attack
    if (prevState === ATTACK && this.state !== ATTACK) {
      this._burstRemaining = 0;
      this._burstCooldown = 0;
      this._shotsInBurst = 0;
      this._combatMove = null;
      this._combatMoveTimer = 0;
      this._microPauseTimer = 0;
    }

    // ── Aim update (always when seeing player) ───────────
    if (canSee) {
      this._updateAim(playerPos, dt);
    }

    // ── Weapon raise animation ────────────────────────────
    var targetAimBlend = (this.state === ATTACK || (this.state === TAKE_COVER && this._isPeeking)) ? 1.0 : 0.0;
    this._aimBlend += (targetAimBlend - this._aimBlend) * Math.min(1, 8 * dt);
    if (this._weaponGroup) {
      this._weaponGroup.position.y = 1.25 + this._aimBlend * 0.42;
      this._weaponGroup.position.z = -0.45 - this._aimBlend * 0.05;
    }
    if (this._rightArmGroup) {
      this._rightArmGroup.rotation.x = -0.5 - this._aimBlend * 0.75;
    }
    if (this._leftArmGroup) {
      this._leftArmGroup.rotation.x = -0.75 - this._aimBlend * 0.45;
    }

    // ── State Behavior ───────────────────────────────────
    var damageToPlayer = 0;

    if (this.state === PATROL) {
      // Slow down when arriving at waypoint
      if (this.patrolPauseTimer > 0) {
        this.patrolPauseTimer -= dt;
        this._currentSpeed *= 0.95;
      } else {
          var wp = this.waypoints[this.currentWaypoint];
          this._preAimTimer += dt;
          var usePreAim = false;
          if (this._preAimTimer >= this._preAimRefresh) {
            this._preAimTimer = 0;
            this._preAimTarget = this._findThreatAngle();
          }
          if (this._preAimTarget !== null) {
            usePreAim = true;
            this._faceDirection(this._preAimTarget, dt, 6);
          }
          if (this._moveToward(wp, dt, null, usePreAim)) {
            // Pick a reachable waypoint (line-of-sight check to avoid paths through walls)
            var reachable = [];
            var pos = this.mesh.position;
            for (var wi = 0; wi < this.waypoints.length; wi++) {
              if (wi === this.currentWaypoint) continue;
              var cand = this.waypoints[wi];
              var dx = cand.x - pos.x, dz = cand.z - pos.z;
              var d = Math.sqrt(dx * dx + dz * dz);
              if (d < 1) continue;
              // Raycast to check if path is clear of walls
              this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), new THREE.Vector3(dx / d, 0, dz / d));
              this._rc.far = d;
              var hits = this._rc.intersectObjects(this.walls, false);
              if (hits.length === 0 || hits[0].distance > d - 0.5) {
                reachable.push(wi);
              }
            }
            if (reachable.length > 0) {
              var allyPositions = [];
              if (GAME.EnemyManager._currentInstance) {
                var allies = GAME.EnemyManager._currentInstance.enemies;
                for (var ai = 0; ai < allies.length; ai++) {
                  if (allies[ai] !== this && allies[ai].alive) {
                    allyPositions.push({ x: allies[ai].mesh.position.x, z: allies[ai].mesh.position.z });
                  }
                }
              }
              var ctx = { allyPositions: allyPositions, now: now || Date.now() };
              var bestIdx = reachable[0];
              var bestScore = -Infinity;
              for (var ri = 0; ri < reachable.length; ri++) {
                var sc = this._scoreWaypoint(reachable[ri], ctx);
                if (sc > bestScore) {
                  bestScore = sc;
                  bestIdx = reachable[ri];
                }
              }
              this.currentWaypoint = bestIdx;
              this._waypointVisitTimes[bestIdx] = now || Date.now();
            } else {
              this.currentWaypoint = Math.floor(Math.random() * this.waypoints.length);
            }
            this.patrolPauseTimer = this.personality.patrolPause;
          }
      }

      // ── Stuck detection ──
      // Wall-facing recovery: turn away from wall and pick a new waypoint
      if (this._isFacingWall(dt)) {
        this.currentWaypoint = (this.currentWaypoint + 1 + Math.floor(Math.random() * Math.max(1, this.waypoints.length - 1))) % this.waypoints.length;
        this._stuckTimer = 0;
      }
      // Periodic stuck check: if barely moved in 1.5 seconds, pick a new waypoint
      this._stuckTimer += dt;
      if (this._stuckTimer > 1.5) {
        var sp = this.mesh.position;
        var sdx = sp.x - this._lastStuckCheckPos.x;
        var sdz = sp.z - this._lastStuckCheckPos.z;
        if (sdx * sdx + sdz * sdz < 1) {
          // Stuck — pick a reachable waypoint (teleport as last resort)
          var foundNew = false;
          for (var si = 0; si < this.waypoints.length; si++) {
            var swi = (this.currentWaypoint + 1 + si) % this.waypoints.length;
            var swp = this.waypoints[swi];
            var wdx = swp.x - sp.x, wdz = swp.z - sp.z;
            var wd = Math.sqrt(wdx * wdx + wdz * wdz);
            if (wd < 1) continue;
            // Check LOS to waypoint
            this._rc.set(new THREE.Vector3(sp.x, 0.5, sp.z), new THREE.Vector3(wdx / wd, 0, wdz / wd));
            this._rc.far = wd;
            var wHits = this._rc.intersectObjects(this.walls, false);
            if (wHits.length === 0 || wHits[0].distance > wd - 0.5) {
              this.currentWaypoint = swi;
              foundNew = true;
              break;
            }
          }
          if (!foundNew) {
            // No reachable waypoint — teleport to a clear one
            for (var si2 = 0; si2 < this.waypoints.length; si2++) {
              var swi2 = (this.currentWaypoint + 1 + si2) % this.waypoints.length;
              var swp2 = this.waypoints[swi2];
              if (_isSpawnClear(swp2.x, swp2.z, this.walls)) {
                sp.x = swp2.x;
                sp.z = swp2.z;
                this.currentWaypoint = swi2;
                break;
              }
            }
          }
        }
        this._lastStuckCheckPos.x = sp.x;
        this._lastStuckCheckPos.z = sp.z;
        this._stuckTimer = 0;
      }

    } else if (this.state === CHASE) {
      this._sprintTimer -= dt;
      if (this._sprintTimer <= 0) {
        this._sprinting = Math.random() < 0.3;
        this._sprintTimer = 1.0 + Math.random() * 1.5;
      }
      var chaseSpeed = this._sprinting ? this.speed * 1.5 : this.speed;
      this._moveToward(playerPos, dt, chaseSpeed);
      // Stuck detection for chase — turn away from wall or fall back to patrol
      if (this._isFacingWall(dt)) {
        this._stuckTimer += dt;
      }
      this._stuckTimer += dt;
      if (this._stuckTimer > 1.5) {
        var csp = this.mesh.position;
        var csdx = csp.x - this._lastStuckCheckPos.x;
        var csdz = csp.z - this._lastStuckCheckPos.z;
        if (csdx * csdx + csdz * csdz < 1) {
          this.state = PATROL;
          this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
        }
        this._lastStuckCheckPos.x = csp.x;
        this._lastStuckCheckPos.z = csp.z;
        this._stuckTimer = 0;
      }

    } else if (this.state === ATTACK) {
      this._facePlayer(playerPos, dt);

      // ── Combat movement sub-behavior ──────────────────
      if (this._combatMove === null || (this._combatMoveDuration > 0 && this._combatMoveTimer >= this._combatMoveDuration)) {
        this._rollCombatMove(playerPos, distToPlayer);
      }

      // Micro-pause: briefly stop before new movement
      if (this._microPauseTimer > 0) {
        this._microPauseTimer -= dt;
      } else {
        this._combatMoveTimer += dt;

        if (this._combatMove === COMBAT_MOVE.STRAFE) {
          this._strafe(playerPos, dt);
          if (this._jigglePeek) {
            if (this._jiggleCount > 3 + Math.floor(Math.random() * 3)) {
              this._combatMoveTimer = this._combatMoveDuration;
            }
          }
        } else if (this._combatMove === COMBAT_MOVE.PUSH) {
          this._moveToward(playerPos, dt, this.speed * 0.7);
        } else if (this._combatMove === COMBAT_MOVE.HOLD) {
          this._currentSpeed *= 0.9;
        } else if (this._combatMove === COMBAT_MOVE.RETREAT_FIRE) {
          var rfPos = this.mesh.position;
          var rfDx = rfPos.x - (playerPos.x - rfPos.x);
          var rfDz = rfPos.z - (playerPos.z - rfPos.z);
          this._moveToward({ x: rfDx, z: rfDz }, dt, this.speed * 0.6);
        } else if (this._combatMove === COMBAT_MOVE.RUSH_COVER) {
          if (this._coverPos) {
            var rcPos = this.mesh.position;
            var rcDx = this._coverPos.x - rcPos.x;
            var rcDz = this._coverPos.z - rcPos.z;
            var rcDist = Math.sqrt(rcDx * rcDx + rcDz * rcDz);
            if (rcDist > 1.5) {
              this._moveToward(this._coverPos, dt, this.speed * 0.8);
            } else {
              this._coverTimer = 3.0;
              this._peekTimer = 0;
              this._isPeeking = false;
              this.state = TAKE_COVER;
            }
          } else {
            this._combatMove = COMBAT_MOVE.STRAFE;
          }
        }
      }

      // Burst firing (runs regardless of movement type)
      if (!this._reloading) {
        if (this._burstCooldown > 0) {
          this._burstCooldown -= dt;
        } else if (this._burstRemaining > 0) {
          var fireInterval = 1 / this.fireRate;
          if (now - this.lastFireTime >= fireInterval) {
            this.lastFireTime = now;
            this._burstRemaining--;
            this._shotsInBurst++;
            this._ammo--;

            // Hit determined by aim proximity to player
            var aimDist = this._aimCurrent.distanceTo(playerPos);
            var hitRadius = 0.6; // Player hitbox radius
            if (aimDist < hitRadius) {
              damageToPlayer = this._weaponDef ? this._weaponDef.damage || this.damage : this.damage;
            }

            this._showTracer(this._aimCurrent);
            if (GAME.Sound) {
              if (GAME.Sound.enemyShotSpatial) {
                var spos = this.mesh.position;
                GAME.Sound.enemyShotSpatial(spos.x, spos.y + 1.5, spos.z, playerPos);
              } else {
                GAME.Sound.enemyShot();
              }
            }

            // Check ammo
            if (this._ammo <= 0) {
              this._startReload();
              this._burstRemaining = 0;
            }
          }
        } else {
          // Start new burst
          var bMin = this.personality.burstMin;
          var bMax = this.personality.burstMax;
          this._burstRemaining = bMin + Math.floor(Math.random() * (bMax - bMin + 1));
          this._burstCooldown = 0.3 + Math.random() * 0.5;
          this._shotsInBurst = 0;
        }
      }

    } else if (this.state === INVESTIGATE) {
      this._investigateTimer += dt;
      if (this._investigatePos) {
        var arrived = this._moveToward(this._investigatePos, dt);
        if (arrived) {
          // Look around
          this.mesh.rotation.y += 2 * dt;
          this._investigatePos = null;
        }
      } else {
        // Looking around at investigate point
        this.mesh.rotation.y += 1.5 * dt;
      }
      // Stuck detection for investigate — turn away or fall back to patrol
      this._isFacingWall(dt);
      this._stuckTimer += dt;
      if (this._stuckTimer > 1.5 && this._investigatePos) {
        var isp = this.mesh.position;
        var isdx = isp.x - this._lastStuckCheckPos.x;
        var isdz = isp.z - this._lastStuckCheckPos.z;
        if (isdx * isdx + isdz * isdz < 1) {
          this._investigatePos = null;
          this.state = PATROL;
        }
        this._lastStuckCheckPos.x = isp.x;
        this._lastStuckCheckPos.z = isp.z;
        this._stuckTimer = 0;
      }

    } else if (this.state === RETREAT) {
      if (this._retreatTarget) {
        this._moveToward(this._retreatTarget, dt, this.speed * 1.3);
      }
      // Stuck detection for retreat — turn away or fall back to patrol
      this._isFacingWall(dt);
      this._stuckTimer += dt;
      if (this._stuckTimer > 1.5) {
        var rsp = this.mesh.position;
        var rsdx = rsp.x - this._lastStuckCheckPos.x;
        var rsdz = rsp.z - this._lastStuckCheckPos.z;
        if (rsdx * rsdx + rsdz * rsdz < 1) {
          this._retreatTarget = null;
          this.state = PATROL;
        }
        this._lastStuckCheckPos.x = rsp.x;
        this._lastStuckCheckPos.z = rsp.z;
        this._stuckTimer = 0;
      }

    } else if (this.state === TAKE_COVER) {
      if (this._coverPos) {
        var coverDist = this.mesh.position.distanceTo(
          new THREE.Vector3(this._coverPos.x, 0, this._coverPos.z)
        );

        if (coverDist > 1.5) {
          // Move to cover
          this._moveToward(this._coverPos, dt, this.speed * 1.1);
        } else {
          // At cover — peek behavior
          this._peekTimer += dt;

          if (!this._isPeeking) {
            // Hiding — wait before peeking
            if (this._peekTimer > 1.5 + Math.random() * 0.5 && !this._reloading) {
              this._isPeeking = true;
              this._peekTimer = 0;
            }
          } else {
            // Peeking — face and fire
            if (canEngage) {
              this._facePlayer(playerPos, dt);
              this._updateAim(playerPos, dt);

              if (this._burstCooldown > 0) {
                this._burstCooldown -= dt;
              } else if (this._burstRemaining > 0) {
                var fi = 1 / this.fireRate;
                if (now - this.lastFireTime >= fi) {
                  this.lastFireTime = now;
                  this._burstRemaining--;
                  this._shotsInBurst++;
                  this._ammo--;

                  var ad = this._aimCurrent.distanceTo(playerPos);
                  if (ad < 0.6) {
                    damageToPlayer = this._weaponDef ? this._weaponDef.damage || this.damage : this.damage;
                  }

                  this._showTracer(this._aimCurrent);
                  if (GAME.Sound) {
                    if (GAME.Sound.enemyShotSpatial) {
                      var spos = this.mesh.position;
                      GAME.Sound.enemyShotSpatial(spos.x, spos.y + 1.5, spos.z, playerPos);
                    } else {
                      GAME.Sound.enemyShot();
                    }
                  }

                  if (this._ammo <= 0) {
                    this._startReload();
                    this._burstRemaining = 0;
                  }
                }
              } else {
                this._burstRemaining = 2 + Math.floor(Math.random() * 2);
                this._burstCooldown = 0.2;
                this._shotsInBurst = 0;
              }
            }

            // Duck back after a short peek
            if (this._peekTimer > 0.8 + Math.random() * 0.4) {
              this._isPeeking = false;
              this._peekTimer = 0;
            }
          }
        }
      }
    } else if (this.state === AMBUSH) {
      if (this._investigatePos) {
        var adx = this._investigatePos.x - this.mesh.position.x;
        var adz = this._investigatePos.z - this.mesh.position.z;
        var ambushTargetRot = Math.atan2(adx, adz) + Math.PI;
        this._faceDirection(ambushTargetRot, dt, 6);
      }
    }

    // ── Footstep sounds ─────────────────────────────────
    if (this._currentSpeed > 1) {
      this._footstepTimer += dt;
      if (this._footstepTimer >= this._footstepInterval) {
        this._footstepTimer = 0;
        if (GAME.Sound && GAME.Sound.botFootstep && playerPos) {
          var fdx = this.mesh.position.x - playerPos.x;
          var fdz = this.mesh.position.z - playerPos.z;
          var distSq = fdx * fdx + fdz * fdz;
          if (distSq < 225) {
            var fp = this.mesh.position;
            GAME.Sound.botFootstep(fp.x, 0, fp.z);
          }
        }
      }
    } else {
      this._footstepTimer = 0;
    }

    return damageToPlayer > 0 ? damageToPlayer : null;
  };

  // ── Retreat waypoint selection ──────────────────────────

  Enemy.prototype._findRetreatWaypoint = function(playerPos) {
    var pos = this.mesh.position;
    var bestWP = null;
    var bestScore = -Infinity;

    for (var i = 0; i < this.waypoints.length; i++) {
      var wp = this.waypoints[i];
      var distFromPlayer = Math.sqrt(
        (wp.x - playerPos.x) * (wp.x - playerPos.x) +
        (wp.z - playerPos.z) * (wp.z - playerPos.z)
      );
      var distFromMe = Math.sqrt(
        (wp.x - pos.x) * (wp.x - pos.x) +
        (wp.z - pos.z) * (wp.z - pos.z)
      );

      // Check line-of-sight to waypoint (skip unreachable ones behind walls)
      if (distFromMe > 1) {
        var dx = wp.x - pos.x, dz = wp.z - pos.z;
        this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), new THREE.Vector3(dx / distFromMe, 0, dz / distFromMe));
        this._rc.far = distFromMe;
        var hits = this._rc.intersectObjects(this.walls, false);
        if (hits.length > 0 && hits[0].distance < distFromMe - 0.5) continue;
      }

      // Score: far from player, not too far from me
      var score = distFromPlayer * 2 - distFromMe;
      if (score > bestScore) {
        bestScore = score;
        bestWP = wp;
      }
    }
    return bestWP;
  };

  // ── Waypoint Scoring (purposeful navigation) ──────────

  Enemy.prototype._scoreWaypoint = function(wpIndex, ctx) {
    var wp = this.waypoints[wpIndex];
    var pKey = PERSONALITY_KEYS[this.id % PERSONALITY_KEYS.length];
    var weights = NAV_WEIGHTS[pKey] || NAV_WEIGHTS.balanced;
    var score = 0;

    // Factor 1: Sightline quality
    var sightScore = 0;
    var dirs = [
      new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
      new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)
    ];
    var wpOrigin = new THREE.Vector3(wp.x, 0.5, wp.z);
    for (var d = 0; d < dirs.length; d++) {
      this._rc.set(wpOrigin, dirs[d]);
      this._rc.far = this.sightRange;
      var hits = this._rc.intersectObjects(this.walls, false);
      sightScore += hits.length > 0 ? hits[0].distance : this.sightRange;
    }
    sightScore /= (this.sightRange * dirs.length);
    score += sightScore * weights.sightline;

    // Factor 2: Proximity to last-known player position
    if (this._lastSeenPlayerPos) {
      var dx = wp.x - this._lastSeenPlayerPos.x;
      var dz = wp.z - this._lastSeenPlayerPos.z;
      var distToPlayer = Math.sqrt(dx * dx + dz * dz);
      var proxScore = 1 - Math.min(distToPlayer / (this.sightRange * 2), 1);
      score += proxScore * weights.playerProximity;
    }

    // Factor 3: Time since last visited
    var timeSince = ctx.now - (this._waypointVisitTimes[wpIndex] || 0);
    var recencyScore = Math.min(timeSince / 30000, 1);
    score += recencyScore * weights.recency;

    // Factor 4: Distance from allies
    if (ctx.allyPositions && ctx.allyPositions.length > 0) {
      var minAllyDist = Infinity;
      for (var a = 0; a < ctx.allyPositions.length; a++) {
        var ax = wp.x - ctx.allyPositions[a].x;
        var az = wp.z - ctx.allyPositions[a].z;
        var ad = Math.sqrt(ax * ax + az * az);
        if (ad < minAllyDist) minAllyDist = ad;
      }
      var spreadScore = Math.min(minAllyDist / 30, 1);
      score += spreadScore * weights.allySpread;
    } else {
      score += 0.5 * weights.allySpread;
    }

    // Difficulty noise
    var diffName = _getDiffName();
    var noise = NAV_NOISE[diffName] || 0.3;
    score += (Math.random() - 0.5) * 2 * noise * score;

    return score;
  };

  // ── Tracers ────────────────────────────────────────────

  Enemy.prototype._showTracer = function(target) {
    var mgr = this._manager;
    var start = this.mesh.position.clone();
    start.y = 1.3;
    var end = target.clone();
    // Small random spread on tracer
    end.x += (Math.random() - 0.5) * 0.2;
    end.y += (Math.random() - 0.5) * 0.15;
    end.z += (Math.random() - 0.5) * 0.2;

    // Grab pooled tracer line (round-robin)
    var line = mgr._tracerPool[mgr._tracerIdx];
    mgr._tracerIdx = (mgr._tracerIdx + 1) % mgr._tracerPool.length;
    line.geometry.setFromPoints([start, end]);
    line.visible = true;

    // Grab pooled muzzle flash light (round-robin)
    var flash = mgr._flashPool[mgr._flashIdx];
    mgr._flashIdx = (mgr._flashIdx + 1) % mgr._flashPool.length;
    flash.position.copy(start);
    flash.intensity = 2;

    var tid = setTimeout(function() {
      line.visible = false;
      flash.intensity = 0;
    }, 60);
    mgr._poolTimeouts.push(tid);
  };

  // ── Damage ─────────────────────────────────────────────

  Enemy.prototype.takeDamage = function(amount) {
    if (!this.alive) return false;
    this.health -= amount;

    // Hit flinch — disrupts aim
    this._flinchOffset.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 4
    );
    this._flinchDecay = 0.5;
    // Interrupt current burst
    this._burstRemaining = 0;

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.die(this._lastHitDir);
      return true;
    }
    // Flash white on hit — traverse all nested meshes
    var marker = this.marker;
    this.mesh.traverse(function(c) {
      if (c.isMesh && c !== marker && c.material && c.material.color) {
        var origColor = c.material.color.getHex();
        c.material.color.setHex(0xffffff);
        setTimeout(function() { c.material.color.setHex(origColor); }, 100);
      }
    });
    return false;
  };

  Enemy.prototype.die = function(hitDir) {
    this._dying = true;
    var mesh = this.mesh;
    var arms = [this._rightArmGroup, this._leftArmGroup];

    // Determine death variant from hit direction relative to enemy facing
    // 0=backward(front hit), 1=forward(back hit), 2=spin(side), 3=crumple(headshot), 4=stagger(default)
    var variant = 4;
    var enemyFwd = null;
    if (hitDir) {
      enemyFwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), mesh.rotation.y);
      var dot = enemyFwd.dot(new THREE.Vector3(hitDir.x, 0, hitDir.z).normalize());
      if (this._headshotKill) {
        variant = 3;
      } else if (dot > 0.5) {
        variant = 0;
      } else if (dot < -0.5) {
        variant = 1;
      } else {
        variant = 2;
      }
    }

    // Spin direction for side hits
    var spinDir = 0;
    if (variant === 2 && hitDir && enemyFwd) {
      var cross = enemyFwd.x * hitDir.z - enemyFwd.z * hitDir.x;
      spinDir = cross >= 0 ? 1 : -1;
    }

    // Jolt target (recoil in hit direction, XZ only)
    var joltTargetX = 0, joltTargetZ = 0;
    if (hitDir && variant !== 3) { // No jolt for headshot crumple
      var hitXZ = new THREE.Vector3(hitDir.x, 0, hitDir.z).normalize();
      joltTargetX = hitXZ.x * 0.07;
      joltTargetZ = hitXZ.z * 0.07;
    }

    // Timing
    var JOLT_DURATION = (variant === 3) ? 0 : 0.1;
    var FALL_DURATION = 0.3;
    var TOTAL_DURATION = JOLT_DURATION + FALL_DURATION;

    // Per-variant final Y drop
    var finalY = [-1.0, -0.9, -1.0, -1.1, -0.9][variant]; // [backward, forward, spin, crumple, stagger]

    var elapsed = 0;
    var startX = mesh.position.x;
    var startY = mesh.position.y;
    var startZ = mesh.position.z;
    var self = this;

    this._deathInterval = setInterval(function() {
      elapsed += 0.016;
      if (elapsed > TOTAL_DURATION) elapsed = TOTAL_DURATION;

      // ── Phase 1: Hit Jolt (0 to JOLT_DURATION) ──
      if (JOLT_DURATION > 0 && elapsed <= JOLT_DURATION) {
        // Ease-out jolt: fast snap then settle, interpolate to target
        var joltT = elapsed / JOLT_DURATION;
        var joltEase = 1 - (1 - joltT) * (1 - joltT); // ease-out quadratic
        mesh.position.x = startX + joltTargetX * joltEase;
        mesh.position.z = startZ + joltTargetZ * joltEase;
      }

      // ── Phase 2: Gravity Fall (JOLT_DURATION to TOTAL_DURATION) ──
      if (elapsed > JOLT_DURATION) {
        var fallElapsed = elapsed - JOLT_DURATION;
        var fallT = Math.min(1, fallElapsed / FALL_DURATION);
        // Quadratic ease-in (gravity acceleration)
        var fallEase = fallT * fallT;

        // Per-variant rotations, Y drop, and arm poses
        if (variant === 0) {
          // Fall backward — flat on back, arms splayed
          mesh.position.y = startY + fallEase * finalY;
          mesh.rotation.x = -fallEase * Math.PI * 0.5;
          var armT = Math.max(0, (fallT - 0.1) / 0.9);
          for (var i = 0; i < arms.length; i++) {
            if (arms[i]) {
              arms[i].rotation.x = -0.5 + armT * 2.0;
              arms[i].rotation.z = (i === 0 ? 1 : -1) * armT * 0.6;
            }
          }
        } else if (variant === 1) {
          // Fall forward — face down, one arm tucked, one extended
          mesh.position.y = startY + fallEase * finalY;
          mesh.rotation.x = fallEase * Math.PI * 0.55;
          var armT1 = Math.max(0, (fallT - 0.1) / 0.9);
          if (arms[0]) { arms[0].rotation.x = -0.5 - armT1 * 1.8; } // tucked
          if (arms[1]) { arms[1].rotation.x = -0.5 + armT1 * 0.5; arms[1].rotation.z = -armT1 * 0.3; } // extended
        } else if (variant === 2) {
          // Spin & drop — on side, legs bent, top arm draped
          mesh.position.y = startY + fallEase * finalY;
          mesh.rotation.y += spinDir * 0.1;
          mesh.rotation.x = fallEase * Math.PI * 0.4;
          mesh.rotation.z = fallEase * spinDir * Math.PI * 0.15;
          var armR2 = Math.max(0, (fallT - 0.05) / 0.95);
          var armL2 = Math.max(0, (fallT - 0.15) / 0.85);
          if (arms[0]) { arms[0].rotation.z = armR2 * 1.0; arms[0].rotation.x = -armR2 * 0.4; }
          if (arms[1]) { arms[1].rotation.z = -armL2 * 0.5; arms[1].rotation.x = -0.5 - armL2 * 0.6; }
        } else if (variant === 3) {
          // Crumple (headshot) — knees buckled, torso slumped, arms limp at odd angles
          mesh.position.y = startY + fallEase * finalY;
          var tiltT = Math.max(0, (fallT - 0.05) / 0.95);
          mesh.rotation.x = tiltT * Math.PI * 0.35;
          mesh.rotation.z = tiltT * Math.PI * 0.12;
          var armR3 = Math.max(0, (fallT - 0.03) / 0.97);
          var armL3 = Math.max(0, (fallT - 0.1) / 0.9);
          if (arms[0]) { arms[0].rotation.x = -0.5 - armR3 * 2.0; arms[0].rotation.z = armR3 * 0.4; }
          if (arms[1]) { arms[1].rotation.x = -0.5 - armL3 * 1.2; arms[1].rotation.z = -armL3 * 0.7; }
        } else {
          // Stagger & fall — direction-aware stagger, tip sideways
          if (fallT < 0.25) {
            // Stagger extends from jolt end position in hit direction (absolute, frame-rate independent)
            var staggerT = fallT / 0.25;
            mesh.position.x = startX + joltTargetX + joltTargetX * staggerT * 2.0;
            mesh.position.z = startZ + joltTargetZ + joltTargetZ * staggerT * 2.0;
          } else {
            var tipT = Math.min(1, (fallT - 0.25) / 0.75);
            var tipEase = tipT * tipT;
            mesh.rotation.z = tipEase * Math.PI * 0.5;
            mesh.position.y = startY + tipEase * finalY;
            // One leg straight, one bent
            var armT4 = Math.max(0, (tipT - 0.1) / 0.9);
            if (arms[0]) { arms[0].rotation.z = armT4 * 0.8; }
            if (arms[1]) { arms[1].rotation.x = -0.5 - armT4 * 0.9; arms[1].rotation.z = -armT4 * 0.3; }
          }
        }
      }

      // Animation complete
      if (elapsed >= TOTAL_DURATION) {
        clearInterval(self._deathInterval);
        self._deathInterval = null;
      }
    }, 16);
  };

  Enemy.prototype.destroy = function() {
    if (this._deathInterval) {
      clearInterval(this._deathInterval);
      this._deathInterval = null;
    }
    if (this.mesh.parent) this.scene.remove(this.mesh);
  };

  // ── Helper to get difficulty name ──────────────────────
  function _getDiffName() {
    for (var k in DIFFICULTIES) {
      if (DIFFICULTIES[k] === currentDifficulty) return k;
    }
    return 'normal';
  }

  // ── Enemy Manager ────────────────────────────────────────

  function EnemyManager(scene) {
    this.scene = scene;
    this.enemies = [];

    // ── Tracer/flash pool (pre-allocated to avoid shader compilation during gameplay) ──
    this._tracerMat = new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 });
    this._tracerPool = [];
    var dummyPts = [new THREE.Vector3(), new THREE.Vector3()];
    for (var tp = 0; tp < 8; tp++) {
      var tGeo = new THREE.BufferGeometry().setFromPoints(dummyPts);
      var tLine = new THREE.Line(tGeo, this._tracerMat);
      tLine.visible = false;
      tLine.frustumCulled = false;
      scene.add(tLine);
      this._tracerPool.push(tLine);
    }
    this._tracerIdx = 0;

    this._flashPool = [];
    for (var fp = 0; fp < 4; fp++) {
      var fl = new THREE.PointLight(0xff6600, 0, 5);
      scene.add(fl);
      this._flashPool.push(fl);
    }
    this._flashIdx = 0;
    this._poolTimeouts = [];

    GAME.EnemyManager._currentInstance = this;
  }

  // Check if a position is clear of walls (not inside geometry)
  function _isSpawnClear(x, z, walls) {
    var rc = new THREE.Raycaster();
    var origin = new THREE.Vector3(x, 0.5, z);
    var clearRadius = ENEMY_RADIUS + 0.3;
    for (var d = 0; d < COLLISION_DIRS.length; d++) {
      rc.set(origin, COLLISION_DIRS[d]);
      rc.far = clearRadius;
      if (rc.intersectObjects(walls, false).length > 0) return false;
    }
    return true;
  }

  // Check line-of-sight between two points (no wall in between)
  function _hasLineOfSight(x1, z1, x2, z2, walls) {
    var dx = x2 - x1, dz = z2 - z1;
    var dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.01) return true;
    var rc = new THREE.Raycaster();
    rc.set(new THREE.Vector3(x1, 0.5, z1), new THREE.Vector3(dx / dist, 0, dz / dist));
    rc.far = dist;
    return rc.intersectObjects(walls, false).length === 0;
  }

  EnemyManager.prototype.spawnBots = function(botSpawns, waypoints, walls, count, mapSize, playerSpawn, roundNum) {
    this.clearAll();
    var total = count || botSpawns.length;
    for (var i = 0; i < total; i++) {
      var spawn;
      if (mapSize && playerSpawn && waypoints && waypoints.length > 0) {
        // Pick a random waypoint far from player, then offset slightly
        // Calculate distance from player for each waypoint, pick the far half
        var wpDists = [];
        for (var w = 0; w < waypoints.length; w++) {
          var wp = waypoints[w];
          var ddx = wp.x - playerSpawn.x, ddz = wp.z - playerSpawn.z;
          wpDists.push({ wp: wp, dist: ddx * ddx + ddz * ddz });
        }
        wpDists.sort(function(a, b) { return b.dist - a.dist; });
        // Take the farther half of waypoints (at least top 50%)
        var farCount = Math.max(1, Math.ceil(wpDists.length * 0.5));
        var farWPs = [];
        for (var w = 0; w < farCount; w++) farWPs.push(wpDists[w].wp);
        if (farWPs.length === 0) farWPs = waypoints; // fallback to all
        for (var tries = 0; tries < 20; tries++) {
          var wp = farWPs[Math.floor(Math.random() * farWPs.length)];
          // Random offset 1-4 units from waypoint
          var angle = Math.random() * Math.PI * 2;
          var dist = 1 + Math.random() * 3;
          var rx = wp.x + Math.cos(angle) * dist;
          var rz = wp.z + Math.sin(angle) * dist;
          var pdx = rx - playerSpawn.x, pdz = rz - playerSpawn.z;
          var playerDist = Math.sqrt(pdx * pdx + pdz * pdz);
          if (playerDist > 15 && _isSpawnClear(rx, rz, walls) && _hasLineOfSight(wp.x, wp.z, rx, rz, walls)) {
            spawn = { x: rx, z: rz }; break;
          }
        }
        if (!spawn) spawn = botSpawns[i % botSpawns.length];
      } else {
        spawn = botSpawns[i % botSpawns.length];
      }
      this.enemies.push(new Enemy(this.scene, spawn, waypoints, walls, i, roundNum || 1));
      this.enemies[this.enemies.length - 1]._manager = this;
    }
  };

  // Spawn bots for team mode — spawns both friendly and enemy bots at team spawn points
  EnemyManager.prototype.spawnTeamBots = function(teamSpawns, enemySpawns, waypoints, walls, allyCount, enemyCount, roundNum, playerTeam) {
    this.clearAll();
    var allyTeam = playerTeam;
    var oppTeam = playerTeam === 'ct' ? 't' : 'ct';
    var id = 0;

    // Spawn friendly bots (same team as player)
    for (var i = 0; i < allyCount; i++) {
      var spawn = teamSpawns[i % teamSpawns.length];
      // Offset slightly to avoid stacking
      var ox = spawn.x + (Math.random() - 0.5) * 2;
      var oz = spawn.z + (Math.random() - 0.5) * 2;
      if (!_isSpawnClear(ox, oz, walls)) { ox = spawn.x; oz = spawn.z; }
      this.enemies.push(new Enemy(this.scene, { x: ox, z: oz }, waypoints, walls, id++, roundNum || 1, allyTeam));
      this.enemies[this.enemies.length - 1]._manager = this;
    }

    // Spawn enemy bots (opposing team)
    for (var j = 0; j < enemyCount; j++) {
      var spawn = enemySpawns[j % enemySpawns.length];
      var ox = spawn.x + (Math.random() - 0.5) * 2;
      var oz = spawn.z + (Math.random() - 0.5) * 2;
      if (!_isSpawnClear(ox, oz, walls)) { ox = spawn.x; oz = spawn.z; }
      this.enemies.push(new Enemy(this.scene, { x: ox, z: oz }, waypoints, walls, id++, roundNum || 1, oppTeam));
      this.enemies[this.enemies.length - 1]._manager = this;
    }
  };

  // Check if all bots of a specific team are dead
  EnemyManager.prototype.teamAllDead = function(team) {
    var found = false;
    for (var i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].team === team) {
        found = true;
        if (this.enemies[i].alive) return false;
      }
    }
    return found; // true only if we found bots of that team and all are dead
  };

  // Get alive enemies of a specific team as target list (positions)
  EnemyManager.prototype.getAliveOfTeam = function(team) {
    var result = [];
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.alive && e.team === team) result.push(e);
    }
    return result;
  };

  EnemyManager.prototype.clearAll = function() {
    for (var i = 0; i < this.enemies.length; i++) this.enemies[i].destroy();
    this.enemies = [];
    // Cancel any pending tracer/flash timeouts
    for (var t = 0; t < this._poolTimeouts.length; t++) clearTimeout(this._poolTimeouts[t]);
    this._poolTimeouts = [];
  };

  EnemyManager.prototype.update = function(dt, playerPos, playerAlive, now, playerTeam) {
    var totalDamage = 0;
    var lastAttackerPos = null;

    if (playerTeam) {
      // Team mode — bots target opposing team entities
      var oppTeam = playerTeam === 'ct' ? 't' : 'ct';
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (!e.alive) continue;

        if (e.team === playerTeam) {
          // Friendly bot — target enemy team bots, never damage player
          var target = this._findNearestTarget(e, oppTeam);
          if (target) {
            var dmg = e.update(dt, target.mesh.position, true, now);
            if (dmg && target.alive) {
              target.takeDamage(dmg);
            }
          } else {
            e.update(dt, playerPos, false, now); // patrol mode, no target alive
          }
        } else {
          // Enemy bot — target player + friendly team bots, pick nearest
          var nearestAlly = this._findNearestTarget(e, playerTeam);
          var targetPos = playerPos;
          var targetIsPlayer = true;
          var targetAlive = playerAlive;

          if (nearestAlly && playerAlive) {
            var distToPlayer = e.mesh.position.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));
            var distToAlly = e.mesh.position.distanceTo(nearestAlly.mesh.position);
            if (distToAlly < distToPlayer) {
              targetPos = nearestAlly.mesh.position;
              targetIsPlayer = false;
              targetAlive = true;
            }
          } else if (nearestAlly && !playerAlive) {
            targetPos = nearestAlly.mesh.position;
            targetIsPlayer = false;
            targetAlive = true;
          }

          var dmg = e.update(dt, targetPos, targetAlive, now);
          if (dmg) {
            if (targetIsPlayer) {
              totalDamage += dmg;
              lastAttackerPos = e.mesh.position;
            } else if (nearestAlly && nearestAlly.alive) {
              nearestAlly.takeDamage(dmg);
            }
          }
        }
      }
    } else {
      // Non-team mode — original behavior
      for (var i = 0; i < this.enemies.length; i++) {
        var dmg = this.enemies[i].update(dt, playerPos, playerAlive, now);
        if (dmg) {
          totalDamage += dmg;
          lastAttackerPos = this.enemies[i].mesh.position;
        }
      }
    }

    // Bot callouts — once per second
    this._calloutTimer = (this._calloutTimer || 0) + dt;
    if (this._calloutTimer >= 1.0) {
      this._calloutTimer = 0;
      this._processCallouts(now);
    }

    return { damage: totalDamage, attackerPos: lastAttackerPos };
  };

  // Find nearest visible enemy of a given team for a bot to target
  EnemyManager.prototype._findNearestTarget = function(bot, targetTeam) {
    var nearest = null;
    var nearestDist = Infinity;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.alive || e.team !== targetTeam) continue;
      var dist = bot.mesh.position.distanceTo(e.mesh.position);
      if (dist < nearestDist && dist < bot.sightRange) {
        // FOV check — bot must be facing toward the target
        var forward = new THREE.Vector3(
          -Math.sin(bot.mesh.rotation.y), 0, -Math.cos(bot.mesh.rotation.y)
        );
        var toTarget = new THREE.Vector3(
          e.mesh.position.x - bot.mesh.position.x, 0,
          e.mesh.position.z - bot.mesh.position.z
        ).normalize();
        if (forward.dot(toTarget) < 0.5) continue;
        nearestDist = dist;
        nearest = e;
      }
    }
    return nearest;
  };

  // ── Sound Awareness ────────────────────────────────────

  EnemyManager.prototype.reportSound = function(position, type, radius, team) {
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.alive) continue;
      if (e.state !== PATROL && e.state !== INVESTIGATE) continue;
      if (team && e.team === team) continue;

      var dist = e.mesh.position.distanceTo(new THREE.Vector3(position.x, 0, position.z));
      if (dist >= radius) continue;

      var closeRange = currentDifficulty.soundCloseRange || 8;
      var midRange = currentDifficulty.soundMidRange || 20;
      var midError = currentDifficulty.soundMidError || 3;
      var farError = currentDifficulty.soundFarError || 8;

      var pKey = PERSONALITY_KEYS[e.id % PERSONALITY_KEYS.length];
      if (pKey === 'cautious') {
        closeRange = Math.min(closeRange * 1.5, midRange);
        midRange = Math.min(midRange * 1.25, 25);
      }

      var offsetX = 0, offsetZ = 0;
      if (dist < closeRange) {
        // Close — exact position
      } else if (dist < midRange) {
        offsetX = (Math.random() - 0.5) * 2 * midError;
        offsetZ = (Math.random() - 0.5) * 2 * midError;
      } else {
        offsetX = (Math.random() - 0.5) * 2 * farError;
        offsetZ = (Math.random() - 0.5) * 2 * farError;
      }

      var imprecisePos = { x: position.x + offsetX, z: position.z + offsetZ };
      e._investigatePos = imprecisePos;
      e._investigateTimer = 0;
      e._lookAroundTimer = 3 + Math.random();
      e.state = INVESTIGATE;

      // Check if bot should enter AMBUSH instead of INVESTIGATE
      var ambushChance = { aggressive: 0.1, balanced: 0.3, cautious: 0.6 };
      var diffName = _getDiffName();
      var diffMod = { easy: 0.5, normal: 1.0, hard: 1.1, elite: 1.2 };
      var chance = (ambushChance[pKey] || 0.3) * (diffMod[diffName] || 1.0);

      if (Math.random() < chance) {
        var coverFound = false;
        var botPos = new THREE.Vector3(e.mesh.position.x, 0.5, e.mesh.position.z);
        var rc = new THREE.Raycaster();
        for (var cd = 0; cd < COLLISION_DIRS.length; cd++) {
          rc.set(botPos, COLLISION_DIRS[cd]);
          rc.far = 2;
          if (rc.intersectObjects(e.walls, false).length > 0) {
            coverFound = true;
            break;
          }
        }
        if (coverFound) {
          e.state = AMBUSH;
          e._ambushTimer = 0;
          e._ambushEntryHP = e.health;
          var timeouts = { easy: [3, 5], normal: [6, 10], hard: [6, 10], elite: [8, 12] };
          var t = timeouts[diffName] || [6, 10];
          e._ambushTimeout = t[0] + Math.random() * (t[1] - t[0]);
        }
      }
    }
  };

  // ── Bot Callouts ───────────────────────────────────────

  EnemyManager.prototype._processCallouts = function(now) {
    var alive = [];
    for (var i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].alive) alive.push(this.enemies[i]);
    }

    for (var a = 0; a < alive.length; a++) {
      var spotter = alive[a];
      // Only spotters who can see the player and are engaging
      if (!spotter._lastSeenPlayerPos) continue;
      if (now - spotter._lastSeenTime > 1.0) continue;
      if (spotter.state !== ATTACK && spotter.state !== CHASE) continue;

      for (var b = 0; b < alive.length; b++) {
        if (a === b) continue;
        var buddy = alive[b];
        if (buddy.state !== PATROL) continue;
        var dist = spotter.mesh.position.distanceTo(buddy.mesh.position);
        if (dist < 20) {
          buddy._investigatePos = spotter._lastSeenPlayerPos.clone();
          buddy._investigateTimer = 0;
          buddy._lookAroundTimer = 3 + Math.random();
          buddy.state = INVESTIGATE;
        }
      }
    }
  };

  EnemyManager.prototype.allDead = function() {
    if (this.enemies.length === 0) return false;
    for (var i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].alive) return false;
    }
    return true;
  };

  EnemyManager.prototype.getAlive = function() {
    return this.enemies.filter(function(e) { return e.alive; });
  };

  GAME.EnemyManager = EnemyManager;
  GAME._Enemy = Enemy;
  GAME._calcCombatWeights = _calcCombatWeights;
  GAME.DIFFICULTIES = DIFFICULTIES;
  GAME.setDifficulty = function(name) {
    if (DIFFICULTIES[name]) currentDifficulty = DIFFICULTIES[name];
  };
  GAME.getDifficulty = function() { return currentDifficulty; };
})();
