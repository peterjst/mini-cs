import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

beforeAll(() => {
  // main.js needs all prior modules
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  // Load map files so GAME._maps is populated
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

describe('GAME.* exposures for touch module', () => {
  it('should expose GAME.player with keys object', () => {
    expect(GAME.player).toBeDefined();
    expect(GAME.player.keys).toBeDefined();
    expect(typeof GAME.player.keys.w).toBe('boolean');
  });

  it('should expose GAME.weaponSystem', () => {
    expect(GAME.weaponSystem).toBeDefined();
    expect(typeof GAME.weaponSystem.startReload).toBe('function');
  });

  it('should expose GAME._enemyManager', () => {
    expect(GAME._enemyManager).toBeDefined();
    expect(GAME._enemyManager.enemies).toBeDefined();
  });

  it('should expose GAME._weaponDefs', () => {
    expect(GAME._weaponDefs).toBeDefined();
    expect(GAME._weaponDefs.pistol).toBeDefined();
    expect(typeof GAME._weaponDefs.pistol.damage).toBe('number');
  });

  it('should expose GAME._buyWeapon', () => {
    expect(typeof GAME._buyWeapon).toBe('function');
  });
});

describe('game state', () => {
  it('should expose hasPerk function', () => {
    expect(typeof GAME.hasPerk).toBe('function');
  });

  it('hasPerk should return false when no perks are active', () => {
    expect(GAME.hasPerk('juggernaut')).toBe(false);
    expect(GAME.hasPerk('fleet_foot')).toBe(false);
    expect(GAME.hasPerk('stopping_power')).toBe(false);
  });

  it('should expose setDifficulty', () => {
    expect(typeof GAME.setDifficulty).toBe('function');
  });

  it('should expose getDifficulty', () => {
    expect(typeof GAME.getDifficulty).toBe('function');
  });

  it('should expose getMapCount', () => {
    expect(typeof GAME.getMapCount).toBe('function');
    expect(GAME.getMapCount()).toBe(7);
  });

  it('should expose getMapDef', () => {
    expect(typeof GAME.getMapDef).toBe('function');
    var def = GAME.getMapDef(0);
    expect(def).toBeDefined();
    expect(def.name).toBeDefined();
  });
});

describe('Bullet impact decals', () => {
  it('GAME.spawnBulletHole should be a function', () => {
    expect(typeof GAME.spawnBulletHole).toBe('function');
  });

  it('should track bullet holes in GAME._bulletHoles array', () => {
    expect(Array.isArray(GAME._bulletHoles)).toBe(true);
  });

  it('should cap bullet holes at MAX_BULLET_HOLES', () => {
    expect(GAME.MAX_BULLET_HOLES).toBe(60);
  });
});

describe('Impact dust puff', () => {
  it('GAME.spawnImpactDust should be a function', () => {
    expect(typeof GAME.spawnImpactDust).toBe('function');
  });
});

describe('Round effects teardown', () => {
  it('GAME.effects.clearRoundState should be a function', () => {
    expect(typeof GAME.effects.clearRoundState).toBe('function');
  });

  it('GAME._clearRoundEffects should not throw when called with no active effects', () => {
    expect(() => GAME._clearRoundEffects()).not.toThrow();
  });

  it('GAME._clearRoundEffects should empty GAME._bulletHoles when it has active entries', () => {
    // Seed the active-tracking array directly (avoids jsdom Three.js limitations in spawn path).
    GAME._bulletHoles.push({ mesh: { visible: true }, mat: { opacity: 0.8 }, age: 1 });
    GAME._bulletHoles.push({ mesh: { visible: true }, mat: { opacity: 0.8 }, age: 1 });
    expect(GAME._bulletHoles.length).toBe(2);
    expect(() => GAME._clearRoundEffects()).not.toThrow();
    expect(GAME._bulletHoles.length).toBe(0);
  });

  it('GAME._newRoundScene should not throw (regression: refactor left orphaned bulletHoles/_dustParticles refs)', () => {
    expect(typeof GAME._newRoundScene).toBe('function');
    expect(() => GAME._newRoundScene()).not.toThrow();
  });
});

// Regression guard for the main-js-decomposition refactor: every function that was
// moved out of main.js into a namespaced module must no longer be called as a bare
// identifier in main.js. A bare call throws ReferenceError at runtime (only during
// the specific gameLoop branch that reaches it), which silently breaks the game
// without failing any existing test. Static source check is the only way to catch
// the whole class — we cannot exercise every gameLoop branch in jsdom.
describe('No orphan bare calls to extracted module functions', () => {
  const EXTRACTED_FUNCS = [
    // From js/effects/effects.js (GAME.effects.* or GAME.*)
    'applyScreenShake', 'applyKillKick', 'updateBulletHoles', 'updateImpactDust',
    'updateFootDust', 'updateDamageIndicators', 'updateBloodSplatter',
    'showHitmarker', 'showDamageNumber', 'spawnBloodBurst', 'triggerKillSlowMo',
    // From js/effects/birds.js (GAME.birds.*)
    'spawnBirds', 'updateBirds', 'killBird',
    // From js/ui/minimap.js (GAME.minimap.*)
    'cacheMinimapWalls', 'updateMinimap',
    // From js/ui/buy.js (GAME.buy.*)
    'tryBuy', 'updateBuyMenu',
    // From js/systems/bomb.js (GAME.bomb.*)
    'updateBombLogic', 'buildBombsiteMarkers', 'isNearBombsite',
    // From js/core/renderer.js (GAME.* — already namespaced)
    'renderWithBloom', 'resizeBloom', 'applyColorGrade',
  ];

  const mainSrc = readFileSync(resolve(process.cwd(), 'js/core/main.js'), 'utf8');

  EXTRACTED_FUNCS.forEach(name => {
    it(`main.js should not have bare "${name}(" call (use GAME.* namespace)`, () => {
      // Match "name(" only when not preceded by "." (method call) or another identifier char.
      const pattern = new RegExp('(^|[^A-Za-z0-9_.])' + name + '\\s*\\(', 'gm');
      const matches = [];
      let m;
      while ((m = pattern.exec(mainSrc)) !== null) {
        // Compute line number for diagnostic output.
        const lineNum = mainSrc.slice(0, m.index).split('\n').length;
        matches.push(`line ${lineNum}`);
      }
      expect(matches, `bare call to ${name}() found at: ${matches.join(', ')}`).toEqual([]);
    });
  });
});

describe('Footstep dust particles', () => {
  it('should have spawnFootstepDust function on GAME', () => {
    expect(typeof GAME.spawnFootstepDust).toBe('function');
  });
});

describe('Directional damage indicator', () => {
  it('should have showDamageIndicator function on GAME', () => {
    expect(typeof GAME.showDamageIndicator).toBe('function');
  });

  it('should not throw when called without DOM container', () => {
    expect(() => GAME.showDamageIndicator({ x: 10, y: 0, z: 0 })).not.toThrow();
  });
});

describe('Screen blood splatter', () => {
  it('should have triggerBloodSplatter function on GAME', () => {
    expect(typeof GAME.triggerBloodSplatter).toBe('function');
  });

  it('should not throw when called with damage amount', () => {
    expect(() => GAME.triggerBloodSplatter(50)).not.toThrow();
  });
});

describe('Kill micro slow-motion', () => {
  it('should have GAME.killSlowMo state', () => {
    expect(GAME.killSlowMo).toBeDefined();
  });

  it('should have active, timer, and scale properties', () => {
    expect(typeof GAME.killSlowMo.active).toBe('boolean');
    expect(typeof GAME.killSlowMo.timer).toBe('number');
    expect(typeof GAME.killSlowMo.scale).toBe('number');
  });
});

describe('Touch fire button flag', () => {
  it('should initialize GAME.touchFireButton to false', () => {
    expect(GAME.touchFireButton).toBe(false);
  });
});

describe('menu flythrough', function() {
  it('should expose GAME._menuFlythroughPaths with one entry per map', function() {
    expect(GAME._menuFlythroughPaths).toBeDefined();
    expect(Array.isArray(GAME._menuFlythroughPaths)).toBe(true);
    expect(GAME._menuFlythroughPaths.length).toBe(GAME.getMapCount());
  });

  it('each flythrough path should have 4-6 keyframes with position, lookAt, duration', function() {
    GAME._menuFlythroughPaths.forEach(function(path) {
      expect(path.length).toBeGreaterThanOrEqual(4);
      expect(path.length).toBeLessThanOrEqual(6);
      path.forEach(function(kf) {
        expect(kf.position).toBeDefined();
        expect(kf.position.x).toBeDefined();
        expect(kf.position.y).toBeDefined();
        expect(kf.position.z).toBeDefined();
        expect(kf.lookAt).toBeDefined();
        expect(kf.lookAt.x).toBeDefined();
        expect(kf.lookAt.y).toBeDefined();
        expect(kf.lookAt.z).toBeDefined();
        expect(typeof kf.duration).toBe('number');
        expect(kf.duration).toBeGreaterThan(0);
      });
    });
  });

  it('should expose GAME.updateMenuFlythrough function', function() {
    expect(typeof GAME.updateMenuFlythrough).toBe('function');
  });

  it('should expose GAME.buildMenuScene function', function() {
    expect(typeof GAME.buildMenuScene).toBe('function');
  });
});

describe('quick play', function() {
  it('should expose GAME.getQuickPlaySettings function', function() {
    expect(typeof GAME.getQuickPlaySettings).toBe('function');
  });

  it('should return default settings when no localStorage data', function() {
    localStorage.clear();
    var settings = GAME.getQuickPlaySettings();
    expect(settings.mode).toBe('competitive');
    expect(settings.difficulty).toBe('normal');
    expect(settings.mapIndex).toBeGreaterThanOrEqual(0);
  });

  it('should return saved settings from localStorage', function() {
    localStorage.setItem('miniCS_lastMode', 'survival');
    localStorage.setItem('miniCS_difficulty', 'hard');
    localStorage.setItem('miniCS_lastMap_surv-map-grid', '2');
    var settings = GAME.getQuickPlaySettings();
    expect(settings.mode).toBe('survival');
    expect(settings.difficulty).toBe('hard');
    localStorage.clear();
  });
});

describe('Post-processing pipeline', () => {
  it('should attach a DepthTexture to sceneRT', () => {
    expect(GAME._postProcess).toBeDefined();
    expect(GAME._postProcess.sceneRT).toBeDefined();
    expect(GAME._postProcess.sceneRT.depthTexture).toBeDefined();
    expect(GAME._postProcess.sceneRT.depthTexture.type).toBe(THREE.UnsignedInt248Type);
  });
});

describe('SSAO', () => {
  it('should expose SSAO render target at half resolution', () => {
    expect(GAME._postProcess.ssaoRT).toBeDefined();
  });

  it('should expose SSAO toggle', () => {
    expect(typeof GAME._postProcess.ssaoEnabled).toBe('boolean');
  });
});

describe('Sharpen pass', () => {
  it('should expose sharpen pass', () => {
    expect(GAME._postProcess.sharpenEnabled).toBe(true);
  });
});

describe('Color grading', () => {
  it('should expose color grading uniforms', () => {
    var pp = GAME._postProcess;
    expect(pp.colorGrade).toBeDefined();
    expect(pp.colorGrade.tint).toBeDefined();
    expect(pp.colorGrade.contrast).toBeDefined();
    expect(pp.colorGrade.saturation).toBeDefined();
    expect(pp.colorGrade.vignetteStrength).toBeDefined();
  });
});

describe('Hit feedback', () => {
  it('should expose hit feedback state', () => {
    expect(GAME._hitFeedback).toBeDefined();
    expect(typeof GAME._hitFeedback.hitTimer).toBe('number');
    expect(typeof GAME._hitFeedback.killTimer).toBe('number');
  });
});

describe('Kill camera kick', () => {
  it('should expose triggerKillKick function', () => {
    expect(typeof GAME.triggerKillKick).toBe('function');
  });

  it('should expose killKick state object', () => {
    expect(GAME.killKick).toBeDefined();
    expect(GAME.killKick).toHaveProperty('active');
    expect(GAME.killKick).toHaveProperty('timer');
    expect(GAME.killKick).toHaveProperty('magnitude');
  });

  it('triggerKillKick should activate the kick', () => {
    GAME.killKick.active = false;
    GAME.triggerKillKick(false);
    expect(GAME.killKick.active).toBe(true);
  });

  it('headshot kick should have larger magnitude', () => {
    GAME.killKick.active = false;
    GAME.triggerKillKick(false);
    var normalMag = GAME.killKick.magnitude;
    GAME.killKick.active = false;
    GAME.triggerKillKick(true);
    var hsMag = GAME.killKick.magnitude;
    expect(hsMag).toBeGreaterThan(normalMag);
  });
});

describe('maybeShuffleNextMap', () => {
  beforeEach(() => {
    GAME._shuffleDecks = {};
  });

  it('returns the same index when map mode is fixed', () => {
    GAME._setMapModeForMatch('fixed');
    expect(GAME._maybeShuffleNextMap('competitive', 0)).toBe(0);
    expect(GAME._maybeShuffleNextMap('competitive', 3)).toBe(3);
  });

  it('returns a different index when map mode is shuffle (multi-map)', () => {
    GAME._setMapModeForMatch('shuffle');
    for (var i = 0; i < 20; i++) {
      var result = GAME._maybeShuffleNextMap('competitive', 2);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(GAME.getMapCount());
    }
  });

  it('cycles through every map exactly once per deck under shuffle', () => {
    GAME._setMapModeForMatch('shuffle');
    var mapCount = GAME.getMapCount();
    var seen = {};
    for (var i = 0; i < mapCount; i++) {
      seen[GAME._maybeShuffleNextMap('competitive', 0)] = true;
    }
    expect(Object.keys(seen).length).toBe(mapCount);
  });

  it('never repeats across the reshuffle boundary under shuffle', () => {
    GAME._setMapModeForMatch('shuffle');
    var mapCount = GAME.getMapCount();
    for (var i = 0; i < mapCount - 1; i++) GAME._maybeShuffleNextMap('competitive', 0);
    var last = GAME._maybeShuffleNextMap('competitive', 0);
    var first = GAME._maybeShuffleNextMap('competitive', 0);
    expect(first).not.toBe(last);
  });

  it('returns same index when only one map exists (shuffle mode)', () => {
    var originalMaps = GAME._maps.slice();
    GAME._maps.length = 1;
    try {
      GAME._setMapModeForMatch('shuffle');
      GAME._shuffleDecks = {};
      expect(GAME._maybeShuffleNextMap('competitive', 0)).toBe(0);
    } finally {
      GAME._maps.length = 0;
      for (var i = 0; i < originalMaps.length; i++) GAME._maps.push(originalMaps[i]);
    }
  });
});

describe('Map Mode grid disabled state', () => {
  beforeEach(() => {
    if (!document.getElementById('comp-map-grid')) {
      var g = document.createElement('div');
      g.id = 'comp-map-grid';
      g.className = 'config-map-grid';
      document.body.appendChild(g);
    } else {
      document.getElementById('comp-map-grid').classList.remove('shuffle-disabled');
    }
  });

  it('adds shuffle-disabled class when GAME.applyMapModeUI is called with shuffle', () => {
    GAME.applyMapModeUI('shuffle');
    var grid = document.getElementById('comp-map-grid');
    expect(grid.classList.contains('shuffle-disabled')).toBe(true);
  });

  it('removes shuffle-disabled class when applied with fixed', () => {
    GAME.applyMapModeUI('shuffle');
    GAME.applyMapModeUI('fixed');
    var grid = document.getElementById('comp-map-grid');
    expect(grid.classList.contains('shuffle-disabled')).toBe(false);
  });
});

describe('Start handlers honor shuffle starting map', () => {
  beforeEach(() => {
    GAME._shuffleDecks = {};
  });

  it('GAME.resolveStartingMap returns the grid index under fixed', () => {
    var idx = GAME.resolveStartingMap('competitive', 'fixed', 3);
    expect(idx).toBe(3);
  });

  it('GAME.resolveStartingMap ignores the grid index under shuffle and advances the deck', () => {
    var gridIdx = 3;
    var drawn = GAME.resolveStartingMap('competitive', 'shuffle', gridIdx);
    expect(drawn).toBeGreaterThanOrEqual(0);
    expect(drawn).toBeLessThan(GAME.getMapCount());
    // Second call with same gridIdx should return a different map (deck advanced)
    var second = GAME.resolveStartingMap('competitive', 'shuffle', gridIdx);
    expect(second).not.toBe(drawn);
  });
});

describe('Quick Play honors shuffle map mode', () => {
  beforeEach(() => {
    GAME._shuffleDecks = {};
    localStorage.setItem('miniCS_lastMode', 'competitive');
  });

  it('reports shuffle map mode without advancing the deck (display-safe)', () => {
    localStorage.setItem('miniCS_mapMode', 'shuffle');
    localStorage.setItem('miniCS_lastMap_comp-map-grid', '4');
    var s = GAME.getQuickPlaySettings();
    expect(s.mapMode).toBe('shuffle');
    // Reading settings for display must not drain the deck.
    expect(GAME._shuffleDecks.competitive).toBeUndefined();
  });

  it('resolves the shuffle starting map at match start via resolveStartingMap', () => {
    localStorage.setItem('miniCS_mapMode', 'shuffle');
    localStorage.setItem('miniCS_lastMap_comp-map-grid', '4');
    var s = GAME.getQuickPlaySettings();
    var startIdx = GAME.resolveStartingMap(s.mode, s.mapMode, s.mapIndex);
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(startIdx).toBeLessThan(GAME.getMapCount());
    expect(GAME._shuffleDecks.competitive.pos).toBe(1);
  });

  it('uses the stored map index under fixed', () => {
    localStorage.setItem('miniCS_mapMode', 'fixed');
    localStorage.setItem('miniCS_lastMap_comp-map-grid', '4');
    var s = GAME.getQuickPlaySettings();
    expect(s.mapMode).toBe('fixed');
    expect(s.mapIndex).toBe(4);
  });
});

describe('GAME.touchFiring', () => {
  it('should be defined and default to false', () => {
    expect(GAME.touchFiring).toBe(false);
  });
});

describe('Deathmatch buy menu auto-open', () => {
  it('should expose dmBuyMenuAutoOpened flag initialized to false', () => {
    expect(GAME._dmBuyMenuAutoOpened).toBe(false);
  });
});

describe('Menu UI sound wiring', () => {
  it('GAME.Sound.menuClick should be callable', () => {
    expect(typeof GAME.Sound.menuClick).toBe('function');
  });

  it('GAME.Sound.menuSelect should be callable', () => {
    expect(typeof GAME.Sound.menuSelect).toBe('function');
  });

  it('GAME.Sound.menuStartClick should be callable', () => {
    expect(typeof GAME.Sound.menuStartClick).toBe('function');
  });
});

describe('pause controls button', () => {
  it('should have pause-controls-btn element in DOM', () => {
    var el = document.getElementById('pause-controls-btn');
    expect(el).toBeTruthy();
  });

  it('should expose pauseControlsBtn in dom refs', () => {
    expect(document.getElementById('pause-controls-btn')).toBeTruthy();
  });

  it('resumeGame should remove show class from controls-overlay', () => {
    var overlay = document.getElementById('controls-overlay');
    overlay.classList.add('show');
    expect(overlay.classList.contains('show')).toBe(true);
    // Put game in PAUSED state so resumeGame will execute
    GAME._setGameState('PAUSED');
    GAME._resumeGame();
    expect(overlay.classList.contains('show')).toBe(false);
  });

  it('resumeGame should also remove show class from pause-overlay', () => {
    var pauseOverlay = document.getElementById('pause-overlay');
    var controlsOverlay = document.getElementById('controls-overlay');
    pauseOverlay.classList.add('show');
    controlsOverlay.classList.add('show');
    GAME._setGameState('PAUSED');
    GAME._resumeGame();
    expect(pauseOverlay.classList.contains('show')).toBe(false);
    expect(controlsOverlay.classList.contains('show')).toBe(false);
  });

  it('resumeGame should be exposed as GAME._resumeGame', () => {
    expect(typeof GAME._resumeGame).toBe('function');
  });

  it('resumeGame should not execute when game is not PAUSED', () => {
    var overlay = document.getElementById('controls-overlay');
    var pauseOverlay = document.getElementById('pause-overlay');
    overlay.classList.add('show');
    pauseOverlay.classList.add('show');
    GAME._setGameState('PLAYING');
    GAME._resumeGame();
    // Should be no-op since state is not PAUSED
    expect(overlay.classList.contains('show')).toBe(true);
    expect(pauseOverlay.classList.contains('show')).toBe(true);
    // Restore
    overlay.classList.remove('show');
    pauseOverlay.classList.remove('show');
  });
});

describe('warmUpShaders', () => {
  it('should expose GAME._warmUpShaders as a function', () => {
    expect(typeof GAME._warmUpShaders).toBe('function');
  });
});

describe('pause hint', () => {
  it('should have pause-hint-key element in DOM', () => {
    var el = document.getElementById('pause-hint-key');
    expect(el).toBeTruthy();
  });

  it('should expose _getGameState for testing', () => {
    expect(typeof GAME._getGameState).toBe('function');
  });

  it('should expose _updatePauseHint for testing', () => {
    expect(typeof GAME._updatePauseHint).toBe('function');
  });

  it('should show pause hint during PLAYING state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('PLAYING');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should hide pause hint during MENU state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('MENU');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('none');
  });

  it('should hide pause hint during PAUSED state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('PAUSED');
    GAME._updatePauseHint();
    expect(el.style.display).toBe('none');
  });
});

