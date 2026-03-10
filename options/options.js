(function () {
  'use strict';

  var els = {
    toastContainer: document.getElementById('toastContainer'),
    body: document.body,
    defaultSpeed: document.getElementById('defaultSpeed'),
    speedStep: document.getElementById('speedStep'),
    quickSpeeds: document.getElementById('quickSpeeds'),
    overlayEnabled: document.getElementById('overlayEnabled'),
    overlayControlsEnabled: document.getElementById('overlayControlsEnabled'),
    overlayPosition: document.getElementById('overlayPosition'),
    overlayOpacity: document.getElementById('overlayOpacity'),
    opacityValue: document.getElementById('opacityValue'),
    keyboardEnabled: document.getElementById('keyboardEnabled'),
    keyIncreaseBtn: document.getElementById('keyIncreaseBtn'),
    keyDecreaseBtn: document.getElementById('keyDecreaseBtn'),
    theme: document.getElementById('theme'),
    language: document.getElementById('language'),
    saveBtn: document.getElementById('saveBtn'),
    resetBtn: document.getElementById('resetBtn'),
    shortcutRow1: document.getElementById('shortcutRow1'),
    shortcutRow2: document.getElementById('shortcutRow2')
  };

  var currentSettings = {}, recordingKey = null, toastIdCounter = 0;

  var CODE_LABELS = {
    BracketLeft:'[', BracketRight:']', Backslash:'\\', Semicolon:';', Quote:"'",
    Comma:',', Period:'.', Slash:'/', Backquote:'`', Minus:'-', Equal:'=',
    Space:'Space', Enter:'Enter', Backspace:'Backspace', Tab:'Tab', Escape:'Esc',
    ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→',
    Delete:'Delete', Insert:'Insert', Home:'Home', End:'End', PageUp:'PageUp', PageDown:'PageDown'
  };

  function comboToDisplayLabel(combo) {
    if (!combo) return '';
    return combo.split('+').map(function (p) {
      if (['Ctrl','Alt','Shift','Meta'].indexOf(p) !== -1) return p;
      if (CODE_LABELS[p]) return CODE_LABELS[p];
      if (p.indexOf('Key') === 0 && p.length === 4) return p.charAt(3);
      if (p.indexOf('Digit') === 0 && p.length === 6) return p.charAt(5);
      if (p.indexOf('Numpad') === 0) return 'Num' + p.substring(6);
      return p;
    }).join(' + ');
  }

  function buildKeyCombo(e) {
    var parts = [];
    if (e.ctrlKey) parts.push('Ctrl'); if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift'); if (e.metaKey) parts.push('Meta');
    if (['ControlLeft','ControlRight','AltLeft','AltRight','ShiftLeft','ShiftRight','MetaLeft','MetaRight'].indexOf(e.code) === -1) parts.push(e.code);
    return parts.join('+');
  }

  function migrateOldShortcut(c) {
    if (!c || c.indexOf('Key') !== -1 || c.indexOf('Bracket') !== -1 || c.indexOf('Digit') !== -1) return c;
    var m = { '[':'BracketLeft', ']':'BracketRight', '{':'BracketLeft', '}':'BracketRight', '\\':'Backslash', ';':'Semicolon', "'":"Quote", ',':'Comma', '.':'Period', '/':'Slash', '`':'Backquote', '-':'Minus', '=':'Equal' };
    return c.split('+').map(function (p) {
      if (['Ctrl','Alt','Shift','Meta'].indexOf(p) !== -1) return p;
      if (m[p]) return m[p];
      if (p.length === 1 && p.match(/[a-zA-Z]/)) return 'Key' + p.toUpperCase();
      if (p.length === 1 && p.match(/[0-9]/)) return 'Digit' + p;
      return p;
    }).join('+');
  }

  function showToast(msg, type, dur) {
    type = type || 'info'; dur = dur || 4000;
    var id = 'toast-' + (++toastIdCounter);
    var icons = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };
    var t = document.createElement('div'); t.className = 'toast toast-' + type; t.id = id;
    var ic = document.createElement('span'); ic.className = 'toast-icon'; ic.textContent = icons[type] || 'ℹ';
    var ms = document.createElement('span'); ms.className = 'toast-message'; ms.textContent = msg;
    var cb = document.createElement('button'); cb.className = 'toast-close'; cb.textContent = '×';
    cb.addEventListener('click', function () { dismissToast(id); });
    var pr = document.createElement('div'); pr.className = 'toast-progress'; pr.style.animationDuration = dur + 'ms';
    t.appendChild(ic); t.appendChild(ms); t.appendChild(cb); t.appendChild(pr);
    els.toastContainer.appendChild(t);
    setTimeout(function () { dismissToast(id); }, dur);
  }

  function dismissToast(id) {
    var t = document.getElementById(id);
    if (!t || t.classList.contains('toast-out')) return;
    t.classList.add('toast-out');
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350);
  }

  function applyTheme(theme) {
    if (theme === 'light') { els.body.classList.add('light-theme'); els.body.classList.remove('dark-theme'); }
    else { els.body.classList.add('dark-theme'); els.body.classList.remove('light-theme'); }
  }

  async function init() {
    currentSettings = await StorageUtil.getAllSettings();
    var ns = false, mg = {};
    var mi = migrateOldShortcut(currentSettings.keyIncrease);
    if (mi !== currentSettings.keyIncrease) { currentSettings.keyIncrease = mi; mg.keyIncrease = mi; ns = true; }
    var md = migrateOldShortcut(currentSettings.keyDecrease);
    if (md !== currentSettings.keyDecrease) { currentSettings.keyDecrease = md; mg.keyDecrease = md; ns = true; }
    if (ns) await StorageUtil.set(mg);
    applyTheme(currentSettings.theme || 'dark');
    await I18n.initialize();
    buildLanguageDropdown(); populateFields(currentSettings); I18n.translatePage();
    setupEventListeners(); StorageUtil.onChange(handleStorageChange);
    var manifest = chrome.runtime.getManifest();
    var ve = document.getElementById('footerVersion');
    if (ve && manifest.version) ve.textContent = 'v' + manifest.version;
  }

  function buildLanguageDropdown() {
    els.language.innerHTML = '';
    I18n.getSupportedLocales().forEach(function (l) {
      var o = document.createElement('option'); o.value = l.code;
      o.textContent = l.nativeName + ' (' + l.name + ')';
      els.language.appendChild(o);
    });
  }

  function populateFields(s) {
    els.defaultSpeed.value = s.defaultSpeed || 1.0;
    els.speedStep.value = s.speedStep || 0.25;
    if (Array.isArray(s.quickSpeeds)) els.quickSpeeds.value = s.quickSpeeds.join(', ');
    els.overlayEnabled.checked = s.overlayEnabled !== false;
    els.overlayControlsEnabled.checked = s.overlayControlsEnabled === true;
    els.overlayPosition.value = s.overlayPosition || 'top-right';
    els.overlayOpacity.value = s.overlayOpacity || 0.85;
    els.opacityValue.textContent = Math.round((s.overlayOpacity || 0.85) * 100) + '%';
    els.keyboardEnabled.checked = s.keyboardEnabled !== false;
    var ic = s.keyIncrease || 'BracketRight';
    els.keyIncreaseBtn.textContent = comboToDisplayLabel(ic); els.keyIncreaseBtn.dataset.combo = ic;
    var dc = s.keyDecrease || 'BracketLeft';
    els.keyDecreaseBtn.textContent = comboToDisplayLabel(dc); els.keyDecreaseBtn.dataset.combo = dc;
    els.theme.value = s.theme || 'dark'; els.language.value = s.language || 'en';
    updateShortcutVisibility();
  }

  function updateShortcutVisibility() {
    var e = els.keyboardEnabled.checked;
    els.shortcutRow1.style.opacity = e ? '1' : '0.4'; els.shortcutRow1.style.pointerEvents = e ? 'auto' : 'none';
    els.shortcutRow2.style.opacity = e ? '1' : '0.4'; els.shortcutRow2.style.pointerEvents = e ? 'auto' : 'none';
  }

  function setupEventListeners() {
    els.overlayOpacity.addEventListener('input', function () { els.opacityValue.textContent = Math.round(this.value * 100) + '%'; });
    els.keyboardEnabled.addEventListener('change', updateShortcutVisibility);
    els.keyIncreaseBtn.addEventListener('click', function () { startRecording('keyIncrease', this); });
    els.keyDecreaseBtn.addEventListener('click', function () { startRecording('keyDecrease', this); });
    document.addEventListener('keydown', handleShortcutRecording, true);
    document.addEventListener('click', function (e) { if (recordingKey && e.target !== recordingKey.button) cancelRecording(); });
    els.theme.addEventListener('change', function () { applyTheme(els.theme.value); });
    els.language.addEventListener('change', function () {
      I18n.loadLocale(els.language.value).then(function () {
        I18n.translatePage();
        els.keyIncreaseBtn.textContent = comboToDisplayLabel(els.keyIncreaseBtn.dataset.combo);
        els.keyDecreaseBtn.textContent = comboToDisplayLabel(els.keyDecreaseBtn.dataset.combo);
      });
    });
    els.saveBtn.addEventListener('click', saveSettings);
    els.resetBtn.addEventListener('click', resetSettings);
  }

  function startRecording(key, btn) {
    stopRecording();
    recordingKey = { key: key, button: btn, originalText: btn.textContent, originalCombo: btn.dataset.combo };
    btn.classList.add('recording'); btn.textContent = I18n.get('pressKeys');
  }
  function stopRecording() { if (recordingKey) { recordingKey.button.classList.remove('recording'); recordingKey = null; } }
  function cancelRecording() { if (recordingKey) { recordingKey.button.classList.remove('recording'); recordingKey.button.textContent = recordingKey.originalText; recordingKey.button.dataset.combo = recordingKey.originalCombo; recordingKey = null; } }

  function handleShortcutRecording(e) {
    if (!recordingKey) return; e.preventDefault(); e.stopPropagation();
    if (['ControlLeft','ControlRight','AltLeft','AltRight','ShiftLeft','ShiftRight','MetaLeft','MetaRight'].indexOf(e.code) !== -1) return;
    if (e.code === 'Escape') { cancelRecording(); return; }
    var combo = buildKeyCombo(e);
    recordingKey.button.textContent = comboToDisplayLabel(combo);
    recordingKey.button.dataset.combo = combo;
    recordingKey.button.classList.remove('recording'); recordingKey = null;
  }

  function parseQuickSpeeds(input) {
    return input.split(',').map(function (s) { return parseFloat(s.trim()); })
      .filter(function (n) { return !isNaN(n) && n >= StorageUtil.MIN_SPEED && n <= StorageUtil.MAX_SPEED; })
      .sort(function (a, b) { return a - b; });
  }

  function validateSettings() {
    var errs = [];
    var ds = parseFloat(els.defaultSpeed.value);
    if (isNaN(ds) || !StorageUtil.isValidSpeed(ds)) errs.push(I18n.get('validationDefaultSpeed', [String(StorageUtil.MIN_SPEED), String(StorageUtil.MAX_SPEED)]));
    var ss = parseFloat(els.speedStep.value);
    if (isNaN(ss) || ss < 0.05 || ss > 5) errs.push(I18n.get('validationSpeedStep'));
    var qs = parseQuickSpeeds(els.quickSpeeds.value);
    if (qs.length === 0) errs.push(I18n.get('validationQuickSpeeds'));
    if (errs.length > 0) { errs.forEach(function (e) { showToast(e, 'error', 5000); }); return null; }
    return {
      defaultSpeed: StorageUtil.clampSpeed(ds), speedStep: ss, quickSpeeds: qs,
      overlayEnabled: els.overlayEnabled.checked, overlayControlsEnabled: els.overlayControlsEnabled.checked,
      overlayPosition: els.overlayPosition.value, overlayOpacity: parseFloat(els.overlayOpacity.value),
      keyboardEnabled: els.keyboardEnabled.checked,
      keyIncrease: els.keyIncreaseBtn.dataset.combo || 'BracketRight',
      keyDecrease: els.keyDecreaseBtn.dataset.combo || 'BracketLeft',
      theme: els.theme.value, language: els.language.value
    };
  }

  async function saveSettings() {
    stopRecording(); var s = validateSettings(); if (!s) return;
    try { await StorageUtil.set(s); currentSettings = Object.assign(currentSettings, s); applyTheme(s.theme); showToast(I18n.get('settingsSaved'), 'success'); }
    catch (e) { showToast(I18n.get('saveFailed'), 'error'); }
  }

  async function resetSettings() {
    stopRecording(); if (!confirm(I18n.get('resetConfirm'))) return;
    try {
      await StorageUtil.resetToDefaults();
      currentSettings = Object.assign({}, StorageUtil.DEFAULT_SETTINGS);
      currentSettings.keyIncrease = migrateOldShortcut(currentSettings.keyIncrease);
      currentSettings.keyDecrease = migrateOldShortcut(currentSettings.keyDecrease);
      applyTheme(currentSettings.theme || 'dark');
      await I18n.loadLocale(currentSettings.language || 'en');
      buildLanguageDropdown(); populateFields(currentSettings); I18n.translatePage();
      showToast(I18n.get('settingsReset'), 'success');
    } catch (e) { showToast(I18n.get('resetFailed'), 'error'); }
  }

  function handleStorageChange(changes) {
    if (changes.theme) { els.theme.value = changes.theme.newValue; applyTheme(changes.theme.newValue); }
    if (changes.language) { els.language.value = changes.language.newValue; I18n.loadLocale(changes.language.newValue).then(function () { I18n.translatePage(); }); }
  }

  init();
})();