// js/maps/shared.js — Shared map infrastructure (noise, textures, materials, helpers)
// Attaches to window.GAME

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  // Map registry — individual map files push their definitions here
  GAME._maps = [];

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
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════

  GAME.getMapCount = function() { return GAME._maps.length; };
  GAME.getMapDef = function(index) { return GAME._maps[index % GAME._maps.length]; };

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
      ctSpawns: def.ctSpawns || [def.playerSpawn],
      tSpawns: def.tSpawns || def.botSpawns,
      bombsites: def.bombsites || [],
      waypoints: def.waypoints,
      name: def.name,
      size: def.size,
    };
  };

  // ── Expose helpers for map files and other modules ──────────
  GAME._mapHelpers = {
    shadow: shadow, shadowRecv: shadowRecv,
    B: B, D: D, Cyl: Cyl, CylW: CylW,
    buildStairs: buildStairs,
    addPointLight: addPointLight, addHangingLight: addHangingLight,
    // Material factories
    floorMat: floorMat, concreteMat: concreteMat, plasterMat: plasterMat,
    woodMat: woodMat, metalMat: metalMat, darkMetalMat: darkMetalMat,
    fabricMat: fabricMat, glassMat: glassMat, crateMat: crateMat,
    emissiveMat: emissiveMat, ceilingMat: ceilingMat,
    dustFloorMat: dustFloorMat, officeTileMat: officeTileMat,
    warehouseFloorMat: warehouseFloorMat, jungleFloorMat: jungleFloorMat,
  };

  GAME._texUtil = { hash: _hash, valueNoise: _valueNoise, fbmNoise: _fbmNoise,
                    makeCanvas: _makeCanvas, heightToNormal: _heightToNormal, texCache: _texCache };
})();