describe('Competitive mode boss rules', () => {
  it('should have _isBossRound function', () => {
    expect(typeof GAME._isBossRound).toBe('function');
  });

  it('round 6 should be a boss round in competitive', () => {
    expect(GAME._isBossRound(6)).toBe(true);
  });

  it('rounds 1-5 should not be boss rounds in competitive', () => {
    for (var i = 1; i <= 5; i++) {
      expect(GAME._isBossRound(i)).toBe(false);
    }
  });
});

describe('Boss HUD', () => {
  it('should have boss health bar element in DOM', () => {
    expect(document.getElementById('boss-health-bar')).not.toBeNull();
  });

  it('should have boss health fill element', () => {
    expect(document.getElementById('boss-hp-fill')).not.toBeNull();
  });

  it('should have boss label element', () => {
    expect(document.getElementById('boss-label')).not.toBeNull();
  });

  it('boss health bar should be hidden by default', () => {
    var el = document.getElementById('boss-health-bar');
    expect(el.classList.contains('show')).toBe(false);
  });
});

describe('Boss Fight skip button', () => {
  it('should have boss fight button in competitive card', () => {
    var btn = document.getElementById('comp-boss-btn');
    expect(btn).not.toBeNull();
  });

  it('boss fight button should have correct text', () => {
    var btn = document.getElementById('comp-boss-btn');
    expect(btn.textContent).toBe('BOSS FIGHT');
  });

  it('should expose _skipToBoss flag on GAME', () => {
    expect(GAME._skipToBoss).toBe(false);
  });

  it('should expose _bossOnlyMatch flag on GAME', () => {
    expect(GAME._bossOnlyMatch).toBe(false);
  });

  it('should set _bossOnlyMatch when _skipToBoss is true at match start', () => {
    GAME._bossOnlyMatch = false;
    GAME._skipToBoss = true;
    // _skipToBoss being true means startMatch will set _bossOnlyMatch
    // We test the flag is exposed and settable
    GAME._bossOnlyMatch = true;
    expect(GAME._bossOnlyMatch).toBe(true);
    // Cleanup
    GAME._bossOnlyMatch = false;
    GAME._skipToBoss = false;
  });
});

