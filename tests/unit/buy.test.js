import { describe, it, expect, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

// Load weapon definitions (needed for prices)
loadModule('js/maps/shared.js');
loadModule('js/systems/weapons.js');

describe('Buy system (js/ui/buy.js)', function() {
  var mockPlayer, mockWeapons, mockDom, mockHud, mockSound;

  beforeEach(function() {
    mockPlayer = {
      money: 5000,
      armor: 0,
      helmet: false
    };
    mockWeapons = {
      owned: { pistol: true, smg: false, shotgun: false, rifle: false, awp: false, smoke: false, flash: false },
      grenadeCount: 0,
      smokeCount: 0,
      flashCount: 0,
      giveWeapon: function(w) { this.owned[w] = true; },
      switchTo: function() {},
      buyGrenade: function() { this.grenadeCount++; this.owned.grenade = true; }
    };
    mockDom = {
      buyBalance: { textContent: '' }
    };
    mockHud = {
      update: function() {}
    };
    mockSound = {
      buy: function() {}
    };

    GAME.player = mockPlayer;
    GAME.weaponSystem = mockWeapons;
    GAME.dom = mockDom;
    GAME.hud = mockHud;
    GAME.Sound = mockSound;
    GAME._STATES = { BUY_PHASE: 'BUY_PHASE', SURVIVAL_BUY: 'SURVIVAL_BUY', DEATHMATCH_ACTIVE: 'DEATHMATCH_ACTIVE', TOURING: 'TOURING', PLAYING: 'PLAYING' };
    GAME._getGameState = function() { return 'BUY_PHASE'; };

    // Load buy.js (re-registers GAME.buy each time)
    loadModule('js/ui/buy.js');
  });

  describe('GAME.buy exposure', function() {
    it('should expose GAME.buy.tryBuy', function() {
      expect(typeof GAME.buy.tryBuy).toBe('function');
    });

    it('should expose GAME.buy.updateMenu', function() {
      expect(typeof GAME.buy.updateMenu).toBe('function');
    });

    it('should expose GAME._buyWeapon as backward-compatible alias', function() {
      expect(typeof GAME._buyWeapon).toBe('function');
      expect(GAME._buyWeapon).toBe(GAME.buy.tryBuy);
    });
  });

  describe('tryBuy', function() {
    it('should not buy outside buy phase', function() {
      GAME._getGameState = function() { return 'PLAYING'; };
      GAME.buy.tryBuy('smg');
      expect(mockPlayer.money).toBe(5000);
      expect(mockWeapons.owned.smg).toBe(false);
    });

    it('should buy SMG and deduct money', function() {
      var price = GAME.WEAPON_DEFS.smg.price;
      GAME.buy.tryBuy('smg');
      expect(mockPlayer.money).toBe(5000 - price);
      expect(mockWeapons.owned.smg).toBe(true);
    });

    it('should buy shotgun and deduct money', function() {
      var price = GAME.WEAPON_DEFS.shotgun.price;
      GAME.buy.tryBuy('shotgun');
      expect(mockPlayer.money).toBe(5000 - price);
      expect(mockWeapons.owned.shotgun).toBe(true);
    });

    it('should buy rifle and deduct money', function() {
      var price = GAME.WEAPON_DEFS.rifle.price;
      GAME.buy.tryBuy('rifle');
      expect(mockPlayer.money).toBe(5000 - price);
      expect(mockWeapons.owned.rifle).toBe(true);
    });

    it('should buy AWP and deduct money', function() {
      var price = GAME.WEAPON_DEFS.awp.price;
      GAME.buy.tryBuy('awp');
      expect(mockPlayer.money).toBe(5000 - price);
      expect(mockWeapons.owned.awp).toBe(true);
    });

    it('should not buy weapon if already owned', function() {
      mockWeapons.owned.smg = true;
      GAME.buy.tryBuy('smg');
      expect(mockPlayer.money).toBe(5000);
    });

    it('should not buy weapon if not enough money', function() {
      mockPlayer.money = 100;
      GAME.buy.tryBuy('rifle');
      expect(mockWeapons.owned.rifle).toBe(false);
      expect(mockPlayer.money).toBe(100);
    });

    it('should buy grenade and deduct money', function() {
      var price = GAME.WEAPON_DEFS.grenade.price;
      GAME.buy.tryBuy('grenade');
      expect(mockPlayer.money).toBe(5000 - price);
      expect(mockWeapons.grenadeCount).toBe(1);
    });

    it('should not buy grenade if already at max', function() {
      mockWeapons.grenadeCount = 1;
      GAME.buy.tryBuy('grenade');
      expect(mockPlayer.money).toBe(5000);
    });

    it('should buy smoke grenade for $300', function() {
      GAME.buy.tryBuy('smoke');
      expect(mockPlayer.money).toBe(4700);
      expect(mockWeapons.smokeCount).toBe(1);
      expect(mockWeapons.owned.smoke).toBe(true);
    });

    it('should not buy smoke if already at max', function() {
      mockWeapons.smokeCount = 1;
      GAME.buy.tryBuy('smoke');
      expect(mockPlayer.money).toBe(5000);
    });

    it('should buy flash grenade for $200', function() {
      GAME.buy.tryBuy('flash');
      expect(mockPlayer.money).toBe(4800);
      expect(mockWeapons.flashCount).toBe(1);
      expect(mockWeapons.owned.flash).toBe(true);
    });

    it('should allow buying two flashes', function() {
      GAME.buy.tryBuy('flash');
      GAME.buy.tryBuy('flash');
      expect(mockWeapons.flashCount).toBe(2);
      expect(mockPlayer.money).toBe(4600);
    });

    it('should not buy third flash', function() {
      mockWeapons.flashCount = 2;
      GAME.buy.tryBuy('flash');
      expect(mockPlayer.money).toBe(5000);
    });

    it('should buy armor+helmet for $1000 when none owned', function() {
      GAME.buy.tryBuy('armor');
      expect(mockPlayer.money).toBe(4000);
      expect(mockPlayer.armor).toBe(100);
      expect(mockPlayer.helmet).toBe(true);
    });

    it('should buy only kevlar for $650 when cannot afford combo', function() {
      mockPlayer.money = 800;
      GAME.buy.tryBuy('armor');
      expect(mockPlayer.money).toBe(150);
      expect(mockPlayer.armor).toBe(100);
      expect(mockPlayer.helmet).toBe(false);
    });

    it('should buy helmet for $350 when armor already full', function() {
      mockPlayer.armor = 100;
      mockPlayer.helmet = false;
      GAME.buy.tryBuy('armor');
      expect(mockPlayer.money).toBe(4650);
      expect(mockPlayer.helmet).toBe(true);
    });

    it('should buy armor for $650 when helmet already owned', function() {
      mockPlayer.armor = 50;
      mockPlayer.helmet = true;
      GAME.buy.tryBuy('armor');
      expect(mockPlayer.money).toBe(4350);
      expect(mockPlayer.armor).toBe(100);
    });

    it('should not buy armor when fully equipped', function() {
      mockPlayer.armor = 100;
      mockPlayer.helmet = true;
      GAME.buy.tryBuy('armor');
      expect(mockPlayer.money).toBe(5000);
    });

    it('should work during SURVIVAL_BUY phase', function() {
      GAME._getGameState = function() { return 'SURVIVAL_BUY'; };
      GAME.buy.tryBuy('smg');
      expect(mockWeapons.owned.smg).toBe(true);
    });

    it('should work during DEATHMATCH_ACTIVE phase', function() {
      GAME._getGameState = function() { return 'DEATHMATCH_ACTIVE'; };
      GAME.buy.tryBuy('smg');
      expect(mockWeapons.owned.smg).toBe(true);
    });

    it('should work during TOURING phase', function() {
      GAME._getGameState = function() { return 'TOURING'; };
      GAME.buy.tryBuy('smg');
      expect(mockWeapons.owned.smg).toBe(true);
    });
  });
});
