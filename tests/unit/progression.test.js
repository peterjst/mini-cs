import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/core/format.js');
  loadModule('js/systems/progression.js');
});

describe('GAME.progression API', () => {
  it('should expose progression object on GAME', () => {
    expect(GAME.progression).toBeDefined();
  });

  it('should expose DIFF_XP_MULT with correct values', () => {
    expect(GAME.progression.DIFF_XP_MULT).toEqual({ easy: 0.5, normal: 1, hard: 1.5, elite: 2.5 });
  });

  it('should expose PERK_POOL array', () => {
    expect(Array.isArray(GAME.progression.PERK_POOL)).toBe(true);
    expect(GAME.progression.PERK_POOL.length).toBe(11);
  });

  it('should expose hasPerk as GAME.hasPerk', () => {
    expect(typeof GAME.hasPerk).toBe('function');
    expect(GAME.hasPerk).toBe(GAME.progression.hasPerk);
  });
});

describe('Rank/XP system', () => {
  beforeEach(() => {
    localStorage.removeItem('miniCS_xp');
  });

  it('getTotalXP returns 0 when no XP stored', () => {
    expect(GAME.progression.getTotalXP()).toBe(0);
  });

  it('setTotalXP and getTotalXP round-trip', () => {
    GAME.progression.setTotalXP(500);
    expect(GAME.progression.getTotalXP()).toBe(500);
  });

  it('getRankForXP returns Silver I for 0 XP', () => {
    var rank = GAME.progression.getRankForXP(0);
    expect(rank.name).toBe('Silver I');
    expect(rank.index).toBe(0);
  });

  it('getRankForXP returns correct rank for mid-range XP', () => {
    var rank = GAME.progression.getRankForXP(2300);
    expect(rank.name).toBe('Gold Nova II');
  });

  it('getRankForXP returns Global Elite for max XP', () => {
    var rank = GAME.progression.getRankForXP(99999);
    expect(rank.name).toBe('Global Elite');
  });

  it('getNextRank returns next rank', () => {
    var rank = GAME.progression.getRankForXP(0);
    var next = GAME.progression.getNextRank(rank);
    expect(next.name).toBe('Silver II');
  });

  it('getNextRank returns null for max rank', () => {
    var rank = GAME.progression.getRankForXP(99999);
    var next = GAME.progression.getNextRank(rank);
    expect(next).toBeNull();
  });

  it('calculateXP computes correctly', () => {
    // 3 kills * 10 + 1 headshot * 5 + 2 roundsWon * 20 + win 50 = 125, * 1.5 = 188
    var xp = GAME.progression.calculateXP(3, 1, 2, true, 1.5);
    expect(xp).toBe(188);
  });

  it('calculateXP with no win', () => {
    // 5 kills * 10 + 2 headshots * 5 + 0 rounds * 20 + 0 = 60, * 1 = 60
    var xp = GAME.progression.calculateXP(5, 2, 0, false, 1);
    expect(xp).toBe(60);
  });

  it('awardXP increases total XP', () => {
    GAME.progression.setTotalXP(100);
    GAME.progression.awardXP(50);
    expect(GAME.progression.getTotalXP()).toBe(150);
  });

  it('awardXP returns rank info', () => {
    GAME.progression.setTotalXP(0);
    var result = GAME.progression.awardXP(0);
    expect(result.oldRank).toBeDefined();
    expect(result.newRank).toBeDefined();
    expect(typeof result.ranked_up).toBe('boolean');
  });

  it('awardXP detects rank up', () => {
    GAME.progression.setTotalXP(95);
    var result = GAME.progression.awardXP(10); // 105 XP -> Silver II (100)
    expect(result.ranked_up).toBe(true);
    expect(result.newRank.name).toBe('Silver II');
  });
});

describe('Kill streak system', () => {
  beforeEach(() => {
    GAME.progression.resetKillStreak();
  });

  it('getKillStreak returns 0 initially', () => {
    expect(GAME.progression.getKillStreak()).toBe(0);
  });

  it('checkKillStreak increments streak', () => {
    GAME.progression.checkKillStreak();
    expect(GAME.progression.getKillStreak()).toBe(1);
  });

  it('resetKillStreak resets to 0', () => {
    GAME.progression.checkKillStreak();
    GAME.progression.checkKillStreak();
    expect(GAME.progression.getKillStreak()).toBe(2);
    GAME.progression.resetKillStreak();
    expect(GAME.progression.getKillStreak()).toBe(0);
  });
});

