(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};
  var H = GAME._mapHelpers;
  var shadow = function(m) { m.castShadow = true; m.receiveShadow = true; return m; };

  // ── Seeded PRNG (mulberry32) ──────────────────────────────
  function seededRng(seed) {
    var s = seed | 0;
    return function() {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Vertex Displacement ───────────────────────────────────
  function displaceVertices(geometry, amount, seed, direction) {
    direction = direction || 'normal';
    var pos = geometry.attributes.position;
    var nor = geometry.attributes.normal;
    if (direction === 'normal' && !nor) {
      geometry.computeVertexNormals();
      nor = geometry.attributes.normal;
    }
    var rng = seededRng(seed);
    for (var i = 0; i < pos.count; i++) {
      var d = (rng() - 0.5) * 2 * amount;
      if (direction === 'normal') {
        pos.setX(i, pos.getX(i) + nor.getX(i) * d);
        pos.setY(i, pos.getY(i) + nor.getY(i) * d);
        pos.setZ(i, pos.getZ(i) + nor.getZ(i) * d);
      } else if (direction === 'y') {
        pos.setY(i, pos.getY(i) + d);
      } else if (direction === 'random') {
        pos.setX(i, pos.getX(i) + (rng() - 0.5) * 2 * amount);
        pos.setY(i, pos.getY(i) + (rng() - 0.5) * 2 * amount);
        pos.setZ(i, pos.getZ(i) + (rng() - 0.5) * 2 * amount);
      }
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  // ── Material Cache ────────────────────────────────────────
  var _materials = {};
  var matDefs = {
    // Wood
    bark_dark:       function() { return new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.92, metalness: 0 }); },
    bark_light:      function() { return new THREE.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 0.88, metalness: 0 }); },
    plank_oak:       function() { return new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.82, metalness: 0 }); },
    plank_pine:      function() { return new THREE.MeshStandardMaterial({ color: 0xb08850, roughness: 0.80, metalness: 0 }); },
    plank_weathered: function() { return new THREE.MeshStandardMaterial({ color: 0x7a7a6a, roughness: 0.95, metalness: 0 }); },
    // Foliage
    leaf_dark:       function() { return new THREE.MeshStandardMaterial({ color: 0x2a5a1a, roughness: 0.65, metalness: 0 }); },
    leaf_mid:        function() { return new THREE.MeshStandardMaterial({ color: 0x3d7a2e, roughness: 0.60, metalness: 0 }); },
    leaf_light:      function() { return new THREE.MeshStandardMaterial({ color: 0x5a9a3a, roughness: 0.55, metalness: 0 }); },
    leaf_tropical:   function() { return new THREE.MeshStandardMaterial({ color: 0x2a8a1a, roughness: 0.50, metalness: 0 }); },
    leaf_dry:        function() { return new THREE.MeshStandardMaterial({ color: 0x8a7a2a, roughness: 0.70, metalness: 0 }); },
    // Stone
    stone_grey:      function() { return new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.90, metalness: 0 }); },
    stone_mossy:     function() { return new THREE.MeshStandardMaterial({ color: 0x6a7a5a, roughness: 0.92, metalness: 0 }); },
    sandstone:       function() { return new THREE.MeshStandardMaterial({ color: 0xc0aa80, roughness: 0.88, metalness: 0 }); },
    temple_stone:    function() { return new THREE.MeshStandardMaterial({ color: 0x8a9a72, roughness: 0.95, metalness: 0 }); },
    cobble:          function() { return new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 1.0, metalness: 0 }); },
    // Metal
    metal_rusted:    function() { return new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.55, metalness: 0.75 }); },
    metal_painted:   function() { return new THREE.MeshStandardMaterial({ color: 0x4a6a4a, roughness: 0.45, metalness: 0.70 }); },
    metal_clean:     function() { return new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.30, metalness: 0.90 }); },
    iron_band:       function() { return new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.40, metalness: 0.85 }); },
    // Fabric
    burlap:          function() { return new THREE.MeshStandardMaterial({ color: 0xb09a6a, roughness: 0.95, metalness: 0 }); },
    canvas_market:   function() { return new THREE.MeshStandardMaterial({ color: 0xd0c0a0, roughness: 0.92, metalness: 0 }); },
    cushion:         function() { return new THREE.MeshStandardMaterial({ color: 0x5a5a8a, roughness: 0.90, metalness: 0 }); },
    // Ceramic
    terracotta:      function() { return new THREE.MeshStandardMaterial({ color: 0xc07040, roughness: 0.60, metalness: 0 }); },
    tile_white:      function() { return new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.55, metalness: 0 }); },
    tile_broken:     function() { return new THREE.MeshStandardMaterial({ color: 0xc0b8a8, roughness: 0.70, metalness: 0 }); },
    // Water
    water_surface:   function() { return new THREE.MeshStandardMaterial({ color: 0x3a7aaa, roughness: 0.10, metalness: 0.2, transparent: true, opacity: 0.7 }); },
    puddle:          function() { return new THREE.MeshStandardMaterial({ color: 0x4a6a7a, roughness: 0.10, metalness: 0.1, transparent: true, opacity: 0.5 }); },
    // Petals
    petal_pink:      function() { return new THREE.MeshStandardMaterial({ color: 0xffaacc, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }); },
    petal_yellow:    function() { return new THREE.MeshStandardMaterial({ color: 0xffdd66, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }); },
    petal_white:     function() { return new THREE.MeshStandardMaterial({ color: 0xfff5ee, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }); },
    petal_purple:    function() { return new THREE.MeshStandardMaterial({ color: 0xcc88ff, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }); },
  };
  var matCache = {
    get: function(key) {
      if (!_materials[key]) {
        if (!matDefs[key]) return null;
        _materials[key] = matDefs[key]();
      }
      return _materials[key];
    }
  };

  // ── Public API ────────────────────────────────────────────
  GAME._props = {
    displaceVertices: displaceVertices,
    _test: { seededRng: seededRng, displaceVertices: displaceVertices, matCache: matCache }
  };
})();
