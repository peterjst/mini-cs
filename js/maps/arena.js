// js/maps/arena.js — Arena map (Open-Air Combat Arena)
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadow = H.shadow, shadowRecv = H.shadowRecv;
  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
  var WR = H.WallRelief, FD = H.FloorDetail;
  var P = GAME._props;

  GAME._maps.push({
    name: 'Arena',
    lighting: {
      sunColor: 0xfff8f0,
      sunIntensity: 1.0,
      sunPos: [15, 25, 10],
      fillColor: 0xd0d0d0,
      fillIntensity: 0.35,
      ambientIntensity: 0.3,
      hemiSkyColor: 0xb0c4de,
      hemiGroundColor: 0x808080,
      hemiIntensity: 0.4,
      shadowFrustumPadding: 4
    },
    colorGrade: {
      tint: [1.0, 1.0, 1.0],
      shadows: [0.9, 0.9, 0.9],
      contrast: 1.05,
      saturation: 1.05,
      vignetteStrength: 0.25
    },
    size: { x: 40, z: 40 },
    skyColor: 0x87ceeb,
    fogColor: 0xa0c8e8,
    fogDensity: 0.005,
    playerSpawn: { x: -14, z: -14 },
    spawnZones: [
      { x: -14, z: -14, radius: 4, label: 'ct' },
      { x: 14, z: 14, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 4, label: 'mid' }
    ],
    botSpawns: [
      { x: 14, z: 14 },
      { x: 14, z: -14 },
      { x: -14, z: 14 },
      { x: 0, z: 16 },
      { x: 0, z: -16 },
      { x: 16, z: 0 },
      { x: -16, z: 0 },
      { x: 0, z: 0 }
    ],
    ctSpawns: [
      { x: -14, z: -14 }, { x: -12, z: -16 }, { x: -16, z: -12 },
      { x: -10, z: -14 }, { x: -14, z: -10 }
    ],
    tSpawns: [
      { x: 14, z: 14 }, { x: 12, z: 16 }, { x: 16, z: 12 },
      { x: 10, z: 14 }, { x: 14, z: 10 }
    ],
    bombsites: [
      { name: 'A', x: 14, z: 0, radius: 4 },
      { name: 'B', x: -14, z: 0, radius: 4 }
    ],
    waypoints: [
      // Perimeter loop
      { x: -16, z: -16 }, { x: 0, z: -16 }, { x: 16, z: -16 },
      { x: 16, z: 0 }, { x: 16, z: 16 },
      { x: 0, z: 16 }, { x: -16, z: 16 }, { x: -16, z: 0 },
      // Corridor midpoints
      { x: 0, z: -8 }, { x: 8, z: 0 }, { x: 0, z: 8 }, { x: -8, z: 0 },
      // Center
      { x: 0, z: 0 }, { x: -4, z: -4 }, { x: 4, z: 4 }, { x: -4, z: 4 }, { x: 4, z: -4 }
    ],
    build: function(scene) {
      var walls = [];
      var concreteMat = H.concreteMat(0xb0a898);
      var darkMetalMat = H.darkMetalMat(0x555555);
      var metalMat = H.metalMat(0x888888);
      var woodMat = H.woodMat(0xa07828);
      var crateMat = H.crateMat(0x8b6914);

      var WH = 5;
      var S = 20;

      // ── Floor ──
      var floorGeo = new THREE.BoxGeometry(40, 0.2, 40);
      var floorMesh = new THREE.Mesh(floorGeo, concreteMat);
      floorMesh.position.set(0, -0.1, 0);
      shadowRecv(floorMesh);
      scene.add(floorMesh);

      // ── Perimeter Walls ──
      B(scene, walls, 40, WH, 0.5, concreteMat, 0, WH/2, -S);
      B(scene, walls, 40, WH, 0.5, concreteMat, 0, WH/2, S);
      B(scene, walls, 0.5, WH, 40, concreteMat, S, WH/2, 0);
      B(scene, walls, 0.5, WH, 40, concreteMat, -S, WH/2, 0);

      // ── Perimeter wall detail ──
      var seamMat = H.metalMat(0x777777);
      var ventMat = H.darkMetalMat(0x333333);
      var hazardMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, roughness: 0.9 });
      // Structural seam lines
      D(scene, 0.04, WH, 0.04, seamMat, -10, WH/2, -S + 0.01);
      D(scene, 0.04, WH, 0.04, seamMat, 0, WH/2, -S + 0.01);
      D(scene, 0.04, WH, 0.04, seamMat, 10, WH/2, -S + 0.01);
      D(scene, 0.04, WH, 0.04, seamMat, -10, WH/2, S - 0.01);
      D(scene, 0.04, WH, 0.04, seamMat, 0, WH/2, S - 0.01);
      D(scene, 0.04, WH, 0.04, seamMat, 10, WH/2, S - 0.01);
      D(scene, 0.04, WH, 0.04, seamMat, S - 0.01, WH/2, -8);
      D(scene, 0.04, WH, 0.04, seamMat, S - 0.01, WH/2, 8);
      D(scene, 0.04, WH, 0.04, seamMat, -S + 0.01, WH/2, -8);
      D(scene, 0.04, WH, 0.04, seamMat, -S + 0.01, WH/2, 8);

      // Graffiti patches (abstract colored rectangles)
      var graffitiColors = [0x4466aa, 0xaa4444, 0x44aa66, 0xaaaa44, 0x8844aa, 0xaa6622];
      D(scene, 2.5, 1.5, 0.02, H.concreteMat(graffitiColors[0]), -7, 2.5, -S + 0.02);
      D(scene, 1.8, 2.0, 0.02, H.concreteMat(graffitiColors[1]), 12, 3, -S + 0.02);
      D(scene, 0.02, 1.5, 2.0, H.concreteMat(graffitiColors[2]), S - 0.02, 2, -5);
      D(scene, 0.02, 2.5, 1.5, H.concreteMat(graffitiColors[3]), S - 0.02, 3, 8);
      D(scene, 2.0, 1.2, 0.02, H.concreteMat(graffitiColors[4]), 5, 2, S - 0.02);
      D(scene, 0.02, 1.8, 2.5, H.concreteMat(graffitiColors[5]), -S + 0.02, 2.5, 5);

      // Weathering drip stains below seams
      var stainMat = H.concreteMat(0x808070);
      D(scene, 0.12, 1.0, 0.02, stainMat, -10, 1.5, -S + 0.02);
      D(scene, 0.12, 0.8, 0.02, stainMat, 0, 1.8, -S + 0.02);
      D(scene, 0.12, 1.2, 0.02, stainMat, 10, 1.3, S - 0.02);
      D(scene, 0.02, 0.9, 0.12, stainMat, S - 0.02, 1.6, -8);
      D(scene, 0.02, 1.1, 0.12, stainMat, -S + 0.02, 1.4, 8);

      // ── Central Platform ──
      B(scene, walls, 6, 1.5, 6, concreteMat, 0, 0.75, 0);
      D(scene, 5.5, 0.05, 5.5, darkMetalMat, 0, 1.52, 0);

      // Central platform edge trim
      D(scene, 6.1, 0.08, 0.08, seamMat, 0, 1.54, -3.01);
      D(scene, 6.1, 0.08, 0.08, seamMat, 0, 1.54, 3.01);
      D(scene, 0.08, 0.08, 6.1, seamMat, -3.01, 1.54, 0);
      D(scene, 0.08, 0.08, 6.1, seamMat, 3.01, 1.54, 0);
      // Cross marking on platform top
      D(scene, 4, 0.02, 0.15, hazardMat, 0, 1.53, 0);
      D(scene, 0.15, 0.02, 4, hazardMat, 0, 1.53, 0);

      // ── Inner Blocks (create corridors) ──
      B(scene, walls, 8, WH, 8, concreteMat, -10, WH/2, -10);
      B(scene, walls, 8, WH, 8, concreteMat, 10, WH/2, -10);
      B(scene, walls, 8, WH, 8, concreteMat, -10, WH/2, 10);
      B(scene, walls, 8, WH, 8, concreteMat, 10, WH/2, 10);

      // ── Inner block detail ──
      var blockPositions = [[-10, -10], [10, -10], [-10, 10], [10, 10]];

      blockPositions.forEach(function(bp, idx) {
        var bx = bp[0], bz = bp[1];

        // Panel seams: horizontal at mid-height, vertical at center of each face
        // X-facing faces (at bx±4)
        D(scene, 0.04, WH, 0.04, seamMat, bx + 4.01, WH/2, bz);       // east face vertical
        D(scene, 0.04, WH, 0.04, seamMat, bx - 4.01, WH/2, bz);       // west face vertical
        D(scene, 0.04, 0.04, 8.05, seamMat, bx + 4.01, WH/2, bz);     // east face horizontal
        D(scene, 0.04, 0.04, 8.05, seamMat, bx - 4.01, WH/2, bz);     // west face horizontal
        // Z-facing faces (at bz±4)
        D(scene, 0.04, WH, 0.04, seamMat, bx, WH/2, bz + 4.01);
        D(scene, 0.04, WH, 0.04, seamMat, bx, WH/2, bz - 4.01);
        D(scene, 8.05, 0.04, 0.04, seamMat, bx, WH/2, bz + 4.01);
        D(scene, 8.05, 0.04, 0.04, seamMat, bx, WH/2, bz - 4.01);

        // Vent grates (2 per block, on corridor-facing sides)
        var ventFaceX = bx < 0 ? bx + 4.02 : bx - 4.02;
        var ventFaceZ = bz < 0 ? bz + 4.02 : bz - 4.02;
        D(scene, 0.02, 0.6, 1.0, ventMat, ventFaceX, 1.5, bz + 1);
        D(scene, 1.0, 0.6, 0.02, ventMat, bx - 1, 1.5, ventFaceZ);

        // Conduit pipe along vertical edge (corridor-facing corner)
        Cyl(scene, 0.04, 0.04, WH, 6, darkMetalMat, ventFaceX - 0.1 * Math.sign(bx), WH/2, ventFaceZ - 0.1 * Math.sign(bz));

        // Hazard stripe at base of corridor-facing sides
        D(scene, 0.02, 0.15, 2, hazardMat, ventFaceX, 0.08, bz);
        D(scene, 2, 0.15, 0.02, hazardMat, bx, 0.08, ventFaceZ);
      });

      // ── Pillars at corridor entrances ──
      CylW(scene, walls, 0.4, 0.4, WH, 8, concreteMat, -3.5, WH/2, -6);
      CylW(scene, walls, 0.4, 0.4, WH, 8, concreteMat, 3.5, WH/2, -6);
      CylW(scene, walls, 0.4, 0.4, WH, 8, concreteMat, -3.5, WH/2, 6);
      CylW(scene, walls, 0.4, 0.4, WH, 8, concreteMat, 3.5, WH/2, 6);
      CylW(scene, walls, 0.4, 0.4, WH, 8, concreteMat, -6, WH/2, -3.5);
      CylW(scene, walls, 0.4, 0.4, WH, 8, concreteMat, -6, WH/2, 3.5);
      CylW(scene, walls, 0.4, 0.4, WH, 8, concreteMat, 6, WH/2, -3.5);
      CylW(scene, walls, 0.4, 0.4, WH, 8, concreteMat, 6, WH/2, 3.5);

      // ── Low cover walls ──
      B(scene, walls, 2.5, 1.2, 0.4, concreteMat, -3, 0.6, -2);
      B(scene, walls, 2.5, 1.2, 0.4, concreteMat, 3, 0.6, 2);
      B(scene, walls, 0.4, 1.2, 2.5, concreteMat, -2, 0.6, 3);
      B(scene, walls, 0.4, 1.2, 2.5, concreteMat, 2, 0.6, -3);

      // ── Crate clusters ──
      // North corridor
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, -1.5, 0.6, -12);
      B(scene, walls, 0.8, 0.8, 0.8, crateMat, -1.5, 1.6, -12);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, 1.5, 0.6, -14);
      // South corridor
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, 1.5, 0.6, 12);
      B(scene, walls, 0.8, 0.8, 0.8, crateMat, 1.5, 1.6, 12);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, -1.5, 0.6, 14);
      // East corridor
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, 12, 0.6, -1.5);
      B(scene, walls, 0.8, 0.8, 0.8, crateMat, 12, 1.6, -1.5);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, 14, 0.6, 1.5);
      // West corridor
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, -12, 0.6, 1.5);
      B(scene, walls, 0.8, 0.8, 0.8, crateMat, -12, 1.6, 1.5);
      B(scene, walls, 1.2, 1.2, 1.2, crateMat, -14, 0.6, -1.5);

      // ── Barrels ──
      P.Barrel(scene, walls, -17, 0, -17, { style: 'metal', seed: 1 });
      P.Barrel(scene, walls, -16.3, 0, -17, { style: 'metal', seed: 2 });
      P.Barrel(scene, walls, 17, 0, 17, { style: 'metal', seed: 3 });
      P.Barrel(scene, walls, 16.3, 0, 17, { style: 'metal', seed: 4 });
      P.Barrel(scene, walls, -17, 0, 17, { style: 'rusty', seed: 5 });
      P.Barrel(scene, walls, 17, 0, -17, { style: 'rusty', seed: 6 });

      // ── Hazard stripes ──
      D(scene, 4, 0.02, 0.3, hazardMat, 0, 0.01, -5.8);
      D(scene, 4, 0.02, 0.3, hazardMat, 0, 0.01, 5.8);
      D(scene, 0.3, 0.02, 4, hazardMat, -5.8, 0.01, 0);
      D(scene, 0.3, 0.02, 4, hazardMat, 5.8, 0.01, 0);

      // ── Procedural Props ──
      P.Rubble(scene, -16, 0, 0, { seed: 10 });
      P.Rubble(scene, 16, 0, 0, { seed: 11 });
      P.Rubble(scene, 0, 0, -16, { seed: 12 });
      P.Rubble(scene, 0, 0, 16, { seed: 13 });

      // ── Surface Detail ──
      WR(scene, 40, 5, 0.5, concreteMat, 0, 2.5, -20, { style: 'brick' });
      WR(scene, 40, 5, 0.5, concreteMat, 0, 2.5, 20, { style: 'brick' });
      FD(scene, 6, 6, concreteMat, 0, 1.5, 0, { style: 'cracked_tile' });
      WR(scene, 6, 1.5, 0.5, concreteMat, 0, 0.75, 0, { style: 'stone' });

      // ── Lighting (open-air daytime) ──
      addPointLight(scene, 0xffffff, 2.0, 30, 0, 6, 0);
      addPointLight(scene, 0xfff8ee, 1.2, 25, -16, 4, -16);
      addPointLight(scene, 0xfff8ee, 1.2, 25, 16, 4, -16);
      addPointLight(scene, 0xfff8ee, 1.2, 25, -16, 4, 16);
      addPointLight(scene, 0xfff8ee, 1.2, 25, 16, 4, 16);
      addPointLight(scene, 0xffffff, 1.0, 20, 0, 4, -12);
      addPointLight(scene, 0xffffff, 1.0, 20, 0, 4, 12);
      addPointLight(scene, 0xffffff, 1.0, 20, -12, 4, 0);
      addPointLight(scene, 0xffffff, 1.0, 20, 12, 4, 0);

      return walls;
    }
  });
})();
