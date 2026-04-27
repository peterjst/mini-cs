import { describe, it, expect, beforeEach } from 'vitest';
import { loadModule } from '../helpers.js';

loadModule('js/maps/shared.js');
loadModule('js/systems/weapons.js');

describe('Buy ammo (js/ui/buy.js)', function() {
  var mockPlayer, mockWeapons, mockDom, mockHud, mockSound;
  var DEFS;

  beforeEach(function() {
    DEFS = GAME.WEAPON_DEFS;
    mockPlayer = { money: 5000, armor: 0, helmet: false };
    mockWeapons = {
      owned: { pistol: true, smg: false, shotgun: false, rifle: false, awp: false, smoke: false, flash: false },
      reserve: { pistol: DEFS.pistol.reserveFloor, smg: 0, shotgun: 0, rifle: 0, awp: 0 },
      ammo: { pistol: DEFS.pistol.magSize, smg: 0, shotgun: 0, rifle: 0, awp: 0 },
      grenadeCount: 0,
      smokeCount: 0,
      flashCount: 0,
      giveWeapon: function(w) {
        this.owned[w] = true;
        this.ammo[w] = DEFS[w].magSize;
        this.reserve[w] = DEFS[w].reserveFloor;
      },
      switchTo: function() {},
      buyGrenade: function() { this.grenadeCount++; }
    };
    mockDom = { buyBalance: { textContent: '' } };
    mockHud = { update: function() {} };
    mockSound = { buy: function() {} };

    GAME.player = mockPlayer;
    GAME.weaponSystem = mockWeapons;
    GAME.dom = mockDom;
    GAME.hud = mockHud;
    GAME.Sound = mockSound;
    GAME._STATES = { BUY_PHASE: 'BUY_PHASE', SURVIVAL_BUY: 'SURVIVAL_BUY', DEATHMATCH_ACTIVE: 'DEATHMATCH_ACTIVE', TOURING: 'TOURING', PLAYING: 'PLAYING' };
    GAME._getGameState = function() { return 'BUY_PHASE'; };

    loadModule('js/ui/buy.js');
  });

  describe('SMG ammo', function() {
    it('buys 1 mag of SMG ammo when owned, deducts $50, adds magSize', function() {
      mockWeapons.owned.smg = true;
      mockWeapons.reserve.smg = DEFS.smg.reserveFloor; // 50
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('smg');
      expect(mockPlayer.money).toBe(950);
      expect(mockWeapons.reserve.smg).toBe(DEFS.smg.reserveFloor + DEFS.smg.magSize); // 75
    });

    it('does not buy when reserve at cap', function() {
      mockWeapons.owned.smg = true;
      mockWeapons.reserve.smg = DEFS.smg.reserveCap; // 125
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('smg');
      expect(mockPlayer.money).toBe(1000);
      expect(mockWeapons.reserve.smg).toBe(DEFS.smg.reserveCap);
    });

    it('does not buy when money below $50', function() {
      mockWeapons.owned.smg = true;
      mockWeapons.reserve.smg = 50;
      mockPlayer.money = 49;
      GAME.buy.tryBuy('smg');
      expect(mockPlayer.money).toBe(49);
      expect(mockWeapons.reserve.smg).toBe(50);
    });

    it('does not buy ammo outside buy phase', function() {
      mockWeapons.owned.smg = true;
      mockWeapons.reserve.smg = 50;
      mockPlayer.money = 1000;
      GAME._getGameState = function() { return 'PLAYING'; };
      GAME.buy.tryBuy('smg');
      expect(mockPlayer.money).toBe(1000);
      expect(mockWeapons.reserve.smg).toBe(50);
    });

    it('clamps to cap when buying near max (final mag is partial)', function() {
      // SMG mag=25, cap=125. Reserve at 110 means buying adds 25 → would be 135 → clamps to 125.
      mockWeapons.owned.smg = true;
      mockWeapons.reserve.smg = 110;
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('smg');
      expect(mockPlayer.money).toBe(950);
      expect(mockWeapons.reserve.smg).toBe(125);
    });

    it('5 sequential SMG buys: 50→75→100→125 then no-op', function() {
      mockWeapons.owned.smg = true;
      mockWeapons.reserve.smg = DEFS.smg.reserveFloor; // 50
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('smg'); // 75
      expect(mockWeapons.reserve.smg).toBe(75);
      GAME.buy.tryBuy('smg'); // 100
      expect(mockWeapons.reserve.smg).toBe(100);
      GAME.buy.tryBuy('smg'); // 125 (cap)
      expect(mockWeapons.reserve.smg).toBe(125);
      GAME.buy.tryBuy('smg'); // no-op
      expect(mockWeapons.reserve.smg).toBe(125);
      expect(mockPlayer.money).toBe(1000 - 3 * 50);
    });
  });

  describe('Shotgun ammo', function() {
    it('buys 1 mag of shotgun ammo when owned, deducts $50, adds magSize', function() {
      mockWeapons.owned.shotgun = true;
      mockWeapons.reserve.shotgun = DEFS.shotgun.reserveFloor; // 24
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('shotgun');
      expect(mockPlayer.money).toBe(950);
      expect(mockWeapons.reserve.shotgun).toBe(DEFS.shotgun.reserveFloor + DEFS.shotgun.magSize); // 32
    });

    it('does not buy at cap', function() {
      mockWeapons.owned.shotgun = true;
      mockWeapons.reserve.shotgun = DEFS.shotgun.reserveCap; // 56
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('shotgun');
      expect(mockPlayer.money).toBe(1000);
    });
  });

  describe('Rifle ammo', function() {
    it('buys 1 mag of rifle ammo when owned, deducts $50, adds 30', function() {
      mockWeapons.owned.rifle = true;
      mockWeapons.reserve.rifle = DEFS.rifle.reserveFloor; // 60
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('rifle');
      expect(mockPlayer.money).toBe(950);
      expect(mockWeapons.reserve.rifle).toBe(90);
    });

    it('does not buy at cap', function() {
      mockWeapons.owned.rifle = true;
      mockWeapons.reserve.rifle = DEFS.rifle.reserveCap; // 150
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('rifle');
      expect(mockPlayer.money).toBe(1000);
    });
  });

  describe('AWP ammo', function() {
    it('buys 1 mag of AWP ammo when owned, deducts $50, adds 5', function() {
      mockWeapons.owned.awp = true;
      mockWeapons.reserve.awp = DEFS.awp.reserveFloor; // 15
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('awp');
      expect(mockPlayer.money).toBe(950);
      expect(mockWeapons.reserve.awp).toBe(20);
    });

    it('4 sequential AWP buys: 15→20→25→30→35 then no-op', function() {
      mockWeapons.owned.awp = true;
      mockWeapons.reserve.awp = DEFS.awp.reserveFloor; // 15
      mockPlayer.money = 1000;
      GAME.buy.tryBuy('awp'); // 20
      GAME.buy.tryBuy('awp'); // 25
      GAME.buy.tryBuy('awp'); // 30
      GAME.buy.tryBuy('awp'); // 35 (cap)
      expect(mockWeapons.reserve.awp).toBe(35);
      GAME.buy.tryBuy('awp'); // no-op
      expect(mockWeapons.reserve.awp).toBe(35);
      expect(mockPlayer.money).toBe(1000 - 4 * 50);
    });
  });

  describe('updateBuyMenu rendering', function() {
    function makeRow(weaponKey) {
      var row = document.createElement('div');
      row.className = 'buy-item';
      row.dataset.weapon = weaponKey;
      var leftSpan = document.createElement('span');
      var keySpan = document.createElement('span');
      keySpan.className = 'item-key';
      keySpan.textContent = '[2]';
      var nameSpan = document.createElement('span');
      nameSpan.className = 'item-name';
      nameSpan.textContent = DEFS[weaponKey].name;
      var detailSpan = document.createElement('span');
      detailSpan.className = 'item-detail';
      var priceSpan = document.createElement('span');
      priceSpan.className = 'item-price';
      priceSpan.textContent = '$' + DEFS[weaponKey].price;
      leftSpan.appendChild(keySpan);
      leftSpan.appendChild(document.createTextNode(' '));
      leftSpan.appendChild(nameSpan);
      leftSpan.appendChild(detailSpan);
      row.appendChild(leftSpan);
      row.appendChild(priceSpan);
      document.body.appendChild(row);
      return row;
    }

    beforeEach(function() {
      document.body.innerHTML = '';
      mockDom.buyBalance = document.createElement('div');
    });

    it('owned weapon below cap shows ammo-buy state', function() {
      var row = makeRow('smg');
      mockWeapons.owned.smg = true;
      mockWeapons.reserve.smg = 50;
      mockPlayer.money = 1000;
      GAME.buy.updateMenu();
      expect(row.querySelector('.item-detail').textContent).toContain('Ammo');
      expect(row.querySelector('.item-detail').textContent).toContain('2/5');
      expect(row.querySelector('.item-price').textContent).toBe('$50');
      expect(row.classList.contains('owned')).toBe(false);
      expect(row.classList.contains('too-expensive')).toBe(false);
    });

    it('owned weapon at cap shows MAX AMMO and is dimmed', function() {
      var row = makeRow('smg');
      mockWeapons.owned.smg = true;
      mockWeapons.reserve.smg = 125;
      mockPlayer.money = 1000;
      GAME.buy.updateMenu();
      expect(row.querySelector('.item-detail').textContent).toContain('MAX AMMO');
      expect(row.querySelector('.item-price').textContent).toBe('');
      expect(row.classList.contains('owned')).toBe(true);
    });

    it('not-owned weapon shows weapon price', function() {
      var row = makeRow('smg');
      mockWeapons.owned.smg = false;
      mockPlayer.money = 5000;
      GAME.buy.updateMenu();
      expect(row.querySelector('.item-detail').textContent).toBe('');
      expect(row.querySelector('.item-price').textContent).toBe('$' + DEFS.smg.price);
    });

    it('owned weapon below cap, money < $50 → too-expensive', function() {
      var row = makeRow('rifle');
      mockWeapons.owned.rifle = true;
      mockWeapons.reserve.rifle = 60;
      mockPlayer.money = 49;
      GAME.buy.updateMenu();
      expect(row.classList.contains('too-expensive')).toBe(true);
    });
  });
});
