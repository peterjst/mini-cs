// js/systems/progression.js — Rank/XP, missions, perks, kill streaks, match history, best scores
// Uses GAME.Sound, GAME.showAnnouncement, GAME._startRound
//
// Persistence: localStorage. The schema is best-effort; per
// docs/game-design.md non-goals there is no migration on breaking
// changes — wipes are acceptable.
// XP awards happen at match end, batched. Do not award mid-match.
// API exposed on GAME.progression.

(function() {
  'use strict';

  // ── Difficulty XP Multiplier ─────────────────────────────
  var DIFF_XP_MULT = { easy: 0.5, normal: 1, hard: 1.5, elite: 2.5 };

  // ── Rank System ────────────────────────────────────────
  var RANKS = [
    { name: 'Silver I',        xp: 0,     color: '#8a8a8a' },
    { name: 'Silver II',       xp: 100,   color: '#9a9a9a' },
    { name: 'Silver III',      xp: 250,   color: '#aaaaaa' },
    { name: 'Silver IV',       xp: 500,   color: '#b0b0b0' },
    { name: 'Silver Elite',    xp: 800,   color: '#c0c0c0' },
    { name: 'Silver Elite Master', xp: 1200, color: '#d0d0d0' },
    { name: 'Gold Nova I',     xp: 1700,  color: '#c8a832' },
    { name: 'Gold Nova II',    xp: 2300,  color: '#d4b440' },
    { name: 'Gold Nova III',   xp: 3000,  color: '#e0c050' },
    { name: 'Gold Nova Master', xp: 4000, color: '#ecd060' },
    { name: 'Master Guardian I', xp: 5200, color: '#4fc3f7' },
    { name: 'Master Guardian II', xp: 6600, color: '#29b6f6' },
    { name: 'Master Guardian Elite', xp: 8200, color: '#039be5' },
    { name: 'Distinguished MG', xp: 10000, color: '#0288d1' },
    { name: 'Legendary Eagle',  xp: 12500, color: '#ab47bc' },
    { name: 'Legendary Eagle Master', xp: 15500, color: '#8e24aa' },
    { name: 'Supreme Master',   xp: 19000, color: '#ff7043' },
    { name: 'Global Elite',     xp: 23000, color: '#ffd740' },
  ];

  function getTotalXP() {
    return parseInt(localStorage.getItem('miniCS_xp')) || 0;
  }
  function setTotalXP(xp) {
    localStorage.setItem('miniCS_xp', xp);
  }
  function getRankForXP(xp) {
    var rank = RANKS[0];
    for (var i = RANKS.length - 1; i >= 0; i--) {
      if (xp >= RANKS[i].xp) { rank = RANKS[i]; rank.index = i; break; }
    }
    return rank;
  }
  function getNextRank(rank) {
    var idx = rank.index !== undefined ? rank.index : 0;
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  }
  function updateRankDisplay() {
    var xp = getTotalXP();
    var rank = getRankForXP(xp);
    var next = getNextRank(rank);
    var progress = 0;
    if (next) {
      progress = Math.min(100, ((xp - rank.xp) / (next.xp - rank.xp)) * 100);
    } else {
      progress = 100;
    }
    var rankDisplay = document.getElementById('rank-display');
    if (!rankDisplay) return;
    rankDisplay.innerHTML =
      '<div class="rank-badge" style="color:' + rank.color + '; border-color:' + rank.color + ';">' + rank.name + '</div>' +
      '<div class="rank-xp-bar"><div class="rank-xp-fill" style="width:' + progress + '%; background:' + rank.color + ';"></div></div>' +
      '<div class="rank-xp-text">' + xp + ' XP' + (next ? ' / ' + next.xp : ' (MAX)') + '</div>';
  }

  function calculateXP(kills, headshots, roundsWon, matchWin, diffMult) {
    var baseXP = (kills * 10) + (headshots * 5) + (roundsWon * 20) + (matchWin ? 50 : 0);
    return Math.round(baseXP * diffMult);
  }

  function awardXP(xpEarned) {
    var oldXP = getTotalXP();
    var oldRank = getRankForXP(oldXP);
    var newXP = oldXP + xpEarned;
    setTotalXP(newXP);
    var newRank = getRankForXP(newXP);
    if (newRank.index > oldRank.index) {
      // Rank up!
      if (GAME.Sound) GAME.Sound.rankUp();
      var flash = document.createElement('div');
      flash.className = 'rankup-flash';
      document.body.appendChild(flash);
      setTimeout(function() { flash.remove(); }, 1600);
    }
    return { oldRank: oldRank, newRank: newRank, ranked_up: newRank.index > oldRank.index };
  }

  // ── Mission System ───────────────────────────────────────
  var MISSION_POOL = [
    { id: 'headshots_5', type: 'match', desc: 'Get 5 headshots', target: 5, tracker: 'headshots', reward: 75 },
    { id: 'kills_10', type: 'match', desc: 'Get 10 kills', target: 10, tracker: 'kills', reward: 80 },
    { id: 'triple_kill', type: 'match', desc: 'Get a Triple Kill', target: 1, tracker: 'triple_kill', reward: 100 },
    { id: 'pistol_round', type: 'round', desc: 'Win a round using only pistol', target: 1, tracker: 'pistol_win', reward: 120 },
    { id: 'knife_kill', type: 'match', desc: 'Get a knife kill', target: 1, tracker: 'knife_kills', reward: 150 },
    { id: 'crouch_kills_3', type: 'match', desc: 'Kill 3 enemies while crouching', target: 3, tracker: 'crouch_kills', reward: 90 },
    { id: 'no_damage_round', type: 'round', desc: 'Win a round without taking damage', target: 1, tracker: 'no_damage_win', reward: 150 },
    { id: 'survival_wave_5', type: 'survival', desc: 'Reach wave 5 in Survival', target: 5, tracker: 'survival_wave', reward: 100 },
    { id: 'survival_dust', type: 'survival', desc: 'Reach wave 5 on Dust (Survival)', target: 5, tracker: 'survival_dust', reward: 120 },
    { id: 'earn_5000', type: 'match', desc: 'Earn $5000 in a single match', target: 5000, tracker: 'money_earned', reward: 100 },
    { id: 'rampage', type: 'match', desc: 'Get a Rampage (5 kill streak)', target: 1, tracker: 'rampage', reward: 150 },
    { id: 'weekly_wins_3', type: 'weekly', desc: 'Win 3 competitive matches', target: 3, tracker: 'weekly_wins', reward: 300 },
    { id: 'weekly_headshots_25', type: 'weekly', desc: 'Get 25 headshots (any mode)', target: 25, tracker: 'weekly_headshots', reward: 350 },
    { id: 'weekly_survival_wave_10', type: 'weekly', desc: 'Reach wave 10 in Survival', target: 10, tracker: 'weekly_survival', reward: 500 },
    { id: 'gungame_complete', type: 'match', desc: 'Complete a Gun Game', target: 1, tracker: 'gungame_complete', reward: 100 },
    { id: 'gungame_fast', type: 'match', desc: 'Complete Gun Game under 3 minutes', target: 1, tracker: 'gungame_fast', reward: 150 },
    { id: 'awp_kills_3', type: 'match', desc: 'Get 3 AWP kills', target: 3, tracker: 'awp_kills', reward: 75 },
    { id: 'smg_kills_5', type: 'match', desc: 'Get 5 SMG kills', target: 5, tracker: 'smg_kills', reward: 60 },
    { id: 'shotgun_kills_3', type: 'match', desc: 'Get 3 shotgun kills', target: 3, tracker: 'shotgun_kills', reward: 75 },
    { id: 'grenade_kills_2', type: 'match', desc: 'Get 2 grenade kills', target: 2, tracker: 'grenade_kills', reward: 60 },
    { id: 'utility_all', type: 'match', desc: 'Use all grenade types in one match', target: 1, tracker: 'all_nades', reward: 80 },
    { id: 'dm_kills_15', type: 'match', desc: 'Get 15 kills in Deathmatch', target: 15, tracker: 'dm_kills', reward: 90 },
    { id: 'accuracy_60', type: 'match', desc: 'Finish a match with 60%+ accuracy', target: 1, tracker: 'high_accuracy', reward: 120 }
  ];
  var activeMissions = { daily1: null, daily2: null, daily3: null, weekly: null };
  var lastMissionRefresh = { daily: 0, weekly: 0 };

  function getMissionDef(id) {
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].id === id) return MISSION_POOL[i];
    }
    return null;
  }

  function generateDailyMissions() {
    var dailies = [];
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].type !== 'weekly') dailies.push(MISSION_POOL[i]);
    }
    var picked = [];
    for (var d = 0; d < 3; d++) {
      var m;
      do { m = dailies[Math.floor(Math.random() * dailies.length)]; }
      while (picked.indexOf(m.id) >= 0);
      picked.push(m.id);
      activeMissions['daily' + (d + 1)] = { id: m.id, progress: 0, completed: false };
    }
  }

  function generateWeeklyMission() {
    var weeklies = [];
    for (var i = 0; i < MISSION_POOL.length; i++) {
      if (MISSION_POOL[i].type === 'weekly') weeklies.push(MISSION_POOL[i]);
    }
    var w = weeklies[Math.floor(Math.random() * weeklies.length)];
    activeMissions.weekly = { id: w.id, progress: 0, completed: false };
  }

  function checkMissionRefresh() {
    var now = Date.now();
    var DAY_MS = 24 * 60 * 60 * 1000;
    var WEEK_MS = 7 * DAY_MS;
    if (now - lastMissionRefresh.daily > DAY_MS) {
      activeMissions.daily1 = null;
      activeMissions.daily2 = null;
      activeMissions.daily3 = null;
      lastMissionRefresh.daily = now;
    }
    if (now - lastMissionRefresh.weekly > WEEK_MS) {
      activeMissions.weekly = null;
      lastMissionRefresh.weekly = now;
    }
    if (!activeMissions.daily1) generateDailyMissions();
    if (!activeMissions.weekly) generateWeeklyMission();
    saveMissionState();
  }

  function loadMissionState() {
    try {
      var saved = localStorage.getItem('miniCS_missions');
      if (saved) {
        var data = JSON.parse(saved);
        if (data.active) activeMissions = data.active;
        if (data.lastRefresh) lastMissionRefresh = data.lastRefresh;
      }
    } catch (e) {}
  }

  function saveMissionState() {
    localStorage.setItem('miniCS_missions', JSON.stringify({
      active: activeMissions,
      lastRefresh: lastMissionRefresh
    }));
  }

  function trackMissionEvent(eventType, value) {
    var slots = ['daily1', 'daily2', 'daily3', 'weekly'];
    for (var s = 0; s < slots.length; s++) {
      var mission = activeMissions[slots[s]];
      if (!mission || mission.completed) continue;
      var def = getMissionDef(mission.id);
      if (!def || def.tracker !== eventType) continue;
      mission.progress = Math.min(def.target, mission.progress + (value || 1));
      if (mission.progress >= def.target) {
        mission.completed = true;
        var oldXP = getTotalXP();
        setTotalXP(oldXP + def.reward);
        if (GAME.hud) GAME.hud.showAnnouncement('MISSION COMPLETE', def.desc + '  +' + def.reward + ' XP');
        if (GAME.Sound) GAME.Sound.killStreak(2);
        updateRankDisplay();
      }
    }
    saveMissionState();
    updateMissionUI();
  }

  function updateMissionUI() {
    var dailyList = document.getElementById('mission-daily-list');
    var weeklyEl = document.getElementById('mission-weekly');
    if (!dailyList || !weeklyEl) return;
    dailyList.innerHTML = '';
    var slots = ['daily1', 'daily2', 'daily3'];
    for (var i = 0; i < slots.length; i++) {
      var m = activeMissions[slots[i]];
      if (!m) continue;
      var def = getMissionDef(m.id);
      if (!def) continue;
      var card = document.createElement('div');
      card.className = 'mission-card' + (m.completed ? ' completed' : '');
      card.innerHTML =
        '<div class="mission-desc">' + def.desc + '</div>' +
        '<div class="mission-progress">' + m.progress + ' / ' + def.target + '</div>' +
        '<div class="mission-reward">' + (m.completed ? '\u2713' : '+' + def.reward + ' XP') + '</div>';
      dailyList.appendChild(card);
    }
    var wm = activeMissions.weekly;
    if (wm) {
      var wd = getMissionDef(wm.id);
      if (wd) {
        weeklyEl.className = 'mission-card' + (wm.completed ? ' completed' : '');
        weeklyEl.innerHTML =
          '<div class="mission-desc">' + wd.desc + '</div>' +
          '<div class="mission-progress">' + wm.progress + ' / ' + wd.target + '</div>' +
          '<div class="mission-reward">' + (wm.completed ? '\u2713' : '+' + wd.reward + ' XP') + '</div>';
      }
    }
  }

  function updateMissionOverlay() {
    var dailyList = document.getElementById('overlay-mission-daily-list');
    var weeklyEl = document.getElementById('overlay-mission-weekly');
    if (!dailyList || !weeklyEl) return;
    dailyList.innerHTML = '';
    var slots = ['daily1', 'daily2', 'daily3'];
    for (var i = 0; i < slots.length; i++) {
      var m = activeMissions[slots[i]];
      if (!m) continue;
      var def = getMissionDef(m.id);
      if (!def) continue;
      var card = document.createElement('div');
      card.className = 'mission-card' + (m.completed ? ' completed' : '');
      card.innerHTML =
        '<div class="mission-desc">' + def.desc + '</div>' +
        '<div class="mission-progress">' + m.progress + ' / ' + def.target + '</div>' +
        '<div class="mission-reward">' + (m.completed ? '\u2713' : '+' + def.reward + ' XP') + '</div>';
      dailyList.appendChild(card);
    }
    var wm = activeMissions.weekly;
    if (wm) {
      var wd = getMissionDef(wm.id);
      if (wd) {
        weeklyEl.className = 'mission-card' + (wm.completed ? ' completed' : '');
        weeklyEl.innerHTML =
          '<div class="mission-desc">' + wd.desc + '</div>' +
          '<div class="mission-progress">' + wm.progress + ' / ' + wd.target + '</div>' +
          '<div class="mission-reward">' + (wm.completed ? '\u2713' : '+' + wd.reward + ' XP') + '</div>';
      }
    }
  }

  // ── Round Perk System ────────────────────────────────────
  var PERK_POOL = [
    { id: 'stopping_power', name: 'Stopping Power', desc: '+25% weapon damage', icon: '\u26A1' },
    { id: 'quick_hands', name: 'Quick Hands', desc: '30% faster reload', icon: '\u2699' },
    { id: 'fleet_foot', name: 'Fleet Foot', desc: '+20% move speed', icon: '\uD83D\uDC5F' },
    { id: 'thick_skin', name: 'Thick Skin', desc: '+25 HP at round start', icon: '\uD83D\uDEE1' },
    { id: 'scavenger', name: 'Scavenger', desc: '+$150 bonus per kill', icon: '\uD83D\uDCB0' },
    { id: 'marksman', name: 'Marksman', desc: 'Headshot multiplier 3\u00D7', icon: '\uD83C\uDFAF' },
    { id: 'steady_aim', name: 'Steady Aim', desc: '30% tighter spread', icon: '\uD83D\uDD0D' },
    { id: 'iron_lungs', name: 'Iron Lungs', desc: 'Crouch accuracy 60%', icon: '\uD83E\uDEC1' },
    { id: 'blast_radius', name: 'Blast Radius', desc: 'Grenade radius +30%', icon: '\uD83D\uDCA3' },
    { id: 'ghost', name: 'Ghost', desc: 'Enemies detect you 30% slower', icon: '\uD83D\uDC7B' },
    { id: 'juggernaut', name: 'Juggernaut', desc: 'Take 15% less damage', icon: '\uD83E\uDDBE' }
  ];
  var activePerks = [];
  var perkChoices = [];
  var lastRoundWon = false;
  var perkScreenOpen = false;

  function hasPerk(perkId) {
    for (var i = 0; i < activePerks.length; i++) {
      if (activePerks[i].id === perkId) return true;
    }
    return false;
  }

  function clearPerks() {
    activePerks = [];
    perkScreenOpen = false;
    updateActivePerkUI();
  }

  function updateActivePerkUI() {
    var container = document.getElementById('active-perks');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < activePerks.length; i++) {
      var el = document.createElement('div');
      el.className = 'active-perk';
      el.innerHTML = '<span class="active-perk-icon">' + activePerks[i].icon + '</span>' + activePerks[i].name;
      container.appendChild(el);
    }
  }

  function offerPerkChoice() {
    if (perkScreenOpen) return;
    perkScreenOpen = true;
    perkChoices = [];
    var available = [];
    for (var i = 0; i < PERK_POOL.length; i++) {
      if (!hasPerk(PERK_POOL[i].id)) available.push(PERK_POOL[i]);
    }
    for (var j = 0; j < 3 && available.length > 0; j++) {
      var idx = Math.floor(Math.random() * available.length);
      perkChoices.push(available[idx]);
      available.splice(idx, 1);
    }
    renderPerkChoices();
    var screen = document.getElementById('perk-screen');
    if (screen) screen.classList.add('show');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function renderPerkChoices() {
    var grid = document.getElementById('perk-choices');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < perkChoices.length; i++) {
      (function(perk) {
        var card = document.createElement('div');
        card.className = 'perk-card';
        card.innerHTML =
          '<div class="perk-icon">' + perk.icon + '</div>' +
          '<div class="perk-name">' + perk.name + '</div>' +
          '<div class="perk-desc">' + perk.desc + '</div>';
        card.addEventListener('click', function() { selectPerk(perk); });
        grid.appendChild(card);
      })(perkChoices[i]);
    }
  }

  function selectPerk(perk) {
    activePerks.push(perk);
    perkScreenOpen = false;
    var screen = document.getElementById('perk-screen');
    if (screen) screen.classList.remove('show');
    updateActivePerkUI();
    if (GAME.Sound) GAME.Sound.buy();
    if (GAME._startRound) GAME._startRound();
  }

  // ── Kill Streaks ───────────────────────────────────────
  var killStreak = 0;
  var streakTimeout = null;
  var STREAK_NAMES = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE', 8: 'UNSTOPPABLE', 12: 'GODLIKE' };

  function checkKillStreak() {
    killStreak++;
    var name = null;
    if (killStreak >= 12) name = STREAK_NAMES[12];
    else if (killStreak >= 8) name = STREAK_NAMES[8];
    else if (killStreak >= 5) name = STREAK_NAMES[5];
    else if (STREAK_NAMES[killStreak]) name = STREAK_NAMES[killStreak];

    if (name) {
      var streakAnnounce = document.getElementById('streak-announce');
      if (streakAnnounce) {
        streakAnnounce.textContent = name;
        streakAnnounce.classList.add('show');
      }
      if (streakTimeout) clearTimeout(streakTimeout);
      streakTimeout = setTimeout(function() {
        var el = document.getElementById('streak-announce');
        if (el) el.classList.remove('show');
      }, 2000);
      var tier = killStreak >= 12 ? 5 : killStreak >= 8 ? 4 : killStreak >= 5 ? 3 : killStreak - 1;
      if (GAME.Sound) GAME.Sound.killStreak(tier);
    }
    // Mission tracking for streaks
    if (killStreak === 3) trackMissionEvent('triple_kill', 1);
    if (killStreak === 5) trackMissionEvent('rampage', 1);
  }

  function getKillStreak() {
    return killStreak;
  }

  function resetKillStreak() {
    killStreak = 0;
  }

  // ── Survival Best Scores ───────────────────────────────
  function getSurvivalBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_survivalBest')) || {}; }
    catch(e) { return {}; }
  }
  function setSurvivalBest(mapName, wave) {
    var best = getSurvivalBest();
    if (!best[mapName] || wave > best[mapName]) {
      best[mapName] = wave;
      localStorage.setItem('miniCS_survivalBest', JSON.stringify(best));
    }
  }
  function updateSurvivalBestDisplay() {
    var best = getSurvivalBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': Wave ' + best[mapNames[i]]);
    }
    var survivalBestDisplay = document.getElementById('survival-best-display');
    if (survivalBestDisplay) survivalBestDisplay.textContent = parts.length > 0 ? 'BEST — ' + parts.join(' | ') : 'No records yet';
  }

  // ── Gun Game Best Scores ──────────────────────────────
  function getGunGameBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_gungameBest')) || {}; }
    catch(e) { return {}; }
  }
  function setGunGameBest(mapName, seconds) {
    var best = getGunGameBest();
    if (!best[mapName] || seconds < best[mapName]) {
      best[mapName] = seconds;
      localStorage.setItem('miniCS_gungameBest', JSON.stringify(best));
    }
  }
  function updateGunGameBestDisplay() {
    var best = getGunGameBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) {
        var s = best[mapNames[i]];
        var m = Math.floor(s / 60), sec = Math.floor(s % 60);
        parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': ' + m + ':' + (sec < 10 ? '0' : '') + sec);
      }
    }
    var gungameBestDisplay = document.getElementById('gungame-best-display');
    if (gungameBestDisplay) gungameBestDisplay.textContent = parts.length > 0 ? 'BEST TIMES — ' + parts.join(' | ') : 'No records yet';
  }

  // ── Deathmatch Best Scores ─────────────────────────────
  function getDMBest() {
    try { return JSON.parse(localStorage.getItem('miniCS_dmBest')) || {}; }
    catch(e) { return {}; }
  }
  function setDMBest(mapName, kills) {
    var best = getDMBest();
    if (!best[mapName] || kills > best[mapName]) {
      best[mapName] = kills;
      localStorage.setItem('miniCS_dmBest', JSON.stringify(best));
    }
  }
  function updateDMBestDisplay() {
    var best = getDMBest();
    var mapNames = ['dust', 'office', 'warehouse', 'bloodstrike', 'italy', 'aztec', 'arena'];
    var parts = [];
    for (var i = 0; i < mapNames.length; i++) {
      if (best[mapNames[i]]) parts.push(mapNames[i].charAt(0).toUpperCase() + mapNames[i].slice(1) + ': ' + best[mapNames[i]] + ' kills');
    }
    var dmBestDisplay = document.getElementById('dm-best-display');
    if (dmBestDisplay) dmBestDisplay.textContent = parts.length > 0 ? 'BEST — ' + parts.join(' | ') : 'No records yet';
  }

  // ── Match History ──────────────────────────────────────
  function saveMatchHistory(data) {
    var history = getMatchHistory();
    history.unshift({
      date: new Date().toISOString(),
      result: data.result,
      playerScore: data.playerScore,
      botScore: data.botScore,
      rounds: data.rounds,
      kills: data.kills,
      deaths: data.deaths,
      headshots: data.headshots,
      difficulty: data.difficulty,
      xpEarned: data.xpEarned || 0
    });
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem('miniCS_history', JSON.stringify(history));
  }

  function getMatchHistory() {
    try {
      return JSON.parse(localStorage.getItem('miniCS_history')) || [];
    } catch(e) { return []; }
  }

  function getStats() {
    var history = getMatchHistory();
    var wins = 0, losses = 0, draws = 0, totalKills = 0, totalDeaths = 0, totalHS = 0;
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      if (m.result === 'VICTORY') wins++;
      else if (m.result === 'DEFEAT') losses++;
      else draws++;
      totalKills += m.kills || 0;
      totalDeaths += m.deaths || 0;
      totalHS += m.headshots || 0;
    }
    var hsPercent = totalKills > 0 ? Math.round((totalHS / totalKills) * 100) : 0;
    var avgKillsPerMatch = history.length > 0 ? Math.round(totalKills / history.length) : 0;
    return {
      matches: history.length,
      wins: wins, losses: losses, draws: draws,
      winRate: history.length > 0 ? Math.round((wins / history.length) * 100) : 0,
      kills: totalKills, deaths: totalDeaths,
      headshots: totalHS, hsPercent: hsPercent,
      avgKillsPerMatch: avgKillsPerMatch
    };
  }

  function renderHistory() {
    var historyStats = document.getElementById('history-stats');
    var historyList = document.getElementById('history-list');
    if (!historyStats || !historyList) return;

    var F = (GAME && GAME.format) ? GAME.format : null;
    var stats = getStats();

    function tile(num, label) {
      return '<div class="summary-stat"><div class="summary-num">' + num +
        '</div><div class="summary-lbl">' + label + '</div></div>';
    }
    function pctWithUnit(v) {
      return String(Math.round(v || 0)) + '<span class="summary-unit">%</span>';
    }
    function intFmt(v) { return F ? F.int(v) : String(v); }

    historyStats.innerHTML =
      tile(intFmt(stats.matches), 'Matches Played') +
      tile(pctWithUnit(stats.winRate), 'Win Rate') +
      tile(intFmt(stats.avgKillsPerMatch), 'Avg Kills / Match') +
      tile(pctWithUnit(stats.hsPercent), 'Headshot Rate');

    var history = getMatchHistory();
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No matches played yet.</div>';
      return;
    }

    function plural(n, singular, pluralForm) {
      return n === 1 ? (n + ' ' + singular) : (n + ' ' + pluralForm);
    }
    function fmtDate(iso) {
      try {
        var d = new Date(iso);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var day = d.getDate();
        var mo = months[d.getMonth()];
        var hh = d.getHours();
        var mm = d.getMinutes();
        return mo + ' ' + day + ', ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      } catch(e) { return ''; }
    }

    var html = '';
    for (var i = 0; i < history.length; i++) {
      var m = history[i];
      var cls = m.result === 'VICTORY' ? 'win' : m.result === 'DEFEAT' ? 'loss' : 'draw';
      var k = m.kills || 0, dth = m.deaths || 0, hs = m.headshots || 0;
      var diff = m.difficulty ? (m.difficulty.charAt(0).toUpperCase() + m.difficulty.slice(1).toLowerCase()) : '';
      html += '<div class="history-entry ' + cls + '">' +
        '<div class="he-bar"></div>' +
        '<div class="he-head">' +
          '<div class="he-result">' + m.result + '</div>' +
          '<div class="he-score-small">' + (m.playerScore || 0) + ' — ' + (m.botScore || 0) + '</div>' +
        '</div>' +
        '<div class="he-mid">' +
          '<b>' + plural(k, 'kill', 'kills') + ' </b>· ' +
          '<b>' + plural(dth, 'death', 'deaths') + ' </b>· ' +
          '<b>' + plural(hs, 'headshot', 'headshots') + '</b>' +
        '</div>' +
        '<div class="he-right">' +
          (diff ? '<div class="he-diff">' + diff + '</div>' : '') +
          '<div>' + fmtDate(m.date) + '</div>' +
        '</div>' +
      '</div>';
    }
    historyList.innerHTML = html;
  }

  // ── Expose API ─────────────────────────────────────────
  GAME.progression = {
    // Rank/XP
    DIFF_XP_MULT: DIFF_XP_MULT,
    getTotalXP: getTotalXP,
    setTotalXP: setTotalXP,
    getRankForXP: getRankForXP,
    getNextRank: getNextRank,
    updateRankDisplay: updateRankDisplay,
    calculateXP: calculateXP,
    awardXP: awardXP,

    // Missions
    loadMissionState: loadMissionState,
    checkMissionRefresh: checkMissionRefresh,
    trackMissionEvent: trackMissionEvent,
    updateMissionUI: updateMissionUI,
    updateMissionOverlay: updateMissionOverlay,

    // Perks
    PERK_POOL: PERK_POOL,
    hasPerk: hasPerk,
    clearPerks: clearPerks,
    offerPerkChoice: offerPerkChoice,
    selectPerk: selectPerk,
    getActivePerks: function() { return activePerks; },
    isPerkScreenOpen: function() { return perkScreenOpen; },
    setLastRoundWon: function(val) { lastRoundWon = val; },
    getLastRoundWon: function() { return lastRoundWon; },

    // Kill Streaks
    checkKillStreak: checkKillStreak,
    getKillStreak: getKillStreak,
    resetKillStreak: resetKillStreak,

    // Survival Best
    getSurvivalBest: getSurvivalBest,
    setSurvivalBest: setSurvivalBest,
    updateSurvivalBestDisplay: updateSurvivalBestDisplay,

    // Gun Game Best
    getGunGameBest: getGunGameBest,
    setGunGameBest: setGunGameBest,
    updateGunGameBestDisplay: updateGunGameBestDisplay,

    // Deathmatch Best
    getDMBest: getDMBest,
    setDMBest: setDMBest,
    updateDMBestDisplay: updateDMBestDisplay,

    // Match History
    saveMatchHistory: saveMatchHistory,
    getMatchHistory: getMatchHistory,
    getStats: getStats,
    renderHistory: renderHistory
  };

  // Backward-compatible global
  GAME.hasPerk = hasPerk;

})();
