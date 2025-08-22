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
    
    // Check if platform is supported
    if (!PlatformDetector.isSupported()) {
      console.log('Platform not supported');
      return;
    }
    
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
    try {
      await this.adapter.inject();
    } catch (error) {
      console.error('Error injecting adapter scripts:', error);
    }
    
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
    
    // Listen for settings changes if chrome.storage is available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.settings) {
          this.overlay.updateSettings(changes.settings.newValue);
        }
      });
    }
  }
  
  async handleWordClick(word, context) {
    try {
      // First check cache
      let definition = await this.storage.getCachedTranslation(word);
      
      if (!definition) {
        // Request translation from service worker if available
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          try {
            const response = await chrome.runtime.sendMessage({
              type: 'TRANSLATE',
              data: { word, context }
            });
            definition = response.definition;
          } catch (error) {
            console.error('Error getting translation from service worker:', error);
            // Fallback to simple translation
            definition = await this.simpleTranslate(word);
          }
        } else {
          // Fallback to simple translation
          definition = await this.simpleTranslate(word);
        }
        
        // Cache the translation
        if (definition) {
          await this.storage.saveToCache(word, definition);
        }
      }
      
      // Save word with translation
      const wordData = {
        word: word,
        definition: definition || 'Translation not available',
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
    } catch (error) {
      console.error('Error handling word click:', error);
    }
  }
  
  async simpleTranslate(word) {
    // Simple fallback translation using LibreTranslate public API
    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: word,
          source: 'id',
          target: 'en',
          format: 'text'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.translatedText;
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
    
    // Return placeholder if translation fails
    return `[${word}]`;
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