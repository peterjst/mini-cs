// js/player.js — First-person controller
// Attaches GAME.Player

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var PLAYER_HEIGHT = 1.7;
  var PLAYER_RADIUS = 0.4;
  var MOVE_SPEED = 6;
  var SPRINT_MULT = 1.6;
  var JUMP_FORCE = 7;
  var GRAVITY = 20;
  var SENSITIVITY = 0.002;
  var MAX_PITCH = Math.PI * 85 / 180;

  function Player(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, 0);
    this.velocity = new THREE.Vector3();
    this.onGround = false;
    this.yaw = 0;
    this.pitch = 0;
    this.health = 100;
    this.armor = 0;
    this.money = 800;
    this.alive = true;
    this.keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
    this.walls = [];
    this._rc = new THREE.Raycaster();
    this._dir = new THREE.Vector3();

    this._collisionDirs = [
      new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
      new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1),
      new THREE.Vector3(0.707,0,0.707), new THREE.Vector3(-0.707,0,0.707),
      new THREE.Vector3(0.707,0,-0.707), new THREE.Vector3(-0.707,0,-0.707),
    ];

    var self = this;

    document.addEventListener('keydown', function(e) {
      var k = e.key.toLowerCase();
      if (k === 'w') self.keys.w = true;
      if (k === 'a') self.keys.a = true;
      if (k === 's') self.keys.s = true;
      if (k === 'd') self.keys.d = true;
      if (k === 'shift') self.keys.shift = true;
      if (k === ' ') self.keys.space = true;
    });

    document.addEventListener('keyup', function(e) {
      var k = e.key.toLowerCase();
      if (k === 'w') self.keys.w = false;
      if (k === 'a') self.keys.a = false;
      if (k === 's') self.keys.s = false;
      if (k === 'd') self.keys.d = false;
      if (k === 'shift') self.keys.shift = false;
      if (k === ' ') self.keys.space = false;
    });

    document.addEventListener('mousemove', function(e) {
      if (document.pointerLockElement) {
        self.yaw -= e.movementX * SENSITIVITY;
        self.pitch -= e.movementY * SENSITIVITY;
        self.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, self.pitch));
      }
    });
  }

  Player.prototype.reset = function(spawnPos) {
    this.position.set(spawnPos.x, PLAYER_HEIGHT, spawnPos.z);
    this.velocity.set(0, 0, 0);
    this.health = 100;
    this.alive = true;
    this.onGround = false;
    this.yaw = 0;
    this.pitch = 0;
  };

  Player.prototype.setWalls = function(walls) {
    this.walls = walls;
  };

  Player.prototype.takeDamage = function(amount) {
    if (!this.alive) return;
    var dmg = amount;
    if (this.armor > 0) {
      var absorbed = Math.min(this.armor, dmg * 0.5);
      this.armor -= absorbed;
      dmg -= absorbed;
    }
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  };

  Player.prototype._checkCollision = function(pos) {
    var rc = this._rc;
    for (var h = 0; h < 2; h++) {
      var yLevel = h === 0 ? 0.5 : PLAYER_HEIGHT - 0.2;
      for (var i = 0; i < this._collisionDirs.length; i++) {
        var dir = this._collisionDirs[i];
        rc.set(new THREE.Vector3(pos.x, yLevel, pos.z), dir);
        rc.far = PLAYER_RADIUS;
        var hits = rc.intersectObjects(this.walls, false);
        if (hits.length > 0) {
          var pushDist = PLAYER_RADIUS - hits[0].distance;
          pos.x -= dir.x * pushDist;
          pos.z -= dir.z * pushDist;
        }
      }
    }
  };

  Player.prototype._checkGround = function(pos) {
    this._rc.set(new THREE.Vector3(pos.x, pos.y, pos.z), new THREE.Vector3(0, -1, 0));
    this._rc.far = pos.y + 0.1;
    var hits = this._rc.intersectObjects(this.walls, false);
    if (hits.length > 0) {
      var groundY = hits[0].point.y;
      if (pos.y - PLAYER_HEIGHT <= groundY + 0.05) {
        pos.y = groundY + PLAYER_HEIGHT;
        return true;
      }
    }
    if (pos.y <= PLAYER_HEIGHT) {
      pos.y = PLAYER_HEIGHT;
      return true;
    }
    return false;
  };

  Player.prototype.update = function(dt) {
    if (!this.alive) return;

    var forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    var right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this._dir.set(0, 0, 0);
    if (this.keys.w) this._dir.add(forward);
    if (this.keys.s) this._dir.sub(forward);
    if (this.keys.a) this._dir.sub(right);
    if (this.keys.d) this._dir.add(right);

    if (this._dir.lengthSq() > 0) this._dir.normalize();

    var speed = MOVE_SPEED;
    if (this.keys.shift) speed *= SPRINT_MULT;

    this.velocity.x = this._dir.x * speed;
    this.velocity.z = this._dir.z * speed;

    if (this.keys.space && this.onGround) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
    }

    this.velocity.y -= GRAVITY * dt;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    this._checkCollision(this.position);

    this.onGround = this._checkGround(this.position);
    if (this.onGround && this.velocity.y < 0) this.velocity.y = 0;

    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  };

  Player.prototype.getForwardDir = function() {
    var dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);
    return dir;
  };

  GAME.Player = Player;
})();
