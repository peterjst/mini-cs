import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
  loadModule('js/maps/props.js');
  loadModule('js/maps/dust.js');
  loadModule('js/maps/office.js');
  loadModule('js/maps/warehouse.js');
  loadModule('js/maps/bloodstrike.js');
  loadModule('js/maps/italy.js');
  loadModule('js/maps/aztec.js');
  loadModule('js/maps/arena.js');
  loadModule('js/player.js');
  loadModule('js/sound.js');
  loadModule('js/particles.js');
  loadModule('js/weapons.js');
  loadModule('js/enemies.js');
  loadModule('js/core/renderer.js');
  loadModule('js/effects/effects.js');
  loadModule('js/effects/birds.js');
  loadModule('js/ui/minimap.js');
  loadModule('js/ui/hud.js');
  loadModule('js/ui/buy.js');
  loadModule('js/systems/progression.js');
  loadModule('js/systems/bomb.js');
  loadModule('js/systems/boss.js');
  loadModule('js/modes/competitive.js');
  loadModule('js/modes/survival.js');
  loadModule('js/modes/gungame.js');
  loadModule('js/main.js');
});

describe('GAME.hud API', () => {
  it('should expose GAME.hud object', () => {
    expect(GAME.hud).toBeDefined();
  });

  it('should expose update function', () => {
    expect(typeof GAME.hud.update).toBe('function');
  });

  it('should expose updateScoreboard function', () => {
    expect(typeof GAME.hud.updateScoreboard).toBe('function');
  });

  it('should expose addKillFeed function', () => {
    expect(typeof GAME.hud.addKillFeed).toBe('function');
  });

  it('should expose addRadioFeed function', () => {
    expect(typeof GAME.hud.addRadioFeed).toBe('function');
  });

  it('should expose showAnnouncement function', () => {
    expect(typeof GAME.hud.showAnnouncement).toBe('function');
  });

  it('should expose updatePauseHint function', () => {
    expect(typeof GAME.hud.updatePauseHint).toBe('function');
  });
});

describe('backward-compatible aliases', () => {
  it('GAME.showAnnouncement should be the same as GAME.hud.showAnnouncement', () => {
    expect(GAME.showAnnouncement).toBe(GAME.hud.showAnnouncement);
  });

  it('GAME._addRadioFeed should be the same as GAME.hud.addRadioFeed', () => {
    expect(GAME._addRadioFeed).toBe(GAME.hud.addRadioFeed);
  });
});

describe('GAME._STATES', () => {
  it('should expose game state constants', () => {
    expect(GAME._STATES).toBeDefined();
    expect(GAME._STATES.MENU).toBeDefined();
    expect(GAME._STATES.PLAYING).toBeDefined();
    expect(GAME._STATES.PAUSED).toBeDefined();
    expect(GAME._STATES.BUY_PHASE).toBeDefined();
    expect(GAME._STATES.ROUND_END).toBeDefined();
    expect(GAME._STATES.TOURING).toBeDefined();
    expect(GAME._STATES.MATCH_END).toBeDefined();
    expect(GAME._STATES.SURVIVAL_BUY).toBeDefined();
    expect(GAME._STATES.SURVIVAL_WAVE).toBeDefined();
    expect(GAME._STATES.SURVIVAL_DEAD).toBeDefined();
    expect(GAME._STATES.GUNGAME_ACTIVE).toBeDefined();
    expect(GAME._STATES.GUNGAME_END).toBeDefined();
    expect(GAME._STATES.DEATHMATCH_ACTIVE).toBeDefined();
    expect(GAME._STATES.DEATHMATCH_END).toBeDefined();
  });
});

