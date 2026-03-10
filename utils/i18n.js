var I18n = (function () {
  'use strict';

  var SUPPORTED_LOCALES = [
    { code: 'en',    name: 'English',              nativeName: 'English' },
    { code: 'de',    name: 'German',               nativeName: 'Deutsch' },
    { code: 'fr',    name: 'French',               nativeName: 'Français' },
    { code: 'es',    name: 'Spanish',              nativeName: 'Español' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)',   nativeName: 'Português (Brasil)' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)' },
    { code: 'it',    name: 'Italian',              nativeName: 'Italiano' },
    { code: 'nl',    name: 'Dutch',                nativeName: 'Nederlands' },
    { code: 'ca',    name: 'Catalan',              nativeName: 'Català' },
    { code: 'da',    name: 'Danish',               nativeName: 'Dansk' },
    { code: 'nb',    name: 'Norwegian',            nativeName: 'Norsk' },
    { code: 'sv',    name: 'Swedish',              nativeName: 'Svenska' },
    { code: 'fi',    name: 'Finnish',              nativeName: 'Suomi' },
    { code: 'et',    name: 'Estonian',             nativeName: 'Eesti' },
    { code: 'lv',    name: 'Latvian',              nativeName: 'Latviešu' },
    { code: 'lt',    name: 'Lithuanian',           nativeName: 'Lietuvių' },
    { code: 'pl',    name: 'Polish',               nativeName: 'Polski' },
    { code: 'cs',    name: 'Czech',                nativeName: 'Čeština' },
    { code: 'sk',    name: 'Slovak',               nativeName: 'Slovenčina' },
    { code: 'sl',    name: 'Slovenian',            nativeName: 'Slovenščina' },
    { code: 'hr',    name: 'Croatian',             nativeName: 'Hrvatski' },
    { code: 'hu',    name: 'Hungarian',            nativeName: 'Magyar' },
    { code: 'ro',    name: 'Romanian',             nativeName: 'Română' },
    { code: 'tr',    name: 'Turkish',              nativeName: 'Türkçe' },
    { code: 'uz',    name: 'Uzbek',                nativeName: "O'zbek" },
    { code: 'tk',    name: 'Turkmen',              nativeName: 'Türkmen' },
    { code: 'tt',    name: 'Tatar',                nativeName: 'Татар' },
    { code: 'id',    name: 'Indonesian',           nativeName: 'Indonesia' },
    { code: 'ms',    name: 'Malay',                nativeName: 'Melayu' },
    { code: 'fil',   name: 'Filipino',             nativeName: 'Filipino' },
    { code: 'vi',    name: 'Vietnamese',           nativeName: 'Tiếng Việt' },
    { code: 'sw',    name: 'Swahili',              nativeName: 'Kiswahili' },
    { code: 'ru',    name: 'Russian',              nativeName: 'Русский' },
    { code: 'uk',    name: 'Ukrainian',            nativeName: 'Українська' },
    { code: 'bg',    name: 'Bulgarian',            nativeName: 'Български' },
    { code: 'sr',    name: 'Serbian',              nativeName: 'Српски' },
    { code: 'el',    name: 'Greek',                nativeName: 'Ελληνικά' },
    { code: 'he',    name: 'Hebrew',               nativeName: 'עברית',    dir: 'rtl' },
    { code: 'ar',    name: 'Arabic',               nativeName: 'العربية',   dir: 'rtl' },
    { code: 'fa',    name: 'Persian',              nativeName: 'فارسی',    dir: 'rtl' },
    { code: 'hi',    name: 'Hindi',                nativeName: 'हिन्दी' },
    { code: 'mr',    name: 'Marathi',              nativeName: 'मराठी' },
    { code: 'bn',    name: 'Bengali',              nativeName: 'বাংলা' },
    { code: 'gu',    name: 'Gujarati',             nativeName: 'ગુજરાતી' },
    { code: 'ta',    name: 'Tamil',                nativeName: 'தமிழ்' },
    { code: 'te',    name: 'Telugu',               nativeName: 'తెలుగు' },
    { code: 'kn',    name: 'Kannada',              nativeName: 'ಕನ್ನಡ' },
    { code: 'ml',    name: 'Malayalam',            nativeName: 'മലയാളം' },
    { code: 'th',    name: 'Thai',                 nativeName: 'ไทย' },
    { code: 'am',    name: 'Amharic',              nativeName: 'አማርኛ' },
    { code: 'zh-CN', name: 'Chinese (Simplified)',  nativeName: '中文（中国）' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文（台灣）' },
    { code: 'ja',    name: 'Japanese',             nativeName: '日本語' },
    { code: 'ko',    name: 'Korean',               nativeName: '한국어' }
  ];

  var FALLBACK = {
    extName: 'YouTube Speed Controller',
    extDescription: 'Control YouTube playback speed with custom values, keyboard shortcuts, and on-screen overlay.',
    popupTitle: 'Speed Controller',
    currentSpeed: 'Current Speed',
    quickSpeeds: 'Quick Speeds',
    customSpeed: 'Custom Speed',
    customSpeedPlaceholder: 'e.g., 1.85',
    applyBtn: 'Apply',
    resetBtn: 'Reset',
    settingsBtn: 'Settings',
    connecting: 'Connecting...',
    connected: 'Connected to YouTube',
    notOnYouTube: 'Not on YouTube',
    invalidNumber: 'Invalid number',
    speedRange: 'Speed must be between $1 and $2',
    speedSetTo: 'Speed set to $1x',
    enterSpeed: 'Please enter a speed value',
    decreaseSpeed: 'Decrease speed',
    increaseSpeed: 'Increase speed',
    resetToDefault: 'Reset to 1.0x',
    optionsTitle: 'YouTube Speed Controller',
    optionsSubtitle: 'Customize your playback experience',
    speedSettings: 'Speed Settings',
    defaultSpeedLabel: 'Default Speed',
    defaultSpeedDesc: 'Speed applied when you start watching',
    speedStepLabel: 'Speed Step',
    speedStepDesc: 'Amount to increase/decrease per step',
    quickSpeedPresetsLabel: 'Quick Speed Presets',
    quickSpeedPresetsDesc: 'Comma-separated list of preset speeds',
    quickSpeedExample: 'Example: 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0',
    overlaySettings: 'Overlay Settings',
    speedOverlayLabel: 'Speed Overlay',
    speedOverlayDesc: 'Show speed indicator on video',
    overlayControlsLabel: 'Overlay Controls',
    overlayControlsDesc: 'Show mini speed buttons on video',
    overlayPositionLabel: 'Overlay Position',
    overlayPositionDesc: 'Where to display the speed indicator',
    posTopLeft: 'Top Left',
    posTopRight: 'Top Right',
    posBottomLeft: 'Bottom Left',
    posBottomRight: 'Bottom Right',
    overlayOpacityLabel: 'Overlay Opacity',
    overlayOpacityDesc: 'Transparency of the overlay',
    keyboardSettings: 'Keyboard Shortcuts',
    enableShortcutsLabel: 'Enable Shortcuts',
    enableShortcutsDesc: 'Use keyboard to control speed',
    increaseShortcutLabel: 'Increase Speed',
    increaseShortcutDesc: 'Shortcut to speed up',
    decreaseShortcutLabel: 'Decrease Speed',
    decreaseShortcutDesc: 'Shortcut to slow down',
    pressKeys: 'Press keys...',
    appearanceSettings: 'Appearance',
    themeLabel: 'Theme',
    themeDesc: 'Popup color scheme',
    themeDark: 'Dark',
    themeLight: 'Light',
    languageLabel: 'Language',
    languageDesc: 'Extension display language',
    saveBtn: 'Save Settings',
    resetDefaultsBtn: 'Reset to Defaults',
    settingsSaved: 'Settings saved successfully!',
    settingsReset: 'Settings reset to defaults',
    saveFailed: 'Failed to save settings',
    resetFailed: 'Failed to reset settings',
    resetConfirm: 'Reset all settings to defaults? This cannot be undone.',
    validationDefaultSpeed: 'Default speed must be between $1 and $2',
    validationSpeedStep: 'Speed step must be between 0.05 and 5',
    validationQuickSpeeds: 'At least one valid quick speed is required'
  };

  var _currentLocale = 'en';
  var _loadedMessages = null;
  var _localeCache = {};

  function get(key, substitutions) {
    var result = _loadedMessages ? _loadedMessages[key] : null;
    if (!result) result = FALLBACK[key];
    if (!result) return key;
    if (substitutions) {
      var subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      for (var i = 0; i < subs.length; i++) {
        result = result.replace('$' + (i + 1), subs[i]);
      }
    }
    return result;
  }

  function translatePage(root) {
    var container = root || document;
    var elements = container.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      var subsStr = el.getAttribute('data-i18n-subs');
      var subs = subsStr ? subsStr.split(',') : undefined;
      var translated = get(key, subs);
      if (attr) { el.setAttribute(attr, translated); }
      else { el.textContent = translated; }
    }
    var localeInfo = getLocaleInfo(_currentLocale);
    if (localeInfo && localeInfo.dir === 'rtl') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  }

  function loadLocale(locale) {
    return new Promise(function (resolve) {
      if (locale === 'en') {
        _currentLocale = 'en';
        _loadedMessages = null;
        resolve(true);
        return;
      }
      if (_localeCache[locale]) {
        _currentLocale = locale;
        _loadedMessages = _localeCache[locale];
        resolve(true);
        return;
      }
      var url = chrome.runtime.getURL('locales/' + locale + '.json');
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (messages) {
        _localeCache[locale] = messages;
        _loadedMessages = messages;
        _currentLocale = locale;
        resolve(true);
      }).catch(function () {
        if (!_loadedMessages) _currentLocale = 'en';
        resolve(false);
      });
    });
  }

  function getLocaleInfo(code) {
    for (var i = 0; i < SUPPORTED_LOCALES.length; i++) {
      if (SUPPORTED_LOCALES[i].code === code) return SUPPORTED_LOCALES[i];
    }
    return null;
  }

  function getCurrentLocale() { return _currentLocale; }

  function getUILocale() {
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
        return chrome.i18n.getUILanguage().split('-')[0];
      }
    } catch (e) {}
    return 'en';
  }

  function getSupportedLocales() { return SUPPORTED_LOCALES.slice(); }
  function isSupported(code) { return !!getLocaleInfo(code); }

  function initialize() {
    return StorageUtil.get('language').then(function (result) {
      var lang = result.language;
      if (!lang) {
        lang = getUILocale();
      }
      if (!isSupported(lang)) lang = 'en';
      return loadLocale(lang);
    });
  }

  return {
    get: get, translatePage: translatePage, loadLocale: loadLocale,
    getCurrentLocale: getCurrentLocale, getLocaleInfo: getLocaleInfo,
    getUILocale: getUILocale, getSupportedLocales: getSupportedLocales,
    isSupported: isSupported, initialize: initialize,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES, FALLBACK: FALLBACK
  };
})();