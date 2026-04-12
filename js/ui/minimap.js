// js/ui/minimap.js — Minimap rendering extracted from main.js
(function() {
  'use strict';

  var minimapCtx = null;
  var minimapWallSegments = [];
  var minimapFrame = 0;
  var minimapScale = 1;
  var minimapCenter = { x: 0, z: 0 };

  function cacheMinimapWalls(walls, mapSize) {
    minimapWallSegments = [];
    var mx = mapSize ? mapSize.x : 50;
    var mz = mapSize ? mapSize.z : 50;
    minimapScale = 160 / Math.max(mx, mz);
    minimapCenter = { x: 0, z: 0 };

    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (!w.geometry || !w.geometry.parameters) continue;
      var p = w.geometry.parameters;
      var pos = w.position;
      // Only take walls that are on the ground floor (or close)
      if (pos.y > 6) continue;
      var hw = (p.width || p.radiusTop * 2 || 0.5) / 2;
      var hd = (p.depth || p.radiusTop * 2 || 0.5) / 2;
      minimapWallSegments.push({
        x: pos.x - hw, z: pos.z - hd,
        w: p.width || p.radiusTop * 2 || 0.5,
        d: p.depth || p.radiusTop * 2 || 0.5
      });
    }
  }

  function updateMinimap() {
    if (!minimapCtx) {
      var dom = GAME.dom;
      if (dom && dom.minimapCanvas) {
        minimapCtx = dom.minimapCanvas.getContext('2d');
      }
    }
    if (!minimapCtx) return;
    minimapFrame++;
    if (minimapFrame % 3 !== 0) return;

    var player = GAME.player;
    var enemyManager = GAME._enemyManager;

    var ctx = minimapCtx;
    var cw = 180, ch = 180;
    var cx = cw / 2, cy = ch / 2;
    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(cx, cy, 88, 0, Math.PI * 2);
    ctx.fill();

    var playerYaw = player.yaw;
    var px = player.position.x;
    var pz = player.position.z;
    var sc = minimapScale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerYaw);

    // Draw walls
    ctx.fillStyle = 'rgba(150,150,150,0.4)';
    for (var i = 0; i < minimapWallSegments.length; i++) {
      var seg = minimapWallSegments[i];
      var rx = (seg.x - px) * sc;
      var rz = (seg.z - pz) * sc;
      var rw = seg.w * sc;
      var rd = seg.d * sc;
      ctx.fillRect(rx, rz, rw, rd);
    }

    // Draw enemies (red dots)
    var enemies = enemyManager.enemies;
    var now = performance.now() / 1000;
    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      if (!e.alive) continue;
      // Show if enemy fired recently (within 2s) or in attack/chase state
      var recentlyFired = (now - e.lastFireTime) < 2;
      if (!recentlyFired && e.state === 0) continue; // PATROL and hasn't fired
      var ex = (e.mesh.position.x - px) * sc;
      var ez = (e.mesh.position.z - pz) * sc;
      var dist = Math.sqrt(ex * ex + ez * ez);
      if (dist > 85) continue;
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.arc(ex, ez, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Player triangle (always centered, pointing up)
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  GAME.minimap = {
    cacheWalls: cacheMinimapWalls,
    update: updateMinimap
  };
})();
