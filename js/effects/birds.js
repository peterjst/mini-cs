// js/effects/birds.js — Ambient bird system extracted from main.js
(function() {
  'use strict';

  var birds = [];
  var BIRD_COUNT = 5;
  var BIRD_MONEY = 200;
  var _birdId = 0;
  var _birdMapSize = 50;
  var _featherGeo = null;
  var _birdBodyMat = null, _birdWingMat = null, _birdBeakMat = null;

  function getBirdMaterials() {
    if (!_birdBodyMat) {
      _birdBodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.1 });
      _birdWingMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.75, metalness: 0.1 });
      _birdBeakMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.6, metalness: 0.2 });
    }
  }

  function createBird(mapSize) {
    getBirdMaterials();
    var group = new THREE.Group();
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), _birdBodyMat);
    body.scale.set(1, 0.8, 1.8);
    group.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), _birdBodyMat);
    head.position.set(0, 0.08, -0.32);
    group.add(head);
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), _birdBeakMat);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.04, -0.48);
    group.add(beak);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.18), _birdWingMat);
    tail.position.set(0, 0.04, 0.3);
    tail.rotation.x = 0.2;
    group.add(tail);
    var leftPivot = new THREE.Group();
    leftPivot.position.set(0.18, 0.05, 0);
    var leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.22), _birdWingMat);
    leftWing.position.set(0.22, 0, 0);
    leftPivot.add(leftWing);
    group.add(leftPivot);
    var rightPivot = new THREE.Group();
    rightPivot.position.set(-0.18, 0.05, 0);
    var rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.22), _birdWingMat);
    rightWing.position.set(-0.22, 0, 0);
    rightPivot.add(rightWing);
    group.add(rightPivot);

    var half = mapSize * 0.4;
    var cx = (Math.random() - 0.5) * 2 * half;
    var cz = (Math.random() - 0.5) * 2 * half;
    var radius = 5 + Math.random() * 12;
    var height = 10 + Math.random() * 10;
    var speed = 0.3 + Math.random() * 0.4;
    var angle = Math.random() * Math.PI * 2;
    var flapSpeed = 6 + Math.random() * 4;

    group.position.set(cx + Math.cos(angle) * radius, height, cz + Math.sin(angle) * radius);
    GAME.scene.add(group);

    return {
      id: _birdId++, mesh: group, alive: true,
      leftPivot: leftPivot, rightPivot: rightPivot,
      cx: cx, cz: cz, radius: radius, height: height,
      speed: speed, angle: angle, flapSpeed: flapSpeed,
      flapPhase: Math.random() * Math.PI * 2, respawnTimer: 0,
    };
  }

  function spawnBirds(mapSize) {
    birds.length = 0;
    _birdId = 0;
    _birdMapSize = mapSize;
    for (var i = 0; i < BIRD_COUNT; i++) birds.push(createBird(mapSize));
  }

  function updateBirds(dt) {
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];
      if (!b.alive) {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) {
          b.alive = true;
          var half = _birdMapSize * 0.4;
          b.cx = (Math.random() - 0.5) * 2 * half;
          b.cz = (Math.random() - 0.5) * 2 * half;
          b.radius = 5 + Math.random() * 12;
          b.height = 10 + Math.random() * 10;
          b.angle = Math.random() * Math.PI * 2;
          b.mesh.visible = true;
          b.mesh.position.set(b.cx + Math.cos(b.angle) * b.radius, b.height, b.cz + Math.sin(b.angle) * b.radius);
          GAME.scene.add(b.mesh);
        }
        continue;
      }
      b.angle += b.speed * dt;
      b.mesh.position.set(b.cx + Math.cos(b.angle) * b.radius, b.height + Math.sin(b.angle * 2) * 0.5, b.cz + Math.sin(b.angle) * b.radius);
      b.mesh.rotation.y = -b.angle + Math.PI / 2;
      b.mesh.rotation.z = Math.sin(b.angle) * 0.15;
      b.flapPhase += b.flapSpeed * dt;
      var flap = Math.sin(b.flapPhase) * 0.6;
      b.leftPivot.rotation.z = flap;
      b.rightPivot.rotation.z = -flap;
    }
  }

  function killBird(bird, hitPoint) {
    bird.alive = false;
    bird.respawnTimer = 15 + Math.random() * 10;
    if (!_featherGeo) _featherGeo = new THREE.BoxGeometry(0.06, 0.01, 0.1);
    for (var i = 0; i < 6; i++) {
      var feather = new THREE.Mesh(_featherGeo, _birdWingMat);
      feather.position.copy(hitPoint);
      var vel = new THREE.Vector3((Math.random()-0.5)*4, Math.random()*3, (Math.random()-0.5)*4);
      GAME.scene.add(feather);
      (function(f,v) {
        var life = 0;
        var iv = setInterval(function() {
          life += 0.016; v.y -= 9.8*0.016;
          f.position.add(v.clone().multiplyScalar(0.016));
          f.rotation.x += 5*0.016; f.rotation.z += 3*0.016;
          if (life > 1.5) { clearInterval(iv); if (f.parent) f.parent.remove(f); }
        }, 16);
      })(feather, vel);
    }
    bird.mesh.visible = false;
  }

  GAME.birds = {
    spawn: spawnBirds,
    update: updateBirds,
    kill: killBird,
    list: birds,
    BIRD_MONEY: BIRD_MONEY
  };
})();
