// js/enemies.js — Bot AI: patrol, chase, attack
// Attaches GAME.EnemyManager

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var BOT_SPEED = 3.5;
  var BOT_HEALTH = 100;
  var BOT_FIRE_RATE = 2;
  var BOT_DAMAGE = 12;
  var BOT_ACCURACY = 0.85;
  var BOT_SIGHT_RANGE = 30;
  var BOT_ATTACK_RANGE = 25;
  var BOT_PATROL_PAUSE = 1.5;

  var PATROL = 0, CHASE = 1, ATTACK = 2;

  // ── Single Enemy ─────────────────────────────────────────

  function Enemy(scene, spawnPos, waypoints, walls, id) {
    this.scene = scene;
    this.walls = walls;
    this.waypoints = waypoints;
    this.id = id;
    this.alive = true;
    this.health = BOT_HEALTH;
    this.state = PATROL;
    this.currentWaypoint = Math.floor(Math.random() * waypoints.length);
    this.patrolPauseTimer = 0;
    this.lastFireTime = 0;
    this._rc = new THREE.Raycaster();
    this._dir = new THREE.Vector3();

    // Build mesh — larger, brighter, more visible
    this.mesh = new THREE.Group();

    // Legs
    var legMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    var leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.4), legMat);
    leftLeg.position.set(-0.2, 0.45, 0);
    this.mesh.add(leftLeg);
    var rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.4), legMat);
    rightLeg.position.set(0.2, 0.45, 0);
    this.mesh.add(rightLeg);

    // Body — bright contrasting colors per bot
    var bodyColors = [0xff1744, 0xf50057, 0xd500f9, 0xff3d00, 0xff9100];
    var bodyMat = new THREE.MeshLambertMaterial({ color: bodyColors[id % bodyColors.length] });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.55), bodyMat);
    body.position.y = 1.4;
    this.mesh.add(body);

    // Head — skin tone, bigger
    var head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xffccbc })
    );
    head.position.y = 2.15;
    this.mesh.add(head);

    // Helmet / beret — bright yellow for visibility
    var helmet = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.15, 0.55),
      new THREE.MeshLambertMaterial({ color: 0xffff00 })
    );
    helmet.position.y = 2.48;
    this.mesh.add(helmet);

    // Weapon
    var gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.45),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    gun.position.set(0.35, 1.3, -0.3);
    this.mesh.add(gun);

    // Floating marker above head — always visible
    var markerGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    var markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // unlit, always visible
    this.marker = new THREE.Mesh(markerGeo, markerMat);
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
    if (dist > BOT_SIGHT_RANGE) return false;

    toPlayer.normalize();
    this._rc.set(myPos, toPlayer);
    this._rc.far = dist;
    var hits = this._rc.intersectObjects(this.walls, false);
    return !(hits.length > 0 && hits[0].distance < dist - 0.5);
  };

  Enemy.prototype._moveToward = function(target, dt) {
    var pos = this.mesh.position;
    this._dir.set(target.x - pos.x, 0, target.z - pos.z);
    var dist = this._dir.length();
    if (dist < 1) return true;

    this._dir.normalize();
    this.mesh.rotation.y = Math.atan2(this._dir.x, this._dir.z);

    var step = BOT_SPEED * dt;
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
      if (canSee) this.state = distToPlayer <= BOT_ATTACK_RANGE ? ATTACK : CHASE;
    } else if (this.state === CHASE) {
      if (!canSee || !playerAlive) this.state = PATROL;
      else if (distToPlayer <= BOT_ATTACK_RANGE) this.state = ATTACK;
    } else if (this.state === ATTACK) {
      if (!canSee || !playerAlive) this.state = PATROL;
      else if (distToPlayer > BOT_ATTACK_RANGE) this.state = CHASE;
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
      this._moveToward(playerPos, dt);
    } else if (this.state === ATTACK) {
      this._facePlayer(playerPos);
      var fireInterval = 1 / BOT_FIRE_RATE;
      if (now - this.lastFireTime >= fireInterval) {
        this.lastFireTime = now;
        if (Math.random() < BOT_ACCURACY) damageToPlayer = BOT_DAMAGE;
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

  EnemyManager.prototype.spawnBots = function(botSpawns, waypoints, walls) {
    this.clearAll();
    for (var i = 0; i < botSpawns.length; i++) {
      this.enemies.push(new Enemy(this.scene, botSpawns[i], waypoints, walls, i));
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
})();
