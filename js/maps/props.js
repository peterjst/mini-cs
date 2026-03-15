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

  // ── Tree Generator ───────────────────────────────────────
  function buildJungle(group, rng) {
    var barkMat = matCache.get('bark_dark');
    var leafMat = matCache.get('leaf_tropical');
    // Trunk with taper
    var trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 5, 8), barkMat));
    trunk.position.set(0, 2.5, 0);
    group.add(trunk);
    // Buttress roots
    for (var r = 0; r < 3; r++) {
      var angle = (r / 3) * Math.PI * 2 + rng() * 0.5;
      var root = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2, 4), barkMat));
      root.position.set(Math.cos(angle) * 0.25, 0.4, Math.sin(angle) * 0.25);
      root.rotation.z = Math.cos(angle) * 0.4;
      root.rotation.x = Math.sin(angle) * 0.4;
      group.add(root);
    }
    // Branches
    for (var b = 0; b < 3; b++) {
      var ba = rng() * Math.PI * 2;
      var bh = 3.5 + rng() * 1.2;
      var branch = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.5, 5), barkMat));
      branch.position.set(Math.cos(ba) * 0.6, bh, Math.sin(ba) * 0.6);
      branch.rotation.z = Math.cos(ba) * 0.7;
      branch.rotation.x = Math.sin(ba) * 0.7;
      group.add(branch);
    }
    // Canopy clusters
    var canopyCount = 4 + Math.floor(rng() * 3);
    for (var c = 0; c < canopyCount; c++) {
      var cg = new THREE.IcosahedronGeometry(1.2 + rng() * 0.5, 2);
      displaceVertices(cg, 0.25, (rng() * 10000) | 0, 'normal');
      var leaf = shadow(new THREE.Mesh(cg, leafMat));
      leaf.position.set((rng() - 0.5) * 2, 4.2 + rng() * 1.5, (rng() - 0.5) * 2);
      group.add(leaf);
    }
    // Hanging vines
    for (var v = 0; v < 2; v++) {
      var vine = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5 + rng(), 4), leafMat));
      vine.position.set((rng() - 0.5) * 1.5, 3.5 + rng(), (rng() - 0.5) * 1.5);
      group.add(vine);
    }
    return { trunkRadius: 0.25, trunkHeight: 5 };
  }

  function buildPalm(group, rng) {
    var barkMat = matCache.get('bark_light');
    var leafMat = matCache.get('leaf_mid');
    // Curved trunk via lathe
    var points = [];
    for (var i = 0; i <= 8; i++) {
      var t = i / 8;
      points.push(new THREE.Vector2(0.18 - t * 0.08, t * 6));
    }
    var trunkGeo = new THREE.LatheGeometry(points, 8);
    var trunk = shadow(new THREE.Mesh(trunkGeo, barkMat));
    group.add(trunk);
    // Ring segments on trunk
    for (var rs = 0; rs < 5; rs++) {
      var ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.16 - rs * 0.01, 0.02, 4, 8), barkMat));
      ring.position.set(0, 1 + rs * 1.0, 0);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }
    // Fronds
    var frondCount = 6 + Math.floor(rng() * 3);
    for (var f = 0; f < frondCount; f++) {
      var fa = (f / frondCount) * Math.PI * 2 + rng() * 0.3;
      var frondGeo = new THREE.PlaneGeometry(2.5, 0.4, 6, 1);
      displaceVertices(frondGeo, 0.08, (rng() * 10000) | 0, 'y');
      var frond = shadow(new THREE.Mesh(frondGeo, leafMat));
      frond.position.set(Math.cos(fa) * 1.2, 5.8, Math.sin(fa) * 1.2);
      frond.rotation.z = Math.cos(fa) * 0.8;
      frond.rotation.x = Math.sin(fa) * 0.8 + 0.3;
      group.add(frond);
    }
    // Coconuts
    for (var co = 0; co < 3; co++) {
      var ca = rng() * Math.PI * 2;
      var coconut = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), matCache.get('bark_dark')));
      coconut.position.set(Math.cos(ca) * 0.2, 5.6, Math.sin(ca) * 0.2);
      group.add(coconut);
    }
    return { trunkRadius: 0.18, trunkHeight: 6 };
  }

  function buildCypress(group, rng) {
    var barkMat = matCache.get('bark_dark');
    var leafMat = matCache.get('leaf_dark');
    // Narrow trunk
    var trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 4, 6), barkMat));
    trunk.position.set(0, 2, 0);
    group.add(trunk);
    // Stacked cones
    var coneCount = 3;
    for (var c = 0; c < coneCount; c++) {
      var cr = 1.0 - c * 0.2;
      var ch = 2.0 - c * 0.3;
      var cg = new THREE.ConeGeometry(cr, ch, 8);
      displaceVertices(cg, 0.1, (rng() * 10000) | 0, 'normal');
      var cone = shadow(new THREE.Mesh(cg, leafMat));
      cone.position.set(0, 3.5 + c * 1.2, 0);
      group.add(cone);
    }
    return { trunkRadius: 0.15, trunkHeight: 4 };
  }

  function buildOak(group, rng) {
    var barkMat = matCache.get('bark_light');
    var leafMat = matCache.get('leaf_mid');
    // Thick short trunk
    var trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 3, 8), barkMat));
    trunk.position.set(0, 1.5, 0);
    group.add(trunk);
    // Branch forks
    for (var b = 0; b < 4; b++) {
      var ba = (b / 4) * Math.PI * 2 + rng() * 0.5;
      var branch = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 1.8, 5), barkMat));
      branch.position.set(Math.cos(ba) * 0.5, 2.8 + rng() * 0.5, Math.sin(ba) * 0.5);
      branch.rotation.z = Math.cos(ba) * 0.6;
      branch.rotation.x = Math.sin(ba) * 0.6;
      group.add(branch);
    }
    // Canopy cluster
    var canopyCount = 5 + Math.floor(rng() * 4);
    for (var c = 0; c < canopyCount; c++) {
      var cg = new THREE.IcosahedronGeometry(1.0 + rng() * 0.6, 2);
      displaceVertices(cg, 0.2, (rng() * 10000) | 0, 'normal');
      var leaf = shadow(new THREE.Mesh(cg, leafMat));
      leaf.position.set((rng() - 0.5) * 2.5, 3.5 + rng() * 1.5, (rng() - 0.5) * 2.5);
      group.add(leaf);
    }
    // Root bumps at base
    for (var r = 0; r < 3; r++) {
      var ra = (r / 3) * Math.PI * 2;
      var rootGeo = new THREE.SphereGeometry(0.2, 5, 4);
      displaceVertices(rootGeo, 0.05, (rng() * 10000) | 0, 'normal');
      var root = shadow(new THREE.Mesh(rootGeo, barkMat));
      root.position.set(Math.cos(ra) * 0.35, 0.1, Math.sin(ra) * 0.35);
      group.add(root);
    }
    return { trunkRadius: 0.35, trunkHeight: 3 };
  }

  function buildPine(group, rng) {
    var barkMat = matCache.get('bark_dark');
    var leafMat = matCache.get('leaf_dark');
    // Straight tapered trunk
    var trunk = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 5.5, 6), barkMat));
    trunk.position.set(0, 2.75, 0);
    group.add(trunk);
    // Branch stubs
    for (var b = 0; b < 4; b++) {
      var ba = rng() * Math.PI * 2;
      var bh = 1.5 + b * 0.8;
      var stub = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.5, 4), barkMat));
      stub.position.set(Math.cos(ba) * 0.15, bh, Math.sin(ba) * 0.15);
      stub.rotation.z = Math.cos(ba) * 0.8;
      group.add(stub);
    }
    // Stacked cones decreasing upward
    var layers = 4 + Math.floor(rng());
    for (var c = 0; c < layers; c++) {
      var cr = 1.4 - c * 0.25;
      var ch = 1.5 - c * 0.15;
      var cg = new THREE.ConeGeometry(cr, ch, 8);
      displaceVertices(cg, 0.08, (rng() * 10000) | 0, 'normal');
      var cone = shadow(new THREE.Mesh(cg, leafMat));
      cone.position.set(0, 2.8 + c * 0.9, 0);
      group.add(cone);
    }
    // Needle litter at base
    for (var n = 0; n < 3; n++) {
      var needles = shadow(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), matCache.get('leaf_dry')));
      needles.rotation.x = -Math.PI / 2;
      needles.position.set((rng() - 0.5) * 1.5, 0.02, (rng() - 0.5) * 1.5);
      group.add(needles);
    }
    return { trunkRadius: 0.2, trunkHeight: 5.5 };
  }

  var treeBuilders = {
    jungle: buildJungle,
    palm: buildPalm,
    cypress: buildCypress,
    oak: buildOak,
    pine: buildPine
  };

  function Tree(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'oak';
    var scale = opts.scale || 1.0;
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    if (scale !== 1.0) group.scale.set(scale, scale, scale);
    var builder = treeBuilders[style] || buildOak;
    var info = builder(group, rng);
    scene.add(group);
    // Collision cylinder for trunk
    var collider = new THREE.Mesh(
      new THREE.CylinderGeometry(info.trunkRadius * scale, info.trunkRadius * scale, info.trunkHeight * scale, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.set(x, y + info.trunkHeight * scale / 2, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Bush Generator ──────────────────────────────────────
  function Bush(scene, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'leafy';
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);

    if (style === 'hedge') {
      var hg = new THREE.BoxGeometry(1.2, 0.8, 0.6, 4, 4, 1);
      // Displace only top vertices for organic top edge
      var pos = hg.attributes.position;
      for (var i = 0; i < pos.count; i++) {
        if (pos.getY(i) > 0) {
          pos.setY(i, pos.getY(i) + (rng() - 0.5) * 0.15);
        }
      }
      pos.needsUpdate = true;
      hg.computeVertexNormals();
      group.add(shadow(new THREE.Mesh(hg, matCache.get('leaf_mid'))));
    } else {
      var leafMat = matCache.get('leaf_dark');
      var clusterCount = 2 + Math.floor(rng() * 2);
      for (var c = 0; c < clusterCount; c++) {
        var bg = new THREE.IcosahedronGeometry(0.6 + rng() * 0.3, 2);
        displaceVertices(bg, 0.12, (rng() * 10000) | 0, 'normal');
        var cluster = shadow(new THREE.Mesh(bg, leafMat));
        cluster.position.set((rng() - 0.5) * 0.5, 0.4 + rng() * 0.2, (rng() - 0.5) * 0.5);
        group.add(cluster);
      }
      if (style === 'flowering') {
        var petalMats = ['petal_pink', 'petal_yellow', 'petal_white', 'petal_purple'];
        for (var f = 0; f < 6; f++) {
          var flower = shadow(new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 4, 3),
            matCache.get(petalMats[Math.floor(rng() * petalMats.length)])
          ));
          flower.position.set((rng() - 0.5) * 0.8, 0.5 + rng() * 0.4, (rng() - 0.5) * 0.8);
          group.add(flower);
        }
      }
    }
    scene.add(group);
    return group;
  }

  // ── Grass Generator ────────────────────────────────────
  function Grass(scene, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var grassMat = new THREE.MeshStandardMaterial({
      color: 0x3d7a2e, roughness: 0.6, metalness: 0,
      side: THREE.DoubleSide, alphaTest: 0.5
    });
    var bladeCount = 15 + Math.floor(rng() * 11);
    for (var b = 0; b < bladeCount; b++) {
      var h = 0.3 + rng() * 0.2;
      var w = 0.04 + rng() * 0.02;
      var geo = new THREE.PlaneGeometry(w, h);
      var blade = new THREE.Mesh(geo, grassMat);
      blade.position.set((rng() - 0.5) * 0.6, h / 2, (rng() - 0.5) * 0.6);
      blade.rotation.y = rng() * Math.PI * 2;
      blade.rotation.z = (rng() - 0.5) * 0.2;
      group.add(blade);
    }
    scene.add(group);
    return group;
  }

  // ── Vine Generator ─────────────────────────────────────
  function Vine(scene, x1, y1, z1, x2, y2, z2, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x1 * 1000 + z1);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    var segments = 8 + Math.floor(rng() * 5);
    var vineMat = matCache.get('bark_light');
    var leafMat = matCache.get('leaf_dark');
    for (var s = 0; s < segments; s++) {
      var t = s / segments;
      var t2 = (s + 1) / segments;
      // Catenary-ish sag
      var sag = -Math.sin(t * Math.PI) * 1.5;
      var px = x1 + (x2 - x1) * t;
      var py = y1 + (y2 - y1) * t + sag;
      var pz = z1 + (z2 - z1) * t;
      var dx = (x2 - x1) / segments;
      var dy = (y2 - y1) / segments + Math.cos(t * Math.PI) * 1.5 * Math.PI / segments;
      var dz = (z2 - z1) / segments;
      var segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var seg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, segLen, 4), vineMat);
      seg.position.set(px + dx / 2, py + dy / 2, pz + dz / 2);
      // Rough orientation
      seg.rotation.z = Math.atan2(dx, dy);
      group.add(seg);
      // Leaf every 3rd segment
      if (s % 3 === 1) {
        var leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.1), leafMat);
        leaf.position.set(px, py - 0.05, pz);
        leaf.rotation.y = rng() * Math.PI;
        group.add(leaf);
      }
    }
    scene.add(group);
    return group;
  }

  // ── PottedPlant Generator ──────────────────────────────
  function PottedPlant(scene, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    // Pot via LatheGeometry
    var potPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.25, 0),
      new THREE.Vector2(0.3, 0.05),
      new THREE.Vector2(0.2, 0.3),
      new THREE.Vector2(0.22, 0.32)
    ];
    var potGeo = new THREE.LatheGeometry(potPoints, 8);
    group.add(shadow(new THREE.Mesh(potGeo, matCache.get('terracotta'))));
    // Soil
    var soilGeo = new THREE.CircleGeometry(0.18, 8);
    displaceVertices(soilGeo, 0.02, seed + 1, 'y');
    var soil = new THREE.Mesh(soilGeo, matCache.get('bark_dark'));
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.3;
    group.add(soil);
    // Foliage leaves
    var leafCount = 4 + Math.floor(rng() * 3);
    for (var l = 0; l < leafCount; l++) {
      var la = (l / leafCount) * Math.PI * 2;
      var leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.15),
        matCache.get('leaf_mid')
      );
      leaf.position.set(Math.cos(la) * 0.12, 0.4, Math.sin(la) * 0.12);
      leaf.rotation.y = la;
      leaf.rotation.z = -0.4;
      group.add(leaf);
    }
    scene.add(group);
    return group;
  }

  // ── Flower Generator ───────────────────────────────────
  function Flower(scene, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    // Stem
    var stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4),
      matCache.get('leaf_dark')
    );
    stem.position.y = 0.2;
    group.add(stem);
    // Petals
    var petalMats = ['petal_pink', 'petal_yellow', 'petal_white', 'petal_purple'];
    var petalMat = matCache.get(petalMats[Math.floor(rng() * petalMats.length)]);
    var petalCount = 5 + Math.floor(rng() * 2);
    for (var p = 0; p < petalCount; p++) {
      var pa = (p / petalCount) * Math.PI * 2;
      var petal = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), petalMat);
      petal.position.set(Math.cos(pa) * 0.06, 0.42, Math.sin(pa) * 0.06);
      petal.rotation.y = pa;
      petal.rotation.z = -0.5;
      group.add(petal);
    }
    // Center
    var center = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 5, 3),
      matCache.get('petal_yellow')
    );
    center.position.y = 0.42;
    group.add(center);
    scene.add(group);
    return group;
  }

  // ── Rock Generator ──────────────────────────────────────
  function Rock(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'rough';
    var size = opts.size || 1.0;
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var matMap = { rough: 'stone_grey', mossy: 'stone_mossy', sandstone: 'sandstone' };
    var geo = new THREE.IcosahedronGeometry(size, 2);
    if (style === 'sandstone') {
      // Horizontal layering: scale displacement by (1 - abs(normalY))
      var pos = geo.attributes.position;
      var nor = geo.attributes.normal;
      var layerRng = seededRng(seed + 7);
      for (var i = 0; i < pos.count; i++) {
        var factor = 1.0 - Math.abs(nor.getY(i));
        var d = (layerRng() - 0.5) * 2 * size * 0.2 * factor;
        pos.setX(i, pos.getX(i) + nor.getX(i) * d);
        pos.setY(i, pos.getY(i) + nor.getY(i) * d);
        pos.setZ(i, pos.getZ(i) + nor.getZ(i) * d);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
    } else {
      displaceVertices(geo, size * 0.25, seed, 'normal');
    }
    var rock = shadow(new THREE.Mesh(geo, matCache.get(matMap[style] || 'stone_grey')));
    rock.position.set(x, y + size * 0.4, z);
    scene.add(rock);
    // Moss patches for mossy style
    if (style === 'mossy') {
      for (var m = 0; m < 3; m++) {
        var mg = new THREE.CircleGeometry(0.3, 6);
        var moss = new THREE.Mesh(mg, matCache.get('stone_mossy'));
        moss.position.set(x + (rng() - 0.5) * size * 0.5, y + size * 0.7 + rng() * 0.1, z + (rng() - 0.5) * size * 0.5);
        moss.rotation.x = -Math.PI / 2 + (rng() - 0.5) * 0.3;
        scene.add(moss);
      }
    }
    // Collision box
    var collider = new THREE.Mesh(
      new THREE.BoxGeometry(size * 1.4, size * 1.2, size * 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.set(x, y + size * 0.5, z);
    scene.add(collider);
    walls.push(collider);
    return rock;
  }

  // ── RockCluster Generator ─────────────────────────────
  function RockCluster(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var count = 3 + Math.floor(rng() * 5);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    for (var i = 0; i < count; i++) {
      var rx = (rng() - 0.5) * 3;
      var rz = (rng() - 0.5) * 3;
      var rs = 0.5 + rng();
      var rGeo = new THREE.IcosahedronGeometry(rs, 2);
      displaceVertices(rGeo, rs * 0.2, (rng() * 10000) | 0, 'normal');
      var rock = shadow(new THREE.Mesh(rGeo, matCache.get('stone_grey')));
      rock.position.set(rx, rs * 0.3, rz);
      rock.rotation.set(rng() * 0.5, rng() * Math.PI, rng() * 0.5);
      group.add(rock);
    }
    scene.add(group);
    // Single cluster collision
    var collider = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2, 4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.set(x, y + 1, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Rubble Generator ──────────────────────────────────
  function Rubble(scene, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var stoneMat = matCache.get('stone_grey');
    // Small chunks
    var chunkCount = 5 + Math.floor(rng() * 6);
    for (var i = 0; i < chunkCount; i++) {
      var cs = 0.1 + rng() * 0.2;
      var cg = new THREE.IcosahedronGeometry(cs, 1);
      displaceVertices(cg, cs * 0.3, (rng() * 10000) | 0, 'normal');
      var chunk = shadow(new THREE.Mesh(cg, stoneMat));
      chunk.position.set((rng() - 0.5) * 2, cs * 0.3, (rng() - 0.5) * 2);
      chunk.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      group.add(chunk);
    }
    // Slab pieces
    for (var s = 0; s < 3; s++) {
      var slab = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.4 + rng() * 0.3, 0.05, 0.3 + rng() * 0.2), stoneMat));
      slab.position.set((rng() - 0.5) * 1.5, 0.03, (rng() - 0.5) * 1.5);
      slab.rotation.set((rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.3);
      group.add(slab);
    }
    // Dust mound
    var dustGeo = new THREE.SphereGeometry(0.5, 8, 4);
    var dust = shadow(new THREE.Mesh(dustGeo, matCache.get('sandstone')));
    dust.scale.set(1, 0.2, 1);
    dust.position.set(0, 0.05, 0);
    group.add(dust);
    scene.add(group);
    return group;
  }

  // ── MossPatches Generator ─────────────────────────────
  function MossPatches(scene, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var patchCount = 3 + Math.floor(rng() * 4);
    for (var i = 0; i < patchCount; i++) {
      var pr = 0.3 + rng() * 0.3;
      var pg = new THREE.CircleGeometry(pr, 6);
      displaceVertices(pg, 0.02, (rng() * 10000) | 0, 'y');
      var patch = new THREE.Mesh(pg, matCache.get('leaf_dark'));
      patch.rotation.x = -Math.PI / 2;
      patch.position.set((rng() - 0.5) * 2, 0.01, (rng() - 0.5) * 2);
      group.add(patch);
    }
    scene.add(group);
    return group;
  }

  // ── Barrel Generator ────────────────────────────────────
  function Barrel(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'metal';
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    // Barrel body via LatheGeometry
    var pts = [
      new THREE.Vector2(0, 0), new THREE.Vector2(0.35, 0),
      new THREE.Vector2(0.38, 0.1), new THREE.Vector2(0.42, 0.3),
      new THREE.Vector2(0.43, 0.5), new THREE.Vector2(0.42, 0.7),
      new THREE.Vector2(0.38, 0.9), new THREE.Vector2(0.35, 1.0),
      new THREE.Vector2(0, 1.0)
    ];
    var bodyMat = style === 'wood' ? matCache.get('plank_oak') : matCache.get('metal_rusted');
    var body = shadow(new THREE.Mesh(new THREE.LatheGeometry(pts, 16), bodyMat));
    group.add(body);
    // Rings/bands
    var ringPositions = [0.15, 0.5, 0.85];
    var bandMat = matCache.get('iron_band');
    for (var r = 0; r < 3; r++) {
      var ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.015, 4, 16), bandMat));
      ring.position.y = ringPositions[r];
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }
    if (style === 'wood') {
      // Stave lines
      for (var s = 0; s < 6; s++) {
        var sa = (s / 6) * Math.PI * 2;
        var stave = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.01, 1.0, 0.03), bandMat));
        stave.position.set(Math.cos(sa) * 0.4, 0.5, Math.sin(sa) * 0.4);
        stave.rotation.y = sa;
        group.add(stave);
      }
    }
    if (style === 'tipped') {
      group.rotation.x = 1.4; // ~80 degrees
      // Puddle underneath
      var puddle = new THREE.Mesh(new THREE.CircleGeometry(0.3, 8), matCache.get('puddle'));
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, y + 0.01, z + 0.5);
      scene.add(puddle);
    }
    scene.add(group);
    // Collision
    var collider = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 1.0, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.set(x, y + 0.5, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Crate Generator ───────────────────────────────────
  function Crate(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'wood';
    var s = opts.size || 1.0;
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var group = new THREE.Group();
    group.position.set(x, y + s / 2, z);
    var matMap = { wood: 'plank_oak', military: 'plank_pine', shipping: 'plank_weathered' };
    var bodyMat = matCache.get(matMap[style] || 'plank_oak');
    // Core box
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(s, s, s), bodyMat)));
    // Edge trim - 4 vertical edges, 4 top edges, 4 bottom edges
    var trimMat = style === 'military' ? matCache.get('iron_band') : matCache.get('bark_dark');
    var e = s / 2;
    var t = 0.03;
    var corners = [[e, e], [e, -e], [-e, e], [-e, -e]];
    for (var c = 0; c < 4; c++) {
      var cx = corners[c][0], cz = corners[c][1];
      // Vertical edge
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(t, s + t, t), trimMat)));
      group.children[group.children.length - 1].position.set(cx, 0, cz);
    }
    // Top and bottom edges
    for (var d = 0; d < 2; d++) {
      var ey = d === 0 ? e : -e;
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(s, t, t), trimMat)));
      group.children[group.children.length - 1].position.set(0, ey, e);
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(s, t, t), trimMat)));
      group.children[group.children.length - 1].position.set(0, ey, -e);
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(t, t, s), trimMat)));
      group.children[group.children.length - 1].position.set(e, ey, 0);
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(t, t, s), trimMat)));
      group.children[group.children.length - 1].position.set(-e, ey, 0);
    }
    scene.add(group);
    // Collision
    var collider = new THREE.Mesh(
      new THREE.BoxGeometry(s, s, s),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.set(x, y + s / 2, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Sack Generator ────────────────────────────────────
  function Sack(scene, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var sackGeo = new THREE.SphereGeometry(0.4, 12, 8);
    displaceVertices(sackGeo, 0.08, seed, 'normal');
    var sack = shadow(new THREE.Mesh(sackGeo, matCache.get('burlap')));
    sack.scale.set(1, 0.6, 1);
    sack.position.y = 0.24;
    group.add(sack);
    // Gathered top
    var top = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 6), matCache.get('burlap')));
    top.position.y = 0.5;
    group.add(top);
    scene.add(group);
    return group;
  }

  // ── WineCask Generator ────────────────────────────────
  function WineCask(scene, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var pts = [
      new THREE.Vector2(0, 0), new THREE.Vector2(0.3, 0),
      new THREE.Vector2(0.34, 0.15), new THREE.Vector2(0.37, 0.45),
      new THREE.Vector2(0.38, 0.75), new THREE.Vector2(0.37, 1.05),
      new THREE.Vector2(0.34, 1.35), new THREE.Vector2(0.3, 1.5),
      new THREE.Vector2(0, 1.5)
    ];
    var body = shadow(new THREE.Mesh(new THREE.LatheGeometry(pts, 12), matCache.get('plank_oak')));
    body.rotation.z = Math.PI / 2; // Horizontal
    body.position.y = 0.38;
    group.add(body);
    // Iron bands
    var bandMat = matCache.get('iron_band');
    var bandPositions = [0.2, 0.75, 1.3];
    for (var b = 0; b < 3; b++) {
      var band = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 4, 12), bandMat));
      band.rotation.y = Math.PI / 2;
      band.position.set(bandPositions[b] - 0.75, 0.38, 0);
      group.add(band);
    }
    // Spigot
    var spigot = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), bandMat));
    spigot.rotation.z = Math.PI / 2;
    spigot.position.set(0.8, 0.38, 0);
    group.add(spigot);
    scene.add(group);
    return group;
  }

  // ── Pallet Generator ──────────────────────────────────
  function Pallet(scene, x, y, z, opts) {
    opts = opts || {};
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var mat = matCache.get('plank_weathered');
    // Bottom runners
    for (var r = 0; r < 3; r++) {
      var rx = (r - 1) * 0.4;
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2), mat)));
      group.children[group.children.length - 1].position.set(rx, 0.05, 0);
    }
    // Top planks
    for (var p = 0; p < 6; p++) {
      var pz = (p - 2.5) * 0.2;
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.17), mat)));
      group.children[group.children.length - 1].position.set(0, 0.125, pz);
    }
    scene.add(group);
    return group;
  }

  // ── Chair Generator ────────────────────────────────────
  function Chair(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'wooden';
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var woodMat = matCache.get('plank_oak');
    var metalMat = matCache.get('metal_clean');

    if (style === 'office') {
      // 5 radial legs
      for (var l = 0; l < 5; l++) {
        var la = (l / 5) * Math.PI * 2;
        var leg = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), metalMat));
        leg.position.set(Math.cos(la) * 0.25, 0.15, Math.sin(la) * 0.25);
        leg.rotation.z = Math.cos(la) * 0.3;
        leg.rotation.x = Math.sin(la) * 0.3;
        group.add(leg);
        // Caster
        group.add(shadow(new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), metalMat)));
        group.children[group.children.length - 1].position.set(Math.cos(la) * 0.3, 0.03, Math.sin(la) * 0.3);
      }
      // Central stem
      group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), metalMat)));
      group.children[group.children.length - 1].position.set(0, 0.45, 0);
      // Seat
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), matCache.get('cushion'))));
      group.children[group.children.length - 1].position.set(0, 0.65, 0);
      // Backrest
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.04), matCache.get('cushion'))));
      group.children[group.children.length - 1].position.set(0, 0.95, -0.2);
    } else if (style === 'folding') {
      // X-frame legs
      for (var s = 0; s < 2; s++) {
        var sx = (s - 0.5) * 0.3;
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.02), metalMat)));
        group.children[group.children.length - 1].position.set(sx, 0.3, 0.1);
        group.children[group.children.length - 1].rotation.x = 0.15;
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.02), metalMat)));
        group.children[group.children.length - 1].position.set(sx, 0.3, -0.1);
        group.children[group.children.length - 1].rotation.x = -0.15;
      }
      // Seat
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.35), matCache.get('cushion'))));
      group.children[group.children.length - 1].position.set(0, 0.5, 0);
      // Back
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.02), matCache.get('cushion'))));
      group.children[group.children.length - 1].position.set(0, 0.75, -0.15);
    } else {
      // Wooden: 4 legs
      for (var wl = 0; wl < 4; wl++) {
        var wx = (wl % 2 === 0 ? -1 : 1) * 0.18;
        var wz = (wl < 2 ? -1 : 1) * 0.18;
        group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.45, 6), woodMat)));
        group.children[group.children.length - 1].position.set(wx, 0.225, wz);
      }
      // Seat plank
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), woodMat)));
      group.children[group.children.length - 1].position.set(0, 0.47, 0);
      // Backrest slats
      for (var bs = 0; bs < 3; bs++) {
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.02), woodMat)));
        group.children[group.children.length - 1].position.set((bs - 1) * 0.13, 0.72, -0.19);
      }
    }
    scene.add(group);
    var collider = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
    collider.position.set(x, y + 0.45, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Desk Generator ────────────────────────────────────
  function Desk(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'office';
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var group = new THREE.Group();
    group.position.set(x, y, z);

    if (style === 'workbench') {
      var benchMat = matCache.get('plank_pine');
      // Thick top
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.7), benchMat)));
      group.children[group.children.length - 1].position.set(0, 0.77, 0);
      // 4 legs
      for (var bl = 0; bl < 4; bl++) {
        var bx = (bl % 2 === 0 ? -1 : 1) * 0.6;
        var bz = (bl < 2 ? -1 : 1) * 0.28;
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), benchMat)));
        group.children[group.children.length - 1].position.set(bx, 0.37, bz);
      }
      // Stretcher
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.05), benchMat)));
      group.children[group.children.length - 1].position.set(0, 0.2, 0);
    } else {
      var deskMat = matCache.get('plank_oak');
      var metalMat = matCache.get('metal_clean');
      // Desktop
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.6), deskMat)));
      group.children[group.children.length - 1].position.set(0, 0.74, 0);
      // Edge trim
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.02, 0.02), metalMat)));
      group.children[group.children.length - 1].position.set(0, 0.73, 0.3);
      // Panel sides
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.58), deskMat)));
      group.children[group.children.length - 1].position.set(-0.58, 0.36, 0);
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.58), deskMat)));
      group.children[group.children.length - 1].position.set(0.58, 0.36, 0);
      // Drawer bank
      for (var d = 0; d < 3; d++) {
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.55), deskMat)));
        group.children[group.children.length - 1].position.set(0.35, 0.55 - d * 0.18, 0);
        // Handle
        group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 4), metalMat)));
        group.children[group.children.length - 1].position.set(0.35, 0.55 - d * 0.18, 0.29);
        group.children[group.children.length - 1].rotation.x = Math.PI / 2;
      }
    }
    scene.add(group);
    var collider = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
    collider.position.set(x, y + 0.4, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Shelf Generator ───────────────────────────────────
  function Shelf(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'bookcase';
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var rng = seededRng(seed);
    var group = new THREE.Group();
    group.position.set(x, y, z);

    if (style === 'wall_mounted') {
      var plankMat = matCache.get('plank_oak');
      var metalMat = matCache.get('iron_band');
      // Shelf surface
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.25), plankMat)));
      group.children[group.children.length - 1].position.y = 1.5;
      // L-brackets
      for (var lb = 0; lb < 2; lb++) {
        var lbx = (lb === 0 ? -0.35 : 0.35);
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), metalMat)));
        group.children[group.children.length - 1].position.set(lbx, 1.42, 0);
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.2), metalMat)));
        group.children[group.children.length - 1].position.set(lbx, 1.48, -0.05);
      }
      // Items
      for (var wi = 0; wi < 3; wi++) {
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.15 + rng() * 0.1, 0.2, 0.15), matCache.get('plank_pine'))));
        group.children[group.children.length - 1].position.set((wi - 1) * 0.3, 1.62, 0);
      }
    } else if (style === 'industrial') {
      var frameMat = matCache.get('metal_clean');
      // 4 corner posts
      for (var ip = 0; ip < 4; ip++) {
        var ix = (ip % 2 === 0 ? -0.45 : 0.45);
        var iz = (ip < 2 ? -0.2 : 0.2);
        group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 6), frameMat)));
        group.children[group.children.length - 1].position.set(ix, 1.0, iz);
      }
      // Shelves
      for (var is = 0; is < 4; is++) {
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.4), matCache.get('plank_weathered'))));
        group.children[group.children.length - 1].position.y = 0.05 + is * 0.5;
      }
    } else {
      // Bookcase
      var caseMat = matCache.get('plank_oak');
      // Side panels
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.0, 0.3), caseMat)));
      group.children[group.children.length - 1].position.set(-0.48, 1.0, 0);
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.0, 0.3), caseMat)));
      group.children[group.children.length - 1].position.set(0.48, 1.0, 0);
      // Shelves
      for (var sh = 0; sh < 5; sh++) {
        group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.93, 0.03, 0.28), caseMat)));
        group.children[group.children.length - 1].position.set(0, 0.02 + sh * 0.47, 0);
      }
      // Books
      var bookColors = ['plank_oak', 'plank_pine', 'cushion', 'bark_dark', 'iron_band'];
      for (var bk = 0; bk < 12; bk++) {
        var bkShelf = Math.floor(rng() * 4);
        var bkH = 0.25 + rng() * 0.15;
        var bkW = 0.03 + rng() * 0.03;
        group.add(shadow(new THREE.Mesh(
          new THREE.BoxGeometry(bkW, bkH, 0.2),
          matCache.get(bookColors[Math.floor(rng() * bookColors.length)])
        )));
        group.children[group.children.length - 1].position.set(
          -0.35 + bk * 0.06, 0.18 + bkShelf * 0.47, 0
        );
        if (rng() > 0.8) group.children[group.children.length - 1].rotation.z = (rng() - 0.5) * 0.3;
      }
    }
    scene.add(group);
    var collider = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
    collider.position.set(x, y + 1.0, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Couch Generator ───────────────────────────────────
  function Couch(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var mat = matCache.get('cushion');
    // Base frame
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.7), matCache.get('bark_dark'))));
    group.children[group.children.length - 1].position.set(0, 0.15, 0);
    // Seat cushion
    var seatGeo = new THREE.BoxGeometry(1.6, 0.2, 0.6);
    displaceVertices(seatGeo, 0.02, seed, 'y');
    group.add(shadow(new THREE.Mesh(seatGeo, mat)));
    group.children[group.children.length - 1].position.set(0, 0.33, 0.02);
    // Back cushions
    for (var bc = 0; bc < 3; bc++) {
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.15), mat)));
      group.children[group.children.length - 1].position.set((bc - 1) * 0.53, 0.65, -0.25);
    }
    // Armrests
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.6), mat)));
    group.children[group.children.length - 1].position.set(-0.84, 0.45, 0);
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.6), mat)));
    group.children[group.children.length - 1].position.set(0.84, 0.45, 0);
    scene.add(group);
    var collider = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
    collider.position.set(x, y + 0.45, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Pipe Generator ────────────────────────────────────
  function Pipe(scene, x, y, z, opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var radius = opts.radius || 0.05;
    var path = opts.path || [new THREE.Vector3(0, 2, 0), new THREE.Vector3(3, 2, 0)];
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var pipeMat = matCache.get('metal_clean');
    // Pipe body
    var curve = new THREE.CatmullRomCurve3(path);
    var tubeGeo = new THREE.TubeGeometry(curve, 32, radius, 8, false);
    group.add(shadow(new THREE.Mesh(tubeGeo, pipeMat)));
    // Flange rings at ends
    var flangeGeo = new THREE.TorusGeometry(radius * 2, radius * 0.3, 4, 16);
    var flange1 = shadow(new THREE.Mesh(flangeGeo, pipeMat));
    flange1.position.copy(path[0]);
    group.add(flange1);
    var flange2 = shadow(new THREE.Mesh(new THREE.TorusGeometry(radius * 2, radius * 0.3, 4, 16), pipeMat));
    flange2.position.copy(path[path.length - 1]);
    group.add(flange2);
    scene.add(group);
    return group;
  }

  // ── Duct Generator ────────────────────────────────────
  function Duct(scene, x, y, z, opts) {
    opts = opts || {};
    var len = opts.length || 3;
    var h = opts.height || 0.4;
    var w = opts.width || 0.5;
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var ductMat = matCache.get('metal_painted');
    // 4 sides
    var top = shadow(new THREE.Mesh(new THREE.PlaneGeometry(len, w), ductMat));
    top.position.set(len / 2, h / 2, 0);
    top.rotation.x = -Math.PI / 2;
    group.add(top);
    var bottom = shadow(new THREE.Mesh(new THREE.PlaneGeometry(len, w), ductMat));
    bottom.position.set(len / 2, -h / 2, 0);
    bottom.rotation.x = Math.PI / 2;
    group.add(bottom);
    var left = shadow(new THREE.Mesh(new THREE.PlaneGeometry(len, h), ductMat));
    left.position.set(len / 2, 0, w / 2);
    group.add(left);
    var right = shadow(new THREE.Mesh(new THREE.PlaneGeometry(len, h), ductMat));
    right.position.set(len / 2, 0, -w / 2);
    group.add(right);
    // Seam strips
    var seamMat = matCache.get('iron_band');
    for (var s = 0; s < 3; s++) {
      var sx = len * (s + 1) / 4;
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.02, h + 0.02, w + 0.02), seamMat)));
      group.children[group.children.length - 1].position.set(sx, 0, 0);
    }
    scene.add(group);
    return group;
  }

  // ── Junction Generator ────────────────────────────────
  function Junction(scene, x, y, z, opts) {
    opts = opts || {};
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var boxMat = matCache.get('metal_painted');
    var bandMat = matCache.get('iron_band');
    // Main box
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.12), boxMat)));
    // Door panel
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.02), boxMat)));
    group.children[group.children.length - 1].position.z = 0.07;
    // Conduits top/bottom
    group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), bandMat)));
    group.children[group.children.length - 1].position.y = 0.4;
    group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), bandMat)));
    group.children[group.children.length - 1].position.y = -0.4;
    // Warning stripe
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.025), matCache.get('petal_yellow'))));
    group.children[group.children.length - 1].position.set(0, 0.12, 0.075);
    scene.add(group);
    return group;
  }

  // ── Pillar Generator ──────────────────────────────────
  function Pillar(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'stone';
    var height = opts.height || 4;
    var seed = opts.seed !== undefined ? opts.seed : (x * 1000 + z);
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var stoneMat = matCache.get('stone_grey');

    if (style === 'greek') {
      // Fluted column
      group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, height, 16), stoneMat)));
      group.children[group.children.length - 1].position.y = height / 2;
      // Capital
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.9), stoneMat)));
      group.children[group.children.length - 1].position.y = height + 0.1;
      // Scroll volutes
      for (var sv = 0; sv < 2; sv++) {
        group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 8), stoneMat)));
        group.children[group.children.length - 1].position.set((sv === 0 ? -0.35 : 0.35), height, 0);
        group.children[group.children.length - 1].rotation.z = Math.PI / 2;
      }
      // Base plinth
      group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 16), stoneMat)));
      group.children[group.children.length - 1].position.y = 0.1;
    } else if (style === 'modern') {
      group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.4, height, 0.4), matCache.get('tile_white'))));
      group.children[group.children.length - 1].position.y = height / 2;
    } else {
      // Stone: displaced cylinder
      var stoneGeo = new THREE.CylinderGeometry(0.35, 0.4, height, 12);
      displaceVertices(stoneGeo, 0.05, seed, 'normal');
      group.add(shadow(new THREE.Mesh(stoneGeo, stoneMat)));
      group.children[group.children.length - 1].position.y = height / 2;
    }
    scene.add(group);
    var collider = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, height, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.set(x, y + height / 2, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Fountain Generator ────────────────────────────────
  function Fountain(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var stoneMat = matCache.get('stone_grey');
    // Base pool
    var poolPts = [
      new THREE.Vector2(0, 0), new THREE.Vector2(2, 0),
      new THREE.Vector2(2, 0.1), new THREE.Vector2(2.05, 0.5),
      new THREE.Vector2(1.9, 0.5), new THREE.Vector2(1.9, 0.1), new THREE.Vector2(0, 0.1)
    ];
    group.add(shadow(new THREE.Mesh(new THREE.LatheGeometry(poolPts, 24), stoneMat)));
    // Water surface
    var waterGeo = new THREE.CircleGeometry(1.85, 16);
    var water = new THREE.Mesh(waterGeo, matCache.get('water_surface'));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.35;
    group.add(water);
    // Rim torus
    group.add(shadow(new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.06, 4, 32), stoneMat)));
    group.children[group.children.length - 1].position.y = 0.5;
    group.children[group.children.length - 1].rotation.x = Math.PI / 2;
    // Pedestal
    group.add(shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.5, 12), stoneMat)));
    group.children[group.children.length - 1].position.y = 1.0;
    // Upper basin
    var upperPts = [
      new THREE.Vector2(0, 0), new THREE.Vector2(0.6, 0),
      new THREE.Vector2(0.65, 0.15), new THREE.Vector2(0.55, 0.15), new THREE.Vector2(0, 0.05)
    ];
    var upperBasin = shadow(new THREE.Mesh(new THREE.LatheGeometry(upperPts, 16), stoneMat));
    upperBasin.position.y = 1.75;
    group.add(upperBasin);
    scene.add(group);
    // Collision
    var collider = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.6, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.set(x, y + 0.3, z);
    scene.add(collider);
    walls.push(collider);
    return group;
  }

  // ── Lantern Generator ─────────────────────────────────
  function Lantern(scene, x, y, z, opts) {
    opts = opts || {};
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var metalMat = matCache.get('iron_band');
    // Wall bracket
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.2), metalMat)));
    // Housing
    var housingPts = [
      new THREE.Vector2(0, 0), new THREE.Vector2(0.08, 0),
      new THREE.Vector2(0.1, 0.05), new THREE.Vector2(0.1, 0.2),
      new THREE.Vector2(0.08, 0.25), new THREE.Vector2(0, 0.25)
    ];
    group.add(shadow(new THREE.Mesh(new THREE.LatheGeometry(housingPts, 6), metalMat)));
    group.children[group.children.length - 1].position.set(0, -0.15, 0.15);
    // Cap
    group.add(shadow(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.08, 6), metalMat)));
    group.children[group.children.length - 1].position.set(0, 0.14, 0.15);
    // Flame glow
    var flameMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xffaa44, emissiveIntensity: 0.8 });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 3), flameMat));
    group.children[group.children.length - 1].position.set(0, -0.02, 0.15);
    // Point light
    var light = new THREE.PointLight(0xffaa44, 0.8, 8);
    light.position.set(0, 0, 0.15);
    group.add(light);
    scene.add(group);
    return group;
  }

  // ── Archway Generator ─────────────────────────────────
  function Archway(scene, walls, x, y, z, opts) {
    opts = opts || {};
    var w = opts.width || 3;
    var h = opts.height || 3.5;
    var group = new THREE.Group();
    group.position.set(x, y, z);
    var stoneMat = matCache.get('stone_grey');
    // Two pillar bases
    var pillarH = h - 1;
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.5, pillarH, 0.5), stoneMat)));
    group.children[group.children.length - 1].position.set(-(w - 0.5) / 2, pillarH / 2, 0);
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.5, pillarH, 0.5), stoneMat)));
    group.children[group.children.length - 1].position.set((w - 0.5) / 2, pillarH / 2, 0);
    // Arch span (half torus)
    var archRadius = (w - 0.5) / 2;
    var arch = shadow(new THREE.Mesh(new THREE.TorusGeometry(archRadius, 0.25, 8, 16, Math.PI), stoneMat));
    arch.position.set(0, pillarH, 0);
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    group.add(arch);
    // Keystone
    group.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.5), stoneMat)));
    group.children[group.children.length - 1].position.set(0, pillarH + archRadius, 0);
    scene.add(group);
    // Collision for pillars
    for (var p = 0; p < 2; p++) {
      var px = (p === 0 ? -(w - 0.5) / 2 : (w - 0.5) / 2);
      var pc = new THREE.Mesh(new THREE.BoxGeometry(0.5, pillarH, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
      pc.position.set(x + px, y + pillarH / 2, z);
      scene.add(pc);
      walls.push(pc);
    }
    return group;
  }

  // ── Public API ────────────────────────────────────────────
  GAME._props = {
    displaceVertices: displaceVertices,
    Tree: Tree,
    Bush: Bush,
    Grass: Grass,
    Vine: Vine,
    PottedPlant: PottedPlant,
    Flower: Flower,
    Rock: Rock,
    RockCluster: RockCluster,
    Rubble: Rubble,
    MossPatches: MossPatches,
    Barrel: Barrel,
    Crate: Crate,
    Sack: Sack,
    WineCask: WineCask,
    Pallet: Pallet,
    Chair: Chair,
    Desk: Desk,
    Shelf: Shelf,
    Couch: Couch,
    Pipe: Pipe,
    Duct: Duct,
    Junction: Junction,
    Pillar: Pillar,
    Fountain: Fountain,
    Lantern: Lantern,
    Archway: Archway,
    _test: { seededRng: seededRng, displaceVertices: displaceVertices, matCache: matCache }
  };
})();
