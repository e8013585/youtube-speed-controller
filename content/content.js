/**
 * YouTube Speed Controller — main content script.
 *
 * YouTube doesn't fight playbackRate as aggressively as Netflix,
 * but it resets speed on SPA navigation, new video loads, and when
 * the user uses YouTube's built-in speed menu. This script handles
 * all those cases.
 *
 * Key YouTube-specific behaviors:
 * - SPA navigation via yt-navigate-finish events
 * - Shorts use separate video elements
 * - Ads should not have speed applied
 * - YouTube's built-in speed control fires ratechange
 */

(function () {
  'use strict';

  if (window.__yscInitialized) return;
  window.__yscInitialized = true;

  var _currentSpeed = 1.0;
  var _settings = {};
  var _activeVideo = null;
  var _videoListeners = new Map();
  var _initialized = false;
  var _enforcementRAF = null;
  var _isAdPlaying = false;

  /* ------------------------------------------------------------------ */
  /*  Speed application                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Apply playback rate to a video element.
   * YouTube is more cooperative than Netflix — direct assignment works,
   * but we still enforce briefly to handle race conditions on navigation.
   */
  function applyPlaybackRate(video, speed) {
    if (!video) return;
    if (_isAdPlaying) return; // Don't change ad speed
    try {
      video.playbackRate = speed;
    } catch (e) {}
  }

  /**
   * Enforce speed with a short rAF burst to handle YouTube's
   * rate reset on navigation.
   */
  function enforceSpeedBurst(video, speed, durationMs) {
    if (_enforcementRAF) cancelAnimationFrame(_enforcementRAF);
    if (_isAdPlaying) return;

    var start = performance.now();
    var dur = durationMs || 400;

    function tick() {
      if (performance.now() - start > dur) {
        _enforcementRAF = null;
        return;
      }
      if (!_isAdPlaying) {
        try { video.playbackRate = speed; } catch (e) {}
      }
      _enforcementRAF = requestAnimationFrame(tick);
    }
    _enforcementRAF = requestAnimationFrame(tick);
  }

  /**
   * Check if an ad is currently playing.
   */
  function checkAdState() {
    var player = document.querySelector('#movie_player, .html5-video-player');
    if (!player) { _isAdPlaying = false; return; }
    _isAdPlaying = player.classList.contains('ad-showing') ||
                   player.classList.contains('ad-interrupting') ||
                   !!player.querySelector('.ytp-ad-player-overlay');
  }

  /* ------------------------------------------------------------------ */
  /*  Key combo utilities                                               */
  /* ------------------------------------------------------------------ */

  function buildKeyCombo(e) {
    var parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    var code = e.code;
    if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
         'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'].indexOf(code) === -1) {
      parts.push(code);
    }
    return parts.join('+');
  }

  function migrateOldShortcut(oldCombo) {
    if (!oldCombo) return oldCombo;
    if (oldCombo.indexOf('Key') !== -1 || oldCombo.indexOf('Bracket') !== -1 ||
        oldCombo.indexOf('Digit') !== -1 || oldCombo.indexOf('Arrow') !== -1) {
      return oldCombo;
    }
    var charToCode = {
      '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash',
      ';': 'Semicolon', "'": 'Quote', ',': 'Comma', '.': 'Period',
      '/': 'Slash', '`': 'Backquote', '-': 'Minus', '=': 'Equal',
      '{': 'BracketLeft', '}': 'BracketRight'
    };
    var parts = oldCombo.split('+');
    var migrated = parts.map(function (part) {
      if (['Ctrl', 'Alt', 'Shift', 'Meta'].indexOf(part) !== -1) return part;
      if (charToCode[part]) return charToCode[part];
      if (part.length === 1 && part.match(/[a-zA-Z]/)) return 'Key' + part.toUpperCase();
      if (part.length === 1 && part.match(/[0-9]/)) return 'Digit' + part;
      return part;
    });
    return migrated.join('+');
  }

  /* ------------------------------------------------------------------ */
  /*  Initialization                                                    */
  /* ------------------------------------------------------------------ */

  async function init() {
    if (_initialized) return;
    _initialized = true;

    _settings = await StorageUtil.getAllSettings();
    _currentSpeed = _settings.currentSpeed || _settings.defaultSpeed || 1.0;

    // Migrate shortcuts
    var needsSave = false;
    var migrated = {};
    var mi = migrateOldShortcut(_settings.keyIncrease);
    if (mi !== _settings.keyIncrease) { _settings.keyIncrease = mi; migrated.keyIncrease = mi; needsSave = true; }
    var md = migrateOldShortcut(_settings.keyDecrease);
    if (md !== _settings.keyDecrease) { _settings.keyDecrease = md; migrated.keyDecrease = md; needsSave = true; }
    if (needsSave) StorageUtil.set(migrated);

    SpeedOverlay.onSpeedChange(function (direction) {
      if (direction === 'increase') changeSpeed(_currentSpeed + (_settings.speedStep || 0.25));
      else changeSpeed(_currentSpeed - (_settings.speedStep || 0.25));
    });

    SpeedOverlay.updateSettings({
      enabled: _settings.overlayEnabled,
      position: _settings.overlayPosition,
      opacity: _settings.overlayOpacity,
      controlsEnabled: _settings.overlayControlsEnabled
    });

    VideoObserver.start(handleVideoChange);

    if (_settings.keyboardEnabled) {
      document.addEventListener('keydown', handleKeydown, true);
    }

    // YouTube SPA navigation — reapply speed after navigation
    document.addEventListener('yt-navigate-finish', function () {
      setTimeout(function () {
        checkAdState();
        if (_activeVideo && !_isAdPlaying) {
          applyPlaybackRate(_activeVideo, _currentSpeed);
          enforceSpeedBurst(_activeVideo, _currentSpeed, 600);
          if (!SpeedOverlay.isAttached()) {
            SpeedOverlay.attach(_activeVideo);
          }
          SpeedOverlay.showSpeed(_currentSpeed, _currentSpeed !== 1.0);
        }
      }, 500);
    });

    StorageUtil.onChange(handleStorageChange);
    chrome.runtime.onMessage.addListener(handleMessage);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && _activeVideo) {
        checkAdState();
        if (!_isAdPlaying) {
          applyPlaybackRate(_activeVideo, _currentSpeed);
        }
      }
    });

    // Periodic ad state check
    setInterval(checkAdState, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  Video lifecycle                                                   */
  /* ------------------------------------------------------------------ */

  function handleVideoChange(eventType, video) {
    if (eventType === 'added') attachToVideo(video);
    else if (eventType === 'removed') detachFromVideo(video);
  }

  function attachToVideo(video) {
    if (_videoListeners.has(video)) return;
    _activeVideo = video;

    checkAdState();
    if (!_isAdPlaying) {
      applyPlaybackRate(video, _currentSpeed);
      enforceSpeedBurst(video, _currentSpeed, 600);
    }

    var listeners = {};

    listeners.playing = function () {
      checkAdState();
      if (!_isAdPlaying) {
        applyPlaybackRate(video, _currentSpeed);
        enforceSpeedBurst(video, _currentSpeed, 400);
      }
    };

    listeners.loadeddata = function () {
      checkAdState();
      if (!_isAdPlaying) {
        applyPlaybackRate(video, _currentSpeed);
        enforceSpeedBurst(video, _currentSpeed, 600);
      }
    };

    listeners.seeked = function () {
      checkAdState();
      if (!_isAdPlaying) {
        applyPlaybackRate(video, _currentSpeed);
      }
    };

    listeners.ratechange = function () {
      checkAdState();
      // If YouTube's UI or ad changed the rate, re-apply ours
      if (!_isAdPlaying && Math.abs(video.playbackRate - _currentSpeed) > 0.01) {
        applyPlaybackRate(video, _currentSpeed);
      }
    };

    Object.keys(listeners).forEach(function (event) {
      video.addEventListener(event, listeners[event]);
    });

    _videoListeners.set(video, listeners);

    SpeedOverlay.attach(video);
    SpeedOverlay.showSpeed(_currentSpeed, _currentSpeed !== 1.0);

    if (_settings.overlayControlsEnabled) {
      SpeedOverlay.showControls(true);
    }

    setupHoverControls(video);
  }

  function detachFromVideo(video) {
    var listeners = _videoListeners.get(video);
    if (listeners) {
      Object.keys(listeners).forEach(function (event) {
        video.removeEventListener(event, listeners[event]);
      });
      _videoListeners.delete(video);
    }
    if (_activeVideo === video) {
      _activeVideo = null;
      var videos = VideoObserver.findVideos();
      if (videos.length > 0) attachToVideo(videos[0]);
      else SpeedOverlay.removeAll();
    }
  }

  function setupHoverControls(video) {
    var container = video.closest('#movie_player') ||
                    video.closest('.html5-video-player') ||
                    video.parentElement;
    if (!container || container.__yscHoverSetup) return;
    container.__yscHoverSetup = true;

    container.addEventListener('mouseenter', function () {
      if (_settings.overlayControlsEnabled) SpeedOverlay.showControls(true);
    });
    container.addEventListener('mouseleave', function () {
      if (_settings.overlayControlsEnabled) SpeedOverlay.showControls(false);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Speed management                                                  */
  /* ------------------------------------------------------------------ */

  function applySpeedToAll(speed) {
    var videos = VideoObserver.getTrackedVideos();
    videos.forEach(function (video) {
      applyPlaybackRate(video, speed);
      enforceSpeedBurst(video, speed, 400);
    });
  }

  async function changeSpeed(newSpeed) {
    var clamped = StorageUtil.clampSpeed(newSpeed);
    _currentSpeed = clamped;
    checkAdState();
    if (!_isAdPlaying) applySpeedToAll(clamped);
    SpeedOverlay.showSpeed(clamped, clamped !== 1.0);
    await StorageUtil.set({ currentSpeed: clamped });
  }

  /* ------------------------------------------------------------------ */
  /*  Keyboard                                                          */
  /* ------------------------------------------------------------------ */

  function handleKeydown(e) {
    if (!_settings.keyboardEnabled) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable || e.target.getAttribute('contenteditable') === 'true') return;

    // Don't interfere with YouTube's search bar
    if (e.target.id === 'search' || e.target.closest('#search-form')) return;

    var combo = buildKeyCombo(e);
    var increaseKey = _settings.keyIncrease || 'BracketRight';
    var decreaseKey = _settings.keyDecrease || 'BracketLeft';

    if (combo === increaseKey) {
      e.preventDefault(); e.stopPropagation();
      changeSpeed(_currentSpeed + (_settings.speedStep || 0.25));
    } else if (combo === decreaseKey) {
      e.preventDefault(); e.stopPropagation();
      changeSpeed(_currentSpeed - (_settings.speedStep || 0.25));
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Storage / message handling                                        */
  /* ------------------------------------------------------------------ */

  function handleStorageChange(changes, areaName) {
    if (areaName !== 'sync' && areaName !== 'local') return;

    if (changes.currentSpeed) {
      var newSpeed = changes.currentSpeed.newValue;
      if (newSpeed !== undefined && Math.abs(newSpeed - _currentSpeed) > 0.001) {
        _currentSpeed = newSpeed;
        applySpeedToAll(_currentSpeed);
        SpeedOverlay.showSpeed(_currentSpeed, _currentSpeed !== 1.0);
      }
    }
    if (changes.overlayEnabled || changes.overlayPosition || changes.overlayOpacity || changes.overlayControlsEnabled) {
      var os = {};
      if (changes.overlayEnabled) { _settings.overlayEnabled = changes.overlayEnabled.newValue; os.enabled = _settings.overlayEnabled; }
      if (changes.overlayPosition) { _settings.overlayPosition = changes.overlayPosition.newValue; os.position = _settings.overlayPosition; }
      if (changes.overlayOpacity) { _settings.overlayOpacity = changes.overlayOpacity.newValue; os.opacity = _settings.overlayOpacity; }
      if (changes.overlayControlsEnabled) { _settings.overlayControlsEnabled = changes.overlayControlsEnabled.newValue; os.controlsEnabled = _settings.overlayControlsEnabled; }
      SpeedOverlay.updateSettings(os);
      if (_activeVideo && !SpeedOverlay.isAttached()) {
        SpeedOverlay.attach(_activeVideo);
        SpeedOverlay.showSpeed(_currentSpeed, _currentSpeed !== 1.0);
      }
    }
    if (changes.speedStep) _settings.speedStep = changes.speedStep.newValue;
    if (changes.keyboardEnabled) {
      _settings.keyboardEnabled = changes.keyboardEnabled.newValue;
      if (_settings.keyboardEnabled) document.addEventListener('keydown', handleKeydown, true);
      else document.removeEventListener('keydown', handleKeydown, true);
    }
    if (changes.keyIncrease) _settings.keyIncrease = changes.keyIncrease.newValue;
    if (changes.keyDecrease) _settings.keyDecrease = changes.keyDecrease.newValue;
    if (changes.quickSpeeds) _settings.quickSpeeds = changes.quickSpeeds.newValue;
  }

  function handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'getSpeed':
        sendResponse({ speed: _currentSpeed }); break;
      case 'setSpeed':
        if (StorageUtil.isValidSpeed(message.speed)) {
          changeSpeed(message.speed);
          sendResponse({ success: true, speed: _currentSpeed });
        } else {
          sendResponse({ success: false, error: 'Invalid speed' });
        }
        break;
      case 'increaseSpeed':
        changeSpeed(_currentSpeed + (_settings.speedStep || 0.25));
        sendResponse({ success: true, speed: _currentSpeed }); break;
      case 'decreaseSpeed':
        changeSpeed(_currentSpeed - (_settings.speedStep || 0.25));
        sendResponse({ success: true, speed: _currentSpeed }); break;
      case 'resetSpeed':
        changeSpeed(1.0);
        sendResponse({ success: true, speed: 1.0 }); break;
      case 'getStatus':
        sendResponse({
          active: !!_activeVideo, speed: _currentSpeed,
          videoCount: VideoObserver.getTrackedVideos().size
        }); break;
      case 'ping':
        sendResponse({ alive: true }); break;
      default:
        sendResponse({ error: 'Unknown action' });
    }
    return true;
  }

  init();
})();