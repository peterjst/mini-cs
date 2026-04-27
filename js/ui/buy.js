// js/ui/buy.js — Buy system extracted from main.js
(function() {
  'use strict';

  function renderPrimaryButton(el, key) {
    var weapons = GAME.weaponSystem;
    var player = GAME.player;
    var DEFS = GAME.WEAPON_DEFS;
    var def = DEFS[key];
    var nameEl = el.querySelector('.item-name');
    var detailEl = el.querySelector('.item-detail');
    var priceEl = el.querySelector('.item-price');
    if (!nameEl || !detailEl || !priceEl) return;

    nameEl.textContent = def.name;

    if (!weapons.owned[key]) {
      detailEl.textContent = '';
      priceEl.textContent = '$' + def.price;
      if (player.money < def.price) el.classList.add('too-expensive');
      return;
    }

    var reserve = weapons.reserve[key] || 0;
    var cap = def.reserveCap;
    var magSize = def.magSize;
    var capMags = Math.round(cap / magSize);
    var currentMags = Math.floor(reserve / magSize);
    if (reserve >= cap) {
      detailEl.textContent = ' — MAX AMMO';
      priceEl.textContent = '';
      el.classList.add('owned');
    } else {
      detailEl.textContent = ' — Ammo  ' + currentMags + '/' + capMags + ' mags';
      priceEl.textContent = '$' + GAME.AMMO_PRICE_PER_MAG;
      if (player.money < GAME.AMMO_PRICE_PER_MAG) el.classList.add('too-expensive');
    }
  }

  function tryBuy(item) {
    var gs = GAME._getGameState();
    var S = GAME._STATES;
    var isBuyPhase = (gs === S.BUY_PHASE || gs === S.SURVIVAL_BUY || gs === S.DEATHMATCH_ACTIVE || gs === S.TOURING);
    if (!isBuyPhase) return;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    var DEFS = GAME.WEAPON_DEFS;

    var bought = false;
    if (item === 'smg') {
      if (weapons.owned.smg) {
        var smgCap = DEFS.smg.reserveCap;
        var smgMag = DEFS.smg.magSize;
        var smgPrice = GAME.AMMO_PRICE_PER_MAG;
        if (weapons.reserve.smg >= smgCap) return;
        if (player.money < smgPrice) return;
        player.money -= smgPrice;
        weapons.reserve.smg = Math.min(weapons.reserve.smg + smgMag, smgCap);
        bought = true;
      } else {
        if (player.money < DEFS.smg.price) return;
        player.money -= DEFS.smg.price;
        weapons.giveWeapon('smg');
        weapons.switchTo('smg');
        bought = true;
      }
    } else if (item === 'shotgun') {
      if (weapons.owned.shotgun) {
        var shotgunCap = DEFS.shotgun.reserveCap;
        var shotgunMag = DEFS.shotgun.magSize;
        var shotgunPrice = GAME.AMMO_PRICE_PER_MAG;
        if (weapons.reserve.shotgun >= shotgunCap) return;
        if (player.money < shotgunPrice) return;
        player.money -= shotgunPrice;
        weapons.reserve.shotgun = Math.min(weapons.reserve.shotgun + shotgunMag, shotgunCap);
        bought = true;
      } else {
        if (player.money < DEFS.shotgun.price) return;
        player.money -= DEFS.shotgun.price;
        weapons.giveWeapon('shotgun');
        weapons.switchTo('shotgun');
        bought = true;
      }
    } else if (item === 'rifle') {
      if (weapons.owned.rifle) {
        var rifleCap = DEFS.rifle.reserveCap;
        var rifleMag = DEFS.rifle.magSize;
        var riflePrice = GAME.AMMO_PRICE_PER_MAG;
        if (weapons.reserve.rifle >= rifleCap) return;
        if (player.money < riflePrice) return;
        player.money -= riflePrice;
        weapons.reserve.rifle = Math.min(weapons.reserve.rifle + rifleMag, rifleCap);
        bought = true;
      } else {
        if (player.money < DEFS.rifle.price) return;
        player.money -= DEFS.rifle.price;
        weapons.giveWeapon('rifle');
        weapons.switchTo('rifle');
        bought = true;
      }
    } else if (item === 'awp') {
      if (weapons.owned.awp) {
        var awpCap = DEFS.awp.reserveCap;
        var awpMag = DEFS.awp.magSize;
        var awpPrice = GAME.AMMO_PRICE_PER_MAG;
        if (weapons.reserve.awp >= awpCap) return;
        if (player.money < awpPrice) return;
        player.money -= awpPrice;
        weapons.reserve.awp = Math.min(weapons.reserve.awp + awpMag, awpCap);
        bought = true;
      } else {
        if (player.money < DEFS.awp.price) return;
        player.money -= DEFS.awp.price;
        weapons.giveWeapon('awp');
        weapons.switchTo('awp');
        bought = true;
      }
    } else if (item === 'grenade') {
      if (weapons.grenadeCount >= 1) return;
      if (player.money < DEFS.grenade.price) return;
      player.money -= DEFS.grenade.price;
      weapons.buyGrenade();
      bought = true;
    } else if (item === 'armor') {
      if (player.armor >= 100 && player.helmet) return; // Fully equipped
      if (player.armor < 100 && !player.helmet) {
        // Buy kevlar+helmet combo ($1000) if affordable, else just kevlar ($650)
        if (player.money >= 1000) {
          player.money -= 1000;
          player.armor = 100;
          player.helmet = true;
          bought = true;
        } else if (player.money >= 650) {
          player.money -= 650;
          player.armor = 100;
          bought = true;
        }
      } else if (player.armor >= 100 && !player.helmet) {
        if (player.money < 350) return;
        player.money -= 350;
        player.helmet = true;
        bought = true;
      } else if (player.armor < 100 && player.helmet) {
        if (player.money < 650) return;
        player.money -= 650;
        player.armor = 100;
        bought = true;
      }
    } else if (item === 'smoke') {
      if (weapons.smokeCount >= 1) return;
      if (player.money < 300) return;
      player.money -= 300;
      weapons.smokeCount++;
      weapons.owned.smoke = true;
      bought = true;
    } else if (item === 'flash') {
      if (weapons.flashCount >= 2) return;
      if (player.money < 200) return;
      player.money -= 200;
      weapons.flashCount++;
      weapons.owned.flash = true;
      bought = true;
    }
    if (bought && GAME.Sound) GAME.Sound.buy();
    updateBuyMenu();
    GAME.hud.update();
  }

  function updateBuyMenu() {
    var dom = GAME.dom;
    var player = GAME.player;
    var weapons = GAME.weaponSystem;
    if (!dom || !player || !weapons) return;
    dom.buyBalance.textContent = 'Balance: $' + player.money;
    var DEFS = GAME.WEAPON_DEFS;

    document.querySelectorAll('.buy-item').forEach(function(el) {
      el.classList.remove('owned', 'too-expensive');
      if (el.dataset.weapon) {
        renderPrimaryButton(el, el.dataset.weapon);
      }
      if (el.dataset.item === 'grenade') {
        if (weapons.grenadeCount >= 1) el.classList.add('owned');
        else if (player.money < DEFS.grenade.price) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'smoke') {
        if (weapons.smokeCount >= 1) el.classList.add('owned');
        else if (player.money < 300) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'flash') {
        if (weapons.flashCount >= 2) el.classList.add('owned');
        else if (player.money < 200) el.classList.add('too-expensive');
      }
      if (el.dataset.item === 'armor') {
        if (player.armor >= 100 && player.helmet) {
          el.classList.add('owned');
          el.querySelector('.item-name').textContent = 'Armor + Helmet';
          el.querySelector('.item-price').textContent = 'OWNED';
        } else if (player.armor >= 100 && !player.helmet) {
          el.querySelector('.item-name').textContent = 'Helmet';
          el.querySelector('.item-price').textContent = '$350';
          if (player.money < 350) el.classList.add('too-expensive');
        } else if (player.armor < 100 && player.helmet) {
          el.querySelector('.item-name').textContent = 'Armor';
          el.querySelector('.item-price').textContent = '$650';
          if (player.money < 650) el.classList.add('too-expensive');
        } else {
          el.querySelector('.item-name').textContent = 'Armor + Helmet';
          el.querySelector('.item-price').textContent = '$1000';
          if (player.money < 650) el.classList.add('too-expensive');
        }
      }
    });
  }

  GAME.buy = {
    tryBuy: tryBuy,
    updateMenu: updateBuyMenu
  };

  // Backward-compatible alias used by touch.js
  GAME._buyWeapon = tryBuy;
})();
