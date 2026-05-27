import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

beforeAll(() => {
  // main.js needs all prior modules (same chain as tests/unit/main.test.js)
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/core/player.js');
  loadModule('js/core/sound.js');
  loadModule('js/systems/weapons.js');
  loadModule('js/systems/enemies.js');
  loadModule('js/core/renderer.js');
  loadModule('js/effects/effects.js');
  loadModule('js/effects/birds.js');
  loadModule('js/ui/minimap.js');
  loadModule('js/ui/hud.js');
  loadModule('js/ui/buy.js');
  loadModule('js/ui/menu.js');
  loadModule('js/systems/progression.js');
  loadModule('js/systems/bomb.js');
  loadModule('js/systems/boss.js');
  loadModule('js/systems/shuffle.js');
  loadModule('js/modes/competitive.js');
  loadModule('js/modes/survival.js');
  loadModule('js/modes/gungame.js');
  loadModule('js/modes/deathmatch.js');
  loadModule('js/core/main.js');
});

describe('GAME._skipBossForMode persistence', () => {
  beforeEach(() => { localStorage.clear(); });

  it('defaults to false (boss ON) when no key is stored', () => {
    expect(GAME._skipBossForMode('competitive')).toBe(false);
    expect(GAME._skipBossForMode('survival')).toBe(false);
    expect(GAME._skipBossForMode('gungame')).toBe(false);
    expect(GAME._skipBossForMode('deathmatch')).toBe(false);
  });

  it('returns true only when the stored value is exactly "true"', () => {
    localStorage.setItem('miniCS_skipBoss_survival', 'true');
    expect(GAME._skipBossForMode('survival')).toBe(true);
    localStorage.setItem('miniCS_skipBoss_survival', 'false');
    expect(GAME._skipBossForMode('survival')).toBe(false);
    localStorage.setItem('miniCS_skipBoss_survival', 'garbage');
    expect(GAME._skipBossForMode('survival')).toBe(false);
  });

  it('is independent per mode', () => {
    localStorage.setItem('miniCS_skipBoss_deathmatch', 'true');
    expect(GAME._skipBossForMode('deathmatch')).toBe(true);
    expect(GAME._skipBossForMode('competitive')).toBe(false);
  });

  it('initializes GAME._skipBoss to false', () => {
    expect(typeof GAME._skipBoss).toBe('boolean');
  });
});

function srcOf(rel) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('boss spawns are gated by GAME._skipBoss', () => {
  it('competitive final-round boss spawn is skip-gated', () => {
    const src = srcOf('js/modes/competitive.js');
    const m = src.match(/if \(!teamMode && GAME\.boss\.isBossRound\(roundNumber\)[^)]*\)/);
    expect(m, 'boss-round condition not found').not.toBeNull();
    expect(m[0]).toContain('!GAME._skipBoss');
  });

  it('survival 5th-wave boss spawn is skip-gated', () => {
    const src = srcOf('js/modes/survival.js');
    const m = src.match(/if \(survivalWave % 5 === 0[^)]*\)/);
    expect(m, 'wave-5 condition not found').not.toBeNull();
    expect(m[0]).toContain('!GAME._skipBoss');
  });
});
