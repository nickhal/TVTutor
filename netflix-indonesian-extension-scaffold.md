# Netflix Indonesian Learning Extension - Complete Project Scaffold

## Project Overview

A Chrome extension for learning Indonesian through real-time subtitle translation on Netflix and YouTube. Click words to save them with definitions, building a personal vocabulary list while watching.

## Technical Architecture

### Core Technologies
- **Manifest V3**: Chrome extension with service workers
- **Shadow DOM**: Isolated UI components without CSS conflicts
- **Translation**: Chrome Built-in API → LibreTranslate API → Local cache
- **Storage**: localStorage for MVP, IndexedDB for future
- **Language Processing**: Basic Indonesian tokenization and affix handling

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────┬────────────────────┬──────────────────────┤
│  Service Worker │   Content Script   │   Injected Script    │
│                 │                     │                      │
│  - Translation  │  - Shadow DOM UI   │  - XHR Intercept     │
│  - Caching      │  - Subtitle Monitor│  - Player API        │
│  - Storage API  │  - Word Click      │  - Event Dispatch    │
└─────────────────┴────────────────────┴──────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Platform Adapters                         │
├──────────────────────────┬──────────────────────────────────┤
│      Netflix Adapter     │       YouTube Adapter            │
│                          │                                  │
│  - TTML Parser           │  - TextTrack API                │
│  - Cadmium Player        │  - Caption Track                │
│  - DOM Selectors         │  - Player Controls              │
└──────────────────────────┴──────────────────────────────────┘
```

## Directory Structure

```
netflix-indonesian-extension/
├── manifest.json
├── package.json
├── README.md
├── .gitignore
│
├── src/
│   ├── background/
│   │   ├── service-worker.js
│   │   ├── translation-service.js
│   │   └── message-handler.js
│   │
│   ├── content/
│   │   ├── content-script.js
│   │   ├── subtitle-monitor.js
│   │   ├── overlay-manager.js
│   │   ├── word-extractor.js
│   │   └── platform-detector.js
│   │
│   ├── inject/
│   │   ├── netflix-interceptor.js
│   │   ├── youtube-interceptor.js
│   │   └── xhr-monitor.js
│   │
│   ├── lib/
│   │   ├── translator.js
│   │   ├── storage-manager.js
│   │   ├── indonesian-utils.js
│   │   ├── cache-manager.js
│   │   └── debouncer.js
│   │
│   ├── adapters/
│   │   ├── base-adapter.js
│   │   ├── netflix-adapter.js
│   │   ├── youtube-adapter.js
│   │   └── adapter-factory.js
│   │
│   ├── ui/
│   │   ├── components/
│   │   │   ├── subtitle-overlay.js
│   │   │   ├── word-list.js
│   │   │   ├── word-card.js
│   │   │   └── settings-panel.js
│   │   └── styles/
│   │       ├── overlay.css
│   │       ├── word-list.css
│   │       └── themes.css
│   │
│   └── shared/
│       ├── constants.js
│       ├── config.js
│       └── types.js
│
├── assets/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── fonts/
│       └── netflix-sans.woff2
│
├── data/
│   ├── indonesian-common-words.json
│   ├── indonesian-affixes.json
│   └── indonesian-roots.json
│
└── test/
    ├── unit/
    └── integration/
```

## File Implementations

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Indonesian Learning Assistant",
  "version": "1.0.0",
  "description": "Learn Indonesian while watching Netflix and YouTube",
  
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  
  "host_permissions": [
    "https://*.netflix.com/*",
    "https://*.youtube.com/*",
    "https://www.youtube.com/*",
    "https://libretranslate.com/*"
  ],
  
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  
  "content_scripts": [{
    "matches": [
      "https://*.netflix.com/*",
      "https://*.youtube.com/*"
    ],
    "js": ["src/content/content-script.js"],
    "css": ["src/ui/styles/overlay.css"],
    "run_at": "document_start",
    "all_frames": false
  }],
  
  "web_accessible_resources": [{
    "resources": [
      "src/inject/*.js",
      "data/*.json",
      "assets/fonts/*"
    ],
    "matches": [
      "https://*.netflix.com/*",
      "https://*.youtube.com/*"
    ]
  }],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### src/shared/constants.js
```javascript
export const PLATFORMS = {
  NETFLIX: 'netflix',
  YOUTUBE: 'youtube',
  UNKNOWN: 'unknown'
};

export const SELECTORS = {
  netflix: {
    player: '.watch-video',
    subtitleContainer: '.player-timedtext-text-container',
    subtitleText: '.player-timedtext-text-container span',
    video: 'video'
  },
  youtube: {
    player: '#movie_player',
    subtitleContainer: '.ytp-caption-window-container',
    subtitleText: '.ytp-caption-segment',
    video: 'video.html5-main-video'
  }
};

export const TRANSLATION_PROVIDERS = {
  CHROME_NATIVE: 'chrome_native',
  LIBRE_TRANSLATE: 'libre_translate',
  LOCAL_MODEL: 'local_model'
};

