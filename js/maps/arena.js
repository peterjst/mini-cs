// js/maps/arena.js — Arena map (Open-Air Combat Arena)
(function() {
  'use strict';
  var H = GAME._mapHelpers;
  var B = H.B, D = H.D, Cyl = H.Cyl, CylW = H.CylW;
  var shadow = H.shadow, shadowRecv = H.shadowRecv;
  var addHangingLight = H.addHangingLight, addPointLight = H.addPointLight;

  GAME._maps.push({
    name: 'Arena',
    size: { x: 40, z: 40 },
    skyColor: 0x87ceeb,
    fogColor: 0xa0c8e8,
    fogDensity: 0.005,
    playerSpawn: { x: -14, z: -14 },
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

      // ── Central Platform ──
      B(scene, walls, 6, 1.5, 6, concreteMat, 0, 0.75, 0);
      D(scene, 5.5, 0.05, 5.5, darkMetalMat, 0, 1.52, 0);

      // ── Inner Blocks (create corridors) ──
      B(scene, walls, 8, WH, 8, concreteMat, -10, WH/2, -10);
      B(scene, walls, 8, WH, 8, concreteMat, 10, WH/2, -10);
      B(scene, walls, 8, WH, 8, concreteMat, -10, WH/2, 10);
      B(scene, walls, 8, WH, 8, concreteMat, 10, WH/2, 10);

      // ── Pillars at corridor entrances ──
      CylW(scene, walls, 0.4, WH, 8, concreteMat, -3.5, WH/2, -6);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, 3.5, WH/2, -6);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, -3.5, WH/2, 6);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, 3.5, WH/2, 6);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, -6, WH/2, -3.5);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, -6, WH/2, 3.5);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, 6, WH/2, -3.5);
      CylW(scene, walls, 0.4, WH, 8, concreteMat, 6, WH/2, 3.5);

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
      Cyl(scene, 0.35, 1.0, 8, darkMetalMat, -17, 0.5, -17);
      Cyl(scene, 0.35, 1.0, 8, darkMetalMat, -16.3, 0.5, -17);
      Cyl(scene, 0.35, 1.0, 8, darkMetalMat, 17, 0.5, 17);
      Cyl(scene, 0.35, 1.0, 8, darkMetalMat, 16.3, 0.5, 17);
      Cyl(scene, 0.35, 1.0, 8, metalMat, -17, 0.5, 17);
      Cyl(scene, 0.35, 1.0, 8, metalMat, 17, 0.5, -17);

      // ── Hazard stripes ──
      var hazardMat = new THREE.MeshStandardMaterial({ color: 0xccaa00, roughness: 0.9 });
      D(scene, 4, 0.02, 0.3, hazardMat, 0, 0.01, -5.8);
      D(scene, 4, 0.02, 0.3, hazardMat, 0, 0.01, 5.8);
      D(scene, 0.3, 0.02, 4, hazardMat, -5.8, 0.01, 0);
      D(scene, 0.3, 0.02, 4, hazardMat, 5.8, 0.01, 0);

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
