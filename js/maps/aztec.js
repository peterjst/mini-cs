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
  var WR = H.WallRelief, FD = H.FloorDetail;
  var P = GAME._props;

  GAME._maps.push({
    name: 'Aztec',
    lighting: {
      sunColor: 0xf0e8d0,
      sunIntensity: 0.7,
      sunPos: [12, 22, 8],
      fillColor: 0x90a880,
      fillIntensity: 0.25,
      ambientIntensity: 0.3,
      hemiSkyColor: 0x88aa70,
      hemiGroundColor: 0x506030,
      hemiIntensity: 0.45,
      shadowFrustumPadding: 6
    },
    colorGrade: {
      tint: [0.92, 1.05, 0.88],
      shadows: [0.7, 0.85, 0.65],
      contrast: 1.05,
      saturation: 1.1,
      vignetteStrength: 0.35
    },
    size: { x: 70, z: 60 },
    skyColor: 0xa8c8e8,
    fogColor: 0x8aaa8a,
    fogDensity: 0.005,
    playerSpawn: { x: -20, z: 20 },
    spawnZones: [
      { x: -20, z: 20, radius: 4, label: 'ct' },
      { x: 18, z: -22, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 5, label: 'mid' }
    ],
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
      // Elevated route waypoints
      { x: -13, z: -15 },  // corridor wall top north end
      { x: -13, z: -8 },   // corridor wall top midpoint
      { x: -13, z: -1 },   // corridor wall top south / drop-down
      // Expanded temple top
      { x: 15, z: 18 },    // temple top tier
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

      // ── Perimeter wall carved relief blocks ──
      WR(scene, 8, 4, 0.5, mossStone, -20, 3, -30, { style: 'stone' });
      WR(scene, 8, 4, 0.5, mossStone, 10, 3, -30, { style: 'stone' });
      WR(scene, 8, 4, 0.5, mossStone, -15, 3, 30, { style: 'stone' });
      WR(scene, 8, 4, 0.5, mossStone, 20, 3, 30, { style: 'stone' });
      WR(scene, 0.5, 4, 8, mossStone, -35, 3, -10, { style: 'stone' });
      WR(scene, 0.5, 4, 8, mossStone, 35, 3, 10, { style: 'stone' });

      // Moss patches at perimeter wall bases
      D(scene, 6, 0.6, 0.15, moss, -10, 0.3, -29.8);
      D(scene, 5, 0.5, 0.15, moss, 15, 0.25, -29.8);
      D(scene, 0.15, 0.5, 5, moss, -34.8, 0.25, 5);
      D(scene, 0.15, 0.6, 6, moss, 34.8, 0.3, -15);
      D(scene, 7, 0.5, 0.15, moss, -5, 0.25, 29.8);
      D(scene, 0.15, 0.5, 4, moss, -34.8, 0.25, -20);

      // Additional vines on perimeter
      P.Vine(scene, 15, 6, -30, 15, 1, -30, { seed: 24 });
      P.Vine(scene, -25, 7, -30, -25, 2, -30, { seed: 25 });
      P.Vine(scene, 35, 6, 5, 35, 1, 5, { seed: 26 });
      P.Vine(scene, -35, 7, -8, -35, 1.5, -8, { seed: 27 });
      P.Vine(scene, 10, 6, 30, 10, 1.5, 30, { seed: 28 });

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

      // ── River wall detail ──
      // Moss/algae at water line
      D(scene, 35, 0.4, 0.15, concreteMat(0x4a7a3a), 5, -1.8, -2.1);  // north bank algae
      D(scene, 35, 0.4, 0.15, concreteMat(0x4a7a3a), 5, -1.8, 6.1);   // south bank algae
      D(scene, 20, 0.3, 0.1, concreteMat(0x3a6a2a), 5, -1.5, -2.2);   // darker patches

      // Root tendrils over edges
      D(scene, 0.08, 1.5, 0.08, woodMat(0x5a4020), -10, -0.5, -2.3);
      D(scene, 0.06, 1.8, 0.06, woodMat(0x5a4020), 0, -0.3, -2.3);
      D(scene, 0.08, 1.2, 0.08, woodMat(0x5a4020), 12, -0.6, 6.3);
      D(scene, 0.06, 1.5, 0.06, woodMat(0x5a4020), 20, -0.4, 6.3);

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

      // ── Corridor wall detail ──
      // Carved glyph panels (contrasting stone rectangles)
      D(scene, 0.15, 2.0, 2.5, sandstoneDark, -13.1, 2.5, -8);   // left wall glyph
      D(scene, 0.15, 2.0, 2.5, sandstoneDark, -6.9, 2.5, -8);    // right wall glyph
      // Glyph face detail (small contrasting insets)
      D(scene, 0.05, 0.5, 0.5, darkStone, -13.15, 3.0, -7.5);
      D(scene, 0.05, 0.5, 0.5, darkStone, -13.15, 3.0, -8.5);
      D(scene, 0.05, 0.5, 0.5, darkStone, -6.85, 3.0, -7.5);
      D(scene, 0.05, 0.5, 0.5, darkStone, -6.85, 3.0, -8.5);

      // Torch holders with emissive glow
      D(scene, 0.15, 0.3, 0.15, darkStone, -13.05, 3.5, -5);      // bracket
      D(scene, 0.08, 0.4, 0.08, darkWood, -13.05, 3.9, -5); // torch shaft
      addPointLight(scene, 0xff8833, 0.4, 6, -12.5, 4.2, -5);      // torch glow
      D(scene, 0.15, 0.3, 0.15, darkStone, -6.95, 3.5, -11);
      D(scene, 0.08, 0.4, 0.08, darkWood, -6.95, 3.9, -11);
      addPointLight(scene, 0xff8833, 0.4, 6, -7.5, 4.2, -11);

      // Moss at corridor wall bases
      D(scene, 0.15, 0.4, 12, moss, -13.05, 0.2, -8);
      D(scene, 0.15, 0.4, 12, moss, -6.95, 0.2, -8);

      // ═══════════════════════════════════════════════════
      //  BOMBSITE A — Stepped Temple (south-east)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 14, 1.5, 14, sandstone, 15, 0.75, 18);
      B(scene, walls, 10, 1.5, 10, sandstoneDark, 15, 2.25, 18);
      B(scene, walls, 8, 1.5, 8, sandstone, 15, 3.75, 18);
      // Temple top cover: central altar
      B(scene, walls, 2, 1.5, 2, mossStone, 15, 5.25, 18);
      // Pillar fragments at opposite corners
      B(scene, walls, 0.8, 1.2, 0.8, darkStone, 12, 5.1, 15.5);
      B(scene, walls, 0.8, 1.2, 0.8, darkStone, 18, 5.1, 20.5);
      // Carved relief on altar
      WR(scene, 2, 1.5, 0.3, mossStone, 15, 5.25, 17, { style: 'stone' });
      // Tier edge trim (darker stone band on each tier riser)
      D(scene, 14.5, 0.15, 0.15, darkStone, 15, 0.08, 11);  // base tier front
      D(scene, 10.5, 0.15, 0.15, darkStone, 15, 1.58, 13);   // mid tier front
      D(scene, 8.5, 0.15, 0.15, darkStone, 15, 3.08, 14);     // top tier front
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

      // ── Temple tier glyph panels on riser faces ──
      // Base tier front riser (z=11, facing north)
      D(scene, 2, 1.0, 0.1, sandstoneDark, 13, 0.75, 10.95);
      D(scene, 2, 1.0, 0.1, sandstoneDark, 17, 0.75, 10.95);
      // Mid tier front riser
      D(scene, 1.5, 1.0, 0.1, sandstoneDark, 14, 2.25, 12.95);
      D(scene, 1.5, 1.0, 0.1, sandstoneDark, 16, 2.25, 12.95);
      // Moss in step joints
      D(scene, 12, 0.08, 0.3, moss, 15, 1.52, 11.2);
      D(scene, 8, 0.08, 0.3, moss, 15, 3.02, 13.2);
      D(scene, 6, 0.08, 0.3, moss, 15, 4.52, 14.2);

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

      // ── Overpass extension: ramp up to corridor wall top ──
      // Stairs start at the overpass east edge (x=-13), going eastward
      buildStairs(scene, walls, -13, -18, 3, 5, 2, 'x+');

      // Walkable platform on top of west corridor wall (x=-13, z=-15 to z=-1)
      B(scene, walls, 1.5, 0.3, 14, darkStone, -13, 5.15, -8);

      // Stone parapets along the walkway
      B(scene, walls, 0.3, 0.8, 14, mossStone, -13.6, 5.7, -8);  // west parapet
      B(scene, walls, 0.3, 0.8, 14, mossStone, -12.4, 5.7, -8);  // east parapet

      // Drop-down ledges at south end (z=-1) — gradual descent
      B(scene, walls, 1.5, 0.3, 1.5, darkStone, -13, 4, -0.5);   // intermediate step
      B(scene, walls, 1.5, 0.3, 1.5, darkStone, -13, 2.5, 0.5);  // lower step
      B(scene, walls, 1.5, 0.3, 1.5, darkStone, -13, 1.2, 1.5);  // near ground

      // ═══════════════════════════════════════════════════
      //  T SPAWN — Jungle Clearing (north)
      // ═══════════════════════════════════════════════════
      P.Tree(scene, walls, 20, 0, -25, { style: 'jungle', seed: 1 });
      P.Tree(scene, walls, 25, 0, -22, { style: 'jungle', seed: 2 });
      P.Tree(scene, walls, 8, 0, -28, { style: 'jungle', seed: 3 });
      P.Bush(scene, 12, 0, -20, { style: 'tropical', seed: 10 });
      P.MossPatches(scene, 18, 0, -18, { seed: 11 });
      P.Bush(scene, 5, 0, -22, { style: 'tropical', seed: 12 });
      P.Grass(scene, 22, 0, -27, { seed: 13 });
      P.Grass(scene, 14, 0, -26, { seed: 14 });

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
      P.Vine(scene, -22, 4, 5, -22, 1, 5, { seed: 20 });
      P.Vine(scene, -26, 4, 8, -26, 1, 8, { seed: 21 });
      P.Vine(scene, -13, 5, -10, -13, 1.5, -10, { seed: 22 });
      P.Vine(scene, -7, 5, -5, -7, 2, -5, { seed: 23 });
      P.Rock(scene, walls, -15, 0, 3, { style: 'mossy', seed: 40 });
      P.Rock(scene, walls, -8, 0, 14, { style: 'sandstone', seed: 41 });
      P.Rock(scene, walls, 5, 0, -15, { style: 'mossy', seed: 42 });
      P.Tree(scene, walls, -32, 0, -20, { style: 'jungle', seed: 4 });
      P.Tree(scene, walls, -32, 0, 15, { style: 'jungle', seed: 5 });
      P.Tree(scene, walls, 32, 0, -25, { style: 'jungle', seed: 6 });
      P.Tree(scene, walls, 32, 0, 20, { style: 'jungle', seed: 7 });
      P.MossPatches(scene, -28, 0, 0, { seed: 30 });
      P.MossPatches(scene, 28, 0, -5, { seed: 31 });
      P.Bush(scene, -5, 0, 25, { style: 'tropical', seed: 32 });
      P.Grass(scene, 10, 0, -18, { seed: 33 });

      // ── Procedural Vegetation & Detail ──
      P.RockCluster(scene, walls, -14, 0, 2, { seed: 50 });
      P.RockCluster(scene, walls, 24, 0, 2, { seed: 51 });
      P.Flower(scene, 16, 0, -20, { seed: 60 });
      P.Flower(scene, -28, 0, -5, { seed: 61 });
      P.Pillar(scene, walls, 12, 0, 12, { style: 'stone', seed: 70 });
      P.Pillar(scene, walls, 18, 0, 24, { style: 'stone', seed: 71 });

      // ── Surface Detail ──
      WR(scene, 14, 4, 0.5, mossStone, 15, 2, 18, { style: 'stone' });
      WR(scene, 8, 4, 0.5, darkStone, -22, 2, 5, { style: 'stone' });
      FD(scene, 14, 14, sandstone, 15, 1.5, 18, { style: 'cobblestone' });
      FD(scene, 10, 4, darkStone, -18, 3, -18, { style: 'cobblestone' });

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
