// Bundled content script for Chrome extension - Simplified version
// Assumes all subtitles are Indonesian and translates them

(function () {
  "use strict";

  // Platform Detector
  const PlatformDetector = {
    detect() {
      const hostname = window.location.hostname;
      if (hostname.includes("netflix.com")) return "netflix";
      if (hostname.includes("youtube.com")) return "youtube";
      return "unknown";
    },

    isSupported() {
      const platform = this.detect();
      return platform === "netflix" || platform === "youtube";
    },
  };

  // Storage Manager (simplified for content script)
  class StorageManager {
    constructor() {
      this.useChrome = typeof chrome !== "undefined" && chrome.storage;
    }

    async saveWord(wordData) {
      if (this.useChrome) {
        try {
          const result = await chrome.storage.local.get("savedWords");
          const words = result.savedWords || [];
          words.push(wordData);
          await chrome.storage.local.set({ savedWords: words });
          return true;
        } catch (error) {
          console.error("Error saving word:", error);
        }
      }
      return false;
    }
  }

  // Overlay Manager
  class OverlayManager {
    constructor() {
      this.container = null;
      this.subtitleDiv = null;
      this.debugDiv = null;
      this.currentSubtitle = "";
      this.translationCache = new Map();
      this.subtitleStartTime = null;
      this.subtitleEndTime = null;
      this.displayTimeout = null;
      this.lastTranslationShowTime = null;
      this.init();
    }

    init() {
      // Create main container
      this.container = document.createElement("div");
      this.container.className = "indonesian-learning-overlay";
      this.container.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        pointer-events: none;
        width: 80%;
        max-width: 800px;
      `;

      // Create subtitle display
      this.subtitleDiv = document.createElement("div");
      this.subtitleDiv.className = "subtitle-display";
      this.subtitleDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.5);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-size: 20px;
        text-align: center;
        pointer-events: auto;
        margin-bottom: 10px;
        backdrop-filter: blur(10px);
        display: none;
      `;

      // Create debug panel
      this.debugDiv = document.createElement("div");
      this.debugDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: #0f0;
        padding: 15px;
        border-radius: 8px;
        font-size: 13px;
        font-family: monospace;
        z-index: 999999;
        min-width: 400px;
        max-width: 500px;
        max-height: 400px;
        overflow-y: auto;
        pointer-events: auto;
        border: 1px solid #0f0;
        user-select: text;
        cursor: default;
      `;
      this.debugDiv.innerHTML = "<b>Debug Panel</b><br>Waiting for subtitles...";
      this.debugLog = [];
      this.debugEntries = []; // Store raw data for copying
      
      // Add click handler for copying
      this.debugDiv.addEventListener('click', (e) => {
        // Check if clicked on an error line
        const line = e.target.closest('.debug-line');
        if (line && line.dataset.message) {
          // Copy to clipboard
          navigator.clipboard.writeText(line.dataset.message).then(() => {
            // Show feedback
            const original = line.style.background;
            line.style.background = 'rgba(0, 255, 0, 0.2)';
            line.style.transition = 'background 0.3s';
            
            // Create "Copied!" tooltip
            const tooltip = document.createElement('div');
            tooltip.textContent = '📋 Copied!';
            tooltip.style.cssText = `
              position: absolute;
              background: #0f0;
              color: #000;
              padding: 5px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              pointer-events: none;
              z-index: 9999999;
              animation: fadeOut 1s forwards;
            `;
            
            // Add animation
            const style = document.createElement('style');
            style.textContent = `
              @keyframes fadeOut {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
              }
            `;
            document.head.appendChild(style);
            
            // Position tooltip
            const rect = line.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.top - 30) + 'px';
            document.body.appendChild(tooltip);
            
            // Clean up
            setTimeout(() => {
              line.style.background = original;
              tooltip.remove();
              style.remove();
            }, 1000);
          }).catch(err => {
            console.error('Failed to copy:', err);
          });
        }
      });

      this.container.appendChild(this.subtitleDiv);
      document.body.appendChild(this.container);
      document.body.appendChild(this.debugDiv);

      console.log("Overlay initialized");
    }

    updateDebug(message, isError = false, fullDetails = null) {
      if (this.debugDiv) {
        const time = new Date().toLocaleTimeString();
        const color = isError ? '#f00' : '#0f0';
        
        // Use full details for copying if provided, otherwise use message
        const copyText = fullDetails || message;
        
        // Create clickable line with full message in data attribute
        const entry = `
          <div class="debug-line" 
               data-message="${copyText.replace(/"/g, '&quot;')}"
               style="
                 padding: 2px 4px;
                 margin: 1px 0;
                 border-radius: 3px;
                 cursor: pointer;
                 transition: background 0.2s;
               "
               onmouseover="this.style.background='rgba(255,255,255,0.1)'"
               onmouseout="this.style.background='transparent'">
            <span style="color: ${color}">[${time}] ${message}</span>
            ${fullDetails ? '<span style="color: #888; font-size: 10px;"> (click for full details)</span>' : ''}
          </div>
        `;
        
        // Add to log
        this.debugLog.push(entry);
        this.debugEntries.push({ time, message, isError, fullDetails });
        
        // Keep only last 10 entries
        if (this.debugLog.length > 10) {
          this.debugLog.shift();
          this.debugEntries.shift();
        }
        
        // Update display
        this.debugDiv.innerHTML = `
          <div style="
            color: #fff; 
            border-bottom: 1px solid #0f0; 
            padding-bottom: 5px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <b>🔍 Translation Debug Panel</b>
            <span style="font-size: 10px; color: #888;">Click any line to copy</span>
          </div>
          ${this.debugLog.join('')}
        `;
      }
    }
    
    updateDebugWithDetails(summary, fullDetails, isError = false) {
      this.updateDebug(summary, isError, fullDetails);
    }

    hideTranslation() {
      this.subtitleDiv.style.display = "none";
      this.lastTranslationShowTime = null;
      console.log("Translation hidden");
    }

    async displaySubtitle(text) {
      // Handle subtitle ending
      if (!text || text === "") {
        // Record when the subtitle ended
        if (this.currentSubtitle && this.subtitleStartTime) {
          this.subtitleEndTime = performance.now();
          const originalDuration = this.subtitleEndTime - this.subtitleStartTime;
          console.log(`Original subtitle displayed for ${originalDuration.toFixed(0)}ms`);
          
          // If translation is showing, keep it visible for the full original duration
          if (this.lastTranslationShowTime) {
            const translationAge = performance.now() - this.lastTranslationShowTime;
            const remainingTime = originalDuration - translationAge;
            
            console.log(`Translation has been showing for ${translationAge.toFixed(0)}ms, keeping visible for ${remainingTime.toFixed(0)}ms more`);
            
            if (this.displayTimeout) {
              clearTimeout(this.displayTimeout);
            }
            
            if (remainingTime > 0) {
              this.displayTimeout = setTimeout(() => {
                this.hideTranslation();
              }, remainingTime);
            } else {
              // Translation has already been shown long enough
              this.hideTranslation();
            }
          }
        }
        this.currentSubtitle = "";
        this.subtitleStartTime = null;
        return;
      }

      // Skip if this is the same subtitle we're already showing
      if (this.currentSubtitle === text) {
        return;
      }

      // Clear any existing display timeout
      if (this.displayTimeout) {
        clearTimeout(this.displayTimeout);
        this.displayTimeout = null;
      }

      // Record when this new subtitle started
      this.subtitleStartTime = performance.now();
      
      // Update current subtitle
      this.currentSubtitle = text;

      // Update debug with original text
      const startTime = performance.now();
      this.updateDebug(`📝 Original: "${text.substring(0, 40)}..."`);

      let translation = "";
      let translationMethod = "none";

      // Check cache first
      if (this.translationCache.has(text)) {
        translation = this.translationCache.get(text);
        translationMethod = "cache";
        const elapsed = (performance.now() - startTime).toFixed(1);
        this.updateDebug(`⚡ CACHE hit (${elapsed}ms)`);
      } else {
        // Try Chrome Translation API via service worker
        try {
          if (
            typeof chrome !== "undefined" &&
            chrome.runtime &&
            chrome.runtime.sendMessage
          ) {
            this.updateDebug(`🔄 Calling Chrome API...`);
            const apiStart = performance.now();
            const response = await chrome.runtime.sendMessage({
              type: "TRANSLATE",
              data: { word: text },
            });
            const apiTime = (performance.now() - apiStart).toFixed(1);

            // Log full response for debugging
            console.log("Chrome API response:", response);

            // Create detailed response info for debugging
            const responseInfo = {
              response: response,
              responseType: typeof response,
              hasTranslation: !!response?.translation,
              translationValue: response?.translation,
              hasError: !!response?.error,
              errorValue: response?.error,
              responseKeys: response ? Object.keys(response) : [],
              fullResponse: JSON.stringify(response, null, 2)
            };

            // Check for different response formats
            if (response) {
              if (response.success && response.translation) {
                // New format with success flag
                translation = response.translation;
                translationMethod = "chrome-api";
                this.translationCache.set(text, translation);
                this.updateDebug(`✅ Chrome Translate API success (${apiTime}ms)`);
              } else if (response.definition) {
                // Service worker format with definition field
                translation = response.definition;
                translationMethod = response.provider || "google-unofficial";
                this.translationCache.set(text, translation);
                this.updateDebug(`✅ Translation success via ${translationMethod} (${apiTime}ms)`);
              } else if (response.translation) {
                // Simple format with just translation
                translation = response.translation;
                translationMethod = response.method || "unknown";
                this.translationCache.set(text, translation);
                this.updateDebug(`✅ Translation success (${apiTime}ms)`);
              } else {
                // No translation available - show error details
                const errorDetails = {
                  error: response?.error || 'Unknown format',
                  response: response
                };
                
                this.updateDebugWithDetails(
                  `❌ Translation failed: ${response?.error || 'Unknown format'}`,
                  JSON.stringify(errorDetails, null, 2),
                  true
                );
                
                // Fallback to dictionary
                translation = this.translateIndonesian(text);
                translationMethod = "dictionary";
                this.translationCache.set(text, translation);
              }
            } else {
              // No response at all
              translation = this.translateIndonesian(text);
              translationMethod = "dictionary";
              this.translationCache.set(text, translation);
            }
          } else {
            throw new Error("Chrome runtime not available");
          }
        } catch (error) {
          // Fallback to dictionary
          const fullError = {
            errorMessage: error.message,
            errorStack: error.stack,
            chromeAvailable: typeof chrome !== "undefined",
            runtimeAvailable: chrome?.runtime,
            sendMessageAvailable: chrome?.runtime?.sendMessage
          };
          
          this.updateDebugWithDetails(
            `❌ Chrome API failed: ${error.message}`,
            JSON.stringify(fullError, null, 2),
            true
          );
          this.updateDebug(`📖 Using dictionary fallback`);
          translation = this.translateIndonesian(text);
          translationMethod = "dictionary";
          this.translationCache.set(text, translation);
        }
      }

      // Clear and display the English translation
      this.subtitleDiv.style.display = "block";
      this.subtitleDiv.textContent = ""; // Clear any existing content
      this.subtitleDiv.innerHTML = ""; // Ensure it's completely empty
      
      // Track when we show this translation
      this.lastTranslationShowTime = performance.now();

      // Show final result in debug
      const totalTime = (performance.now() - startTime).toFixed(1);
      this.updateDebug(
        `✨ [${translationMethod.toUpperCase()}] Result: "${translation.substring(0, 40)}..." (${totalTime}ms total)`
      );
      
      // Calculate how long the translation arrived after the subtitle started
      const translationDelay = performance.now() - this.subtitleStartTime;
      console.log(`Translation arrived ${translationDelay.toFixed(0)}ms after subtitle start`);

      // Create clickable words
      const words = translation.split(/\s+/);
      const originalWords = text.split(/\s+/);

      words.forEach((word, index) => {
        const span = document.createElement("span");
        span.textContent = word + " ";
        span.style.cssText = `
          cursor: pointer;
          display: inline;
          transition: all 0.2s;
        `;

        // Store original Indonesian word
        const originalWord =
          originalWords[index] || originalWords[originalWords.length - 1];
        span.dataset.original = originalWord;

        span.addEventListener("mouseenter", () => {
          span.style.backgroundColor = "rgba(59, 130, 246, 0.5)";
          span.style.padding = "2px 4px";
          span.style.borderRadius = "4px";
        });

        span.addEventListener("mouseleave", () => {
          span.style.backgroundColor = "transparent";
          span.style.padding = "0";
        });

        span.addEventListener("click", (e) => {
          e.stopPropagation();
          this.handleWordClick(originalWord, text);
        });

        this.subtitleDiv.appendChild(span);
      });
    }

    translateIndonesian(text) {
      // Basic Indonesian to English dictionary
      // This will be replaced with Chrome Translate API later
      const dictionary = {
        // Common words
        aku: "I",
        saya: "I",
        kamu: "you",
        dia: "he/she",
        kita: "we",
        mereka: "they",
        ini: "this",
        itu: "that",
        dan: "and",
        atau: "or",
        tetapi: "but",
        karena: "because",
        untuk: "for",
        dengan: "with",
        dari: "from",
        ke: "to",
        di: "at/in",
        pada: "on/at",
        adalah: "is/are",
        tidak: "not",
        bukan: "not",
        sudah: "already",
        belum: "not yet",
        akan: "will",
        bisa: "can",
        harus: "must",
        ingin: "want",
        mau: "want",
        ada: "there is/exist",
        punya: "have",
        yang: "that/which",
        apa: "what",
        siapa: "who",
        dimana: "where",
        kapan: "when",
        bagaimana: "how",
        mengapa: "why",
        berapa: "how many",

        // Verbs
        makan: "eat",
        minum: "drink",
        tidur: "sleep",
        bangun: "wake up",
        pergi: "go",
        datang: "come",
        pulang: "go home",
        bermain: "play",
        bekerja: "work",
        belajar: "study",
        membaca: "read",
        menulis: "write",
        berbicara: "speak",
        mendengar: "hear",
        melihat: "see",
        berpikir: "think",
        tahu: "know",
        mengerti: "understand",
        suka: "like",
        cinta: "love",
        benci: "hate",
        takut: "afraid",
        mati: "die",
        hidup: "live",
        jangan: "don't",
        pasti: "definitely",
        menyelamatkan: "save",
        menyelamatkanmu: "save you",
        selamatkan: "save",
        tolong: "help/please",
        membunuh: "kill",
        melindungi: "protect",
        menolong: "help",
        berteriak: "scream",
        menangis: "cry",
        tertawa: "laugh",
        tersenyum: "smile",

        // Adjectives
        besar: "big",
        kecil: "small",
        panjang: "long",
        pendek: "short",
        tinggi: "tall/high",
        rendah: "low",
        baik: "good",
        buruk: "bad",
        cantik: "beautiful",
        tampan: "handsome",
        jelek: "ugly",
        pintar: "smart",
        bodoh: "stupid",
        kuat: "strong",
        lemah: "weak",
        cepat: "fast",
        lambat: "slow",
        panas: "hot",
        dingin: "cold",
        baru: "new",
        lama: "old/long time",
        mudah: "easy",
        sulit: "difficult",
        senang: "happy",
        sedih: "sad",
        marah: "angry",

        // Nouns
        orang: "person",
        anak: "child",
        ibu: "mother",
        ayah: "father",
        kakak: "older sibling",
        adik: "younger sibling",
        teman: "friend",
        musuh: "enemy",
        rumah: "house",
        sekolah: "school",
        kantor: "office",
        jalan: "road/street",
        kota: "city",
        negara: "country",
        dunia: "world",
        langit: "sky",
        bumi: "earth",
        air: "water",
        api: "fire",
        angin: "wind",
        matahari: "sun",
        bulan: "moon",
        bintang: "star",
        waktu: "time",
        hari: "day",
        malam: "night",
        pagi: "morning",
        sore: "afternoon/evening",

        // Common particles/suffixes
        nya: "his/her/its/the",
        mu: "your",
        ku: "my",
        lah: "(emphasis)",
        kah: "(question)",

        // Numbers
        satu: "one",
        dua: "two",
        tiga: "three",
        empat: "four",
        lima: "five",
        semua: "all",
        banyak: "many",
        sedikit: "few/little",

        // Demon Slayer specific
        iblis: "demon",
        setan: "demon",
        pedang: "sword",
        katana: "katana",
        darah: "blood",
        napas: "breath",
        pernafasan: "breathing",
        teknik: "technique",
        kekuatan: "power/strength",
        nezuko: "Nezuko",
        tanjiro: "Tanjiro",
      };

      // Translate word by word
      const words = text.toLowerCase().split(/\s+/);
      const translatedWords = words.map((word) => {
        // Remove punctuation for lookup
        const cleanWord = word.replace(/[.,!?;:]/g, "");

        // Check if word ends with common suffixes
        if (cleanWord.endsWith("nya")) {
          const base = cleanWord.slice(0, -3);
          if (dictionary[base]) {
            return dictionary[base] + "(the)";
          }
        }
        if (cleanWord.endsWith("mu")) {
          const base = cleanWord.slice(0, -2);
          if (dictionary[base]) {
            return "your " + dictionary[base];
          }
        }
        if (cleanWord.endsWith("ku")) {
          const base = cleanWord.slice(0, -2);
          if (dictionary[base]) {
            return "my " + dictionary[base];
          }
        }

        // Look up in dictionary
        return dictionary[cleanWord] || word;
      });

      return translatedWords.join(" ");
    }

    async handleWordClick(word, context) {
      console.log("Word clicked:", word);

      // Create popup
      const existingPopup = document.querySelector(".translation-popup");
      if (existingPopup) {
        existingPopup.remove();
      }

      const popup = document.createElement("div");
      popup.className = "translation-popup";
      popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 9999999;
        min-width: 300px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      `;

      const translation = this.translateIndonesian(word);

      popup.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #3b82f6;">${word}</h3>
        <p style="margin: 5px 0;">Translation: ${translation}</p>
        <p style="margin: 5px 0; font-size: 12px; opacity: 0.7;">Context: "${context}"</p>
        <button style="
          margin-top: 10px;
          padding: 5px 15px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        ">Close</button>
      `;

      document.body.appendChild(popup);

      popup.querySelector("button").onclick = () => {
        popup.remove();
      };

      setTimeout(() => {
        if (popup.parentNode) {
          popup.remove();
        }
      }, 5000);

      // Save word
      const storage = new StorageManager();
      await storage.saveWord({
        word: word,
        translation: translation,
        context: context,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Netflix Adapter - Simplified
  class NetflixAdapter {
    constructor() {
      this.callbacks = [];
      this.lastSubtitle = "";
      this.checkInterval = null;
    }

    async waitForPlayer() {
      return new Promise((resolve) => {
        const checkPlayer = () => {
          const player = document.querySelector(".watch-video");
          if (player) {
            console.log("Netflix player found");
            resolve();
          } else {
            setTimeout(checkPlayer, 1000);
          }
        };
        checkPlayer();
      });
    }

    onSubtitleChange(callback) {
      this.callbacks.push(callback);
      this.startObserving();
    }

    startObserving() {
      console.log("Starting Netflix subtitle observation...");

      // Check for subtitles every 100ms
      this.checkInterval = setInterval(() => {
        // Use the most specific selector for Netflix subtitles
        const container = document.querySelector(
          ".player-timedtext-text-container"
        );

        if (!container) {
          // Clear subtitle if container not found
          if (this.lastSubtitle !== "") {
            this.lastSubtitle = "";
            this.callbacks.forEach((cb) => cb(""));
          }
          return;
        }

        // Get all text spans - Netflix puts each line in a separate span
        const textElements = container.querySelectorAll("span");
        const uniqueTexts = new Set();
        const lines = [];

        textElements.forEach((el) => {
          const text = el.textContent.trim();
          // Only add non-empty text that isn't the container itself
          if (
            text &&
            !el.classList.contains("player-timedtext-text-container")
          ) {
            // Check if this is a parent element containing all text
            let isParent = false;
            textElements.forEach((other) => {
              if (other !== el && el.contains(other)) {
                isParent = true;
              }
            });

            // Only process if it's a leaf element (no children with text)
            if (!isParent) {
              // Check if this exact text was already added
              if (!uniqueTexts.has(text)) {
                uniqueTexts.add(text);
                lines.push(text);
              }
            }
          }
        });

        // Join all unique lines with a space (they're parts of the same subtitle)
        const subtitleText = lines.join(" ");

        // Check if subtitle changed
        if (subtitleText !== this.lastSubtitle) {
          this.lastSubtitle = subtitleText;
          if (subtitleText) {
            console.log("New subtitle detected:");
            console.log("  Lines found:", lines);
            console.log("  Final text:", subtitleText);
          }

          // Notify all callbacks
          this.callbacks.forEach((cb) => {
            try {
              cb(subtitleText);
            } catch (error) {
              console.error("Error in subtitle callback:", error);
            }
          });
        }
      }, 100);
    }

    stop() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    }
  }

  // Main Extension Class
  class IndonesianLearningExtension {
    constructor() {
      this.platform = null;
      this.adapter = null;
      this.overlay = null;
      this.initialize();
    }

    async initialize() {
      console.log("🎬 Indonesian Learning Extension initializing...");

      // Detect platform
      this.platform = PlatformDetector.detect();
      console.log(`Platform detected: ${this.platform}`);

      if (!PlatformDetector.isSupported()) {
        console.log("Platform not supported");
        return;
      }

      // Create adapter
      if (this.platform === "netflix") {
        this.adapter = new NetflixAdapter();
        await this.adapter.waitForPlayer();
      }

      // Initialize overlay
      this.overlay = new OverlayManager();

      // Setup subtitle monitoring
      if (this.adapter) {
        this.adapter.onSubtitleChange(async (subtitle) => {
          await this.overlay.displaySubtitle(subtitle);
        });
      }

      console.log("✅ Extension initialized successfully");
    }
  }

  // Initialize when ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new IndonesianLearningExtension();
    });
  } else {
    // Delay initialization to ensure Netflix is loaded
    setTimeout(() => {
      new IndonesianLearningExtension();
    }, 2000);
  }
})();
