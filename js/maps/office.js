// js/maps/office.js — Map 2: "Office" — Modern Office Building
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadowRecv = H.shadowRecv;
  var addPointLight = H.addPointLight;
  var floorMat = H.floorMat, officeTileMat = H.officeTileMat;
  var plasterMat = H.plasterMat, woodMat = H.woodMat;
  var metalMat = H.metalMat, darkMetalMat = H.darkMetalMat;
  var fabricMat = H.fabricMat, crateMat = H.crateMat;
  var emissiveMat = H.emissiveMat, ceilingMat = H.ceilingMat, concreteMat = H.concreteMat;
  var WR = H.WallRelief, FD = H.FloorDetail, CD = H.CeilingDetail;
  var P = GAME._props;

  GAME._maps.push({
    name: 'Office',
    lighting: {
      sunColor: 0xe8eef8,
      sunIntensity: 0.6,
      sunPos: [10, 20, 8],
      fillColor: 0xd0d8e8,
      fillIntensity: 0.35,
      ambientIntensity: 0.4,
      hemiSkyColor: 0xd0d8e8,
      hemiGroundColor: 0x808890,
      hemiIntensity: 0.45,
      shadowMapSize: 1024,
      shadowFrustumPadding: 8,
      shadowBias: -0.002
    },
    colorGrade: {
      tint: [0.92, 0.95, 1.05],
      shadows: [0.8, 0.85, 0.95],
      contrast: 1.05,
      saturation: 0.95,
      vignetteStrength: 0.25
    },
    size: { x: 40, z: 40 },
    skyColor: 0x90a4ae,
    fogColor: 0x889098,
    fogDensity: 0.008,
    playerSpawn: { x: -16, z: -16 },
    spawnZones: [
      { x: -16, z: -16, radius: 4, label: 'ct' },
      { x: 14, z: 14, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 5, label: 'mid' }
    ],
    botSpawns: [
      { x: 10, z: 10 },
      { x: 12, z: -8 },
      { x: -8, z: 12 },
    ],
    ctSpawns: [
      { x: -16, z: -16 }, { x: -14, z: -18 }, { x: -18, z: -14 },
      { x: -12, z: -16 }, { x: -16, z: -12 }
    ],
    tSpawns: [
      { x: 14, z: 14 }, { x: 12, z: 16 }, { x: 16, z: 12 },
      { x: 10, z: 14 }, { x: 14, z: 10 }
    ],
    bombsites: [
      { name: 'A', x: 8, z: -6, radius: 4 },
      { name: 'B', x: -6, z: 10, radius: 4 }
    ],
    waypoints: [
      { x: 0, z: 0 }, { x: 10, z: 10 }, { x: -10, z: 10 },
      { x: 10, z: -10 }, { x: -10, z: -10 }, { x: 0, z: 15 },
      { x: 0, z: -15 }, { x: 15, z: 0 }, { x: -15, z: 0 },
      { x: 5, z: 5 }, { x: -5, z: -5 }, { x: -12, z: 5 },
    ],
    build: function(scene) {
      var walls = [];
      var grayFloor = officeTileMat(0x707070);
      var carpet = floorMat(0x4a5568);
      var plaster = plasterMat(0xd8d4ce);
      var plasterLight = plasterMat(0xe4e0da);
      var wood = woodMat(0x8b6e4e);
      var woodDark = woodMat(0x5d4037);
      var deskMat = woodMat(0xb0956e);
      var metal = metalMat(0x888888);
      var darkMetal = darkMetalMat(0x333333);
      var screen = emissiveMat(0x222244, 0x4488ff, 0.5);
      var blueCrate = crateMat(0x1565c0, 0x001133);
      var chairMat = fabricMat(0x2d3436);

      // Floor — tile with carpet sections
      var floor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(40, 1, 40), grayFloor));
      floor.position.set(0, -0.5, 0);
      scene.add(floor);
      // Carpet patches in rooms
      D(scene, 14, 0.02, 14, carpet, -10, 0.01, -10);
      D(scene, 14, 0.02, 14, carpet, 10, 0.01, 10);

      // Ceiling
      var ceil = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 40), ceilingMat(0x999999)));
      ceil.position.set(0, 6, 0);
      scene.add(ceil);

      var wH = 6, wT = 0.5;

      // Perimeter
      [
        [41, wH, wT, 0, wH/2, -20.25],
        [41, wH, wT, 0, wH/2, 20.25],
        [wT, wH, 40, -20.25, wH/2, 0],
        [wT, wH, 40, 20.25, wH/2, 0],
      ].forEach(function(w) { B(scene, walls, w[0], w[1], w[2], plaster, w[3], w[4], w[5]); });

      // Baseboards
      [[41,0.15,0.08, 0,0.075,-19.9], [41,0.15,0.08, 0,0.075,19.9],
       [0.08,0.15,40, -19.9,0.075,0], [0.08,0.15,40, 19.9,0.075,0]
      ].forEach(function(b) { D(scene, b[0],b[1],b[2], woodDark, b[3],b[4],b[5]); });

      // Interior walls
      [
        [12, wH, wT, -8, wH/2, -8, 0xdcdcdc],
        [12, wH, wT, 8, wH/2, -8, 0xdcdcdc],
        [8, wH, wT, -12, wH/2, 0, 0xdcdcdc],
        [8, wH, wT, 12, wH/2, 0, 0xdcdcdc],
        [12, wH, wT, -8, wH/2, 8, 0xdcdcdc],
        [12, wH, wT, 8, wH/2, 8, 0xdcdcdc],
        [wT, wH, 12, -8, wH/2, -12, 0xe0e0e0],
        [wT, wH, 12, 8, wH/2, -12, 0xe0e0e0],
        [wT, wH, 12, -8, wH/2, 12, 0xe0e0e0],
        [wT, wH, 12, 8, wH/2, 12, 0xe0e0e0],
        [6, wH, wT, -3, wH/2, -3, 0xd0d0d0],
        [wT, wH, 6, 3, wH/2, 0, 0xd0d0d0],
      ].forEach(function(w) { B(scene, walls, w[0], w[1], w[2], plasterMat(w[6]), w[3], w[4], w[5]); });

      // ── Interior wall detail ──
      var glassMat = H.glassMat;
      var woodDk = woodDark;

      // Glass panel inserts on selected walls
      // Wall at (-8, wH/2, -8) x=12 — conference room divider
      D(scene, 4, 2, 0.08, glassMat(0x88bbdd), -6, 3.5, -7.7);
      D(scene, 4.1, 0.06, 0.1, darkMetal, -6, 4.53, -7.7);       // top frame
      D(scene, 4.1, 0.06, 0.1, darkMetal, -6, 2.47, -7.7);       // bottom frame
      D(scene, 0.06, 2.06, 0.1, darkMetal, -8, 3.5, -7.7);       // left frame
      D(scene, 0.06, 2.06, 0.1, darkMetal, -4, 3.5, -7.7);       // right frame

      // Wall at (8, wH/2, -8) x=12
      D(scene, 4, 2, 0.08, glassMat(0x88bbdd), 10, 3.5, -7.7);
      D(scene, 4.1, 0.06, 0.1, darkMetal, 10, 4.53, -7.7);
      D(scene, 4.1, 0.06, 0.1, darkMetal, 10, 2.47, -7.7);
      D(scene, 0.06, 2.06, 0.1, darkMetal, 8, 3.5, -7.7);
      D(scene, 0.06, 2.06, 0.1, darkMetal, 12, 3.5, -7.7);

      // Wall at (-8, wH/2, 8) x=12
      D(scene, 4, 2, 0.08, glassMat(0x88bbdd), -6, 3.5, 8.3);
      D(scene, 4.1, 0.06, 0.1, darkMetal, -6, 4.53, 8.3);
      D(scene, 4.1, 0.06, 0.1, darkMetal, -6, 2.47, 8.3);

      // Wall at (8, wH/2, 8) x=12
      D(scene, 4, 2, 0.08, glassMat(0x88bbdd), 10, 3.5, 8.3);
      D(scene, 4.1, 0.06, 0.1, darkMetal, 10, 4.53, 8.3);
      D(scene, 4.1, 0.06, 0.1, darkMetal, 10, 2.47, 8.3);

      // Additional door frames on wall openings (supplement existing 4)
      D(scene, 0.12, wH, 0.12, woodDk, -8, wH/2, -5.5);
      D(scene, 0.12, wH, 0.12, woodDk, -8, wH/2, 5.5);
      D(scene, 0.12, wH, 0.12, woodDk, -5, wH/2, 0);
      D(scene, 0.12, wH, 0.12, woodDk, 5, wH/2, 0);

      // Bulletin board
      D(scene, 1.5, 1.0, 0.06, fabricMat(0x8b6e4e), -8.1, 3.5, 5);   // cork board
      D(scene, 0.3, 0.22, 0.02, plasterMat(0xf5f5f0), -8.5, 3.8, 4.96); // pinned paper
      D(scene, 0.25, 0.18, 0.02, plasterMat(0xffffcc), -7.8, 3.6, 4.96); // sticky note
      D(scene, 0.28, 0.2, 0.02, plasterMat(0xccddff), -8.2, 3.3, 4.96);  // blue note

      // Wall-mounted TV/display
      D(scene, 1.8, 1.0, 0.06, darkMetal, 8.1, 3.5, -3);                 // TV body
      D(scene, 1.6, 0.85, 0.04, emissiveMat(0x111122, 0x2244aa, 0.3), 8.12, 3.5, -3); // screen

      // Interior baseboards
      D(scene, 12, 0.12, 0.06, woodDk, -8, 0.06, -7.7);
      D(scene, 12, 0.12, 0.06, woodDk, 8, 0.06, -7.7);
      D(scene, 12, 0.12, 0.06, woodDk, -8, 0.06, 8.3);
      D(scene, 12, 0.12, 0.06, woodDk, 8, 0.06, 8.3);
      D(scene, 0.06, 0.12, 12, woodDk, -7.7, 0.06, -12);
      D(scene, 0.06, 0.12, 12, woodDk, 8.3, 0.06, -12);
      D(scene, 0.06, 0.12, 12, woodDk, -7.7, 0.06, 12);
      D(scene, 0.06, 0.12, 12, woodDk, 8.3, 0.06, 12);

      // Additional whiteboard
      D(scene, 2, 1.2, 0.06, plasterMat(0xfafafa), 3.3, 3, 0.3);
      D(scene, 2.05, 1.25, 0.04, metal, 3.35, 3, 0.3);

      // Smoke detectors on ceiling
      Cyl(scene, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa), -5, 5.72, -5);
      Cyl(scene, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa), 5, 5.72, 5);
      Cyl(scene, 0.06, 0.06, 0.03, 8, plasterMat(0xfafafa), -12, 5.72, 12);

      // ── Desks with monitors ──
      P.Desk(scene, walls, -14, 0, -14, { style: 'office', seed: 1 });
      P.Desk(scene, walls, -11, 0, -14, { style: 'office', seed: 2 });
      P.Desk(scene, walls, 14, 0, -14, { style: 'office', seed: 3 });
      P.Desk(scene, walls, 11, 0, -14, { style: 'office', seed: 4 });
      P.Desk(scene, walls, -14, 0, 14, { style: 'office', seed: 5 });
      P.Desk(scene, walls, 14, 0, 14, { style: 'office', seed: 6 });

      // ── Office Chairs ──
      P.Chair(scene, walls, -14, 0, -12.5, { style: 'office', seed: 10 });
      P.Chair(scene, walls, -11, 0, -12.5, { style: 'office', seed: 11 });
      P.Chair(scene, walls, 14, 0, -12.5, { style: 'office', seed: 12 });
      P.Chair(scene, walls, 11, 0, -12.5, { style: 'office', seed: 13 });
      P.Chair(scene, walls, -14, 0, 12.5, { style: 'office', seed: 14 });
      P.Chair(scene, walls, 14, 0, 12.5, { style: 'office', seed: 15 });

      // ── Filing Cabinets ──
      B(scene, walls, 0.6, 1.5, 0.5, metal, -17, 0.75, -8);
      B(scene, walls, 0.6, 1.5, 0.5, metal, -17, 0.75, -6.5);
      B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x777777), 17, 0.75, 8);
      B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x777777), 17, 0.75, 6.5);

      // ── Server Rack ──
      B(scene, walls, 0.8, 2.2, 0.8, darkMetal, 17, 1.1, -17);
      D(scene, 0.6, 0.05, 0.6, emissiveMat(0x111111, 0x00ff44, 0.8), 17, 1.5, -16.6);

      // ── Bookshelf ──
      P.Shelf(scene, walls, -17, 0, 0, { style: 'bookcase', seed: 20 });

      // ── Whiteboards ──
      D(scene, 2, 1.2, 0.06, plasterMat(0xfafafa), -8.1, 3, -12);
      D(scene, 2.05, 1.25, 0.04, metalMat(0xaaaaaa), -8.15, 3, -12);
      D(scene, 2, 1.2, 0.06, plasterMat(0xfafafa), 8.1, 3, 12);

      // ── Water Cooler ──
      CylW(scene, walls, 0.2, 0.2, 1.0, 8, plasterMat(0xeeeeff), 0, 0.5, -18);
      Cyl(scene, 0.22, 0.15, 0.4, 8, metalMat(0x4488ff), 0, 1.2, -18);

      // ── Couch ──
      P.Couch(scene, walls, 0, 0, 16, { seed: 25 });

      // ── Potted plants ──
      P.PottedPlant(scene, 5, 0, -18, { seed: 30 });
      P.PottedPlant(scene, -5, 0, 18, { seed: 31 });

      // ── Accent crates ──
      B(scene, walls, 2,2,2, blueCrate, -5,1,-12);
      B(scene, walls, 2,2,2, crateMat(0x1565c0), 5,1,12);
      B(scene, walls, 2,1.5,2, crateMat(0x1976d2,0x001133), 14,0.75,-14);
      B(scene, walls, 2,1.5,2, crateMat(0x1976d2), -14,0.75,14);
      B(scene, walls, 1.5,2,1.5, crateMat(0x1565c0), 0,1,5);

      // ── Fluorescent ceiling lights ──
      function addCeilingLight(x, z) {
        D(scene, 1.5, 0.06, 0.15, emissiveMat(0xffffff, 0xeeeeff, 2.0), x, 5.72, z);
        addPointLight(scene, 0xeeeeff, 1.2, 26, x, 5.6, z);
      }
      addCeilingLight(-10, -10);
      addCeilingLight(10, -10);
      addCeilingLight(-10, 10);
      addCeilingLight(10, 10);
      addCeilingLight(0, 0);
      addCeilingLight(0, -16);
      addCeilingLight(0, 16);
      addCeilingLight(-16, 0);
      addCeilingLight(16, 0);

      // ── Environmental Details ──

      // Paper stacks on desks
      D(scene, 0.3, 0.04, 0.22, plasterMat(0xf5f5f0), -13.5, 0.81, -13.6);
      D(scene, 0.28, 0.03, 0.2, plasterMat(0xf0eed8), -13.5, 0.84, -13.6);
      D(scene, 0.3, 0.04, 0.22, plasterMat(0xf5f5f0), 14.3, 0.81, -14.3);

      // Coffee mugs on desks
      Cyl(scene, 0.04, 0.04, 0.1, 8, plasterMat(0xffffff), -10.6, 0.84, -13.7);
      Cyl(scene, 0.04, 0.04, 0.1, 8, plasterMat(0xc62828), 14.4, 0.84, 13.7);

      // Trash bins
      Cyl(scene, 0.2, 0.18, 0.4, 8, metalMat(0x555555), -16, 0.2, -15);
      Cyl(scene, 0.2, 0.18, 0.4, 8, metalMat(0x555555), 16, 0.2, 15);

      // Fire extinguisher on wall
      Cyl(scene, 0.08, 0.08, 0.35, 8, fabricMat(0xd32f2f), -19.6, 1.2, -5);
      D(scene, 0.12, 0.18, 0.06, metalMat(0x222222), -19.6, 1.5, -5); // nozzle

      // Door frames (around wall gaps)
      D(scene, 0.12, 6, 0.12, woodDark, -2, 3, -8); // central corridor doors
      D(scene, 0.12, 6, 0.12, woodDark, 2, 3, -8);
      D(scene, 0.12, 6, 0.12, woodDark, -2, 3, 8);
      D(scene, 0.12, 6, 0.12, woodDark, 2, 3, 8);

      // Air vent grilles on ceiling
      D(scene, 0.8, 0.03, 0.5, metalMat(0x666666), -5, 5.73, -5);
      D(scene, 0.8, 0.03, 0.5, metalMat(0x666666), 5, 5.73, 5);
      D(scene, 0.8, 0.03, 0.5, metalMat(0x666666), 15, 5.73, -15);

      // Wall clock
      Cyl(scene, 0.25, 0.25, 0.04, 16, plasterMat(0xfafafa), 0, 4.0, -19.9);
      Cyl(scene, 0.02, 0.02, 0.03, 4, darkMetal, 0, 4.0, -19.85);
      D(scene, 0.01, 0.1, 0.02, darkMetal, 0, 4.05, -19.85); // minute hand
      D(scene, 0.08, 0.01, 0.02, darkMetal, 0.04, 4.0, -19.85); // hour hand

      // Wet floor sign (triangle shape approximated)
      D(scene, 0.4, 0.6, 0.02, emissiveMat(0xffeb3b, 0xffff00, 0.3), 3, 0.3, -3);
      D(scene, 0.35, 0.02, 0.2, metalMat(0x333333), 3, 0.01, -3); // base

      // Floor scuff marks
      D(scene, 2.0, 0.005, 0.3, floorMat(0x555555), -8, 0.006, 0);
      D(scene, 0.3, 0.005, 1.5, floorMat(0x555555), 5, 0.006, -15);
      D(scene, 1.8, 0.005, 0.25, floorMat(0x555555), 12, 0.006, 8);

      // Electrical outlet plates on walls
      D(scene, 0.08, 0.12, 0.02, plasterMat(0xe0e0e0), -19.8, 0.4, -12);
      D(scene, 0.08, 0.12, 0.02, plasterMat(0xe0e0e0), 19.8, 0.4, 12);
      D(scene, 0.08, 0.12, 0.02, plasterMat(0xe0e0e0), -19.8, 0.4, 8);

      // Ceiling sprinkler heads
      Cyl(scene, 0.03, 0.05, 0.06, 6, metalMat(0xcccccc), -10, 5.7, 0);
      Cyl(scene, 0.03, 0.05, 0.06, 6, metalMat(0xcccccc), 10, 5.7, 0);
      Cyl(scene, 0.03, 0.05, 0.06, 6, metalMat(0xcccccc), 0, 5.7, 10);

      // Pen cup on desk
      Cyl(scene, 0.04, 0.04, 0.1, 6, metalMat(0x333333), -14.2, 0.84, -13.5);
      D(scene, 0.01, 0.06, 0.01, woodMat(0xdaa520), -14.2, 0.92, -13.5); // pencil

      // Coat hooks on wall
      D(scene, 0.04, 0.04, 0.08, metalMat(0x888888), -19.7, 1.8, 5);
      D(scene, 0.04, 0.04, 0.08, metalMat(0x888888), -19.7, 1.8, 6);

      // ── Surface Detail ──
      WR(scene, 12, 6, 0.5, plaster, -8, 3, -8, { style: 'panel' });
      WR(scene, 8, 6, 0.5, plaster, 12, 3, 0, { style: 'panel' });
      FD(scene, 6, 6, grayFloor, 0, 0, -15, { style: 'cracked_tile' });
      CD(scene, 10, 10, grayFloor, 0, 5.7, 0, { style: 'panels' });
      CD(scene, 6, 6, grayFloor, 15, 5.7, -15, { style: 'pipes' });
      P.Junction(scene, 19.5, 3, -12, { seed: 40 });

      return walls;
    },
  });
})();
