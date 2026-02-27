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

  GAME._maps.push({
    name: 'Office',
    size: { x: 40, z: 40 },
    skyColor: 0x90a4ae,
    fogColor: 0x889098,
    fogDensity: 0.008,
    playerSpawn: { x: -16, z: -16 },
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

      // ── Desks with monitors ──
      function addDesk(x, z, rot) {
        // Desktop
        B(scene, walls, 2.0, 0.08, 1.0, deskMat, x, 0.75, z);
        // Legs
        D(scene, 0.08, 0.75, 0.08, metal, x-0.9, 0.375, z-0.4);
        D(scene, 0.08, 0.75, 0.08, metal, x+0.9, 0.375, z-0.4);
        D(scene, 0.08, 0.75, 0.08, metal, x-0.9, 0.375, z+0.4);
        D(scene, 0.08, 0.75, 0.08, metal, x+0.9, 0.375, z+0.4);
        // Monitor
        D(scene, 0.6, 0.4, 0.04, screen, x, 1.15, z - 0.3);
        D(scene, 0.15, 0.2, 0.08, darkMetal, x, 0.89, z - 0.3); // stand
        // Keyboard
        D(scene, 0.4, 0.02, 0.15, darkMetal, x, 0.8, z + 0.1);
      }
      addDesk(-14, -14, 0);
      addDesk(-11, -14, 0);
      addDesk(14, -14, 0);
      addDesk(11, -14, 0);
      addDesk(-14, 14, 0);
      addDesk(14, 14, 0);

      // ── Office Chairs ──
      function addChair(x, z) {
        D(scene, 0.5, 0.08, 0.5, chairMat, x, 0.5, z);         // seat
        D(scene, 0.5, 0.5, 0.08, chairMat, x, 0.8, z + 0.25);  // back
        D(scene, 0.06, 0.4, 0.06, darkMetal, x, 0.25, z);       // base
        Cyl(scene, 0.25, 0.25, 0.04, 8, darkMetal, x, 0.06, z); // wheel base
      }
      addChair(-14, -12.5);
      addChair(-11, -12.5);
      addChair(14, -12.5);
      addChair(11, -12.5);
      addChair(-14, 12.5);
      addChair(14, 12.5);

      // ── Filing Cabinets ──
      B(scene, walls, 0.6, 1.5, 0.5, metal, -17, 0.75, -8);
      B(scene, walls, 0.6, 1.5, 0.5, metal, -17, 0.75, -6.5);
      B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x777777), 17, 0.75, 8);
      B(scene, walls, 0.6, 1.5, 0.5, metalMat(0x777777), 17, 0.75, 6.5);

      // ── Server Rack ──
      B(scene, walls, 0.8, 2.2, 0.8, darkMetal, 17, 1.1, -17);
      D(scene, 0.6, 0.05, 0.6, emissiveMat(0x111111, 0x00ff44, 0.8), 17, 1.5, -16.6);

      // ── Bookshelf ──
      B(scene, walls, 2, 2.2, 0.4, woodDark, -17, 1.1, 0);
      D(scene, 1.8, 0.08, 0.35, wood, -17, 0.7, 0);   // shelf
      D(scene, 1.8, 0.08, 0.35, wood, -17, 1.4, 0);   // shelf
      // Books (colored blocks)
      D(scene, 0.3, 0.35, 0.2, fabricMat(0xc62828), -17.5, 0.95, 0);
      D(scene, 0.25, 0.3, 0.2, fabricMat(0x1565c0), -17.1, 0.9, 0);
      D(scene, 0.2, 0.32, 0.2, fabricMat(0x2e7d32), -16.7, 0.92, 0);

      // ── Whiteboards ──
      D(scene, 2, 1.2, 0.06, plasterMat(0xfafafa), -8.1, 3, -12);
      D(scene, 2.05, 1.25, 0.04, metalMat(0xaaaaaa), -8.15, 3, -12);
      D(scene, 2, 1.2, 0.06, plasterMat(0xfafafa), 8.1, 3, 12);

      // ── Water Cooler ──
      CylW(scene, walls, 0.2, 0.2, 1.0, 8, plasterMat(0xeeeeff), 0, 0.5, -18);
      Cyl(scene, 0.22, 0.15, 0.4, 8, metalMat(0x4488ff), 0, 1.2, -18);

      // ── Couch ──
      B(scene, walls, 3, 0.5, 1, fabricMat(0x37474f), 0, 0.3, 16);
      D(scene, 3, 0.6, 0.2, fabricMat(0x37474f), 0, 0.65, 16.4);
      D(scene, 0.4, 0.3, 1, fabricMat(0x37474f), -1.3, 0.6, 16);
      D(scene, 0.4, 0.3, 1, fabricMat(0x37474f), 1.3, 0.6, 16);

      // ── Potted plants ──
      Cyl(scene, 0.2, 0.15, 0.4, 6, concreteMat(0x8d6e63), 5, 0.2, -18);
      Cyl(scene, 0.25, 0.1, 0.5, 6, fabricMat(0x2e7d32), 5, 0.6, -18);
      Cyl(scene, 0.2, 0.15, 0.4, 6, concreteMat(0x8d6e63), -5, 0.2, 18);
      Cyl(scene, 0.25, 0.1, 0.5, 6, fabricMat(0x2e7d32), -5, 0.6, 18);

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

      return walls;
    },
  });
})();
