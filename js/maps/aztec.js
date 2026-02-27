// js/maps/aztec.js — Map 6: "Aztec" — Jungle Temple Ruins
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadowRecv = H.shadowRecv;
  var buildStairs = H.buildStairs;
  var addPointLight = H.addPointLight;
  var concreteMat = H.concreteMat, woodMat = H.woodMat;
  var glassMat = H.glassMat, emissiveMat = H.emissiveMat;
  var jungleFloorMat = H.jungleFloorMat;

  GAME._maps.push({
    name: 'Aztec',
    size: { x: 70, z: 60 },
    skyColor: 0xa8c8e8,
    fogColor: 0x8aaa8a,
    fogDensity: 0.005,
    playerSpawn: { x: -20, z: 20 },
    botSpawns: [
      { x: 15, z: -25 },
      { x: 20, z: -20 },
      { x: 10, z: -22 },
    ],
    ctSpawns: [
      { x: -20, z: 20 }, { x: -18, z: 22 }, { x: -22, z: 18 },
      { x: -16, z: 20 }, { x: -20, z: 16 }
    ],
    tSpawns: [
      { x: 18, z: -22 }, { x: 15, z: -24 }, { x: 20, z: -20 },
      { x: 12, z: -22 }, { x: 18, z: -18 }
    ],
    bombsites: [
      { name: 'A', x: 10, z: -10, radius: 4 },
      { name: 'B', x: -10, z: 5, radius: 4 }
    ],
    waypoints: [
      { x: 0, z: 0 }, { x: 15, z: 0 }, { x: -15, z: 0 },
      { x: 15, z: -15 }, { x: -10, z: -15 }, { x: 0, z: -25 },
      { x: 20, z: -10 }, { x: -20, z: 10 }, { x: -10, z: 20 },
      { x: 15, z: 15 }, { x: 0, z: 20 }, { x: -20, z: -5 },
      { x: 10, z: 10 }, { x: -5, z: -10 },
    ],
    build: function(scene) {
      var walls = [];

      // ── Materials ──
      var mossStone = concreteMat(0x8a9a72);
      var darkStone = concreteMat(0x6a7a58);
      var sandstone = concreteMat(0xd0bea0);
      var sandstoneDark = concreteMat(0xb8a882);
      var jungleGreen = concreteMat(0x3d7a2e);
      var moss = concreteMat(0x5a8a4a);
      var darkWood = woodMat(0x7a5a2a);
      var ropeMat = woodMat(0xd8b870);
      var earthFloor = jungleFloorMat(0x7a6a3a);
      var stonePath = jungleFloorMat(0x9a9a8a);
      var waterMat = glassMat(0x1a6a5a);

      // ═══════════════════════════════════════════════════
      //  FLOOR
      // ═══════════════════════════════════════════════════
      var floor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(70, 1, 60), earthFloor));
      floor.position.set(0, -0.5, 0);
      scene.add(floor);
      D(scene, 3, 0.02, 30, stonePath, -10, 0.01, -5);
      D(scene, 20, 0.02, 3, stonePath, 5, 0.01, 0);
      D(scene, 3, 0.02, 20, stonePath, 15, 0.01, 10);

      // ═══════════════════════════════════════════════════
      //  PERIMETER WALLS
      // ═══════════════════════════════════════════════════
      var wH = 8, wT = 1.2;
      B(scene, walls, 72, wH, wT, mossStone, 0, wH/2, -30.6);
      B(scene, walls, 72, wH, wT, mossStone, 0, wH/2, 30.6);
      B(scene, walls, wT, wH, 60, mossStone, -35.6, wH/2, 0);
      B(scene, walls, wT, wH, 60, mossStone, 35.6, wH/2, 0);
      D(scene, 72, 0.8, 0.1, moss, 0, 0.4, -30);
      D(scene, 72, 0.8, 0.1, moss, 0, 0.4, 30);
      D(scene, 0.1, 0.8, 60, moss, -35, 0.4, 0);
      D(scene, 0.1, 0.8, 60, moss, 35, 0.4, 0);
      D(scene, 0.15, 5, 0.1, jungleGreen, -35, 4, -15);
      D(scene, 0.15, 6, 0.1, jungleGreen, -35, 4, 10);
      D(scene, 0.15, 4, 0.1, jungleGreen, 35, 4.5, -8);
      D(scene, 0.15, 5.5, 0.1, jungleGreen, 35, 4, 18);
      D(scene, 0.1, 4.5, 0.15, jungleGreen, 10, 4.5, -30);
      D(scene, 0.1, 5, 0.15, jungleGreen, -20, 4, -30);

      // ═══════════════════════════════════════════════════
      //  RIVER (East-West, center of map)
      // ═══════════════════════════════════════════════════
      var riverFloor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 8), concreteMat(0x5a6a5a)));
      riverFloor.position.set(5, -4, 2);
      scene.add(riverFloor);
      var water = new THREE.Mesh(new THREE.BoxGeometry(40, 0.15, 8), waterMat);
      water.position.set(5, -2, 2);
      scene.add(water);
      B(scene, walls, 40, 4, 1, darkStone, 5, -1.5, -2.5);
      B(scene, walls, 40, 4, 1, darkStone, 5, -1.5, 6.5);
      B(scene, walls, 1, 4, 10, darkStone, -15.5, -1.5, 2);
      B(scene, walls, 1, 4, 10, darkStone, 25.5, -1.5, 2);
      D(scene, 1.5, 1.8, 1.5, mossStone, 0, -2.5, 2);
      D(scene, 1.2, 1.5, 1.0, mossStone, 8, -2.6, 3);
      D(scene, 1.0, 1.2, 1.3, darkStone, 18, -2.7, 1);
      D(scene, 0.8, 1.0, 0.9, mossStone, -8, -2.8, 3.5);
      D(scene, 2, 3.5, 0.3, emissiveMat(0x2a6a6a, 0x1a8a8a, 0.8), 24, -1.5, 2);
      D(scene, 1.5, 3, 0.2, emissiveMat(0x3a7a7a, 0x2a9a9a, 0.6), 24.5, -1.8, 2);

      // ═══════════════════════════════════════════════════
      //  ROPE BRIDGE (over river, east side)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 3, 0.3, 10, darkWood, 15, -0.15, 2);
      D(scene, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, -1);
      D(scene, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, 1);
      D(scene, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, 3);
      D(scene, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, 5);
      D(scene, 0.08, 1.0, 10, ropeMat, 13.3, 0.5, 2);
      D(scene, 0.08, 1.0, 10, ropeMat, 16.7, 0.5, 2);
      CylW(scene, walls, 0.15, 0.18, 1.8, 6, darkWood, 13.3, 0.9, -3);
      CylW(scene, walls, 0.15, 0.18, 1.8, 6, darkWood, 16.7, 0.9, -3);
      CylW(scene, walls, 0.15, 0.18, 1.8, 6, darkWood, 13.3, 0.9, 7);
      CylW(scene, walls, 0.15, 0.18, 1.8, 6, darkWood, 16.7, 0.9, 7);

      // ═══════════════════════════════════════════════════
      //  DOUBLE DOORS CORRIDOR (west side, choke point)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 1, 5, 14, darkStone, -13, 2.5, -8);
      B(scene, walls, 1, 5, 14, darkStone, -7, 2.5, -8);
      B(scene, walls, 1.5, 5, 1, sandstone, -13, 2.5, -14);
      B(scene, walls, 1.5, 5, 1, sandstone, -7, 2.5, -14);
      D(scene, 7.5, 1, 1.2, sandstoneDark, -10, 5, -14);
      B(scene, walls, 1.5, 5, 1, sandstone, -13, 2.5, -2);
      B(scene, walls, 1.5, 5, 1, sandstone, -7, 2.5, -2);
      D(scene, 7.5, 1, 1.2, sandstoneDark, -10, 5, -2);
      B(scene, walls, 1.2, 1, 1.2, darkWood, -11, 0.5, -8);
      B(scene, walls, 1, 0.8, 1, darkWood, -8.5, 0.4, -6);

      // ═══════════════════════════════════════════════════
      //  BOMBSITE A — Stepped Temple (south-east)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 14, 1.5, 14, sandstone, 15, 0.75, 18);
      B(scene, walls, 10, 1.5, 10, sandstoneDark, 15, 2.25, 18);
      B(scene, walls, 6, 1.5, 6, sandstone, 15, 3.75, 18);
      CylW(scene, walls, 0.4, 0.5, 5, 8, darkStone, 9, 2.5, 12);
      CylW(scene, walls, 0.4, 0.5, 5, 8, darkStone, 21, 2.5, 12);
      CylW(scene, walls, 0.4, 0.5, 5, 8, darkStone, 9, 2.5, 24);
      CylW(scene, walls, 0.4, 0.5, 5, 8, darkStone, 21, 2.5, 24);
      D(scene, 1, 1, 0.3, mossStone, 15, 2.5, 12.5);
      D(scene, 0.4, 0.4, 0.2, sandstone, 14, 2.8, 12.5);
      D(scene, 0.4, 0.4, 0.2, sandstone, 16, 2.8, 12.5);
      D(scene, 0.6, 0.3, 0.15, darkStone, 15, 2.1, 12.5);
      B(scene, walls, 1.5, 1.2, 1.5, mossStone, 11, 2.1, 15);
      B(scene, walls, 1.2, 1.0, 1.2, darkStone, 19, 1.9, 21);
      buildStairs(scene, walls, 15, 11, 0, 1.5, 3, 'z+');

      // ═══════════════════════════════════════════════════
      //  BOMBSITE B — Temple Ruins (west side)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 8, 4, 1, mossStone, -22, 2, 5);
      B(scene, walls, 1, 4, 6, mossStone, -26, 2, 8);
      B(scene, walls, 5, 2.5, 1, darkStone, -20, 1.25, 11);
      B(scene, walls, 3, 1.5, 1, mossStone, -25, 0.75, 11);
      B(scene, walls, 3, 1.2, 2, sandstone, -22, 0.6, 8);
      D(scene, 2.5, 0.2, 1.5, sandstoneDark, -22, 1.3, 8);
      D(scene, 1.5, 0.6, 1, darkStone, -18, 0.3, 7);
      D(scene, 0.8, 0.4, 1.2, mossStone, -24, 0.2, 12);
      D(scene, 1.0, 0.5, 0.8, darkStone, -19, 0.25, 10);
      D(scene, 0.6, 0.6, 5, sandstone, -17, 0.3, 9);

      // ═══════════════════════════════════════════════════
      //  OVERPASS / RAMP (elevated walkway)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 10, 0.5, 4, darkStone, -18, 3, -18);
      CylW(scene, walls, 0.4, 0.5, 3, 8, darkStone, -14, 1.5, -16.5);
      CylW(scene, walls, 0.4, 0.5, 3, 8, darkStone, -22, 1.5, -16.5);
      CylW(scene, walls, 0.4, 0.5, 3, 8, darkStone, -14, 1.5, -19.5);
      CylW(scene, walls, 0.4, 0.5, 3, 8, darkStone, -22, 1.5, -19.5);
      B(scene, walls, 10, 1, 0.3, mossStone, -18, 3.75, -16.2);
      B(scene, walls, 10, 1, 0.3, mossStone, -18, 3.75, -19.8);
      buildStairs(scene, walls, -12, -18, 0, 3, 2.5, 'x-');

      // ═══════════════════════════════════════════════════
      //  T SPAWN — Jungle Clearing (north)
      // ═══════════════════════════════════════════════════
      Cyl(scene, 0.4, 0.5, 6, 8, woodMat(0x5a4a2a), 20, 3, -25);
      Cyl(scene, 0.35, 0.45, 5, 8, woodMat(0x4a3a1a), 25, 2.5, -22);
      Cyl(scene, 0.5, 0.6, 7, 8, woodMat(0x5a4a2a), 8, 3.5, -28);
      D(scene, 4, 3, 4, jungleGreen, 20, 6.5, -25);
      D(scene, 3.5, 2.5, 3.5, jungleGreen, 25, 5.5, -22);
      D(scene, 5, 3.5, 5, jungleGreen, 8, 7.5, -28);
      D(scene, 2, 1, 2, jungleGreen, 12, 0.5, -20);
      D(scene, 1.5, 0.8, 1.5, moss, 18, 0.4, -18);
      D(scene, 2.5, 1.2, 2, jungleGreen, 5, 0.6, -22);
      D(scene, 1.0, 0.5, 1.0, moss, 22, 0.25, -27);
      D(scene, 0.8, 0.4, 0.8, moss, 14, 0.2, -26);

      // ═══════════════════════════════════════════════════
      //  CT SPAWN — Courtyard (south-west)
      // ═══════════════════════════════════════════════════
      D(scene, 12, 0.05, 10, stonePath, -20, 0.03, 20);
      B(scene, walls, 6, 1.5, 0.6, sandstone, -20, 0.75, 15.3);
      B(scene, walls, 0.6, 1.5, 10, sandstone, -14.7, 0.75, 20);
      B(scene, walls, 1.2, 1.2, 1.2, darkWood, -22, 0.6, 18);
      B(scene, walls, 1, 0.8, 1, darkWood, -22, 1.6, 18);
      B(scene, walls, 1.2, 1.2, 1.2, darkWood, -17, 0.6, 22);
      D(scene, 3, 0.6, 1, sandstone, -24, 0.3, 22);

      // ═══════════════════════════════════════════════════
      //  ADDITIONAL COVER ELEMENTS
      // ═══════════════════════════════════════════════════
      B(scene, walls, 1.5, 1.2, 1.5, mossStone, 0, 0.6, -10);
      B(scene, walls, 1.2, 1.0, 1.2, darkStone, -5, 0.5, 12);
      B(scene, walls, 1.5, 1.0, 1, sandstone, 25, 0.5, 10);
      B(scene, walls, 1.0, 0.8, 1.5, mossStone, 28, 0.4, -15);
      D(scene, 0.5, 0.5, 4, sandstone, -3, 0.25, -4);
      D(scene, 2, 1.5, 1.8, darkStone, 30, 0.75, 5);
      D(scene, 1.5, 1.0, 1.5, mossStone, -30, 0.5, -10);

      // ═══════════════════════════════════════════════════
      //  DECORATIVE DETAILS
      // ═══════════════════════════════════════════════════
      D(scene, 3, 0.1, 0.1, moss, -22, 3.5, 5);
      D(scene, 0.1, 0.1, 3, moss, -26, 3, 8);
      D(scene, 4, 0.1, 0.1, moss, 15, 1.2, 11.5);
      D(scene, 0.1, 3, 0.1, jungleGreen, -13, 3, -10);
      D(scene, 0.1, 2.5, 0.1, jungleGreen, -7, 3.5, -5);
      D(scene, 0.6, 0.3, 0.4, darkStone, -15, 0.15, 3);
      D(scene, 0.4, 0.2, 0.5, sandstone, -8, 0.1, 14);
      D(scene, 0.5, 0.25, 0.3, mossStone, 5, 0.12, -15);
      Cyl(scene, 0.3, 0.4, 5, 8, woodMat(0x5a4a2a), -32, 2.5, -20);
      D(scene, 3, 2.5, 3, jungleGreen, -32, 5.5, -20);
      Cyl(scene, 0.35, 0.45, 6, 8, woodMat(0x4a3a1a), -32, 3, 15);
      D(scene, 3.5, 3, 3.5, jungleGreen, -32, 6.5, 15);
      Cyl(scene, 0.4, 0.5, 5.5, 8, woodMat(0x5a4a2a), 32, 2.75, -25);
      D(scene, 4, 3, 4, jungleGreen, 32, 5.75, -25);
      Cyl(scene, 0.3, 0.4, 6, 8, woodMat(0x4a3a1a), 32, 3, 20);
      D(scene, 3, 2.5, 3, jungleGreen, 32, 6.5, 20);
      D(scene, 1.2, 0.5, 1.2, moss, -28, 0.25, 0);
      D(scene, 1.0, 0.4, 1.0, moss, 28, 0.2, -5);
      D(scene, 1.5, 0.6, 1.5, jungleGreen, -5, 0.3, 25);
      D(scene, 1.0, 0.4, 1.2, moss, 10, 0.2, -18);

      // ═══════════════════════════════════════════════════
      //  LIGHTING
      // ═══════════════════════════════════════════════════
      addPointLight(scene, 0xffaa55, 1.4, 22, 15, 5, 12);
      addPointLight(scene, 0xffaa55, 1.1, 20, 9, 3, 18);
      addPointLight(scene, 0xffaa55, 1.1, 20, 21, 3, 18);
      addPointLight(scene, 0xff9944, 1.0, 20, -22, 3, 8);
      addPointLight(scene, 0xffbb66, 0.9, 16, -10, 4, -8);
      addPointLight(scene, 0xffcc77, 0.9, 16, -18, 5, -18);
      addPointLight(scene, 0x55cccc, 0.7, 20, 15, 0, 2);
      addPointLight(scene, 0x55cccc, 0.6, 16, 0, 0, 2);
      addPointLight(scene, 0x44cccc, 0.9, 16, 24, -1, 2);
      addPointLight(scene, 0xffddaa, 1.0, 22, 15, 5, -22);
      addPointLight(scene, 0xffddaa, 1.1, 25, -20, 4, 20);
      addPointLight(scene, 0xffe0b0, 0.8, 30, 0, 6, 0);
      addPointLight(scene, 0xffe0b0, 0.6, 25, -10, 5, 10);
      addPointLight(scene, 0xffe0b0, 0.6, 25, 25, 5, -10);

      return walls;
    },
  });
})();
