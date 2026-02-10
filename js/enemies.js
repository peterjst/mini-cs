// js/enemies.js — Bot AI: patrol, chase, attack
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

  var BOT_PATROL_PAUSE = 0.3;

  var PATROL = 0, CHASE = 1, ATTACK = 2;

  // ── Single Enemy ─────────────────────────────────────────

  function Enemy(scene, spawnPos, waypoints, walls, id) {
    this.scene = scene;
    this.walls = walls;
    this.waypoints = waypoints;
    this.id = id;
    this.alive = true;
    this.health = currentDifficulty.health;
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

    // Strafing state
    this._strafeDir = 1; // 1 = right, -1 = left
    this._strafeTimer = 0;
    this._strafeInterval = 0.5 + Math.random() * 0.8;

    // Sprint burst state
    this._sprintTimer = 0;
    this._sprinting = false;

    // Build mesh — realistic PBR materials
    this.mesh = new THREE.Group();

    // Skin tones per bot — varied realistic skin
    var skinTones = [0xe8b89d, 0xc68642, 0x8d5524, 0xf1c27d, 0xd4a574];
    var skinColor = skinTones[id % skinTones.length];
    var skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.85, metalness: 0.0 });

    // Tactical clothing — dark muted military colors
    var clothColors = [0x3d4f3d, 0x4a3728, 0x2d3436, 0x4b3621, 0x3c3c3c];
    var clothMat = new THREE.MeshStandardMaterial({ color: clothColors[id % clothColors.length], roughness: 0.9, metalness: 0.0 });

    // Boots
    var bootMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.05 });
    var leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.5), bootMat);
    leftBoot.position.set(-0.2, 0.2, 0.03);
    this.mesh.add(leftBoot);
    var rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.5), bootMat);
    rightBoot.position.set(0.2, 0.2, 0.03);
    this.mesh.add(rightBoot);

    // Legs — tactical pants
    var leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.4), clothMat);
    leftLeg.position.set(-0.2, 0.67, 0);
    this.mesh.add(leftLeg);
    var rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.4), clothMat);
    rightLeg.position.set(0.2, 0.67, 0);
    this.mesh.add(rightLeg);

    // Belt
    var beltMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.5, metalness: 0.2 });
    var belt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.57), beltMat);
    belt.position.y = 0.98;
    this.mesh.add(belt);

    // Body — tactical vest over shirt
    var vestColors = [0x556b2f, 0x5c4033, 0x36454f, 0x4a4a2e, 0x3b3b3b];
    var vestMat = new THREE.MeshStandardMaterial({ color: vestColors[id % vestColors.length], roughness: 0.75, metalness: 0.05 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.55), vestMat);
    body.position.y = 1.4;
    this.mesh.add(body);

    // Vest plate / chest rig detail
    var plateMat = new THREE.MeshStandardMaterial({ color: 0x3a3a2a, roughness: 0.6, metalness: 0.1 });
    var plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), plateMat);
    plate.position.set(0, 1.4, -0.33);
    this.mesh.add(plate);

    // Shoulders / arms
    var leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.3), clothMat);
    leftArm.position.set(-0.55, 1.4, 0);
    this.mesh.add(leftArm);
    var rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.3), clothMat);
    rightArm.position.set(0.55, 1.4, 0);
    this.mesh.add(rightArm);

    // Hands
    var leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), skinMat);
    leftHand.position.set(-0.55, 0.95, -0.05);
    this.mesh.add(leftHand);
    var rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), skinMat);
    rightHand.position.set(0.55, 0.95, -0.05);
    this.mesh.add(rightHand);

    // Neck
    var neck = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.25), skinMat);
    neck.position.y = 1.97;
    this.mesh.add(neck);

    // Head
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
    head.position.y = 2.15;
    this.mesh.add(head);

    // Eyes — dark
    var eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.0 });
    var leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), eyeMat);
    leftEye.position.set(-0.12, 2.2, -0.26);
    this.mesh.add(leftEye);
    var rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), eyeMat);
    rightEye.position.set(0.12, 2.2, -0.26);
    this.mesh.add(rightEye);

    // Helmet — tactical military
    var helmetColors = [0x4a5530, 0x5c4033, 0x2f4f4f, 0x3b3b2a, 0x333333];
    var helmetMat = new THREE.MeshStandardMaterial({ color: helmetColors[id % helmetColors.length], roughness: 0.55, metalness: 0.15 });
    var helmet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.25, 0.58), helmetMat);
    helmet.position.y = 2.48;
    this.mesh.add(helmet);
    // Helmet rim
    var rimMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.2 });
    var helmetRim = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.62), rimMat);
    helmetRim.position.y = 2.37;
    this.mesh.add(helmetRim);

    // Weapon — gun with metallic look
    var gunMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.7 });
    var gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.45), gunMat);
    gun.position.set(0.35, 1.3, -0.3);
    this.mesh.add(gun);
    // Gun stock
    var stockMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7, metalness: 0.0 });
    var gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), stockMat);
    gunStock.position.set(0.35, 1.3, 0.0);
    this.mesh.add(gunStock);

    // Floating marker above head — always visible
    var markerGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    var markerBaseMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // unlit, always visible
    this.marker = new THREE.Mesh(markerGeo, markerBaseMat);
    this.marker.position.y = 3.0;
    this.mesh.add(this.marker);

    this.mesh.position.set(spawnPos.x, 0, spawnPos.z);
    scene.add(this.mesh);

    this._markerTime = Math.random() * Math.PI * 2; // offset for bobbing
  }

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

  Enemy.prototype._moveToward = function(target, dt, speedOverride) {
    var pos = this.mesh.position;
    this._dir.set(target.x - pos.x, 0, target.z - pos.z);
    var dist = this._dir.length();
    if (dist < 1) return true;

    this._dir.normalize();
    this.mesh.rotation.y = Math.atan2(this._dir.x, this._dir.z);

    var speed = speedOverride || this.speed;
    var step = speed * dt;
    this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), this._dir);
    this._rc.far = step + 0.6;
    var hits = this._rc.intersectObjects(this.walls, false);
    if (hits.length === 0) {
      pos.x += this._dir.x * step;
      pos.z += this._dir.z * step;
    } else {
      var slideDir = new THREE.Vector3(-this._dir.z, 0, this._dir.x);
      pos.x += slideDir.x * step * 0.5;
      pos.z += slideDir.z * step * 0.5;
    }
    return false;
  };

  Enemy.prototype._facePlayer = function(playerPos) {
    var dx = playerPos.x - this.mesh.position.x;
    var dz = playerPos.z - this.mesh.position.z;
    this.mesh.rotation.y = Math.atan2(dx, dz);
  };

  Enemy.prototype._strafe = function(playerPos, dt) {
    // Move side-to-side relative to player direction
    var pos = this.mesh.position;
    var dx = playerPos.x - pos.x;
    var dz = playerPos.z - pos.z;
    var len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.1) return;
    // Perpendicular direction
    var perpX = -dz / len;
    var perpZ = dx / len;

    var strafeSpeed = this.speed * 0.6;
    var step = strafeSpeed * dt * this._strafeDir;

    // Check wall collision for strafe
    var strafeVec = new THREE.Vector3(perpX, 0, perpZ).normalize();
    this._rc.set(new THREE.Vector3(pos.x, 0.5, pos.z), this._strafeDir > 0 ? strafeVec : strafeVec.clone().negate());
    this._rc.far = Math.abs(step) + 0.6;
    var hits = this._rc.intersectObjects(this.walls, false);
    if (hits.length === 0) {
      pos.x += perpX * step;
      pos.z += perpZ * step;
    } else {
      // Hit wall, reverse strafe direction
      this._strafeDir *= -1;
    }

    // Switch strafe direction periodically
    this._strafeTimer += dt;
    if (this._strafeTimer >= this._strafeInterval) {
      this._strafeTimer = 0;
      this._strafeDir *= -1;
      this._strafeInterval = 0.4 + Math.random() * 0.8;
    }
  };

  Enemy.prototype.update = function(dt, playerPos, playerAlive, now) {
    if (!this.alive) return null;

    // Bob the marker
    this._markerTime += dt * 3;
    if (this.marker) {
      this.marker.position.y = 3.0 + Math.sin(this._markerTime) * 0.15;
    }

    var canSee = playerAlive && this._canSeePlayer(playerPos);
    var distToPlayer = this.mesh.position.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));

    // State transitions
    if (this.state === PATROL) {
      if (canSee) this.state = distToPlayer <= this.attackRange ? ATTACK : CHASE;
    } else if (this.state === CHASE) {
      if (!canSee || !playerAlive) this.state = PATROL;
      else if (distToPlayer <= this.attackRange) this.state = ATTACK;
    } else if (this.state === ATTACK) {
      if (!canSee || !playerAlive) this.state = PATROL;
      else if (distToPlayer > this.attackRange) this.state = CHASE;
    }

    var damageToPlayer = 0;

    if (this.state === PATROL) {
      if (this.patrolPauseTimer > 0) {
        this.patrolPauseTimer -= dt;
      } else {
        var wp = this.waypoints[this.currentWaypoint];
        if (this._moveToward(wp, dt)) {
          this.currentWaypoint = Math.floor(Math.random() * this.waypoints.length);
          this.patrolPauseTimer = BOT_PATROL_PAUSE;
        }
      }
    } else if (this.state === CHASE) {
      // Occasional sprint bursts toward player
      this._sprintTimer -= dt;
      if (this._sprintTimer <= 0) {
        this._sprinting = Math.random() < 0.3;
        this._sprintTimer = 1.0 + Math.random() * 1.5;
      }
      var chaseSpeed = this._sprinting ? this.speed * 1.5 : this.speed;
      this._moveToward(playerPos, dt, chaseSpeed);
    } else if (this.state === ATTACK) {
      this._facePlayer(playerPos);
      // Strafe during attack — don't stand still
      this._strafe(playerPos, dt);
      var fireInterval = 1 / this.fireRate;
      if (now - this.lastFireTime >= fireInterval) {
        this.lastFireTime = now;
        if (Math.random() < this.accuracy) damageToPlayer = this.damage;
        this._showTracer(playerPos);
        if (GAME.Sound) GAME.Sound.enemyShot();
      }
    }

    return damageToPlayer > 0 ? damageToPlayer : null;
  };

  Enemy.prototype._showTracer = function(target) {
    var start = this.mesh.position.clone();
    start.y = 1.3;
    var end = target.clone();
    end.x += (Math.random() - 0.5) * 0.5;
    end.y += (Math.random() - 0.5) * 0.3;
    end.z += (Math.random() - 0.5) * 0.5;

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

  Enemy.prototype.takeDamage = function(amount) {
    if (!this.alive) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.die();
      return true;
    }
    // Flash white on hit
    this.mesh.children.forEach(function(c) {
      if (c.material) {
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

  // ── Enemy Manager ────────────────────────────────────────

  function EnemyManager(scene) {
    this.scene = scene;
    this.enemies = [];
  }

  EnemyManager.prototype.spawnBots = function(botSpawns, waypoints, walls, count, mapSize, playerSpawn) {
    this.clearAll();
    var total = count || botSpawns.length;
    for (var i = 0; i < total; i++) {
      var spawn;
      if (mapSize && playerSpawn) {
        // Random position in the far half of the map (opposite player spawn)
        var halfX = mapSize.x / 2, halfZ = mapSize.z / 2;
        var dx = playerSpawn.x, dz = playerSpawn.z;
        var len = Math.sqrt(dx * dx + dz * dz) || 1;
        dx /= len; dz /= len;
        for (var tries = 0; tries < 30; tries++) {
          var rx = (Math.random() - 0.5) * mapSize.x * 0.85;
          var rz = (Math.random() - 0.5) * mapSize.z * 0.85;
          // Dot product with player direction — negative means far half
          if (rx * dx + rz * dz < 0) { spawn = { x: rx, z: rz }; break; }
        }
        if (!spawn) spawn = botSpawns[i % botSpawns.length];
      } else {
        spawn = botSpawns[i % botSpawns.length];
      }
      this.enemies.push(new Enemy(this.scene, spawn, waypoints, walls, i));
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
    return totalDamage;
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
  GAME.DIFFICULTIES = DIFFICULTIES;
  GAME.setDifficulty = function(name) {
    if (DIFFICULTIES[name]) currentDifficulty = DIFFICULTIES[name];
  };
  GAME.getDifficulty = function() { return currentDifficulty; };
})();
