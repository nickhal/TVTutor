// Service worker for Indonesian Learning Extension
// Uses Chrome's built-in Translator API

(async function() {
  'use strict';
  
  console.log('Service worker initializing...');
  
  let translator = null;
  
  // Initialize Chrome's built-in translator
  async function initializeTranslator() {
    try {
      console.log('=== INITIALIZING TRANSLATOR ===');
      console.log('Checking self object:', typeof self);
      console.log('Properties of self:', Object.keys(self).filter(key => key.includes('trans')));
      console.log('Translation API exists:', 'translation' in self);
      
      // Check if Chrome's translation API is available
      if ('translation' in self) {
        console.log('Translation API found!');
        console.log('self.translation:', self.translation);
        console.log('self.translation methods:', Object.keys(self.translation));
        
        try {
          // Create translator for Indonesian to English
          console.log('Creating translator for id -> en...');
          translator = await self.translation.createTranslator({
            sourceLanguage: 'id',
            targetLanguage: 'en'
          });
          console.log('✅ Chrome Translator API initialized successfully');
          console.log('Translator object:', translator);
          console.log('Translator methods:', Object.keys(translator));
          return true;
        } catch (createError) {
          console.error('Error creating translator:', createError);
          console.error('Error details:', {
            message: createError.message,
            stack: createError.stack,
            name: createError.name
          });
        }
      } else {
        console.log('❌ Translation API not found in self');
        console.log('Available APIs in self:', Object.keys(self).slice(0, 20));
        console.log('Chrome version info:', navigator.userAgent);
        console.log('This is an experimental API that requires:');
        console.log('1. Chrome Canary or Dev Channel');
        console.log('2. Flag enabled: chrome://flags/#translation-api');
      }
    } catch (error) {
      console.error('Failed to initialize Chrome Translator:', error.message, error);
    }
    return false;
  }
  
  // Translate using Chrome's API
  async function translateText(text) {
    if (translator) {
      try {
        const result = await translator.translate(text);
        return result;
      } catch (error) {
        console.error('Chrome translation failed:', error);
        throw error;
      }
    }
    
    throw new Error('No translation API available');
  }
  
  // Message handler
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('=== SERVICE WORKER MESSAGE RECEIVED ===');
    console.log('Message type:', request.type);
    console.log('Full request:', JSON.stringify(request, null, 2));
    console.log('Sender:', sender);
    console.log('Translator status:', !!translator);
    console.log('Translation API exists:', 'translation' in self);
    
    if (request.type === 'TRANSLATE') {
      const { word } = request.data;
      console.log(`Attempting to translate: "${word}"`);
      
      translateText(word).then(translation => {
        console.log(`Translation successful: "${word}" -> "${translation}"`);
        const response = { 
          translation: translation,
          word: word,
          method: 'chrome-api',
          success: true
        };
        console.log('Sending response:', response);
        sendResponse(response);
      }).catch(error => {
        console.error('Translation error details:', {
          message: error.message,
          stack: error.stack,
          translatorAvailable: !!translator,
          apiExists: 'translation' in self
        });
        const response = { 
          translation: null,
          error: error.message,
          method: 'none',
          translatorAvailable: !!translator,
          translationApiExists: 'translation' in self,
          success: false
        };
        console.log('Sending error response:', response);
        sendResponse(response);
      });
      
      return true; // Keep channel open for async response
    }
    
    // Handle other message types
    if (request.type === 'PING') {
      const response = { 
        status: 'ok',
        translatorAvailable: !!translator,
        translationApiExists: 'translation' in self
      };
      console.log('PING response:', response);
      sendResponse(response);
      return false; // Synchronous response
    }
    
    // Default response for unknown message types
    console.warn('Unknown message type received:', request.type);
    const errorResponse = { 
      error: 'Unknown message type',
      receivedType: request.type,
      availableTypes: ['TRANSLATE', 'PING']
    };
    console.log('Sending error response:', errorResponse);
    sendResponse(errorResponse);
    return false;
  });
  
  // Initialize translator on startup
  initializeTranslator().then(success => {
    if (success) {
      console.log('✅ Service worker ready with Chrome Translator');
    } else {
      console.log('⚠️ Service worker ready but NO translation available');
      console.log('Chrome Translation API is not available.');
      console.log('This API is experimental and requires Chrome Canary or Dev channel.');
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