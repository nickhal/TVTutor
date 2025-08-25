// src/lib/bergamot-translator.js
import { Translator } from './translator.js';

export class BergamotTranslator extends Translator {
  constructor() {
    super();
    this.worker = null;
    this.modelLoaded = false;
    this.translatorReady = false;
    this.pendingTranslations = new Map();
    this.translationId = 0;
    this.modelPath = '/public/models/iden/';
    this.aligner = null;
    this.colorCoordinator = null;
  }

  async initialize() {
    console.log("Initializing Bergamot translator...");
    
    try {
      // Create Web Worker for translation
      this.worker = new Worker('/src/workers/translation.worker.js');
      
      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      // Initialize the translator in the worker
      await this.initializeWorker();
      
      // Load the Indonesian-English model
      await this.loadModel('iden');
      
      // Initialize alignment engine
      const { AlignmentEngine } = await import('./alignment-engine.js');
      this.aligner = new AlignmentEngine();
      await this.aligner.initialize();
      
      // Initialize color coordinator
      const { ColorCoordinator } = await import('./color-coordinator.js');
      this.colorCoordinator = new ColorCoordinator();
      await this.colorCoordinator.initialize();
      
      this.provider = 'bergamot';
      this.initialized = true;
      this.translatorReady = true;
      
      console.log("Bergamot translator initialized successfully");
      return this.provider;
    } catch (error) {
      console.error("Failed to initialize Bergamot translator:", error);
      // Fall back to parent class initialization (Google Translate)
      return super.initialize();
    }
  }

  async initializeWorker() {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 10000);

      const messageHandler = (event) => {
        if (event.data.type === 'initialized') {
          clearTimeout(timeoutId);
          this.worker.removeEventListener('message', messageHandler);
          resolve();
        } else if (event.data.type === 'error') {
          clearTimeout(timeoutId);
          this.worker.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        }
      };