describe('state exposure properties', () => {
  it('should expose _roundTimer as a number', () => {
    expect(typeof GAME._roundTimer).toBe('number');
  });

  it('should expose _phaseTimer as a number', () => {
    expect(typeof GAME._phaseTimer).toBe('number');
  });

  it('should expose _frameDt as a number', () => {
    expect(typeof GAME._frameDt).toBe('number');
  });

  it('should expose _playerScore as a number', () => {
    expect(typeof GAME._playerScore).toBe('number');
  });

  it('should expose _botScore as a number', () => {
    expect(typeof GAME._botScore).toBe('number');
  });

  it('should expose _teamMode as a boolean', () => {
    expect(typeof GAME._teamMode).toBe('boolean');
  });

  it('should expose _playerTeam as a string', () => {
    expect(typeof GAME._playerTeam).toBe('string');
  });

  it('should expose _gungameStartTime as a number', () => {
    expect(typeof GAME._gungameStartTime).toBe('number');
  });
});

describe('GAME.dom', () => {
  it('should expose dom refs object', () => {
    expect(GAME.dom).toBeDefined();
  });

  it('should contain pauseHintKey ref', () => {
    expect(GAME.dom.pauseHintKey).toBeDefined();
  });

  it('should contain killFeed ref', () => {
    expect(GAME.dom.killFeed).toBeDefined();
  });

  it('should contain announcement ref', () => {
    expect(GAME.dom.announcement).toBeDefined();
  });
});

describe('updatePauseHint via GAME.hud', () => {
  it('should show pause hint during PLAYING state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('PLAYING');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should show pause hint during BUY_PHASE state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('BUY_PHASE');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should show pause hint during TOURING state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('TOURING');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should show pause hint during SURVIVAL_BUY state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('SURVIVAL_BUY');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should show pause hint during SURVIVAL_WAVE state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('SURVIVAL_WAVE');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should show pause hint during GUNGAME_ACTIVE state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('GUNGAME_ACTIVE');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should show pause hint during DEATHMATCH_ACTIVE state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('DEATHMATCH_ACTIVE');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('block');
  });

  it('should hide pause hint during MENU state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('MENU');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('none');
  });

  it('should hide pause hint during PAUSED state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('PAUSED');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('none');
  });

  it('should hide pause hint during ROUND_END state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('ROUND_END');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('none');
  });

  it('should hide pause hint during MATCH_END state', () => {
    var el = document.getElementById('pause-hint-key');
    GAME._setGameState('MATCH_END');
    GAME.hud.updatePauseHint();
    expect(el.style.display).toBe('none');
  });
});

describe('addKillFeed', () => {
  it('should add a kill entry to the kill feed', () => {
    var feed = document.getElementById('kill-feed');
    var before = feed.children.length;
    GAME.hud.addKillFeed('Player', 'Bot 1');
    expect(feed.children.length).toBe(before + 1);
    var entry = feed.lastChild;
    expect(entry.className).toBe('kill-entry');
    expect(entry.innerHTML).toContain('Player');
    expect(entry.innerHTML).toContain('Bot 1');
  });

  it('should add boss-kill class for boss kills', () => {
    var feed = document.getElementById('kill-feed');
    GAME.hud.addKillFeed('Player', 'BOSS', true);
    var entry = feed.lastChild;
    expect(entry.className).toContain('boss-kill');
  });
});

describe('addRadioFeed', () => {
  it('should add a radio entry to the kill feed', () => {
    var feed = document.getElementById('kill-feed');
    var before = feed.children.length;
    GAME.hud.addRadioFeed('Go go go!');
    expect(feed.children.length).toBe(before + 1);
    var entry = feed.lastChild;
    expect(entry.className).toBe('radio-entry');
    expect(entry.textContent).toContain('[RADIO]');
    expect(entry.textContent).toContain('Go go go!');
  });
});

describe('showAnnouncement', () => {
  it('should show announcement with text', () => {
    var el = document.getElementById('announcement');
    GAME.hud.showAnnouncement('TEST');
    expect(el.classList.contains('show')).toBe(true);
    expect(el.innerHTML).toContain('TEST');
  });

  it('should show announcement with subtitle', () => {
    var el = document.getElementById('announcement');
    GAME.hud.showAnnouncement('MAIN', 'subtitle');
    expect(el.innerHTML).toContain('MAIN');
    expect(el.innerHTML).toContain('subtitle');
  });
});
