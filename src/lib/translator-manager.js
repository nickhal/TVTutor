// src/lib/translator-manager.js

import { Translator } from './translator.js';
import { BergamotTranslator } from './bergamot-translator.js';

export class TranslatorManager {
  constructor() {
    this.bergamotTranslator = null;
    this.googleTranslator = null;
    this.primaryProvider = 'bergamot';
    this.fallbackEnabled = true;
    this.initialized = false;
    this.metrics = {
      bergamotSuccesses: 0,
      bergamotFailures: 0,
      googleFallbacks: 0,
      averageLatency: 0,
      totalTranslations: 0
    };
  }

  async initialize() {
    console.log("Initializing TranslatorManager...");
    
    // Initialize Google Translate as fallback
    this.googleTranslator = new Translator();
    await this.googleTranslator.initialize();
    
    // Try to initialize Bergamot
    try {
      this.bergamotTranslator = new BergamotTranslator();
      await this.bergamotTranslator.initialize();
      
      console.log("Bergamot translator initialized successfully");
      this.primaryProvider = 'bergamot';
    } catch (error) {
      console.error("Failed to initialize Bergamot translator:", error);
      console.log("Falling back to Google Translate only");
      this.primaryProvider = 'google';
    }
    
    this.initialized = true;
    return this.primaryProvider;
  }

  async translate(text, options = {}) {
    const {
      useCache = true,
      includeAlignment = true,
      includeColors = true,
      forceProvider = null
    } = options;

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = performance.now();
    let result = null;
    let provider = forceProvider || this.primaryProvider;

    // Try primary provider
    if (provider === 'bergamot' && this.bergamotTranslator) {
      try {
        result = await this.bergamotTranslator.translate(text, {
          useCache,
          includeAlignment,
          includeColors,
          fallbackToGoogle: false
        });
        
        this.metrics.bergamotSuccesses++;
        provider = 'bergamot';
      } catch (error) {
        console.error("Bergamot translation failed:", error);
        this.metrics.bergamotFailures++;
        
        // Try fallback if enabled
        if (this.fallbackEnabled) {
          provider = 'google';
        } else {
          throw error;
        }
      }
    }

    // Use Google Translate if needed
    if (!result && provider === 'google' && this.googleTranslator) {
      try {
        const googleTranslation = await this.googleTranslator.translate(text, { useCache });
        
        // Format result to match Bergamot structure
        result = {
          text: googleTranslation,
          originalText: text,
          provider: 'google',
          fallback: true,
          alignment: null,
          colors: null
        };
        
        this.metrics.googleFallbacks++;
      } catch (error) {
        console.error("Google translation also failed:", error);
        throw new Error("All translation providers failed");
      }
    }

    // Update metrics
    const latency = performance.now() - startTime;
    this.updateMetrics(latency);

    // Add provider info to result
    if (result) {
      result.provider = provider;
      result.latency = latency;
    }

    return result;
  }

  async translateBatch(texts, options = {}) {
    // Try Bergamot batch translation first
    if (this.primaryProvider === 'bergamot' && this.bergamotTranslator) {
      try {
        return await this.bergamotTranslator.translateBatch(texts);
      } catch (error) {
        console.error("Bergamot batch translation failed:", error);
      }
    }

    // Fall back to individual translations
    const results = {};
    for (const text of texts) {
      try {
        const translation = await this.translate(text, options);
        results[text] = translation;
      } catch (error) {
        console.error(`Failed to translate "${text}":`, error);
        results[text] = null;
      }
    }
    
    return results;
  }

  async preTranslate(upcomingTexts) {
    // Only use Bergamot for pre-translation (for performance)
    if (this.bergamotTranslator) {
      try {
        await this.bergamotTranslator.preTranslate(upcomingTexts);
      } catch (error) {
        console.error("Pre-translation failed:", error);
      }
    }
  }

  updateMetrics(latency) {
    this.metrics.totalTranslations++;
    
    // Update average latency
    const currentTotal = this.metrics.averageLatency * (this.metrics.totalTranslations - 1);
    this.metrics.averageLatency = (currentTotal + latency) / this.metrics.totalTranslations;
  }

  getMetrics() {
    const bergamotMetrics = this.bergamotTranslator ? 
      this.bergamotTranslator.getMetrics() : null;
    
    return {
      ...this.metrics,
      primaryProvider: this.primaryProvider,
      fallbackEnabled: this.fallbackEnabled,
      bergamotReady: bergamotMetrics?.ready || false,
      bergamotModelLoaded: bergamotMetrics?.modelLoaded || false,
      googleCacheSize: this.googleTranslator?.getCacheSize() || 0,
      bergamotCacheSize: bergamotMetrics?.cacheSize || 0,
      successRate: this.metrics.totalTranslations > 0 ?
        (this.metrics.bergamotSuccesses / this.metrics.totalTranslations) * 100 : 0
    };
  }

  async switchProvider(provider) {
    if (provider === 'bergamot') {
      if (!this.bergamotTranslator) {
        this.bergamotTranslator = new BergamotTranslator();
        await this.bergamotTranslator.initialize();
      }
      this.primaryProvider = 'bergamot';
    } else if (provider === 'google') {
      if (!this.googleTranslator) {
        this.googleTranslator = new Translator();
        await this.googleTranslator.initialize();
      }
      this.primaryProvider = 'google';
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    console.log(`Switched to ${provider} as primary provider`);
    return this.primaryProvider;
  }

  setFallbackEnabled(enabled) {
    this.fallbackEnabled = enabled;
    console.log(`Fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  clearCache() {
    if (this.bergamotTranslator) {
      this.bergamotTranslator.clearCache();
    }
    if (this.googleTranslator) {
      this.googleTranslator.clearCache();
    }
    console.log("All translation caches cleared");
  }

  async dispose() {
    if (this.bergamotTranslator) {
      await this.bergamotTranslator.dispose();
      this.bergamotTranslator = null;
    }
    
    this.googleTranslator = null;
    this.initialized = false;
    
    console.log("TranslatorManager disposed");
  }

  // Get status of all translation providers
  getStatus() {
    return {
      initialized: this.initialized,
      primaryProvider: this.primaryProvider,
      providers: {
        bergamot: {
          available: !!this.bergamotTranslator,
          ready: this.bergamotTranslator?.translatorReady || false,
          modelLoaded: this.bergamotTranslator?.modelLoaded || false
        },
        google: {
          available: !!this.googleTranslator,
          ready: this.googleTranslator?.isInitialized() || false
        }
      },
      fallbackEnabled: this.fallbackEnabled
    };
  }
}