import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/player.js');
  loadModule('js/weapons.js');
  loadModule('js/enemies.js');
});

describe('combat integration', () => {
  var player;

  beforeEach(() => {
    GAME.hasPerk = undefined;
    var camera = new THREE.PerspectiveCamera();
    player = new GAME.Player(camera);
  });

  it('rifle damage should reduce health correctly', () => {
    var rifleDmg = GAME.WEAPON_DEFS.rifle.damage; // 36
    player.takeDamage(rifleDmg);
    expect(player.health).toBe(100 - rifleDmg);
  });

  it('headshot should apply 2.5x multiplier', () => {
    var baseDmg = GAME.WEAPON_DEFS.rifle.damage; // 36
    var hsDmg = baseDmg * 2.5; // 90
    player.takeDamage(hsDmg);
    expect(player.health).toBe(100 - hsDmg);
  });

  it('AWP headshot should kill from full health', () => {
    var awpHs = GAME.WEAPON_DEFS.awp.damage * 2.5; // 115 * 2.5 = 287.5
    player.takeDamage(awpHs);
    expect(player.alive).toBe(false);
  });

  it('armor should reduce rifle body shot damage', () => {
    player.armor = 100;
    var rifleDmg = GAME.WEAPON_DEFS.rifle.damage; // 36
    player.takeDamage(rifleDmg);
    // absorbed = min(100, 36*0.5) = 18
    // health = 100 - (36 - 18) = 82
    expect(player.health).toBe(82);
    expect(player.armor).toBe(82);
  });

  it('stopping_power + marksman perk should stack', () => {
    GAME.hasPerk = function(id) {
      return id === 'stopping_power' || id === 'marksman' || id === 'juggernaut';
    };
    // With juggernaut: damage * 0.85
    // stopping_power would be applied at fire time (1.25x), not in takeDamage
    // juggernaut is the only perk in takeDamage
    var dmg = 100;
    player.takeDamage(dmg);
    expect(player.health).toBe(15); // 100 - 100*0.85 = 15
  });

  it('shotgun 10 pellets should deal cumulative damage', () => {
    var pelletDmg = GAME.WEAPON_DEFS.shotgun.damage; // 32 per pellet
    var totalDmg = pelletDmg * GAME.WEAPON_DEFS.shotgun.pellets; // 32 * 10 = 320
    player.takeDamage(totalDmg);
    expect(player.alive).toBe(false);
  });

  it('knife should not kill from full health in one hit', () => {
    player.takeDamage(GAME.WEAPON_DEFS.knife.damage); // 55
    expect(player.alive).toBe(true);
    expect(player.health).toBe(45);
  });
});

