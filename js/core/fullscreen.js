// js/core/fullscreen.js — Fullscreen toggle with orientation lock
// Attaches GAME.fullscreen

(function() {
  'use strict';
  if (!window.GAME) window.GAME = {};

  var _exitingProgrammatically = false;
  var _historyPushed = false;

  function _getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function _requestFullscreen(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    return Promise.reject(new Error('Fullscreen API not supported'));
  }

  function _exitFullscreenAPI() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    return Promise.reject(new Error('Fullscreen API not supported'));
  }

  function _lockLandscape() {
    if (!GAME.isMobile) return;
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function() {});
      }
    } catch (e) {}
  }

  function _unlockOrientation() {
    if (!GAME.isMobile) return;
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (e) {}
  }

  function _updateButtons(active) {
    var menuBtn = document.getElementById('fullscreen-btn');
    var hudBtn = document.getElementById('touch-fullscreen');
    if (menuBtn) menuBtn.classList.toggle('fs-active', active);
    if (hudBtn) hudBtn.classList.toggle('fs-active', active);
  }

  function isActive() {
    return !!_getFullscreenElement();
  }

  function toggle() {
    var el = document.documentElement;
    if (!el.requestFullscreen && !el.webkitRequestFullscreen) return;

    if (isActive()) {
      _exitingProgrammatically = true;
      _exitFullscreenAPI().catch(function() { _exitingProgrammatically = false; });
      _unlockOrientation();
      if (GAME.isMobile && _historyPushed) {
        _historyPushed = false;
        history.back();
      } else {
        _exitingProgrammatically = false;
      }
    } else {
      _requestFullscreen(el).catch(function() {});
      _lockLandscape();
      if (GAME.isMobile) {
        _historyPushed = true;
        history.pushState({ fullscreen: true }, '');
      }
    }
  }

  function _onFullscreenChange() {
    var active = isActive();
    _updateButtons(active);
    if (!active && !_exitingProgrammatically && GAME.isMobile && _historyPushed) {
      _exitingProgrammatically = true;
      _historyPushed = false;
      history.back();
      _unlockOrientation();
    }
  }

  function _onPopstate() {
    if (_exitingProgrammatically) {
      _exitingProgrammatically = false;
      return;
    }
    if (isActive()) {
      _historyPushed = false;
      _exitFullscreenAPI().catch(function() {});
      _unlockOrientation();
    }
  }

  function _onF11(e) {
    if (e.key === 'F11') {
      e.preventDefault();
      toggle();
    }
  }

  function init() {
    document.addEventListener('keydown', _onF11);
    document.addEventListener('fullscreenchange', _onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', _onFullscreenChange);
    window.addEventListener('popstate', _onPopstate);

    var menuBtn = document.getElementById('fullscreen-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function() { toggle(); });
    }
    var hudBtn = document.getElementById('touch-fullscreen');
    if (hudBtn) {
      hudBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        toggle();
      }, { passive: false });
    }
  }

  GAME.fullscreen = {
    init: init,
    toggle: toggle,
    isActive: isActive
  };
})();
