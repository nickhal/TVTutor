// src/models/loader.js

export class ModelLoader {
  constructor() {
    this.db = null;
    this.dbName = 'TVTutorModels';
    this.storeName = 'bergamotModels';
    this.modelVersion = '1.0.0';
    this.modelUrls = {
      'iden': {
        model: 'https://github.com/mozilla/firefox-translations-models/raw/main/models/tiny/iden/model.iden.intgemm.alphas.bin',
        vocab: 'https://github.com/mozilla/firefox-translations-models/raw/main/models/tiny/iden/vocab.iden.spm',
        lex: 'https://github.com/mozilla/firefox-translations-models/raw/main/models/tiny/iden/lex.50.50.iden.s2t.bin',
        config: 'https://github.com/mozilla/firefox-translations-models/raw/main/models/tiny/iden/config.intgemm8bit.yml'
      }
    };
  }

  async initialize() {
    console.log("Initializing model loader...");
    
    // Open IndexedDB
    await this.openDatabase();
    
    return true;
  }

  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log("IndexedDB opened successfully");
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for models if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('language', 'language', { unique: false });
          store.createIndex('version', 'version', { unique: false });
          console.log("Created object store for models");
        }
      };
    });
  }

  async loadModel(languagePair) {
    console.log(`Loading model for ${languagePair}...`);
    
    // Check if model is cached
    const cachedModel = await this.getCachedModel(languagePair);
    if (cachedModel) {
      console.log(`Model ${languagePair} loaded from cache`);
      return cachedModel;
    }
    
    // Download model if not cached
    console.log(`Downloading model ${languagePair}...`);
    const model = await this.downloadModel(languagePair);
    
    // Cache the model
    await this.cacheModel(languagePair, model);
    
    return model;
  }

  async getCachedModel(languagePair) {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(languagePair);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.version === this.modelVersion) {
          console.log(`Found cached model for ${languagePair}`);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error("Failed to get cached model:", request.error);
        resolve(null);
      };
    });
  }

  async downloadModel(languagePair) {
    const urls = this.modelUrls[languagePair];
    if (!urls) {
      throw new Error(`No model URLs found for ${languagePair}`);
    }
    
    try {
      // Download all model files in parallel
      const [modelData, vocabData, lexData, configData] = await Promise.all([
        this.downloadFile(urls.model, 'arraybuffer'),
        this.downloadFile(urls.vocab, 'arraybuffer'),
        this.downloadFile(urls.lex, 'arraybuffer'),
        this.downloadFile(urls.config, 'text')
      ]);
      
      console.log(`Downloaded all files for ${languagePair}`);
      
      return {
        model: modelData,
        vocab: vocabData,
        lex: lexData,
        config: configData
      };
    } catch (error) {
      console.error(`Failed to download model ${languagePair}:`, error);
      throw error;
    }
  }

  async downloadFile(url, responseType = 'arraybuffer') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const total = parseInt(response.headers.get('content-length') || '0');
      let loaded = 0;
      
      // Use reader for progress tracking
      const reader = response.body.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        // Report progress
        if (total > 0) {
          const progress = (loaded / total) * 100;
          console.log(`Download progress: ${progress.toFixed(1)}%`);
        }
      }
      
      // Combine chunks
      const allChunks = new Uint8Array(loaded);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }
      
      // Convert based on response type
      if (responseType === 'text') {
        return new TextDecoder().decode(allChunks);
      } else {
        return allChunks.buffer;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Download timeout');
      }
      throw error;
    }
  }

  async cacheModel(languagePair, modelData) {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const modelEntry = {
        id: languagePair,
        language: languagePair,
        version: this.modelVersion,
        timestamp: Date.now(),
        data: modelData
      };
      
      const request = store.put(modelEntry);
      
      request.onsuccess = () => {
        console.log(`Model ${languagePair} cached successfully`);
        resolve();
      };
      
      request.onerror = () => {
        console.error("Failed to cache model:", request.error);
        reject(request.error);
      };
    });
  }

  async clearCache() {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log("Model cache cleared");
        resolve();
      };
      
      request.onerror = () => {
        console.error("Failed to clear cache:", request.error);
        reject(request.error);
      };
    });
  }

  async getModelSize(languagePair) {
    const cachedModel = await this.getCachedModel(languagePair);
    if (!cachedModel) {
      return 0;
    }
    
    let totalSize = 0;
    if (cachedModel.model) totalSize += cachedModel.model.byteLength;
    if (cachedModel.vocab) totalSize += cachedModel.vocab.byteLength;
    if (cachedModel.lex) totalSize += cachedModel.lex.byteLength;
    if (cachedModel.config) totalSize += new Blob([cachedModel.config]).size;
    
    return totalSize;
  }

  async getCacheInfo() {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const models = request.result;
        const info = {
          totalModels: models.length,
          totalSize: 0,
          models: []
        };
        
        for (const model of models) {
          const size = await this.getModelSize(model.id);
          info.totalSize += size;
          info.models.push({
            id: model.id,
            version: model.version,
            timestamp: model.timestamp,
            size: size
          });
        }
        
        resolve(info);
      };
      
      request.onerror = () => {
        console.error("Failed to get cache info:", request.error);
        reject(request.error);
      };
    });
  }

  // Check if we have enough storage space
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = (usage / quota) * 100;
      
      console.log(`Storage: ${(usage / 1024 / 1024).toFixed(2)} MB / ${(quota / 1024 / 1024).toFixed(2)} MB (${percentUsed.toFixed(1)}%)`);
      
      return {
        usage,
        quota,
        percentUsed,
        available: quota - usage
      };
    }
    
    return null;
  }

  // Request persistent storage permission
  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
      return isPersisted;
    }
    return false;
  }
}