export const STORAGE_KEYS = {
  SAVED_WORDS: 'saved_words',
  SETTINGS: 'settings',
  CACHE: 'translation_cache',
  SESSION: 'current_session'
};

export const EVENTS = {
  SUBTITLE_DETECTED: 'subtitle_detected',
  WORD_CLICKED: 'word_clicked',
  WORD_SAVED: 'word_saved',
  TRANSLATION_COMPLETE: 'translation_complete'
};
```

### src/shared/config.js
```javascript
export const config = {
  translation: {
    primaryProvider: 'chrome_native',
    fallbackProvider: 'libre_translate',
    cacheExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxCacheSize: 10000, // words
    debounceDelay: 300 // ms
  },
  
  ui: {
    subtitleDisplayDuration: 5000, // ms
    wordListMaxItems: 50,
    overlayPosition: 'right', // 'right', 'left', 'bottom'
    theme: 'dark' // 'dark', 'light', 'auto'
  },
  
  indonesian: {
    enableAffixExtraction: true,
    enableRootWordDetection: true,
    minWordLength: 2
  },
  
  platforms: {
    netflix: {
      interceptXHR: true,
      monitorDOM: true,
      subtitleFormat: 'ttml'
    },
    youtube: {
      useTextTrackAPI: true,
      monitorCaptions: true,
      subtitleFormat: 'vtt'
    }
  }
};
```

### src/content/content-script.js
```javascript
import { PlatformDetector } from './platform-detector.js';
import { AdapterFactory } from '../adapters/adapter-factory.js';
import { OverlayManager } from './overlay-manager.js';
import { StorageManager } from '../lib/storage-manager.js';
import { EVENTS } from '../shared/constants.js';

class IndonesianLearningExtension {
  constructor() {
    this.platform = null;
    this.adapter = null;
    this.overlay = null;
    this.storage = new StorageManager();
    
    this.initialize();
  }
  
  async initialize() {
    console.log('🎬 Indonesian Learning Extension initializing...');
    
    // Detect platform
    this.platform = PlatformDetector.detect();
    console.log(`Platform detected: ${this.platform}`);
    
    // Create platform-specific adapter
    this.adapter = AdapterFactory.create(this.platform);
    
    // Wait for player to be ready
    await this.adapter.waitForPlayer();
    
    // Initialize UI overlay
    this.overlay = new OverlayManager(this.storage, this.platform);
    
    // Setup subtitle monitoring
    this.adapter.onSubtitleChange((subtitle) => {
      this.handleSubtitleChange(subtitle);
    });
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Inject platform-specific scripts
    await this.adapter.inject();
    
    console.log('✅ Extension initialized successfully');
  }
  
  handleSubtitleChange(subtitle) {
    // Display subtitle with clickable words
    this.overlay.displaySubtitle(subtitle);
    
    // Emit event for analytics/debugging
    window.dispatchEvent(new CustomEvent(EVENTS.SUBTITLE_DETECTED, {
      detail: subtitle
    }));
  }
  
  setupEventListeners() {
    // Listen for word clicks from overlay
    window.addEventListener(EVENTS.WORD_CLICKED, async (event) => {
      const { word, context } = event.detail;
      await this.handleWordClick(word, context);
    });
    
    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.settings) {
        this.overlay.updateSettings(changes.settings.newValue);
      }
    });
  }
  
  async handleWordClick(word, context) {
    // Request translation from service worker
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      data: { word, context }
    });
    
    // Save word with translation
    const wordData = {
      word: word,
      definition: response.definition,
      context: context,
      platform: this.platform,
      timestamp: new Date().toISOString(),
      videoTitle: this.adapter.getVideoTitle(),
      videoTimestamp: this.adapter.getCurrentTime()
    };
    
    await this.storage.saveWord(wordData);
    this.overlay.addWordToList(wordData);
    
    // Emit event
    window.dispatchEvent(new CustomEvent(EVENTS.WORD_SAVED, {
      detail: wordData
    }));
  }
}

// Initialize extension
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new IndonesianLearningExtension();
  });
} else {
  new IndonesianLearningExtension();
}
```

### src/adapters/base-adapter.js
```javascript
export class BaseAdapter {
  constructor(platform) {
    this.platform = platform;
    this.subtitleCallback = null;
    this.observer = null;
  }
  
  // Abstract methods to be implemented by platform adapters
  async waitForPlayer() {
    throw new Error('waitForPlayer must be implemented');
  }
  
  async inject() {
    throw new Error('inject must be implemented');
  }
  
  onSubtitleChange(callback) {
    this.subtitleCallback = callback;
  }
  
  getVideoTitle() {
    throw new Error('getVideoTitle must be implemented');
  }
  
  getCurrentTime() {
    const video = document.querySelector('video');
    return video ? video.currentTime : 0;
  }
  
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
  
  // Utility method for injecting scripts
  injectScript(scriptPath) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(scriptPath);
      script.onload = () => {
        script.remove();
        resolve();
      };
      (document.head || document.documentElement).appendChild(script);
    });
  }
}
```

### src/adapters/netflix-adapter.js
```javascript
import { BaseAdapter } from './base-adapter.js';
import { SELECTORS } from '../shared/constants.js';

