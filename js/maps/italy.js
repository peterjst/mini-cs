// js/maps/italy.js — Map 5: "Italy" — Mediterranean Village
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadowRecv = H.shadowRecv;
  var buildStairs = H.buildStairs;
  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
  var concreteMat = H.concreteMat, plasterMat = H.plasterMat;
  var woodMat = H.woodMat, metalMat = H.metalMat, darkMetalMat = H.darkMetalMat;
  var fabricMat = H.fabricMat, glassMat = H.glassMat, crateMat = H.crateMat;
  var emissiveMat = H.emissiveMat;
  var WR = H.WallRelief, FD = H.FloorDetail;
  var P = GAME._props;

  GAME._maps.push({
    name: 'Italy',
    lighting: {
      sunColor: 0xffe8c0,
      sunIntensity: 0.95,
      sunPos: [10, 20, 15],
      fillColor: 0xd0c0a0,
      fillIntensity: 0.25,
      ambientIntensity: 0.25,
      hemiSkyColor: 0xc0d8f0,
      hemiGroundColor: 0x907050,
      hemiIntensity: 0.4,
      shadowFrustumPadding: 6
    },
    colorGrade: {
      tint: [1.08, 1.0, 0.9],
      shadows: [0.9, 0.8, 0.65],
      contrast: 1.06,
      saturation: 1.15,
      vignetteStrength: 0.3
    },
    size: { x: 55, z: 50 },
    skyColor: 0x87ceeb,
    fogColor: 0xd4b896,
    fogDensity: 0.007,
    playerSpawn: { x: -24, z: -20 },
    spawnZones: [
      { x: -24, z: -20, radius: 4, label: 'ct' },
      { x: 8, z: 8, radius: 4, label: 't' },
      { x: -8, z: -6, radius: 5, label: 'mid' }
    ],
    botSpawns: [
      { x: 8, z: -8 },
      { x: 6, z: 6 },
      { x: -8, z: 10 },
      { x: -20, z: 10 },
      { x: 8, z: -22 },
      { x: -18, z: -10 },
    ],
    ctSpawns: [
      { x: -24, z: -20 }, { x: -22, z: -22 }, { x: -26, z: -18 },
      { x: -20, z: -20 }, { x: -24, z: -16 }
    ],
    tSpawns: [
      { x: 8, z: 8 }, { x: 10, z: 6 }, { x: 6, z: 10 },
      { x: 12, z: 8 }, { x: 8, z: 12 }
    ],
    bombsites: [
      { name: 'A', x: 6, z: -18, radius: 4 },
      { name: 'B', x: -18, z: 8, radius: 4 }
    ],
    waypoints: [
      { x: 0, z: -2 }, { x: 3, z: 3 }, { x: -3, z: 3 },
      { x: -16, z: -6 }, { x: -20, z: -15 }, { x: -20, z: 0 },
      { x: -12.5, z: -2 }, { x: -12.5, z: 5 },
      { x: -2, z: -10 }, { x: 5, z: -10 },
      { x: 7, z: -10 }, { x: 7, z: -20 },
      { x: 9, z: -6 }, { x: 14, z: 6 },
      { x: -8, z: 7 }, { x: -8, z: 14 },
      { x: -20, z: 10 }, { x: -14, z: 16 },
      { x: 14, z: 10 }, { x: 22, z: 10 },
      // Building A 2nd floor
      { x: -2, z: -18 },
      // Building B 2nd floor (front room)
      { x: 16, z: 0 },
      // Building B 2nd floor (back room)
      { x: 16, z: -14 },
    ],
    build: function(scene) {
      var walls = [];

      // ── Materials (warm Mediterranean palette) ──
      var sandStone = concreteMat(0xc8a87c);
      var sandStoneDk = concreteMat(0xc4a06a);
      var sandStoneFloor = concreteMat(0xa08050);
      var terracotta = concreteMat(0xb85c32);
      var warmPlaster = plasterMat(0xd4b896);
      var orangePlaster = plasterMat(0xc87840);
      var darkWood = woodMat(0x6b3a1e);
      var lightWood = woodMat(0x8b6020);
      var redFabric = fabricMat(0xc83020);
      var greenFabric = fabricMat(0x446622);
      var whiteFabric = fabricMat(0xddd8cc);
      var waterMat = glassMat(0x4488cc);
      var ironMat = darkMetalMat(0x5a4a3a);
      var rustMat = metalMat(0x7a5530);
      var wineCrate = crateMat(0x5a3010);
      var cobbleMark = concreteMat(0x8a7050);

      // ── Ground plane ──
      var ground = new THREE.Mesh(
        new THREE.PlaneGeometry(55, 50),
        sandStoneFloor
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, 0, 0);
      shadowRecv(ground);
      scene.add(ground);

      // ── Perimeter walls ──
      B(scene, walls, 55, 6, 0.5, sandStone, 0, 3, -25);
      B(scene, walls, 55, 6, 0.5, sandStone, 0, 3, 25);
      B(scene, walls, 0.5, 6, 50, sandStone, -27.5, 3, 0);
      B(scene, walls, 0.5, 6, 50, sandStone, 27.5, 3, 0);

      // ── Perimeter wall facade detail ──
      var shutterGreen = fabricMat(0x3a6630);
      var shutterBlue = fabricMat(0x3a4a6a);
      var shutterTerracotta = fabricMat(0x9a4a28);
      var windowRecess = concreteMat(0x5a4a3a);
      var flowerGreen = concreteMat(0x4a8a3a);

      // North wall (z=-25) — 3 window sets
      [[-15, shutterGreen], [-5, shutterBlue], [8, shutterTerracotta]].forEach(function(w) {
        var wx = w[0], shutterMat = w[1];
        D(scene, 1.5, 1.8, 0.2, windowRecess, wx, 3, -24.7);         // recess
        D(scene, 1.6, 0.1, 0.15, sandStoneDk, wx, 3.95, -24.65);     // lintel
        D(scene, 1.6, 0.1, 0.15, sandStoneDk, wx, 2.05, -24.65);     // sill
        D(scene, 0.35, 1.7, 0.08, shutterMat, wx - 1.1, 3, -24.6);   // left shutter
        D(scene, 0.35, 1.7, 0.08, shutterMat, wx + 1.1, 3, -24.6);   // right shutter
      });

      // South wall (z=25) — 3 window sets
      [[15, shutterTerracotta], [5, shutterGreen], [-10, shutterBlue]].forEach(function(w) {
        var wx = w[0], shutterMat = w[1];
        D(scene, 1.5, 1.8, 0.2, windowRecess, wx, 3, 24.7);
        D(scene, 1.6, 0.1, 0.15, sandStoneDk, wx, 3.95, 24.65);
        D(scene, 1.6, 0.1, 0.15, sandStoneDk, wx, 2.05, 24.65);
        D(scene, 0.35, 1.7, 0.08, shutterMat, wx - 1.1, 3, 24.6);
        D(scene, 0.35, 1.7, 0.08, shutterMat, wx + 1.1, 3, 24.6);
      });

      // East wall (x=27.5) — 2 window sets
      [[-12, shutterGreen], [8, shutterTerracotta]].forEach(function(w) {
        var wz = w[0], shutterMat = w[1];
        D(scene, 0.2, 1.8, 1.5, windowRecess, 27.2, 3, wz);
        D(scene, 0.15, 0.1, 1.6, sandStoneDk, 27.15, 3.95, wz);
        D(scene, 0.15, 0.1, 1.6, sandStoneDk, 27.15, 2.05, wz);
        D(scene, 0.08, 1.7, 0.35, shutterMat, 27.1, 3, wz - 1.1);
        D(scene, 0.08, 1.7, 0.35, shutterMat, 27.1, 3, wz + 1.1);
      });

      // West wall (x=-27.5) — 2 window sets
      [[-5, shutterBlue], [15, shutterGreen]].forEach(function(w) {
        var wz = w[0], shutterMat = w[1];
        D(scene, 0.2, 1.8, 1.5, windowRecess, -27.2, 3, wz);
        D(scene, 0.15, 0.1, 1.6, sandStoneDk, -27.15, 3.95, wz);
        D(scene, 0.15, 0.1, 1.6, sandStoneDk, -27.15, 2.05, wz);
        D(scene, 0.08, 1.7, 0.35, shutterMat, -27.1, 3, wz - 1.1);
        D(scene, 0.08, 1.7, 0.35, shutterMat, -27.1, 3, wz + 1.1);
      });

      // Flower box ledges under select windows
      D(scene, 1.4, 0.2, 0.3, sandStoneDk, -15, 1.95, -24.55);      // box
      D(scene, 1.2, 0.15, 0.2, flowerGreen, -15, 2.15, -24.5);       // greenery
      D(scene, 1.4, 0.2, 0.3, sandStoneDk, 5, 1.95, 24.55);
      D(scene, 1.2, 0.15, 0.2, flowerGreen, 5, 2.15, 24.5);
      D(scene, 0.3, 0.2, 1.4, sandStoneDk, 27.15, 1.95, -12);
      D(scene, 0.2, 0.15, 1.2, flowerGreen, 27.1, 2.15, -12);

      // Facade color variation (plaster patches simulating different buildings)
      D(scene, 10, 5.5, 0.08, plasterMat(0xd4a070), -18, 3, -24.85);   // warm orange section
      D(scene, 8, 5.5, 0.08, plasterMat(0xddc8a8), 18, 3, -24.85);     // cream section
      D(scene, 12, 5.5, 0.08, plasterMat(0xd8a888), -8, 3, 24.85);     // pink section
      D(scene, 0.08, 5.5, 12, plasterMat(0xd4a070), 27.35, 3, -5);     // east warm
      D(scene, 0.08, 5.5, 10, plasterMat(0xddc8a8), -27.35, 3, 10);    // west cream

      // Clothesline between buildings (between Building A east wall and Building B west wall)
      D(scene, 0.02, 0.02, 12, ironMat, 7, 4.5, -14);
      D(scene, 0.5, 0.5, 0.04, whiteFabric, 7, 4.2, -10);
      D(scene, 0.4, 0.6, 0.04, fabricMat(0x8899aa), 7, 4.15, -8);

      // ── Cobblestone path markings (piazza) ──
      for (var ci = -4; ci <= 4; ci++) {
        D(scene, 0.15, 0.02, 8, cobbleMark, ci * 2, 0.01, 0);
        D(scene, 8, 0.02, 0.15, cobbleMark, 0, 0.01, ci * 2);
      }

      // ═══════════════════════════════════════════════════
      //  CENTRAL PIAZZA — Fountain
      // ═══════════════════════════════════════════════════
      P.Fountain(scene, walls, 0, 0, 0, { seed: 1 });

      // ═══════════════════════════════════════════════════
      //  BUILDING A — North (2-story, accessible)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 12, 3.5, 0.4, warmPlaster, -2, 1.75, -18);
      B(scene, walls, 0.4, 3.5, 13, warmPlaster, -8, 1.75, -18.5);
      B(scene, walls, 0.4, 3.5, 13, warmPlaster, 4, 1.75, -18.5);
      B(scene, walls, 12, 3.5, 0.4, sandStone, -2, 1.75, -25);
      B(scene, walls, 4.5, 3.5, 0.4, warmPlaster, -5.5, 1.75, -12);
      B(scene, walls, 4.5, 3.5, 0.4, warmPlaster, 1.5, 1.75, -12);
      D(scene, 3, 0.4, 0.5, sandStoneDk, -2, 3.7, -12);
      // Floor slab with stairwell opening (left side, x[-8,-4] z[-17,-12])
      B(scene, walls, 12, 0.3, 8, sandStone, -2, 3.5, -21);       // back section
      B(scene, walls, 8, 0.3, 5, sandStone, 0, 3.5, -14.5);       // front-right section
      B(scene, walls, 12, 3, 0.4, orangePlaster, -2, 5.15, -18);
      B(scene, walls, 0.4, 3, 13, orangePlaster, -8, 5.15, -18.5);
      B(scene, walls, 0.4, 3, 13, orangePlaster, 4, 5.15, -18.5);
      B(scene, walls, 4, 1, 0.3, ironMat, -2, 3.85, -11.5);
      B(scene, walls, 13, 0.3, 14, terracotta, -2, 6.5, -18.5);
      D(scene, 14, 0.15, 0.8, terracotta, -2, 6.55, -11.2);
      buildStairs(scene, walls, -6, -21, 0, 3.5, 2.0, 'z+');
      // Stairwell railings (2nd floor)
      D(scene, 4, 0.8, 0.08, ironMat, -6, 4.05, -17);              // back edge
      D(scene, 0.08, 0.8, 5, ironMat, -4, 4.05, -14.5);            // right edge
      D(scene, 0.15, 1.2, 0.8, darkWood, -5, 2, -11.8);
      D(scene, 0.15, 1.2, 0.8, darkWood, 1, 2, -11.8);
      D(scene, 1.0, 0.3, 0.35, terracotta, -5, 3.3, -11.6);
      D(scene, 0.8, 0.25, 0.05, greenFabric, -5, 3.55, -11.6);
      D(scene, 1.0, 0.3, 0.35, terracotta, 1, 3.3, -11.6);
      D(scene, 0.8, 0.25, 0.05, fabricMat(0xcc3355), 1, 3.55, -11.6);

      // ── Building A: 2nd Floor Furnishings ──
      var f2y = 3.65; // furniture base (top of floor slab)

      // Floor material patch (wood planking)
      D(scene, 10, 0.02, 11, woodMat(0x8b6020), -2, 3.52, -18.5);

      // Window sill in south wall gap (between the two 4.5-wide wall segments)
      B(scene, walls, 3, 1.0, 0.4, sandStoneDk, -2, f2y + 0.5, -12);

      // Window cutout in east wall (x=4) — low wall as sill
      B(scene, walls, 0.4, 1.0, 2, sandStoneDk, 4, f2y + 0.5, -16);

      // Desk 1 near south edge (overlooking piazza)
      P.Desk(scene, walls, -4, f2y, -13, { style: 'office', seed: 80 });

      // Desk 2 near south edge
      P.Desk(scene, walls, 0, f2y, -13, { style: 'office', seed: 81 });

      // Filing cabinet cluster against north wall (z=-25)
      B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x777777), -5, f2y + 0.75, -24);
      B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x777777), -4.2, f2y + 0.75, -24);
      B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x888888), -3.4, f2y + 0.75, -24);

      // Low bookshelf (interior cover)
      B(scene, walls, 2.5, 1.2, 0.6, darkWood, -2, f2y + 0.6, -18);

      // ═══════════════════════════════════════════════════
      //  BUILDING B — East (2-story, T-side)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 0.4, 3.5, 25, sandStone, 10, 1.75, -7.5);
      B(scene, walls, 12, 3.5, 0.4, sandStone, 16, 1.75, -20);
      B(scene, walls, 0.4, 3.5, 25, sandStone, 22, 1.75, -7.5);
      B(scene, walls, 0.4, 3.5, 4, warmPlaster, 10, 1.75, -14);
      B(scene, walls, 0.4, 1, 4, warmPlaster, 10, 3, -8);
      B(scene, walls, 4, 3.5, 0.4, sandStone, 12, 1.75, 5);
      B(scene, walls, 4, 3.5, 0.4, sandStone, 20, 1.75, 5);
      D(scene, 8, 0.4, 0.5, sandStoneDk, 16, 3.7, 5);
      // Floor slab with stairwell opening (right side, x[17,22] z[-12,-7])
      B(scene, walls, 12, 0.3, 8, sandStone, 16, 3.5, -16);       // back section
      B(scene, walls, 7, 0.3, 5, sandStone, 13.5, 3.5, -9.5);     // left of stairwell
      B(scene, walls, 12, 0.3, 12, sandStone, 16, 3.5, -1);        // front section
      B(scene, walls, 0.4, 3, 25, orangePlaster, 10, 5.15, -7.5);
      B(scene, walls, 12, 3, 0.4, orangePlaster, 16, 5.15, -20);
      B(scene, walls, 0.4, 3, 25, orangePlaster, 22, 5.15, -7.5);
      B(scene, walls, 12, 3, 0.4, orangePlaster, 16, 5.15, 5);
      B(scene, walls, 0.3, 1, 6, ironMat, 10.2, 4.15, -5);
      B(scene, walls, 13, 0.3, 26, terracotta, 16, 6.5, -7.5);
      D(scene, 0.8, 0.15, 26, terracotta, 9.7, 6.55, -7.5);
      buildStairs(scene, walls, 19, -16, 0, 3.5, 2.0, 'z+');
      // Stairwell railings (2nd floor)
      D(scene, 5, 0.8, 0.08, ironMat, 19.5, 4.05, -12);            // back edge
      D(scene, 0.08, 0.8, 5, ironMat, 17, 4.05, -9.5);             // left edge
      D(scene, 0.5, 1.2, 0.15, darkWood, 10.3, 5.2, -12);
      D(scene, 0.5, 1.2, 0.15, darkWood, 10.3, 5.2, -2);

      // ── Building B: 2nd Floor Furnishings ──
      var f2yB = 3.65;

      // Floor material patch
      D(scene, 10, 0.02, 23, woodMat(0x7a5020), 16, 3.52, -7.5);

      // Partition wall dividing into two rooms (h=3, touching ceiling at 6.5)
      B(scene, walls, 10, 3, 0.4, sandStone, 16, f2yB + 1.5, -7.5);

      // -- Front room (south, z=-7.5 to z=5) --

      // Window sill in south wall (z=5) — overlooking piazza/market
      B(scene, walls, 3, 1.0, 0.4, sandStoneDk, 14, f2yB + 0.5, 5);
      B(scene, walls, 3, 1.0, 0.4, sandStoneDk, 18, f2yB + 0.5, 5);

      // Table with chairs
      B(scene, walls, 2, 0.8, 1.2, lightWood, 14, f2yB + 0.4, 0);
      P.Chair(scene, walls, 13, f2yB, -0.5, { style: 'office', seed: 82 });
      P.Chair(scene, walls, 15.5, f2yB, -0.5, { style: 'office', seed: 83 });

      // Crate stack for cover
      B(scene, walls, 1.2, 1.2, 1.2, wineCrate, 19, f2yB + 0.6, 1);
      B(scene, walls, 1.0, 1.0, 1.0, wineCrate, 19, f2yB + 1.6, 1);

      // Cover furniture beside existing iron railing balcony (west side, x=10)
      B(scene, walls, 1.2, 1.0, 1.2, wineCrate, 11, f2yB + 0.5, -3);

      // West wall window sills (x=10, facing alley) — 2 positions
      B(scene, walls, 0.4, 1.0, 2, sandStoneDk, 10, f2yB + 0.5, -2);
      B(scene, walls, 0.4, 1.0, 2, sandStoneDk, 10, f2yB + 0.5, 2);

      // -- Back room (north, z=-7.5 to z=-20) --

      // Shelf against east wall
      P.Shelf(scene, walls, 21, f2yB, -14, { style: 'bookcase', seed: 84 });

      // Desk near north window
      P.Desk(scene, walls, 16, f2yB, -18, { style: 'office', seed: 85 });

      // Window sill in north wall overlooking bombsite A
      B(scene, walls, 3, 1.0, 0.4, sandStoneDk, 16, f2yB + 0.5, -20);

      // West wall window sill (x=10, alley)
      B(scene, walls, 0.4, 1.0, 2, sandStoneDk, 10, f2yB + 0.5, -14);

      // ═══════════════════════════════════════════════════
      //  BUILDING C — South Market (single-story)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 12, 4, 0.4, warmPlaster, -8, 2, 22);
      B(scene, walls, 0.4, 4, 14, warmPlaster, -14, 2, 15);
      B(scene, walls, 0.4, 4, 14, warmPlaster, -2, 2, 15);
      B(scene, walls, 0.6, 4, 0.6, sandStoneDk, -12, 2, 8);
      B(scene, walls, 0.6, 4, 0.6, sandStoneDk, -4, 2, 8);
      D(scene, 9, 0.5, 0.8, sandStoneDk, -8, 4.2, 8);
      B(scene, walls, 12, 0.3, 14, terracotta, -8, 4.15, 15);
      B(scene, walls, 8, 1.1, 0.6, lightWood, -8, 0.55, 12);
      D(scene, 10, 0.08, 3, redFabric, -8, 4.0, 9.5);
      D(scene, 10, 0.08, 3, fabricMat(0xcc7722), -8, 3.9, 6.5);

      // ═══════════════════════════════════════════════════
      //  NORTH ALLEY (between Building A and Building B)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 6, 0.4, 1.5, sandStoneDk, 7, 4.5, -14);
      D(scene, 6, 0.3, 0.4, sandStone, 7, 4.7, -14);
      D(scene, 4, 0.02, 0.01, ironMat, 7, 4.2, -16);
      D(scene, 0.6, 0.5, 0.04, whiteFabric, 6, 3.9, -16);
      D(scene, 0.5, 0.7, 0.04, fabricMat(0x6688aa), 7.5, 3.8, -16);
      D(scene, 0.4, 0.4, 0.04, whiteFabric, 8.5, 3.9, -16);

      // ═══════════════════════════════════════════════════
      //  WEST ALLEY (N-S passage)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 0.4, 4, 16, sandStoneDk, -11, 2, 0);
      B(scene, walls, 0.4, 4, 8, sandStoneDk, -14, 2, -4);
      P.PottedPlant(scene, -12, 0, -3, { seed: 10 });
      P.PottedPlant(scene, -12, 0, 3, { seed: 11 });

      // ═══════════════════════════════════════════════════
      //  CT ENTRY ARCHWAY
      // ═══════════════════════════════════════════════════
      B(scene, walls, 0.8, 5, 0.8, sandStoneDk, -15, 2.5, -8);
      B(scene, walls, 0.8, 5, 0.8, sandStoneDk, -15, 2.5, -4);
      D(scene, 1.2, 0.6, 5, sandStoneDk, -15, 5.3, -6);
      D(scene, 1.4, 0.3, 5.4, sandStone, -15, 5.65, -6);

      // ═══════════════════════════════════════════════════
      //  WINE CELLAR (underground, stairs down)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 12, 0.3, 12, sandStoneFloor, 4, -2.5, 14);
      B(scene, walls, 12, 3, 0.4, sandStoneDk, 4, -1, 8);
      B(scene, walls, 0.4, 3, 12, sandStoneDk, -2, -1, 14);
      B(scene, walls, 0.4, 3, 12, sandStoneDk, 10, -1, 14);
      B(scene, walls, 12, 3, 0.4, sandStoneDk, 4, -1, 20);
      B(scene, walls, 12, 0.3, 12, sandStone, 4, 0.5, 14);
      buildStairs(scene, walls, 0, 10, -2.5, 0, 1.2, 'z+');
      P.WineCask(scene, walls, 7, -2.5, 12, { seed: 20 });
      P.WineCask(scene, walls, 7, -2.5, 16, { seed: 21 });
      B(scene, walls, 0.8, 0.6, 0.8, wineCrate, 2, -2.2, 18);
      B(scene, walls, 0.8, 0.6, 0.8, wineCrate, 3, -2.2, 18);
      B(scene, walls, 0.8, 0.6, 0.8, wineCrate, 2.5, -1.6, 18);

      // ═══════════════════════════════════════════════════
      //  COURTYARD (Southwest)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 11, 1.5, 0.4, sandStoneDk, -21, 0.75, 5);
      B(scene, walls, 0.4, 1.5, 17, sandStoneDk, -16, 0.75, 13.5);
      B(scene, walls, 11, 1.5, 0.4, sandStoneDk, -21, 0.75, 22);
      B(scene, walls, 2.5, 0.8, 1, sandStoneDk, -24, 0.4, 10);
      D(scene, 2.2, 0.4, 0.8, greenFabric, -24, 0.85, 10);
      B(scene, walls, 2.5, 0.8, 1, sandStoneDk, -20, 0.4, 18);
      D(scene, 2.2, 0.4, 0.8, greenFabric, -20, 0.85, 18);
      B(scene, walls, 2.5, 0.4, 0.6, sandStone, -22, 0.5, 14);
      D(scene, 0.4, 0.5, 0.4, sandStoneDk, -23, 0.25, 14);
      D(scene, 0.4, 0.5, 0.4, sandStoneDk, -21, 0.25, 14);
      CylW(scene, walls, 0.7, 0.8, 1.0, 10, sandStoneDk, -24, 0.5, 14);
      D(scene, 0.1, 2.0, 0.1, darkWood, -24.5, 1.5, 14);
      D(scene, 0.1, 2.0, 0.1, darkWood, -23.5, 1.5, 14);
      D(scene, 1.2, 0.1, 0.1, darkWood, -24, 2.5, 14);

      // ═══════════════════════════════════════════════════
      //  CT SPAWN AREA (Southwest corner)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 3, 2.5, 0.4, sandStoneDk, -24, 1.25, -15);
      B(scene, walls, 2, 1.5, 0.4, sandStoneDk, -20, 0.75, -18);
      B(scene, walls, 1.2, 1.2, 1.2, wineCrate, -22, 0.6, -20);
      B(scene, walls, 1.2, 1.2, 1.2, wineCrate, -23.2, 0.6, -20);
      B(scene, walls, 1.0, 1.0, 1.0, wineCrate, -22.5, 1.7, -20);
      P.WineCask(scene, walls, -25, 0, -22, { seed: 22 });
      P.WineCask(scene, walls, -19, 0, -22, { seed: 23 });
      D(scene, 0.4, 0.25, 0.3, sandStoneDk, -21, 0.12, -16);
      D(scene, 0.3, 0.2, 0.35, sandStoneDk, -23, 0.1, -17);
      D(scene, 0.25, 0.15, 0.2, cobbleMark, -20, 0.07, -19);

      // ═══════════════════════════════════════════════════
      //  BELL TOWER
      // ═══════════════════════════════════════════════════
      CylW(scene, walls, 0.6, 0.7, 7, 8, sandStoneDk, -1, 3.5, -8);
      Cyl(scene, 0.9, 0.3, 0.6, 8, terracotta, -1, 7.3, -8);
      Cyl(scene, 0.3, 0.15, 0.4, 6, rustMat, -1, 6.5, -8);

      // ═══════════════════════════════════════════════════
      //  MARKET STALLS (east of piazza)
      // ═══════════════════════════════════════════════════
      D(scene, 2.5, 0.1, 1.2, lightWood, 7, 1.0, 5);
      D(scene, 0.1, 1.0, 0.1, lightWood, 5.8, 0.5, 4.4);
      D(scene, 0.1, 1.0, 0.1, lightWood, 8.2, 0.5, 4.4);
      D(scene, 0.1, 1.0, 0.1, lightWood, 5.8, 0.5, 5.6);
      D(scene, 0.1, 1.0, 0.1, lightWood, 8.2, 0.5, 5.6);
      D(scene, 0.08, 2.5, 0.08, ironMat, 5.7, 1.25, 4.2);
      D(scene, 0.08, 2.5, 0.08, ironMat, 8.3, 1.25, 4.2);
      D(scene, 3, 0.06, 2, redFabric, 7, 2.5, 5);
      D(scene, 0.5, 0.3, 0.4, wineCrate, 6.2, 1.25, 5);
      D(scene, 0.5, 0.3, 0.4, wineCrate, 7.8, 1.25, 5);
      D(scene, 0.4, 0.15, 0.3, fabricMat(0xcc4400), 6.2, 1.45, 5);
      D(scene, 0.4, 0.15, 0.3, greenFabric, 7.8, 1.45, 5);
      // Stall 2
      D(scene, 2.5, 0.1, 1.2, lightWood, 7, 1.0, 10);
      D(scene, 0.1, 1.0, 0.1, lightWood, 5.8, 0.5, 9.4);
      D(scene, 0.1, 1.0, 0.1, lightWood, 8.2, 0.5, 9.4);
      D(scene, 0.1, 1.0, 0.1, lightWood, 5.8, 0.5, 10.6);
      D(scene, 0.1, 1.0, 0.1, lightWood, 8.2, 0.5, 10.6);
      D(scene, 0.08, 2.5, 0.08, ironMat, 5.7, 1.25, 9.2);
      D(scene, 0.08, 2.5, 0.08, ironMat, 8.3, 1.25, 9.2);
      D(scene, 3, 0.06, 2, fabricMat(0x2266aa), 7, 2.5, 10);
      D(scene, 0.5, 0.3, 0.4, wineCrate, 6.5, 1.25, 10);
      D(scene, 0.4, 0.15, 0.3, fabricMat(0xcc2222), 6.5, 1.45, 10);

      // ═══════════════════════════════════════════════════
      //  WALL-MOUNTED LANTERNS
      // ═══════════════════════════════════════════════════
      P.Lantern(scene, -11.2, 3.0, -2, { seed: 30 });
      P.Lantern(scene, -11.2, 3.0, 4, { seed: 31 });
      P.Lantern(scene, 4.2, 3.5, -16, { seed: 32 });
      P.Lantern(scene, -14.7, 4.0, -8, { seed: 33 });
      P.Lantern(scene, -14.7, 4.0, -4, { seed: 34 });

      // ═══════════════════════════════════════════════════
      //  SCATTERED DETAILS
      // ═══════════════════════════════════════════════════
      D(scene, 0.2, 0.08, 0.15, terracotta, 3, 0.04, 2);
      D(scene, 0.15, 0.06, 0.12, terracotta, -2, 0.03, 3);
      D(scene, 3, 0.02, 0.01, ironMat, -12.5, 3.5, 1);
      D(scene, 0.5, 0.6, 0.04, whiteFabric, -12, 3.1, 1);
      D(scene, 0.5, 0.5, 0.04, fabricMat(0xaa4444), -13, 3.2, 1);
      D(scene, 8, 0.05, 0.05, ironMat, -2, 4.1, -11.5);

      // ── Procedural Props ──
      P.Tree(scene, walls, 20, 0, 5, { style: 'cypress', seed: 50 });
      P.Tree(scene, walls, -25, 0, 0, { style: 'oak', seed: 51 });
      P.Flower(scene, -5, 3.3, -11.6, { seed: 60 });
      P.Flower(scene, 1, 3.3, -11.6, { seed: 61 });
      P.Archway(scene, walls, -15, 0, -6, { seed: 70 });

      // ── Surface Detail ──
      WR(scene, 12, 3.5, 0.5, warmPlaster, -2, 1.75, -18, { style: 'plaster_crack' });
      WR(scene, 12, 4, 0.5, sandStone, 16, 1.75, -7.5, { style: 'stone' });
      FD(scene, 8, 8, sandStoneFloor, 0, 0, 0, { style: 'cobblestone' });
      FD(scene, 12, 12, sandStoneFloor, 4, -2.5, 14, { style: 'worn_plank' });

      // ═══════════════════════════════════════════════════
      //  LIGHTING
      // ═══════════════════════════════════════════════════
      addPointLight(scene, 0xffddaa, 1.2, 25, 0, 5, 0);
      addHangingLight(scene, -2, 3.2, -18, 0xffcc88);
      addPointLight(scene, 0xffcc88, 0.8, 15, -2, 5.5, -18);
      addHangingLight(scene, 16, 3.2, -10, 0xffcc88);
      addPointLight(scene, 0xffcc88, 0.8, 15, 16, 5.5, -10);
      addPointLight(scene, 0xff8822, 0.8, 12, 4, -0.5, 14);
      addPointLight(scene, 0xff7700, 0.5, 10, 7, -1, 16);
      addPointLight(scene, 0xffbb66, 0.7, 15, -12, 3.5, 0);
      addPointLight(scene, 0xffaa44, 0.6, 12, -12, 3, 4);
      addPointLight(scene, 0xffbb66, 0.6, 12, 7, 4, -14);
      addPointLight(scene, 0xffbb66, 0.7, 15, -15, 4.5, -6);
      addHangingLight(scene, 7, 3, 7, 0xffddaa);
      addPointLight(scene, 0xffd4a0, 0.8, 20, -22, 4, 12);
      addPointLight(scene, 0xffd4a0, 0.6, 18, -24, 3, -18);
      addPointLight(scene, 0xffd4a0, 0.5, 20, 10, 5, 0);
      addPointLight(scene, 0xffd4a0, 0.5, 20, -5, 5, 10);

      return walls;
    },
  });
})();