      this.worker.addEventListener('message', messageHandler);
      this.worker.postMessage({ 
        action: 'initialize',
        wasmPath: '/public/models/bergamot-translator-worker.wasm'
      });
    });
  }

  async loadModel(languagePair) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Model loading timeout'));
      }, 30000);

      const messageHandler = (event) => {
        if (event.data.type === 'modelLoaded') {
          clearTimeout(timeoutId);
          this.worker.removeEventListener('message', messageHandler);
          this.modelLoaded = true;
          console.log(`Model ${languagePair} loaded successfully`);
          resolve();
        } else if (event.data.type === 'error') {
          clearTimeout(timeoutId);
          this.worker.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        }
      };

      this.worker.addEventListener('message', messageHandler);
      
      // Paths to model files (these will need to be downloaded from Mozilla's repo)
      const modelFiles = {
        model: `${this.modelPath}model.iden.intgemm.alphas.bin`,
        vocab: `${this.modelPath}vocab.iden.spm`,
        lex: `${this.modelPath}lex.50.50.iden.s2t.bin`,
        config: `${this.modelPath}config.intgemm8bit.yml`
      };

      this.worker.postMessage({ 
        action: 'loadModel',
        languagePair: languagePair,
        modelFiles: modelFiles
      });
    });
  }

  handleWorkerMessage(event) {
    const { type, id, data, error } = event.data;
    
    if (type === 'translation' && this.pendingTranslations.has(id)) {
      const { resolve, reject } = this.pendingTranslations.get(id);
      this.pendingTranslations.delete(id);
      
      if (error) {
        reject(new Error(error));
      } else {
        resolve(data);
      }
    }
  }

  handleWorkerError(error) {
    console.error('Worker error:', error);
    // Reject all pending translations
    for (const [id, { reject }] of this.pendingTranslations) {
      reject(error);
    }
    this.pendingTranslations.clear();
  }

  async translate(text, options = {}) {
    const { 
      useCache = true, 
      includeAlignment = true, 
      includeColors = true,
      fallbackToGoogle = true 
    } = options;

    // Clean the text
    const cleanText = text.trim();
    if (!cleanText) return "";

    // Check cache first
    if (useCache && this.cache.has(cleanText)) {
      console.log("Translation from cache:", cleanText);
      return this.cache.get(cleanText);
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // If Bergamot is not ready, fall back to Google
    if (!this.translatorReady && fallbackToGoogle) {
      console.log("Bergamot not ready, falling back to Google Translate");
      return super.translate(text, options);
    }

    const startTime = performance.now();

    try {
      // Get translation from Bergamot
      const translationResult = await this.translateWithBergamot(cleanText);
      
      let result = {
        text: translationResult.text,
        originalText: cleanText,
        latency: performance.now() - startTime
      };

      // Add alignment if requested
      if (includeAlignment && this.aligner) {
        result.alignment = await this.aligner.align(
          cleanText,
          translationResult.text,
          translationResult.sourceTokens,
          translationResult.targetTokens
        );
      }

      // Add colors if requested
      if (includeColors && this.colorCoordinator && result.alignment) {
        result.colors = await this.colorCoordinator.assignColors(
          result.alignment,
          translationResult.sourceTokens,
          translationResult.targetTokens
        );
      }

      const duration = performance.now() - startTime;
      console.log(`Bergamot translation in ${duration.toFixed(2)}ms: ${result.text}`);

      // Cache the result
      if (useCache) {
        this.cache.set(cleanText, result);
        
        // Limit cache size
        if (this.cache.size > 1000) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      return result;
    } catch (error) {
      console.error("Bergamot translation failed:", error);
      
      // Fall back to Google Translate if enabled
      if (fallbackToGoogle) {
        console.log("Falling back to Google Translate");
        const googleTranslation = await super.translate(text, options);
        return {
          text: googleTranslation,
          originalText: cleanText,
          fallback: true
        };
      }
      
      throw error;
    }
  }

  async translateWithBergamot(text) {
    return new Promise((resolve, reject) => {
      const translationId = this.translationId++;
      
      // Store the promise callbacks
      this.pendingTranslations.set(translationId, { resolve, reject });
      
      // Set a timeout for the translation
      const timeoutId = setTimeout(() => {
        if (this.pendingTranslations.has(translationId)) {
          this.pendingTranslations.delete(translationId);
          reject(new Error('Translation timeout'));
        }
      }, 5000);

      // Send translation request to worker
      this.worker.postMessage({
        action: 'translate',
        id: translationId,
        text: text,
        source: 'id',
        target: 'en'
      });

      // Clear timeout when promise resolves
      const originalResolve = this.pendingTranslations.get(translationId).resolve;
      this.pendingTranslations.get(translationId).resolve = (data) => {
        clearTimeout(timeoutId);
        originalResolve(data);
      };
    });
  }

  async translateBatch(texts) {
    // Optimized batch translation
    const startTime = performance.now();
    
    // Send all texts to worker at once
    const batchPromise = new Promise((resolve, reject) => {
      const id = this.translationId++;
      
      this.pendingTranslations.set(id, { resolve, reject });
      
      this.worker.postMessage({
        action: 'translateBatch',
        id: id,
        texts: texts,
        source: 'id',
        target: 'en'
      });
    });

    try {
      const results = await batchPromise;
      const duration = performance.now() - startTime;
      console.log(`Batch translation of ${texts.length} texts in ${duration.toFixed(2)}ms`);
      return results;
    } catch (error) {
      console.error("Batch translation failed:", error);
      // Fall back to individual translations
      return super.translateBatch(texts);
    }
  }

  // Pre-translate upcoming subtitles for zero-latency display
  async preTranslate(upcomingTexts) {
    console.log(`Pre-translating ${upcomingTexts.length} upcoming subtitles`);
    
    // Filter out already cached texts
    const uncachedTexts = upcomingTexts.filter(text => !this.cache.has(text.trim()));
    
    if (uncachedTexts.length === 0) {
      console.log("All upcoming texts already cached");
      return;
    }

    // Translate in background without waiting
    this.translateBatch(uncachedTexts).then(results => {
      // Cache the results
      Object.entries(results).forEach(([original, translation]) => {
        this.cache.set(original.trim(), translation);
      });
      console.log(`Pre-translated and cached ${uncachedTexts.length} texts`);
    }).catch(error => {
      console.error("Pre-translation failed:", error);
    });
  }

  // Clean up resources
  async dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.pendingTranslations.clear();
    this.cache.clear();
    this.translatorReady = false;
    this.modelLoaded = false;
    this.initialized = false;
  }

  // Get translation metrics
  getMetrics() {
    return {
      provider: this.provider,
      cacheSize: this.cache.size,
      modelLoaded: this.modelLoaded,
      ready: this.translatorReady,
      pendingTranslations: this.pendingTranslations.size
    };
  }
}