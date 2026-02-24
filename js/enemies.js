// js/enemies.js — Bot AI: patrol, chase, attack, investigate, retreat, cover
// Attaches GAME.EnemyManager

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var DIFFICULTIES = {
    easy:   { health: 20,  speed: 4,   fireRate: 1.2, damage: 5,  accuracy: 0.2,  sight: 25, attackRange: 18, botCount: 2 },
    normal: { health: 45,  speed: 6,   fireRate: 2,   damage: 9,  accuracy: 0.35, sight: 35, attackRange: 22, botCount: 3 },
    hard:   { health: 60,  speed: 6.8, fireRate: 2.4, damage: 11, accuracy: 0.42, sight: 40, attackRange: 25, botCount: 4 },
    elite:  { health: 80,  speed: 7.8, fireRate: 3,   damage: 14, accuracy: 0.52, sight: 45, attackRange: 28, botCount: 5 }
  };
  var currentDifficulty = DIFFICULTIES.normal;

  // ── States ─────────────────────────────────────────────
  var PATROL = 0, CHASE = 1, ATTACK = 2, INVESTIGATE = 3, RETREAT = 4, TAKE_COVER = 5;

  // ── Personality Types ──────────────────────────────────
  var PERSONALITY = {
    aggressive: { speedMult: 1.15, aimSpeedMult: 1.2, reactionMult: 0.7, retreatHP: 0.15, patrolPause: 0.2, burstMin: 3, burstMax: 5, markerColor: 0xff4500 },
    balanced:   { speedMult: 1.0,  aimSpeedMult: 1.0, reactionMult: 1.0, retreatHP: 0.30, patrolPause: 0.3, burstMin: 2, burstMax: 4, markerColor: 0xff0000 },
    cautious:   { speedMult: 0.85, aimSpeedMult: 0.9, reactionMult: 1.3, retreatHP: 0.50, patrolPause: 0.5, burstMin: 2, burstMax: 3, markerColor: 0xcc0000 }
  };
  var PERSONALITY_KEYS = ['aggressive', 'balanced', 'cautious'];

  // ── Aim difficulty scaling ─────────────────────────────
  var AIM_PARAMS = {
    easy:   { aimSpeed: 2.0, aimError: 2.5, reactionMin: 0.5, reactionMax: 0.8, errorRefreshMin: 0.6, errorRefreshMax: 1.2 },
    normal: { aimSpeed: 4.0, aimError: 1.5, reactionMin: 0.3, reactionMax: 0.6, errorRefreshMin: 0.4, errorRefreshMax: 1.0 },
    hard:   { aimSpeed: 7.0, aimError: 0.8, reactionMin: 0.2, reactionMax: 0.4, errorRefreshMin: 0.3, errorRefreshMax: 0.8 },
    elite:  { aimSpeed: 10.0, aimError: 0.3, reactionMin: 0.15, reactionMax: 0.25, errorRefreshMin: 0.3, errorRefreshMax: 0.6 }
  };

  // ── Bot Weapon Pool ────────────────────────────────────
  function getBotWeapon(roundNum) {
    if (roundNum <= 2) return 'pistol';
    if (roundNum <= 4) {
      return Math.random() < 0.5 ? 'rifle' : 'pistol';
    }
    var r = Math.random();
    if (r < 0.45) return 'rifle';
    if (r < 0.75) return 'shotgun';
    if (r < 0.88) return 'awp';
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

  function Enemy(scene, spawnPos, waypoints, walls, id, roundNum) {
    this.scene = scene;
    this.walls = walls;
    this.waypoints = waypoints;
    this.id = id;
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

    // ── Strafing / jiggle peek ───────────────────────────
    this._strafeDir = 1;
    this._strafeTimer = 0;
    this._strafeInterval = 0.5 + Math.random() * 0.8;
    this._jigglePeek = pKey === 'cautious' || Math.random() < 0.3;
    this._jiggleTimer = 0;
    this._jiggleInterval = 0.15 + Math.random() * 0.2;

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

    // ── Cover state ──────────────────────────────────────
    this._coverPos = null;
    this._coverTimer = 0;
    this._peekTimer = 0;
    this._isPeeking = false;
    this._coverSearchCooldown = 0;
    this._lastCoverSearch = 0;

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

    // ── Stuck detection ────────────────────────────────────
    this._stuckTimer = 0;
    this._lastStuckCheckPos = { x: spawnPos.x, z: spawnPos.z };

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

  // ── Humanoid Model Builder ─────────────────────────────

  Enemy.prototype._buildModel = function(id) {
    _ensureGeoCache();
    _ensureMatPalettes();

    var G = _geoCache;
    var pal = _matPalettes[id % 5];
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
    var markerMat = new THREE.MeshBasicMaterial({ color: this.personality.markerColor });
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

    toPlayer.normalize();
    this._rc.set(myPos, toPlayer);
    this._rc.far = dist;
    var hits = this._rc.intersectObjects(this.walls, false);
    return !(hits.length > 0 && hits[0].distance < dist - 0.5);
  };

  // ── Movement ───────────────────────────────────────────

  Enemy.prototype._moveToward = function(target, dt, speedOverride) {
    var pos = this.mesh.position;
    this._dir.set(target.x - pos.x, 0, target.z - pos.z);
    var dist = this._dir.length();
    if (dist < 1) return true;

    this._dir.normalize();

    // Smooth rotation
    var targetRot = Math.atan2(this._dir.x, this._dir.z) + Math.PI;
    var diff = targetRot - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, 8 * dt);

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
      // Wall slide — check slide direction before moving
      var slideDir = new THREE.Vector3(-this._dir.z, 0, this._dir.x);
      this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), slideDir);
      this._rc.far = Math.abs(step * 0.5) + ENEMY_RADIUS;
      var slideHits = this._rc.intersectObjects(this.walls, false);
      if (slideHits.length === 0) {
        pos.x += slideDir.x * step * 0.5;
        pos.z += slideDir.z * step * 0.5;
      }
    }
    this._resolveCollisions();
    return false;
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
        this._jiggleInterval = 0.15 + Math.random() * 0.2;
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
      if (this._reactionTimer >= effectiveDelay) {
        this._hasReacted = true;
      }
    }
    if (!canSee) {
      this._reactionTimer = 0;
      this._hasReacted = false;
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
        if (this._retreatTarget) this.state = RETREAT;
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
    }

    // Reset burst on state change away from attack
    if (prevState === ATTACK && this.state !== ATTACK) {
      this._burstRemaining = 0;
      this._burstCooldown = 0;
      this._shotsInBurst = 0;
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
        if (this._moveToward(wp, dt)) {
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
            this.currentWaypoint = reachable[Math.floor(Math.random() * reachable.length)];
          } else {
            this.currentWaypoint = Math.floor(Math.random() * this.waypoints.length);
          }
          this.patrolPauseTimer = this.personality.patrolPause;
        }
      }

      // ── Stuck detection: teleport to a reachable waypoint if stuck ──
      this._stuckTimer += dt;
      if (this._stuckTimer > 4) {
        var sp = this.mesh.position;
        var sdx = sp.x - this._lastStuckCheckPos.x;
        var sdz = sp.z - this._lastStuckCheckPos.z;
        if (sdx * sdx + sdz * sdz < 2) {
          // Stuck — teleport to a random waypoint that is clear
          for (var si = 0; si < this.waypoints.length; si++) {
            var swi = (this.currentWaypoint + 1 + si) % this.waypoints.length;
            var swp = this.waypoints[swi];
            if (_isSpawnClear(swp.x, swp.z, this.walls)) {
              sp.x = swp.x;
              sp.z = swp.z;
              this.currentWaypoint = swi;
              break;
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

    } else if (this.state === ATTACK) {
      this._facePlayer(playerPos, dt);
      this._strafe(playerPos, dt);

      // Burst firing
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
            if (GAME.Sound) GAME.Sound.enemyShot();

            // Check ammo
            if (this._ammo <= 0) {
              this._startReload();
              this._burstRemaining = 0;
            }
          }
        } else {
          // Start new burst
          var min = this.personality.burstMin;
          var max = this.personality.burstMax;
          this._burstRemaining = min + Math.floor(Math.random() * (max - min + 1));
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

    } else if (this.state === RETREAT) {
      if (this._retreatTarget) {
        this._moveToward(this._retreatTarget, dt, this.speed * 1.3);
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
                  if (GAME.Sound) GAME.Sound.enemyShot();

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

  // ── Tracers ────────────────────────────────────────────

  Enemy.prototype._showTracer = function(target) {
    var start = this.mesh.position.clone();
    start.y = 1.3;
    var end = target.clone();
    // Small random spread on tracer
    end.x += (Math.random() - 0.5) * 0.2;
    end.y += (Math.random() - 0.5) * 0.15;
    end.z += (Math.random() - 0.5) * 0.2;

    var geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    var mat = new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 });
    var line = new THREE.Line(geo, mat);
    var scene = this.scene;
    scene.add(line);

    var flash = new THREE.PointLight(0xff6600, 2, 5);
    flash.position.copy(start);
    scene.add(flash);

    setTimeout(function() {
      scene.remove(line);
      scene.remove(flash);
      geo.dispose();
      mat.dispose();
    }, 60);
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
      this.die();
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

  Enemy.prototype.die = function() {
    var mesh = this.mesh;
    var scene = this.scene;
    var progress = 0;
    var interval = setInterval(function() {
      progress += 0.05;
      mesh.rotation.x = Math.min(Math.PI / 2, progress * Math.PI / 2);
      mesh.position.y = -progress * 0.5;
      if (progress >= 1) {
        clearInterval(interval);
        setTimeout(function() { scene.remove(mesh); }, 2000);
      }
    }, 16);
  };

  Enemy.prototype.destroy = function() {
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
          if (playerDist > 15 && _isSpawnClear(rx, rz, walls)) {
            spawn = { x: rx, z: rz }; break;
          }
        }
        if (!spawn) spawn = botSpawns[i % botSpawns.length];
      } else {
        spawn = botSpawns[i % botSpawns.length];
      }
      this.enemies.push(new Enemy(this.scene, spawn, waypoints, walls, i, roundNum || 1));
    }
  };

  EnemyManager.prototype.clearAll = function() {
    for (var i = 0; i < this.enemies.length; i++) this.enemies[i].destroy();
    this.enemies = [];
  };

  EnemyManager.prototype.update = function(dt, playerPos, playerAlive, now) {
    var totalDamage = 0;
    for (var i = 0; i < this.enemies.length; i++) {
      var dmg = this.enemies[i].update(dt, playerPos, playerAlive, now);
      if (dmg) totalDamage += dmg;
    }

    // Bot callouts — once per second
    this._calloutTimer = (this._calloutTimer || 0) + dt;
    if (this._calloutTimer >= 1.0) {
      this._calloutTimer = 0;
      this._processCallouts(now);
    }

    return totalDamage;
  };

  // ── Sound Awareness ────────────────────────────────────

  EnemyManager.prototype.reportSound = function(position, type, radius) {
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.alive) continue;
      if (e.state !== PATROL && e.state !== INVESTIGATE) continue;
      var dist = e.mesh.position.distanceTo(new THREE.Vector3(position.x, 0, position.z));
      if (dist < radius) {
        e._investigatePos = position.clone ? position.clone() : { x: position.x, z: position.z };
        e._investigateTimer = 0;
        e._lookAroundTimer = 3 + Math.random();
        e.state = INVESTIGATE;
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
  GAME.DIFFICULTIES = DIFFICULTIES;
  GAME.setDifficulty = function(name) {
    if (DIFFICULTIES[name]) currentDifficulty = DIFFICULTIES[name];
  };
  GAME.getDifficulty = function() { return currentDifficulty; };
})();
