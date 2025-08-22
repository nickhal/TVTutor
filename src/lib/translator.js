// src/lib/translator.js
export class Translator {
  constructor() {
    this.cache = new Map();
    this.provider = null;
    this.chromeTranslator = null;
    this.initialized = false;
  }

  async initialize() {
    console.log("Initializing translator...");
    
    // Since Chrome Translation API is not yet available, just use Google Translate
    this.provider = "google-unofficial";
    console.log("Using Google Translate unofficial API for translation");
    
    this.initialized = true;
    return this.provider;
  }

  async translate(text, options = {}) {
    const { useCache = true, context = null } = options;

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Clean the text
    const cleanText = text.trim();
    if (!cleanText) return "";

    // Check cache
    if (useCache && this.cache.has(cleanText)) {
      console.log("Translation from cache:", cleanText);
      return this.cache.get(cleanText);
    }

    let translation = null;
    const startTime = performance.now();

    // Try translation with current provider
    try {
      console.log(`Translating "${cleanText}" with provider: ${this.provider}`);

      switch (this.provider) {
        case "chrome":
          translation = await this.translateWithChrome(cleanText);
          break;
        case "google-unofficial":
          translation = await this.translateWithGoogleUnofficial(cleanText);
          break;
        case "libretranslate":
          translation = await this.translateWithLibreTranslate(cleanText);
          break;
      }

      if (translation) {
        const duration = performance.now() - startTime;
        console.log(
          `Translation successful in ${duration.toFixed(2)}ms: ${translation}`
        );

        // Cache successful translation
        this.cache.set(cleanText, translation);

        // Limit cache size
        if (this.cache.size > 1000) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }

        return translation;
      }
    } catch (error) {
      console.error(`Translation failed with ${this.provider}:`, error);
    }

    // Try fallback providers in order
    const fallbackProviders = [
      {
        name: "google-unofficial",
        method: this.translateWithGoogleUnofficial.bind(this),
      },
      {
        name: "libretranslate",
        method: this.translateWithLibreTranslate.bind(this),
      },
      { name: "mymemory", method: this.translateWithMyMemory.bind(this) },
    ];

    for (const fallback of fallbackProviders) {
      if (fallback.name === this.provider) continue; // Skip if already tried

      try {
        console.log(`Trying fallback: ${fallback.name}`);
        translation = await fallback.method(cleanText);

        if (translation) {
          console.log(`Fallback ${fallback.name} successful: ${translation}`);
          this.cache.set(cleanText, translation);
          return translation;
        }
      } catch (error) {
        console.error(`Fallback ${fallback.name} failed:`, error);
      }
    }

    // If all methods fail, return the original text with indicator
    console.error("All translation methods failed");
    return `[Unable to translate: ${cleanText}]`;
  }

  async translateWithChrome(text) {
    if (!this.chromeTranslator) {
      throw new Error("Chrome translator not initialized");
    }

    try {
      const result = await this.chromeTranslator.translate(text);
      console.log("Chrome translation result:", result);
      return result;
    } catch (error) {
      console.error("Chrome translation error:", error);
      throw error;
    }
  }

  async translateWithGoogleUnofficial(text) {
    try {
      // Using Google Translate's unofficial API endpoint
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=en&dt=t&q=${encodeURIComponent(
        text
      )}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Google Translate unofficial API error: ${response.status}`
        );
      }

      const data = await response.json();

      // The response is nested arrays, extract the translation
      if (data && data[0]) {
        let translation = "";
        for (let i = 0; i < data[0].length; i++) {
          if (data[0][i] && data[0][i][0]) {
            translation += data[0][i][0];
          }
        }
        if (translation) {
          return translation.trim();
        }
      }

      throw new Error("Unexpected Google Translate response format");
    } catch (error) {
      console.error("Google Translate unofficial error:", error);
      throw error;
    }
  }

  async translateWithLibreTranslate(text) {
    try {
      // Try multiple LibreTranslate instances
      const instances = [
        "https://libretranslate.com",
        "https://translate.argosopentech.com",
        "https://libretranslate.de",
      ];

      for (const baseUrl of instances) {
        try {
          const response = await fetch(`${baseUrl}/translate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: text,
              source: "id",
              target: "en",
              format: "text",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.translatedText) {
              console.log(`LibreTranslate (${baseUrl}) successful`);
              return data.translatedText;
            }
          }
        } catch (err) {
          console.warn(`LibreTranslate instance ${baseUrl} failed:`, err);
        }
      }

      throw new Error("All LibreTranslate instances failed");
    } catch (error) {
      console.error("LibreTranslate error:", error);
      throw error;
    }
  }

  async translateWithMyMemory(text) {
    try {
      // MyMemory Translation API (free tier: 5000 chars/day)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=id|en`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`MyMemory API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }

      throw new Error("Unexpected MyMemory response format");
    } catch (error) {
      console.error("MyMemory translation error:", error);
      throw error;
    }
  }

  async translateBatch(texts) {
    // Translate multiple texts efficiently
    const translations = await Promise.all(
      texts.map((text) => this.translate(text))
    );

    return texts.reduce((acc, text, index) => {
      acc[text] = translations[index];
      return acc;
    }, {});
  }

  clearCache() {
    this.cache.clear();
    console.log("Translation cache cleared");
  }

  getCacheSize() {
    return this.cache.size;
  }

  isInitialized() {
    return this.initialized;
  }

  getProvider() {
    return this.provider;
  }
}