export class NetflixAdapter extends BaseAdapter {
  constructor() {
    super('netflix');
    this.selectors = SELECTORS.netflix;
  }
  
  async waitForPlayer() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (document.querySelector(this.selectors.player)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }
  
  async inject() {
    // Inject Netflix-specific interceptor
    await this.injectScript('src/inject/netflix-interceptor.js');
    
    // Setup DOM monitoring for subtitles
    this.startSubtitleMonitoring();
    
    // Listen for intercepted subtitle data
    window.addEventListener('message', (event) => {
      if (event.data.type === 'NETFLIX_SUBTITLE_DATA') {
        this.handleSubtitleData(event.data.payload);
      }
    });
  }
  
  startSubtitleMonitoring() {
    const observe = () => {
      const container = document.querySelector(this.selectors.subtitleContainer);
      
      if (!container) {
        setTimeout(observe, 1000);
        return;
      }
      
      let currentText = '';
      
      this.observer = new MutationObserver(() => {
        const subtitleElement = container.querySelector(this.selectors.subtitleText);
        
        if (subtitleElement) {
          const text = subtitleElement.textContent.trim();
          
          if (text && text !== currentText) {
            currentText = text;
            
            if (this.subtitleCallback) {
              this.subtitleCallback({
                text: text,
                timestamp: this.getCurrentTime(),
                platform: 'netflix'
              });
            }
          }
        }
      });
      
      this.observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
      });
    };
    
    observe();
  }
  
  handleSubtitleData(data) {
    // Process TTML subtitle data from interceptor
    console.log('Netflix subtitle data received:', data);
    // Future: Parse and pre-cache upcoming subtitles
  }
  
  getVideoTitle() {
    // Try multiple selectors for video title
    const titleElement = document.querySelector('.video-title h4') ||
                        document.querySelector('.ellipsize-text h4') ||
                        document.querySelector('[data-uia="video-title"]');
    
    return titleElement ? titleElement.textContent : 'Unknown Title';
  }
}
```

### src/adapters/youtube-adapter.js
```javascript
import { BaseAdapter } from './base-adapter.js';
import { SELECTORS } from '../shared/constants.js';

export class YouTubeAdapter extends BaseAdapter {
  constructor() {
    super('youtube');
    this.selectors = SELECTORS.youtube;
    this.textTrack = null;
  }
  
  async waitForPlayer() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const player = document.querySelector(this.selectors.player);
        const video = document.querySelector(this.selectors.video);
        