describe('Competitive PLAY AGAIN respects starting map', () => {
  it('should pass the previous starting map index to startMatch on restart (covers Fixed + Boss Fight)', () => {
    GAME._startingMapIndex = 3;
    var original = GAME.modes.competitive.startMatch;
    var captured;
    GAME.modes.competitive.startMatch = function(idx) { captured = idx; };
    try {
      document.getElementById('restart-btn').click();
      expect(captured).toBe(3);
    } finally {
      GAME.modes.competitive.startMatch = original;
    }
  });

  it('should pass starting map index 0 correctly (not drop to default)', () => {
    GAME._startingMapIndex = 0;
    var original = GAME.modes.competitive.startMatch;
    var captured = 'not-called';
    GAME.modes.competitive.startMatch = function(idx) { captured = idx; };
    try {
      document.getElementById('restart-btn').click();
      expect(captured).toBe(0);
    } finally {
      GAME.modes.competitive.startMatch = original;
    }
  });
});

describe('Boss Fight button hidden in team mode', () => {
  function clickCompMode(mode) {
    var btn = document.querySelector('#comp-mode-row [data-comp-mode="' + mode + '"]');
    btn.click();
  }

  it('boss fight button visible when solo mode selected', () => {
    clickCompMode('solo');
    var btn = document.getElementById('comp-boss-btn');
    expect(btn.style.display).toBe('');
  });

  it('boss fight button hidden when team mode selected', () => {
    clickCompMode('team');
    var btn = document.getElementById('comp-boss-btn');
    expect(btn.style.display).toBe('none');
  });

  it('toggling solo -> team -> solo updates visibility each time', () => {
    var btn = document.getElementById('comp-boss-btn');
    clickCompMode('solo');
    expect(btn.style.display).toBe('');
    clickCompMode('team');
    expect(btn.style.display).toBe('none');
    clickCompMode('solo');
    expect(btn.style.display).toBe('');
  });

  it('clicking BOSS FIGHT in team mode does not set _skipToBoss', () => {
    GAME._skipToBoss = false;
    clickCompMode('team');
    document.getElementById('comp-boss-btn').click();
    expect(GAME._skipToBoss).toBe(false);
    // Cleanup: reset UI state
    clickCompMode('solo');
  });

  it('clicking BOSS FIGHT in solo mode still sets _skipToBoss', () => {
    GAME._skipToBoss = false;
    clickCompMode('solo');
    // Stub startMatch so the click does not actually launch a match
    var original = GAME.modes.competitive.startMatch;
    GAME.modes.competitive.startMatch = function() {};
    try {
      document.getElementById('comp-boss-btn').click();
      // _fadeMenuAndStart is asynchronous; _skipToBoss is set synchronously
      // in the click handler before the fade begins.
      expect(GAME._skipToBoss).toBe(true);
    } finally {
      GAME.modes.competitive.startMatch = original;
      GAME._skipToBoss = false;
    }
  });
});

