// Service worker for Indonesian Learning Extension
// Uses Chrome's built-in Translator API

(async function() {
  'use strict';
  
  console.log('Service worker initializing...');
  
  let translator = null;
  
  // Initialize Chrome's built-in translator
  async function initializeTranslator() {
    try {
      // Check if Chrome's translation API is available
      if ('translation' in self) {
        // Create translator for Indonesian to English
        translator = await self.translation.createTranslator({
          sourceLanguage: 'id',
          targetLanguage: 'en'
        });
        console.log('Chrome Translator API initialized');
        return true;
      }
    } catch (error) {
      console.error('Failed to initialize Chrome Translator:', error);
    }
    return false;
  }
  
  // Translate using Chrome's API or fallback to dictionary
  async function translateText(text) {
    // Try Chrome's translator first
    if (translator) {
      try {
        const result = await translator.translate(text);
        return result;
      } catch (error) {
        console.error('Chrome translation failed:', error);
      }
    }
    
    // Fallback to simple dictionary
    const dictionary = {
      'nezuko': 'Nezuko',
      'jangan': "don't",
      'mati': 'die',
      'jangan mati': "don't die",
      'mendapatkan': 'to get',
      'semua': 'all',
      'yang': 'that/which',
      'ditawarkan': 'offered',
      'dunia': 'world',
      'ini': 'this',
      'itu': 'that',
      'dan': 'and',
      'adalah': 'is/are',
      'tidak': 'not',
      'apa': 'what',
      'kamu': 'you',
      'saya': 'I/me',
      'dia': 'he/she',
      'mereka': 'they'
    };
    
    const cleanText = text.toLowerCase().trim();
    return dictionary[cleanText] || `[${text}]`;
  }
  
  // Message handler
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Service worker received:', request.type);
    
    if (request.type === 'TRANSLATE') {
      const { word } = request.data;
      
      translateText(word).then(translation => {
        sendResponse({ 
          translation: translation,
          word: word 
        });
      }).catch(error => {
        console.error('Translation error:', error);
        sendResponse({ 
          translation: `[${word}]`,
          error: error.message 
        });
      });
      
      return true; // Keep channel open for async response
    }
    
    // Handle other message types
    if (request.type === 'PING') {
      sendResponse({ status: 'ok' });
    }
  });
  
  // Initialize translator on startup
  initializeTranslator().then(success => {
    if (success) {
      console.log('✅ Service worker ready with Chrome Translator');
    } else {
      console.log('⚠️ Service worker ready with dictionary fallback');
    }
  });
  
  // Handle extension installation
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
    
    if (details.reason === 'install') {
      // Set default settings
      chrome.storage.sync.set({
        settings: {
          translationEnabled: true,
          overlayPosition: 'bottom',
          theme: 'dark'
        }
      });
    }
  });
  
})();