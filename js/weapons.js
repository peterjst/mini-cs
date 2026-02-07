// js/weapons.js — Weapon definitions, shooting, reload, switching
// Attaches GAME.WEAPON_DEFS, GAME.WeaponSystem

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var WEAPON_DEFS = {
    knife:  { name: 'Knife',         damage: 40, fireRate: 1,  magSize: Infinity, reserveAmmo: Infinity, reloadTime: 0,   price: 0,    range: 3,   auto: false, isKnife: true  },
    pistol: { name: 'Pistol',        damage: 25, fireRate: 3,  magSize: 12,       reserveAmmo: 36,       reloadTime: 2.0, price: 0,    range: 200, auto: false, isKnife: false },
    rifle:  { name: 'Rifle (AK-47)', damage: 33, fireRate: 10, magSize: 30,       reserveAmmo: 90,       reloadTime: 2.5, price: 2700, range: 200, auto: true,  isKnife: false },
  };
  GAME.WEAPON_DEFS = WEAPON_DEFS;

  function WeaponSystem(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.owned = { knife: true, pistol: true, rifle: false };
    this.current = 'pistol';
    this.ammo = {};
    this.reserve = {};
    this.resetAmmo();

    this.lastFireTime = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.mouseDown = false;
    this.weaponModel = null;
    this._wallsRef = [];
    this._rc = new THREE.Raycaster();
    this._createWeaponModel();

    var self = this;
    document.addEventListener('mousedown', function(e) { if (e.button === 0) self.mouseDown = true; });
    document.addEventListener('mouseup',   function(e) { if (e.button === 0) self.mouseDown = false; });
  }

  WeaponSystem.prototype.resetAmmo = function() {
    for (var key in WEAPON_DEFS) {
      this.ammo[key] = WEAPON_DEFS[key].magSize;
      this.reserve[key] = WEAPON_DEFS[key].reserveAmmo;
    }
  };

  WeaponSystem.prototype._createWeaponModel = function() {
    if (this.weaponModel) this.camera.remove(this.weaponModel);

    var group = new THREE.Group();
    var lam = function(c) { return new THREE.MeshLambertMaterial({ color: c }); };

    if (this.current === 'knife') {
      var blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.02), lam(0xcccccc));
      blade.position.set(0, 0.1, 0);
      group.add(blade);
      var handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.03), lam(0x4e342e));
      group.add(handle);
    } else if (this.current === 'pistol') {
      var barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), lam(0x333333));
      barrel.position.set(0, 0.02, -0.1);
      group.add(barrel);
      var grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), lam(0x222222));
      grip.position.set(0, -0.04, 0);
      group.add(grip);
    } else if (this.current === 'rifle') {
      var barrel2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.45), lam(0x333333));
      barrel2.position.set(0, 0.02, -0.2);
      group.add(barrel2);
      var mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), lam(0xd84315));
      mag.position.set(0, -0.06, -0.05);
      group.add(mag);
      var stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.15), lam(0x5d4037));
      stock.position.set(0, 0.01, 0.12);
      group.add(stock);
      var grip2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), lam(0x222222));
      grip2.position.set(0, -0.04, 0.02);
      group.add(grip2);
    }

    group.position.set(0.3, -0.3, -0.5);
    this.camera.add(group);
    this.weaponModel = group;
  };

  WeaponSystem.prototype.switchTo = function(weapon) {
    if (!this.owned[weapon] || this.current === weapon) return false;
    this.current = weapon;
    this.reloading = false;
    this.reloadTimer = 0;
    this._createWeaponModel();
    if (GAME.Sound) GAME.Sound.switchWeapon();
    return true;
  };

  WeaponSystem.prototype.giveWeapon = function(weapon) {
    this.owned[weapon] = true;
    this.ammo[weapon] = WEAPON_DEFS[weapon].magSize;
    this.reserve[weapon] = WEAPON_DEFS[weapon].reserveAmmo;
  };

  WeaponSystem.prototype.startReload = function() {
    var def = WEAPON_DEFS[this.current];
    if (def.isKnife || this.reloading) return;
    if (this.ammo[this.current] >= def.magSize) return;
    if (this.reserve[this.current] <= 0) return;
    this.reloading = true;
    this.reloadTimer = def.reloadTime;
    if (GAME.Sound) GAME.Sound.reload();
  };

  WeaponSystem.prototype.tryFire = function(now, enemies) {
    if (!document.pointerLockElement) return null;
    if (this.reloading) return null;

    var def = WEAPON_DEFS[this.current];
    var fireInterval = 1 / def.fireRate;
    if (now - this.lastFireTime < fireInterval) return null;

    if (!def.isKnife) {
      if (this.ammo[this.current] <= 0) {
        if (GAME.Sound) GAME.Sound.empty();
        this.startReload();
        return null;
      }
      this.ammo[this.current]--;
    }

    this.lastFireTime = now;

    // Play fire sound
    if (GAME.Sound) {
      if (def.isKnife) GAME.Sound.knifeSlash();
      else if (this.current === 'rifle') GAME.Sound.rifleShot();
      else GAME.Sound.pistolShot();
    }

    // Raycast from camera center
    this._rc.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this._rc.far = def.range;

    var allObjects = [];
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive && enemies[i].mesh) allObjects.push(enemies[i].mesh);
    }
    allObjects = allObjects.concat(this._wallsRef);

    var hits = this._rc.intersectObjects(allObjects, true);
    var hitResult = null;

    if (hits.length > 0) {
      var hit = hits[0];
      for (var j = 0; j < enemies.length; j++) {
        var enemy = enemies[j];
        if (!enemy.alive) continue;
        if (enemy.mesh && (hit.object === enemy.mesh || (enemy.mesh.children && enemy.mesh.children.indexOf(hit.object) >= 0))) {
          hitResult = { type: 'enemy', enemy: enemy, point: hit.point };
          break;
        }
      }
      if (!hitResult) {
        hitResult = { type: 'wall', point: hit.point };
      }
    }

    this._showMuzzleFlash();
    if (!def.isKnife && hitResult) this._showTracer(hitResult.point);

    // Weapon bob
    if (this.weaponModel) {
      this.weaponModel.position.z += 0.05;
      this.weaponModel.rotation.x -= 0.05;
    }

    if (hitResult) {
      hitResult.damage = def.damage;
      return hitResult;
    }
    return { type: 'miss', damage: 0 };
  };

  WeaponSystem.prototype._showMuzzleFlash = function() {
    if (WEAPON_DEFS[this.current].isKnife) return;
    var flash = new THREE.PointLight(0xffaa00, 3, 8);
    flash.position.copy(this.camera.position);
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    flash.position.add(fwd.multiplyScalar(1));
    var scene = this.scene;
    scene.add(flash);
    setTimeout(function() { scene.remove(flash); }, 50);
  };

  WeaponSystem.prototype._showTracer = function(target) {
    var start = this.camera.position.clone();
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    start.add(fwd.clone().multiplyScalar(0.5));

    var geo = new THREE.BufferGeometry().setFromPoints([start, target.clone()]);
    var mat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.6 });
    var line = new THREE.Line(geo, mat);
    var scene = this.scene;
    scene.add(line);

    var spark = new THREE.PointLight(0xffaa00, 1, 3);
    spark.position.copy(target);
    scene.add(spark);

    setTimeout(function() {
      scene.remove(line);
      scene.remove(spark);
      geo.dispose();
      mat.dispose();
    }, 80);
  };

  WeaponSystem.prototype.setWallsRef = function(walls) {
    this._wallsRef = walls;
  };

  WeaponSystem.prototype.update = function(dt) {
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        var def = WEAPON_DEFS[this.current];
        var needed = def.magSize - this.ammo[this.current];
        var available = Math.min(needed, this.reserve[this.current]);
        this.ammo[this.current] += available;
        this.reserve[this.current] -= available;
      }
    }
    if (this.weaponModel) {
      this.weaponModel.position.z += ((-0.5) - this.weaponModel.position.z) * 8 * dt;
      this.weaponModel.rotation.x += (0 - this.weaponModel.rotation.x) * 8 * dt;
    }
  };

  WeaponSystem.prototype.resetForRound = function() {
    for (var key in this.owned) {
      if (this.owned[key]) {
        this.ammo[key] = WEAPON_DEFS[key].magSize;
        this.reserve[key] = WEAPON_DEFS[key].reserveAmmo;
      }
    }
    this.reloading = false;
    this.reloadTimer = 0;
    this.current = this.owned.rifle ? 'rifle' : 'pistol';
    this._createWeaponModel();
  };

  WeaponSystem.prototype.getCurrentDef = function() {
    return WEAPON_DEFS[this.current];
  };

  GAME.WeaponSystem = WeaponSystem;
})();
