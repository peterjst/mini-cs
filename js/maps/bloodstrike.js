// js/maps/bloodstrike.js — Map 4: "Bloodstrike" — Rectangular Loop Arena
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadow = H.shadow, shadowRecv = H.shadowRecv;
  var buildStairs = H.buildStairs;
  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;
  var concreteMat = H.concreteMat, ceilingMat = H.ceilingMat;
  var metalMat = H.metalMat, darkMetalMat = H.darkMetalMat;
  var crateMat = H.crateMat, emissiveMat = H.emissiveMat;

  GAME._maps.push({
    name: 'Bloodstrike',
    size: { x: 60, z: 44 },
    skyColor: 0xc8a878,
    fogColor: 0xb09070,
    fogDensity: 0.006,
    playerSpawn: { x: -24, z: -14 },
    botSpawns: [
      { x: 24, z: 14 },
      { x: 24, z: -14 },
      { x: -24, z: 14 },
    ],
    waypoints: [
      // Loop corridor waypoints (outer rectangle)
      { x: -24, z: -14 }, { x: -12, z: -14 }, { x: 0, z: -14 },
      { x: 12, z: -14 }, { x: 24, z: -14 },
      { x: 26, z: -8 }, { x: 26, z: 0 }, { x: 26, z: 8 },
      { x: 24, z: 14 }, { x: 12, z: 14 }, { x: 0, z: 14 },
      { x: -12, z: 14 }, { x: -24, z: 14 },
      { x: -26, z: 8 }, { x: -26, z: 0 }, { x: -26, z: -8 },
      // Corner elevated waypoints
      { x: -24, z: -14, y: 3 }, { x: 24, z: -14, y: 3 },
      { x: 24, z: 14, y: 3 }, { x: -24, z: 14, y: 3 },
    ],
    build: function(scene) {
      var walls = [];

      // ── Materials (warm tan/beige concrete — authentic bloodstrike palette) ──
      var floorMain = concreteMat(0x9e8a6e);       // warm tan concrete floor
      var floorDark = concreteMat(0x8a7458);        // darker worn paths
      var wallTan = concreteMat(0xb8a080);          // main tan walls (like screenshot)
      var wallTanDark = concreteMat(0x9a8060);      // darker tan for accents
      var wallTanLight = concreteMat(0xc8b090);     // lighter tan highlights
      var brickMat = concreteMat(0x8b4a3a);         // reddish-brown brick accents
      var brickDark = concreteMat(0x6b3a2a);        // dark brick
      var trimMat = concreteMat(0x706050);          // baseboards / trim
      var ceilMat = ceilingMat(0xa89878);           // warm ceiling
      var metal = metalMat(0x666666);
      var darkMetal = darkMetalMat(0x444444);
      var crate = crateMat(0x6b4e0a, 0x221100);
      var crateDark = crateMat(0x5a3d08);
      var crateGreen = crateMat(0x3a5a2a, 0x112200);

      // ── Layout constants ──
      // Outer rectangle: 60 x 44, corridor width ~8
      // Inner block: 44 x 28 (centered), creating the loop
      var outerW = 60, outerD = 44;
      var innerW = 40, innerD = 24;
      var corrW = 8; // corridor width
      var wH = 7, wT = 1;
      var elevH = 3; // elevated corner platform height

      // ── Floor (full area) ──
      var floor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(outerW + 2, 1, outerD + 2), floorMain));
      floor.position.set(0, -0.5, 0);
      scene.add(floor);

      // Worn path markings along the loop (wider for visibility)
      D(scene, outerW - 4, 0.02, 2.0, floorDark, 0, 0.01, -14);
      D(scene, outerW - 4, 0.02, 2.0, floorDark, 0, 0.01, 14);
      D(scene, 2.0, 0.02, outerD - 8, floorDark, -26, 0.01, 0);
      D(scene, 2.0, 0.02, outerD - 8, floorDark, 26, 0.01, 0);

      // Cross-corridor floor markings at corner intersections
      var floorPatch = concreteMat(0x877358);
      D(scene, 6, 0.02, 6, floorPatch, -24, 0.01, -14);
      D(scene, 6, 0.02, 6, floorPatch, 24, 0.01, -14);
      D(scene, 6, 0.02, 6, floorPatch, 24, 0.01, 14);
      D(scene, 6, 0.02, 6, floorPatch, -24, 0.01, 14);

      // Concrete weathering patches
      var weatherPatch = concreteMat(0x8a7a5e);
      D(scene, 3, 0.02, 2.5, weatherPatch, -8, 0.01, -15);
      D(scene, 3, 0.02, 2.5, weatherPatch, 12, 0.01, 15);
      D(scene, 2.5, 0.02, 3, weatherPatch, -27, 0.01, 4);
      D(scene, 2.5, 0.02, 3, weatherPatch, 27, 0.01, -4);

      // Drain grates (small dark rectangles)
      var grateMat = concreteMat(0x3a3a3a);
      D(scene, 0.8, 0.02, 0.5, grateMat, 0, 0.015, -14);
      D(scene, 0.8, 0.02, 0.5, grateMat, 0, 0.015, 14);
      D(scene, 0.5, 0.02, 0.8, grateMat, -26, 0.015, 0);
      D(scene, 0.5, 0.02, 0.8, grateMat, 26, 0.015, 0);

      // ── Ceiling ──
      var ceiling = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(outerW + 2, 0.5, outerD + 2), ceilMat));
      ceiling.position.set(0, wH + 0.25, 0);
      scene.add(ceiling);

      // ── Outer perimeter walls ──
      // North & South
      B(scene, walls, outerW + 2, wH, wT, wallTan, 0, wH/2, -(outerD/2 + 0.5));
      B(scene, walls, outerW + 2, wH, wT, wallTan, 0, wH/2, outerD/2 + 0.5);
      // East & West
      B(scene, walls, wT, wH, outerD, wallTan, -(outerW/2 + 0.5), wH/2, 0);
      B(scene, walls, wT, wH, outerD, wallTan, outerW/2 + 0.5, wH/2, 0);

      // ── Thick horizontal trim bands on outer walls (CS 1.6 style) ──
      var trimBand = concreteMat(0x7a6850);
      var trimThin = concreteMat(0x857460);
      // Lower trim band at y~1.8, upper trim band at y~4.2, thin middle at y~3.0
      // North & South outer walls
      D(scene, outerW, 0.35, 0.2, trimBand, 0, 1.8, -(outerD/2 + 0.05));
      D(scene, outerW, 0.35, 0.2, trimBand, 0, 1.8, outerD/2 + 0.05);
      D(scene, outerW, 0.35, 0.2, trimBand, 0, 4.2, -(outerD/2 + 0.05));
      D(scene, outerW, 0.35, 0.2, trimBand, 0, 4.2, outerD/2 + 0.05);
      D(scene, outerW, 0.15, 0.12, trimThin, 0, 3.0, -(outerD/2 + 0.03));
      D(scene, outerW, 0.15, 0.12, trimThin, 0, 3.0, outerD/2 + 0.03);
      // East & West outer walls
      D(scene, 0.2, 0.35, outerD, trimBand, -(outerW/2 + 0.05), 1.8, 0);
      D(scene, 0.2, 0.35, outerD, trimBand, outerW/2 + 0.05, 1.8, 0);
      D(scene, 0.2, 0.35, outerD, trimBand, -(outerW/2 + 0.05), 4.2, 0);
      D(scene, 0.2, 0.35, outerD, trimBand, outerW/2 + 0.05, 4.2, 0);
      D(scene, 0.12, 0.15, outerD, trimThin, -(outerW/2 + 0.03), 3.0, 0);
      D(scene, 0.12, 0.15, outerD, trimThin, outerW/2 + 0.03, 3.0, 0);

      // ── Wall color banding on outer walls (darker bottom, lighter top) ──
      var bandBottom = concreteMat(0xa08868);  // darker bottom band
      var bandTop = concreteMat(0xc8b898);     // lighter top band
      // North & South: bottom band (floor to 1.6), top band (4.4 to ceiling)
      D(scene, outerW, 1.4, 0.1, bandBottom, 0, 0.9, -(outerD/2 + 0.06));
      D(scene, outerW, 1.4, 0.1, bandBottom, 0, 0.9, outerD/2 + 0.06);
      D(scene, outerW, 2.4, 0.1, bandTop, 0, 5.6, -(outerD/2 + 0.06));
      D(scene, outerW, 2.4, 0.1, bandTop, 0, 5.6, outerD/2 + 0.06);
      // East & West
      D(scene, 0.1, 1.4, outerD, bandBottom, -(outerW/2 + 0.06), 0.9, 0);
      D(scene, 0.1, 1.4, outerD, bandBottom, outerW/2 + 0.06, 0.9, 0);
      D(scene, 0.1, 2.4, outerD, bandTop, -(outerW/2 + 0.06), 5.6, 0);
      D(scene, 0.1, 2.4, outerD, bandTop, outerW/2 + 0.06, 5.6, 0);

      // ── Baseboards ──
      D(scene, outerW + 2, 0.3, 0.15, trimMat, 0, 0.15, -(outerD/2));
      D(scene, outerW + 2, 0.3, 0.15, trimMat, 0, 0.15, outerD/2);
      D(scene, 0.15, 0.3, outerD, trimMat, -(outerW/2), 0.15, 0);
      D(scene, 0.15, 0.3, outerD, trimMat, outerW/2, 0.15, 0);

      // ── Inner block (creates the rectangular loop) ──
      var ibx = innerW/2, ibz = innerD/2;

      // Inner walls (facing corridors)
      B(scene, walls, innerW, wH, wT, wallTanDark, 0, wH/2, -(ibz + 0.5));
      B(scene, walls, innerW, wH, wT, wallTanDark, 0, wH/2, ibz + 0.5);
      B(scene, walls, wT, wH, innerD, wallTanDark, -(ibx + 0.5), wH/2, 0);
      B(scene, walls, wT, wH, innerD, wallTanDark, ibx + 0.5, wH/2, 0);

      // Inner wall thick trim bands (matching outer walls)
      D(scene, innerW, 0.35, 0.2, trimBand, 0, 1.8, -(ibz + 0.05));
      D(scene, innerW, 0.35, 0.2, trimBand, 0, 1.8, ibz + 0.05);
      D(scene, innerW, 0.35, 0.2, trimBand, 0, 4.2, -(ibz + 0.05));
      D(scene, innerW, 0.35, 0.2, trimBand, 0, 4.2, ibz + 0.05);
      D(scene, innerW, 0.15, 0.12, trimThin, 0, 3.0, -(ibz + 0.03));
      D(scene, innerW, 0.15, 0.12, trimThin, 0, 3.0, ibz + 0.03);
      D(scene, 0.2, 0.35, innerD, trimBand, -(ibx + 0.05), 1.8, 0);
      D(scene, 0.2, 0.35, innerD, trimBand, ibx + 0.05, 1.8, 0);
      D(scene, 0.2, 0.35, innerD, trimBand, -(ibx + 0.05), 4.2, 0);
      D(scene, 0.2, 0.35, innerD, trimBand, ibx + 0.05, 4.2, 0);
      D(scene, 0.12, 0.15, innerD, trimThin, -(ibx + 0.03), 3.0, 0);
      D(scene, 0.12, 0.15, innerD, trimThin, ibx + 0.03, 3.0, 0);
      // Inner wall color banding
      D(scene, innerW, 1.4, 0.1, bandBottom, 0, 0.9, -(ibz + 0.06));
      D(scene, innerW, 1.4, 0.1, bandBottom, 0, 0.9, ibz + 0.06);
      D(scene, innerW, 2.4, 0.1, bandTop, 0, 5.6, -(ibz + 0.06));
      D(scene, innerW, 2.4, 0.1, bandTop, 0, 5.6, ibz + 0.06);
      D(scene, 0.1, 1.4, innerD, bandBottom, -(ibx + 0.06), 0.9, 0);
      D(scene, 0.1, 1.4, innerD, bandBottom, ibx + 0.06, 0.9, 0);
      D(scene, 0.1, 2.4, innerD, bandTop, -(ibx + 0.06), 5.6, 0);
      D(scene, 0.1, 2.4, innerD, bandTop, ibx + 0.06, 5.6, 0);

      // Inner wall baseboards
      D(scene, innerW, 0.3, 0.15, trimMat, 0, 0.15, -(ibz));
      D(scene, innerW, 0.3, 0.15, trimMat, 0, 0.15, ibz);
      D(scene, 0.15, 0.3, innerD, trimMat, -(ibx), 0.15, 0);
      D(scene, 0.15, 0.3, innerD, trimMat, ibx, 0.15, 0);

      // Inner block fill (solid top to prevent seeing inside)
      var innerFill = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(innerW, 0.5, innerD), ceilMat));
      innerFill.position.set(0, wH + 0.25, 0);
      scene.add(innerFill);

      // ── Large brick accent panels on inner walls (CS 1.6 style) ──
      var brickBorder = concreteMat(0x5a2a1a);
      // North inner wall
      D(scene, 10, 2.8, 0.12, brickMat, -10, 2.2, -(ibz + 0.08));
      D(scene, 10.4, 0.08, 0.14, brickBorder, -10, 0.82, -(ibz + 0.09));
      D(scene, 10.4, 0.08, 0.14, brickBorder, -10, 3.62, -(ibz + 0.09));
      D(scene, 0.08, 2.8, 0.14, brickBorder, -15.2, 2.2, -(ibz + 0.09));
      D(scene, 0.08, 2.8, 0.14, brickBorder, -4.8, 2.2, -(ibz + 0.09));
      D(scene, 10, 2.8, 0.12, brickMat, 10, 2.2, -(ibz + 0.08));
      D(scene, 10.4, 0.08, 0.14, brickBorder, 10, 0.82, -(ibz + 0.09));
      D(scene, 10.4, 0.08, 0.14, brickBorder, 10, 3.62, -(ibz + 0.09));
      D(scene, 0.08, 2.8, 0.14, brickBorder, 4.8, 2.2, -(ibz + 0.09));
      D(scene, 0.08, 2.8, 0.14, brickBorder, 15.2, 2.2, -(ibz + 0.09));
      // South inner wall
      D(scene, 10, 2.8, 0.12, brickMat, -10, 2.2, ibz + 0.08);
      D(scene, 10.4, 0.08, 0.14, brickBorder, -10, 0.82, ibz + 0.09);
      D(scene, 10.4, 0.08, 0.14, brickBorder, -10, 3.62, ibz + 0.09);
      D(scene, 0.08, 2.8, 0.14, brickBorder, -15.2, 2.2, ibz + 0.09);
      D(scene, 0.08, 2.8, 0.14, brickBorder, -4.8, 2.2, ibz + 0.09);
      D(scene, 10, 2.8, 0.12, brickMat, 10, 2.2, ibz + 0.08);
      D(scene, 10.4, 0.08, 0.14, brickBorder, 10, 0.82, ibz + 0.09);
      D(scene, 10.4, 0.08, 0.14, brickBorder, 10, 3.62, ibz + 0.09);
      D(scene, 0.08, 2.8, 0.14, brickBorder, 4.8, 2.2, ibz + 0.09);
      D(scene, 0.08, 2.8, 0.14, brickBorder, 15.2, 2.2, ibz + 0.09);
      // East/West inner wall brick panels
      D(scene, 0.12, 2.8, 8, brickMat, -(ibx + 0.08), 2.2, 0);
      D(scene, 0.14, 0.08, 8.4, brickBorder, -(ibx + 0.09), 0.82, 0);
      D(scene, 0.14, 0.08, 8.4, brickBorder, -(ibx + 0.09), 3.62, 0);
      D(scene, 0.12, 2.8, 8, brickMat, ibx + 0.08, 2.2, 0);
      D(scene, 0.14, 0.08, 8.4, brickBorder, ibx + 0.09, 0.82, 0);
      D(scene, 0.14, 0.08, 8.4, brickBorder, ibx + 0.09, 3.62, 0);

      // ── Large brick accent panels on outer walls ──
      D(scene, 12, 3.2, 0.12, brickMat, -15, 2.2, -(outerD/2 - 0.08));
      D(scene, 12.4, 0.08, 0.14, brickBorder, -15, 0.62, -(outerD/2 - 0.09));
      D(scene, 12.4, 0.08, 0.14, brickBorder, -15, 3.82, -(outerD/2 - 0.09));
      D(scene, 12, 3.2, 0.12, brickMat, 15, 2.2, -(outerD/2 - 0.08));
      D(scene, 12.4, 0.08, 0.14, brickBorder, 15, 0.62, -(outerD/2 - 0.09));
      D(scene, 12.4, 0.08, 0.14, brickBorder, 15, 3.82, -(outerD/2 - 0.09));
      D(scene, 12, 3.2, 0.12, brickMat, -15, 2.2, outerD/2 - 0.08);
      D(scene, 12.4, 0.08, 0.14, brickBorder, -15, 0.62, outerD/2 - 0.09);
      D(scene, 12.4, 0.08, 0.14, brickBorder, -15, 3.82, outerD/2 - 0.09);
      D(scene, 12, 3.2, 0.12, brickMat, 15, 2.2, outerD/2 - 0.08);
      D(scene, 12.4, 0.08, 0.14, brickBorder, 15, 0.62, outerD/2 - 0.09);
      D(scene, 12.4, 0.08, 0.14, brickBorder, 15, 3.82, outerD/2 - 0.09);
      // East/West outer walls
      D(scene, 0.12, 3.2, 10, brickDark, -(outerW/2 - 0.08), 2.2, -8);
      D(scene, 0.12, 3.2, 10, brickDark, -(outerW/2 - 0.08), 2.2, 8);
      D(scene, 0.12, 3.2, 10, brickDark, outerW/2 - 0.08, 2.2, -8);
      D(scene, 0.12, 3.2, 10, brickDark, outerW/2 - 0.08, 2.2, 8);

      // ── Corner elevated platforms (4 corners with stairs) ──
      var platMat = concreteMat(0x8a7a60);
      var platW = 8, platD = 8;

      var corners = [
        [-24, -14, 'x+', 'z+'],  // NW corner
        [24, -14, 'x-', 'z+'],   // NE corner
        [24, 14, 'x-', 'z-'],    // SE corner
        [-24, 14, 'x+', 'z-'],   // SW corner
      ];

      var barrierMat = concreteMat(0x8a7a60);
      var sandbagMat = concreteMat(0x7a6a48);
      corners.forEach(function(c) {
        var cx = c[0], cz = c[1];
        // Platform slab
        B(scene, walls, platW, 0.4, platD, platMat, cx, elevH, cz);

        // Concrete barrier walls on inner edges
        var rx = cx > 0 ? cx - platW/2 : cx + platW/2;
        var rz = cz > 0 ? cz - platD/2 : cz + platD/2;
        B(scene, walls, platW, 1.2, 0.4, barrierMat, cx, elevH + 0.8, rz);
        D(scene, platW, 0.08, 0.5, trimBand, cx, elevH + 1.44, rz);
        B(scene, walls, 0.4, 1.2, platD, barrierMat, rx, elevH + 0.8, cz);
        D(scene, 0.5, 0.08, platD, trimBand, rx, elevH + 1.44, cz);

        // Crate stack on platform
        var crateOffX = cx + 2 * Math.sign(cx);
        var crateOffZ = cz + 2 * Math.sign(cz);
        B(scene, walls, 1.5, 1.2, 1.5, crate, crateOffX, elevH + 0.8, crateOffZ);
        B(scene, walls, 1, 0.8, 1, crateDark, crateOffX + 0.2, elevH + 2.0, crateOffZ - 0.1);

        // Sandbag cover at stair top
        var sbx = cx + (c[2] === 'x+' ? 3.5 : -3.5);
        var sbz = cz + (c[3] === 'z+' ? -0.5 : 0.5);
        D(scene, 2.0, 0.5, 1.0, sandbagMat, sbx, elevH + 0.45, sbz);

        // Support columns under platforms
        var colMat = concreteMat(0x7a6a50);
        D(scene, 0.5, elevH, 0.5, colMat, cx - 3, elevH/2, cz - 3 * Math.sign(cz));
        D(scene, 0.5, elevH, 0.5, colMat, cx + 3, elevH/2, cz - 3 * Math.sign(cz));
        D(scene, 0.5, elevH, 0.5, colMat, cx - 3 * Math.sign(cx), elevH/2, cz - 3);
        D(scene, 0.5, elevH, 0.5, colMat, cx - 3 * Math.sign(cx), elevH/2, cz + 3);

        // Stairs
        buildStairs(scene, walls, cx, cz, 0, elevH, 3, c[2]);
      });

      // ── Short cover walls along corridors ──
      B(scene, walls, 4, 1.8, 0.5, wallTanLight, -8, 0.9, -14);
      B(scene, walls, 4, 1.8, 0.5, wallTanLight, 8, 0.9, -14);
      B(scene, walls, 3, 1.4, 0.5, wallTanLight, 0, 0.7, -16);
      B(scene, walls, 4, 1.8, 0.5, wallTanLight, -8, 0.9, 14);
      B(scene, walls, 4, 1.8, 0.5, wallTanLight, 8, 0.9, 14);
      B(scene, walls, 3, 1.4, 0.5, wallTanLight, 0, 0.7, 16);
      B(scene, walls, 0.5, 1.8, 4, wallTanLight, -26, 0.9, -3);
      B(scene, walls, 0.5, 1.8, 4, wallTanLight, -26, 0.9, 5);
      B(scene, walls, 0.5, 1.8, 4, wallTanLight, 26, 0.9, 3);
      B(scene, walls, 0.5, 1.8, 4, wallTanLight, 26, 0.9, -5);

      // ── Stacked crate clusters in corridors ──
      // North corridor
      B(scene, walls, 2, 1.5, 2, crate, -16, 0.75, -15);
      B(scene, walls, 1.2, 1.0, 1.2, crateDark, -15.7, 2.0, -15.2);
      B(scene, walls, 2, 1.5, 2, crateGreen, -6, 0.75, -13);
      B(scene, walls, 1.5, 1.0, 1.5, crate, 10, 0.5, -15);
      B(scene, walls, 1.0, 0.8, 1.0, crateDark, 10.2, 1.3, -14.8);
      B(scene, walls, 2, 1.5, 2, crateDark, 16, 0.75, -13);
      B(scene, walls, 1.2, 1.0, 1.2, crateGreen, 16.3, 2.0, -12.8);
      // South corridor
      B(scene, walls, 2, 1.5, 2, crateGreen, 16, 0.75, 15);
      B(scene, walls, 1.2, 1.0, 1.2, crate, 15.7, 2.0, 15.2);
      B(scene, walls, 1.5, 1.0, 1.5, crateDark, 6, 0.5, 13);
      B(scene, walls, 2, 1.5, 2, crate, -10, 0.75, 15);
      B(scene, walls, 1.0, 0.8, 1.0, crateGreen, -9.8, 1.3, 14.8);
      B(scene, walls, 1.5, 1.0, 1.5, crateDark, -16, 0.5, 13);
      // West corridor
      B(scene, walls, 2, 1.5, 2, crate, -27, 0.75, 0);
      B(scene, walls, 1.2, 1.0, 1.2, crateDark, -26.7, 2.0, 0.2);
      B(scene, walls, 2, 1.2, 2, crateGreen, -25, 0.6, -7);
      B(scene, walls, 1.0, 0.8, 1.0, crate, -25.3, 1.6, -6.8);
      // East corridor
      B(scene, walls, 2, 1.5, 2, crateGreen, 27, 0.75, 0);
      B(scene, walls, 1.2, 1.0, 1.2, crate, 27.3, 2.0, -0.2);
      B(scene, walls, 2, 1.2, 2, crateDark, 25, 0.6, 7);
      B(scene, walls, 1.0, 0.8, 1.0, crateGreen, 24.7, 1.6, 7.2);

      // ── Oil barrel groups ──
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, -4, 0.6, -14);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, darkMetal, -3.1, 0.6, -14.6);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, 4, 0.6, 14);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, 4.9, 0.6, 14.5);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, darkMetal, 3.5, 0.6, 15.0);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, darkMetal, -28, 0.6, -5);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, -27.2, 0.6, -5.5);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, darkMetal, 28, 0.6, 5);
      CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, 27.2, 0.6, 5.5);
      // Tipped/fallen barrels
      var tippedBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8), darkMetal);
      tippedBarrel.rotation.z = Math.PI / 2;
      tippedBarrel.position.set(13, 0.4, -16);
      shadow(tippedBarrel);
      scene.add(tippedBarrel);
      var tippedBarrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8), metal);
      tippedBarrel2.rotation.x = Math.PI / 2;
      tippedBarrel2.position.set(-13, 0.4, 15);
      shadow(tippedBarrel2);
      scene.add(tippedBarrel2);

      // ── Wall alcoves / recesses on inner walls ──
      var alcoveMat = concreteMat(0x8a7a60);
      var alcoveBack = concreteMat(0x7a6a50);
      D(scene, 3, 3.5, 0.5, alcoveMat, 0, 2.5, -(ibz - 0.2));
      D(scene, 2.8, 3.3, 0.05, alcoveBack, 0, 2.5, -(ibz + 0.05));
      D(scene, 3, 3.5, 0.5, alcoveMat, 0, 2.5, ibz - 0.2);
      D(scene, 2.8, 3.3, 0.05, alcoveBack, 0, 2.5, ibz + 0.05);
      D(scene, 0.5, 3.5, 3, alcoveMat, ibx - 0.2, 2.5, 0);
      D(scene, 0.05, 3.3, 2.8, alcoveBack, ibx + 0.05, 2.5, 0);
      D(scene, 0.5, 3.5, 3, alcoveMat, -(ibx - 0.2), 2.5, 0);
      D(scene, 0.05, 3.3, 2.8, alcoveBack, -(ibx + 0.05), 2.5, 0);

      // ── Wall pipes ──
      Cyl(scene, 0.06, 0.06, outerW, 6, darkMetal, 0, 5.8, -(outerD/2 - 0.2));
      Cyl(scene, 0.06, 0.06, outerW, 6, darkMetal, 0, 5.8, outerD/2 - 0.2);
      [[-outerW/2 + 0.3, -(outerD/2 - 0.3)],
       [-outerW/2 + 0.3, outerD/2 - 0.3],
       [outerW/2 - 0.3, -(outerD/2 - 0.3)],
       [outerW/2 - 0.3, outerD/2 - 0.3]].forEach(function(p) {
        Cyl(scene, 0.08, 0.08, wH, 6, darkMetal, p[0], wH/2, p[1]);
      });

      // ── Blood splatters / stains ──
      var bloodStain = concreteMat(0x5a1a0a);
      D(scene, 1.5, 1.2, 0.05, bloodStain, 10, 2.5, -(ibz + 0.15));
      D(scene, 0.05, 1.0, 1.5, bloodStain, -(ibx + 0.15), 1.5, 5);
      D(scene, 1.2, 0.02, 1.8, bloodStain, -20, 0.01, -14);
      D(scene, 1.5, 0.02, 1.2, bloodStain, 18, 0.01, 14);
      D(scene, 0.05, 1.2, 1.0, bloodStain, outerW/2 - 0.1, 2, -6);
      D(scene, 1.0, 1.5, 0.05, bloodStain, -8, 3, outerD/2 - 0.1);

      // ── Ceiling lights (warm amber industrial) ──
      var lightColor = 0xffd8a0;
      addHangingLight(scene, -14, wH - 0.5, -14, lightColor);
      addHangingLight(scene, 0, wH - 0.5, -14, lightColor);
      addHangingLight(scene, 14, wH - 0.5, -14, lightColor);
      addHangingLight(scene, -14, wH - 0.5, 14, lightColor);
      addHangingLight(scene, 0, wH - 0.5, 14, lightColor);
      addHangingLight(scene, 14, wH - 0.5, 14, lightColor);
      addHangingLight(scene, -26, wH - 0.5, -6, lightColor);
      addHangingLight(scene, -26, wH - 0.5, 6, lightColor);
      addHangingLight(scene, 26, wH - 0.5, -6, lightColor);
      addHangingLight(scene, 26, wH - 0.5, 6, lightColor);
      addHangingLight(scene, -24, wH - 0.5, -14, lightColor);
      addHangingLight(scene, 24, wH - 0.5, -14, lightColor);
      addHangingLight(scene, 24, wH - 0.5, 14, lightColor);
      addHangingLight(scene, -24, wH - 0.5, 14, lightColor);

      // Fill lights
      addPointLight(scene, 0xffccaa, 1.0, 25, -26, 4, 0);
      addPointLight(scene, 0xffccaa, 1.0, 25, 26, 4, 0);
      addPointLight(scene, 0xffccaa, 0.8, 25, 0, 4, -14);
      addPointLight(scene, 0xffccaa, 0.8, 25, 0, 4, 14);
      addPointLight(scene, 0xffeedd, 0.6, 15, -24, elevH + 1, -14);
      addPointLight(scene, 0xffeedd, 0.6, 15, 24, elevH + 1, -14);
      addPointLight(scene, 0xffeedd, 0.6, 15, 24, elevH + 1, 14);
      addPointLight(scene, 0xffeedd, 0.6, 15, -24, elevH + 1, 14);

      // ── Fluorescent fixtures ──
      [[-18, -14], [-6, -14], [6, -14], [18, -14],
       [-18, 14], [-6, 14], [6, 14], [18, 14]].forEach(function(p) {
        D(scene, 2.5, 0.08, 0.3, emissiveMat(0xffffff, 0xffeedd, 1.5), p[0], wH - 0.05, p[1]);
      });
      [[-26, -8], [-26, 8], [26, -8], [26, 8]].forEach(function(p) {
        D(scene, 0.3, 0.08, 2.5, emissiveMat(0xffffff, 0xffeedd, 1.5), p[0], wH - 0.05, p[1]);
      });

      // ── Scattered debris ──
      var rubbleMat = concreteMat(0x6a5a40);
      [[12, 0.12, -15], [-10, 0.1, 13], [27, 0.15, -2], [-27, 0.12, 3],
       [-5, 0.1, -16], [7, 0.15, 15]].forEach(function(r) {
        var sz = 0.12 + Math.random() * 0.2;
        D(scene, sz, sz*0.5, sz, rubbleMat, r[0], r[1], r[2]);
      });

      // ── Yellow warning stripes near corners ──
      var warnMat = emissiveMat(0xccaa00, 0x887700, 0.3);
      D(scene, 0.3, 0.02, 4, warnMat, -20, 0.01, -14);
      D(scene, 0.3, 0.02, 4, warnMat, 20, 0.01, -14);
      D(scene, 0.3, 0.02, 4, warnMat, -20, 0.01, 14);
      D(scene, 0.3, 0.02, 4, warnMat, 20, 0.01, 14);

      return walls;
    },
  });
})();
