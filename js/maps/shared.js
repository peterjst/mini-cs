// js/maps/shared.js — Shared map infrastructure (noise, textures, materials, helpers)
// Attaches to window.GAME
//
// Invariant: textures and materials are CACHED and SHARED. Reuse
// existing variables; do not create per-map duplicates of standard
// materials. New maps destructure helpers from GAME._mapHelpers and
// push their definition onto GAME._maps. See js/maps/dust.js for
// the canonical pattern.

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  // Recursively mark a subtree as static: matrices computed once, never
  // updated again. Use only for geometry that does not move after build.
  function markStatic(object3D) {
    object3D.updateMatrix();
    object3D.matrixAutoUpdate = false;
    for (var i = 0; i < object3D.children.length; i++) {
      markStatic(object3D.children[i]);
    }
  }
  GAME.markStatic = markStatic;

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
      vertexShader: [
        'varying vec3 vLocalPos;',
        'void main() {',
        '  vLocalPos = position;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 colorTop;',
        'uniform vec3 colorBottom;',
        'varying vec3 vLocalPos;',
        'void main() {',
        '  float h = normalize(vLocalPos).y;',
        '  float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);',
        '  t = t * t;',
        '  gl_FragColor = vec4(mix(colorBottom, colorTop, t), 1.0);',
        '}'
      ].join('\n'),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    var dome = new THREE.Mesh(new THREE.SphereGeometry(90, 16, 12), mat);
    dome.renderOrder = -1;
    dome.frustumCulled = false;
    scene.add(dome);
    GAME._skyDome = dome;
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

  // ── Spawn Zone Helpers ──────────────────────────────────

  var _spawnRC = new THREE.Raycaster();
  var _spawnDirs = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
  ];

  function _isPositionClear(x, z, walls) {
    var origin = new THREE.Vector3(x, 0.5, z);
    var clearRadius = 0.8;
    for (var d = 0; d < _spawnDirs.length; d++) {
      _spawnRC.set(origin, _spawnDirs[d]);
      _spawnRC.far = clearRadius;
      if (_spawnRC.intersectObjects(walls, false).length > 0) return false;
    }
    return true;
  }

  function randomSpawnInZone(zone, walls) {
    if (!zone.radius || zone.radius <= 0) return { x: zone.x, z: zone.z };
    for (var i = 0; i < 10; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = Math.random() * zone.radius;
      var x = zone.x + Math.cos(angle) * dist;
      var z = zone.z + Math.sin(angle) * dist;
      if (walls.length === 0 || _isPositionClear(x, z, walls)) {
        return { x: x, z: z };
      }
    }
    return { x: zone.x, z: zone.z };
  }

  function pickSpawnZone(zones, label, enemies) {
    if (!zones || zones.length === 0) return null;

    if (label && label !== 'furthest') {
      for (var i = 0; i < zones.length; i++) {
        if (zones[i].label === label) return zones[i];
      }
      return zones[0];
    }

    if (label === 'furthest' && enemies && enemies.length > 0) {
      var bestZone = zones[0];
      var bestMinDist = 0;
      for (var zi = 0; zi < zones.length; zi++) {
        var minDist = Infinity;
        for (var e = 0; e < enemies.length; e++) {
          var dx = zones[zi].x - enemies[e].x;
          var dz = zones[zi].z - enemies[e].z;
          var d = dx * dx + dz * dz;
          if (d < minDist) minDist = d;
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestZone = zones[zi];
        }
      }
      return bestZone;
    }

    return zones[Math.floor(Math.random() * zones.length)];
  }

  // ══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════

  GAME.getMapCount = function() { return GAME._maps.length; };
  GAME.getMapDef = function(index) { return GAME._maps[index % GAME._maps.length]; };

  GAME.buildMap = function(scene, mapIndex, renderer) {
    var def = GAME.getMapDef(mapIndex);

    // Read per-map lighting or use defaults
    var lt = def.lighting || {};
    var hemi = new THREE.HemisphereLight(
      lt.hemiSkyColor !== undefined ? lt.hemiSkyColor : 0xb0c4de,
      lt.hemiGroundColor !== undefined ? lt.hemiGroundColor : 0x806040,
      lt.hemiIntensity !== undefined ? lt.hemiIntensity : 0.4
    );
    scene.add(hemi);

    scene.add(new THREE.AmbientLight(0xffffff, lt.ambientIntensity !== undefined ? lt.ambientIntensity : 0.25));

    var dirLight = new THREE.DirectionalLight(
      lt.sunColor !== undefined ? lt.sunColor : 0xfff4e5,
      lt.sunIntensity !== undefined ? lt.sunIntensity : 0.9
    );
    var sp = lt.sunPos || [15, 25, 10];
    dirLight.position.set(sp[0], sp[1], sp[2]);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = lt.shadowMapSize || 2048;
    dirLight.shadow.mapSize.height = lt.shadowMapSize || 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    var pad = lt.shadowFrustumPadding || 0;
    var sz = Math.max(def.size.x, def.size.z) * 0.6 - pad;
    dirLight.shadow.camera.left = -sz;
    dirLight.shadow.camera.right = sz;
    dirLight.shadow.camera.top = sz;
    dirLight.shadow.camera.bottom = -sz;
    dirLight.shadow.bias = lt.shadowBias !== undefined ? lt.shadowBias : -0.001;
    scene.add(dirLight);
    GAME._dirLight = dirLight;

    var fillLight = new THREE.DirectionalLight(
      lt.fillColor !== undefined ? lt.fillColor : 0xc8d8f0,
      lt.fillIntensity !== undefined ? lt.fillIntensity : 0.3
    );
    fillLight.position.set(-10, 15, -10);
    scene.add(fillLight);

    // Sky / fog
    createSkyDome(scene, def.skyColor, def.fogColor);
    scene.fog = new THREE.FogExp2(def.fogColor, def.fogDensity);
    if (renderer) createEnvMap(renderer, scene, def.skyColor, def.fogColor);

    // Store color grading config for main.js to read
    GAME._currentColorGrade = def.colorGrade || {
      tint: [1, 1, 1],
      shadows: [0.9, 0.9, 0.9],
      contrast: 1.05,
      saturation: 1.1,
      vignetteStrength: 0.3
    };

    var preBuildChildren = scene.children.slice();
    var walls = def.build(scene);

    // Mark only newly-added subtrees as static (skip skydome and lights
    // added before def.build, since the skydome is animated to follow camera).
    // Same iteration also feeds dumpMapStats with the union of newly-added subtrees.
    var newlyAdded = [];
    for (var ci = 0; ci < scene.children.length; ci++) {
      var child = scene.children[ci];
      if (preBuildChildren.indexOf(child) === -1) {
        markStatic(child);
        newlyAdded.push(child);
      }
    }

    if (GAME._debugMapStats) {
      // Aggregate counts across the newly-added top-level children
      var aggregate = { children: newlyAdded };
      aggregate.traverse = function(fn) {
        fn(aggregate);
        function walk(c) {
          fn(c);
          if (c.children) for (var i = 0; i < c.children.length; i++) walk(c.children[i]);
        }
        for (var i = 0; i < newlyAdded.length; i++) walk(newlyAdded[i]);
      };
      dumpMapStats(def.name, aggregate);
    }

    return {
      walls: walls,
      playerSpawn: def.playerSpawn,
      botSpawns: def.botSpawns,
      spawnZones: def.spawnZones || null,
      ctSpawns: def.ctSpawns || [def.playerSpawn],
      tSpawns: def.tSpawns || def.botSpawns,
      bombsites: def.bombsites || [],
      waypoints: def.waypoints,
      name: def.name,
      size: def.size,
    };
  };

  // ── Surface Detail Helpers ─────────────────────────────────

  // Merge an array of geometries (with pre-applied transforms) into a single mesh
  function _mergeGeos(geos, mat, castAndReceiveShadow) {
    if (geos.length === 0) return null;
    // Sum total vertices and indices
    var totalVerts = 0, totalIdx = 0;
    for (var i = 0; i < geos.length; i++) {
      totalVerts += geos[i].attributes.position.count;
      totalIdx += geos[i].index ? geos[i].index.count : 0;
    }
    var pos = new Float32Array(totalVerts * 3);
    var norm = new Float32Array(totalVerts * 3);
    var uv = new Float32Array(totalVerts * 2);
    var idx = new Uint32Array(totalIdx);
    var vOff = 0, iOff = 0, vCount = 0;
    for (var g = 0; g < geos.length; g++) {
      var geo = geos[g];
      var gPos = geo.attributes.position.array;
      var gNorm = geo.attributes.normal.array;
      var gUv = geo.attributes.uv ? geo.attributes.uv.array : null;
      var vc = geo.attributes.position.count;
      pos.set(gPos, vOff * 3);
      norm.set(gNorm, vOff * 3);
      if (gUv) uv.set(gUv, vOff * 2);
      if (geo.index) {
        var gIdx = geo.index.array;
        for (var j = 0; j < gIdx.length; j++) {
          idx[iOff + j] = gIdx[j] + vCount;
        }
        iOff += gIdx.length;
      }
      vCount += vc;
      vOff += vc;
      geo.dispose();
    }
    var merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (totalIdx > 0) merged.setIndex(new THREE.BufferAttribute(idx, 1));
    var mesh = new THREE.Mesh(merged, mat);
    if (castAndReceiveShadow !== false) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    return mesh;
  }

  // WallRelief: adds decorative surface detail to walls
  function WallRelief(scene, w, h, d, mat, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'brick';
    var group = new THREE.Group();
    group.position.set(x, y, z);

    if (style === 'brick') {
      var brickW = 0.24, brickH = 0.12, gap = 0.02;
      var cols = Math.floor(w / (brickW + gap));
      var rows = Math.floor(h / (brickH + gap));
      var brickMat = mat || concreteMat();
      var geos = [];
      for (var r = 0; r < rows; r++) {
        var offset = (r % 2) * (brickW / 2);
        for (var c = 0; c < cols; c++) {
          var bx = -w / 2 + offset + c * (brickW + gap) + brickW / 2;
          var by = -h / 2 + r * (brickH + gap) + brickH / 2;
          if (bx + brickW / 2 > w / 2) continue;
          var geo = new THREE.BoxGeometry(brickW, brickH, 0.03);
          geo.translate(bx, by, d / 2 + 0.015);
          geos.push(geo);
        }
      }
      var merged = _mergeGeos(geos, brickMat);
      if (merged) group.add(merged);
    } else if (style === 'stone') {
      var stoneW = 0.35, stoneH = 0.2, sGap = 0.03;
      var sCols = Math.floor(w / (stoneW + sGap));
      var sRows = Math.floor(h / (stoneH + sGap));
      var sMat = mat || concreteMat();
      var sGeos = [];
      for (var sr = 0; sr < sRows; sr++) {
        for (var sc = 0; sc < sCols; sc++) {
          var sw = stoneW * (0.8 + Math.random() * 0.4);
          var sx = -w / 2 + sc * (stoneW + sGap) + sw / 2;
          var sy = -h / 2 + sr * (stoneH + sGap) + stoneH / 2;
          var sGeo = new THREE.BoxGeometry(sw, stoneH, 0.04);
          sGeo.translate(sx, sy, d / 2 + 0.02);
          sGeos.push(sGeo);
        }
      }
      var sMerged = _mergeGeos(sGeos, sMat);
      if (sMerged) group.add(sMerged);
    } else if (style === 'plaster_crack') {
      var pMat = mat || plasterMat();
      var pGeos = [];
      for (var cr = 0; cr < 4; cr++) {
        var cLen = 0.3 + Math.random() * 0.5;
        var crackGeo = new THREE.BoxGeometry(cLen, 0.01, 0.01);
        var rz = (Math.random() - 0.5) * 1.5;
        crackGeo.rotateZ(rz);
        crackGeo.translate(
          (Math.random() - 0.5) * w * 0.7,
          (Math.random() - 0.5) * h * 0.7,
          d / 2 + 0.005
        );
        pGeos.push(crackGeo);
      }
      var pMerged = _mergeGeos(pGeos, pMat);
      if (pMerged) group.add(pMerged);
      // Exposed patch (different material — separate mesh)
      var patch = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), concreteMat()));
      patch.position.set((Math.random() - 0.5) * w * 0.4, (Math.random() - 0.5) * h * 0.3, d / 2 - 0.01);
      group.add(patch);
    } else if (style === 'panel') {
      var panelMat = mat || woodMat();
      var panelH = h * 0.45;
      var panelCount = Math.max(2, Math.floor(w / 1.0));
      var panelW = (w - (panelCount + 1) * 0.04) / panelCount;
      var panGeos = [];
      for (var p = 0; p < panelCount; p++) {
        var px = -w / 2 + 0.04 + p * (panelW + 0.04) + panelW / 2;
        var panGeo = new THREE.BoxGeometry(panelW, panelH, 0.02);
        panGeo.translate(px, -h / 2 + panelH / 2 + 0.05, d / 2 + 0.01);
        panGeos.push(panGeo);
      }
      // Border strip
      var borderGeo = new THREE.BoxGeometry(w, 0.04, 0.02);
      borderGeo.translate(0, -h / 2 + panelH + 0.07, d / 2 + 0.01);
      panGeos.push(borderGeo);
      var panMerged = _mergeGeos(panGeos, panelMat);
      if (panMerged) group.add(panMerged);
    }
    scene.add(group);
    return group;
  }

  // FloorDetail: adds decorative floor surface patterns
  function FloorDetail(scene, w, d, mat, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'cracked_tile';
    var group = new THREE.Group();
    group.position.set(x, y + 0.01, z);

    if (style === 'cracked_tile') {
      var tileW = 0.5, tileD = 0.5, tGap = 0.02;
      var tCols = Math.floor(w / (tileW + tGap));
      var tRows = Math.floor(d / (tileD + tGap));
      var tileMat = mat || floorMat();
      var tGeos = [];
      for (var tr = 0; tr < tRows; tr++) {
        for (var tc = 0; tc < tCols; tc++) {
          var tGeo = new THREE.BoxGeometry(tileW, 0.02, tileD);
          tGeo.translate(
            -w / 2 + tc * (tileW + tGap) + tileW / 2,
            0,
            -d / 2 + tr * (tileD + tGap) + tileD / 2
          );
          tGeos.push(tGeo);
        }
      }
      var tMerged = _mergeGeos(tGeos, tileMat);
      if (tMerged) group.add(tMerged);
    } else if (style === 'worn_plank') {
      var plankW = 0.15, pGap = 0.02;
      var plankCount = Math.floor(w / (plankW + pGap));
      var plankMat = mat || woodMat();
      var plGeos = [];
      for (var pl = 0; pl < plankCount; pl++) {
        var plGeo = new THREE.BoxGeometry(plankW, 0.02, d * 0.9);
        plGeo.translate(-w / 2 + pl * (plankW + pGap) + plankW / 2, 0, 0);
        plGeos.push(plGeo);
      }
      var plMerged = _mergeGeos(plGeos, plankMat);
      if (plMerged) group.add(plMerged);
      // Nail heads (few enough to keep separate — different material)
      for (var n = 0; n < 6; n++) {
        var nail = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.005, 4), darkMetalMat()));
        nail.position.set((Math.random() - 0.5) * w * 0.8, 0.015, (Math.random() - 0.5) * d * 0.7);
        group.add(nail);
      }
    } else if (style === 'cobblestone') {
      var cobW = 0.2, cobD = 0.2, cGap = 0.03;
      var cCols = Math.floor(w / (cobW + cGap));
      var cRows = Math.floor(d / (cobD + cGap));
      var cobMat = mat || concreteMat();
      var cGeos = [];
      for (var cr2 = 0; cr2 < cRows; cr2++) {
        for (var cc = 0; cc < cCols; cc++) {
          var cw = cobW * (0.8 + Math.random() * 0.4);
          var cd = cobD * (0.8 + Math.random() * 0.4);
          var cobGeo = new THREE.BoxGeometry(cw, 0.04, cd);
          if (GAME._props && GAME._props.displaceVertices) {
            GAME._props.displaceVertices(cobGeo, 0.01, cr2 * 100 + cc, 'y');
          }
          cobGeo.translate(
            -w / 2 + cc * (cobW + cGap) + cw / 2,
            0,
            -d / 2 + cr2 * (cobD + cGap) + cd / 2
          );
          cGeos.push(cobGeo);
        }
      }
      var cMerged = _mergeGeos(cGeos, cobMat);
      if (cMerged) group.add(cMerged);
    }
    scene.add(group);
    return group;
  }

  // CeilingDetail: adds decorative ceiling patterns
  function CeilingDetail(scene, w, d, mat, x, y, z, opts) {
    opts = opts || {};
    var style = opts.style || 'beams';
    var group = new THREE.Group();
    group.position.set(x, y, z);

    if (style === 'beams') {
      var beamMat = mat || woodMat();
      var beamCount = Math.max(2, Math.floor(w / 1.5));
      var bmGeos = [];
      for (var b = 0; b < beamCount; b++) {
        var bx = -w / 2 + (b + 0.5) * (w / beamCount);
        var bmGeo = new THREE.BoxGeometry(0.15, 0.2, d * 0.95);
        bmGeo.translate(bx, -0.1, 0);
        bmGeos.push(bmGeo);
      }
      // Cross beam
      var crossGeo = new THREE.BoxGeometry(w * 0.95, 0.15, 0.12);
      crossGeo.translate(0, -0.08, 0);
      bmGeos.push(crossGeo);
      var bmMerged = _mergeGeos(bmGeos, beamMat);
      if (bmMerged) group.add(bmMerged);
    } else if (style === 'pipes') {
      var pipeMat = mat || metalMat();
      var piGeos = [];
      for (var p = 0; p < 4; p++) {
        var pz = -d / 2 + (p + 0.5) * (d / 4);
        var pipeRadius = 0.03 + Math.random() * 0.03;
        var piGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, w * 0.9, 6);
        piGeo.rotateZ(Math.PI / 2);
        piGeo.translate(0, -pipeRadius, pz);
        piGeos.push(piGeo);
      }
      var piMerged = _mergeGeos(piGeos, pipeMat);
      if (piMerged) group.add(piMerged);
    } else if (style === 'panels') {
      var panMat = mat || ceilingMat();
      var pCols = Math.max(2, Math.floor(w / 0.8));
      var pRows = Math.max(2, Math.floor(d / 0.8));
      var pw = (w - (pCols + 1) * 0.04) / pCols;
      var pd = (d - (pRows + 1) * 0.04) / pRows;
      var cpGeos = [];
      for (var pr = 0; pr < pRows; pr++) {
        for (var pc = 0; pc < pCols; pc++) {
          var panelX = -w / 2 + 0.04 + pc * (pw + 0.04) + pw / 2;
          var panelZ = -d / 2 + 0.04 + pr * (pd + 0.04) + pd / 2;
          var cpGeo = new THREE.BoxGeometry(pw, 0.02, pd);
          cpGeo.translate(panelX, 0, panelZ);
          cpGeos.push(cpGeo);
        }
      }
      // Frame strips
      for (var fs = 0; fs <= pCols; fs++) {
        var fsx = -w / 2 + fs * (pw + 0.04);
        var fsGeo = new THREE.BoxGeometry(0.04, 0.04, d);
        fsGeo.translate(fsx, -0.01, 0);
        cpGeos.push(fsGeo);
      }
      var cpMerged = _mergeGeos(cpGeos, panMat);
      if (cpMerged) group.add(cpMerged);
    }
    scene.add(group);
    return group;
  }

  // ── Debug telemetry ─────────────────────────────────────────
  function dumpMapStats(name, root) {
    if (!GAME._debugMapStats) return;
    var meshes = 0, shadowCasters = 0, lights = 0;
    var materials = new Set(), geometries = new Set();
    root.traverse(function(o) {
      if (o.isMesh) {
        meshes++;
        if (o.castShadow) shadowCasters++;
        if (o.material) materials.add(o.material.uuid || o.material);
        if (o.geometry) geometries.add(o.geometry.uuid || o.geometry);
      } else if (o.isLight) {
        lights++;
      }
    });
    console.log(
      '[map-stats] ' + name +
      '  meshes=' + meshes +
      '  shadowCasters=' + shadowCasters +
      '  lights=' + lights +
      '  materials=' + materials.size +
      '  geometries=' + geometries.size
    );
  }

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
    // Surface detail helpers
    WallRelief: WallRelief, FloorDetail: FloorDetail, CeilingDetail: CeilingDetail,
    // Spawn zone helpers
    randomSpawnInZone: randomSpawnInZone, pickSpawnZone: pickSpawnZone,
    // Debug telemetry
    dumpMapStats: dumpMapStats,
  };

  GAME._texUtil = { hash: _hash, valueNoise: _valueNoise, fbmNoise: _fbmNoise,
                    makeCanvas: _makeCanvas, heightToNormal: _heightToNormal, texCache: _texCache };
})();