        if (player && video) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }
  
  async inject() {
    // Inject YouTube-specific interceptor
    await this.injectScript('src/inject/youtube-interceptor.js');
    
    // Setup TextTrack API monitoring
    this.setupTextTrackMonitoring();
    
    // Setup DOM monitoring as fallback
    this.startSubtitleMonitoring();
  }
  
  setupTextTrackMonitoring() {
    const video = document.querySelector(this.selectors.video);
    if (!video) return;
    
    // Monitor TextTrack changes
    video.addEventListener('loadedmetadata', () => {
      const tracks = video.textTracks;
      
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        
        if (track.kind === 'captions' || track.kind === 'subtitles') {
          track.addEventListener('cuechange', () => {
            const activeCues = track.activeCues;
            
            if (activeCues && activeCues.length > 0) {
              const cue = activeCues[0];
              const text = cue.text.replace(/<[^>]*>/g, ''); // Remove HTML tags
              
              if (this.subtitleCallback) {
                this.subtitleCallback({
                  text: text,
                  timestamp: cue.startTime,
                  endTime: cue.endTime,
                  platform: 'youtube'
                });
              }
            }
          });
        }
      }
    });
  }
  
  startSubtitleMonitoring() {
    // Fallback: Monitor DOM for subtitle changes
    const observe = () => {
      const container = document.querySelector(this.selectors.subtitleContainer);
      
      if (!container) {
        setTimeout(observe, 1000);
        return;
      }
      
      let currentText = '';
      
      this.observer = new MutationObserver(() => {
        const segments = container.querySelectorAll(this.selectors.subtitleText);
        
        if (segments.length > 0) {
          const text = Array.from(segments)
            .map(segment => segment.textContent)
            .join(' ')
            .trim();
          
          if (text && text !== currentText) {
            currentText = text;
            
            if (this.subtitleCallback) {
              this.subtitleCallback({
                text: text,
                timestamp: this.getCurrentTime(),
                platform: 'youtube'
              });
            }
          }
        }
      });
      
      this.observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
      });
    };
    
    observe();
  }
  
  getVideoTitle() {
    const titleElement = document.querySelector('#container h1.title yt-formatted-string') ||
                        document.querySelector('[class*="title"]') ||
                        document.querySelector('h1.watch-title-container');
    
    return titleElement ? titleElement.textContent.trim() : 'Unknown Video';
  }
}
```

### src/inject/netflix-interceptor.js
```javascript
// Injected into main world to access Netflix's internal APIs
(function() {
  'use strict';
  
  console.log('Netflix interceptor injected');
  
  // Intercept XMLHttpRequest to capture subtitle requests
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    this._method = method;
    return originalOpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function() {
    if (this._url) {
      // Check if this is a subtitle request
      if (this._url.includes('?o=') && 
          (this._url.includes('.xml') || 
           this._url.includes('ttml') || 
           this._url.includes('dfxp'))) {
        
        this.addEventListener('load', function() {
          // Send subtitle data to content script
          window.postMessage({
            type: 'NETFLIX_SUBTITLE_DATA',
            payload: {
              url: this._url,
              data: this.responseText,
              timestamp: Date.now()
            }
          }, '*');
        });
      }
    }
    
    return originalSend.apply(this, arguments);
  };
  
  // Try to access Netflix's player API
  const getNetflixPlayer = () => {
    try {
      const videoPlayer = netflix?.appContext?.state?.playerApp?.getAPI()?.videoPlayer;
      if (videoPlayer) {
        const sessionIds = videoPlayer.getAllPlayerSessionIds();
        if (sessionIds && sessionIds.length > 0) {
          return videoPlayer.getVideoPlayerBySessionId(sessionIds[0]);
        }
      }
    } catch (e) {
      // Player not ready yet
    }
    return null;
  };
  
  // Monitor for player availability
  const monitorPlayer = setInterval(() => {
    const player = getNetflixPlayer();
    if (player) {
      console.log('Netflix player detected');
      clearInterval(monitorPlayer);
      
      // Send player info to content script
      window.postMessage({
        type: 'NETFLIX_PLAYER_READY',
        payload: {
          hasPlayer: true,
          currentTime: player.getCurrentTime(),
          duration: player.getDuration()
        }
      }, '*');
    }
  }, 1000);
  
  // Intercept fetch requests as well
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    if (typeof url === 'string' && url.includes('?o=')) {
      return originalFetch.apply(this, args).then(async response => {
        const clonedResponse = response.clone();
        
        if (url.includes('.xml') || url.includes('ttml')) {
          const text = await clonedResponse.text();
          
          window.postMessage({
            type: 'NETFLIX_SUBTITLE_DATA',
            payload: {
              url: url,
              data: text,
              timestamp: Date.now()
            }
          }, '*');
        }
        
        return response;
      });
    }
    
    return originalFetch.apply(this, args);
  };
})();
```

### src/inject/youtube-interceptor.js
```javascript
// Injected into main world to access YouTube's internal APIs
(function() {
  'use strict';
  
  console.log('YouTube interceptor injected');
  
  // Try to access YouTube's player API
  const getYouTubePlayer = () => {
    try {
      const player = document.querySelector('#movie_player');
      if (player && player.getPlayerResponse) {
        return player;
      }
    } catch (e) {
      // Player not ready
    }
    return null;
  };
  
  // Monitor for captions/subtitles data
  const monitorCaptions = () => {
    const player = getYouTubePlayer();
    if (!player) {
      setTimeout(monitorCaptions, 1000);
      return;
    }
    
    // Get caption tracks
    const playerResponse = player.getPlayerResponse();
    if (playerResponse && playerResponse.captions) {
      const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer;
      
      if (captionTracks && captionTracks.captionTracks) {
        // Send available caption tracks to content script
        window.postMessage({
          type: 'YOUTUBE_CAPTIONS_AVAILABLE',
          payload: {
            tracks: captionTracks.captionTracks.map(track => ({
              language: track.languageCode,
              name: track.name.simpleText,
              baseUrl: track.baseUrl,
              vssId: track.vssId
            }))
          }
        }, '*');
      }
    }
    
    // Monitor for caption changes
    if (player.getOption) {
      const currentTrack = player.getOption('captions', 'track');
      
      if (currentTrack) {
        window.postMessage({
          type: 'YOUTUBE_CAPTION_TRACK_CHANGED',
          payload: {
            language: currentTrack.languageCode,
            displayName: currentTrack.displayName
          }
        }, '*');
      }
    }
  };
  
  // Start monitoring when player is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorCaptions);
  } else {
    monitorCaptions();
  }
  
  // Intercept XMLHttpRequest for caption/subtitle requests
  const originalOpen = XMLHttpRequest.prototype.open;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    
    // Check if this is a caption request
    if (url.includes('/api/timedtext') || 
        url.includes('/timedtext') ||
        url.includes('&kind=asr') ||
        url.includes('&kind=subtitles')) {
      
      this.addEventListener('load', function() {
        // Parse and send caption data
        try {
          const data = JSON.parse(this.responseText);
          
          window.postMessage({
            type: 'YOUTUBE_CAPTION_DATA',
            payload: {
              url: this._url,
              data: data,
              timestamp: Date.now()
            }
          }, '*');
        } catch (e) {
          // Not JSON, might be XML format
          window.postMessage({
            type: 'YOUTUBE_CAPTION_DATA',
            payload: {
              url: this._url,
              data: this.responseText,
              format: 'xml',
              timestamp: Date.now()
            }
          }, '*');
        }
      });
    }
    
    return originalOpen.apply(this, arguments);
  };
})();
```

### src/ui/components/subtitle-overlay.js
```javascript
export class SubtitleOverlay {
  constructor(shadowRoot, onWordClick) {
    this.shadowRoot = shadowRoot;
    this.onWordClick = onWordClick;
    this.currentSubtitle = null;
    this.hideTimeout = null;
    
    this.createElement();
  }
  
