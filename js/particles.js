(function() {
  'use strict';

  // Pool helper: manages a fixed-size array of particle instances
  function ParticlePool(size) {
    this.particles = new Array(size);
    this.size = size;
    this.head = 0;
    for (var i = 0; i < size; i++) {
      this.particles[i] = {
        active: false, elapsed: 0, maxLife: 0,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        scale: new THREE.Vector3(1, 1, 1),
        rotation: new THREE.Euler(),
        rotVel: new THREE.Vector3(),
        data: {}
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

    if (GAME.Sound && GAME.Sound.wallImpact) {
      GAME.Sound.wallImpact(materialType);
    }
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
    best.light.color.set(color);
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
