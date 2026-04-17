// js/maps/dust.js — Map 1: "Dust" — Desert Market
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadowRecv = H.shadowRecv;
  var addPointLight = H.addPointLight;
  var dustFloorMat = H.dustFloorMat, concreteMat = H.concreteMat, woodMat = H.woodMat;
  var fabricMat = H.fabricMat, metalMat = H.metalMat, darkMetalMat = H.darkMetalMat;
  var crateMat = H.crateMat, floorMat = H.floorMat;
  var WR = H.WallRelief, FD = H.FloorDetail;
  var P = GAME._props;

  GAME._maps.push({
    name: 'Dust',
    lighting: {
      sunColor: 0xfff0d0,
      sunIntensity: 1.1,
      sunPos: [18, 30, 12],
      fillColor: 0xd0c8b0,
      fillIntensity: 0.15,
      ambientIntensity: 0.2,
      hemiSkyColor: 0xcce0ff,
      hemiGroundColor: 0xa08050,
      hemiIntensity: 0.35,
      shadowFrustumPadding: 5,
      shadowBias: -0.0008
    },
    colorGrade: {
      tint: [1.05, 0.98, 0.88],
      shadows: [0.95, 0.85, 0.7],
      contrast: 1.08,
      saturation: 1.05,
      vignetteStrength: 0.3
    },
    size: { x: 50, z: 50 },
    skyColor: 0x87ceeb,
    fogColor: 0xc8b89a,
    fogDensity: 0.012,
    playerSpawn: { x: -20, z: -20 },
    spawnZones: [
      { x: -20, z: -20, radius: 4, label: 'ct' },
      { x: 18, z: 18, radius: 4, label: 't' },
      { x: 0, z: 0, radius: 5, label: 'mid' }
    ],
    botSpawns: [
      { x: 10, z: 10 },
      { x: 15, z: -5 },
      { x: -5, z: 12 },
    ],
    ctSpawns: [
      { x: -20, z: -20 }, { x: -18, z: -22 }, { x: -22, z: -18 },
      { x: -16, z: -20 }, { x: -20, z: -16 }
    ],
    tSpawns: [
      { x: 18, z: 18 }, { x: 15, z: 20 }, { x: 20, z: 15 },
      { x: 12, z: 18 }, { x: 18, z: 12 }
    ],
    bombsites: [
      { name: 'A', x: 10, z: -10, radius: 4 },
      { name: 'B', x: -8, z: 12, radius: 4 }
    ],
    waypoints: [
      { x: 0, z: 0 }, { x: 15, z: 15 }, { x: -15, z: 15 },
      { x: 15, z: -15 }, { x: -15, z: -15 }, { x: 0, z: 20 },
      { x: 0, z: -20 }, { x: 20, z: 0 }, { x: -20, z: 0 },
      { x: 10, z: 10 }, { x: -10, z: -10 }, { x: 5, z: -15 },
    ],
    build: function(scene) {
      var walls = [];
      var sand = dustFloorMat(0xd2b48c);
      var sandDark = dustFloorMat(0xc4a070);
      var sandstone = concreteMat(0xb8a68a);
      var sandstoneDark = concreteMat(0xa08868);
      var wood = woodMat(0x8b6914);
      var woodDark = woodMat(0x6b4e0a);
      var canvas = fabricMat(0xc8b480);
      var metal = metalMat(0x666666);
      var rustMetal = metalMat(0x8b4513);

      // Floor — main + path patches
      var floor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(50, 1, 50), sand));
      floor.position.set(0, -0.5, 0);
      scene.add(floor);
      // Worn path
      D(scene, 3, 0.02, 40, sandDark, 0, 0.01, 0);
      D(scene, 35, 0.02, 3, sandDark, -2, 0.01, 0);

      // Perimeter walls
      var wH = 6, wT = 1;
      [
        [52, wH, wT, 0, wH/2, -25.5],
        [52, wH, wT, 0, wH/2, 25.5],
        [wT, wH, 50, -25.5, wH/2, 0],
        [wT, wH, 50, 25.5, wH/2, 0],
      ].forEach(function(w) { B(scene, walls, w[0], w[1], w[2], sandstone, w[3], w[4], w[5]); });

      // Wall trim / baseboards
      [[52,0.3,0.2, 0,0.15,-25], [52,0.3,0.2, 0,0.15,25],
       [0.2,0.3,50, -25,0.15,0], [0.2,0.3,50, 25,0.15,0]
      ].forEach(function(t) { D(scene, t[0],t[1],t[2], sandstoneDark, t[3],t[4],t[5]); });

      // ── Central market building (small structure) ──
      B(scene, walls, 8, 4, 0.6, sandstone, 0, 2, -5);   // back wall
      B(scene, walls, 0.6, 4, 6, sandstone, -4, 2, -2);   // left wall
      B(scene, walls, 0.6, 4, 6, sandstone, 4, 2, -2);    // right wall
      // Roof slab
      D(scene, 9, 0.3, 7, sandstoneDark, 0, 4.15, -2);

      // ── Market building detail ──
      // Window frame on back wall (z=-5 face)
      D(scene, 1.5, 1.2, 0.1, sandstoneDark, -1.5, 2.5, -4.65);  // frame recess
      D(scene, 1.6, 0.1, 0.12, woodDark, -1.5, 3.15, -4.6);       // top frame
      D(scene, 1.6, 0.1, 0.12, woodDark, -1.5, 1.85, -4.6);       // bottom frame
      D(scene, 0.1, 1.3, 0.12, woodDark, -2.3, 2.5, -4.6);        // left frame
      D(scene, 0.1, 1.3, 0.12, woodDark, -0.7, 2.5, -4.6);        // right frame
      // Shutters
      D(scene, 0.4, 1.2, 0.08, wood, -2.7, 2.5, -4.6);            // left shutter
      D(scene, 0.4, 1.2, 0.08, wood, -0.3, 2.5, -4.6);            // right shutter

      // Window on left wall (x=-4 face)
      D(scene, 0.1, 1.0, 1.2, sandstoneDark, -3.65, 2.5, -3);     // recess
      D(scene, 0.12, 0.1, 1.3, woodDark, -3.6, 3.05, -3);         // top frame
      D(scene, 0.12, 0.1, 1.3, woodDark, -3.6, 1.95, -3);         // bottom frame
      D(scene, 0.12, 1.1, 0.1, woodDark, -3.6, 2.5, -3.6);        // top/bottom
      D(scene, 0.12, 1.1, 0.1, woodDark, -3.6, 2.5, -2.4);

      // Interior counter with goods
      B(scene, walls, 3.5, 0.15, 0.8, wood, 0, 1.0, -3);           // counter surface
      D(scene, 0.15, 1.0, 0.15, woodDark, -1.6, 0.5, -3);          // counter legs
      D(scene, 0.15, 1.0, 0.15, woodDark, 1.6, 0.5, -3);
      P.Sack(scene, -0.5, 1.1, -3, { seed: 35 });                  // goods on counter
      Cyl(scene, 0.15, 0.2, 0.35, 6, concreteMat(0xb5651d), 0.5, 1.3, -3); // pot on counter

      // Plaster crack overlay on interior
      WR(scene, 6, 3, 0.3, sandstone, 0, 2.5, -2, { style: 'plaster_crack' });

      // ── Archway ──
      B(scene, walls, 1.5, 5, 1.5, sandstone, -10, 2.5, 0);  // left pillar
      B(scene, walls, 1.5, 5, 1.5, sandstone, -10, 2.5, 5);  // right pillar
      D(scene, 1.8, 0.6, 6.5, sandstoneDark, -10, 5.3, 2.5); // lintel

      // ── Market stalls ──
      // Stall 1
      B(scene, walls, 3, 0.15, 1.5, wood, 8, 1.0, 8);         // table top
      D(scene, 0.15, 1.0, 0.15, woodDark, 6.6, 0.5, 7.3);    // legs
      D(scene, 0.15, 1.0, 0.15, woodDark, 9.4, 0.5, 7.3);
      D(scene, 0.15, 1.0, 0.15, woodDark, 6.6, 0.5, 8.7);
      D(scene, 0.15, 1.0, 0.15, woodDark, 9.4, 0.5, 8.7);
      D(scene, 3.5, 0.05, 2.0, canvas, 8, 2.8, 8);            // awning
      D(scene, 0.1, 2.8, 0.1, woodDark, 6.5, 1.4, 7);         // awning poles
      D(scene, 0.1, 2.8, 0.1, woodDark, 9.5, 1.4, 7);

      // Stall 2
      B(scene, walls, 2.5, 0.15, 1.5, wood, -6, 1.0, 15);
      D(scene, 0.15, 1.0, 0.15, woodDark, -7.1, 0.5, 14.3);  // legs
      D(scene, 0.15, 1.0, 0.15, woodDark, -4.9, 0.5, 14.3);
      D(scene, 0.15, 1.0, 0.15, woodDark, -7.1, 0.5, 15.7);
      D(scene, 0.15, 1.0, 0.15, woodDark, -4.9, 0.5, 15.7);
      D(scene, 3.0, 0.05, 2.0, canvas, -6, 2.8, 15);
      D(scene, 0.1, 2.8, 0.1, woodDark, -7.2, 1.4, 14);       // awning poles
      D(scene, 0.1, 2.8, 0.1, woodDark, -4.8, 1.4, 14);

      // ── Sandbag positions ──
      var sbMat = concreteMat(0xb5a66e);
      B(scene, walls, 3, 1, 1.2, sbMat, 5, 0.5, -15);
      B(scene, walls, 2.5, 0.8, 1, sbMat, 5, 1.3, -15);
      B(scene, walls, 1.2, 1, 3, sbMat, -15, 0.5, -10);
      B(scene, walls, 1, 0.8, 2.5, sbMat, -15, 1.3, -10);
      B(scene, walls, 3, 1, 1.2, sbMat, 18, 0.5, 10);

      // ── Oil barrels ──
      P.Barrel(scene, walls, -18, 0, -5, { style: 'rusty', seed: 10 });
      P.Barrel(scene, walls, -17, 0, -6.5, { style: 'metal', seed: 11 });
      P.Barrel(scene, walls, 20, 0, 15, { style: 'rusty', seed: 12 });
      P.Barrel(scene, walls, 12, 0, -8, { style: 'metal', seed: 13 });
      P.Barrel(scene, walls, -3, 0, 18, { style: 'rusty', seed: 14 });

      // ── Crates & cover (original + new) ──
      B(scene, walls, 4,3,4, crateMat(0x8b6914,0x332200), 0,1.5,0);
      B(scene, walls, 3,2,3, crateMat(0x9b7924), 5,1,4);
      B(scene, walls, 3,2,3, crateMat(0x8b6914), -5,1,-3);
      B(scene, walls, 2,4,6, crateMat(0xc4a882,0x221100), 12,2,0);
      B(scene, walls, 6,4,2, crateMat(0xc4a882), -12,2,5);
      B(scene, walls, 2,3,2, crateMat(0x9b7924,0x332200), 8,1.5,-10);
      B(scene, walls, 2,3,2, crateMat(0x9b7924), -8,1.5,10);
      B(scene, walls, 8,3,1, crateMat(0xb09060), 0,1.5,-12);
      B(scene, walls, 8,3,1, crateMat(0xb09060,0x221100), 0,1.5,12);
      B(scene, walls, 1,3,8, crateMat(0xb09060), 15,1.5,-15);
      B(scene, walls, 1,3,8, crateMat(0xb09060), -15,1.5,15);
      // Stacked small crates
      B(scene, walls, 1.2,1.2,1.2, wood, 20,0.6,-18);
      B(scene, walls, 1.2,1.2,1.2, woodDark, 20,1.8,-18);
      B(scene, walls, 1.2,1.2,1.2, wood, 21.3,0.6,-18);

      // ── Crate surface detail (banding + brackets on large crates) ──
      // Central large crate (4x3x4 at 0,1.5,0)
      D(scene, 4.05, 0.1, 0.05, metalMat(0x444444), 0, 0.8, 2.01);   // horizontal band front
      D(scene, 4.05, 0.1, 0.05, metalMat(0x444444), 0, 2.2, 2.01);   // upper band front
      D(scene, 0.05, 0.1, 4.05, metalMat(0x444444), 2.01, 0.8, 0);   // band side
      D(scene, 0.05, 0.1, 4.05, metalMat(0x444444), 2.01, 2.2, 0);
      // Corner brackets
      D(scene, 0.15, 0.4, 0.05, metalMat(0x333333), 1.95, 0.2, 2.01);
      D(scene, 0.15, 0.4, 0.05, metalMat(0x333333), -1.95, 0.2, 2.01);
      // Stencil marking
      D(scene, 0.6, 0.4, 0.02, concreteMat(0xeeeecc), 0, 1.5, 2.02);

      // Tall crate (2x4x6 at 12,2,0)
      D(scene, 0.05, 0.1, 6.05, metalMat(0x444444), 13.01, 1.2, 0);
      D(scene, 0.05, 0.1, 6.05, metalMat(0x444444), 13.01, 2.8, 0);
      D(scene, 0.15, 0.4, 0.05, metalMat(0x333333), 13.01, 0.2, 2.95);
      D(scene, 0.15, 0.4, 0.05, metalMat(0x333333), 13.01, 0.2, -2.95);

      // ── Destroyed vehicle ──
      var carMat = metalMat(0x556b2f);
      var carDark = darkMetalMat(0x333333);
      B(scene, walls, 4.5, 1.4, 2.2, carMat, -18, 0.7, 18);    // body
      B(scene, walls, 2.0, 1.0, 2.3, carMat, -16.5, 1.7, 18);  // cabin
      D(scene, 0.8, 0.8, 0.3, carDark, -19.8, 0.4, 17);         // wheels
      D(scene, 0.8, 0.8, 0.3, carDark, -19.8, 0.4, 19);
      D(scene, 0.8, 0.8, 0.3, carDark, -16.2, 0.4, 17);
      D(scene, 0.8, 0.8, 0.3, carDark, -16.2, 0.4, 19);

      // ── Palm trunk stubs (decorative) ──
      P.Tree(scene, walls, 22, 0, -22, { style: 'palm', seed: 1 });
      P.Tree(scene, walls, -22, 0, 20, { style: 'palm', seed: 2 });


      // ── Environmental Details ──

      // Scattered rubble / rocks
      P.Rubble(scene, 3, 0, -18, { seed: 20 });
      P.Rubble(scene, 7, 0, 6, { seed: 21 });
      P.Rubble(scene, -12, 0, 18, { seed: 22 });
      P.Rubble(scene, 18, 0, -12, { seed: 23 });
      P.Rubble(scene, -8, 0, -20, { seed: 24 });
      P.Rubble(scene, 14, 0, 20, { seed: 25 });

      // Broken pottery / scattered items
      var potMat = concreteMat(0xb5651d);
      D(scene, 0.3, 0.02, 0.3, potMat, 7.5, 0.01, 9); // shards near stall
      D(scene, 0.2, 0.02, 0.15, potMat, 7.8, 0.01, 9.2);
      D(scene, 0.15, 0.02, 0.2, potMat, 7.2, 0.01, 8.8);
      // Intact pot near archway
      Cyl(scene, 0.15, 0.2, 0.4, 6, potMat, -10, 0.2, -3);

      // Clothesline between buildings
      D(scene, 0.02, 0.02, 8, fabricMat(0x888888), -4, 3.5, 1);
      D(scene, 0.1, 3.5, 0.1, woodDark, -4, 1.75, 5);            // clothesline post
      // Hanging cloth
      D(scene, 0.6, 0.4, 0.02, fabricMat(0xb0a090), -4, 3.2, 0);
      D(scene, 0.5, 0.35, 0.02, fabricMat(0x8b7355), -4, 3.25, 3);

      // Tire tracks on ground
      D(scene, 1.5, 0.01, 15, floorMat(0xa08858), -18, 0.005, 10);
      D(scene, 1.5, 0.01, 15, floorMat(0xa08858), -16.5, 0.005, 10);

      // Wall damage patches (dark stains)
      D(scene, 1.5, 1.2, 0.05, concreteMat(0x8a7a5a), -25.3, 2, 5);
      D(scene, 1.0, 0.8, 0.05, concreteMat(0x8a7a5a), 25.3, 3, -8);
      D(scene, 0.8, 1.5, 0.05, concreteMat(0x7a6a4a), -25.3, 1.5, -15);

      // ── Perimeter wall window recesses ──
      // North wall
      D(scene, 1.8, 1.5, 0.3, concreteMat(0x6a5a3a), 10, 3, -25.1);  // dark recess
      D(scene, 1.9, 0.1, 0.15, sandstoneDark, 10, 3.8, -25.05);       // lintel
      D(scene, 1.9, 0.1, 0.15, sandstoneDark, 10, 2.2, -25.05);       // sill
      // West wall
      D(scene, 0.3, 1.5, 1.8, concreteMat(0x6a5a3a), -25.1, 3.5, -10); // dark recess
      D(scene, 0.15, 0.1, 1.9, sandstoneDark, -25.05, 4.3, -10);       // lintel
      D(scene, 0.15, 0.1, 1.9, sandstoneDark, -25.05, 2.7, -10);       // sill
      // South wall
      D(scene, 1.8, 1.5, 0.3, concreteMat(0x6a5a3a), -8, 3, 25.1);
      D(scene, 1.9, 0.1, 0.15, sandstoneDark, -8, 3.8, 25.05);
      D(scene, 1.9, 0.1, 0.15, sandstoneDark, -8, 2.2, 25.05);

      // Additional wall damage patches for variation
      WR(scene, 5, 2, 0.3, sandstone, -15, 2.5, -25.05, { style: 'plaster_crack' });
      WR(scene, 4, 1.5, 0.3, sandstone, 18, 3, 25.05, { style: 'plaster_crack' });

      // Scattered debris near vehicle
      D(scene, 0.4, 0.05, 0.3, metalMat(0x444444), -19, 0.03, 16);
      D(scene, 0.2, 0.03, 0.5, metalMat(0x555555), -17, 0.02, 16.5);

      // ── Procedural Props ──
      P.Sack(scene, 7, 0, 9, { seed: 30 });
      P.Sack(scene, -5, 0, 16, { seed: 31 });
      P.Rock(scene, walls, 18, 0, -20, { style: 'sandstone', seed: 40 });
      P.Rock(scene, walls, -20, 0, -15, { style: 'sandstone', seed: 41 });

      // ── Surface Detail ──
      WR(scene, 8, 4, 0.5, sandstone, 0, 2, -5, { style: 'plaster_crack' });
      WR(scene, 12, 4, 0.5, sandstone, -10, 2.5, 2.5, { style: 'brick' });
      FD(scene, 6, 6, sandstone, 8, 0, 8, { style: 'cobblestone' });
      FD(scene, 6, 6, sandstone, -6, 0, 15, { style: 'cobblestone' });

      // Additional detail lights
      addPointLight(scene, 0xffddaa, 0.3, 10, 0, 3.8, -2);

      return walls;
    },
  });
})();