describe('Perk system', () => {
  beforeEach(() => {
    GAME.progression.clearPerks();
  });

  it('hasPerk returns false when no perks active', () => {
    expect(GAME.hasPerk('stopping_power')).toBe(false);
    expect(GAME.hasPerk('juggernaut')).toBe(false);
  });

  it('getActivePerks returns empty array initially', () => {
    expect(GAME.progression.getActivePerks()).toEqual([]);
  });

  it('isPerkScreenOpen returns false initially', () => {
    expect(GAME.progression.isPerkScreenOpen()).toBe(false);
  });

  it('setLastRoundWon and getLastRoundWon', () => {
    GAME.progression.setLastRoundWon(true);
    expect(GAME.progression.getLastRoundWon()).toBe(true);
    GAME.progression.setLastRoundWon(false);
    expect(GAME.progression.getLastRoundWon()).toBe(false);
  });

  it('clearPerks resets active perks', () => {
    // Manually test via the getActivePerks reference
    var perks = GAME.progression.getActivePerks();
    perks.push({ id: 'test', name: 'Test', desc: 'test', icon: 'T' });
    expect(GAME.hasPerk('test')).toBe(true);
    GAME.progression.clearPerks();
    expect(GAME.hasPerk('test')).toBe(false);
    expect(GAME.progression.getActivePerks()).toEqual([]);
  });

  it('PERK_POOL contains expected perk IDs', () => {
    var ids = GAME.progression.PERK_POOL.map(function(p) { return p.id; });
    expect(ids).toContain('stopping_power');
    expect(ids).toContain('juggernaut');
    expect(ids).toContain('ghost');
    expect(ids).toContain('fleet_foot');
  });
});

describe('Best score systems', () => {
  beforeEach(() => {
    localStorage.removeItem('miniCS_survivalBest');
    localStorage.removeItem('miniCS_gungameBest');
    localStorage.removeItem('miniCS_dmBest');
  });

  it('getSurvivalBest returns empty object when no data', () => {
    expect(GAME.progression.getSurvivalBest()).toEqual({});
  });

  it('setSurvivalBest stores and retrieves best wave', () => {
    GAME.progression.setSurvivalBest('dust', 5);
    expect(GAME.progression.getSurvivalBest().dust).toBe(5);
  });

  it('setSurvivalBest only updates if better', () => {
    GAME.progression.setSurvivalBest('dust', 5);
    GAME.progression.setSurvivalBest('dust', 3);
    expect(GAME.progression.getSurvivalBest().dust).toBe(5);
  });

  it('getGunGameBest returns empty object when no data', () => {
    expect(GAME.progression.getGunGameBest()).toEqual({});
  });

  it('setGunGameBest stores best time (lower is better)', () => {
    GAME.progression.setGunGameBest('dust', 120);
    expect(GAME.progression.getGunGameBest().dust).toBe(120);
    GAME.progression.setGunGameBest('dust', 90);
    expect(GAME.progression.getGunGameBest().dust).toBe(90);
    GAME.progression.setGunGameBest('dust', 150);
    expect(GAME.progression.getGunGameBest().dust).toBe(90);
  });

  it('getDMBest returns empty object when no data', () => {
    expect(GAME.progression.getDMBest()).toEqual({});
  });

  it('setDMBest stores best kills (higher is better)', () => {
    GAME.progression.setDMBest('dust', 20);
    expect(GAME.progression.getDMBest().dust).toBe(20);
    GAME.progression.setDMBest('dust', 25);
    expect(GAME.progression.getDMBest().dust).toBe(25);
    GAME.progression.setDMBest('dust', 15);
    expect(GAME.progression.getDMBest().dust).toBe(25);
  });
});