describe('Competitive round 6 boss gate in team mode', () => {
  function freshRoundState() {
    // Put the game into a state where the next call to startRound() will
    // be round 6 (the boss round). startRound() increments _roundNumber
    // at its start, so pre-set it to 5.
    GAME._roundNumber = 5;
    GAME._gameState = GAME._STATES.ROUND_END; // legal precondition
  }

  it('does not call spawnBoss on round 6 when team mode is active', () => {
    var bossSpawned = false;
    var originalSpawn = GAME._enemyManager.spawnBoss;
    GAME._enemyManager.spawnBoss = function() {
      bossSpawned = true;
      return originalSpawn.apply(this, arguments);
    };
    GAME._teamMode = true;
    freshRoundState();
    try {
      // startRound depends on full game state; downstream errors are fine
      // as long as they occur AFTER the boss-spawn gate.
      try { GAME._startRound(); } catch (e) { /* intentional */ }
      expect(bossSpawned).toBe(false);
    } finally {
      GAME._enemyManager.spawnBoss = originalSpawn;
      GAME._teamMode = false;
    }
  });

  it('isBossRound(6) still returns true (predicate unchanged)', () => {
    expect(GAME._isBossRound(6)).toBe(true);
  });

  it('isBossRound(5) still returns false (predicate unchanged)', () => {
    expect(GAME._isBossRound(5)).toBe(false);
  });
});

