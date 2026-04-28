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
  var WR = H.WallRelief, FD = H.FloorDetail;
  var P = GAME._props;

  GAME._maps.push({
    name: 'Bloodstrike',
    lighting: {
      sunColor: 0xfff8f0,
      sunIntensity: 1.0,
      sunPos: [15, 25, 10],
      fillColor: 0xd0d0d0,
      fillIntensity: 0.4,
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
      saturation: 1.1,
      vignetteStrength: 0.2
    },
    size: { x: 60, z: 44 },
    skyColor: 0xc8a878,
    fogColor: 0xb09070,
    fogDensity: 0.006,
    playerSpawn: { x: -24, z: -18 },
    spawnZones: [
      { x: -24, z: -18, radius: 4, label: 'ct' },
      { x: 24, z: 18, radius: 4, label: 't' },
      // Placed in the north corridor outer lane — the map's rectangular loop
      // has no accessible geometric center (the inner block x:-20..20, z:-12..12
      // is fully enclosed by walls), so 'mid' lives on the outer path instead.
      { x: 0, z: -18, radius: 2, label: 'mid' }
    ],
    botSpawns: [
      { x: 24, z: 18 },
      { x: 22, z: -16 },   // was { x: 26, z: -18 } — moved away from NE cover
      { x: -22, z: 16 },   // was { x: -26, z: 18 } — moved away from SW cover
    ],
    ctSpawns: [
      { x: -24, z: -18 }, { x: -22, z: -18 }, { x: -26, z: -16 },
      { x: -20, z: -18 }, { x: -26, z: -18 }
    ],
    tSpawns: [
      { x: 24, z: 18 }, { x: 22, z: 18 }, { x: 26, z: 16 },
      { x: 20, z: 18 }, { x: 26, z: 18 }
    ],
    bombsites: [
      { name: 'A', x: 12, z: -14, radius: 4 },
      { name: 'B', x: -12, z: 14, radius: 4 }
    ],
    waypoints: [
      // North corridor
      { x: -14, z: -14 }, { x: 0, z: -14 }, { x: 14, z: -14 },
      // North corridor outer lane
      { x: -20, z: -18 }, { x: 20, z: -18 },
      // NW corner (kept platform)
      { x: -26, z: -18 },
      // NE corner (ground-level cover, was platform)
      { x: 24, z: -16 },
      // SE corner (kept platform)
      { x: 26, z: 18 },
      // SW corner (ground-level cover, was platform)
      { x: -24, z: 16 },
      // East corridor
      { x: 26, z: -8 }, { x: 26, z: 0 }, { x: 26, z: 8 },
      // South corridor
      { x: -14, z: 14 }, { x: 0, z: 14 }, { x: 14, z: 14 },
      // South corridor outer lane
      { x: -20, z: 18 }, { x: 20, z: 18 },
      // West corridor
      { x: -26, z: 8 }, { x: -26, z: 0 }, { x: -26, z: -8 },
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
      // N/S walls extended by 2*wT so they overlap E/W walls at corners (prevents diagonal gap)
      B(scene, walls, innerW + 2 * wT, wH, wT, wallTanDark, 0, wH/2, -(ibz + 0.5));
      B(scene, walls, innerW + 2 * wT, wH, wT, wallTanDark, 0, wH/2, ibz + 0.5);
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

      // Inner block fill (solid floor-to-ceiling block — the interior is fully enclosed)
      var innerFill = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(innerW, wH, innerD), wallTanDark));
      innerFill.position.set(0, wH/2, 0);
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

      // ── Outer wall gap detail ──
      // Ventilation grates
      D(scene, 1.2, 0.8, 0.1, concreteMat(0x3a3a3a), 0, 5.0, -(outerD/2 - 0.15));
      D(scene, 1.2, 0.8, 0.1, concreteMat(0x3a3a3a), 0, 5.0, outerD/2 - 0.15);
      D(scene, 0.1, 0.8, 1.2, concreteMat(0x3a3a3a), -(outerW/2 - 0.15), 5.0, 0);
      D(scene, 0.1, 0.8, 1.2, concreteMat(0x3a3a3a), outerW/2 - 0.15, 5.0, 0);

      // Metal bracket strips
      D(scene, 0.08, 0.08, 6, darkMetal, 0, 5.5, -(outerD/2 - 0.12));
      D(scene, 0.08, 0.08, 6, darkMetal, 0, 5.5, outerD/2 - 0.12);

      // Paint fade patches (subtle color variation)
      D(scene, 4, 2, 0.06, concreteMat(0xc0a880), -5, 4, -(outerD/2 - 0.08));
      D(scene, 3.5, 1.8, 0.06, concreteMat(0xb8a070), 8, 4.5, outerD/2 - 0.08);
      D(scene, 0.06, 2, 4, concreteMat(0xc0a880), -(outerW/2 - 0.08), 4, -3);
      D(scene, 0.06, 1.8, 3.5, concreteMat(0xb8a070), outerW/2 - 0.08, 4.5, 4);

      // ── Corner elevated platforms ──
      var platMat = concreteMat(0x8a7a60);
      var platW = 8, platD = 8;

      var barrierMat = concreteMat(0x8a7a60);
      var sandbagMat = concreteMat(0x7a6a48);

      // ── KEPT corner platforms (NW, SE) — sniper perches with open sightlines ──
      var keptCorners = [
        [-24, -14, 'x+', 'z+'],  // NW corner
        [24, 14, 'x-', 'z-'],    // SE corner
      ];

      keptCorners.forEach(function(c) {
        var cx = c[0], cz = c[1];
        // Platform slab
        B(scene, walls, platW, 0.4, platD, platMat, cx, elevH, cz);

        // Only outer-edge barriers (back cover against perimeter walls)
        var outerZ = cz < 0 ? cz - platD/2 : cz + platD/2;
        var outerX = cx < 0 ? cx - platW/2 : cx + platW/2;
        B(scene, walls, platW, 1.2, 0.4, barrierMat, cx, elevH + 0.8, outerZ);
        D(scene, platW, 0.08, 0.5, trimBand, cx, elevH + 1.44, outerZ);
        B(scene, walls, 0.4, 1.2, platD, barrierMat, outerX, elevH + 0.8, cz);
        D(scene, 0.5, 0.08, platD, trimBand, outerX, elevH + 1.44, cz);

        // Functional sandbag wall at stair top (h=1.0, wider than decorative)
        var sbx = cx + (c[2] === 'x+' ? 3.5 : -3.5);
        var sbz = cz + (c[3] === 'z+' ? -0.5 : 0.5);
        B(scene, walls, 2.5, 1.0, 1.2, sandbagMat, sbx, elevH + 0.7, sbz);

        // Crate stack on platform
        var crateOffX = cx + 2 * Math.sign(cx);
        var crateOffZ = cz + 2 * Math.sign(cz);
        B(scene, walls, 1.5, 1.2, 1.5, crate, crateOffX, elevH + 0.8, crateOffZ);
        B(scene, walls, 1, 0.8, 1, crateDark, crateOffX + 0.2, elevH + 2.0, crateOffZ - 0.1);

        // Support columns under platforms
        var colMat = concreteMat(0x7a6a50);
        D(scene, 0.5, elevH, 0.5, colMat, cx - 3, elevH/2, cz - 3 * Math.sign(cz));
        D(scene, 0.5, elevH, 0.5, colMat, cx + 3, elevH/2, cz - 3 * Math.sign(cz));
        D(scene, 0.5, elevH, 0.5, colMat, cx - 3 * Math.sign(cx), elevH/2, cz - 3);
        D(scene, 0.5, elevH, 0.5, colMat, cx - 3 * Math.sign(cx), elevH/2, cz + 3);

        // Bolted base plates on columns
        D(scene, 0.7, 0.05, 0.7, darkMetal, cx - 3, 0.025, cz - 3 * Math.sign(cz));
        D(scene, 0.7, 0.05, 0.7, darkMetal, cx + 3, 0.025, cz - 3 * Math.sign(cz));
        // Pipe clamps on columns (mid-height)
        D(scene, 0.65, 0.1, 0.65, metal, cx - 3, elevH * 0.6, cz - 3 * Math.sign(cz));
        D(scene, 0.65, 0.1, 0.65, metal, cx + 3, elevH * 0.6, cz - 3 * Math.sign(cz));

        // Stairs
        buildStairs(scene, walls, cx, cz, 0, elevH, 3, c[2]);
      });

      // ── REMOVED corner platforms (NE, SW) — replaced with ground-level cover ──
      var removedCorners = [
        [24, -14],   // NE corner
        [-24, 14],   // SW corner
      ];

      removedCorners.forEach(function(c) {
        var cx = c[0], cz = c[1];
        // Jersey barriers (2-3 low walls)
        B(scene, walls, 3, 1.2, 0.5, barrierMat, cx, 0.6, cz);
        B(scene, walls, 0.5, 1.2, 3, barrierMat, cx + 2 * Math.sign(cx), 0.6, cz);
        B(scene, walls, 2.5, 1.0, 0.5, barrierMat, cx - 1.5 * Math.sign(cx), 0.5, cz + 2 * Math.sign(cz));

        // Crate stack
        B(scene, walls, 1.5, 1.2, 1.5, crate, cx + 1.5 * Math.sign(cx), 0.6, cz - 1.5 * Math.sign(cz));
        B(scene, walls, 1, 0.8, 1, crateDark, cx + 1.5 * Math.sign(cx), 1.6, cz - 1.5 * Math.sign(cz));

        // Barrel group
        P.Barrel(scene, walls, cx - 2 * Math.sign(cx), 0, cz + 2.5 * Math.sign(cz), { style: 'rusty', seed: 100 + cx });
        P.Barrel(scene, walls, cx - 3 * Math.sign(cx), 0, cz + 2 * Math.sign(cz), { style: 'metal', seed: 101 + cx });
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
      P.Barrel(scene, walls, -4, 0, -14, { style: 'metal', seed: 1 });
      P.Barrel(scene, walls, -3.1, 0, -14.6, { style: 'rusty', seed: 2 });
      P.Barrel(scene, walls, 4, 0, 14, { style: 'metal', seed: 3 });
      P.Barrel(scene, walls, 4.9, 0, 14.5, { style: 'metal', seed: 4 });
      P.Barrel(scene, walls, 3.5, 0, 15.0, { style: 'rusty', seed: 5 });
      P.Barrel(scene, walls, -28, 0, -5, { style: 'rusty', seed: 6 });
      P.Barrel(scene, walls, -27.2, 0, -5.5, { style: 'metal', seed: 7 });
      P.Barrel(scene, walls, 28, 0, 5, { style: 'rusty', seed: 8 });
      P.Barrel(scene, walls, 27.2, 0, 5.5, { style: 'metal', seed: 9 });
      P.Barrel(scene, walls, 13, 0, -16, { style: 'rusty', seed: 10 });
      P.Barrel(scene, walls, -13, 0, 15, { style: 'metal', seed: 11 });

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

      // ── Inner wall gap detail (between brick panels) ──
      // Junction boxes on inner walls
      P.Junction(scene, -(ibx + 0.1), 3.5, -5, { seed: 40 });
      P.Junction(scene, ibx + 0.1, 3.5, 5, { seed: 41 });

      // Mounted pipe runs (horizontal, at ~5m height)
      Cyl(scene, 0.05, 0.05, innerW - 2, 6, darkMetal, 0, 5.2, -(ibz + 0.15));
      Cyl(scene, 0.05, 0.05, innerW - 2, 6, darkMetal, 0, 5.2, ibz + 0.15);

      // Faded poster/sign patches on inner walls
      D(scene, 1.5, 1.0, 0.05, concreteMat(0x8a7a5a), 5, 3.0, -(ibz + 0.12));    // faded poster
      D(scene, 1.2, 0.8, 0.05, concreteMat(0x7a8a6a), -5, 2.8, ibz + 0.12);      // another
      D(scene, 0.05, 1.0, 1.2, concreteMat(0x8a7a6a), -(ibx + 0.12), 3.2, -4);   // side wall

      // Water stain drips below pipes
      D(scene, 0.1, 0.8, 0.04, concreteMat(0x6a6050), 3, 4.5, -(ibz + 0.1));
      D(scene, 0.1, 0.6, 0.04, concreteMat(0x6a6050), -7, 4.6, -(ibz + 0.1));
      D(scene, 0.1, 0.7, 0.04, concreteMat(0x6a6050), 8, 4.4, ibz + 0.1);

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
      P.Rubble(scene, 12, 0, -15, { seed: 20 });
      P.Rubble(scene, -10, 0, 13, { seed: 21 });
      P.Rubble(scene, 27, 0, -2, { seed: 22 });
      P.Rubble(scene, -27, 0, 3, { seed: 23 });
      P.Rubble(scene, -5, 0, -16, { seed: 24 });
      P.Rubble(scene, 7, 0, 15, { seed: 25 });

      // ── Yellow warning stripes near corners ──
      var warnMat = emissiveMat(0xccaa00, 0x887700, 0.3);
      D(scene, 0.3, 0.02, 4, warnMat, -20, 0.01, -14);
      D(scene, 0.3, 0.02, 4, warnMat, 20, 0.01, -14);
      D(scene, 0.3, 0.02, 4, warnMat, -20, 0.01, 14);
      D(scene, 0.3, 0.02, 4, warnMat, 20, 0.01, 14);

      // ── Procedural Props ──
      P.Pillar(scene, walls, -20, 0, -14, { style: 'modern', seed: 30 });
      P.Pillar(scene, walls, 20, 0, -14, { style: 'modern', seed: 31 });
      P.Pillar(scene, walls, -20, 0, 14, { style: 'modern', seed: 32 });
      P.Pillar(scene, walls, 20, 0, 14, { style: 'modern', seed: 33 });

      // ── Surface Detail ──
      WR(scene, 40, 3, 0.5, wallTan, 0, 2, -22, { style: 'brick' });
      WR(scene, 40, 3, 0.5, wallTan, 0, 2, 22, { style: 'brick' });
      FD(scene, 8, 8, floorMain, -24, 0, -14, { style: 'cracked_tile' });
      FD(scene, 8, 8, floorMain, 24, 0, 14, { style: 'cracked_tile' });

      return walls;
    },
  });
})();
