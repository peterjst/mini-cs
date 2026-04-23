// js/core/format.js — Shared number / time formatting for summary screens.
(function() {
  'use strict';

  function safeNum(n) {
    if (n === null || n === undefined) return 0;
    if (typeof n !== 'number') n = Number(n);
    if (!isFinite(n) || isNaN(n)) return 0;
    return n;
  }

  function int(n) {
    var v = Math.trunc(safeNum(n));
    var sign = v < 0 ? '-' : '';
    var abs = Math.abs(v).toString();
    // Insert comma every 3 digits from the right.
    var out = '';
    for (var i = 0; i < abs.length; i++) {
      if (i > 0 && (abs.length - i) % 3 === 0) out += ',';
      out += abs[i];
    }
    return sign + out;
  }

  function percent(num, denom) {
    var d = safeNum(denom);
    if (d === 0) return '0%';
    var n = safeNum(num);
    return Math.round((n / d) * 100) + '%';
  }

  function percentParts(num, denom) {
    var d = safeNum(denom);
    var value = d === 0 ? 0 : Math.round(safeNum(num) / d * 100);
    return { value: String(value), unit: '%' };
  }

  function percentValue(v) {
    return Math.round(safeNum(v)) + '%';
  }

  function time(seconds) {
    var s = Math.max(0, Math.floor(safeNum(seconds)));
    var m = Math.floor(s / 60);
    var ss = s % 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function ratioPair(a, b) {
    return { primary: int(a), sub: ' / ' + int(b) };
  }

  function titleCase(s) {
    if (!s) return '';
    s = String(s);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  window.GAME = window.GAME || {};
  window.GAME.format = {
    int: int,
    percent: percent,
    percentParts: percentParts,
    percentValue: percentValue,
    time: time,
    ratioPair: ratioPair,
    titleCase: titleCase
  };
})();
