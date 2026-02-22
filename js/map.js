// js/map.js — Map definitions (Dust, Office, Warehouse)
// Attaches to window.GAME.maps

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  // ── Coherent Noise Engine ───────────────────────────────
  function _hash(ix, iy, seed) {
    var n = ix * 374761393 + iy * 668265263 + seed * 1274126177;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff;
  }
  function _valueNoise(x, y, seed) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    var a = _hash(ix, iy, seed), b = _hash(ix + 1, iy, seed);
    var c = _hash(ix, iy + 1, seed), d = _hash(ix + 1, iy + 1, seed);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function _fbmNoise(x, y, octaves, lac, gain, seed) {
    var sum = 0, amp = 1, freq = 1, max = 0;
    for (var i = 0; i < octaves; i++) {
      sum += _valueNoise(x * freq, y * freq, seed + i * 31) * amp;
      max += amp;
      freq *= lac;
      amp *= gain;
    }
    return sum / max;
  }

  // ── Procedural Bump Textures (cached) ────────────────────
  var _texCache = {};
  function _makeCanvas(key, size, fn) {
    if (_texCache[key]) return _texCache[key];
    var c = document.createElement('canvas');
    c.width = c.height = size;
    fn(c.getContext('2d'), size);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    _texCache[key] = t;
    return t;
  }
  function _noiseBump(key, size, lo, hi) {
    return _makeCanvas(key, size, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var py = 0; py < s; py++) {
        for (var px = 0; px < s; px++) {
          var n = _fbmNoise(px / s * 4, py / s * 4, 3, 2.0, 0.5, 137);
          var v = lo + n * (hi - lo);
          var idx = (py * s + px) * 4;
          d.data[idx] = d.data[idx+1] = d.data[idx+2] = v;
          d.data[idx+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    });
  }
  function _tileBump(key, size, tile, lw, base, line) {
    return _makeCanvas(key, size, function(ctx, s) {
      ctx.fillStyle = 'rgb('+base+','+base+','+base+')';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = 'rgb('+line+','+line+','+line+')';
      for (var i = 0; i < s; i += tile) {
        ctx.fillRect(i, 0, lw, s);
        ctx.fillRect(0, i, s, lw);
      }
    });
  }
  function _heightToNormal(key, size, drawFn, strength) {
    return _makeCanvas(key, size, function(ctx, s) {
      var hc = document.createElement('canvas');
      hc.width = hc.height = s;
      var hctx = hc.getContext('2d');
      drawFn(hctx, s);
      var hd = hctx.getImageData(0, 0, s, s).data;
      var d = ctx.createImageData(s, s);
      var str = strength || 1.0;
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var L = hd[(y * s + (x - 1 + s) % s) * 4] / 255;
          var R = hd[(y * s + (x + 1) % s) * 4] / 255;
          var U = hd[((y - 1 + s) % s * s + x) * 4] / 255;
          var Dn = hd[((y + 1) % s * s + x) * 4] / 255;
          var dx = (L - R) * str, dy = (U - Dn) * str;
          var len = Math.sqrt(dx * dx + dy * dy + 1);
          var i = (y * s + x) * 4;
          d.data[i]     = (dx / len * 0.5 + 0.5) * 255;
          d.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
          d.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
          d.data[i + 3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    });
  }

  var _floorBump = function() { var t = _tileBump('floor', 128, 32, 2, 180, 100); t.repeat.set(6, 6); return t; };
  var _concBump  = function() { var t = _noiseBump('conc', 64, 100, 180); t.repeat.set(3, 3); return t; };
  var _plastBump = function() { var t = _noiseBump('plast', 64, 140, 200); t.repeat.set(4, 4); return t; };
  var _woodBump  = function() { var t = _noiseBump('wood', 64, 80, 160); t.repeat.set(2, 2); return t; };

  // ── Map-Specific Texture Generators (256×256, cached) ────
  function _dustSandNormal() {
    var t = _heightToNormal('dustSandN', 256, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 6, ny * 6, 4, 2.0, 0.5, 42);
          var ripple = Math.sin((nx * 8 + ny * 2) * Math.PI * 2) * 0.3;
          var v = Math.max(0, Math.min(1, (n + ripple * 0.5) * 0.5 + 0.25)) * 255;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = v;
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    }, 1.2);
    t.repeat.set(5, 5);
    return t;
  }
  function _dustSandRough() {
    var t = _makeCanvas('dustSandR', 256, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 5, ny * 5, 3, 2.0, 0.5, 77);
          var v = 180 + n * 50;
          var spot = _fbmNoise(nx * 3, ny * 3, 2, 2.0, 0.5, 200);
          if (spot > 0.7) v = 140 + (spot - 0.7) * 100;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = Math.max(0, Math.min(255, v));
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    });
    t.repeat.set(5, 5);
    return t;
  }
  function _officeTileNormal() {
    var t = _heightToNormal('officeTileN', 256, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      var ts = 64;
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var tx = x % ts, ty = y % ts;
          var grout = (tx < 3 || ty < 3) ? 1 : 0;
          var tileVar = _hash(Math.floor(x / ts), Math.floor(y / ts), 55) * 30;
          var n = _fbmNoise(x / s * 8, y / s * 8, 2, 2.0, 0.5, 99);
          var v = grout ? 80 : Math.min(255, 160 + tileVar + n * 20);
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = v;
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    }, 0.8);
    t.repeat.set(4, 4);
    return t;
  }
  function _officeTileRough() {
    var t = _makeCanvas('officeTileR', 256, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      var ts = 64;
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var tx = x % ts, ty = y % ts;
          var grout = (tx < 3 || ty < 3) ? 1 : 0;
          var tileOff = (_hash(Math.floor(x / ts), Math.floor(y / ts), 88) - 0.5) * 30;
          var v = grout ? 240 : 200 + tileOff;
          var cx = tx / ts, cy = ty / ts;
          if (!grout && cx > 0.3 && cx < 0.7 && cy > 0.3 && cy < 0.7) v = 150 + tileOff * 0.5;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = Math.max(0, Math.min(255, v));
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    });
    t.repeat.set(4, 4);
    return t;
  }
  function _whConcNormal() {
    var t = _heightToNormal('whConcN', 256, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var n = _fbmNoise(x / s * 8, y / s * 8, 5, 2.0, 0.45, 173);
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = n * 255;
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
      ctx.strokeStyle = 'rgb(20,20,20)';
      ctx.lineWidth = 1.5;
      for (var c = 0; c < 4; c++) {
        ctx.beginPath();
        var px = _hash(c, 0, 300) * s, py = _hash(c, 1, 300) * s;
        ctx.moveTo(px, py);
        for (var seg = 0; seg < 8; seg++) {
          px += (_hash(c, seg + 2, 310) - 0.5) * 40;
          py += (_hash(c, seg + 2, 320) - 0.5) * 40;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }, 1.5);
    t.repeat.set(4, 4);
    return t;
  }
  function _whConcRough() {
    var t = _makeCanvas('whConcR', 256, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 6, ny * 6, 4, 2.0, 0.5, 211);
          var v = 190 + n * 60;
          var oil = _fbmNoise(nx * 3, ny * 3, 2, 2.0, 0.5, 333);
          if (oil > 0.75) v = 100;
          var track = Math.sin(nx * Math.PI * 16) * 0.5 + 0.5;
          if (track > 0.85 && ny > 0.2 && ny < 0.8) v = Math.min(v, 120);
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = Math.max(0, Math.min(255, v));
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    });
    t.repeat.set(4, 4);
    return t;
  }

  // ── Generic Surface Texture Generators (128px / 64px, cached) ──
  function _concreteNormal() {
    var t = _heightToNormal('concN', 128, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 8, ny * 8, 5, 2.0, 0.45, 501);
          var pit = _hash(x * 3, y * 3, 502) > 0.92 ? 0.3 : 0;
          var v = Math.max(0, Math.min(1, n - pit)) * 255;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = v;
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    }, 1.0);
    t.repeat.set(3, 3);
    return t;
  }
  function _concreteRough() {
    var t = _makeCanvas('concR', 128, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 6, ny * 6, 4, 2.0, 0.5, 510);
          var v = 200 + n * 50;
          var wear = _fbmNoise(nx * 2.5, ny * 2.5, 2, 2.0, 0.5, 515);
          if (wear > 0.7) v = 140 + (wear - 0.7) * 80;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = Math.max(0, Math.min(255, v));
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    });
    t.repeat.set(3, 3);
    return t;
  }
  function _plasterNormal() {
    var t = _heightToNormal('plastN', 128, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 6, ny * 6, 3, 2.0, 0.5, 520);
          var seam = (y % 64 < 2) ? 0.35 : 0;
          var v = Math.max(0, Math.min(1, n * 0.7 + 0.15 - seam)) * 255;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = v;
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    }, 0.8);
    t.repeat.set(4, 4);
    return t;
  }
  function _plasterRough() {
    var t = _makeCanvas('plastR', 128, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 5, ny * 5, 3, 2.0, 0.5, 525);
          var v = 190 + n * 40;
          if (y % 64 < 2) v = 230;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = Math.max(0, Math.min(255, v));
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    });
    t.repeat.set(4, 4);
    return t;
  }
  function _woodNormal() {
    var t = _heightToNormal('woodN', 128, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 2, ny * 12, 4, 2.0, 0.5, 530);
          var v = n * 255;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = Math.max(0, Math.min(255, v));
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    }, 1.0);
    t.repeat.set(2, 2);
    return t;
  }
  function _woodRough() {
    var t = _makeCanvas('woodR', 128, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var n = _fbmNoise(nx * 2, ny * 12, 3, 2.0, 0.5, 535);
          var v = 150 + n * 60;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = Math.max(0, Math.min(255, v));
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    });
    t.repeat.set(2, 2);
    return t;
  }
  function _metalNormal() {
    var t = _heightToNormal('metalN', 64, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var nx = x / s, ny = y / s;
          var line = Math.sin(ny * 80) * 0.4 + 0.5;
          var n = _fbmNoise(nx * 10, ny * 2, 2, 2.0, 0.5, 540);
          var v = (line * 0.6 + n * 0.4) * 255;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = Math.max(0, Math.min(255, v));
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    }, 0.6);
    t.repeat.set(2, 2);
    return t;
  }
  function _fabricNormal() {
    var t = _heightToNormal('fabricN', 64, function(ctx, s) {
      var d = ctx.createImageData(s, s);
      for (var y = 0; y < s; y++) {
        for (var x = 0; x < s; x++) {
          var warp = Math.sin(x * Math.PI * 2 / 4) * 0.5 + 0.5;
          var weft = Math.sin(y * Math.PI * 2 / 4) * 0.5 + 0.5;
          var v = (warp * 0.5 + weft * 0.5) * 255;
          var i = (y * s + x) * 4;
          d.data[i] = d.data[i+1] = d.data[i+2] = v;
          d.data[i+3] = 255;
        }
      }
      ctx.putImageData(d, 0, 0);
    }, 0.8);
    t.repeat.set(4, 4);
    return t;
  }

  // ── Material Helpers ──────────────────────────────────────
  function floorMat(color)   { return new THREE.MeshStandardMaterial({ color: color, roughness: 0.92, metalness: 0.0, bumpMap: _floorBump(), bumpScale: 0.04 }); }
  function concreteMat(color) { return new THREE.MeshStandardMaterial({ color: color, roughness: 0.95, metalness: 0.0,
    normalMap: _concreteNormal(), normalScale: new THREE.Vector2(0.5, 0.5), roughnessMap: _concreteRough() }); }
  function plasterMat(color)  { return new THREE.MeshStandardMaterial({ color: color, roughness: 0.82, metalness: 0.0,
    normalMap: _plasterNormal(), normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: _plasterRough() }); }
  function woodMat(color)     { return new THREE.MeshStandardMaterial({ color: color, roughness: 0.7, metalness: 0.0,
    normalMap: _woodNormal(), normalScale: new THREE.Vector2(0.5, 0.5), roughnessMap: _woodRough() }); }
  function metalMat(color)    { return new THREE.MeshStandardMaterial({ color: color, roughness: 0.35, metalness: 0.65,
    normalMap: _metalNormal(), normalScale: new THREE.Vector2(0.2, 0.2) }); }
  function darkMetalMat(color){ return new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.8,
    normalMap: _metalNormal(), normalScale: new THREE.Vector2(0.15, 0.15) }); }
  function fabricMat(color)   { return new THREE.MeshPhysicalMaterial({ color: color, roughness: 0.95, metalness: 0.0,
    sheen: 0.3, sheenColor: new THREE.Color(color), normalMap: _fabricNormal(), normalScale: new THREE.Vector2(0.3, 0.3) }); }
  function glassMat(color)    { return new THREE.MeshPhysicalMaterial({ color: color, roughness: 0.05, metalness: 0.0,
    transmission: 0.85, ior: 1.5, transparent: true }); }
  function crateMat(color, e) {
    var o = { color: color, roughness: 0.6, metalness: 0.15 };
    if (e) { o.emissive = e; o.emissiveIntensity = 0.15; }
    return new THREE.MeshStandardMaterial(o);
  }
  function emissiveMat(color, emColor, intensity) {
    return new THREE.MeshStandardMaterial({ color: color, emissive: emColor, emissiveIntensity: intensity || 1.0, roughness: 0.5, metalness: 0.1 });
  }
  function ceilingMat(color)  { return new THREE.MeshStandardMaterial({ color: color, roughness: 0.8, metalness: 0.0,
    normalMap: _plasterNormal(), normalScale: new THREE.Vector2(0.2, 0.2) }); }

  // ── Map-Specific Floor Materials ──────────────────────────
  function dustFloorMat(color) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: 0.92, metalness: 0.0,
      normalMap: _dustSandNormal(), normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: _dustSandRough() });
  }
  function officeTileMat(color) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, metalness: 0.0,
      normalMap: _officeTileNormal(), normalScale: new THREE.Vector2(0.5, 0.5), roughnessMap: _officeTileRough() });
  }
  function warehouseFloorMat(color) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: 0.95, metalness: 0.0,
      normalMap: _whConcNormal(), normalScale: new THREE.Vector2(0.8, 0.8), roughnessMap: _whConcRough() });
  }
  function jungleFloorMat(color) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: 0.95, metalness: 0.0,
      normalMap: _concreteNormal(), normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: _concreteRough() });
  }

  // ── Shadow Helpers ────────────────────────────────────────
  function shadow(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
  function shadowRecv(mesh) { mesh.receiveShadow = true; return mesh; }

  // ── Build Helpers ─────────────────────────────────────────
  // Collidable box (added to walls array)
  function B(scene, walls, w, h, d, mat, x, y, z) {
    var m = shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
    m.position.set(x, y, z);
    scene.add(m);
    if (walls) walls.push(m);
    return m;
  }
  // Decoration box (no collision)
  function D(scene, w, h, d, mat, x, y, z) {
    var m = shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }
  // Cylinder decoration
  function Cyl(scene, rT, rB, h, seg, mat, x, y, z) {
    var m = shadow(new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }
  // Collidable cylinder
  function CylW(scene, walls, rT, rB, h, seg, mat, x, y, z) {
    var m = Cyl(scene, rT, rB, h, seg, mat, x, y, z);
    walls.push(m);
    return m;
  }
  // Stairs builder: builds steps from baseY to topY along a direction
  function buildStairs(scene, walls, cx, cz, baseY, topY, width, dir) {
    // dir: 'z+', 'z-', 'x+', 'x-'
    var numSteps = Math.round((topY - baseY) / 0.4);
    var stepH = (topY - baseY) / numSteps;
    var stepD = 1.0;
    var mat = metalMat(0x555555);
    var stairMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.35, metalness: 0.55 });
    for (var i = 0; i < numSteps; i++) {
      var sy = baseY + stepH * (i + 1) - 0.15;
      var sx = cx, sz = cz;
      var gw = width, gd = stepD;
      if (dir === 'z+') { sz = cz + stepD * (i + 0.5); }
      else if (dir === 'z-') { sz = cz - stepD * (i + 0.5); }
      else if (dir === 'x+') { sx = cx + stepD * (i + 0.5); gw = stepD; gd = width; }
      else if (dir === 'x-') { sx = cx - stepD * (i + 0.5); gw = stepD; gd = width; }
      B(scene, walls, gw, 0.3, gd, stairMat, sx, sy, sz);
    }
    // Side rails
    var totalRun = numSteps * stepD;
    var railH = 1.0;
    var midY = (baseY + topY) / 2 + railH / 2;
    var railMat = metalMat(0x444444);
    if (dir === 'z+' || dir === 'z-') {
      var mz = dir === 'z+' ? cz + totalRun / 2 : cz - totalRun / 2;
      D(scene, 0.05, railH, totalRun, railMat, cx - width / 2, midY, mz);
      D(scene, 0.05, railH, totalRun, railMat, cx + width / 2, midY, mz);
    } else {
      var mx = dir === 'x+' ? cx + totalRun / 2 : cx - totalRun / 2;
      D(scene, totalRun, railH, 0.05, railMat, mx, midY, cz - width / 2);
      D(scene, totalRun, railH, 0.05, railMat, mx, midY, cz + width / 2);
    }
  }

  // ── Light Helpers ─────────────────────────────────────────
  function addPointLight(scene, color, intensity, dist, x, y, z) {
    var l = new THREE.PointLight(color, intensity, dist);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  }
  function addHangingLight(scene, x, y, z, color) {
    // Wire
    D(scene, 0.02, 0.5, 0.02, darkMetalMat(0x222222), x, y + 0.25, z);
    // Fixture
    Cyl(scene, 0.15, 0.2, 0.12, 8, metalMat(0x444444), x, y, z);
    // Bulb glow
    D(scene, 0.08, 0.06, 0.08, emissiveMat(0xffffcc, color || 0xffeeaa, 2.0), x, y - 0.06, z);
    addPointLight(scene, color || 0xffeedd, 0.8, 18, x, y - 0.1, z);
  }

  // ── Sky Dome ─────────────────────────────────────────────
  var skyVert = [
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  function createSkyDome(scene, skyColor, fogColor) {
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        colorTop:    { value: new THREE.Color(skyColor) },
        colorBottom: { value: new THREE.Color(fogColor) }
      },
      vertexShader: skyVert,
      fragmentShader: [
        'uniform vec3 colorTop;',
        'uniform vec3 colorBottom;',
        'varying vec3 vWorldPos;',
        'void main() {',
        '  float h = normalize(vWorldPos).y;',
        '  float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);',
        '  t = t * t;',
        '  gl_FragColor = vec4(mix(colorBottom, colorTop, t), 1.0);',
        '}'
      ].join('\n'),
      side: THREE.BackSide,
      depthWrite: false
    });
    var dome = new THREE.Mesh(new THREE.SphereGeometry(180, 16, 12), mat);
    dome.renderOrder = -1;
    scene.add(dome);
  }

  // ── PBR Environment Map ─────────────────────────────────
  function createEnvMap(renderer, scene, skyColor, fogColor) {
    var envScene = new THREE.Scene();
    var envMat = new THREE.ShaderMaterial({
      uniforms: {
        colorTop:    { value: new THREE.Color(skyColor) },
        colorBottom: { value: new THREE.Color(fogColor) }
      },
      vertexShader: skyVert,
      fragmentShader: [
        'uniform vec3 colorTop;',
        'uniform vec3 colorBottom;',
        'varying vec3 vWorldPos;',
        'void main() {',
        '  float h = normalize(vWorldPos).y;',
        '  float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);',
        '  t = t * t;',
        '  vec3 ground = colorBottom * 0.3;',
        '  vec3 c = h > 0.0 ? mix(colorBottom, colorTop, t) : mix(colorBottom, ground, -h);',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n'),
      side: THREE.BackSide
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), envMat));

    var pmrem = new THREE.PMREMGenerator(renderer);
    var envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();
    envMat.dispose();
  }

  // ══════════════════════════════════════════════════════════
  //  MAP DEFINITIONS
  // ══════════════════════════════════════════════════════════

  var maps = [

    // ── Map 1: "Dust" — Desert Market ────────────────────────
    {
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
    },

    // ── Map 2: "Office" — Modern Office Building ─────────────
    {
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
    },

    // ── Map 3: "Warehouse" — Multi-Floor Industrial ──────────
    {
      name: 'Warehouse',
      size: { x: 60, z: 50 },
      skyColor: 0x87ceeb,
      fogColor: 0xc0d8e8,
      fogDensity: 0.002,
      playerSpawn: { x: -22, z: -18 },
      botSpawns: [
        { x: 10, z: 5 },
        { x: -10, z: 10 },
        { x: 15, z: -10 },
      ],
      waypoints: [
        { x: 0, z: 0 }, { x: 15, z: 12 }, { x: -15, z: 12 },
        { x: 15, z: -12 }, { x: -15, z: -12 }, { x: 0, z: 18 },
        { x: 0, z: -18 }, { x: 22, z: 0 }, { x: -22, z: 0 },
        { x: 8, z: 8 }, { x: -8, z: -8 }, { x: -20, z: 15 },
        { x: 20, z: -15 }, { x: 5, z: -5 },
      ],
      build: function(scene) {
        var walls = [];
        var darkConcrete = warehouseFloorMat(0x606060);
        var conc = concreteMat(0x707070);
        var corrMetal = metalMat(0x6a6a6a);
        var rustOrange = crateMat(0xbf360c, 0x330000);
        var rustRed = crateMat(0xd84315);
        var shippingBlue = crateMat(0x1565c0, 0x001133);
        var shippingGreen = crateMat(0x2e7d32, 0x003300);
        var metalFloor = metalMat(0x6a6a6a);
        var metalRail = metalMat(0x555555);
        var metalDark = darkMetalMat(0x444444);
        var palletMat = woodMat(0x8b7355);
        var wood = woodMat(0x6b4e0a);

        var F2 = 4;   // second floor height
        var F3 = 8;   // third floor height
        var wallH = 14;

        // ── Ground Floor ──
        var floor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(60, 1, 50), darkConcrete));
        floor.position.set(0, -0.5, 0);
        scene.add(floor);
        // Floor markings (loading zone lines)
        D(scene, 8, 0.02, 0.15, emissiveMat(0xcccc00, 0xffff00, 0.3), -20, 0.01, 0);
        D(scene, 0.15, 0.02, 12, emissiveMat(0xcccc00, 0xffff00, 0.3), -24, 0.01, 0);
        D(scene, 0.15, 0.02, 12, emissiveMat(0xcccc00, 0xffff00, 0.3), -16, 0.01, 0);

        // Perimeter walls (tall for 3 floors)
        [
          [62, wallH, 1, 0, wallH/2, -25.5],
          [62, wallH, 1, 0, wallH/2, 25.5],
          [1, wallH, 50, -30.5, wallH/2, 0],
          [1, wallH, 50, 30.5, wallH/2, 0],
        ].forEach(function(w) { B(scene, walls, w[0], w[1], w[2], corrMetal, w[3], w[4], w[5]); });

        // ── Shipping Containers ──
        // Large blue container
        B(scene, walls, 12, 3.5, 3, shippingBlue, -8, 1.75, -8);
        D(scene, 0.1, 3.3, 2.8, metalDark, -14, 1.75, -8); // door end
        // Medium green container
        B(scene, walls, 8, 3, 3, shippingGreen, 10, 1.5, 12);
        D(scene, 0.1, 2.8, 2.8, metalDark, 14, 1.5, 12);
        // Red container
        B(scene, walls, 10, 3, 3, rustRed, -15, 1.5, 10);

        // ── Pallets with crate stacks ──
        // Pallet 1
        D(scene, 1.5, 0.15, 1.5, palletMat, 0, 0.075, 0);
        B(scene, walls, 1.2, 1.2, 1.2, rustOrange, 0, 0.75, 0);
        B(scene, walls, 1.2, 1.2, 1.2, crateMat(0xe65100, 0x331100), 0, 1.95, 0);
        // Pallet 2
        D(scene, 1.5, 0.15, 1.5, palletMat, 5, 0.075, -15);
        B(scene, walls, 1.2, 1.2, 1.2, rustOrange, 5, 0.75, -15);
        // Pallet 3
        D(scene, 1.5, 0.15, 1.5, palletMat, -5, 0.075, 18);
        B(scene, walls, 1.2, 1.2, 1.2, crateMat(0xe65100), -5, 0.75, 18);
        B(scene, walls, 1.2, 1.2, 1.2, rustOrange, -5, 1.95, 18);
        B(scene, walls, 1.2, 1.2, 1.2, crateMat(0xff6d00,0x331100), -5, 3.15, 18);

        // ── Forklift ──
        B(scene, walls, 1.5, 1.0, 2.5, metalMat(0xf9a825), -20, 0.5, -15); // body
        D(scene, 1.0, 2.0, 0.15, metalMat(0x333333), -20, 1.5, -16.2);     // mast
        D(scene, 1.2, 0.1, 1.5, metalMat(0x555555), -20, 0.6, -13.5);      // forks
        D(scene, 0.5, 0.5, 0.15, metalMat(0x222222), -20.6, 0.3, -15.8);   // wheel
        D(scene, 0.5, 0.5, 0.15, metalMat(0x222222), -19.4, 0.3, -15.8);   // wheel

        // ── Industrial shelving rack (west wall) ──
        var shelfMat = metalMat(0x5c5c5c);
        // Uprights
        D(scene, 0.1, 4, 0.1, shelfMat, -27, 2, -10);
        D(scene, 0.1, 4, 0.1, shelfMat, -27, 2, -6);
        D(scene, 0.1, 4, 0.1, shelfMat, -27, 2, -2);
        // Shelves
        B(scene, walls, 0.6, 0.08, 8.5, shelfMat, -27, 1.5, -6);
        B(scene, walls, 0.6, 0.08, 8.5, shelfMat, -27, 3.0, -6);
        // Items on shelves
        D(scene, 0.5, 0.4, 0.5, rustOrange, -27, 1.74, -9);
        D(scene, 0.5, 0.5, 0.5, crateMat(0xe65100), -27, 1.79, -7);
        D(scene, 0.5, 0.3, 0.5, shippingBlue, -27, 1.69, -4);

        // ── Oil drums ──
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metalMat(0x8b4513), 22, 0.6, -18);
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metalMat(0x666666), 23.5, 0.6, -18);
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metalMat(0x8b4513), 22.8, 0.6, -16.5);
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metalMat(0x666666), -25, 0.6, 20);

        // ── Low concrete barriers ──
        B(scene, walls, 6, 1, 0.5, conc, 0, 0.5, -20);
        B(scene, walls, 0.5, 1, 6, conc, 20, 0.5, 0);

        // ════════════════════════════════════════════
        //  SECOND FLOOR (y=4) — Metal Catwalks
        // ════════════════════════════════════════════

        // Platform: east side (x=16 to 28, z=-20 to 24)
        B(scene, walls, 12, 0.3, 44, metalFloor, 22, F2 - 0.15, 2);
        // Platform: north bridge (x=-20 to 16, z=20 to 24)
        B(scene, walls, 36, 0.3, 4, metalFloor, -2, F2 - 0.15, 22);

        // Support beams under east platform
        D(scene, 0.2, F2, 0.2, metalDark, 17, F2/2, -15);
        D(scene, 0.2, F2, 0.2, metalDark, 17, F2/2, 0);
        D(scene, 0.2, F2, 0.2, metalDark, 17, F2/2, 15);
        D(scene, 0.2, F2, 0.2, metalDark, 27, F2/2, -15);
        D(scene, 0.2, F2, 0.2, metalDark, 27, F2/2, 0);
        D(scene, 0.2, F2, 0.2, metalDark, 27, F2/2, 15);
        // Support beams under north bridge
        D(scene, 0.2, F2, 0.2, metalDark, -15, F2/2, 21);
        D(scene, 0.2, F2, 0.2, metalDark, -5, F2/2, 21);
        D(scene, 0.2, F2, 0.2, metalDark, 5, F2/2, 21);

        // Inner railings — east platform (west edge, at x=16)
        B(scene, walls, 0.06, 1.2, 44, metalRail, 16, F2 + 0.6, 2);
        // Top rail
        D(scene, 0.08, 0.08, 44, metalRail, 16, F2 + 1.2, 2);
        // Mid rail
        D(scene, 0.04, 0.04, 44, metalRail, 16, F2 + 0.6, 2);
        // Inner railings — north bridge (south edge, at z=20)
        B(scene, walls, 36, 1.2, 0.06, metalRail, -2, F2 + 0.6, 20);
        D(scene, 36, 0.08, 0.08, metalRail, -2, F2 + 1.2, 20);

        // Crates on 2nd floor
        B(scene, walls, 2, 1.5, 2, rustOrange, 22, F2 + 0.75, -10);
        B(scene, walls, 1.5, 1, 1.5, crateMat(0xe65100), 25, F2 + 0.5, 5);
        B(scene, walls, 2, 1.5, 2, shippingBlue, -10, F2 + 0.75, 22);

        // ── Stairs: Ground → 2nd Floor ──
        // Along east wall, going in +z direction from z=-20 to z=-10
        buildStairs(scene, walls, 22, -20, 0, F2, 4, 'z+');

        // ════════════════════════════════════════════
        //  THIRD FLOOR (y=8) — Observation Room
        // ════════════════════════════════════════════

        // Room floor (x=18 to 28, z=14 to 24, 10x10)
        B(scene, walls, 10, 0.3, 10, metalFloor, 23, F3 - 0.15, 19);

        // Room walls (partial, with window gaps)
        // West wall (with gap for entrance from catwalk)
        B(scene, walls, 0.3, 3, 4, corrMetal, 18.15, F3 + 1.5, 16);  // lower section
        B(scene, walls, 0.3, 3, 4, corrMetal, 18.15, F3 + 1.5, 22);  // upper section
        // South wall (with window)
        B(scene, walls, 4, 3, 0.3, corrMetal, 20, F3 + 1.5, 14.15);
        B(scene, walls, 4, 3, 0.3, corrMetal, 26, F3 + 1.5, 14.15);
        // Glass window in south wall gap
        D(scene, 2, 2, 0.08, glassMat(0x88ccff), 23, F3 + 1.5, 14.15);
        // Roof
        D(scene, 10.5, 0.2, 10.5, corrMetal, 23, F3 + 3.1, 19);

        // Control desk inside
        B(scene, walls, 3, 0.8, 1.2, woodMat(0x5d4037), 23, F3 + 0.4, 17);
        D(scene, 0.5, 0.35, 0.05, emissiveMat(0x222222, 0x44ff44, 0.6), 23, F3 + 0.97, 16.5);
        D(scene, 0.5, 0.35, 0.05, emissiveMat(0x222222, 0x4488ff, 0.6), 24, F3 + 0.97, 16.5);

        // Support beams for 3rd floor
        D(scene, 0.2, F3, 0.2, metalDark, 18.5, F3/2, 14.5);
        D(scene, 0.2, F3, 0.2, metalDark, 27.5, F3/2, 14.5);
        D(scene, 0.2, F3, 0.2, metalDark, 18.5, F3/2, 23.5);
        D(scene, 0.2, F3, 0.2, metalDark, 27.5, F3/2, 23.5);

        // ── Stairs: 2nd Floor → 3rd Floor ──
        // On the east platform, going in +z direction from z=4 to z=14
        buildStairs(scene, walls, 25, 4, F2, F3, 3, 'z+');

        // ── Wall-mounted pipes ──
        Cyl(scene, 0.06, 0.06, 50, 8, metalMat(0x777777), -29, 3, 0);
        Cyl(scene, 0.06, 0.06, 50, 8, metalMat(0x555555), -29, 6, 0);
        Cyl(scene, 0.06, 0.06, 60, 8, metalMat(0x666666), 0, wallH - 1, -24.5);
        // Pipe rotated horizontally (along x)
        var hpipe = Cyl(scene, 0.06, 0.06, 60, 8, metalMat(0x777777), 0, wallH - 1, -24.5);
        hpipe.rotation.z = Math.PI / 2;

        // ── Industrial hanging lights (bright daylight) ──
        addHangingLight(scene, -15, wallH - 1, -10, 0xf0f4ff);
        addHangingLight(scene, 0, wallH - 1, -10, 0xf0f4ff);
        addHangingLight(scene, 0, wallH - 1, 10, 0xf0f4ff);
        addHangingLight(scene, -15, wallH - 1, 10, 0xf0f4ff);
        addHangingLight(scene, 15, wallH - 1, 0, 0xf0f4ff);
        addHangingLight(scene, 22, F2 + 2.5, -15, 0xf0f4ff);
        addHangingLight(scene, 22, F2 + 2.5, 5, 0xf0f4ff);
        // 3rd floor room light
        addPointLight(scene, 0xeef2ff, 1.0, 14, 23, F3 + 2.5, 19);

        // Ground-level fill lights — bright daylight bounce
        addPointLight(scene, 0xe8f0ff, 1.2, 32, -10, 4, 0);
        addPointLight(scene, 0xe8f0ff, 1.2, 32, 10, 4, -10);
        addPointLight(scene, 0xe8f0ff, 1.0, 28, -20, 4, 10);
        addPointLight(scene, 0xe8f0ff, 1.0, 28, 5, 4, 15);
        addPointLight(scene, 0xe8f0ff, 0.9, 25, -10, 4, -18);
        addPointLight(scene, 0xe8f0ff, 0.9, 25, 15, 4, 15);
        addPointLight(scene, 0xe8f0ff, 0.8, 25, -22, 4, -10);
        addPointLight(scene, 0xe8f0ff, 0.8, 25, 0, 4, 0);
        // Under east platform (2nd floor)
        addPointLight(scene, 0xe8f0ff, 0.8, 22, 22, 2, 0);
        addPointLight(scene, 0xe8f0ff, 0.8, 22, 22, 2, -15);
        // Stairwell lights — illuminate stairs for visibility
        addPointLight(scene, 0xeef2ff, 0.9, 15, 22, 2, -15);
        addPointLight(scene, 0xeef2ff, 0.7, 12, 25, F2 + 2, 9);
        // 2nd floor platform lighting
        addPointLight(scene, 0xe8f0ff, 0.9, 20, 22, F2 + 2, 10);
        addPointLight(scene, 0xe8f0ff, 0.8, 20, 0, F2 + 2, -22);
        addPointLight(scene, 0xe8f0ff, 0.7, 18, -10, F2 + 2, 22);

        // ── Environmental Details ──

        // Oil stains on ground floor
        D(scene, 2.5, 0.005, 1.8, floorMat(0x2a2a2a), -20, 0.003, -12);
        D(scene, 1.5, 0.005, 2.0, floorMat(0x333333), 5, 0.003, 5);
        D(scene, 1.0, 0.005, 1.2, floorMat(0x2e2e2e), -8, 0.003, 15);

        // Safety signs on walls (yellow warning plates)
        D(scene, 0.8, 0.6, 0.05, emissiveMat(0xffeb3b, 0xffff00, 0.2), -30.2, 3.5, -15);
        D(scene, 0.8, 0.6, 0.05, emissiveMat(0xffeb3b, 0xffff00, 0.2), 30.2, 3.5, 10);
        // Danger stripe on sign
        D(scene, 0.8, 0.08, 0.06, fabricMat(0x222222), -30.2, 3.2, -15);
        D(scene, 0.8, 0.08, 0.06, fabricMat(0x222222), 30.2, 3.2, 10);

        // Fire exit signs (green, emissive)
        D(scene, 0.6, 0.3, 0.05, emissiveMat(0x2e7d32, 0x00ff44, 0.8), -30.2, 5.5, 0);
        D(scene, 0.6, 0.3, 0.05, emissiveMat(0x2e7d32, 0x00ff44, 0.8), 0, wallH - 2, -25.2);

        // Chains hanging from ceiling (near crane area)
        D(scene, 0.03, 3.0, 0.03, metalMat(0x777777), -10, wallH - 2.5, -5);
        D(scene, 0.03, 2.5, 0.03, metalMat(0x777777), -10, wallH - 2.75, -3);
        // Chain hook
        Cyl(scene, 0.06, 0.04, 0.1, 6, metalMat(0x999999), -10, wallH - 4.05, -5);

        // Caution tape on floor (near loading zone)
        D(scene, 8, 0.01, 0.12, emissiveMat(0xffeb3b, 0xffff00, 0.3), -20, 0.007, -6);
        D(scene, 8, 0.01, 0.12, emissiveMat(0xffeb3b, 0xffff00, 0.3), -20, 0.007, 6);

        // Tool rack on west wall
        D(scene, 2.0, 0.08, 0.15, metalMat(0x666666), -29.5, 2.5, 8); // rack bar
        D(scene, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 7.3); // hook
        D(scene, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 8.0); // hook
        D(scene, 0.05, 0.2, 0.08, metalMat(0x999999), -29.5, 2.3, 8.7); // hook
        // Hanging wrench
        D(scene, 0.04, 0.25, 0.02, metalMat(0x888888), -29.5, 2.05, 7.3);
        // Hanging hammer
        D(scene, 0.03, 0.3, 0.03, woodMat(0x8b6914), -29.5, 2.0, 8.0);
        D(scene, 0.08, 0.06, 0.03, metalMat(0x555555), -29.5, 1.85, 8.0);

        // Ventilation ducts on ceiling
        D(scene, 20, 0.8, 0.8, metalMat(0x606060), -5, wallH - 0.8, 0);
        D(scene, 0.8, 0.8, 25, metalMat(0x606060), 5, wallH - 0.8, 5);
        // Duct joints
        D(scene, 0.9, 0.9, 0.1, metalMat(0x555555), -5, wallH - 0.8, -10);
        D(scene, 0.9, 0.9, 0.1, metalMat(0x555555), -5, wallH - 0.8, 10);
        D(scene, 0.1, 0.9, 0.9, metalMat(0x555555), 5, wallH - 0.8, -7);
        D(scene, 0.1, 0.9, 0.9, metalMat(0x555555), 5, wallH - 0.8, 17);

        // Scattered bolts / debris on ground
        [[12,0.02,8],[-3,0.01,10],[18,0.015,-5],[-22,0.02,5],[8,0.01,-18]].forEach(function(d) {
          D(scene, 0.06, 0.03, 0.06, metalMat(0x777777), d[0], d[1], d[2]);
        });

        // Broken pallet on ground
        D(scene, 1.5, 0.05, 0.15, palletMat, 15, 0.025, -20);
        D(scene, 1.2, 0.05, 0.15, palletMat, 15.3, 0.025, -19.5);
        D(scene, 0.8, 0.05, 0.15, palletMat, 14.8, 0.025, -19);

        // Electrical junction box on wall
        D(scene, 0.5, 0.6, 0.12, metalMat(0x555555), 30.1, 4, -10);
        D(scene, 0.04, 1.5, 0.04, metalMat(0x333333), 30.1, 5.5, -10); // conduit up

        // Cone (traffic/safety cone near loading area)
        Cyl(scene, 0.02, 0.18, 0.5, 8, fabricMat(0xff6600), -24, 0.25, -8);
        Cyl(scene, 0.2, 0.2, 0.03, 8, metalMat(0x333333), -24, 0.015, -8); // base
        Cyl(scene, 0.02, 0.18, 0.5, 8, fabricMat(0xff6600), -16, 0.25, -8);
        Cyl(scene, 0.2, 0.2, 0.03, 8, metalMat(0x333333), -16, 0.015, -8); // base

        // Clipboard on crate stack
        D(scene, 0.2, 0.3, 0.02, woodMat(0xb08850), 0.4, 2.6, 0.6);
        D(scene, 0.16, 0.22, 0.01, plasterMat(0xf5f5f0), 0.4, 2.62, 0.59); // paper

        // Number stencils on containers (white markings)
        D(scene, 0.6, 0.3, 0.02, plasterMat(0xdddddd), -8, 2.5, -6.48);
        D(scene, 0.6, 0.3, 0.02, plasterMat(0xdddddd), 10, 2.2, 10.48);

        // Rope coil on ground
        Cyl(scene, 0.3, 0.3, 0.08, 12, woodMat(0xb8860b), 25, 0.04, 10);
        Cyl(scene, 0.15, 0.15, 0.1, 12, floorMat(0x404040), 25, 0.05, 10); // center hole

        return walls;
      },
    },

    // ── Map 4: "Bloodstrike" — Rectangular Loop Arena ─────────────
    {
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
        // The inner block is solid, with walls on all 4 sides
        // Inner block spans from x: -20 to 20, z: -10 to 10
        var ibx = innerW/2, ibz = innerD/2;

        // Inner walls (facing corridors)
        // North inner wall (faces north corridor)
        B(scene, walls, innerW, wH, wT, wallTanDark, 0, wH/2, -(ibz + 0.5));
        // South inner wall
        B(scene, walls, innerW, wH, wT, wallTanDark, 0, wH/2, ibz + 0.5);
        // West inner wall
        B(scene, walls, wT, wH, innerD, wallTanDark, -(ibx + 0.5), wH/2, 0);
        // East inner wall
        B(scene, walls, wT, wH, innerD, wallTanDark, ibx + 0.5, wH/2, 0);

        // Inner wall thick trim bands (matching outer walls)
        // North & South inner walls
        D(scene, innerW, 0.35, 0.2, trimBand, 0, 1.8, -(ibz + 0.05));
        D(scene, innerW, 0.35, 0.2, trimBand, 0, 1.8, ibz + 0.05);
        D(scene, innerW, 0.35, 0.2, trimBand, 0, 4.2, -(ibz + 0.05));
        D(scene, innerW, 0.35, 0.2, trimBand, 0, 4.2, ibz + 0.05);
        D(scene, innerW, 0.15, 0.12, trimThin, 0, 3.0, -(ibz + 0.03));
        D(scene, innerW, 0.15, 0.12, trimThin, 0, 3.0, ibz + 0.03);
        // East & West inner walls
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
        // North inner wall — large brick sections in lower-middle band
        D(scene, 10, 2.8, 0.12, brickMat, -10, 2.2, -(ibz + 0.08));
        D(scene, 10.4, 0.08, 0.14, brickBorder, -10, 0.82, -(ibz + 0.09)); // bottom border
        D(scene, 10.4, 0.08, 0.14, brickBorder, -10, 3.62, -(ibz + 0.09)); // top border
        D(scene, 0.08, 2.8, 0.14, brickBorder, -15.2, 2.2, -(ibz + 0.09)); // left border
        D(scene, 0.08, 2.8, 0.14, brickBorder, -4.8, 2.2, -(ibz + 0.09)); // right border
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
        // East/West inner wall brick panels (larger)
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

        // Corner positions: [cx, cz, stairDirX, stairDirZ]
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

          // Concrete barrier walls on inner edges (waist-height, replaces thin railings)
          var rx = cx > 0 ? cx - platW/2 : cx + platW/2;
          var rz = cz > 0 ? cz - platD/2 : cz + platD/2;
          // Barrier along x (inner z-side)
          B(scene, walls, platW, 1.2, 0.4, barrierMat, cx, elevH + 0.8, rz);
          D(scene, platW, 0.08, 0.5, trimBand, cx, elevH + 1.44, rz); // cap trim
          // Barrier along z (inner x-side)
          B(scene, walls, 0.4, 1.2, platD, barrierMat, rx, elevH + 0.8, cz);
          D(scene, 0.5, 0.08, platD, trimBand, rx, elevH + 1.44, cz); // cap trim

          // Crate stack on platform for additional cover
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

          // Stairs going along the x-corridor (toward center of north/south corridor)
          buildStairs(scene, walls, cx, cz, 0, elevH, 3, c[2]);
        });

        // ── Short cover walls along corridors ──
        // North corridor (z ~ -14): short walls for cover
        B(scene, walls, 4, 1.8, 0.5, wallTanLight, -8, 0.9, -14);
        B(scene, walls, 4, 1.8, 0.5, wallTanLight, 8, 0.9, -14);
        B(scene, walls, 3, 1.4, 0.5, wallTanLight, 0, 0.7, -16);

        // South corridor (z ~ 14): short walls for cover
        B(scene, walls, 4, 1.8, 0.5, wallTanLight, -8, 0.9, 14);
        B(scene, walls, 4, 1.8, 0.5, wallTanLight, 8, 0.9, 14);
        B(scene, walls, 3, 1.4, 0.5, wallTanLight, 0, 0.7, 16);

        // West corridor (x ~ -26): short walls
        B(scene, walls, 0.5, 1.8, 4, wallTanLight, -26, 0.9, -3);
        B(scene, walls, 0.5, 1.8, 4, wallTanLight, -26, 0.9, 5);

        // East corridor (x ~ 26): short walls
        B(scene, walls, 0.5, 1.8, 4, wallTanLight, 26, 0.9, 3);
        B(scene, walls, 0.5, 1.8, 4, wallTanLight, 26, 0.9, -5);

        // ── Stacked crate clusters in corridors ──
        // North corridor — 3 clusters
        B(scene, walls, 2, 1.5, 2, crate, -16, 0.75, -15);
        B(scene, walls, 1.2, 1.0, 1.2, crateDark, -15.7, 2.0, -15.2);
        B(scene, walls, 2, 1.5, 2, crateGreen, -6, 0.75, -13);
        B(scene, walls, 1.5, 1.0, 1.5, crate, 10, 0.5, -15);
        B(scene, walls, 1.0, 0.8, 1.0, crateDark, 10.2, 1.3, -14.8);
        B(scene, walls, 2, 1.5, 2, crateDark, 16, 0.75, -13);
        B(scene, walls, 1.2, 1.0, 1.2, crateGreen, 16.3, 2.0, -12.8);

        // South corridor — 3 clusters
        B(scene, walls, 2, 1.5, 2, crateGreen, 16, 0.75, 15);
        B(scene, walls, 1.2, 1.0, 1.2, crate, 15.7, 2.0, 15.2);
        B(scene, walls, 1.5, 1.0, 1.5, crateDark, 6, 0.5, 13);
        B(scene, walls, 2, 1.5, 2, crate, -10, 0.75, 15);
        B(scene, walls, 1.0, 0.8, 1.0, crateGreen, -9.8, 1.3, 14.8);
        B(scene, walls, 1.5, 1.0, 1.5, crateDark, -16, 0.5, 13);

        // West corridor — 2 clusters
        B(scene, walls, 2, 1.5, 2, crate, -27, 0.75, 0);
        B(scene, walls, 1.2, 1.0, 1.2, crateDark, -26.7, 2.0, 0.2);
        B(scene, walls, 2, 1.2, 2, crateGreen, -25, 0.6, -7);
        B(scene, walls, 1.0, 0.8, 1.0, crate, -25.3, 1.6, -6.8);

        // East corridor — 2 clusters
        B(scene, walls, 2, 1.5, 2, crateGreen, 27, 0.75, 0);
        B(scene, walls, 1.2, 1.0, 1.2, crate, 27.3, 2.0, -0.2);
        B(scene, walls, 2, 1.2, 2, crateDark, 25, 0.6, 7);
        B(scene, walls, 1.0, 0.8, 1.0, crateGreen, 24.7, 1.6, 7.2);

        // ── Oil barrel groups (clusters of 2-3) ──
        // North corridor group
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, -4, 0.6, -14);
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, darkMetal, -3.1, 0.6, -14.6);
        // South corridor group
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, 4, 0.6, 14);
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, 4.9, 0.6, 14.5);
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, darkMetal, 3.5, 0.6, 15.0);
        // West corridor group
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, darkMetal, -28, 0.6, -5);
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, -27.2, 0.6, -5.5);
        // East corridor group
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, darkMetal, 28, 0.6, 5);
        CylW(scene, walls, 0.4, 0.4, 1.2, 8, metal, 27.2, 0.6, 5.5);
        // Tipped/fallen barrels (decorative)
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
        // North inner wall alcove (recessed indent)
        D(scene, 3, 3.5, 0.5, alcoveMat, 0, 2.5, -(ibz - 0.2));  // recess box
        D(scene, 2.8, 3.3, 0.05, alcoveBack, 0, 2.5, -(ibz + 0.05));  // dark back wall
        // South inner wall alcove
        D(scene, 3, 3.5, 0.5, alcoveMat, 0, 2.5, ibz - 0.2);
        D(scene, 2.8, 3.3, 0.05, alcoveBack, 0, 2.5, ibz + 0.05);
        // East inner wall alcove
        D(scene, 0.5, 3.5, 3, alcoveMat, ibx - 0.2, 2.5, 0);
        D(scene, 0.05, 3.3, 2.8, alcoveBack, ibx + 0.05, 2.5, 0);
        // West inner wall alcove
        D(scene, 0.5, 3.5, 3, alcoveMat, -(ibx - 0.2), 2.5, 0);
        D(scene, 0.05, 3.3, 2.8, alcoveBack, -(ibx + 0.05), 2.5, 0);

        // ── Wall pipes (decorative, along outer walls) ──
        // Horizontal pipes
        Cyl(scene, 0.06, 0.06, outerW, 6, darkMetal, 0, 5.8, -(outerD/2 - 0.2));
        Cyl(scene, 0.06, 0.06, outerW, 6, darkMetal, 0, 5.8, outerD/2 - 0.2);

        // Vertical pipe corners
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
        // North corridor
        addHangingLight(scene, -14, wH - 0.5, -14, lightColor);
        addHangingLight(scene, 0, wH - 0.5, -14, lightColor);
        addHangingLight(scene, 14, wH - 0.5, -14, lightColor);
        // South corridor
        addHangingLight(scene, -14, wH - 0.5, 14, lightColor);
        addHangingLight(scene, 0, wH - 0.5, 14, lightColor);
        addHangingLight(scene, 14, wH - 0.5, 14, lightColor);
        // West corridor
        addHangingLight(scene, -26, wH - 0.5, -6, lightColor);
        addHangingLight(scene, -26, wH - 0.5, 6, lightColor);
        // East corridor
        addHangingLight(scene, 26, wH - 0.5, -6, lightColor);
        addHangingLight(scene, 26, wH - 0.5, 6, lightColor);
        // Corner platforms
        addHangingLight(scene, -24, wH - 0.5, -14, lightColor);
        addHangingLight(scene, 24, wH - 0.5, -14, lightColor);
        addHangingLight(scene, 24, wH - 0.5, 14, lightColor);
        addHangingLight(scene, -24, wH - 0.5, 14, lightColor);

        // Fill lights for even visibility (warm amber)
        addPointLight(scene, 0xffccaa, 1.0, 25, -26, 4, 0);
        addPointLight(scene, 0xffccaa, 1.0, 25, 26, 4, 0);
        addPointLight(scene, 0xffccaa, 0.8, 25, 0, 4, -14);
        addPointLight(scene, 0xffccaa, 0.8, 25, 0, 4, 14);
        // Corner platform uplights
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
    },

    // ── Map 5: "Italy" — Mediterranean Village ─────────────
    {
      name: 'Italy',
      size: { x: 55, z: 50 },
      skyColor: 0x87ceeb,
      fogColor: 0xd4b896,
      fogDensity: 0.007,
      playerSpawn: { x: -24, z: -20 },
      botSpawns: [
        { x: 8, z: -8 },    // north alley south entrance
        { x: 6, z: 6 },     // piazza east
        { x: -8, z: 10 },   // near Building C entrance
        { x: -20, z: 10 },  // SW courtyard
        { x: 8, z: -22 },   // north area east of Building A
        { x: -18, z: -10 }, // CT spawn area
      ],
      waypoints: [
        // Piazza (open center)
        { x: 0, z: -2 }, { x: 3, z: 3 }, { x: -3, z: 3 },
        // CT entry & west area
        { x: -16, z: -6 }, { x: -20, z: -15 }, { x: -20, z: 0 },
        // West alley (between walls)
        { x: -12.5, z: -2 }, { x: -12.5, z: 5 },
        // North area (outside Building A south face)
        { x: -2, z: -10 }, { x: 5, z: -10 },
        // North alley (between Buildings A & B)
        { x: 7, z: -10 }, { x: 7, z: -20 },
        // Building B doorway entrances (outside, not inside)
        { x: 9, z: -6 }, { x: 14, z: 6 },
        // South area & Building C entrance
        { x: -8, z: 7 }, { x: -8, z: 14 },
        // SW courtyard
        { x: -20, z: 10 }, { x: -14, z: 16 },
        // East open area (south of Building B)
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
        B(scene, walls, 55, 6, 0.5, sandStone, 0, 3, -25);   // north
        B(scene, walls, 55, 6, 0.5, sandStone, 0, 3, 25);    // south
        B(scene, walls, 0.5, 6, 50, sandStone, -27.5, 3, 0); // west
        B(scene, walls, 0.5, 6, 50, sandStone, 27.5, 3, 0);  // east

        // ── Cobblestone path markings (piazza) ──
        for (var ci = -4; ci <= 4; ci++) {
          D(scene, 0.15, 0.02, 8, cobbleMark, ci * 2, 0.01, 0);
          D(scene, 8, 0.02, 0.15, cobbleMark, 0, 0.01, ci * 2);
        }

        // ═══════════════════════════════════════════════════
        //  CENTRAL PIAZZA — Fountain
        // ═══════════════════════════════════════════════════
        // Octagonal basin rim (collidable)
        CylW(scene, walls, 2.8, 3.0, 0.8, 8, sandStoneDk, 0, 0.4, 0);
        // Water surface
        Cyl(scene, 2.6, 2.6, 0.05, 8, waterMat, 0, 0.75, 0);
        // Central column
        CylW(scene, walls, 0.3, 0.35, 2.5, 8, sandStone, 0, 1.25, 0);
        // Upper bowl
        Cyl(scene, 0.9, 0.5, 0.25, 8, sandStoneDk, 0, 2.5, 0);
        // Spout cap
        Cyl(scene, 0.15, 0.2, 0.3, 8, sandStone, 0, 2.75, 0);

        // ═══════════════════════════════════════════════════
        //  BUILDING A — North (2-story, accessible)
        // ═══════════════════════════════════════════════════
        // Ground floor walls
        B(scene, walls, 12, 3.5, 0.4, warmPlaster, -2, 1.75, -18);  // south wall
        B(scene, walls, 0.4, 3.5, 13, warmPlaster, -8, 1.75, -18.5); // west wall
        B(scene, walls, 0.4, 3.5, 13, warmPlaster, 4, 1.75, -18.5);  // east wall
        B(scene, walls, 12, 3.5, 0.4, sandStone, -2, 1.75, -25);     // north wall (perimeter)
        // Doorway gap in south wall — left+right sections
        B(scene, walls, 4.5, 3.5, 0.4, warmPlaster, -5.5, 1.75, -12); // left
        B(scene, walls, 4.5, 3.5, 0.4, warmPlaster, 1.5, 1.75, -12);  // right
        // Door lintel
        D(scene, 3, 0.4, 0.5, sandStoneDk, -2, 3.7, -12);

        // Ground floor ceiling / upper floor
        B(scene, walls, 12, 0.3, 13, sandStone, -2, 3.5, -18.5);

        // Upper floor walls
        B(scene, walls, 12, 3, 0.4, orangePlaster, -2, 5.15, -18);  // south upper wall
        B(scene, walls, 0.4, 3, 13, orangePlaster, -8, 5.15, -18.5);
        B(scene, walls, 0.4, 3, 13, orangePlaster, 4, 5.15, -18.5);
        // Upper floor balcony opening (south wall gap)
        B(scene, walls, 4, 1, 0.3, ironMat, -2, 3.85, -11.5); // balcony railing

        // Terracotta roof
        B(scene, walls, 13, 0.3, 14, terracotta, -2, 6.5, -18.5);
        // Roof eave overhang
        D(scene, 14, 0.15, 0.8, terracotta, -2, 6.55, -11.2);

        // Interior stairs (ground to upper)
        buildStairs(scene, walls, -6, -22, 0, 3.5, 1.2, 'z+');

        // Shutters on south face
        D(scene, 0.15, 1.2, 0.8, darkWood, -5, 2, -11.8);
        D(scene, 0.15, 1.2, 0.8, darkWood, 1, 2, -11.8);

        // Flower boxes
        D(scene, 1.0, 0.3, 0.35, terracotta, -5, 3.3, -11.6);
        D(scene, 0.8, 0.25, 0.05, greenFabric, -5, 3.55, -11.6);
        D(scene, 1.0, 0.3, 0.35, terracotta, 1, 3.3, -11.6);
        D(scene, 0.8, 0.25, 0.05, fabricMat(0xcc3355), 1, 3.55, -11.6);

        // ═══════════════════════════════════════════════════
        //  BUILDING B — East (2-story, T-side)
        // ═══════════════════════════════════════════════════
        // Ground floor walls
        B(scene, walls, 0.4, 3.5, 25, sandStone, 10, 1.75, -7.5);   // west wall
        B(scene, walls, 12, 3.5, 0.4, sandStone, 16, 1.75, -20);    // north wall
        B(scene, walls, 0.4, 3.5, 25, sandStone, 22, 1.75, -7.5);   // east wall
        B(scene, walls, 12, 3.5, 0.4, sandStone, 16, 1.75, 5);      // south wall
        // West doorway
        B(scene, walls, 0.4, 3.5, 4, warmPlaster, 10, 1.75, -14);   // upper left section
        // Door gap at z=-8 to z=-4
        B(scene, walls, 0.4, 1, 4, warmPlaster, 10, 3, -8);         // lintel above door
        // South doorway gap
        B(scene, walls, 4, 3.5, 0.4, sandStone, 12, 1.75, 5);      // left of south door
        B(scene, walls, 4, 3.5, 0.4, sandStone, 20, 1.75, 5);      // right of south door

        // Ceiling / upper floor
        B(scene, walls, 12, 0.3, 25, sandStone, 16, 3.5, -7.5);

        // Upper floor walls
        B(scene, walls, 0.4, 3, 25, orangePlaster, 10, 5.15, -7.5);
        B(scene, walls, 12, 3, 0.4, orangePlaster, 16, 5.15, -20);
        B(scene, walls, 0.4, 3, 25, orangePlaster, 22, 5.15, -7.5);
        B(scene, walls, 12, 3, 0.4, orangePlaster, 16, 5.15, 5);
        // West balcony railing
        B(scene, walls, 0.3, 1, 6, ironMat, 10.2, 4.15, -5);

        // Roof
        B(scene, walls, 13, 0.3, 26, terracotta, 16, 6.5, -7.5);
        D(scene, 0.8, 0.15, 26, terracotta, 9.7, 6.55, -7.5); // eave

        // Interior stairs
        buildStairs(scene, walls, 18, -16, 0, 3.5, 1.2, 'z+');

        // Shutters on west face
        D(scene, 0.5, 1.2, 0.15, darkWood, 10.3, 5.2, -12);
        D(scene, 0.5, 1.2, 0.15, darkWood, 10.3, 5.2, -2);

        // ═══════════════════════════════════════════════════
        //  BUILDING C — South Market (single-story)
        // ═══════════════════════════════════════════════════
        B(scene, walls, 12, 4, 0.4, warmPlaster, -8, 2, 22);    // back (south) wall
        B(scene, walls, 0.4, 4, 14, warmPlaster, -14, 2, 15);   // west wall
        B(scene, walls, 0.4, 4, 14, warmPlaster, -2, 2, 15);    // east wall
        // Open arch front (north side) — two pillars + lintel
        B(scene, walls, 0.6, 4, 0.6, sandStoneDk, -12, 2, 8);
        B(scene, walls, 0.6, 4, 0.6, sandStoneDk, -4, 2, 8);
        D(scene, 9, 0.5, 0.8, sandStoneDk, -8, 4.2, 8);        // lintel

        // Flat roof
        B(scene, walls, 12, 0.3, 14, terracotta, -8, 4.15, 15);

        // Wooden counter inside
        B(scene, walls, 8, 1.1, 0.6, lightWood, -8, 0.55, 12);

        // Fabric awnings
        D(scene, 10, 0.08, 3, redFabric, -8, 4.0, 9.5);
        D(scene, 10, 0.08, 3, fabricMat(0xcc7722), -8, 3.9, 6.5);

        // ═══════════════════════════════════════════════════
        //  NORTH ALLEY (between Building A and Building B)
        // ═══════════════════════════════════════════════════
        // Overhead arch span
        B(scene, walls, 6, 0.4, 1.5, sandStoneDk, 7, 4.5, -14);
        D(scene, 6, 0.3, 0.4, sandStone, 7, 4.7, -14);

        // Hanging laundry
        D(scene, 4, 0.02, 0.01, ironMat, 7, 4.2, -16);         // line
        D(scene, 0.6, 0.5, 0.04, whiteFabric, 6, 3.9, -16);    // shirt
        D(scene, 0.5, 0.7, 0.04, fabricMat(0x6688aa), 7.5, 3.8, -16); // pants
        D(scene, 0.4, 0.4, 0.04, whiteFabric, 8.5, 3.9, -16);  // towel

        // ═══════════════════════════════════════════════════
        //  WEST ALLEY (N-S passage)
        // ═══════════════════════════════════════════════════
        // Side walls forming the alley
        B(scene, walls, 0.4, 4, 16, sandStoneDk, -11, 2, 0);  // east wall of alley
        B(scene, walls, 0.4, 4, 8, sandStoneDk, -14, 2, -4);  // west wall segment

        // Terracotta pots
        Cyl(scene, 0.3, 0.25, 0.5, 8, terracotta, -12, 0.25, -3);
        D(scene, 0.25, 0.2, 0.25, greenFabric, -12, 0.55, -3);
        Cyl(scene, 0.25, 0.2, 0.45, 8, terracotta, -12, 0.22, 3);
        D(scene, 0.2, 0.18, 0.2, greenFabric, -12, 0.5, 3);

        // ═══════════════════════════════════════════════════
        //  CT ENTRY ARCHWAY
        // ═══════════════════════════════════════════════════
        // Stone pillars
        B(scene, walls, 0.8, 5, 0.8, sandStoneDk, -15, 2.5, -8);
        B(scene, walls, 0.8, 5, 0.8, sandStoneDk, -15, 2.5, -4);
        // Lintels
        D(scene, 1.2, 0.6, 5, sandStoneDk, -15, 5.3, -6);
        D(scene, 1.4, 0.3, 5.4, sandStone, -15, 5.65, -6);

        // ═══════════════════════════════════════════════════
        //  WINE CELLAR (underground, stairs down)
        // ═══════════════════════════════════════════════════
        // Cellar floor (sunken)
        B(scene, walls, 12, 0.3, 12, sandStoneFloor, 4, -2.5, 14);
        // Cellar walls
        B(scene, walls, 12, 3, 0.4, sandStoneDk, 4, -1, 8);    // north wall
        B(scene, walls, 0.4, 3, 12, sandStoneDk, -2, -1, 14);  // west wall
        B(scene, walls, 0.4, 3, 12, sandStoneDk, 10, -1, 14);  // east wall
        B(scene, walls, 12, 3, 0.4, sandStoneDk, 4, -1, 20);   // south wall
        // Cellar ceiling
        B(scene, walls, 12, 0.3, 12, sandStone, 4, 0.5, 14);

        // Stairs descending from ground level
        buildStairs(scene, walls, 0, 10, -2.5, 0, 1.2, 'z+');

        // Wine barrels
        Cyl(scene, 0.5, 0.5, 1.2, 8, darkWood, 7, -1.9, 12);
        Cyl(scene, 0.5, 0.5, 1.2, 8, darkWood, 7, -1.9, 16);
        Cyl(scene, 0.5, 0.5, 1.2, 8, darkWood, 7, -0.7, 12);

        // Wine crates
        B(scene, walls, 0.8, 0.6, 0.8, wineCrate, 2, -2.2, 18);
        B(scene, walls, 0.8, 0.6, 0.8, wineCrate, 3, -2.2, 18);
        B(scene, walls, 0.8, 0.6, 0.8, wineCrate, 2.5, -1.6, 18);

        // ═══════════════════════════════════════════════════
        //  COURTYARD (Southwest)
        // ═══════════════════════════════════════════════════
        // Low boundary walls
        B(scene, walls, 11, 1.5, 0.4, sandStoneDk, -21, 0.75, 5);
        B(scene, walls, 0.4, 1.5, 17, sandStoneDk, -16, 0.75, 13.5);
        B(scene, walls, 11, 1.5, 0.4, sandStoneDk, -21, 0.75, 22);

        // Planter boxes
        B(scene, walls, 2.5, 0.8, 1, sandStoneDk, -24, 0.4, 10);
        D(scene, 2.2, 0.4, 0.8, greenFabric, -24, 0.85, 10);
        B(scene, walls, 2.5, 0.8, 1, sandStoneDk, -20, 0.4, 18);
        D(scene, 2.2, 0.4, 0.8, greenFabric, -20, 0.85, 18);

        // Stone bench
        B(scene, walls, 2.5, 0.4, 0.6, sandStone, -22, 0.5, 14);
        D(scene, 0.4, 0.5, 0.4, sandStoneDk, -23, 0.25, 14);
        D(scene, 0.4, 0.5, 0.4, sandStoneDk, -21, 0.25, 14);

        // Decorative well
        CylW(scene, walls, 0.7, 0.8, 1.0, 10, sandStoneDk, -24, 0.5, 14);
        // Well frame (wooden crossbeam)
        D(scene, 0.1, 2.0, 0.1, darkWood, -24.5, 1.5, 14);
        D(scene, 0.1, 2.0, 0.1, darkWood, -23.5, 1.5, 14);
        D(scene, 1.2, 0.1, 0.1, darkWood, -24, 2.5, 14);

        // ═══════════════════════════════════════════════════
        //  CT SPAWN AREA (Southwest corner)
        // ═══════════════════════════════════════════════════
        // Ruined wall segments
        B(scene, walls, 3, 2.5, 0.4, sandStoneDk, -24, 1.25, -15);
        B(scene, walls, 2, 1.5, 0.4, sandStoneDk, -20, 0.75, -18);

        // Stacked crates
        B(scene, walls, 1.2, 1.2, 1.2, wineCrate, -22, 0.6, -20);
        B(scene, walls, 1.2, 1.2, 1.2, wineCrate, -23.2, 0.6, -20);
        B(scene, walls, 1.0, 1.0, 1.0, wineCrate, -22.5, 1.7, -20);

        // Olive tree stumps
        Cyl(scene, 0.3, 0.4, 0.6, 6, darkWood, -25, 0.3, -22);
        Cyl(scene, 0.25, 0.35, 0.5, 6, darkWood, -19, 0.25, -22);

        // Rubble rocks
        D(scene, 0.4, 0.25, 0.3, sandStoneDk, -21, 0.12, -16);
        D(scene, 0.3, 0.2, 0.35, sandStoneDk, -23, 0.1, -17);
        D(scene, 0.25, 0.15, 0.2, cobbleMark, -20, 0.07, -19);

        // ═══════════════════════════════════════════════════
        //  BELL TOWER (decorative column near piazza)
        // ═══════════════════════════════════════════════════
        CylW(scene, walls, 0.6, 0.7, 7, 8, sandStoneDk, -1, 3.5, -8);
        // Terracotta cap
        Cyl(scene, 0.9, 0.3, 0.6, 8, terracotta, -1, 7.3, -8);
        // Rusted bell
        Cyl(scene, 0.3, 0.15, 0.4, 6, rustMat, -1, 6.5, -8);

        // ═══════════════════════════════════════════════════
        //  MARKET STALLS (east of piazza)
        // ═══════════════════════════════════════════════════
        // Stall 1
        D(scene, 2.5, 0.1, 1.2, lightWood, 7, 1.0, 5);          // table
        D(scene, 0.1, 1.0, 0.1, lightWood, 5.8, 0.5, 4.4);      // leg
        D(scene, 0.1, 1.0, 0.1, lightWood, 8.2, 0.5, 4.4);      // leg
        D(scene, 0.1, 1.0, 0.1, lightWood, 5.8, 0.5, 5.6);      // leg
        D(scene, 0.1, 1.0, 0.1, lightWood, 8.2, 0.5, 5.6);      // leg
        // Awning pole + canopy
        D(scene, 0.08, 2.5, 0.08, ironMat, 5.7, 1.25, 4.2);
        D(scene, 0.08, 2.5, 0.08, ironMat, 8.3, 1.25, 4.2);
        D(scene, 3, 0.06, 2, redFabric, 7, 2.5, 5);
        // Produce boxes on table
        D(scene, 0.5, 0.3, 0.4, wineCrate, 6.2, 1.25, 5);
        D(scene, 0.5, 0.3, 0.4, wineCrate, 7.8, 1.25, 5);
        D(scene, 0.4, 0.15, 0.3, fabricMat(0xcc4400), 6.2, 1.45, 5);  // oranges
        D(scene, 0.4, 0.15, 0.3, greenFabric, 7.8, 1.45, 5);          // greens

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
        D(scene, 0.4, 0.15, 0.3, fabricMat(0xcc2222), 6.5, 1.45, 10); // tomatoes

        // ═══════════════════════════════════════════════════
        //  WALL-MOUNTED LANTERNS (iron brackets + emissive glow)
        // ═══════════════════════════════════════════════════
        var lanternGlow = emissiveMat(0xffcc88, 0xffaa44, 2.0);
        // West alley lanterns
        D(scene, 0.15, 0.3, 0.15, ironMat, -11.2, 3.0, -2);
        D(scene, 0.1, 0.15, 0.1, lanternGlow, -11.2, 2.85, -2);
        D(scene, 0.15, 0.3, 0.15, ironMat, -11.2, 3.0, 4);
        D(scene, 0.1, 0.15, 0.1, lanternGlow, -11.2, 2.85, 4);
        // North alley lanterns
        D(scene, 0.15, 0.3, 0.15, ironMat, 4.2, 3.5, -16);
        D(scene, 0.1, 0.15, 0.1, lanternGlow, 4.2, 3.35, -16);
        // CT entry lanterns
        D(scene, 0.15, 0.3, 0.15, ironMat, -14.7, 4.0, -8);
        D(scene, 0.1, 0.15, 0.1, lanternGlow, -14.7, 3.85, -8);
        D(scene, 0.15, 0.3, 0.15, ironMat, -14.7, 4.0, -4);
        D(scene, 0.1, 0.15, 0.1, lanternGlow, -14.7, 3.85, -4);

        // ═══════════════════════════════════════════════════
        //  SCATTERED DETAILS
        // ═══════════════════════════════════════════════════
        // Pot shards near fountain
        D(scene, 0.2, 0.08, 0.15, terracotta, 3, 0.04, 2);
        D(scene, 0.15, 0.06, 0.12, terracotta, -2, 0.03, 3);

        // More hanging laundry in west alley
        D(scene, 3, 0.02, 0.01, ironMat, -12.5, 3.5, 1);
        D(scene, 0.5, 0.6, 0.04, whiteFabric, -12, 3.1, 1);
        D(scene, 0.5, 0.5, 0.04, fabricMat(0xaa4444), -13, 3.2, 1);

        // Iron railing on Building A balcony edge
        D(scene, 8, 0.05, 0.05, ironMat, -2, 4.1, -11.5);

        // ═══════════════════════════════════════════════════
        //  LIGHTING
        // ═══════════════════════════════════════════════════
        // Piazza center warm fill
        addPointLight(scene, 0xffddaa, 1.2, 25, 0, 5, 0);
        // Building A interior
        addHangingLight(scene, -2, 3.2, -18, 0xffcc88);
        // Building A upper
        addPointLight(scene, 0xffcc88, 0.8, 15, -2, 5.5, -18);
        // Building B ground interior
        addHangingLight(scene, 16, 3.2, -10, 0xffcc88);
        // Building B upper
        addPointLight(scene, 0xffcc88, 0.8, 15, 16, 5.5, -10);
        // Wine cellar
        addPointLight(scene, 0xff8822, 0.8, 12, 4, -0.5, 14);
        addPointLight(scene, 0xff7700, 0.5, 10, 7, -1, 16);
        // West alley
        addPointLight(scene, 0xffbb66, 0.7, 15, -12, 3.5, 0);
        addPointLight(scene, 0xffaa44, 0.6, 12, -12, 3, 4);
        // North alley
        addPointLight(scene, 0xffbb66, 0.6, 12, 7, 4, -14);
        // CT archway
        addPointLight(scene, 0xffbb66, 0.7, 15, -15, 4.5, -6);
        // Market area
        addHangingLight(scene, 7, 3, 7, 0xffddaa);
        // Courtyard fills
        addPointLight(scene, 0xffd4a0, 0.8, 20, -22, 4, 12);
        addPointLight(scene, 0xffd4a0, 0.6, 18, -24, 3, -18);
        // General outdoor fills
        addPointLight(scene, 0xffd4a0, 0.5, 20, 10, 5, 0);
        addPointLight(scene, 0xffd4a0, 0.5, 20, -5, 5, 10);

        return walls;
      },
    },

    // ── Map 6: "Aztec" — Jungle Temple Ruins ───────────────
    {
      name: 'Aztec',
      size: { x: 70, z: 60 },
      skyColor: 0xa8c8e8,
      fogColor: 0x8aaa8a,
      fogDensity: 0.005,
      playerSpawn: { x: -20, z: 20 },
      botSpawns: [
        { x: 15, z: -25 },
        { x: 20, z: -20 },
        { x: 10, z: -22 },
      ],
      waypoints: [
        { x: 0, z: 0 }, { x: 15, z: 0 }, { x: -15, z: 0 },
        { x: 15, z: -15 }, { x: -10, z: -15 }, { x: 0, z: -25 },
        { x: 20, z: -10 }, { x: -20, z: 10 }, { x: -10, z: 20 },
        { x: 15, z: 15 }, { x: 0, z: 20 }, { x: -20, z: -5 },
        { x: 10, z: 10 }, { x: -5, z: -10 },
      ],
      build: function(scene) {
        var walls = [];

        // ── Materials ──
        var mossStone = concreteMat(0x8a9a72);
        var darkStone = concreteMat(0x6a7a58);
        var sandstone = concreteMat(0xd0bea0);
        var sandstoneDark = concreteMat(0xb8a882);
        var jungleGreen = concreteMat(0x3d7a2e);
        var moss = concreteMat(0x5a8a4a);
        var darkWood = woodMat(0x7a5a2a);
        var ropeMat = woodMat(0xd8b870);
        var earthFloor = jungleFloorMat(0x7a6a3a);
        var stonePath = jungleFloorMat(0x9a9a8a);
        var waterMat = glassMat(0x1a6a5a);

        // ═══════════════════════════════════════════════════
        //  FLOOR
        // ═══════════════════════════════════════════════════
        var floor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(70, 1, 60), earthFloor));
        floor.position.set(0, -0.5, 0);
        scene.add(floor);
        // Stone path markings
        D(scene, 3, 0.02, 30, stonePath, -10, 0.01, -5);
        D(scene, 20, 0.02, 3, stonePath, 5, 0.01, 0);
        D(scene, 3, 0.02, 20, stonePath, 15, 0.01, 10);

        // ═══════════════════════════════════════════════════
        //  PERIMETER WALLS
        // ═══════════════════════════════════════════════════
        var wH = 8, wT = 1.2;
        B(scene, walls, 72, wH, wT, mossStone, 0, wH/2, -30.6);
        B(scene, walls, 72, wH, wT, mossStone, 0, wH/2, 30.6);
        B(scene, walls, wT, wH, 60, mossStone, -35.6, wH/2, 0);
        B(scene, walls, wT, wH, 60, mossStone, 35.6, wH/2, 0);
        // Moss accents on perimeter
        D(scene, 72, 0.8, 0.1, moss, 0, 0.4, -30);
        D(scene, 72, 0.8, 0.1, moss, 0, 0.4, 30);
        D(scene, 0.1, 0.8, 60, moss, -35, 0.4, 0);
        D(scene, 0.1, 0.8, 60, moss, 35, 0.4, 0);
        // Vine decorations on walls
        D(scene, 0.15, 5, 0.1, jungleGreen, -35, 4, -15);
        D(scene, 0.15, 6, 0.1, jungleGreen, -35, 4, 10);
        D(scene, 0.15, 4, 0.1, jungleGreen, 35, 4.5, -8);
        D(scene, 0.15, 5.5, 0.1, jungleGreen, 35, 4, 18);
        D(scene, 0.1, 4.5, 0.15, jungleGreen, 10, 4.5, -30);
        D(scene, 0.1, 5, 0.15, jungleGreen, -20, 4, -30);

        // ═══════════════════════════════════════════════════
        //  RIVER (East-West, center of map)
        // ═══════════════════════════════════════════════════
        // Sunken channel floor
        var riverFloor = shadowRecv(new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 8), concreteMat(0x5a6a5a)));
        riverFloor.position.set(5, -4, 2);
        scene.add(riverFloor);
        // Water plane
        var water = new THREE.Mesh(new THREE.BoxGeometry(40, 0.15, 8), waterMat);
        water.position.set(5, -2, 2);
        scene.add(water);
        // North retaining wall
        B(scene, walls, 40, 4, 1, darkStone, 5, -1.5, -2.5);
        // South retaining wall
        B(scene, walls, 40, 4, 1, darkStone, 5, -1.5, 6.5);
        // West river end wall
        B(scene, walls, 1, 4, 10, darkStone, -15.5, -1.5, 2);
        // East river end wall
        B(scene, walls, 1, 4, 10, darkStone, 25.5, -1.5, 2);
        // Boulders in river
        D(scene, 1.5, 1.8, 1.5, mossStone, 0, -2.5, 2);
        D(scene, 1.2, 1.5, 1.0, mossStone, 8, -2.6, 3);
        D(scene, 1.0, 1.2, 1.3, darkStone, 18, -2.7, 1);
        D(scene, 0.8, 1.0, 0.9, mossStone, -8, -2.8, 3.5);
        // Waterfall (east end) — stacked thin emissive blocks
        D(scene, 2, 3.5, 0.3, emissiveMat(0x2a6a6a, 0x1a8a8a, 0.8), 24, -1.5, 2);
        D(scene, 1.5, 3, 0.2, emissiveMat(0x3a7a7a, 0x2a9a9a, 0.6), 24.5, -1.8, 2);

        // ═══════════════════════════════════════════════════
        //  ROPE BRIDGE (over river, east side)
        // ═══════════════════════════════════════════════════
        // Bridge deck (walkable)
        B(scene, walls, 3, 0.3, 10, darkWood, 15, -0.15, 2);
        // Plank lines
        D(scene, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, -1);
        D(scene, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, 1);
        D(scene, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, 3);
        D(scene, 3, 0.05, 0.15, woodMat(0x7a5a2a), 15, 0.02, 5);
        // Rope railings
        D(scene, 0.08, 1.0, 10, ropeMat, 13.3, 0.5, 2);
        D(scene, 0.08, 1.0, 10, ropeMat, 16.7, 0.5, 2);
        // Rope support posts
        CylW(scene, walls, 0.15, 0.18, 1.8, 6, darkWood, 13.3, 0.9, -3);
        CylW(scene, walls, 0.15, 0.18, 1.8, 6, darkWood, 16.7, 0.9, -3);
        CylW(scene, walls, 0.15, 0.18, 1.8, 6, darkWood, 13.3, 0.9, 7);
        CylW(scene, walls, 0.15, 0.18, 1.8, 6, darkWood, 16.7, 0.9, 7);

        // ═══════════════════════════════════════════════════
        //  DOUBLE DOORS CORRIDOR (west side, choke point)
        // ═══════════════════════════════════════════════════
        // Corridor walls
        B(scene, walls, 1, 5, 14, darkStone, -13, 2.5, -8);
        B(scene, walls, 1, 5, 14, darkStone, -7, 2.5, -8);
        // Door frame 1 (north end)
        B(scene, walls, 1.5, 5, 1, sandstone, -13, 2.5, -14);
        B(scene, walls, 1.5, 5, 1, sandstone, -7, 2.5, -14);
        D(scene, 7.5, 1, 1.2, sandstoneDark, -10, 5, -14);
        // Door frame 2 (south end)
        B(scene, walls, 1.5, 5, 1, sandstone, -13, 2.5, -2);
        B(scene, walls, 1.5, 5, 1, sandstone, -7, 2.5, -2);
        D(scene, 7.5, 1, 1.2, sandstoneDark, -10, 5, -2);
        // Crates inside corridor for cover
        B(scene, walls, 1.2, 1, 1.2, darkWood, -11, 0.5, -8);
        B(scene, walls, 1, 0.8, 1, darkWood, -8.5, 0.4, -6);

        // ═══════════════════════════════════════════════════
        //  BOMBSITE A — Stepped Temple (south-east)
        // ═══════════════════════════════════════════════════
        // Tier 1 (base)
        B(scene, walls, 14, 1.5, 14, sandstone, 15, 0.75, 18);
        // Tier 2
        B(scene, walls, 10, 1.5, 10, sandstoneDark, 15, 2.25, 18);
        // Tier 3 (top platform)
        B(scene, walls, 6, 1.5, 6, sandstone, 15, 3.75, 18);
        // Corner pillars
        CylW(scene, walls, 0.4, 0.5, 5, 8, darkStone, 9, 2.5, 12);
        CylW(scene, walls, 0.4, 0.5, 5, 8, darkStone, 21, 2.5, 12);
        CylW(scene, walls, 0.4, 0.5, 5, 8, darkStone, 9, 2.5, 24);
        CylW(scene, walls, 0.4, 0.5, 5, 8, darkStone, 21, 2.5, 24);
        // Aztec carved face decoration (geometric blocks on tier 2 front)
        D(scene, 1, 1, 0.3, mossStone, 15, 2.5, 12.5);
        D(scene, 0.4, 0.4, 0.2, sandstone, 14, 2.8, 12.5);
        D(scene, 0.4, 0.4, 0.2, sandstone, 16, 2.8, 12.5);
        D(scene, 0.6, 0.3, 0.15, darkStone, 15, 2.1, 12.5);
        // Ruin blocks for cover on tier 1
        B(scene, walls, 1.5, 1.2, 1.5, mossStone, 11, 2.1, 15);
        B(scene, walls, 1.2, 1.0, 1.2, darkStone, 19, 1.9, 21);
        // Steps up tier 1 (north face approach)
        buildStairs(scene, walls, 15, 11, 0, 1.5, 3, 'z+');

        // ═══════════════════════════════════════════════════
        //  BOMBSITE B — Temple Ruins (west side)
        // ═══════════════════════════════════════════════════
        // Broken walls
        B(scene, walls, 8, 4, 1, mossStone, -22, 2, 5);
        B(scene, walls, 1, 4, 6, mossStone, -26, 2, 8);
        B(scene, walls, 5, 2.5, 1, darkStone, -20, 1.25, 11);
        // Collapsed section (partial wall)
        B(scene, walls, 3, 1.5, 1, mossStone, -25, 0.75, 11);
        // Stone altar in center
        B(scene, walls, 3, 1.2, 2, sandstone, -22, 0.6, 8);
        D(scene, 2.5, 0.2, 1.5, sandstoneDark, -22, 1.3, 8);
        // Rubble
        D(scene, 1.5, 0.6, 1, darkStone, -18, 0.3, 7);
        D(scene, 0.8, 0.4, 1.2, mossStone, -24, 0.2, 12);
        D(scene, 1.0, 0.5, 0.8, darkStone, -19, 0.25, 10);
        // Fallen pillar
        D(scene, 0.6, 0.6, 5, sandstone, -17, 0.3, 9);

        // ═══════════════════════════════════════════════════
        //  OVERPASS / RAMP (elevated walkway)
        // ═══════════════════════════════════════════════════
        // Elevated platform connecting T area toward bombsite B
        B(scene, walls, 10, 0.5, 4, darkStone, -18, 3, -18);
        // Support pillars
        CylW(scene, walls, 0.4, 0.5, 3, 8, darkStone, -14, 1.5, -16.5);
        CylW(scene, walls, 0.4, 0.5, 3, 8, darkStone, -22, 1.5, -16.5);
        CylW(scene, walls, 0.4, 0.5, 3, 8, darkStone, -14, 1.5, -19.5);
        CylW(scene, walls, 0.4, 0.5, 3, 8, darkStone, -22, 1.5, -19.5);
        // Low wall railing on overpass
        B(scene, walls, 10, 1, 0.3, mossStone, -18, 3.75, -16.2);
        B(scene, walls, 10, 1, 0.3, mossStone, -18, 3.75, -19.8);
        // Stairs up to overpass (from ground level)
        buildStairs(scene, walls, -12, -18, 0, 3, 2.5, 'x-');

        // ═══════════════════════════════════════════════════
        //  T SPAWN — Jungle Clearing (north)
        // ═══════════════════════════════════════════════════
        // Tree trunks
        Cyl(scene, 0.4, 0.5, 6, 8, woodMat(0x5a4a2a), 20, 3, -25);
        Cyl(scene, 0.35, 0.45, 5, 8, woodMat(0x4a3a1a), 25, 2.5, -22);
        Cyl(scene, 0.5, 0.6, 7, 8, woodMat(0x5a4a2a), 8, 3.5, -28);
        // Tree canopy blobs
        D(scene, 4, 3, 4, jungleGreen, 20, 6.5, -25);
        D(scene, 3.5, 2.5, 3.5, jungleGreen, 25, 5.5, -22);
        D(scene, 5, 3.5, 5, jungleGreen, 8, 7.5, -28);
        // Bush clusters
        D(scene, 2, 1, 2, jungleGreen, 12, 0.5, -20);
        D(scene, 1.5, 0.8, 1.5, moss, 18, 0.4, -18);
        D(scene, 2.5, 1.2, 2, jungleGreen, 5, 0.6, -22);
        // Fern patches
        D(scene, 1.0, 0.5, 1.0, moss, 22, 0.25, -27);
        D(scene, 0.8, 0.4, 0.8, moss, 14, 0.2, -26);

        // ═══════════════════════════════════════════════════
        //  CT SPAWN — Courtyard (south-west)
        // ═══════════════════════════════════════════════════
        // Stone paved area
        D(scene, 12, 0.05, 10, stonePath, -20, 0.03, 20);
        // Low walls
        B(scene, walls, 6, 1.5, 0.6, sandstone, -20, 0.75, 15.3);
        B(scene, walls, 0.6, 1.5, 10, sandstone, -14.7, 0.75, 20);
        // Crates for cover
        B(scene, walls, 1.2, 1.2, 1.2, darkWood, -22, 0.6, 18);
        B(scene, walls, 1, 0.8, 1, darkWood, -22, 1.6, 18);
        B(scene, walls, 1.2, 1.2, 1.2, darkWood, -17, 0.6, 22);
        // Stone bench
        D(scene, 3, 0.6, 1, sandstone, -24, 0.3, 22);

        // ═══════════════════════════════════════════════════
        //  ADDITIONAL COVER ELEMENTS
        // ═══════════════════════════════════════════════════
        // Stone blocks scattered around map
        B(scene, walls, 1.5, 1.2, 1.5, mossStone, 0, 0.6, -10);
        B(scene, walls, 1.2, 1.0, 1.2, darkStone, -5, 0.5, 12);
        B(scene, walls, 1.5, 1.0, 1, sandstone, 25, 0.5, 10);
        B(scene, walls, 1.0, 0.8, 1.5, mossStone, 28, 0.4, -15);
        // Fallen stone column near river
        D(scene, 0.5, 0.5, 4, sandstone, -3, 0.25, -4);
        // Jungle rocks
        D(scene, 2, 1.5, 1.8, darkStone, 30, 0.75, 5);
        D(scene, 1.5, 1.0, 1.5, mossStone, -30, 0.5, -10);

        // ═══════════════════════════════════════════════════
        //  DECORATIVE DETAILS
        // ═══════════════════════════════════════════════════
        // Moss patches on structures
        D(scene, 3, 0.1, 0.1, moss, -22, 3.5, 5);
        D(scene, 0.1, 0.1, 3, moss, -26, 3, 8);
        D(scene, 4, 0.1, 0.1, moss, 15, 1.2, 11.5);
        // More vine strands on corridor
        D(scene, 0.1, 3, 0.1, jungleGreen, -13, 3, -10);
        D(scene, 0.1, 2.5, 0.1, jungleGreen, -7, 3.5, -5);
        // Scattered rubble
        D(scene, 0.6, 0.3, 0.4, darkStone, -15, 0.15, 3);
        D(scene, 0.4, 0.2, 0.5, sandstone, -8, 0.1, 14);
        D(scene, 0.5, 0.25, 0.3, mossStone, 5, 0.12, -15);
        // Jungle trees along perimeter
        Cyl(scene, 0.3, 0.4, 5, 8, woodMat(0x5a4a2a), -32, 2.5, -20);
        D(scene, 3, 2.5, 3, jungleGreen, -32, 5.5, -20);
        Cyl(scene, 0.35, 0.45, 6, 8, woodMat(0x4a3a1a), -32, 3, 15);
        D(scene, 3.5, 3, 3.5, jungleGreen, -32, 6.5, 15);
        Cyl(scene, 0.4, 0.5, 5.5, 8, woodMat(0x5a4a2a), 32, 2.75, -25);
        D(scene, 4, 3, 4, jungleGreen, 32, 5.75, -25);
        Cyl(scene, 0.3, 0.4, 6, 8, woodMat(0x4a3a1a), 32, 3, 20);
        D(scene, 3, 2.5, 3, jungleGreen, 32, 6.5, 20);
        // Fern clusters at ground level
        D(scene, 1.2, 0.5, 1.2, moss, -28, 0.25, 0);
        D(scene, 1.0, 0.4, 1.0, moss, 28, 0.2, -5);
        D(scene, 1.5, 0.6, 1.5, jungleGreen, -5, 0.3, 25);
        D(scene, 1.0, 0.4, 1.2, moss, 10, 0.2, -18);

        // ═══════════════════════════════════════════════════
        //  LIGHTING
        // ═══════════════════════════════════════════════════
        // Warm torch lights on temple walls
        addPointLight(scene, 0xffaa55, 1.4, 22, 15, 5, 12);
        addPointLight(scene, 0xffaa55, 1.1, 20, 9, 3, 18);
        addPointLight(scene, 0xffaa55, 1.1, 20, 21, 3, 18);
        // Bombsite B ruins
        addPointLight(scene, 0xff9944, 1.0, 20, -22, 3, 8);
        // Double doors corridor
        addPointLight(scene, 0xffbb66, 0.9, 16, -10, 4, -8);
        // Overpass
        addPointLight(scene, 0xffcc77, 0.9, 16, -18, 5, -18);
        // River / bridge area — cool blue-green
        addPointLight(scene, 0x55cccc, 0.7, 20, 15, 0, 2);
        addPointLight(scene, 0x55cccc, 0.6, 16, 0, 0, 2);
        // Waterfall glow
        addPointLight(scene, 0x44cccc, 0.9, 16, 24, -1, 2);
        // T spawn dappled light
        addPointLight(scene, 0xffddaa, 1.0, 22, 15, 5, -22);
        // CT courtyard
        addPointLight(scene, 0xffddaa, 1.1, 25, -20, 4, 20);
        // General fill
        addPointLight(scene, 0xffe0b0, 0.8, 30, 0, 6, 0);
        addPointLight(scene, 0xffe0b0, 0.6, 25, -10, 5, 10);
        addPointLight(scene, 0xffe0b0, 0.6, 25, 25, 5, -10);

        return walls;
      },
    },

  ];

  // ══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════

  GAME.getMapCount = function() { return maps.length; };
  GAME.getMapDef = function(index) { return maps[index % maps.length]; };

  GAME.buildMap = function(scene, mapIndex, renderer) {
    var def = GAME.getMapDef(mapIndex);

    // Hemisphere light for natural ambient (sky + ground bounce)
    var hemi = new THREE.HemisphereLight(0xb0c4de, 0x806040, 0.4);
    scene.add(hemi);

    // Ambient fill
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // Main directional light with shadows
    var dirLight = new THREE.DirectionalLight(0xfff4e5, 0.9);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    var sz = Math.max(def.size.x, def.size.z) * 0.6;
    dirLight.shadow.camera.left = -sz;
    dirLight.shadow.camera.right = sz;
    dirLight.shadow.camera.top = sz;
    dirLight.shadow.camera.bottom = -sz;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Fill light (opposite side, no shadows, subtle)
    var fillLight = new THREE.DirectionalLight(0xc8d8f0, 0.3);
    fillLight.position.set(-10, 15, -10);
    scene.add(fillLight);

    // Sky / fog
    createSkyDome(scene, def.skyColor, def.fogColor);
    scene.fog = new THREE.FogExp2(def.fogColor, def.fogDensity);
    if (renderer) createEnvMap(renderer, scene, def.skyColor, def.fogColor);

    var walls = def.build(scene);

    return {
      walls: walls,
      playerSpawn: def.playerSpawn,
      botSpawns: def.botSpawns,
      waypoints: def.waypoints,
      name: def.name,
      size: def.size,
    };
  };
  // ── Expose texture utilities for other modules ──────────
  GAME._texUtil = { hash: _hash, valueNoise: _valueNoise, fbmNoise: _fbmNoise,
                    makeCanvas: _makeCanvas, heightToNormal: _heightToNormal, texCache: _texCache };
})();