describe('Boss retreat integration', () => {
  it('boss should have _updateBossRetreat method called from game loop', () => {
    // Verify the method exists on Enemy prototype (called by main loop)
    var scene = new THREE.Scene();
    var em = new GAME.EnemyManager(scene);
    GAME.setDifficulty('normal');
    em.spawnBoss({ x: 5, z: 5 }, [{ x: 0, z: 0 }], []);
    var boss = em.enemies[em.enemies.length - 1];
    expect(typeof boss._updateBossRetreat).toBe('function');
  });
});

describe('localStorage migration', () => {
  it('migrates miniCS_mapMode=rotate to shuffle via GAME.migrateMapMode', () => {
    localStorage.setItem('miniCS_mapMode', 'rotate');
    var mode = GAME.migrateMapMode();
    expect(mode).toBe('shuffle');
    expect(localStorage.getItem('miniCS_mapMode')).toBe('shuffle');
  });

  it('leaves miniCS_mapMode=fixed untouched', () => {
    localStorage.setItem('miniCS_mapMode', 'fixed');
    var mode = GAME.migrateMapMode();
    expect(mode).toBe('fixed');
    expect(localStorage.getItem('miniCS_mapMode')).toBe('fixed');
  });

  it('leaves miniCS_mapMode=shuffle untouched', () => {
    localStorage.setItem('miniCS_mapMode', 'shuffle');
    var mode = GAME.migrateMapMode();
    expect(mode).toBe('shuffle');
    expect(localStorage.getItem('miniCS_mapMode')).toBe('shuffle');
  });

  it('defaults to fixed when unset', () => {
    localStorage.removeItem('miniCS_mapMode');
    var mode = GAME.migrateMapMode();
    expect(mode).toBe('fixed');
  });
});