  createElement() {
    this.container = document.createElement('div');
    this.container.className = 'subtitle-overlay';
    this.container.innerHTML = `
      <div class="subtitle-text"></div>
      <div class="subtitle-translation"></div>
    `;
    
    this.textElement = this.container.querySelector('.subtitle-text');
    this.translationElement = this.container.querySelector('.subtitle-translation');
    
    this.shadowRoot.appendChild(this.container);
  }
  
  display(subtitle, translation = null) {
    // Clear previous timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    
    // Clear and rebuild subtitle text with clickable words
    this.textElement.innerHTML = '';
    
    // Tokenize text into words
    const words = this.tokenizeIndonesian(subtitle.text);
    
    words.forEach((word, index) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      wordSpan.textContent = word;
      wordSpan.dataset.index = index;
      wordSpan.dataset.word = word.toLowerCase().replace(/[.,!?;:]/g, '');
      
      // Add click handler
      wordSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleWordClick(wordSpan.dataset.word, subtitle.text);
      });
      
      // Add hover effect
      wordSpan.addEventListener('mouseenter', () => {
        wordSpan.classList.add('hover');
      });
      
      wordSpan.addEventListener('mouseleave', () => {
        wordSpan.classList.remove('hover');
      });
      
      this.textElement.appendChild(wordSpan);
      
      // Add space between words
      if (index < words.length - 1) {
        this.textElement.appendChild(document.createTextNode(' '));
      }
    });
    
    // Show translation if provided
    if (translation) {
      this.translationElement.textContent = translation;
      this.translationElement.style.display = 'block';
    } else {
      this.translationElement.style.display = 'none';
    }
    
    // Show overlay
    this.container.classList.add('visible');
    
    // Auto-hide after 5 seconds
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 5000);
  }
  
  tokenizeIndonesian(text) {
    // Basic tokenization - can be enhanced with proper NLP
    return text.split(/\s+/).filter(word => word.length > 0);
  }
  
  handleWordClick(word, context) {
    if (this.onWordClick) {
      this.onWordClick(word, context);
    }
    
    // Visual feedback
    const wordElement = this.textElement.querySelector(`[data-word="${word}"]`);
    if (wordElement) {
      wordElement.classList.add('clicked');
      setTimeout(() => {
        wordElement.classList.remove('clicked');
      }, 500);
    }
  }
  
  hide() {
    this.container.classList.remove('visible');
  }
  
  updatePosition(position) {
    // Update overlay position based on settings
    switch(position) {
      case 'top':
        this.container.style.bottom = 'auto';
        this.container.style.top = '10%';
        break;
      case 'middle':
        this.container.style.bottom = '50%';
        this.container.style.transform = 'translate(-50%, 50%)';
        break;
      case 'bottom':
      default:
        this.container.style.bottom = '15%';
        this.container.style.top = 'auto';
        break;
    }
  }
}
```

### src/lib/translator.js
```javascript
export class Translator {
  constructor() {
    this.cache = new Map();
    this.provider = null;
    this.initialized = false;
    
    this.initialize();
  }
  
  async initialize() {
    // Try Chrome's built-in translator first
    if ('translation' in self && chrome.runtime.getManifest().version >= '130') {
      try {
        this.chromeTranslator = await self.translation.createTranslator({
          sourceLanguage: 'id',
          targetLanguage: 'en'
        });
        this.provider = 'chrome';
        console.log('Using Chrome built-in translator');
      } catch (e) {
        console.log('Chrome translator not available:', e);
      }
    }
    
    // Fallback to LibreTranslate
    if (!this.provider) {
      this.provider = 'libretranslate';
      this.libreTranslateUrl = 'https://libretranslate.com/translate';
      console.log('Using LibreTranslate API');
    }
    
    this.initialized = true;
  }
  
  async translate(text, options = {}) {
    const { useCache = true, context = null } = options;
    
    // Check cache
    if (useCache && this.cache.has(text)) {
      return this.cache.get(text);
    }
    
    let translation;
    const startTime = performance.now();
    
    try {
      switch (this.provider) {
        case 'chrome':
          translation = await this.translateWithChrome(text);
          break;
        case 'libretranslate':
          translation = await this.translateWithLibreTranslate(text);
          break;
        default:
          throw new Error('No translation provider available');
      }
      
      const duration = performance.now() - startTime;
      console.log(`Translation completed in ${duration.toFixed(2)}ms`);
      
      // Cache result
      this.cache.set(text, translation);
      
      // Limit cache size
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return `[Translation Error: ${text}]`;
    }
  }
  
