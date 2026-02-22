// js/maps/warehouse.js — Map 3: "Warehouse" — Multi-Floor Industrial
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadow = H.shadow, shadowRecv = H.shadowRecv;
  var buildStairs = H.buildStairs;
  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
  var concreteMat = H.concreteMat, warehouseFloorMat = H.warehouseFloorMat;
  var metalMat = H.metalMat, darkMetalMat = H.darkMetalMat;
  var woodMat = H.woodMat, crateMat = H.crateMat;
  var emissiveMat = H.emissiveMat, glassMat = H.glassMat;
  var floorMat = H.floorMat, plasterMat = H.plasterMat, fabricMat = H.fabricMat;

  GAME._maps.push({
    name: 'Warehouse',
    size: { x: 60, z: 50 },
    skyColor: 0x87ceeb,
    fogColor: 0xc0d8e8,
    fogDensity: 0.002,
    playerSpawn: { x: -22, z: -18 },
    botSpawns: [
      { x: 10, z: 5 },
      { x: -10, z: 10 },
      { x: 15, z: -10 },
    ],
    waypoints: [
      { x: 0, z: 0 }, { x: 15, z: 12 }, { x: -15, z: 12 },
      { x: 15, z: -12 }, { x: -15, z: -12 }, { x: 0, z: 18 },
      { x: 0, z: -18 }, { x: 22, z: 0 }, { x: -22, z: 0 },
      { x: 8, z: 8 }, { x: -8, z: -8 }, { x: -20, z: 15 },
      { x: 20, z: -15 }, { x: 5, z: -5 },
    ],
    build: function(scene) {
      var walls = [];
      var darkConcrete = warehouseFloorMat(0x606060);
      var conc = concreteMat(0x707070);
      var corrMetal = metalMat(0x6a6a6a);
      var rustOrange = crateMat(0xbf360c, 0x330000);
      var rustRed = crateMat(0xd84315);
      var shippingBlue = crateMat(0x1565c0, 0x001133);
      var shippingGreen = crateMat(0x2e7d32, 0x003300);
      var metalFloor = metalMat(0x6a6a6a);
      var metalRail = metalMat(0x555555);
      var metalDark = darkMetalMat(0x444444);
      var palletMat = woodMat(0x8b7355);
      var wood = woodMat(0x6b4e0a);

      var F2 = 4;   // second floor height
      var F3 = 8;   // third floor height
      var wallH = 14;

      // ── Ground Floor ──
      var floor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(60, 1, 50), darkConcrete));
      floor.position.set(0, -0.5, 0);
      scene.add(floor);
      // Floor markings (loading zone lines)
      D(scene, 8, 0.02, 0.15, emissiveMat(0xcccc00, 0xffff00, 0.3), -20, 0.01, 0);
      D(scene, 0.15, 0.02, 12, emissiveMat(0xcccc00, 0xffff00, 0.3), -24, 0.01, 0);
      D(scene, 0.15, 0.02, 12, emissiveMat(0xcccc00, 0xffff00, 0.3), -16, 0.01, 0);

      // Perimeter walls (tall for 3 floors)
      [
        [62, wallH, 1, 0, wallH/2, -25.5],
        [62, wallH, 1, 0, wallH/2, 25.5],
        [1, wallH, 50, -30.5, wallH/2, 0],
        [1, wallH, 50, 30.5, wallH/2, 0],
      ].forEach(function(w) { B(scene, walls, w[0], w[1], w[2], corrMetal, w[3], w[4], w[5]); });

      // ── Shipping Containers ──
      // Large blue container
      B(scene, walls, 12, 3.5, 3, shippingBlue, -8, 1.75, -8);
      D(scene, 0.1, 3.3, 2.8, metalDark, -14, 1.75, -8); // door end
      // Medium green container
      B(scene, walls, 8, 3, 3, shippingGreen, 10, 1.5, 12);
      D(scene, 0.1, 2.8, 2.8, metalDark, 14, 1.5, 12);
      // Red container
      B(scene, walls, 10, 3, 3, rustRed, -15, 1.5, 10);

      // ── Pallets with crate stacks ──
      // Pallet 1
      D(scene, 1.5, 0.15, 1.5, palletMat, 0, 0.075, 0);
      B(scene, walls, 1.2, 1.2, 1.2, rustOrange, 0, 0.75, 0);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat(0xe65100, 0x331100), 0, 1.95, 0);
      // Pallet 2
      D(scene, 1.5, 0.15, 1.5, palletMat, 5, 0.075, -15);
      B(scene, walls, 1.2, 1.2, 1.2, rustOrange, 5, 0.75, -15);
      // Pallet 3
      D(scene, 1.5, 0.15, 1.5, palletMat, -5, 0.075, 18);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat(0xe65100), -5, 0.75, 18);
      B(scene, walls, 1.2, 1.2, 1.2, rustOrange, -5, 1.95, 18);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat(0xff6d00,0x331100), -5, 3.15, 18);

      // ── Forklift ──
      B(scene, walls, 1.5, 1.0, 2.5, metalMat(0xf9a825), -20, 0.5, -15); // body
      D(scene, 1.0, 2.0, 0.15, metalMat(0x333333), -20, 1.5, -16.2);     // mast
      D(scene, 1.2, 0.1, 1.5, metalMat(0x555555), -20, 0.6, -13.5);      // forks
      D(scene, 0.5, 0.5, 0.15, metalMat(0x222222), -20.6, 0.3, -15.8);   // wheel
      D(scene, 0.5, 0.5, 0.15, metalMat(0x222222), -19.4, 0.3, -15.8);   // wheel

      // ── Industrial shelving rack (west wall) ──
      var shelfMat = metalMat(0x5c5c5c);
      // Uprights
      D(scene, 0.1, 4, 0.1, shelfMat, -27, 2, -10);
      D(scene, 0.1, 4, 0.1, shelfMat, -27, 2, -6);
      D(scene, 0.1, 4, 0.1, shelfMat, -27, 2, -2);
      // Shelves
      B(scene, walls, 0.6, 0.08, 8.5, shelfMat, -27, 1.5, -6);
      B(scene, walls, 0.6, 0.08, 8.5, shelfMat, -27, 3.0, -6);
      // Items on shelves
      D(scene, 0.5, 0.4, 0.5, rustOrange, -27, 1.74, -9);
      D(scene, 0.5, 0.5, 0.5, crateMat(0xe65100), -27, 1.79, -7);
      D(scene, 0.5, 0.3, 0.5, shippingBlue, -27, 1.69, -4);

      // ── Oil drums ──
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metalMat(0x8b4513), 22, 0.6, -18);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metalMat(0x666666), 23.5, 0.6, -18);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metalMat(0x8b4513), 22.8, 0.6, -16.5);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metalMat(0x666666), -25, 0.6, 20);

      // ── Low concrete barriers ──
      B(scene, walls, 6, 1, 0.5, conc, 0, 0.5, -20);
      B(scene, walls, 0.5, 1, 6, conc, 20, 0.5, 0);

      // ════════════════════════════════════════════
      //  SECOND FLOOR (y=4) — Metal Catwalks
      // ════════════════════════════════════════════

      // Platform: east side (x=16 to 28, z=-20 to 24)
      B(scene, walls, 12, 0.3, 44, metalFloor, 22, F2 - 0.15, 2);
      // Platform: north bridge (x=-20 to 16, z=20 to 24)
      B(scene, walls, 36, 0.3, 4, metalFloor, -2, F2 - 0.15, 22);

      // Support beams under east platform
      D(scene, 0.2, F2, 0.2, metalDark, 17, F2/2, -15);
      D(scene, 0.2, F2, 0.2, metalDark, 17, F2/2, 0);
      D(scene, 0.2, F2, 0.2, metalDark, 17, F2/2, 15);
      D(scene, 0.2, F2, 0.2, metalDark, 27, F2/2, -15);
      D(scene, 0.2, F2, 0.2, metalDark, 27, F2/2, 0);
      D(scene, 0.2, F2, 0.2, metalDark, 27, F2/2, 15);
      // Support beams under north bridge
      D(scene, 0.2, F2, 0.2, metalDark, -15, F2/2, 21);
      D(scene, 0.2, F2, 0.2, metalDark, -5, F2/2, 21);
      D(scene, 0.2, F2, 0.2, metalDark, 5, F2/2, 21);

      // Inner railings — east platform (west edge, at x=16)
      B(scene, walls, 0.06, 1.2, 44, metalRail, 16, F2 + 0.6, 2);
      // Top rail
      D(scene, 0.08, 0.08, 44, metalRail, 16, F2 + 1.2, 2);
      // Mid rail
      D(scene, 0.04, 0.04, 44, metalRail, 16, F2 + 0.6, 2);
      // Inner railings — north bridge (south edge, at z=20)
      B(scene, walls, 36, 1.2, 0.06, metalRail, -2, F2 + 0.6, 20);
      D(scene, 36, 0.08, 0.08, metalRail, -2, F2 + 1.2, 20);

      // Crates on 2nd floor
      B(scene, walls, 2, 1.5, 2, rustOrange, 22, F2 + 0.75, -10);
      B(scene, walls, 1.5, 1, 1.5, crateMat(0xe65100), 25, F2 + 0.5, 5);
      B(scene, walls, 2, 1.5, 2, shippingBlue, -10, F2 + 0.75, 22);

      // ── Stairs: Ground → 2nd Floor ──
      // Along east wall, going in +z direction from z=-20 to z=-10
      buildStairs(scene, walls, 22, -20, 0, F2, 4, 'z+');

      // ════════════════════════════════════════════
      //  THIRD FLOOR (y=8) — Observation Room
      // ════════════════════════════════════════════

      // Room floor (x=18 to 28, z=14 to 24, 10x10)
      B(scene, walls, 10, 0.3, 10, metalFloor, 23, F3 - 0.15, 19);

      // Room walls (partial, with window gaps)
      // West wall (with gap for entrance from catwalk)
      B(scene, walls, 0.3, 3, 4, corrMetal, 18.15, F3 + 1.5, 16);  // lower section
      B(scene, walls, 0.3, 3, 4, corrMetal, 18.15, F3 + 1.5, 22);  // upper section
      // South wall (with window)
      B(scene, walls, 4, 3, 0.3, corrMetal, 20, F3 + 1.5, 14.15);
      B(scene, walls, 4, 3, 0.3, corrMetal, 26, F3 + 1.5, 14.15);
      // Glass window in south wall gap
      D(scene, 2, 2, 0.08, glassMat(0x88ccff), 23, F3 + 1.5, 14.15);
      // Roof
      D(scene, 10.5, 0.2, 10.5, corrMetal, 23, F3 + 3.1, 19);

      // Control desk inside
      B(scene, walls, 3, 0.8, 1.2, woodMat(0x5d4037), 23, F3 + 0.4, 17);
      D(scene, 0.5, 0.35, 0.05, emissiveMat(0x222222, 0x44ff44, 0.6), 23, F3 + 0.97, 16.5);
      D(scene, 0.5, 0.35, 0.05, emissiveMat(0x222222, 0x4488ff, 0.6), 24, F3 + 0.97, 16.5);

      // Support beams for 3rd floor
      D(scene, 0.2, F3, 0.2, metalDark, 18.5, F3/2, 14.5);
      D(scene, 0.2, F3, 0.2, metalDark, 27.5, F3/2, 14.5);
      D(scene, 0.2, F3, 0.2, metalDark, 18.5, F3/2, 23.5);
      D(scene, 0.2, F3, 0.2, metalDark, 27.5, F3/2, 23.5);

      // ── Stairs: 2nd Floor → 3rd Floor ──
      // On the east platform, going in +z direction from z=4 to z=14
      buildStairs(scene, walls, 25, 4, F2, F3, 3, 'z+');

      // ── Wall-mounted pipes ──
      Cyl(scene, 0.06, 0.06, 50, 8, metalMat(0x777777), -29, 3, 0);
      Cyl(scene, 0.06, 0.06, 50, 8, metalMat(0x555555), -29, 6, 0);
      Cyl(scene, 0.06, 0.06, 60, 8, metalMat(0x666666), 0, wallH - 1, -24.5);
      // Pipe rotated horizontally (along x)
      var hpipe = Cyl(scene, 0.06, 0.06, 60, 8, metalMat(0x777777), 0, wallH - 1, -24.5);
      hpipe.rotation.z = Math.PI / 2;

      // ── Industrial hanging lights (bright daylight) ──
      addHangingLight(scene, -15, wallH - 1, -10, 0xf0f4ff);
      addHangingLight(scene, 0, wallH - 1, -10, 0xf0f4ff);
      addHangingLight(scene, 0, wallH - 1, 10, 0xf0f4ff);
      addHangingLight(scene, -15, wallH - 1, 10, 0xf0f4ff);
      addHangingLight(scene, 15, wallH - 1, 0, 0xf0f4ff);
      addHangingLight(scene, 22, F2 + 2.5, -15, 0xf0f4ff);
      addHangingLight(scene, 22, F2 + 2.5, 5, 0xf0f4ff);
      // 3rd floor room light
      addPointLight(scene, 0xeef2ff, 1.0, 14, 23, F3 + 2.5, 19);

      // Ground-level fill lights — bright daylight bounce
      addPointLight(scene, 0xe8f0ff, 1.2, 32, -10, 4, 0);
      addPointLight(scene, 0xe8f0ff, 1.2, 32, 10, 4, -10);
      addPointLight(scene, 0xe8f0ff, 1.0, 28, -20, 4, 10);
      addPointLight(scene, 0xe8f0ff, 1.0, 28, 5, 4, 15);
      addPointLight(scene, 0xe8f0ff, 0.9, 25, -10, 4, -18);
      addPointLight(scene, 0xe8f0ff, 0.9, 25, 15, 4, 15);
      addPointLight(scene, 0xe8f0ff, 0.8, 25, -22, 4, -10);
      addPointLight(scene, 0xe8f0ff, 0.8, 25, 0, 4, 0);
      // Under east platform (2nd floor)
      addPointLight(scene, 0xe8f0ff, 0.8, 22, 22, 2, 0);
      addPointLight(scene, 0xe8f0ff, 0.8, 22, 22, 2, -15);
      // Stairwell lights — illuminate stairs for visibility
      addPointLight(scene, 0xeef2ff, 0.9, 15, 22, 2, -15);
      addPointLight(scene, 0xeef2ff, 0.7, 12, 25, F2 + 2, 9);
      // 2nd floor platform lighting
      addPointLight(scene, 0xe8f0ff, 0.9, 20, 22, F2 + 2, 10);
      addPointLight(scene, 0xe8f0ff, 0.8, 20, 0, F2 + 2, -22);
      addPointLight(scene, 0xe8f0ff, 0.7, 18, -10, F2 + 2, 22);

      // ── Environmental Details ──

      // Oil stains on ground floor
      D(scene, 2.5, 0.005, 1.8, floorMat(0x2a2a2a), -20, 0.003, -12);
      D(scene, 1.5, 0.005, 2.0, floorMat(0x333333), 5, 0.003, 5);
      D(scene, 1.0, 0.005, 1.2, floorMat(0x2e2e2e), -8, 0.003, 15);

      // Safety signs on walls (yellow warning plates)
      D(scene, 0.8, 0.6, 0.05, emissiveMat(0xffeb3b, 0xffff00, 0.2), -30.2, 3.5, -15);
      D(scene, 0.8, 0.6, 0.05, emissiveMat(0xffeb3b, 0xffff00, 0.2), 30.2, 3.5, 10);
      // Danger stripe on sign
      D(scene, 0.8, 0.08, 0.06, fabricMat(0x222222), -30.2, 3.2, -15);
      D(scene, 0.8, 0.08, 0.06, fabricMat(0x222222), 30.2, 3.2, 10);

      // Fire exit signs (green, emissive)
      D(scene, 0.6, 0.3, 0.05, emissiveMat(0x2e7d32, 0x00ff44, 0.8), -30.2, 5.5, 0);
      D(scene, 0.6, 0.3, 0.05, emissiveMat(0x2e7d32, 0x00ff44, 0.8), 0, wallH - 2, -25.2);

      // Chains hanging from ceiling (near crane area)
      D(scene, 0.03, 3.0, 0.03, metalMat(0x777777), -10, wallH - 2.5, -5);
      D(scene, 0.03, 2.5, 0.03, metalMat(0x777777), -10, wallH - 2.75, -3);
      // Chain hook
      Cyl(scene, 0.06, 0.04, 0.1, 6, metalMat(0x999999), -10, wallH - 4.05, -5);

      // Caution tape on floor (near loading zone)
      D(scene, 8, 0.01, 0.12, emissiveMat(0xffeb3b, 0xffff00, 0.3), -20, 0.007, -6);
      D(scene, 8, 0.01, 0.12, emissiveMat(0xffeb3b, 0xffff00, 0.3), -20, 0.007, 6);

      // Tool rack on west wall
      D(scene, 2.0, 0.08, 0.15, metalMat(0x666666), -29.5, 2.5, 8); // rack bar
      D(scene, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 7.3); // hook
      D(scene, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 8.0); // hook
      D(scene, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 8.7); // hook
      // Hanging wrench
      D(scene, 0.04, 0.25, 0.02, metalMat(0x888888), -29.5, 2.05, 7.3);
      // Hanging hammer
      D(scene, 0.03, 0.3, 0.03, woodMat(0x8b6914), -29.5, 2.0, 8.0);
      D(scene, 0.08, 0.06, 0.03, metalMat(0x555555), -29.5, 1.85, 8.0);

      // Ventilation ducts on ceiling
      D(scene, 20, 0.8, 0.8, metalMat(0x606060), -5, wallH - 0.8, 0);
      D(scene, 0.8, 0.8, 25, metalMat(0x606060), 5, wallH - 0.8, 5);
      // Duct joints
      D(scene, 0.9, 0.9, 0.1, metalMat(0x555555), -5, wallH - 0.8, -10);
      D(scene, 0.9, 0.9, 0.1, metalMat(0x555555), -5, wallH - 0.8, 10);
      D(scene, 0.1, 0.9, 0.9, metalMat(0x555555), 5, wallH - 0.8, -7);
      D(scene, 0.1, 0.9, 0.9, metalMat(0x555555), 5, wallH - 0.8, 17);

      // Scattered bolts / debris on ground
      [[12,0.02,8],[-3,0.01,10],[18,0.015,-5],[-22,0.02,5],[8,0.01,-18]].forEach(function(d) {
        D(scene, 0.06, 0.03, 0.06, metalMat(0x777777), d[0], d[1], d[2]);
      });

      // Broken pallet on ground
      D(scene, 1.5, 0.05, 0.15, palletMat, 15, 0.025, -20);
      D(scene, 1.2, 0.05, 0.15, palletMat, 15.3, 0.025, -19.5);
      D(scene, 0.8, 0.05, 0.15, palletMat, 14.8, 0.025, -19);

      // Electrical junction box on wall
      D(scene, 0.5, 0.6, 0.12, metalMat(0x555555), 30.1, 4, -10);
      D(scene, 0.04, 1.5, 0.04, metalMat(0x333333), 30.1, 5.5, -10); // conduit up

      // Cone (traffic/safety cone near loading area)
      Cyl(scene, 0.02, 0.18, 0.5, 8, fabricMat(0xff6600), -24, 0.25, -8);
      Cyl(scene, 0.2, 0.2, 0.03, 8, metalMat(0x333333), -24, 0.015, -8); // base
      Cyl(scene, 0.02, 0.18, 0.5, 8, fabricMat(0xff6600), -16, 0.25, -8);
      Cyl(scene, 0.2, 0.2, 0.03, 8, metalMat(0x333333), -16, 0.015, -8); // base

      // Clipboard on crate stack
      D(scene, 0.2, 0.3, 0.02, woodMat(0xb08850), 0.4, 2.6, 0.6);
      D(scene, 0.16, 0.22, 0.01, plasterMat(0xf5f5f0), 0.4, 2.62, 0.59); // paper

      // Number stencils on containers (white markings)
      D(scene, 0.6, 0.3, 0.02, plasterMat(0xdddddd), -8, 2.5, -6.48);
      D(scene, 0.6, 0.3, 0.02, plasterMat(0xdddddd), 10, 2.2, 10.48);

      // Rope coil on ground
      Cyl(scene, 0.3, 0.3, 0.08, 12, woodMat(0xb8860b), 25, 0.04, 10);
      Cyl(scene, 0.15, 0.15, 0.1, 12, floorMat(0x404040), 25, 0.05, 10); // center hole

      return walls;
    },
  });
})();
