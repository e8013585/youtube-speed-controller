/**
 * SpeedOverlay — on-screen speed indicator for YouTube.
 * Positioned relative to YouTube's player container.
 * Hides during ads. Avoids YouTube's control bar.
 */

var SpeedOverlay = (function () {
  'use strict';

  var _overlayElement = null;
  var _controlsElement = null;
  var _fadeTimer = null;
  var _adCheckInterval = null;
  var _settings = {
    enabled: true,
    position: 'top-right',
    opacity: 0.85,
    controlsEnabled: false
  };
  var _currentSpeed = 1.0;
  var _onSpeedChange = null;
  var _videoContainer = null;

  var OVERLAY_ID = 'ysc-speed-overlay';
  var CONTROLS_ID = 'ysc-speed-controls';
  var STYLE_ID = 'ysc-overlay-styles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#' + OVERLAY_ID + '{' +
        'position:absolute;z-index:2147483647;' +
        'background:rgba(0,0,0,0.75);color:#ff0000;' +
        'font-family:"YouTube Sans","Roboto",Arial,sans-serif;' +
        'font-size:13px;font-weight:700;padding:5px 10px;border-radius:4px;' +
        'pointer-events:none;transition:opacity 0.3s ease-in-out;opacity:0;' +
        'user-select:none;line-height:1;letter-spacing:0.3px;' +
        'border:1px solid rgba(255,0,0,0.25);' +
      '}' +
      '#' + OVERLAY_ID + '.ysc-visible{opacity:var(--ysc-opacity,0.85)}' +
      '#' + OVERLAY_ID + '.ysc-flash{' +
        'opacity:var(--ysc-opacity,0.85);animation:ysc-flash-anim 1.5s ease-in-out;' +
      '}' +
      '@keyframes ysc-flash-anim{' +
        '0%{opacity:var(--ysc-opacity,0.85);transform:scale(1.1)}' +
        '20%{opacity:var(--ysc-opacity,0.85);transform:scale(1)}' +
        '80%{opacity:var(--ysc-opacity,0.85)}' +
        '100%{opacity:0}' +
      '}' +
      '#' + OVERLAY_ID + '.ysc-persist{opacity:var(--ysc-opacity,0.85);animation:none}' +
      '#' + OVERLAY_ID + '.ysc-top-left{top:12px;left:12px}' +
      '#' + OVERLAY_ID + '.ysc-top-right{top:12px;right:12px}' +
      '#' + OVERLAY_ID + '.ysc-bottom-left{bottom:70px;left:12px}' +
      '#' + OVERLAY_ID + '.ysc-bottom-right{bottom:70px;right:12px}' +
      '#' + OVERLAY_ID + '.ysc-hidden{opacity:0!important}' +
      '#' + CONTROLS_ID + '{' +
        'position:absolute;z-index:2147483647;' +
        'background:rgba(0,0,0,0.8);border-radius:6px;padding:4px 8px;' +
        'display:flex;align-items:center;gap:8px;user-select:none;' +
        'border:1px solid rgba(255,0,0,0.25);opacity:0;transition:opacity 0.3s ease;' +
      '}' +
      '#' + CONTROLS_ID + '.ysc-controls-visible{opacity:var(--ysc-opacity,0.85)}' +
      '#' + CONTROLS_ID + ' .ysc-ctrl-btn{' +
        'background:rgba(255,0,0,0.8);color:#fff;border:none;border-radius:3px;' +
        'width:26px;height:26px;font-size:16px;font-weight:700;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;pointer-events:auto;' +
        'transition:background 0.2s;line-height:1;padding:0;' +
      '}' +
      '#' + CONTROLS_ID + ' .ysc-ctrl-btn:hover{background:rgba(255,0,0,1)}' +
      '#' + CONTROLS_ID + ' .ysc-ctrl-speed{' +
        'color:#ff0000;font-family:"YouTube Sans","Roboto",Arial,sans-serif;' +
        'font-size:12px;font-weight:700;min-width:36px;text-align:center;pointer-events:none;' +
      '}' +
      '#' + CONTROLS_ID + '.ysc-top-left{top:12px;left:12px}' +
      '#' + CONTROLS_ID + '.ysc-top-right{top:12px;right:12px}' +
      '#' + CONTROLS_ID + '.ysc-bottom-left{bottom:70px;left:12px}' +
      '#' + CONTROLS_ID + '.ysc-bottom-right{bottom:70px;right:12px}';
    document.head.appendChild(style);
  }

  /**
   * Find YouTube's player container.
   */
  function findVideoContainer(video) {
    // Standard YouTube player
    var container = video.closest('#movie_player');
    if (container) return container;

    // Shorts player
    container = video.closest('#shorts-player');
    if (container) return container;

    // Generic HTML5 player wrapper
    container = video.closest('.html5-video-player');
    if (container) return container;

    // Embedded player
    container = video.closest('#player');
    if (container) return container;

    // Walk up for positioned parent
    var parent = video.parentElement;
    while (parent && parent !== document.body) {
      var style = window.getComputedStyle(parent);
      if (style.position === 'relative' || style.position === 'absolute' || style.position === 'fixed') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return video.parentElement || document.body;
  }

  function ensureRelativePosition(container) {
    var style = window.getComputedStyle(container);
    if (style.position === 'static') container.style.position = 'relative';
  }

  function formatSpeed(speed) {
    var rounded = Math.round(speed * 100) / 100;
    if (rounded === Math.floor(rounded)) return rounded.toFixed(1) + 'x';
    if (Math.round(rounded * 10) === rounded * 10) return rounded.toFixed(1) + 'x';
    return rounded.toFixed(2) + 'x';
  }

  function updatePositionClass(el) {
    if (!el) return;
    el.classList.remove('ysc-top-left', 'ysc-top-right', 'ysc-bottom-left', 'ysc-bottom-right');
    el.classList.add('ysc-' + _settings.position);
  }

  function createOverlay() {
    removeOverlay();
    _overlayElement = document.createElement('div');
    _overlayElement.id = OVERLAY_ID;
    _overlayElement.textContent = formatSpeed(_currentSpeed);
    updatePositionClass(_overlayElement);
    _overlayElement.style.setProperty('--ysc-opacity', _settings.opacity);
    return _overlayElement;
  }

  function createControls() {
    removeControls();
    _controlsElement = document.createElement('div');
    _controlsElement.id = CONTROLS_ID;
    updatePositionClass(_controlsElement);
    _controlsElement.style.setProperty('--ysc-opacity', _settings.opacity);

    var decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'ysc-ctrl-btn';
    decreaseBtn.textContent = '\u2212';
    decreaseBtn.addEventListener('click', function (e) {
      e.stopPropagation(); e.preventDefault();
      if (_onSpeedChange) _onSpeedChange('decrease');
    });

    var speedDisplay = document.createElement('span');
    speedDisplay.className = 'ysc-ctrl-speed';
    speedDisplay.textContent = formatSpeed(_currentSpeed);

    var increaseBtn = document.createElement('button');
    increaseBtn.className = 'ysc-ctrl-btn';
    increaseBtn.textContent = '+';
    increaseBtn.addEventListener('click', function (e) {
      e.stopPropagation(); e.preventDefault();
      if (_onSpeedChange) _onSpeedChange('increase');
    });

    _controlsElement.appendChild(decreaseBtn);
    _controlsElement.appendChild(speedDisplay);
    _controlsElement.appendChild(increaseBtn);
    return _controlsElement;
  }

  function removeOverlay() {
    var existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
    _overlayElement = null;
  }

  function removeControls() {
    var existing = document.getElementById(CONTROLS_ID);
    if (existing) existing.remove();
    _controlsElement = null;
  }

  function removeAll() {
    removeOverlay(); removeControls();
    if (_adCheckInterval) { clearInterval(_adCheckInterval); _adCheckInterval = null; }
    _videoContainer = null;
  }

  function adjustControlsPosition() {
    if (!_controlsElement) return;
    updatePositionClass(_controlsElement);
    if (_settings.enabled && _overlayElement) {
      if (_settings.position.indexOf('top') === 0) {
        _controlsElement.style.top = '36px';
      } else {
        _controlsElement.style.bottom = '96px';
      }
    }
  }

  /**
   * Check if an ad is currently playing and hide/show overlay.
   */
  function startAdDetection() {
    if (_adCheckInterval) return;
    _adCheckInterval = setInterval(function () {
      if (!_videoContainer) return;
      var isAd = _videoContainer.classList.contains('ad-showing') ||
                 _videoContainer.classList.contains('ad-interrupting') ||
                 !!_videoContainer.querySelector('.ytp-ad-player-overlay');
      if (_overlayElement) {
        if (isAd) {
          _overlayElement.classList.add('ysc-hidden');
        } else {
          _overlayElement.classList.remove('ysc-hidden');
        }
      }
      if (_controlsElement) {
        if (isAd) {
          _controlsElement.classList.remove('ysc-controls-visible');
        }
      }
    }, 1000);
  }

  function attach(video) {
    if (!video) return;
    injectStyles();
    _videoContainer = findVideoContainer(video);
    ensureRelativePosition(_videoContainer);

    if (_settings.enabled) {
      var overlay = createOverlay();
      _videoContainer.appendChild(overlay);
    }
    if (_settings.controlsEnabled) {
      var controls = createControls();
      _videoContainer.appendChild(controls);
      adjustControlsPosition();
    }
    startAdDetection();
  }

  function showSpeed(speed, persist) {
    _currentSpeed = speed;
    var text = formatSpeed(speed);
    if (_overlayElement) {
      _overlayElement.textContent = text;
      _overlayElement.classList.remove('ysc-flash', 'ysc-visible', 'ysc-persist');
      void _overlayElement.offsetWidth;
      if (speed !== 1.0) {
        if (_fadeTimer) clearTimeout(_fadeTimer);
        _overlayElement.classList.add('ysc-persist');
        _fadeTimer = setTimeout(function () {
          if (_overlayElement) {
            _overlayElement.classList.remove('ysc-persist');
            _overlayElement.classList.add('ysc-flash');
          }
        }, 3000);
      } else if (persist) {
        _overlayElement.classList.add('ysc-flash');
      }
    }
    if (_controlsElement) {
      var speedEl = _controlsElement.querySelector('.ysc-ctrl-speed');
      if (speedEl) speedEl.textContent = text;
    }
  }

  function showControls(visible) {
    if (_controlsElement) {
      if (visible) _controlsElement.classList.add('ysc-controls-visible');
      else _controlsElement.classList.remove('ysc-controls-visible');
    }
  }

  function updateSettings(newSettings) {
    Object.assign(_settings, newSettings);
    if (_overlayElement) {
      _overlayElement.style.setProperty('--ysc-opacity', _settings.opacity);
      updatePositionClass(_overlayElement);
    }
    if (_controlsElement) {
      _controlsElement.style.setProperty('--ysc-opacity', _settings.opacity);
      updatePositionClass(_controlsElement);
      adjustControlsPosition();
    }
    if (!_settings.enabled) removeOverlay();
    if (!_settings.controlsEnabled) removeControls();
  }

  function onSpeedChange(callback) { _onSpeedChange = callback; }

  function isAttached() {
    return !!document.getElementById(OVERLAY_ID) || !!document.getElementById(CONTROLS_ID);
  }

  return {
    attach: attach, removeAll: removeAll, showSpeed: showSpeed,
    showControls: showControls, updateSettings: updateSettings,
    onSpeedChange: onSpeedChange, isAttached: isAttached, formatSpeed: formatSpeed
  };
})();