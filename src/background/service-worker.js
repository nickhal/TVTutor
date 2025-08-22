// src/background/service-worker.js
import { Translator } from "../lib/translator.js";
import { StorageManager } from "../lib/storage-manager.js";
import { config } from "../shared/config.js";

class ServiceWorker {
  constructor() {
    this.translator = new Translator();
    this.storage = new StorageManager();
    this.translationAPIStatus = null;

    this.initializeTranslator();
    this.setupMessageHandlers();
    this.setupInstallHandler();
  }

  async initializeTranslator() {
    console.log("Service Worker: Initializing translator...");
    
    // Initialize translator with Google Translate unofficial API
    const provider = await this.translator.initialize();
    console.log("Translator initialized with provider:", provider);
    
    this.translationAPIStatus = {
      available: false,
      reason: "Chrome Translation API not yet shipped",
      provider: provider,
      chromeVersion: self.navigator?.userAgent?.match(/Chrome\/(\d+)/)?.[1] || "unknown",
    };
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Service worker received message:", request.type);

      // Handle async responses properly
      (async () => {
        try {
          switch (request.type) {
            case "TRANSLATE":
              const translationResult = await this.handleTranslate(
                request.data
              );
              sendResponse(translationResult);
              break;

            case "CHECK_TRANSLATION_API":
              const status = await this.checkTranslationAPI();
              sendResponse(status);
              break;

            case "GET_SETTINGS":
              const settings = await this.storage.getSettings();
              sendResponse(settings);
              break;

            case "SAVE_SETTINGS":
              await this.storage.saveSettings(request.data);
              sendResponse({ success: true });
              break;

            case "EXPORT_WORDS":
              const exportResult = await this.handleExportWords();
              sendResponse(exportResult);
              break;

            case "PING":
              // Handle PING request for test page
              sendResponse({
                status: "ok",
                translatorAvailable: !!this.translator.chromeTranslator,
                translationApiExists: typeof Translator !== 'undefined',
                translatorGlobalExists: typeof Translator !== 'undefined',
                translationAPIStatus: this.translationAPIStatus,
                provider: this.translator.provider
              });
              break;

            default:
              console.warn("Unknown message type:", request.type);
              sendResponse({ error: "Unknown message type" });
          }
        } catch (error) {
          console.error("Error handling message:", error);
          sendResponse({ error: error.message });
        }
      })();

      return true; // Keep channel open for async response
    });
  }

  setupInstallHandler() {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log("Extension installed:", details);

      // Set default settings on first install
      if (details.reason === "install") {
        this.storage.saveSettings(config);

        // Open test page for debugging
        chrome.tabs.create({
          url: chrome.runtime.getURL("test.html"),
        });
      }
    });
  }

  async checkTranslationAPI() {
    // Re-check the API status
    if (self.translation) {
      try {
        const canTranslate = await self.translation.canTranslate({
          sourceLanguage: "id",
          targetLanguage: "en",
        });

        // Try to create a translator
        let translatorCreated = false;
        if (canTranslate !== "no") {
          try {
            const testTranslator = await self.translation.createTranslator({
              sourceLanguage: "id",
              targetLanguage: "en",
            });
            translatorCreated = true;

            // Test translation
            const testResult = await testTranslator.translate("halo");

            return {
              available: true,
              canTranslate: canTranslate,
              translatorCreated: true,
              testTranslation: testResult,
              provider: this.translator.getProvider(),
              chromeVersion:
                self.navigator?.userAgent?.match(/Chrome\/(\d+)/)?.[1] ||
                "unknown",
            };
          } catch (e) {
            return {
              available: true,
              canTranslate: canTranslate,
              translatorCreated: false,
              error: e.message,
              provider: this.translator.getProvider(),
              chromeVersion:
                self.navigator?.userAgent?.match(/Chrome\/(\d+)/)?.[1] ||
                "unknown",
            };
          }
        }

        return {
          available: true,
          canTranslate: canTranslate,
          translatorCreated: false,
          provider: this.translator.getProvider(),
          chromeVersion:
            self.navigator?.userAgent?.match(/Chrome\/(\d+)/)?.[1] || "unknown",
        };
      } catch (error) {
        return {
          available: false,
          error: error.message,
          provider: this.translator.getProvider(),
          chromeVersion:
            self.navigator?.userAgent?.match(/Chrome\/(\d+)/)?.[1] || "unknown",
        };
      }
    } else {
      return {
        available: false,
        reason: "self.translation API not found",
        provider: this.translator.getProvider(),
        chromeVersion:
          self.navigator?.userAgent?.match(/Chrome\/(\d+)/)?.[1] || "unknown",
        note: "Chrome 114+ required for built-in translation API",
      };
    }
  }

  async handleTranslate(data) {
    const { word, context } = data;

    try {
      // Ensure translator is initialized
      if (!this.translator.isInitialized()) {
        console.log("Translator not initialized, initializing now...");
        await this.translator.initialize();
      }

      // Check cache first
      let definition = await this.storage.getCachedTranslation(word);

      if (!definition) {
        // Translate the word
        console.log(`Service Worker: Translating "${word}"`);
        definition = await this.translator.translate(word, { context });

        // Save to cache if successful
        if (definition && !definition.startsWith("[Unable to translate")) {
          await this.storage.saveToCache(word, definition);
        }
      } else {
        console.log(`Service Worker: Found "${word}" in cache`);
      }

      return {
        word: word,
        definition: definition,
        timestamp: Date.now(),
        provider: this.translator.getProvider(),
        cached: !!definition,
      };
    } catch (error) {
      console.error("Service Worker: Translation error:", error);
      return {
        word: word,
        definition: `Translation failed: ${error.message}`,
        error: error.message,
        timestamp: Date.now(),
        provider: this.translator.getProvider(),
      };
    }
  }

  async handleExportWords() {
    const words = await this.storage.getAllWords();

    if (words.length === 0) {
      return { error: "No words to export" };
    }

    // Format for CSV export
    const csv = this.formatAsCSV(words);

    // Create blob and download URL
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // Trigger download
    try {
      await chrome.downloads.download({
        url: url,
        filename: `indonesian-words-${Date.now()}.csv`,
        saveAs: true,
      });

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      return { success: true, count: words.length };
    } catch (error) {
      console.error("Export error:", error);
      return { error: error.message };
    }
  }

  formatAsCSV(words) {
    const headers = ["Word", "Definition", "Context", "Platform", "Date Added"];
    const rows = words.map((word) => [
      word.word || "",
      word.definition || "",
      word.context || "",
      word.platform || "",
      word.timestamp || word.createdAt || "",
    ]);

    // Properly escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '""';
      const str = String(value);
      if (str.includes('"') || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Add BOM for Excel compatibility
    return "\ufeff" + csvContent;
  }
}

// Initialize service worker
new ServiceWorker();
