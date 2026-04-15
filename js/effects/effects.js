// js/effects/effects.js — Visual effects extracted from main.js
(function() {
  'use strict';

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

  // Pre-allocate bullet hole pool to avoid per-shot material/mesh creation
  var _bulletHolePool = [];
  var _bulletHolePoolIdx = 0;

  function _initBulletHolePool() {
    if (!_bulletHoleGeo) _bulletHoleGeo = new THREE.PlaneGeometry(0.08, 0.08);
    for (var i = 0; i < MAX_BULLET_HOLES; i++) {
      var mat = new THREE.MeshBasicMaterial({
        color: 0x222222, transparent: true, opacity: 0,
        depthWrite: false, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -1
      });
      var mesh = new THREE.Mesh(_bulletHoleGeo, mat);
      mesh.visible = false;
      GAME.scene.add(mesh);
      _bulletHolePool.push({ mesh: mesh, mat: mat, age: -1 });
    }
  }

  function spawnBulletHole(point, normal) {
    if (_bulletHolePool.length === 0) _initBulletHolePool();
    var entry = _bulletHolePool[_bulletHolePoolIdx];
    _bulletHolePoolIdx = (_bulletHolePoolIdx + 1) % MAX_BULLET_HOLES;
    entry.mesh.position.copy(point);
    entry.mesh.position.addScaledVector(normal, 0.005);
    entry.mesh.lookAt(point.x + normal.x, point.y + normal.y, point.z + normal.z);
    entry.mesh.rotateZ(Math.random() * Math.PI * 2);
    var s = 0.7 + Math.random() * 0.6;
    entry.mesh.scale.set(s, s, 1);
    entry.mat.opacity = 0.8;
    entry.mesh.visible = true;
    entry.age = 0;
    // Track in bulletHoles array for fade-out updates
    var idx = bulletHoles.indexOf(entry);
    if (idx === -1) bulletHoles.push(entry);
  }

  function updateBulletHoles(dt) {
    for (var i = bulletHoles.length - 1; i >= 0; i--) {
      var bh = bulletHoles[i];
      if (bh.age < 0) continue; // inactive pool entry
      bh.age += dt;
      if (bh.age > 12) {
        bh.mat.opacity -= dt * (0.8 / 3);
        if (bh.mat.opacity <= 0) {
          bh.mesh.visible = false;
          bh.age = -1;
          bulletHoles.splice(i, 1);
        }
      }
    }
  }

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
      GAME.scene.add(m);
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

  function spawnFootstepDust(position) {
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
      if (GAME.scene) GAME.scene.add(p.mesh);
    }
  }

  function updateFootDust(dt) {
    for (var i = 0; i < FOOT_DUST_MAX; i++) {
      var p = footDustPool[i];
      if (!p || !p.mesh.visible) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        if (GAME.scene) GAME.scene.remove(p.mesh);
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

  function showDamageIndicator(attackerPos) {
    var player = GAME.player;
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
  }

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

  function triggerKillSlowMo(killStreak) {
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

  function applyKillKick(dt) {
    var k = GAME.killKick;
    if (!k.active) return;
    var player = GAME.player;
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

  function triggerBloodSplatter(damage) {
    if (damage < 30) return;
    var intensity = Math.min(1, damage / 80);
    var dom = GAME.dom;
    if (dom && dom.bloodSplatter) dom.bloodSplatter.style.opacity = intensity * 0.8;
    bloodSplatterTimer = 2.0;
  }

  function updateBloodSplatter(dt) {
    if (bloodSplatterTimer > 0) {
      bloodSplatterTimer -= dt;
      var dom = GAME.dom;
      if (dom && bloodSplatterTimer < 1.0 && dom.bloodSplatter) {
        dom.bloodSplatter.style.opacity = bloodSplatterTimer * 0.8;
      }
      if (dom && bloodSplatterTimer <= 0 && dom.bloodSplatter) {
        dom.bloodSplatter.style.opacity = 0;
      }
    }
  }

  // ── Screen Shake ───────────────────────────────────────
  var shakeIntensity = 0;
  var shakeTimer = 0;

  function triggerScreenShake(intensity) {
    shakeIntensity = Math.min(shakeIntensity + intensity, 1.5);
    shakeTimer = 0.25;
  }

  function applyScreenShake(dt) {
    if (shakeTimer > 0) {
      var player = GAME.player;
      shakeTimer -= dt;
      player.pitch += (Math.random() - 0.5) * shakeIntensity * 0.12;
      player.yaw += (Math.random() - 0.5) * shakeIntensity * 0.08;
      shakeIntensity *= 0.85;
    }
  }

  // ── Hitmarker + Damage Numbers ────────────────────────────
  var hitmarkerTimer = 0;

  function showHitmarker(isHeadshot) {
    var dom = GAME.dom;
    dom.hitmarker.classList.toggle('headshot', isHeadshot);
    dom.hitmarker.classList.add('show');
    hitmarkerTimer = 0.15;
    if (GAME.Sound) GAME.Sound.hitmarkerTick();
  }

  function showDamageNumber(point, damage, isHeadshot) {
    var camera = GAME.camera;
    var dom = GAME.dom;
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

  function updateHitmarker(dt) {
    if (hitmarkerTimer > 0) {
      hitmarkerTimer -= dt;
      if (hitmarkerTimer <= 0) {
        var dom = GAME.dom;
        dom.hitmarker.classList.remove('show');
        dom.hitmarker.classList.remove('headshot');
      }
    }
  }

  // ── Backward-compatible GAME.* keys ──────────────────────
  GAME.spawnBulletHole = spawnBulletHole;
  GAME._bulletHoles = bulletHoles;
  GAME.MAX_BULLET_HOLES = MAX_BULLET_HOLES;
  GAME.spawnImpactDust = spawnImpactDust;
  GAME.spawnFootstepDust = spawnFootstepDust;
  GAME.showDamageIndicator = showDamageIndicator;
  GAME.triggerBloodSplatter = triggerBloodSplatter;
  GAME.triggerScreenShake = triggerScreenShake;
  GAME.triggerKillKick = triggerKillKick;

  // Reset active bullet-hole and impact-dust state between rounds.
  // Pool entries (meshes/materials) are reused, so we only hide them and
  // clear the active-tracking arrays — do NOT dispose pooled materials.
  function clearRoundState() {
    for (var i = 0; i < bulletHoles.length; i++) {
      var bh = bulletHoles[i];
      bh.mesh.visible = false;
      bh.mat.opacity = 0;
      bh.age = -1;
    }
    bulletHoles.length = 0;

    for (var j = 0; j < _dustParticles.length; j++) {
      var p = _dustParticles[j];
      p.pool.mesh.visible = false;
      p.pool.mat.opacity = 0;
    }
    _dustParticles.length = 0;
  }

  // ── Namespaced API ───────────────────────────────────────
  GAME.effects = {
    spawnBloodBurst: spawnBloodBurst,
    showHitmarker: showHitmarker,
    showDamageNumber: showDamageNumber,
    applyScreenShake: applyScreenShake,
    applyKillKick: applyKillKick,
    triggerKillSlowMo: triggerKillSlowMo,
    updateBulletHoles: updateBulletHoles,
    updateImpactDust: updateImpactDust,
    updateFootDust: updateFootDust,
    updateDamageIndicators: updateDamageIndicators,
    updateBloodSplatter: updateBloodSplatter,
    updateHitmarker: updateHitmarker,
    clearRoundState: clearRoundState
  };
})();