describe('Match history', () => {
  beforeEach(() => {
    localStorage.removeItem('miniCS_history');
  });

  it('getMatchHistory returns empty array when no data', () => {
    expect(GAME.progression.getMatchHistory()).toEqual([]);
  });

  it('saveMatchHistory stores a match', () => {
    GAME.progression.saveMatchHistory({
      result: 'VICTORY', xpEarned: 100,
      playerScore: 4, botScore: 2,
      rounds: 6, kills: 10, deaths: 3,
      headshots: 4, difficulty: 'normal'
    });
    var history = GAME.progression.getMatchHistory();
    expect(history.length).toBe(1);
    expect(history[0].result).toBe('VICTORY');
    expect(history[0].kills).toBe(10);
  });

  it('saveMatchHistory caps at 50 entries', () => {
    for (var i = 0; i < 55; i++) {
      GAME.progression.saveMatchHistory({
        result: 'VICTORY', xpEarned: 10,
        playerScore: 4, botScore: 2,
        rounds: 6, kills: 1, deaths: 0,
        headshots: 0, difficulty: 'normal'
      });
    }
    expect(GAME.progression.getMatchHistory().length).toBe(50);
  });

  it('getStats computes correct stats', () => {
    GAME.progression.saveMatchHistory({
      result: 'VICTORY', xpEarned: 100,
      playerScore: 4, botScore: 2,
      rounds: 6, kills: 10, deaths: 3,
      headshots: 4, difficulty: 'normal'
    });
    GAME.progression.saveMatchHistory({
      result: 'DEFEAT', xpEarned: 50,
      playerScore: 2, botScore: 4,
      rounds: 6, kills: 5, deaths: 7,
      headshots: 1, difficulty: 'normal'
    });
    var stats = GAME.progression.getStats();
    expect(stats.matches).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.kills).toBe(15);
    expect(stats.deaths).toBe(10);
    expect(stats.headshots).toBe(5);
    expect(stats.winRate).toBe(50);
  });

  it('getStats exposes avgKillsPerMatch rounded to nearest integer', () => {
    GAME.progression.saveMatchHistory({
      result: 'VICTORY', xpEarned: 100,
      playerScore: 4, botScore: 2,
      rounds: 6, kills: 11, deaths: 3,
      headshots: 4, difficulty: 'normal'
    });
    GAME.progression.saveMatchHistory({
      result: 'DEFEAT', xpEarned: 50,
      playerScore: 2, botScore: 4,
      rounds: 6, kills: 8, deaths: 7,
      headshots: 1, difficulty: 'normal'
    });
    var stats = GAME.progression.getStats();
    expect(stats.avgKillsPerMatch).toBe(10);
  });

  it('getStats returns avgKillsPerMatch=0 with no history', () => {
    var stats = GAME.progression.getStats();
    expect(stats.avgKillsPerMatch).toBe(0);
  });

  it('renderHistory top stats show readable labels (no K/D, no HS %)', () => {
    document.body.innerHTML =
      '<div id="history-stats"></div><div id="history-list"></div>';
    GAME.progression.saveMatchHistory({
      result: 'VICTORY', xpEarned: 100,
      playerScore: 4, botScore: 2,
      rounds: 6, kills: 12, deaths: 5,
      headshots: 6, difficulty: 'normal'
    });
    GAME.progression.renderHistory();
    var stats = document.getElementById('history-stats').innerHTML;
    expect(stats).toContain('Matches Played');
    expect(stats).toContain('Win Rate');
    expect(stats).toContain('Avg Kills');
    expect(stats).toContain('Headshot Rate');
    expect(stats).not.toContain('W / L / D');
    expect(stats).not.toContain('HS %');
  });

  it('renderHistory entry rows spell out kills/deaths (no K/D shorthand)', () => {
    document.body.innerHTML =
      '<div id="history-stats"></div><div id="history-list"></div>';
    GAME.progression.saveMatchHistory({
      result: 'VICTORY', xpEarned: 100,
      playerScore: 4, botScore: 2,
      rounds: 6, kills: 12, deaths: 5,
      headshots: 6, difficulty: 'normal'
    });
    GAME.progression.renderHistory();
    var list = document.getElementById('history-list').innerHTML;
    expect(list).toContain('12 kills');
    expect(list).toContain('5 deaths');
    expect(list).toContain('6 headshots');
    expect(list).not.toMatch(/\d+K\s*\/\s*\d+D/);
  });

  it('renderHistory handles singular counts (1 headshot, 1 kill, 1 death)', () => {
    document.body.innerHTML =
      '<div id="history-stats"></div><div id="history-list"></div>';
    GAME.progression.saveMatchHistory({
      result: 'DEFEAT', xpEarned: 20,
      playerScore: 1, botScore: 4,
      rounds: 5, kills: 1, deaths: 1,
      headshots: 1, difficulty: 'normal'
    });
    GAME.progression.renderHistory();
    var list = document.getElementById('history-list').innerHTML;
    expect(list).toContain('1 kill ');
    expect(list).toContain('1 death ');
    expect(list).toContain('1 headshot<');
  });

  it('renderHistory shows empty state when no matches exist', () => {
    document.body.innerHTML =
      '<div id="history-stats"></div><div id="history-list"></div>';
    GAME.progression.renderHistory();
    var list = document.getElementById('history-list').innerHTML;
    expect(list).toContain('No matches played yet');
  });
});

describe('Mission system', () => {
  beforeEach(() => {
    localStorage.removeItem('miniCS_missions');
    localStorage.removeItem('miniCS_xp');
  });

  it('loadMissionState does not throw with no stored data', () => {
    expect(() => GAME.progression.loadMissionState()).not.toThrow();
  });

  it('checkMissionRefresh generates missions', () => {
    GAME.progression.loadMissionState();
    GAME.progression.checkMissionRefresh();
    // After refresh, missions should be saved in localStorage
    var saved = JSON.parse(localStorage.getItem('miniCS_missions'));
    expect(saved).toBeDefined();
    expect(saved.active).toBeDefined();
    expect(saved.active.daily1).not.toBeNull();
    expect(saved.active.weekly).not.toBeNull();
  });
});