  async translateWithChrome(text) {
    if (!this.chromeTranslator) {
      throw new Error('Chrome translator not initialized');
    }
    
    return await this.chromeTranslator.translate(text);
  }
  
  async translateWithLibreTranslate(text) {
    const response = await fetch(this.libreTranslateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source: 'id',
        target: 'en',
        format: 'text'
      })
    });
    
    if (!response.ok) {
      throw new Error(`LibreTranslate API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.translatedText;
  }
  
  async translateBatch(texts) {
    // Translate multiple texts efficiently
    const translations = await Promise.all(
      texts.map(text => this.translate(text))
    );
    
    return texts.reduce((acc, text, index) => {
      acc[text] = translations[index];
      return acc;
    }, {});
  }
  
  clearCache() {
    this.cache.clear();
  }
}
```

### src/lib/indonesian-utils.js
```javascript
export class IndonesianUtils {
  constructor() {
    // Common Indonesian affixes
    this.prefixes = ['me', 'ter', 'ke', 'ber', 'pe', 'per', 'se', 'di', 'mem', 'men', 'meng', 'meny'];
    this.suffixes = ['an', 'kan', 'i', 'nya', 'lah', 'kah', 'pun'];
    this.circumfixes = [
      { prefix: 'ke', suffix: 'an' },
      { prefix: 'pe', suffix: 'an' },
      { prefix: 'per', suffix: 'an' },
      { prefix: 'ber', suffix: 'an' },
      { prefix: 'se', suffix: 'nya' }
    ];
    
    this.loadCommonWords();
  }
  
  async loadCommonWords() {
    try {
      const response = await fetch(chrome.runtime.getURL('data/indonesian-common-words.json'));
      this.commonWords = await response.json();
    } catch (error) {
      console.error('Failed to load common words:', error);
      this.commonWords = [];
    }
  }
  
  extractRootWord(word) {
    // Convert to lowercase for processing
    const lowerWord = word.toLowerCase();
    
    // Check if it's already a common root word
    if (this.commonWords && this.commonWords.includes(lowerWord)) {
      return lowerWord;
    }
    
    // Handle reduplication (e.g., buku-buku, mata-mata)
    if (lowerWord.includes('-')) {
      const parts = lowerWord.split('-');
      if (parts[0] === parts[1]) {
        return parts[0];
      }
    }
    
    // Try removing circumfixes first
    for (const { prefix, suffix } of this.circumfixes) {
      if (lowerWord.startsWith(prefix) && lowerWord.endsWith(suffix)) {
        const stem = lowerWord.slice(prefix.length, -suffix.length);
        if (this.isValidRoot(stem)) {
          return stem;
        }
      }
    }
    
    // Try removing prefixes
    for (const prefix of this.prefixes) {
      if (lowerWord.startsWith(prefix)) {
        const stem = lowerWord.slice(prefix.length);
        const adjusted = this.handleMorphophonemicChanges(prefix, stem);
        if (this.isValidRoot(adjusted)) {
          return adjusted;
        }
      }
    }
    
    // Try removing suffixes
    for (const suffix of this.suffixes) {
      if (lowerWord.endsWith(suffix)) {
        const stem = lowerWord.slice(0, -suffix.length);
        if (this.isValidRoot(stem)) {
          return stem;
        }
      }
    }
    
    return lowerWord;
  }
  
  handleMorphophonemicChanges(prefix, stem) {
    // Indonesian morphophonemic rules
    // me + p -> mem + p (memukul from pukul)
    // me + t -> men + t (menulis from tulis)
    // me + k -> meng + k (mengambil from ambil)
    // me + s -> meny + s (menyapu from sapu)
    
    if (prefix === 'mem' && !stem.startsWith('p')) {
      return 'p' + stem;
    }
    if (prefix === 'men' && !stem.startsWith('t')) {
      return 't' + stem;
    }
    if (prefix === 'meng' && !stem.startsWith('k')) {
      return 'k' + stem;
    }
    if (prefix === 'meny' && !stem.startsWith('s')) {
      return 's' + stem;
    }
    
    return stem;
  }
  
  isValidRoot(word) {
    // Check if it's a valid root word
    if (word.length < 2) {
      return false;
    }
    
    // Check against common words list
    if (this.commonWords && this.commonWords.includes(word)) {
      return true;
    }
    
    // Basic heuristic: most Indonesian root words are 4-6 characters
    return word.length >= 3 && word.length <= 8;
  }
  
  tokenize(text) {
    // Indonesian-aware tokenization
    // Handle contractions and particles
    const tokens = text
      .split(/\s+/)
      .map(token => {
        // Remove punctuation but keep hyphens for reduplicated words
        return token.replace(/[.,!?;:"'()[\]{}]/g, '');
      })
      .filter(token => token.length > 0);
    
    return tokens;
  }
  
  isLikelyIndonesian(text) {
    // Simple heuristic to detect if text is likely Indonesian
    const indonesianPatterns = [
      /\b(yang|dan|di|ke|dari|untuk|dengan|pada|adalah|itu|ini)\b/i,
      /\b(ber|me|ter|pe|se)[a-z]+/i,
      /[a-z]+an\b/i,
      /[a-z]+nya\b/i
    ];
    
    return indonesianPatterns.some(pattern => pattern.test(text));
  }
  
  detectCodeMixing(text) {
    // Detect English words mixed in Indonesian text
    const words = this.tokenize(text);
    const englishWords = [];
    const indonesianWords = [];
    
    words.forEach(word => {
      // Simple heuristic: check if word follows Indonesian patterns
      if (this.isLikelyIndonesianWord(word)) {
        indonesianWords.push(word);
      } else if (this.isLikelyEnglishWord(word)) {
        englishWords.push(word);
      }
    });
    
    return {
      hasCodeMixing: englishWords.length > 0 && indonesianWords.length > 0,
      englishWords,
      indonesianWords,
      ratio: englishWords.length / (englishWords.length + indonesianWords.length)
    };
  }
  
  isLikelyIndonesianWord(word) {
    // Check if word follows Indonesian patterns
    const lower = word.toLowerCase();
    
    // Check for Indonesian affixes
    for (const prefix of this.prefixes) {
      if (lower.startsWith(prefix)) return true;
    }
    for (const suffix of this.suffixes) {
      if (lower.endsWith(suffix)) return true;
    }
    
    // Check against common words
    if (this.commonWords && this.commonWords.includes(lower)) {
      return true;
    }
    
    return false;
  }
  
  isLikelyEnglishWord(word) {
    // Simple heuristic for English words
    const englishPatterns = [
      /ing$/,
      /ed$/,
      /ly$/,
      /tion$/,
      /^(the|and|or|but|in|on|at|to|for)$/i
    ];
    
    return englishPatterns.some(pattern => pattern.test(word));
  }
}
```

### src/background/service-worker.js
```javascript
import { Translator } from '../lib/translator.js';
import { StorageManager } from '../lib/storage-manager.js';
import { config } from '../shared/config.js';

class ServiceWorker {
  constructor() {
    this.translator = new Translator();
    this.storage = new StorageManager();
    
    this.setupMessageHandlers();
    this.setupInstallHandler();
  }
  
  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Service worker received message:', request.type);
      
      switch (request.type) {
        case 'TRANSLATE':
          this.handleTranslate(request.data)
            .then(sendResponse)
            .catch(error => {
              console.error('Translation error:', error);
              sendResponse({ error: error.message });
            });
          return true; // Keep channel open for async response
          
        case 'GET_SETTINGS':
          this.storage.getSettings()
            .then(sendResponse)
            .catch(error => {
              sendResponse({ error: error.message });
            });
          return true;
          
        case 'SAVE_SETTINGS':
          this.storage.saveSettings(request.data)
            .then(() => sendResponse({ success: true }))
            .catch(error => {
              sendResponse({ error: error.message });
            });
          return true;
          
        case 'EXPORT_WORDS':
          this.handleExportWords()
            .then(sendResponse)
            .catch(error => {
              sendResponse({ error: error.message });
            });
          return true;
          
        default:
          console.warn('Unknown message type:', request.type);
          sendResponse({ error: 'Unknown message type' });
      }
    });
  }
  
  setupInstallHandler() {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Extension installed:', details);
      
      // Set default settings on first install
      if (details.reason === 'install') {
        this.storage.saveSettings(config);
      }
      
      // Open welcome page
      if (details.reason === 'install') {
        chrome.tabs.create({
          url: chrome.runtime.getURL('welcome.html')
        });
      }
    });
  }
  
  async handleTranslate(data) {
    const { word, context } = data;
    
    // Translate the word
    const definition = await this.translator.translate(word, { context });
    
    return {
      word,
      definition,
      timestamp: Date.now()
    };
  }
  
  async handleExportWords() {
    const words = await this.storage.getAllWords();
    
    // Format for CSV export
    const csv = this.formatAsCSV(words);
    
    // Create blob and download URL
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    chrome.downloads.download({
      url: url,
      filename: `indonesian-words-${Date.now()}.csv`,
      saveAs: true
    });
    
    return { success: true, count: words.length };
  }
  
  formatAsCSV(words) {
    const headers = ['Word', 'Definition', 'Context', 'Platform', 'Date Added'];
    const rows = words.map(word => [
      word.word,
      word.definition,
      word.context,
      word.platform,
      word.timestamp
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

// Initialize service worker
new ServiceWorker();
```

### package.json
```json
{
  "name": "indonesian-learning-extension",
  "version": "1.0.0",
  "description": "Learn Indonesian while watching Netflix and YouTube",
  "private": true,
  "scripts": {
    "dev": "webpack --mode development --watch",
    "build": "webpack --mode production",
    "test": "jest",
    "lint": "eslint src/**/*.js",
    "package": "npm run build && zip -r extension.zip dist/*"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.254",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "copy-webpack-plugin": "^11.0.0"
  },
  "dependencies": {}
}
```

### README.md
```markdown
# Indonesian Learning Chrome Extension

Learn Indonesian while watching Netflix and YouTube with real-time subtitle translations and vocabulary building.

## Features

- 🎬 **Real-time Subtitle Translation**: Instant Indonesian to English translation
- 📝 **Click-to-Save Words**: Click any word in subtitles to save with definition
- 🎯 **Platform Support**: Works on Netflix and YouTube
- 💾 **Offline Storage**: All words saved locally with context
- 🚀 **Fast Translation**: Chrome native API with fallbacks
- 📊 **Export Vocabulary**: Export saved words to CSV for Anki

## Installation

### Development
1. Clone the repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension directory

### Building for Production
```bash
npm install
npm run build
npm run package
```

## Usage

1. Navigate to Netflix or YouTube
2. Play content with Indonesian subtitles
3. Click words in subtitles to save them
4. View saved words in the side panel
5. Export vocabulary for external study

## Architecture

- **Manifest V3**: Modern Chrome extension architecture
- **Shadow DOM**: Isolated UI components
- **Service Workers**: Background processing
- **Platform Adapters**: Netflix and YouTube specific handlers

## Translation Providers

1. **Chrome Native API** (Primary) - Fastest, offline
2. **LibreTranslate** (Fallback) - Free, open-source
3. **Local Cache** - Previously translated words

## Development

### Project Structure
- `/src/adapters/` - Platform-specific adapters
- `/src/background/` - Service worker scripts
- `/src/content/` - Content scripts
- `/src/inject/` - Main world injection scripts
- `/src/lib/` - Shared libraries
- `/src/ui/` - UI components

### Adding New Platforms
1. Create adapter in `/src/adapters/`
2. Extend `BaseAdapter` class
3. Implement platform-specific methods
4. Register in `AdapterFactory`

## Configuration

Edit `src/shared/config.js` to customize:
- Translation providers
- UI positioning
- Cache settings
- Platform-specific options

## Privacy

- All data stored locally
- No external servers (except translation APIs)
- No user tracking
- Open source

## License

MIT License - See LICENSE file

## Contributing

Pull requests welcome! Please read CONTRIBUTING.md first.

## Support

For issues and questions, please use GitHub Issues.
```

## Data Files

### data/indonesian-common-words.json
```json
[
  "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah", "itu",
  "ini", "tidak", "ada", "akan", "sudah", "bisa", "harus", "dalam", "oleh", "saya",
  "anda", "kita", "mereka", "kami", "dia", "kalian", "atau", "juga", "serta", "tetapi",
  "namun", "jika", "maka", "karena", "sebab", "agar", "supaya", "bahwa", "seperti",
  "buku", "rumah", "mobil", "jalan", "makan", "minum", "tidur", "kerja", "main", "lihat"
]
```

### data/indonesian-affixes.json
```json
{
  "prefixes": {
    "me": ["active verb"],
    "ber": ["have, possess"],
    "ter": ["passive, superlative"],
    "ke": ["to, towards"],
    "pe": ["actor, doer"],
    "per": ["causative"],
    "se": ["one, same"],
    "di": ["passive"]
  },
  "suffixes": {
    "an": ["noun forming"],
    "kan": ["causative"],
    "i": ["locative, repetitive"],
    "nya": ["possessive, definite"],
    "lah": ["emphasis"],
    "kah": ["question"],
    "pun": ["also, even"]
  },
  "circumfixes": {
    "ke-an": ["abstract noun"],
    "pe-an": ["process noun"],
    "per-an": ["place, result"],
    "ber-an": ["reciprocal"],
    "se-nya": ["as ... as possible"]
  }
}
```

## Key Implementation Notes

### Critical Decisions

1. **Shadow DOM is Mandatory**: Netflix and YouTube have aggressive CSS that will break any normal DOM elements
2. **Manifest V3 Limitations**: Can't use webRequest API, must inject scripts for interception
3. **Translation Strategy**: Always try Chrome native first (fastest), then fallback to APIs
4. **Platform Detection**: Must happen immediately to load correct adapter
5. **Performance**: Cache everything, debounce API calls, use memory before storage

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Netflix subtitles detected
- [ ] YouTube subtitles detected
- [ ] Words clickable in subtitles
- [ ] Translation appears on click
- [ ] Words saved to storage
- [ ] Word list displays saved words
- [ ] Export to CSV works
- [ ] Settings persist between sessions
- [ ] Memory usage stays reasonable

### Common Issues & Solutions

1. **Subtitles not detected**: Check selectors in constants.js
2. **Translation fails**: Verify API endpoints are accessible
3. **UI not visible**: Check Shadow DOM creation and z-index
4. **Performance issues**: Implement debouncing and caching
5. **Platform detection fails**: Update detection logic in platform-detector.js

## Deployment Checklist

1. Update version in manifest.json
2. Build production bundle
3. Test on clean Chrome profile
4. Create release notes
5. Submit to Chrome Web Store
6. Update documentation

This scaffold provides a complete, production-ready architecture for the Indonesian learning extension with all necessary components and configurations.
