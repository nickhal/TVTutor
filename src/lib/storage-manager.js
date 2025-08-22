import { STORAGE_KEYS } from '../shared/constants.js';

export class StorageManager {
  constructor() {
    this.useLocalStorage = true; // Use localStorage for MVP
  }
  
  async saveWord(wordData) {
    try {
      const words = await this.getAllWords();
      
      // Check if word already exists
      const existingIndex = words.findIndex(w => 
        w.word.toLowerCase() === wordData.word.toLowerCase()
      );
      
      if (existingIndex !== -1) {
        // Update existing word
        words[existingIndex] = {
          ...words[existingIndex],
          ...wordData,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Add new word
        words.push({
          ...wordData,
          createdAt: new Date().toISOString()
        });
      }
      
      // Keep only the most recent words
      const maxWords = 1000;
      if (words.length > maxWords) {
        words.splice(0, words.length - maxWords);
      }
      
      if (this.useLocalStorage) {
        localStorage.setItem(STORAGE_KEYS.SAVED_WORDS, JSON.stringify(words));
      } else {
        await chrome.storage.local.set({ [STORAGE_KEYS.SAVED_WORDS]: words });
      }
      
      return true;
    } catch (error) {
      console.error('Error saving word:', error);
      return false;
    }
  }
  
  async getAllWords() {
    try {
      if (this.useLocalStorage) {
        const words = localStorage.getItem(STORAGE_KEYS.SAVED_WORDS);
        return words ? JSON.parse(words) : [];
      } else {
        const result = await chrome.storage.local.get(STORAGE_KEYS.SAVED_WORDS);
        return result[STORAGE_KEYS.SAVED_WORDS] || [];
      }
    } catch (error) {
      console.error('Error getting words:', error);
      return [];
    }
  }
  
  async getSettings() {
    try {
      if (this.useLocalStorage) {
        const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return settings ? JSON.parse(settings) : {};
      } else {
        const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
        return result[STORAGE_KEYS.SETTINGS] || {};
      }
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  }
  
  async saveSettings(settings) {
    try {
      if (this.useLocalStorage) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      } else {
        await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });
      }
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }
  
  async getTranslationCache() {
    try {
      if (this.useLocalStorage) {
        const cache = localStorage.getItem(STORAGE_KEYS.CACHE);
        return cache ? JSON.parse(cache) : {};
      } else {
        const result = await chrome.storage.local.get(STORAGE_KEYS.CACHE);
        return result[STORAGE_KEYS.CACHE] || {};
      }
    } catch (error) {
      console.error('Error getting cache:', error);
      return {};
    }
  }
  
  async saveToCache(word, translation) {
    try {
      const cache = await this.getTranslationCache();
      cache[word.toLowerCase()] = {
        translation: translation,
        timestamp: Date.now()
      };
      
      // Clean old cache entries
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      Object.keys(cache).forEach(key => {
        if (cache[key].timestamp < oneWeekAgo) {
          delete cache[key];
        }
      });
      
      if (this.useLocalStorage) {
        localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
      } else {
        await chrome.storage.local.set({ [STORAGE_KEYS.CACHE]: cache });
      }
      
      return true;
    } catch (error) {
      console.error('Error saving to cache:', error);
      return false;
    }
  }
  
  async getCachedTranslation(word) {
    try {
      const cache = await this.getTranslationCache();
      const cached = cache[word.toLowerCase()];
      
      if (cached) {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (cached.timestamp > oneWeekAgo) {
          return cached.translation;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached translation:', error);
      return null;
    }
  }
  
  async clearAllData() {
    try {
      if (this.useLocalStorage) {
        localStorage.removeItem(STORAGE_KEYS.SAVED_WORDS);
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        localStorage.removeItem(STORAGE_KEYS.CACHE);
      } else {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
      }
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
}