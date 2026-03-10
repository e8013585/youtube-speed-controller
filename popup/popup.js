(function () {
  'use strict';

  var elements = {
    body: document.body,
    container: document.getElementById('popupContainer'),
    toastContainer: document.getElementById('toastContainer'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    speedValue: document.getElementById('speedValue'),
    speedSlider: document.getElementById('speedSlider'),
    decreaseBtn: document.getElementById('decreaseBtn'),
    increaseBtn: document.getElementById('increaseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    quickButtons: document.getElementById('quickButtons'),
    customSpeedInput: document.getElementById('customSpeedInput'),
    applyCustomBtn: document.getElementById('applyCustomBtn'),
    optionsBtn: document.getElementById('optionsBtn')
  };

  var currentSpeed = 1.0, settings = {}, contentScriptReady = false, toastIdCounter = 0;

  function showToast(message, type, duration) {
    type = type || 'info'; duration = duration || 3000;
    var id = 'toast-' + (++toastIdCounter);
    var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type; toast.id = id;
    var iconSpan = document.createElement('span'); iconSpan.className = 'toast-icon'; iconSpan.textContent = icons[type] || 'ℹ';
    var msgSpan = document.createElement('span'); msgSpan.className = 'toast-message'; msgSpan.textContent = message;
    var closeBtn = document.createElement('button'); closeBtn.className = 'toast-close'; closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function () { dismissToast(id); });
    toast.appendChild(iconSpan); toast.appendChild(msgSpan); toast.appendChild(closeBtn);
    elements.toastContainer.appendChild(toast);
    setTimeout(function () { dismissToast(id); }, duration);
  }

  function dismissToast(id) {
    var toast = document.getElementById(id);
    if (!toast || toast.classList.contains('toast-out')) return;
    toast.classList.add('toast-out');
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }

  function applyTheme(theme) {
    if (theme === 'light') { elements.body.classList.add('light-theme'); elements.body.classList.remove('dark-theme'); }
    else { elements.body.classList.add('dark-theme'); elements.body.classList.remove('light-theme'); }
  }

  async function init() {
    settings = await StorageUtil.getAllSettings();
    currentSpeed = settings.currentSpeed || 1.0;
    applyTheme(settings.theme || 'dark');
    await I18n.initialize(); I18n.translatePage();
    buildQuickButtons(settings.quickSpeeds);
    updateSpeedDisplay(currentSpeed);
    await checkContentScript();
    setupEventListeners();
    StorageUtil.onChange(handleStorageChange);
  }

  async function checkContentScript() {
    try {
      var response = await sendToContent({ action: 'getStatus' });
      if (response && !response.error) {
        contentScriptReady = true;
        currentSpeed = response.speed || currentSpeed;
        updateSpeedDisplay(currentSpeed);
        setStatus('active', I18n.get('connected'));
        elements.container.classList.remove('disabled');
      } else {
        setStatus('error', I18n.get('notOnYouTube'));
        elements.container.classList.add('disabled');
      }
    } catch (e) {
      setStatus('error', I18n.get('notOnYouTube'));
      elements.container.classList.add('disabled');
    }
  }

  function sendToContent(data) {
    return new Promise(function (resolve) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs[0]) { resolve({ error: 'No active tab' }); return; }
        if (!tabs[0].url || tabs[0].url.indexOf('youtube.com') === -1) { resolve({ error: 'Not YouTube' }); return; }
        chrome.tabs.sendMessage(tabs[0].id, data, function (response) {
          resolve(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : (response || {}));
        });
      });
    });
  }

  function setStatus(type, text) {
    elements.statusDot.className = 'status-dot';
    if (type === 'active') elements.statusDot.classList.add('active');
    else if (type === 'error') elements.statusDot.classList.add('error');
    elements.statusText.textContent = text;
  }

  function updateSpeedDisplay(speed) {
    var rounded = Math.round(speed * 100) / 100;
    var d = rounded === Math.floor(rounded) ? rounded.toFixed(1) + 'x' : (Math.round(rounded * 10) === rounded * 10 ? rounded.toFixed(1) + 'x' : rounded.toFixed(2) + 'x');
    elements.speedValue.textContent = d; elements.speedSlider.value = speed;
    elements.speedValue.classList.add('bump');
    setTimeout(function () { elements.speedValue.classList.remove('bump'); }, 150);
    updateActiveQuickButton(speed);
  }

  function buildQuickButtons(speeds) {
    elements.quickButtons.innerHTML = '';
    speeds.forEach(function (speed) {
      var btn = document.createElement('button'); btn.className = 'quick-btn';
      btn.textContent = speed + 'x'; btn.dataset.speed = speed;
      btn.addEventListener('click', function () { setSpeed(speed); });
      elements.quickButtons.appendChild(btn);
    });
    updateActiveQuickButton(currentSpeed);
  }

  function updateActiveQuickButton(speed) {
    elements.quickButtons.querySelectorAll('.quick-btn').forEach(function (btn) {
      btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.speed) - speed) < 0.001);
    });
  }

  async function setSpeed(speed) {
    var clamped = StorageUtil.clampSpeed(speed); currentSpeed = clamped; updateSpeedDisplay(clamped);
    if (contentScriptReady) await sendToContent({ action: 'setSpeed', speed: clamped });
    await StorageUtil.set({ currentSpeed: clamped });
  }

  function setupEventListeners() {
    elements.speedSlider.addEventListener('input', function () { currentSpeed = StorageUtil.clampSpeed(parseFloat(this.value)); updateSpeedDisplay(currentSpeed); });
    elements.speedSlider.addEventListener('change', function () { setSpeed(parseFloat(this.value)); });
    elements.decreaseBtn.addEventListener('click', function () { setSpeed(currentSpeed - (settings.speedStep || 0.25)); });
    elements.increaseBtn.addEventListener('click', function () { setSpeed(currentSpeed + (settings.speedStep || 0.25)); });
    elements.resetBtn.addEventListener('click', function () { setSpeed(1.0); });
    elements.applyCustomBtn.addEventListener('click', applyCustomSpeed);
    elements.customSpeedInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') applyCustomSpeed(); });
    elements.optionsBtn.addEventListener('click', function () { chrome.runtime.openOptionsPage(); });
  }

  function applyCustomSpeed() {
    var value = elements.customSpeedInput.value.trim();
    if (!value) { showToast(I18n.get('enterSpeed'), 'warning'); return; }
    var speed = parseFloat(value);
    if (isNaN(speed)) { showToast(I18n.get('invalidNumber'), 'error'); return; }
    if (!StorageUtil.isValidSpeed(speed)) { showToast(I18n.get('speedRange', [String(StorageUtil.MIN_SPEED), String(StorageUtil.MAX_SPEED)]), 'error'); return; }
    var clamped = StorageUtil.clampSpeed(speed); setSpeed(clamped);
    elements.customSpeedInput.value = '';
    showToast(I18n.get('speedSetTo', [String(clamped)]), 'success');
  }

  function handleStorageChange(changes) {
    if (changes.currentSpeed && changes.currentSpeed.newValue !== undefined) { currentSpeed = changes.currentSpeed.newValue; updateSpeedDisplay(currentSpeed); }
    if (changes.quickSpeeds) buildQuickButtons(changes.quickSpeeds.newValue);
    if (changes.theme) applyTheme(changes.theme.newValue);
    if (changes.speedStep) settings.speedStep = changes.speedStep.newValue;
    if (changes.language) { I18n.loadLocale(changes.language.newValue).then(function () { I18n.translatePage(); if (contentScriptReady) setStatus('active', I18n.get('connected')); else setStatus('error', I18n.get('notOnYouTube')); }); }
  }

  init();
})();