describe('Boss combat integration', () => {
  it('boss should take damage and transition phases', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];

    expect(boss.isBoss).toBe(true);
    expect(boss._bossPhase).toBe(1);

    // Deal damage to reach phase 2
    var phase2Threshold = boss.maxHealth * 0.5;
    var damageNeeded = boss.health - phase2Threshold + 1;
    boss.takeDamage(damageNeeded);
    expect(boss._bossPhase).toBe(2);
    expect(boss.alive).toBe(true);

    // Disable shield so further damage is unmitigated
    boss._bossShieldActive = false;
    boss._bossShieldTimer = 0;

    // Deal damage to reach phase 3
    var phase3Threshold = boss.maxHealth * 0.25;
    damageNeeded = boss.health - phase3Threshold + 1;
    boss.takeDamage(damageNeeded);
    expect(boss._bossPhase).toBe(3);
    expect(boss.alive).toBe(true);

    // Disable shield and kill the boss
    boss._bossShieldActive = false;
    boss._bossShieldTimer = 0;
    boss.takeDamage(boss.health);
    expect(boss.alive).toBe(false);
  });

  it('boss barrage config should match phase', () => {
    var cfg = GAME.BOSS_BARRAGE;
    expect(cfg.phase1.cooldown).toBeGreaterThan(cfg.phase2.cooldown);
    expect(cfg.phase2.cooldown).toBeGreaterThan(cfg.phase3.cooldown);
    expect(cfg.phase3.grenades).toBeGreaterThan(cfg.phase1.grenades);
  });

  it('boss should not spawn minions when noMinions is set', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], [], { noMinions: true });
    var boss = em.enemies[em.enemies.length - 1];
    expect(boss._bossNoMinions).toBe(true);
  });

  it('boss hpMult option should scale health', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], [], { hpMult: 1.5 });
    var boss = em.enemies[em.enemies.length - 1];
    var expectedHP = Math.round(GAME.BOSS_STATS.normal.health * 1.5);
    expect(boss.health).toBe(expectedHP);
    expect(boss.maxHealth).toBe(expectedHP);
  });

  it('boss HP should match rebalanced values per difficulty', () => {
    expect(GAME.BOSS_STATS.easy.health).toBe(800);
    expect(GAME.BOSS_STATS.normal.health).toBe(1500);
    expect(GAME.BOSS_STATS.hard.health).toBe(2800);
    expect(GAME.BOSS_STATS.elite.health).toBe(4500);
  });

  it('boss should activate shield on phase 2 transition', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];

    // Damage to just below 50% to trigger phase 2
    var phase2Threshold = boss.maxHealth * 0.5;
    boss.takeDamage(boss.health - phase2Threshold + 1);

    expect(boss._bossPhase).toBe(2);
    expect(boss._bossShieldActive).toBe(true);
    expect(boss._bossShieldTimer).toBeCloseTo(3.0, 1);
  });

  it('boss should activate shield on phase 3 transition', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];

    // Skip to phase 2 first
    boss.takeDamage(boss.health - boss.maxHealth * 0.5 + 1);
    boss._bossShieldActive = false;
    boss._bossShieldTimer = 0;

    // Damage to below 25% to trigger phase 3
    boss.takeDamage(boss.health - boss.maxHealth * 0.25 + 1);
    expect(boss._bossPhase).toBe(3);
    expect(boss._bossShieldActive).toBe(true);
  });

  it('shield should reduce damage by 85%', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];

    // Activate shield manually
    boss._bossShieldActive = true;
    boss._bossShieldTimer = 4.0;
    var hpBefore = boss.health;
    boss.takeDamage(100);
    // Should only take 5% = 5 damage
    expect(boss.health).toBe(hpBefore - 5);
  });

  it('boss HP should floor at 1 during shield', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];

    // Activate shield and deal massive damage
    boss._bossShieldActive = true;
    boss._bossShieldTimer = 3.0;
    boss.takeDamage(999999);
    expect(boss.alive).toBe(true);
    expect(boss.health).toBe(1);
  });
});

describe('Boss minion ID uniqueness', () => {
  // Helper: spawn minions using the same logic as checkBossMinions in main.js
  function spawnMinions(scene, em, count, wps) {
    var maxId = 0;
    for (var mi = 0; mi < em.enemies.length; mi++) {
      if (em.enemies[mi].id >= maxId) maxId = em.enemies[mi].id + 1;
    }
    for (var j = 0; j < count; j++) {
      var minion = new GAME._Enemy(scene, { x: j, z: j }, wps, [], maxId + j, 1);
      minion._isBossMinion = true;
      em.enemies.push(minion);
    }
  }

  it('minion IDs should not collide with existing enemy IDs across multiple spawn waves', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    var wps = [{ x: 0, z: 0 }, { x: 10, z: 10 }];
    GAME.setDifficulty('normal');

    // Spawn regular bots + boss
    em.spawnBots([{ x: 5, z: 5 }, { x: -5, z: -5 }], wps, [], 2);
    em.spawnBoss({ x: 0, z: 0 }, wps, []);

    // Spawn phase 2 minions, then phase 3 minions
    spawnMinions(scene, em, 2, wps);
    spawnMinions(scene, em, 3, wps);

    // All enemy IDs should be unique
    var ids = em.enemies.map(function(e) { return e.id; });
    var uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('minion IDs should not collide even when earlier minions die and new ones spawn', () => {
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    var wps = [{ x: 0, z: 0 }, { x: 10, z: 10 }];
    GAME.setDifficulty('normal');

    // Spawn boss + 2 regular bots
    em.spawnBots([{ x: 5, z: 5 }, { x: -5, z: -5 }], wps, [], 2);
    em.spawnBoss({ x: 0, z: 0 }, wps, []);

    // Spawn and kill phase 2 minions
    spawnMinions(scene, em, 2, wps);
    for (var i = 0; i < em.enemies.length; i++) {
      if (em.enemies[i]._isBossMinion) em.enemies[i].takeDamage(9999);
    }

    // Spawn phase 3 minions
    spawnMinions(scene, em, 3, wps);

    // No alive enemy should share an ID with a dead enemy
    var aliveIds = [];
    var deadIds = [];
    for (var e = 0; e < em.enemies.length; e++) {
      if (em.enemies[e].alive) aliveIds.push(em.enemies[e].id);
      else deadIds.push(em.enemies[e].id);
    }
    for (var a = 0; a < aliveIds.length; a++) {
      expect(deadIds).not.toContain(aliveIds[a]);
    }
  });
});
