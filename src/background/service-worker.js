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
    });
  }
  
  async handleTranslate(data) {
    const { word, context } = data;
    
    // Check cache first
    let definition = await this.storage.getCachedTranslation(word);
    
    if (!definition) {
      // Translate the word
      definition = await this.translator.translate(word, { context });
      
      // Save to cache
      if (definition && !definition.startsWith('[Translation Error')) {
        await this.storage.saveToCache(word, definition);
      }
    }
    
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
      .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}

// Initialize service worker
new ServiceWorker();