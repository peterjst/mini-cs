// js/weapons.js — Weapon definitions, shooting, reload, switching, grenades
// Attaches GAME.WEAPON_DEFS, GAME.WeaponSystem

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  // ── Material Cache ──────────────────────────────────────────
  var _m = null;
  function M() {
    if (_m) return _m;
    _m = {
      blued:     new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.22, metalness: 0.88 }),
      darkBlued: new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.18, metalness: 0.92 }),
      polymer:   new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.78, metalness: 0.0 }),
      polyGrip:  new THREE.MeshStandardMaterial({ color: 0x252525, roughness: 0.92, metalness: 0.0 }),
      aluminum:  new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.28, metalness: 0.72 }),
      darkAlum:  new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.65 }),
      wood:      new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.62, metalness: 0.0 }),
      woodDark:  new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7, metalness: 0.0 }),
      woodRed:   new THREE.MeshStandardMaterial({ color: 0x7b3f2e, roughness: 0.55, metalness: 0.0 }),
      magOrange: new THREE.MeshStandardMaterial({ color: 0xbf5a1a, roughness: 0.32, metalness: 0.68 }),
      sight:     new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.12, metalness: 0.92 }),
      blade:     new THREE.MeshStandardMaterial({ color: 0xbcbcbc, roughness: 0.12, metalness: 0.92 }),
      bladeEdge: new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.06, metalness: 0.96 }),
      bladeDark: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.85 }),
      rubber:    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.96, metalness: 0.0 }),
      chrome:    new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.08, metalness: 0.96 }),
      grenade:   new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.58, metalness: 0.2 }),
      grenTop:   new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.6 }),
      redDot:    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.1 }),
      brass:     new THREE.MeshStandardMaterial({ color: 0xb5892e, roughness: 0.3, metalness: 0.8 }),
    };
    return _m;
  }

  // ── Geometry Helpers ────────────────────────────────────────
  function P(g, w, h, d, m, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  }
  function PC(g, rT, rB, h, s, m, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, s), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  }
  function PR(g, w, h, d, m, x, y, z, rx, ry, rz) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    if (rx) mesh.rotation.x = rx;
    if (ry) mesh.rotation.y = ry;
    if (rz) mesh.rotation.z = rz;
    g.add(mesh);
    return mesh;
  }

  // ── Weapon Definitions ──────────────────────────────────────
  var WEAPON_DEFS = {
    knife:   { name: 'Knife',           damage: 55,  fireRate: 1.5, magSize: Infinity, reserveAmmo: Infinity, reloadTime: 0,   price: 0,    range: 3,   auto: false, isKnife: true,  isGrenade: false, spread: 0,    pellets: 1 },
    pistol:  { name: 'Pistol (USP)',    damage: 28,  fireRate: 3.5, magSize: 12,       reserveAmmo: 36,       reloadTime: 1.8, price: 0,    range: 200, auto: false, isKnife: false, isGrenade: false, spread: 0.012, pellets: 1 },
    shotgun: { name: 'Shotgun (Nova)',  damage: 18,  fireRate: 1.2, magSize: 6,        reserveAmmo: 24,       reloadTime: 2.8, price: 1800, range: 30,  auto: false, isKnife: false, isGrenade: false, spread: 0.09,  pellets: 8 },
    rifle:   { name: 'Rifle (AK-47)',  damage: 36,  fireRate: 10,  magSize: 30,       reserveAmmo: 90,       reloadTime: 2.5, price: 2700, range: 200, auto: true,  isKnife: false, isGrenade: false, spread: 0.006, pellets: 1 },
    grenade: { name: 'HE Grenade',     damage: 85,  fireRate: 0.8, magSize: 1,        reserveAmmo: 0,        reloadTime: 0,   price: 300,  range: 0,   auto: false, isKnife: false, isGrenade: true,  spread: 0,    pellets: 1, blastRadius: 8, fuseTime: 1.8 },
  };
  GAME.WEAPON_DEFS = WEAPON_DEFS;

  // ══════════════════════════════════════════════════════════════
  //  GRENADE PHYSICS OBJECT
  // ══════════════════════════════════════════════════════════════

  function GrenadeObj(scene, pos, vel, walls) {
    this.scene = scene;
    this.walls = walls;
    this.velocity = vel.clone();
    this.alive = true;
    this.fuseTimer = WEAPON_DEFS.grenade.fuseTime;
    this._rc = new THREE.Raycaster();

    var m = M();
    var g = new THREE.Group();
    // Body
    PC(g, 0.045, 0.045, 0.11, 8, m.grenade, 0, 0, 0);
    // Top fuse assembly
    PC(g, 0.02, 0.045, 0.025, 8, m.grenTop, 0, 0.065, 0);
    // Pin ring
    PC(g, 0.012, 0.012, 0.015, 6, m.chrome, 0.03, 0.07, 0);
    // Spoon lever
    P(g, 0.012, 0.09, 0.02, m.aluminum, 0.04, 0.01, 0);
    // Body ridges (fragmentation pattern)
    for (var i = 0; i < 4; i++) {
      var angle = (i / 4) * Math.PI * 2;
      var rx = Math.cos(angle) * 0.047;
      var rz = Math.sin(angle) * 0.047;
      P(g, 0.005, 0.08, 0.005, m.grenTop, rx, 0, rz);
    }

    g.position.copy(pos);
    scene.add(g);
    this.mesh = g;
  }

  GrenadeObj.prototype.update = function(dt) {
    if (!this.alive) return null;

    this.fuseTimer -= dt;
    if (this.fuseTimer <= 0) {
      this.alive = false;
      return this._explode();
    }

    // Gravity
    this.velocity.y -= 16 * dt;

    var oldPos = this.mesh.position.clone();
    var step = this.velocity.clone().multiplyScalar(dt);
    var newPos = oldPos.clone().add(step);

    // Wall bounce (horizontal)
    var hDir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    var hLen = hDir.length();
    if (hLen > 0.1) {
      hDir.normalize();
      this._rc.set(new THREE.Vector3(oldPos.x, oldPos.y, oldPos.z), hDir);
      this._rc.far = hLen * dt + 0.12;
      var hits = this._rc.intersectObjects(this.walls, false);
      if (hits.length > 0 && hits[0].face) {
        var n = hits[0].face.normal.clone();
        n.transformDirection(hits[0].object.matrixWorld);
        n.y = 0; n.normalize();
        var dot = this.velocity.x * n.x + this.velocity.z * n.z;
        this.velocity.x -= 2 * dot * n.x;
        this.velocity.z -= 2 * dot * n.z;
        this.velocity.multiplyScalar(0.45);
        if (GAME.Sound) GAME.Sound.grenadeBounce();
        newPos = oldPos.clone().add(this.velocity.clone().multiplyScalar(dt));
      }
    }

    // Ground bounce
    if (newPos.y <= 0.06) {
      newPos.y = 0.06;
      if (Math.abs(this.velocity.y) > 1.0) {
        this.velocity.y = Math.abs(this.velocity.y) * 0.25;
        this.velocity.x *= 0.65;
        this.velocity.z *= 0.65;
        if (GAME.Sound) GAME.Sound.grenadeBounce();
      } else {
        this.velocity.y = 0;
        this.velocity.x *= 0.92;
        this.velocity.z *= 0.92;
      }
    }

    // Ceiling bounce
    if (newPos.y > 13) {
      newPos.y = 13;
      this.velocity.y = -Math.abs(this.velocity.y) * 0.3;
    }

    this.mesh.position.copy(newPos);
    this.mesh.rotation.x += dt * 10;
    this.mesh.rotation.z += dt * 6;

    return null;
  };

  GrenadeObj.prototype._explode = function() {
    var pos = this.mesh.position.clone();
    this.scene.remove(this.mesh);
    this._spawnExplosionFX(pos);
    if (GAME.Sound) GAME.Sound.grenadeExplode();
    return {
      position: pos,
      radius: WEAPON_DEFS.grenade.blastRadius,
      damage: WEAPON_DEFS.grenade.damage,
    };
  };

  GrenadeObj.prototype._spawnExplosionFX = function(pos) {
    var scene = this.scene;

    // Point light flash
    var light = new THREE.PointLight(0xff6600, 10, 25);
    light.position.copy(pos);
    scene.add(light);

    // Core fireball
    var fireMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.95 });
    var fire = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 10), fireMat);
    fire.position.copy(pos);
    scene.add(fire);

    // Inner white-hot core
    var coreMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.9 });
    var core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), coreMat);
    core.position.copy(pos);
    scene.add(core);

    // Outer blast wave
    var blastMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    var blast = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), blastMat);
    blast.position.copy(pos);
    scene.add(blast);

    // Dark smoke plume
    var smokeMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.55 });
    var smoke = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), smokeMat);
    smoke.position.copy(pos);
    smoke.position.y += 0.3;
    scene.add(smoke);

    // Light smoke ring
    var smoke2Mat = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.3 });
    var smoke2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), smoke2Mat);
    smoke2.position.copy(pos);
    smoke2.position.y += 1;
    scene.add(smoke2);

    // Debris particles (varied sizes and colors)
    var debris = [];
    for (var i = 0; i < 18; i++) {
      var isHot = Math.random() > 0.4;
      var dMat = new THREE.MeshBasicMaterial({
        color: isHot ? (Math.random() > 0.5 ? 0xff8800 : 0xffaa00) : (Math.random() > 0.5 ? 0x555555 : 0x888888),
        transparent: true, opacity: 1,
      });
      var sz = 0.03 + Math.random() * 0.06;
      var d = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), dMat);
      d.position.copy(pos);
      var angle = Math.random() * Math.PI * 2;
      var upAngle = Math.random() * Math.PI * 0.4 + 0.1;
      var spd = 6 + Math.random() * 10;
      d.userData.vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(upAngle) * spd,
        Math.sin(upAngle) * spd,
        Math.sin(angle) * Math.cos(upAngle) * spd
      );
      scene.add(d);
      debris.push(d);
    }

    // Ground scorch mark
    var scorchMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1, metalness: 0, transparent: true, opacity: 0.6 });
    var scorch = new THREE.Mesh(new THREE.BoxGeometry(3, 0.02, 3), scorchMat);
    scorch.position.set(pos.x, 0.02, pos.z);
    scene.add(scorch);

    var elapsed = 0;
    var interval = setInterval(function() {
      elapsed += 0.016;

      // Core fireball expand + fade
      var fs = 1 + elapsed * 18;
      fire.scale.set(fs, fs, fs);
      fireMat.opacity = Math.max(0, 0.95 - elapsed * 3.5);

      // Inner core flash and shrink
      var cs = 1 + elapsed * 12;
      core.scale.set(cs, cs * 0.8, cs);
      coreMat.opacity = Math.max(0, 0.9 - elapsed * 6);

      // Blast wave expand fast
      var bs = 1 + elapsed * 28;
      blast.scale.set(bs, bs, bs);
      blastMat.opacity = Math.max(0, 0.4 - elapsed * 2);

      // Dark smoke rises and expands slowly
      var ss = 1 + elapsed * 6;
      smoke.scale.set(ss, ss * 1.5, ss);
      smoke.position.y += 0.04;
      smokeMat.opacity = Math.max(0, 0.55 - elapsed * 0.7);

      // Light smoke rises faster
      var s2s = 1 + elapsed * 4;
      smoke2.scale.set(s2s, s2s, s2s);
      smoke2.position.y += 0.06;
      smoke2Mat.opacity = Math.max(0, 0.3 - elapsed * 0.4);

      // Light fade
      light.intensity = Math.max(0, 10 - elapsed * 25);

      // Debris physics
      for (var i = 0; i < debris.length; i++) {
        var d = debris[i];
        d.position.add(d.userData.vel.clone().multiplyScalar(0.016));
        d.userData.vel.y -= 18 * 0.016;
        d.rotation.x += 0.15;
        d.rotation.z += 0.1;
        d.material.opacity = Math.max(0, 1 - elapsed * 1.8);
        if (d.position.y < 0.01) {
          d.position.y = 0.01;
          d.userData.vel.y = 0;
          d.userData.vel.x *= 0.8;
          d.userData.vel.z *= 0.8;
        }
      }

      // Scorch fade in
      scorchMat.opacity = Math.min(0.5, elapsed * 2);

      if (elapsed > 1.2) {
        clearInterval(interval);
        scene.remove(fire); scene.remove(core); scene.remove(blast);
        scene.remove(smoke); scene.remove(smoke2); scene.remove(light);
        fireMat.dispose(); coreMat.dispose(); blastMat.dispose();
        smokeMat.dispose(); smoke2Mat.dispose();
        for (var j = 0; j < debris.length; j++) {
          scene.remove(debris[j]);
          debris[j].material.dispose();
          debris[j].geometry.dispose();
        }
        // Scorch mark stays for a while then fades
        setTimeout(function() {
          scene.remove(scorch);
          scorchMat.dispose();
          scorch.geometry.dispose();
        }, 8000);
      }
    }, 16);
  };

  // ══════════════════════════════════════════════════════════════
  //  WEAPON SYSTEM
  // ══════════════════════════════════════════════════════════════

  function WeaponSystem(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.owned = { knife: true, pistol: true, shotgun: false, rifle: false, grenade: false };
    this.current = 'pistol';
    this._prevWeapon = 'pistol';
    this.ammo = {};
    this.reserve = {};
    this.grenadeCount = 0;
    this.resetAmmo();

    this.lastFireTime = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.mouseDown = false;
    this.weaponModel = null;
    this._wallsRef = [];
    this._grenades = [];
    this._rc = new THREE.Raycaster();
    this._createWeaponModel();

    var self = this;
    document.addEventListener('mousedown', function(e) { if (e.button === 0) self.mouseDown = true; });
    document.addEventListener('mouseup',   function(e) { if (e.button === 0) self.mouseDown = false; });
  }

  WeaponSystem.prototype.resetAmmo = function() {
    for (var key in WEAPON_DEFS) {
      if (!WEAPON_DEFS[key].isGrenade) {
        this.ammo[key] = WEAPON_DEFS[key].magSize;
        this.reserve[key] = WEAPON_DEFS[key].reserveAmmo;
      }
    }
  };

  // ── Detailed Weapon Models ──────────────────────────────────

  WeaponSystem.prototype._createWeaponModel = function() {
    if (this.weaponModel) this.camera.remove(this.weaponModel);

    var g = new THREE.Group();
    var m = M();

    if (this.current === 'knife') {
      this._buildKnife(g, m);
    } else if (this.current === 'pistol') {
      this._buildPistol(g, m);
    } else if (this.current === 'shotgun') {
      this._buildShotgun(g, m);
    } else if (this.current === 'rifle') {
      this._buildRifle(g, m);
    } else if (this.current === 'grenade') {
      this._buildGrenadeModel(g, m);
    }

    g.position.set(0.35, -0.28, -0.45);
    this.camera.add(g);
    this.weaponModel = g;
  };

  WeaponSystem.prototype._buildKnife = function(g, m) {
    // Blade — tapered (wider base, thinner tip)
    P(g, 0.06, 0.32, 0.025, m.blade, 0, 0.22, 0);
    // Blade tip taper
    PR(g, 0.04, 0.1, 0.025, m.blade, 0.01, 0.4, 0, 0, 0, -0.05);
    // Cutting edge highlight
    P(g, 0.015, 0.35, 0.01, m.bladeEdge, 0.03, 0.22, 0);
    // Fuller groove (dark line along blade)
    P(g, 0.02, 0.24, 0.005, m.bladeDark, -0.005, 0.22, -0.008);
    // Blood groove accent
    P(g, 0.008, 0.2, 0.003, m.chrome, -0.005, 0.22, 0.008);
    // Guard / crossguard
    P(g, 0.14, 0.025, 0.05, m.darkAlum, 0, 0.05, 0);
    // Guard detail
    P(g, 0.12, 0.015, 0.035, m.aluminum, 0, 0.05, 0);
    // Handle wrap (segments for texture)
    var hMat = m.woodDark;
    P(g, 0.055, 0.04, 0.04, hMat, 0, 0.01, 0);
    P(g, 0.06, 0.04, 0.045, m.polymer, 0, -0.03, 0);
    P(g, 0.055, 0.04, 0.04, hMat, 0, -0.07, 0);
    P(g, 0.06, 0.04, 0.045, m.polymer, 0, -0.11, 0);
    P(g, 0.055, 0.04, 0.04, hMat, 0, -0.15, 0);
    // Pommel
    P(g, 0.065, 0.025, 0.05, m.darkAlum, 0, -0.19, 0);
    P(g, 0.05, 0.015, 0.04, m.aluminum, 0, -0.205, 0);
    // Lanyard hole
    PC(g, 0.012, 0.012, 0.03, 6, m.chrome, 0, -0.22, 0);
  };

  WeaponSystem.prototype._buildPistol = function(g, m) {
    // ── Slide (upper receiver) ──
    P(g, 0.068, 0.058, 0.3, m.blued, 0, 0.06, -0.15);
    // Slide top flat
    P(g, 0.062, 0.008, 0.28, m.darkBlued, 0, 0.09, -0.15);
    // Slide serrations (rear) — 6 thin lines
    for (var i = 0; i < 6; i++) {
      P(g, 0.07, 0.003, 0.004, m.darkBlued, 0, 0.055 + i * 0.007, -0.02 + i * 0.002);
    }
    // Ejection port (right side cutout)
    P(g, 0.005, 0.03, 0.04, m.polymer, 0.037, 0.07, -0.1);
    // Barrel protruding from slide
    PC(g, 0.018, 0.018, 0.08, 8, m.darkBlued, 0, 0.055, -0.33);
    // Barrel bore (dark hole at muzzle)
    PC(g, 0.01, 0.01, 0.01, 6, m.polymer, 0, 0.055, -0.375);
    // Barrel bushing
    PC(g, 0.025, 0.025, 0.015, 8, m.blued, 0, 0.055, -0.305);

    // ── Frame / lower receiver ──
    P(g, 0.062, 0.035, 0.22, m.polymer, 0, 0.015, -0.12);
    // Rail dust cover
    P(g, 0.058, 0.01, 0.1, m.polymer, 0, -0.005, -0.18);
    // Accessory rail (3 ridges)
    for (var r = 0; r < 3; r++) {
      P(g, 0.06, 0.005, 0.008, m.darkBlued, 0, -0.01, -0.16 + r * 0.015);
    }

    // ── Trigger guard ──
    P(g, 0.05, 0.006, 0.07, m.polymer, 0, -0.025, -0.1);  // bottom
    P(g, 0.05, 0.03, 0.006, m.polymer, 0, -0.01, -0.065);  // front
    // Trigger
    P(g, 0.02, 0.025, 0.008, m.aluminum, 0, -0.005, -0.095);

    // ── Grip ──
    // Main grip body
    PR(g, 0.058, 0.15, 0.065, m.polyGrip, 0, -0.095, -0.02, -0.18, 0, 0);
    // Grip panels (textured sides) — left
    PR(g, 0.005, 0.12, 0.05, m.polymer, -0.032, -0.09, -0.02, -0.18, 0, 0);
    // Grip panels — right
    PR(g, 0.005, 0.12, 0.05, m.polymer, 0.032, -0.09, -0.02, -0.18, 0, 0);
    // Grip texture lines (horizontal grooves)
    for (var t = 0; t < 4; t++) {
      var ty = -0.05 - t * 0.028;
      PR(g, 0.06, 0.003, 0.066, m.darkBlued, 0, ty, -0.02 - t * 0.005, -0.18, 0, 0);
    }
    // Backstrap
    PR(g, 0.03, 0.13, 0.012, m.polymer, 0, -0.085, 0.015, -0.18, 0, 0);
    // Magazine base plate
    PR(g, 0.052, 0.012, 0.055, m.aluminum, 0, -0.18, -0.05, -0.18, 0, 0);

    // ── Beaver tail ──
    P(g, 0.055, 0.02, 0.03, m.blued, 0, 0.04, 0.0);

    // ── Sights ──
    // Front sight — blade
    P(g, 0.018, 0.025, 0.015, m.sight, 0, 0.11, -0.29);
    // Front sight dot
    P(g, 0.006, 0.006, 0.003, m.redDot, 0, 0.12, -0.3);
    // Rear sight — two posts
    P(g, 0.012, 0.022, 0.015, m.sight, -0.018, 0.11, -0.04);
    P(g, 0.012, 0.022, 0.015, m.sight, 0.018, 0.11, -0.04);
    // Rear sight bridge
    P(g, 0.05, 0.008, 0.015, m.sight, 0, 0.12, -0.04);

    // ── Hammer ──
    P(g, 0.02, 0.025, 0.015, m.blued, 0, 0.06, 0.005);

    // ── Slide stop lever (left side) ──
    P(g, 0.006, 0.012, 0.025, m.blued, -0.038, 0.035, -0.08);

    // ── Magazine release ──
    P(g, 0.008, 0.012, 0.01, m.blued, -0.035, 0.005, -0.06);
  };

  WeaponSystem.prototype._buildRifle = function(g, m) {
    // ── Barrel ──
    PC(g, 0.022, 0.022, 0.55, 8, m.blued, 0, 0.04, -0.58);
    // Barrel chrome lining (visible at muzzle)
    PC(g, 0.015, 0.015, 0.02, 6, m.polymer, 0, 0.04, -0.86);

    // ── Muzzle brake ──
    PC(g, 0.032, 0.028, 0.06, 8, m.darkBlued, 0, 0.04, -0.87);
    // Muzzle brake ports (angled slots)
    PR(g, 0.035, 0.008, 0.015, m.polymer, 0, 0.06, -0.86, 0, 0, 0.3);
    PR(g, 0.035, 0.008, 0.015, m.polymer, 0, 0.06, -0.88, 0, 0, -0.3);
    // Muzzle crown
    PC(g, 0.034, 0.034, 0.008, 8, m.blued, 0, 0.04, -0.9);

    // ── Gas tube (above barrel) ──
    PC(g, 0.012, 0.012, 0.35, 6, m.darkBlued, 0, 0.085, -0.5);
    // Gas block (front sight base)
    P(g, 0.045, 0.04, 0.03, m.blued, 0, 0.075, -0.66);

    // ── Handguard / foregrip ──
    // Upper handguard
    P(g, 0.065, 0.03, 0.25, m.woodRed, 0, 0.075, -0.45);
    // Lower handguard
    P(g, 0.065, 0.03, 0.25, m.woodRed, 0, 0.005, -0.45);
    // Handguard ventilation holes (left side)
    P(g, 0.003, 0.015, 0.02, m.polymer, -0.034, 0.04, -0.4);
    P(g, 0.003, 0.015, 0.02, m.polymer, -0.034, 0.04, -0.44);
    P(g, 0.003, 0.015, 0.02, m.polymer, -0.034, 0.04, -0.48);
    // Right side
    P(g, 0.003, 0.015, 0.02, m.polymer, 0.034, 0.04, -0.4);
    P(g, 0.003, 0.015, 0.02, m.polymer, 0.034, 0.04, -0.44);
    P(g, 0.003, 0.015, 0.02, m.polymer, 0.034, 0.04, -0.48);
    // Handguard ferrule (where it meets receiver)
    P(g, 0.07, 0.065, 0.015, m.blued, 0, 0.04, -0.32);

    // ── Receiver body ──
    P(g, 0.075, 0.072, 0.22, m.blued, 0, 0.04, -0.12);
    // Receiver top cover (dust cover)
    P(g, 0.058, 0.01, 0.18, m.blued, 0, 0.08, -0.1);
    // Dust cover ribs
    for (var dc = 0; dc < 4; dc++) {
      P(g, 0.06, 0.003, 0.006, m.darkBlued, 0, 0.086, -0.04 - dc * 0.04);
    }

    // ── Rear sight (tangent style) ──
    P(g, 0.04, 0.025, 0.02, m.sight, 0, 0.1, -0.06);
    // Sight leaf
    P(g, 0.03, 0.015, 0.008, m.sight, 0, 0.118, -0.06);
    // Sight notch (U shape — two posts)
    P(g, 0.008, 0.012, 0.008, m.sight, -0.012, 0.13, -0.06);
    P(g, 0.008, 0.012, 0.008, m.sight, 0.012, 0.13, -0.06);

    // ── Front sight ──
    P(g, 0.008, 0.04, 0.008, m.sight, 0, 0.115, -0.66);
    // Front sight protectors
    P(g, 0.005, 0.035, 0.01, m.blued, -0.018, 0.11, -0.66);
    P(g, 0.005, 0.035, 0.01, m.blued, 0.018, 0.11, -0.66);
    // Protector bridge
    P(g, 0.04, 0.005, 0.008, m.blued, 0, 0.13, -0.66);

    // ── Ejection port ──
    P(g, 0.005, 0.03, 0.04, m.polymer, 0.04, 0.055, -0.08);

    // ── Charging handle ──
    P(g, 0.015, 0.018, 0.035, m.blued, 0.042, 0.07, -0.02);

    // ── Magazine (curved AK style) ──
    // Main mag body
    PR(g, 0.06, 0.2, 0.05, m.magOrange, 0, -0.12, -0.11, -0.15, 0, 0);
    // Magazine lip
    P(g, 0.055, 0.015, 0.045, m.darkBlued, 0, -0.015, -0.1);
    // Magazine base plate
    PR(g, 0.058, 0.01, 0.048, m.aluminum, 0, -0.225, -0.14, -0.15, 0, 0);
    // Magazine ridges (left)
    PR(g, 0.003, 0.16, 0.045, m.darkBlued, -0.032, -0.12, -0.11, -0.15, 0, 0);
    // Magazine ridges (right)
    PR(g, 0.003, 0.16, 0.045, m.darkBlued, 0.032, -0.12, -0.11, -0.15, 0, 0);

    // ── Pistol grip ──
    PR(g, 0.05, 0.12, 0.055, m.polyGrip, 0, -0.07, 0.03, -0.22, 0, 0);
    // Grip texture
    for (var gt = 0; gt < 3; gt++) {
      PR(g, 0.052, 0.004, 0.056, m.polymer, 0, -0.04 - gt * 0.025, 0.03 + gt * 0.005, -0.22, 0, 0);
    }
    // Grip cap
    PR(g, 0.048, 0.008, 0.05, m.darkBlued, 0, -0.135, 0.045, -0.22, 0, 0);

    // ── Trigger guard ──
    P(g, 0.05, 0.006, 0.06, m.blued, 0, -0.025, -0.05);
    P(g, 0.05, 0.025, 0.005, m.blued, 0, -0.012, -0.02);
    // Trigger
    P(g, 0.018, 0.022, 0.008, m.aluminum, 0, -0.005, -0.045);

    // ── Stock (wooden AK-style) ──
    // Main stock body
    P(g, 0.065, 0.08, 0.28, m.wood, 0, 0.03, 0.22);
    // Stock taper (thinner towards rear)
    P(g, 0.06, 0.1, 0.08, m.wood, 0, 0.035, 0.37);
    // Stock cheek rest
    P(g, 0.05, 0.02, 0.15, m.wood, 0, 0.085, 0.26);
    // Buttplate (rubber pad)
    P(g, 0.06, 0.105, 0.015, m.rubber, 0, 0.035, 0.41);
    // Stock screw detail
    PC(g, 0.006, 0.006, 0.005, 6, m.chrome, -0.034, 0.035, 0.25);
    PC(g, 0.006, 0.006, 0.005, 6, m.chrome, 0.034, 0.035, 0.25);

    // ── Sling mount (front) ──
    P(g, 0.008, 0.025, 0.012, m.blued, 0, -0.01, -0.55);
    // Sling mount (rear)
    P(g, 0.008, 0.025, 0.012, m.blued, -0.035, 0.02, 0.35);

    // ── Selector lever ──
    PR(g, 0.025, 0.008, 0.005, m.blued, 0.042, 0.04, 0.0, 0, 0, -0.5);
  };

  WeaponSystem.prototype._buildShotgun = function(g, m) {
    // ── Barrel ──
    PC(g, 0.025, 0.025, 0.6, 8, m.blued, 0, 0.05, -0.6);
    // Barrel bore
    PC(g, 0.018, 0.018, 0.01, 6, m.polymer, 0, 0.05, -0.905);
    // Muzzle ring
    PC(g, 0.03, 0.03, 0.015, 8, m.darkBlued, 0, 0.05, -0.9);

    // ── Tube magazine (under barrel) ──
    PC(g, 0.02, 0.02, 0.45, 8, m.darkBlued, 0, 0.005, -0.52);
    // Magazine cap
    PC(g, 0.025, 0.025, 0.02, 8, m.blued, 0, 0.005, -0.75);

    // ── Pump / forend ──
    P(g, 0.075, 0.065, 0.16, m.polymer, 0, 0.025, -0.45);
    // Pump grip ridges
    for (var pr = 0; pr < 5; pr++) {
      P(g, 0.077, 0.004, 0.008, m.darkBlued, 0, 0.01 + pr * 0.012, -0.42 + pr * 0.012);
    }

    // ── Receiver ──
    P(g, 0.08, 0.08, 0.2, m.blued, 0, 0.04, -0.2);
    // Receiver top (flat)
    P(g, 0.065, 0.01, 0.18, m.darkBlued, 0, 0.085, -0.2);
    // Ejection port (right side)
    P(g, 0.005, 0.035, 0.05, m.polymer, 0.043, 0.055, -0.18);
    // Loading port (bottom)
    P(g, 0.04, 0.005, 0.06, m.polymer, 0, -0.005, -0.16);

    // ── Trigger guard ──
    P(g, 0.05, 0.006, 0.07, m.blued, 0, -0.02, -0.1);
    P(g, 0.05, 0.025, 0.005, m.blued, 0, -0.008, -0.065);
    // Trigger
    P(g, 0.018, 0.022, 0.008, m.aluminum, 0, -0.002, -0.095);

    // ── Pistol grip ──
    PR(g, 0.05, 0.13, 0.055, m.polyGrip, 0, -0.07, 0.0, -0.2, 0, 0);
    // Grip texture
    for (var gt = 0; gt < 3; gt++) {
      PR(g, 0.052, 0.004, 0.056, m.polymer, 0, -0.04 - gt * 0.025, gt * 0.005, -0.2, 0, 0);
    }
    // Grip cap
    PR(g, 0.048, 0.008, 0.05, m.darkBlued, 0, -0.14, 0.015, -0.2, 0, 0);

    // ── Stock ──
    P(g, 0.06, 0.075, 0.25, m.polymer, 0, 0.035, 0.2);
    // Stock cheek rest
    P(g, 0.045, 0.018, 0.12, m.polymer, 0, 0.08, 0.22);
    // Buttpad (rubber)
    P(g, 0.058, 0.09, 0.018, m.rubber, 0, 0.035, 0.33);
    // Stock texture ridges
    for (var sr = 0; sr < 3; sr++) {
      P(g, 0.062, 0.004, 0.008, m.darkBlued, 0, 0.015 + sr * 0.02, 0.26 + sr * 0.02);
    }

    // ── Bead sight (front) ──
    PC(g, 0.008, 0.008, 0.012, 6, m.chrome, 0, 0.075, -0.88);
    // Sight ramp
    P(g, 0.02, 0.012, 0.025, m.blued, 0, 0.068, -0.87);

    // ── Safety button ──
    PC(g, 0.008, 0.008, 0.008, 6, m.redDot, 0.044, 0.06, -0.08);

    // ── Sling mount ──
    P(g, 0.008, 0.02, 0.012, m.blued, 0, -0.01, -0.7);
  };

  WeaponSystem.prototype._buildGrenadeModel = function(g, m) {
    // Grenade held in hand — larger for first-person view
    // Body
    PC(g, 0.055, 0.055, 0.14, 10, m.grenade, 0, 0.02, -0.05);
    // Top fuse assembly
    PC(g, 0.028, 0.055, 0.03, 8, m.grenTop, 0, 0.1, -0.05);
    // Fuse cap
    PC(g, 0.015, 0.015, 0.015, 6, m.chrome, 0, 0.12, -0.05);
    // Spoon lever
    P(g, 0.015, 0.12, 0.022, m.aluminum, 0.05, 0.04, -0.05);
    // Pin ring
    PC(g, 0.018, 0.018, 0.01, 6, m.chrome, 0.065, 0.1, -0.05);
    P(g, 0.008, 0.02, 0.008, m.chrome, 0.065, 0.09, -0.05);
    // Body ridges (fragmentation lines — horizontal)
    for (var r = 0; r < 5; r++) {
      var ry = -0.04 + r * 0.025;
      PC(g, 0.058, 0.058, 0.005, 10, m.grenTop, 0, ry, -0.05);
    }
    // Body ridges (vertical)
    for (var v = 0; v < 6; v++) {
      var va = (v / 6) * Math.PI * 2;
      var vx = Math.cos(va) * 0.057;
      var vz = Math.sin(va) * 0.057 - 0.05;
      P(g, 0.005, 0.12, 0.005, m.grenTop, vx, 0.02, vz);
    }
    // Stenciled marking (small colored band)
    PC(g, 0.057, 0.057, 0.012, 10, m.magOrange, 0, 0.065, -0.05);
  };

  // ── Weapon Operations ───────────────────────────────────────

  WeaponSystem.prototype.switchTo = function(weapon) {
    if (weapon === 'grenade') {
      if (this.grenadeCount <= 0) return false;
      if (this.current === 'grenade') return false;
      this._prevWeapon = this.current;
    } else {
      if (!this.owned[weapon] || this.current === weapon) return false;
    }
    this.current = weapon;
    this.reloading = false;
    this.reloadTimer = 0;
    this._createWeaponModel();
    if (GAME.Sound) GAME.Sound.switchWeapon();
    return true;
  };

  WeaponSystem.prototype.giveWeapon = function(weapon) {
    this.owned[weapon] = true;
    if (!WEAPON_DEFS[weapon].isGrenade) {
      this.ammo[weapon] = WEAPON_DEFS[weapon].magSize;
      this.reserve[weapon] = WEAPON_DEFS[weapon].reserveAmmo;
    }
  };

  WeaponSystem.prototype.buyGrenade = function() {
    this.grenadeCount++;
    this.owned.grenade = true;
  };

  WeaponSystem.prototype.startReload = function() {
    var def = WEAPON_DEFS[this.current];
    if (def.isKnife || def.isGrenade || this.reloading) return;
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

    // ── Grenade throw ──
    if (def.isGrenade) {
      if (this.grenadeCount <= 0) return null;
      this.grenadeCount--;
      this.lastFireTime = now;
      this._throwGrenade();
      if (GAME.Sound) GAME.Sound.grenadeThrow();
      // Switch back after throw
      if (this.grenadeCount <= 0) this.owned.grenade = false;
      var switchTo = this._prevWeapon || 'pistol';
      if (!this.owned[switchTo]) switchTo = 'pistol';
      this.current = switchTo;
      this._createWeaponModel();
      return [{ type: 'grenade_thrown', damage: 0 }];
    }

    // ── Normal gun / knife fire ──
    if (!def.isKnife) {
      if (this.ammo[this.current] <= 0) {
        if (GAME.Sound) GAME.Sound.empty();
        this.startReload();
        return null;
      }
      this.ammo[this.current]--;
    }

    this.lastFireTime = now;

    // Fire sound
    if (GAME.Sound) {
      if (def.isKnife) GAME.Sound.knifeSlash();
      else if (this.current === 'shotgun') GAME.Sound.shotgunShot();
      else if (this.current === 'rifle') GAME.Sound.rifleShot();
      else GAME.Sound.pistolShot();
    }

    this._showMuzzleFlash();

    // Recoil kick
    if (this.weaponModel) {
      var recoilZ = this.current === 'shotgun' ? 0.1 : 0.06;
      var recoilX = this.current === 'shotgun' ? -0.1 : -0.06;
      this.weaponModel.position.z += recoilZ;
      this.weaponModel.rotation.x += recoilX;
    }

    // Multi-pellet firing (shotgun) or single shot
    var pelletCount = def.pellets || 1;
    var spread = def.spread || 0;
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    var up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    var birds = this._birdsRef || [];

    var allObjects = [];
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].alive && enemies[i].mesh) allObjects.push(enemies[i].mesh);
    }
    for (var i = 0; i < birds.length; i++) {
      if (birds[i].alive && birds[i].mesh) allObjects.push(birds[i].mesh);
    }
    allObjects = allObjects.concat(this._wallsRef);

    // Aggregate damage per enemy/bird for multi-pellet
    var enemyDmg = {};
    var enemyHitPoints = {};
    var birdHits = {};
    var birdHitPoints = {};
    var anyHit = false;

    for (var p = 0; p < pelletCount; p++) {
      // Apply spread to direction
      var dir = fwd.clone();
      if (spread > 0) {
        var sx = (Math.random() - 0.5) * 2 * spread;
        var sy = (Math.random() - 0.5) * 2 * spread;
        dir.add(right.clone().multiplyScalar(sx));
        dir.add(up.clone().multiplyScalar(sy));
        dir.normalize();
      }

      this._rc.set(this.camera.position, dir);
      this._rc.far = def.range;

      var hits = this._rc.intersectObjects(allObjects, true);
      if (hits.length > 0) {
        var hit = hits[0];
        var hitEnemy = null;
        var hitBird = null;
        for (var j = 0; j < enemies.length; j++) {
          var enemy = enemies[j];
          if (!enemy.alive) continue;
          if (enemy.mesh && (hit.object === enemy.mesh || (enemy.mesh.children && enemy.mesh.children.indexOf(hit.object) >= 0))) {
            hitEnemy = enemy;
            break;
          }
        }
        if (!hitEnemy) {
          for (var b = 0; b < birds.length; b++) {
            var bird = birds[b];
            if (!bird.alive) continue;
            if (bird.mesh && (hit.object === bird.mesh || (bird.mesh.children && bird.mesh.children.indexOf(hit.object) >= 0))) {
              hitBird = bird;
              break;
            }
          }
        }
        if (hitEnemy) {
          var eid = hitEnemy.id;
          enemyDmg[eid] = (enemyDmg[eid] || 0) + def.damage;
          if (!enemyHitPoints[eid]) enemyHitPoints[eid] = hit.point;
          anyHit = true;
        }
        if (hitBird) {
          birdHits[hitBird.id] = true;
          if (!birdHitPoints[hitBird.id]) birdHitPoints[hitBird.id] = hit.point;
          anyHit = true;
        }
        if (!def.isKnife) this._showTracer(hit.point);
      }
    }

    // Build results array
    var results = [];
    for (var eid2 in enemyDmg) {
      var hitEnemy2 = null;
      for (var k = 0; k < enemies.length; k++) {
        if (enemies[k].id === parseInt(eid2)) { hitEnemy2 = enemies[k]; break; }
      }
      if (hitEnemy2) {
        results.push({ type: 'enemy', enemy: hitEnemy2, damage: enemyDmg[eid2], point: enemyHitPoints[eid2] });
      }
    }
    for (var bid in birdHits) {
      for (var b2 = 0; b2 < birds.length; b2++) {
        if (birds[b2].id === parseInt(bid)) {
          results.push({ type: 'bird', bird: birds[b2], point: birdHitPoints[bid] });
          break;
        }
      }
    }

    if (results.length > 0) return results;
    return [{ type: 'miss', damage: 0 }];
  };

  WeaponSystem.prototype._throwGrenade = function() {
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    var pos = this.camera.position.clone().add(fwd.clone().multiplyScalar(1.2));
    var vel = fwd.clone().multiplyScalar(20);
    vel.y += 5;

    var nade = new GrenadeObj(this.scene, pos, vel, this._wallsRef);
    this._grenades.push(nade);
  };

  WeaponSystem.prototype._showMuzzleFlash = function() {
    if (WEAPON_DEFS[this.current].isKnife) return;
    var flash = new THREE.PointLight(0xffaa00, 4, 10);
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
    var mat = new THREE.LineBasicMaterial({ color: 0xffff44, transparent: true, opacity: 0.5 });
    var line = new THREE.Line(geo, mat);
    var scene = this.scene;
    scene.add(line);

    var spark = new THREE.PointLight(0xffaa00, 1.5, 4);
    spark.position.copy(target);
    scene.add(spark);

    // Impact sparks — small debris
    var sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.8 });
    var sparks = [];
    for (var s = 0; s < 4; s++) {
      var sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), sparkMat);
      sp.position.copy(target);
      sp.userData.vel = new THREE.Vector3((Math.random()-0.5)*4, Math.random()*3, (Math.random()-0.5)*4);
      scene.add(sp);
      sparks.push(sp);
    }

    var elapsed = 0;
    var interval = setInterval(function() {
      elapsed += 0.016;
      for (var i = 0; i < sparks.length; i++) {
        sparks[i].position.add(sparks[i].userData.vel.clone().multiplyScalar(0.016));
        sparks[i].userData.vel.y -= 10 * 0.016;
        sparks[i].material.opacity = Math.max(0, 0.8 - elapsed * 5);
      }
      if (elapsed > 0.15) {
        clearInterval(interval);
        scene.remove(line);
        scene.remove(spark);
        geo.dispose(); mat.dispose();
        for (var j = 0; j < sparks.length; j++) scene.remove(sparks[j]);
        sparkMat.dispose();
      }
    }, 16);
  };

  WeaponSystem.prototype.setWallsRef = function(walls) {
    this._wallsRef = walls;
  };

  WeaponSystem.prototype.setBirdsRef = function(birds) {
    this._birdsRef = birds;
  };

  WeaponSystem.prototype.update = function(dt) {
    // Reload
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

    // Weapon bob return
    if (this.weaponModel) {
      this.weaponModel.position.z += ((-0.45) - this.weaponModel.position.z) * 8 * dt;
      this.weaponModel.rotation.x += (0 - this.weaponModel.rotation.x) * 8 * dt;
    }

    // Update grenades
    var explosions = [];
    for (var i = this._grenades.length - 1; i >= 0; i--) {
      var result = this._grenades[i].update(dt);
      if (result) {
        explosions.push(result);
        this._grenades.splice(i, 1);
      } else if (!this._grenades[i].alive) {
        this._grenades.splice(i, 1);
      }
    }

    return explosions.length > 0 ? explosions : null;
  };

  WeaponSystem.prototype.resetForRound = function() {
    for (var key in this.owned) {
      if (key === 'grenade') continue;
      if (this.owned[key]) {
        this.ammo[key] = WEAPON_DEFS[key].magSize;
        this.reserve[key] = WEAPON_DEFS[key].reserveAmmo;
      }
    }
    this.reloading = false;
    this.reloadTimer = 0;
    // Clear active grenades
    for (var i = 0; i < this._grenades.length; i++) {
      if (this._grenades[i].mesh && this._grenades[i].mesh.parent) {
        this.scene.remove(this._grenades[i].mesh);
      }
    }
    this._grenades = [];
    this.current = this.owned.rifle ? 'rifle' : this.owned.shotgun ? 'shotgun' : 'pistol';
    this._createWeaponModel();
  };

  WeaponSystem.prototype.getCurrentDef = function() {
    return WEAPON_DEFS[this.current];
  };

  GAME.WeaponSystem = WeaponSystem;
})();
