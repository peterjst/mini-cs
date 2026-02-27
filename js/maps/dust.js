// js/maps/dust.js — Map 1: "Dust" — Desert Market
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadowRecv = H.shadowRecv;
  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
  var dustFloorMat = H.dustFloorMat, concreteMat = H.concreteMat, woodMat = H.woodMat;
  var fabricMat = H.fabricMat, metalMat = H.metalMat, darkMetalMat = H.darkMetalMat;
  var crateMat = H.crateMat, floorMat = H.floorMat;

  GAME._maps.push({
    name: 'Dust',
    size: { x: 50, z: 50 },
    skyColor: 0x87ceeb,
    fogColor: 0xc8b89a,
    fogDensity: 0.012,
    playerSpawn: { x: -20, z: -20 },
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
      D(scene, 0.1, 1.8, 0.1, woodDark, 6.5, 1.9, 7);         // awning poles
      D(scene, 0.1, 1.8, 0.1, woodDark, 9.5, 1.9, 7);

      // Stall 2
      B(scene, walls, 2.5, 0.15, 1.5, wood, -6, 1.0, 15);
      D(scene, 3.0, 0.05, 2.0, canvas, -6, 2.8, 15);
      D(scene, 0.1, 1.8, 0.1, woodDark, -7.2, 1.9, 14);
      D(scene, 0.1, 1.8, 0.1, woodDark, -4.8, 1.9, 14);

      // ── Sandbag positions ──
      var sbMat = concreteMat(0xb5a66e);
      B(scene, walls, 3, 1, 1.2, sbMat, 5, 0.5, -15);
      B(scene, walls, 2.5, 0.8, 1, sbMat, 5, 1.3, -15);
      B(scene, walls, 1.2, 1, 3, sbMat, -15, 0.5, -10);
      B(scene, walls, 1, 0.8, 2.5, sbMat, -15, 1.3, -10);
      B(scene, walls, 3, 1, 1.2, sbMat, 18, 0.5, 10);

      // ── Oil barrels ──
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, rustMetal, -18, 0.6, -5);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, -17, 0.6, -6.5);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, rustMetal, 20, 0.6, 15);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, 12, 0.6, -8);
      // Tipped barrel
      var tipped = Cyl(scene, 0.4, 0.4, 1.2, 8, rustMetal, -3, 0.4, 18);
      tipped.rotation.z = Math.PI / 2;

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
      Cyl(scene, 0.2, 0.25, 4, 6, woodMat(0x8b7355), 22, 2, -22);
      Cyl(scene, 0.2, 0.25, 3.5, 6, woodMat(0x8b7355), -22, 1.75, 20);

      // ── Hanging lights ──
      addHangingLight(scene, 0, 5.5, -2, 0xffeebb);
      addHangingLight(scene, 8, 5.5, 8, 0xffeebb);
      addHangingLight(scene, -15, 5.5, 0, 0xffeebb);

      // ── Environmental Details ──

      // Scattered rubble / rocks
      var rubbleMat = concreteMat(0x9a8a6a);
      [[3,0.3,-18],[7,0.2,6],[-12,0.15,18],[18,0.25,-12],[-8,0.2,-20],[14,0.3,20]].forEach(function(r) {
        var sz = 0.15 + Math.random() * 0.25;
        D(scene, sz, sz*0.6, sz, rubbleMat, r[0], r[1], r[2]);
      });

      // Broken pottery / scattered items
      var potMat = concreteMat(0xb5651d);
      D(scene, 0.3, 0.02, 0.3, potMat, 7.5, 0.01, 9); // shards near stall
      D(scene, 0.2, 0.02, 0.15, potMat, 7.8, 0.01, 9.2);
      D(scene, 0.15, 0.02, 0.2, potMat, 7.2, 0.01, 8.8);
      // Intact pot near archway
      Cyl(scene, 0.15, 0.2, 0.4, 6, potMat, -10, 0.2, -3);

      // Clothesline between buildings
      D(scene, 0.02, 0.02, 14, fabricMat(0x888888), -4, 3.5, 5);
      // Hanging cloth
      D(scene, 0.6, 0.4, 0.02, fabricMat(0xb0a090), -4, 3.2, 3);
      D(scene, 0.5, 0.35, 0.02, fabricMat(0x8b7355), -4, 3.25, 7);

      // Tire tracks on ground
      D(scene, 1.5, 0.01, 15, floorMat(0xa08858), -18, 0.005, 10);
      D(scene, 1.5, 0.01, 15, floorMat(0xa08858), -16.5, 0.005, 10);

      // Wall damage patches (dark stains)
      D(scene, 1.5, 1.2, 0.05, concreteMat(0x8a7a5a), -25.3, 2, 5);
      D(scene, 1.0, 0.8, 0.05, concreteMat(0x8a7a5a), 25.3, 3, -8);
      D(scene, 0.8, 1.5, 0.05, concreteMat(0x7a6a4a), -25.3, 1.5, -15);

      // Scattered debris near vehicle
      D(scene, 0.4, 0.05, 0.3, metalMat(0x444444), -19, 0.03, 16);
      D(scene, 0.2, 0.03, 0.5, metalMat(0x555555), -17, 0.02, 16.5);

      // Additional detail lights
      addHangingLight(scene, -10, 5.3, 2.5, 0xffeebb);
      addPointLight(scene, 0xffddaa, 0.3, 10, 0, 3.8, -2);

      return walls;
    },
  });
})();
