// js/systems/shuffle.js — Per-mode shuffled map deck
// Exposes GAME.shuffle.nextShuffleMap(modeKey) and GAME.shuffle.startingShuffleMap(modeKey).
// Decks persist for the browser session on GAME._shuffleDecks, per-mode.
(function() {
  'use strict';

  var GAME = window.GAME;

  GAME._shuffleDecks = GAME._shuffleDecks || {};

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function buildDeck(lastPicked) {
    var mapCount = GAME.getMapCount();
    var order = [];
    for (var i = 0; i < mapCount; i++) order.push(i);
    shuffleArray(order);
    // Swap order[0] and order[1] if lastPicked landed at position 0, preventing the same map appearing twice across the deck boundary.
    if (lastPicked !== null && lastPicked !== undefined &&
        order.length > 1 && order[0] === lastPicked) {
      var tmp = order[0]; order[0] = order[1]; order[1] = tmp;
    }
    return { order: order, pos: 0, lastPicked: lastPicked };
  }

  function nextShuffleMap(modeKey) {
    var mapCount = GAME.getMapCount();
    if (mapCount <= 1) return 0;
    var deck = GAME._shuffleDecks[modeKey];
    if (!deck || deck.pos >= deck.order.length) {
      deck = buildDeck(deck ? deck.lastPicked : null);
      GAME._shuffleDecks[modeKey] = deck;
    }
    var idx = deck.order[deck.pos];
    deck.pos++;
    deck.lastPicked = idx;
    return idx;
  }

  function startingShuffleMap(modeKey) {
    return nextShuffleMap(modeKey);
  }

  GAME.shuffle = {
    nextShuffleMap: nextShuffleMap,
    startingShuffleMap: startingShuffleMap
  };
})();
