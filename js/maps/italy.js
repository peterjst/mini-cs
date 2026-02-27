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

  GAME._maps.push({
    name: 'Italy',
    size: { x: 55, z: 50 },
    skyColor: 0x87ceeb,
    fogColor: 0xd4b896,
    fogDensity: 0.007,
    playerSpawn: { x: -24, z: -20 },
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

      // ── Cobblestone path markings (piazza) ──
      for (var ci = -4; ci <= 4; ci++) {
        D(scene, 0.15, 0.02, 8, cobbleMark, ci * 2, 0.01, 0);
        D(scene, 8, 0.02, 0.15, cobbleMark, 0, 0.01, ci * 2);
      }

      // ═══════════════════════════════════════════════════
      //  CENTRAL PIAZZA — Fountain
      // ═══════════════════════════════════════════════════
      CylW(scene, walls, 2.8, 3.0, 0.8, 8, sandStoneDk, 0, 0.4, 0);
      Cyl(scene, 2.6, 2.6, 0.05, 8, waterMat, 0, 0.75, 0);
      CylW(scene, walls, 0.3, 0.35, 2.5, 8, sandStone, 0, 1.25, 0);
      Cyl(scene, 0.9, 0.5, 0.25, 8, sandStoneDk, 0, 2.5, 0);
      Cyl(scene, 0.15, 0.2, 0.3, 8, sandStone, 0, 2.75, 0);

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
      B(scene, walls, 12, 0.3, 13, sandStone, -2, 3.5, -18.5);
      B(scene, walls, 12, 3, 0.4, orangePlaster, -2, 5.15, -18);
      B(scene, walls, 0.4, 3, 13, orangePlaster, -8, 5.15, -18.5);
      B(scene, walls, 0.4, 3, 13, orangePlaster, 4, 5.15, -18.5);
      B(scene, walls, 4, 1, 0.3, ironMat, -2, 3.85, -11.5);
      B(scene, walls, 13, 0.3, 14, terracotta, -2, 6.5, -18.5);
      D(scene, 14, 0.15, 0.8, terracotta, -2, 6.55, -11.2);
      buildStairs(scene, walls, -6, -22, 0, 3.5, 1.2, 'z+');
      D(scene, 0.15, 1.2, 0.8, darkWood, -5, 2, -11.8);
      D(scene, 0.15, 1.2, 0.8, darkWood, 1, 2, -11.8);
      D(scene, 1.0, 0.3, 0.35, terracotta, -5, 3.3, -11.6);
      D(scene, 0.8, 0.25, 0.05, greenFabric, -5, 3.55, -11.6);
      D(scene, 1.0, 0.3, 0.35, terracotta, 1, 3.3, -11.6);
      D(scene, 0.8, 0.25, 0.05, fabricMat(0xcc3355), 1, 3.55, -11.6);

      // ═══════════════════════════════════════════════════
      //  BUILDING B — East (2-story, T-side)
      // ═══════════════════════════════════════════════════
      B(scene, walls, 0.4, 3.5, 25, sandStone, 10, 1.75, -7.5);
      B(scene, walls, 12, 3.5, 0.4, sandStone, 16, 1.75, -20);
      B(scene, walls, 0.4, 3.5, 25, sandStone, 22, 1.75, -7.5);
      B(scene, walls, 12, 3.5, 0.4, sandStone, 16, 1.75, 5);
      B(scene, walls, 0.4, 3.5, 4, warmPlaster, 10, 1.75, -14);
      B(scene, walls, 0.4, 1, 4, warmPlaster, 10, 3, -8);
      B(scene, walls, 4, 3.5, 0.4, sandStone, 12, 1.75, 5);
      B(scene, walls, 4, 3.5, 0.4, sandStone, 20, 1.75, 5);
      B(scene, walls, 12, 0.3, 25, sandStone, 16, 3.5, -7.5);
      B(scene, walls, 0.4, 3, 25, orangePlaster, 10, 5.15, -7.5);
      B(scene, walls, 12, 3, 0.4, orangePlaster, 16, 5.15, -20);
      B(scene, walls, 0.4, 3, 25, orangePlaster, 22, 5.15, -7.5);
      B(scene, walls, 12, 3, 0.4, orangePlaster, 16, 5.15, 5);
      B(scene, walls, 0.3, 1, 6, ironMat, 10.2, 4.15, -5);
      B(scene, walls, 13, 0.3, 26, terracotta, 16, 6.5, -7.5);
      D(scene, 0.8, 0.15, 26, terracotta, 9.7, 6.55, -7.5);
      buildStairs(scene, walls, 18, -16, 0, 3.5, 1.2, 'z+');
      D(scene, 0.5, 1.2, 0.15, darkWood, 10.3, 5.2, -12);
      D(scene, 0.5, 1.2, 0.15, darkWood, 10.3, 5.2, -2);

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
      Cyl(scene, 0.3, 0.25, 0.5, 8, terracotta, -12, 0.25, -3);
      D(scene, 0.25, 0.2, 0.25, greenFabric, -12, 0.55, -3);
      Cyl(scene, 0.25, 0.2, 0.45, 8, terracotta, -12, 0.22, 3);
      D(scene, 0.2, 0.18, 0.2, greenFabric, -12, 0.5, 3);

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
      Cyl(scene, 0.5, 0.5, 1.2, 8, darkWood, 7, -1.9, 12);
      Cyl(scene, 0.5, 0.5, 1.2, 8, darkWood, 7, -1.9, 16);
      Cyl(scene, 0.5, 0.5, 1.2, 8, darkWood, 7, -0.7, 12);
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
      Cyl(scene, 0.3, 0.4, 0.6, 6, darkWood, -25, 0.3, -22);
      Cyl(scene, 0.25, 0.35, 0.5, 6, darkWood, -19, 0.25, -22);
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
      var lanternGlow = emissiveMat(0xffcc88, 0xffaa44, 2.0);
      D(scene, 0.15, 0.3, 0.15, ironMat, -11.2, 3.0, -2);
      D(scene, 0.1, 0.15, 0.1, lanternGlow, -11.2, 2.85, -2);
      D(scene, 0.15, 0.3, 0.15, ironMat, -11.2, 3.0, 4);
      D(scene, 0.1, 0.15, 0.1, lanternGlow, -11.2, 2.85, 4);
      D(scene, 0.15, 0.3, 0.15, ironMat, 4.2, 3.5, -16);
      D(scene, 0.1, 0.15, 0.1, lanternGlow, 4.2, 3.35, -16);
      D(scene, 0.15, 0.3, 0.15, ironMat, -14.7, 4.0, -8);
      D(scene, 0.1, 0.15, 0.1, lanternGlow, -14.7, 3.85, -8);
      D(scene, 0.15, 0.3, 0.15, ironMat, -14.7, 4.0, -4);
      D(scene, 0.1, 0.15, 0.1, lanternGlow, -14.7, 3.85, -4);

      // ═══════════════════════════════════════════════════
      //  SCATTERED DETAILS
      // ═══════════════════════════════════════════════════
      D(scene, 0.2, 0.08, 0.15, terracotta, 3, 0.04, 2);
      D(scene, 0.15, 0.06, 0.12, terracotta, -2, 0.03, 3);
      D(scene, 3, 0.02, 0.01, ironMat, -12.5, 3.5, 1);
      D(scene, 0.5, 0.6, 0.04, whiteFabric, -12, 3.1, 1);
      D(scene, 0.5, 0.5, 0.04, fabricMat(0xaa4444), -13, 3.2, 1);
      D(scene, 8, 0.05, 0.05, ironMat, -2, 4.1, -11.5);

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
