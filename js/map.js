// js/map.js — Map definitions (Dust, Office, Warehouse)
// Attaches to window.GAME.maps

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var maps = [
    // ── Map 1: "Dust" — open desert style ──
    {
      name: 'Dust',
      size: { x: 50, z: 50 },
      skyColor: 0x87ceeb,
      fogColor: 0xc8b89a,
      fogDensity: 0.015,
      playerSpawn: { x: -20, z: -20 },
      botSpawns: [
        { x: 10, z: 10 },
        { x: 15, z: -5 },
        { x: -5, z: 12 },
        { x: 5, z: 0 },
        { x: 0, z: 8 },
      ],
      waypoints: [
        { x: 0, z: 0 }, { x: 15, z: 15 }, { x: -15, z: 15 },
        { x: 15, z: -15 }, { x: -15, z: -15 }, { x: 0, z: 20 },
        { x: 0, z: -20 }, { x: 20, z: 0 }, { x: -20, z: 0 },
        { x: 10, z: 10 }, { x: -10, z: -10 },
      ],
      build: function(scene) {
        var walls = [];
        var mat = function(color) { return new THREE.MeshLambertMaterial({ color: color }); };

        // Floor
        var floor = new THREE.Mesh(new THREE.BoxGeometry(50, 1, 50), mat(0xd2b48c));
        floor.position.set(0, -0.5, 0);
        scene.add(floor);

        // Perimeter walls
        var wallH = 6, wallT = 1;
        var perimeter = [
          { s: [52, wallH, wallT], p: [0, wallH/2, -25.5] },
          { s: [52, wallH, wallT], p: [0, wallH/2, 25.5] },
          { s: [wallT, wallH, 50], p: [-25.5, wallH/2, 0] },
          { s: [wallT, wallH, 50], p: [25.5, wallH/2, 0] },
        ];
        perimeter.forEach(function(w) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(w.s[0], w.s[1], w.s[2]), mat(0xc4a882));
          m.position.set(w.p[0], w.p[1], w.p[2]);
          scene.add(m);
          walls.push(m);
        });

        // Crates & cover
        var crates = [
          { s: [4,3,4], p: [0,1.5,0], c: 0x8b6914 },
          { s: [3,2,3], p: [5,1,4], c: 0x9b7924 },
          { s: [3,2,3], p: [-5,1,-3], c: 0x8b6914 },
          { s: [2,4,6], p: [12,2,0], c: 0xc4a882 },
          { s: [6,4,2], p: [-12,2,5], c: 0xc4a882 },
          { s: [2,3,2], p: [8,1.5,-10], c: 0x9b7924 },
          { s: [2,3,2], p: [-8,1.5,10], c: 0x9b7924 },
          { s: [8,3,1], p: [0,1.5,-12], c: 0xb09060 },
          { s: [8,3,1], p: [0,1.5,12], c: 0xb09060 },
          { s: [1,3,8], p: [15,1.5,-15], c: 0xb09060 },
          { s: [1,3,8], p: [-15,1.5,15], c: 0xb09060 },
        ];
        crates.forEach(function(c) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(c.s[0], c.s[1], c.s[2]), mat(c.c));
          m.position.set(c.p[0], c.p[1], c.p[2]);
          scene.add(m);
          walls.push(m);
        });

        return walls;
      },
    },

    // ── Map 2: "Office" — tight corridors ──
    {
      name: 'Office',
      size: { x: 40, z: 40 },
      skyColor: 0x607d8b,
      fogColor: 0x506070,
      fogDensity: 0.02,
      playerSpawn: { x: -16, z: -16 },
      botSpawns: [
        { x: 10, z: 10 },
        { x: 12, z: -8 },
        { x: -8, z: 12 },
        { x: 5, z: 0 },
        { x: 0, z: 8 },
      ],
      waypoints: [
        { x: 0, z: 0 }, { x: 10, z: 10 }, { x: -10, z: 10 },
        { x: 10, z: -10 }, { x: -10, z: -10 }, { x: 0, z: 15 },
        { x: 0, z: -15 }, { x: 15, z: 0 }, { x: -15, z: 0 },
        { x: 5, z: 5 }, { x: -5, z: -5 },
      ],
      build: function(scene) {
        var walls = [];
        var mat = function(color) { return new THREE.MeshLambertMaterial({ color: color }); };

        // Floor
        var floor = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 40), mat(0x808080));
        floor.position.set(0, -0.5, 0);
        scene.add(floor);

        // Ceiling
        var ceiling = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 40), mat(0x999999));
        ceiling.position.set(0, 6, 0);
        scene.add(ceiling);

        var wallH = 6, wallT = 0.5;

        // Perimeter
        var perimeter = [
          { s: [41, wallH, wallT], p: [0, wallH/2, -20.25] },
          { s: [41, wallH, wallT], p: [0, wallH/2, 20.25] },
          { s: [wallT, wallH, 40], p: [-20.25, wallH/2, 0] },
          { s: [wallT, wallH, 40], p: [20.25, wallH/2, 0] },
        ];
        perimeter.forEach(function(w) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(w.s[0], w.s[1], w.s[2]), mat(0xdcdcdc));
          m.position.set(w.p[0], w.p[1], w.p[2]);
          scene.add(m);
          walls.push(m);
        });

        // Interior walls
        var interior = [
          { s: [12, wallH, wallT], p: [-8, wallH/2, -8], c: 0xdcdcdc },
          { s: [12, wallH, wallT], p: [8, wallH/2, -8], c: 0xdcdcdc },
          { s: [8, wallH, wallT], p: [-12, wallH/2, 0], c: 0xdcdcdc },
          { s: [8, wallH, wallT], p: [12, wallH/2, 0], c: 0xdcdcdc },
          { s: [12, wallH, wallT], p: [-8, wallH/2, 8], c: 0xdcdcdc },
          { s: [12, wallH, wallT], p: [8, wallH/2, 8], c: 0xdcdcdc },
          { s: [wallT, wallH, 12], p: [-8, wallH/2, -12], c: 0xe0e0e0 },
          { s: [wallT, wallH, 12], p: [8, wallH/2, -12], c: 0xe0e0e0 },
          { s: [wallT, wallH, 12], p: [-8, wallH/2, 12], c: 0xe0e0e0 },
          { s: [wallT, wallH, 12], p: [8, wallH/2, 12], c: 0xe0e0e0 },
          { s: [6, wallH, wallT], p: [-3, wallH/2, -3], c: 0xd0d0d0 },
          { s: [wallT, wallH, 6], p: [3, wallH/2, 0], c: 0xd0d0d0 },
        ];
        interior.forEach(function(w) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(w.s[0], w.s[1], w.s[2]), mat(w.c));
          m.position.set(w.p[0], w.p[1], w.p[2]);
          scene.add(m);
          walls.push(m);
        });

        // Blue accent crates
        var crates = [
          { s: [2,2,2], p: [-5,1,-12], c: 0x1565c0 },
          { s: [2,2,2], p: [5,1,12], c: 0x1565c0 },
          { s: [2,1.5,2], p: [14,0.75,-14], c: 0x1976d2 },
          { s: [2,1.5,2], p: [-14,0.75,14], c: 0x1976d2 },
          { s: [1.5,2,1.5], p: [0,1,5], c: 0x1565c0 },
        ];
        crates.forEach(function(c) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(c.s[0], c.s[1], c.s[2]), mat(c.c));
          m.position.set(c.p[0], c.p[1], c.p[2]);
          scene.add(m);
          walls.push(m);
        });

        // Interior lights
        var light1 = new THREE.PointLight(0xffffff, 0.6, 25);
        light1.position.set(-10, 5.5, -10);
        scene.add(light1);
        var light2 = new THREE.PointLight(0xffffff, 0.6, 25);
        light2.position.set(10, 5.5, 10);
        scene.add(light2);

        return walls;
      },
    },

    // ── Map 3: "Warehouse" — mixed ──
    {
      name: 'Warehouse',
      size: { x: 50, z: 40 },
      skyColor: 0x455a64,
      fogColor: 0x404040,
      fogDensity: 0.018,
      playerSpawn: { x: -20, z: -15 },
      botSpawns: [
        { x: 10, z: 10 },
        { x: 15, z: -5 },
        { x: -5, z: 10 },
        { x: 8, z: -5 },
        { x: 0, z: 5 },
      ],
      waypoints: [
        { x: 0, z: 0 }, { x: 15, z: 12 }, { x: -15, z: 12 },
        { x: 15, z: -12 }, { x: -15, z: -12 }, { x: 0, z: 15 },
        { x: 0, z: -15 }, { x: 20, z: 0 }, { x: -20, z: 0 },
        { x: 8, z: 8 }, { x: -8, z: -8 },
      ],
      build: function(scene) {
        var walls = [];
        var mat = function(color) { return new THREE.MeshLambertMaterial({ color: color }); };

        // Floor
        var floor = new THREE.Mesh(new THREE.BoxGeometry(50, 1, 40), mat(0x505050));
        floor.position.set(0, -0.5, 0);
        scene.add(floor);

        var wallH = 7, wallT = 1;

        // Perimeter
        var perimeter = [
          { s: [52, wallH, wallT], p: [0, wallH/2, -20.5] },
          { s: [52, wallH, wallT], p: [0, wallH/2, 20.5] },
          { s: [wallT, wallH, 40], p: [-25.5, wallH/2, 0] },
          { s: [wallT, wallH, 40], p: [25.5, wallH/2, 0] },
        ];
        perimeter.forEach(function(w) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(w.s[0], w.s[1], w.s[2]), mat(0x616161));
          m.position.set(w.p[0], w.p[1], w.p[2]);
          scene.add(m);
          walls.push(m);
        });

        // Crates of varying heights
        var crates = [
          { s: [4,5,4], p: [0,2.5,0], c: 0xbf360c },
          { s: [3,2,3], p: [0,6,0], c: 0xe65100 },
          { s: [4,3,4], p: [10,1.5,8], c: 0xd84315 },
          { s: [4,3,4], p: [-10,1.5,-8], c: 0xbf360c },
          { s: [3,2,3], p: [15,1,0], c: 0xe65100 },
          { s: [3,2,3], p: [-15,1,3], c: 0xd84315 },
          { s: [3,2,3], p: [5,1,-10], c: 0xbf360c },
          { s: [3,2,3], p: [-5,1,10], c: 0xe65100 },
          { s: [2,1.5,2], p: [8,0.75,-5], c: 0xff6d00 },
          { s: [2,1.5,2], p: [-8,0.75,5], c: 0xff6d00 },
          { s: [2,1.5,2], p: [18,0.75,-10], c: 0xd84315 },
          { s: [2,1.5,2], p: [-18,0.75,10], c: 0xd84315 },
          { s: [1,4,10], p: [8,2,5], c: 0x757575 },
          { s: [10,4,1], p: [-5,2,-5], c: 0x757575 },
          { s: [1,4,8], p: [-12,2,8], c: 0x757575 },
          { s: [8,4,1], p: [12,2,-10], c: 0x757575 },
        ];
        crates.forEach(function(c) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(c.s[0], c.s[1], c.s[2]), mat(c.c));
          m.position.set(c.p[0], c.p[1], c.p[2]);
          scene.add(m);
          walls.push(m);
        });

        return walls;
      },
    },
  ];

  // Public API
  GAME.getMapCount = function() { return maps.length; };
  GAME.getMapDef = function(index) { return maps[index % maps.length]; };

  GAME.buildMap = function(scene, mapIndex) {
    var def = GAME.getMapDef(mapIndex);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Sky / fog
    scene.background = new THREE.Color(def.skyColor);
    scene.fog = new THREE.FogExp2(def.fogColor, def.fogDensity);

    var walls = def.build(scene);

    return {
      walls: walls,
      playerSpawn: def.playerSpawn,
      botSpawns: def.botSpawns,
      waypoints: def.waypoints,
      name: def.name,
    };
  };
})();
