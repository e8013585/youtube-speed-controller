var DEFAULT_SETTINGS = {
  currentSpeed: 1.0,
  defaultSpeed: 1.0,
  quickSpeeds: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 3.0],
  speedStep: 0.25,
  overlayEnabled: true,
  overlayPosition: 'top-right',
  overlayOpacity: 0.85,
  theme: 'dark',
  keyboardEnabled: true,
  keyIncrease: 'BracketRight',
  keyDecrease: 'BracketLeft',
  overlayControlsEnabled: false,
  language: 'en'
};

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.storage.sync.set(DEFAULT_SETTINGS, function () {
      if (chrome.runtime.lastError) chrome.storage.local.set(DEFAULT_SETTINGS);
    });
  } else if (details.reason === 'update') {
    chrome.storage.sync.get(null, function (existing) {
      if (chrome.runtime.lastError) existing = {};
      var charToCode = { '[': 'BracketLeft', ']': 'BracketRight', '{': 'BracketLeft', '}': 'BracketRight' };
      ['keyIncrease', 'keyDecrease'].forEach(function (key) {
        if (existing[key]) {
          var parts = existing[key].split('+');
          var changed = false;
          var migrated = parts.map(function (p) {
            if (['Ctrl', 'Alt', 'Shift', 'Meta'].indexOf(p) !== -1) return p;
            if (charToCode[p]) { changed = true; return charToCode[p]; }
            if (p.length === 1 && p.match(/[a-zA-Z]/)) { changed = true; return 'Key' + p.toUpperCase(); }
            return p;
          });
          if (changed) existing[key] = migrated.join('+');
        }
      });
      var merged = Object.assign({}, DEFAULT_SETTINGS, existing);
      chrome.storage.sync.set(merged, function () {
        if (chrome.runtime.lastError) chrome.storage.local.set(merged);
      });
    });
  }

  chrome.tabs.query({ url: 'https://www.youtube.com/*' }, function (tabs) {
    tabs.forEach(function (tab) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['utils/storage.js', 'utils/i18n.js', 'content/observer.js', 'content/overlay.js', 'content/content.js']
      }).catch(function () {});
    });
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.target === 'background') {
    switch (message.action) {
      case 'getActiveTab':
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          sendResponse({ tab: tabs[0] || null });
        });
        return true;
      case 'sendToContent':
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, message.data, function (response) {
              sendResponse(chrome.runtime.lastError ? { error: 'Content script not available' } : response);
            });
          } else { sendResponse({ error: 'No active tab' }); }
        });
        return true;
      default:
        sendResponse({ error: 'Unknown action' });
    }
  }
  return false;
});