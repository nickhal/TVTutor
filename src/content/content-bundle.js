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
      // Create subtitle display that will be positioned relative to Netflix subtitles
      this.subtitleDiv = document.createElement("div");
      this.subtitleDiv.className = "indonesian-translation-subtitle";
      // We'll set most styles dynamically when we find the Netflix container

      // Don't append yet - we'll inject it near Netflix subtitles when they appear

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
      this.debugDiv.innerHTML =
        "<b>Debug Panel</b><br>Waiting for subtitles...";
      this.debugLog = [];
      this.debugEntries = []; // Store raw data for copying

      // Add click handler for copying
      this.debugDiv.addEventListener("click", (e) => {
        // Check if clicked on an error line
        const line = e.target.closest(".debug-line");
        if (line && line.dataset.message) {
          // Copy to clipboard
          navigator.clipboard
            .writeText(line.dataset.message)
            .then(() => {
              // Show feedback
              const original = line.style.background;
              line.style.background = "rgba(0, 255, 0, 0.2)";
              line.style.transition = "background 0.3s";

              // Create "Copied!" tooltip
              const tooltip = document.createElement("div");
              tooltip.textContent = "📋 Copied!";
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
              const style = document.createElement("style");
              style.textContent = `
              @keyframes fadeOut {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
              }
            `;
              document.head.appendChild(style);

              // Position tooltip
              const rect = line.getBoundingClientRect();
              tooltip.style.left = rect.left + "px";
              tooltip.style.top = rect.top - 30 + "px";
              document.body.appendChild(tooltip);

              // Clean up
              setTimeout(() => {
                line.style.background = original;
                tooltip.remove();
                style.remove();
              }, 1000);
            })
            .catch((err) => {
              console.error("Failed to copy:", err);
            });
        }
      });

      // Only append debug div initially
      document.body.appendChild(this.debugDiv);

    }

    updateDebug(message, isError = false, fullDetails = null) {
      if (this.debugDiv) {
        const time = new Date().toLocaleTimeString();
        const color = isError ? "#f00" : "#0f0";

        // Use full details for copying if provided, otherwise use message
        const copyText = fullDetails || message;

        // Create clickable line with full message in data attribute
        const entry = `
          <div class="debug-line" 
               data-message="${copyText.replace(/"/g, "&quot;")}"
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
            ${
              fullDetails
                ? '<span style="color: #888; font-size: 10px;"> (click for full details)</span>'
                : ""
            }
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
          ${this.debugLog.join("")}
        `;
      }
    }

    updateDebugWithDetails(summary, fullDetails, isError = false) {
      this.updateDebug(summary, isError, fullDetails);
    }

    hideTranslation() {
      this.subtitleDiv.style.display = "none";
      this.lastTranslationShowTime = null;
    }

    async displaySubtitle(text) {
      // Handle subtitle ending
      if (!text || text === "") {
        // Record when the subtitle ended
        if (this.currentSubtitle && this.subtitleStartTime) {
          this.subtitleEndTime = performance.now();
          const originalDuration =
            this.subtitleEndTime - this.subtitleStartTime;

          // If translation is showing, keep it visible for the full original duration
          if (this.lastTranslationShowTime) {
            const translationAge =
              performance.now() - this.lastTranslationShowTime;
            const remainingTime = originalDuration - translationAge;

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


            // Check for different response formats
            if (response) {
              if (response.success && response.translation) {
                // New format with success flag
                translation = response.translation;
                translationMethod = "chrome-api";
                this.translationCache.set(text, translation);
                this.updateDebug(
                  `✅ Chrome Translate API success (${apiTime}ms)`
                );
              } else if (response.definition) {
                // Service worker format with definition field
                translation = response.definition;
                translationMethod = response.provider || "google-unofficial";
                this.translationCache.set(text, translation);
                this.updateDebug(
                  `✅ Translation success via ${translationMethod} (${apiTime}ms)`
                );
              } else if (response.translation) {
                // Simple format with just translation
                translation = response.translation;
                translationMethod = response.method || "unknown";
                this.translationCache.set(text, translation);
                this.updateDebug(`✅ Translation success (${apiTime}ms)`);
              } else {
                // No translation available - show error details
                const errorDetails = {
                  error: response?.error || "Unknown format",
                  response: response,
                };

                this.updateDebugWithDetails(
                  `❌ Translation failed: ${
                    response?.error || "Unknown format"
                  }`,
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
            sendMessageAvailable: chrome?.runtime?.sendMessage,
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

      // Find Netflix subtitle container and copy its styling
      const netflixContainer = document.querySelector(
        ".player-timedtext-text-container"
      );
      if (netflixContainer) {

        // Find the video container to insert our translation
        const videoContainer =
          document.querySelector(".watch-video") ||
          document.querySelector(".VideoContainer") ||
          document.querySelector("[data-uia='video-canvas']");

        if (
          videoContainer &&
          (!this.subtitleDiv.parentElement ||
            this.subtitleDiv.parentElement !== videoContainer)
        ) {
          videoContainer.appendChild(this.subtitleDiv);
        }

        // Copy Netflix subtitle styling - get from the actual text spans
        const netflixStyle = window.getComputedStyle(netflixContainer);
        // Look for the deepest span with actual text
        const allSpans = netflixContainer.querySelectorAll("span");
        let textSpan = null;
        for (const span of allSpans) {
          if (span.textContent.trim() && !span.querySelector("span")) {
            textSpan = span;
            break;
          }
        }
        const spanStyle = textSpan ? window.getComputedStyle(textSpan) : null;

        // Apply Netflix styling to our translation
        // Get the actual rendered font size from the text span
        const actualFontSize = spanStyle?.fontSize || "42px"; // Default to 42px if not found

        this.subtitleDiv.style.fontFamily = netflixStyle.fontFamily;
        this.subtitleDiv.style.fontSize =
          actualFontSize !== "10px" ? actualFontSize : "42px"; // Use actual size or fallback
        this.subtitleDiv.style.fontWeight =
          spanStyle?.fontWeight || netflixStyle.fontWeight || "700";
        this.subtitleDiv.style.letterSpacing = netflixStyle.letterSpacing;
        this.subtitleDiv.style.lineHeight = netflixStyle.lineHeight;
        // Use high contrast subtitle yellow to distinguish from original
        this.subtitleDiv.style.color = "#FFFF00"; // Bright subtitle yellow

        // Get text shadow from the actual text span, not container
        const textShadow = spanStyle?.textShadow || netflixStyle.textShadow;

        // Netflix typically uses multiple shadows for a strong outline effect
        this.subtitleDiv.style.textShadow =
          textShadow ||
          "rgb(0, 0, 0) 2px 2px 4px, rgb(0, 0, 0) -2px -2px 4px, rgb(0, 0, 0) 2px -2px 4px, rgb(0, 0, 0) -2px 2px 4px";

        // Copy background if Netflix has one
        if (spanStyle) {
          this.subtitleDiv.style.backgroundColor =
            spanStyle.backgroundColor || "transparent";
          this.subtitleDiv.style.padding = spanStyle.padding || "0";
        }

        // Set positioning to appear above Netflix subtitle
        const netflixRect = netflixContainer.getBoundingClientRect();
        this.subtitleDiv.style.position = "absolute";
        this.subtitleDiv.style.width = "100%";
        this.subtitleDiv.style.textAlign = "center";
        this.subtitleDiv.style.left = "0";

        // Position above the Netflix subtitle based on its location
        if (netflixRect && netflixRect.bottom > 0) {
          // Netflix subtitle is visible, position above it
          const bottomPosition = window.innerHeight - netflixRect.top + 35; // gap between Netflix subtitle and translation
          this.subtitleDiv.style.bottom = `${bottomPosition}px`;
        } else {
          // Fallback position
          this.subtitleDiv.style.bottom = "150px";
        }

        this.subtitleDiv.style.pointerEvents = "none"; // Don't block clicks
        this.subtitleDiv.style.zIndex = "999999"; // High z-index to ensure visibility
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
        `✨ [${translationMethod.toUpperCase()}] Result: "${translation.substring(
          0,
          40
        )}..." (${totalTime}ms total)`
      );


      // Check if translation is identical to original (e.g., names like "Nezuko")
      if (translation.toLowerCase().trim() === text.toLowerCase().trim()) {
        this.subtitleDiv.style.display = "none";
        this.updateDebug("🔄 Translation same as original - hidden");
        return;
      }

      // Display the translation text (simple, Netflix-like)
      this.subtitleDiv.textContent = translation;
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
    
    interceptSubtitleRequests() {
      console.log("🚀 Setting up Netflix subtitle interception...");
      
      // Store original fetch
      const originalFetch = window.fetch;
      console.log("Original fetch stored:", !!originalFetch);
      
      // Override fetch to intercept subtitle requests
      window.fetch = async function(...args) {
        const [url] = args;
        
        // Log ALL requests to see what's happening
        if (url && typeof url === 'string') {
          // Log every 10th request to avoid spam, but always log subtitle-related ones
          const isSubtitleRelated = url.includes('.vtt') || 
            url.includes('.ttml') || 
            url.includes('.dfxp') || 
            url.includes('timedtext') ||
            url.includes('subtitle') ||
            url.includes('/range/') ||
            url.includes('nflxvideo.net') ||  // Netflix CDN
            url.includes('/?o=') ||  // Netflix segment parameters
            url.includes('segment') ||  // Segment-based delivery
            url.includes('.webvtt') ||
            url.includes('ttml2');
          
          if (isSubtitleRelated) {
            console.log(`🎬 SUBTITLE request: ${url}`);
          } else if (Math.random() < 0.1) {  // Sample 10% of other requests
            console.log(`📡 Sample request: ${url.substring(0, 100)}...`);
          }
        }
        
        // Check if this might be a subtitle request
        if (url && (
          url.includes('.vtt') || 
          url.includes('.ttml') || 
          url.includes('.dfxp') || 
          url.includes('timedtext') ||
          url.includes('subtitle') ||
          url.includes('/range/') || // Netflix uses range requests
          url.includes('nflxvideo.net') ||
          url.includes('segment') ||
          url.includes('.webvtt') ||
          url.includes('ttml2')
        )) {
          console.log(`🎯 Processing subtitle: ${url}`);
          
          // Make the actual request
          const response = await originalFetch.apply(this, args);
          
          // Clone response to read it without consuming
          const clonedResponse = response.clone();
          
          try {
            const text = await clonedResponse.text();
            console.log(`📝 Subtitle content received (${text.length} chars)`);
            
            // Parse if it's WebVTT format
            if (text.includes('WEBVTT')) {
              console.log("WebVTT format detected");
              const lines = text.split('\n');
              let cueCount = 0;
              lines.forEach(line => {
                if (line.includes('-->')) {
                  cueCount++;
                  if (cueCount <= 5) {
                    const nextLine = lines[lines.indexOf(line) + 1];
                    if (nextLine && !nextLine.includes('-->')) {
                      console.log(`  Cue ${cueCount}: ${nextLine.substring(0, 50)}...`);
                    }
                  }
                }
              });
              console.log(`Total cues found: ${cueCount}`);
            }
          } catch (e) {
            console.log("Could not parse subtitle response:", e);
          }
          
          return response;
        }
        
        // For non-subtitle requests, use original fetch
        return originalFetch.apply(this, args);
      };
      
      // Also intercept XMLHttpRequest
      const originalXHROpen = XMLHttpRequest.prototype.open;
      
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._url = url;
        this._method = method;
        
        // Log XHR requests that look like the Netflix range requests
        if (url && typeof url === 'string') {
          // Check if it matches the pattern we see in network tab
          if (url.includes('?o=') && url.includes('&v=')) {
            console.log(`🎯 Netflix range request: ${url.substring(0, 100)}...`);
            
            // Add response listener
            this.addEventListener('load', function() {
              const responseText = this.responseText || this.response;
              if (responseText) {
                console.log(`📦 Range response received (${responseText.length} bytes)`);
                
                // Check if it's subtitle data
                if (typeof responseText === 'string') {
                  if (responseText.includes('WEBVTT') || 
                      responseText.includes('<?xml') || 
                      responseText.includes('ttml') ||
                      responseText.includes('<p ') ||
                      responseText.includes('<span')) {
                    console.log(`✨ SUBTITLE DATA DETECTED!`);
                    console.log(`First 500 chars:`, responseText.substring(0, 500));
                  }
                }
              }
            });
          }
        }
        
        return originalXHROpen.apply(this, [method, url, ...rest]);
      };
      
      console.log("✅ Interception active. window.fetch overridden:", window.fetch !== originalFetch);
      
      // Test the interception
      setTimeout(() => {
        console.log("🔍 Testing interception - fetch still overridden:", window.fetch !== originalFetch);
      }, 3000);
    }
    

    startObserving() {
      // Intercept fetch requests to catch subtitle files
      this.interceptSubtitleRequests();

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

          // Notify all callbacks
          this.callbacks.forEach((cb) => cb(subtitleText));
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
      // Detect platform
      this.platform = PlatformDetector.detect();

      if (!PlatformDetector.isSupported()) {
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

    }
  }

  // Intercept XHR/fetch IMMEDIATELY before anything else
  (function interceptEarly() {
    console.log("🚨 EARLY INTERCEPTION STARTING");
    
    // Check for Workers
    if (typeof Worker !== 'undefined') {
      console.log("🔧 Workers are available");
      const originalWorker = Worker;
      window.Worker = function(...args) {
        console.log("⚠️ WORKER CREATED:", args[0]);
        return new originalWorker(...args);
      };
    }
    
    // Check for iframes and inject interception
    const injectIntoIframe = (iframe) => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) return;
        
        console.log(`💉 Injecting into iframe: ${iframe.src || 'same-origin'}`);
        
        // Store iframe's originals
        const iframeOriginalXHROpen = iframeWindow.XMLHttpRequest.prototype.open;
        const iframeOriginalXHR = iframeWindow.XMLHttpRequest;
        
        // Override iframe's XHR
        let iframeXHRCount = 0;
        iframeWindow.XMLHttpRequest = function() {
          iframeXHRCount++;
          console.log(`🏗️ [IFRAME] XHR constructed (${iframeXHRCount} total)`);
          return new iframeOriginalXHR();
        };
        
        // Copy properties
        Object.setPrototypeOf(iframeWindow.XMLHttpRequest, iframeOriginalXHR);
        Object.setPrototypeOf(iframeWindow.XMLHttpRequest.prototype, iframeOriginalXHR.prototype);
        
        // Override iframe's XHR.open
        iframeWindow.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          console.log(`🔴 [IFRAME] XHR.open: ${method} ${url?.substring(0, 150)}`);
          
          if (url && url.includes('?o=') && url.includes('&v=')) {
            console.log(`🎯 [IFRAME] NETFLIX SUBTITLE REQUEST DETECTED!`);
            
            this.addEventListener('load', function() {
              const response = this.responseText || this.response;
              console.log(`📦 [IFRAME] Response received (${response?.length || 0} bytes)`);
              
              // Check for subtitle content
              if (response && typeof response === 'string') {
                if (response.includes('<?xml') || response.includes('<tt') || 
                    response.includes('WEBVTT') || response.includes('<p ')) {
                  console.log(`✨✨✨ [IFRAME] SUBTITLE DATA FOUND! ✨✨✨`);
                  console.log(`First 500 chars:`, response.substring(0, 500));
                }
              }
            });
          }
          
          return iframeOriginalXHROpen.apply(this, [method, url, ...rest]);
        };
        
        console.log(`✅ [IFRAME] Interception injected successfully`);
      } catch (e) {
        console.log(`❌ Could not inject into iframe:`, e.message);
      }
    };
    
    // Check for iframes
    const checkForIframes = () => {
      const iframes = document.querySelectorAll('iframe');
      if (iframes.length > 0) {
        console.log(`📺 Found ${iframes.length} iframes`);
        iframes.forEach((iframe, i) => {
          try {
            if (iframe.contentWindow) {
              console.log(`  iframe ${i}: ${iframe.src || 'same-origin'}`);
              injectIntoIframe(iframe);
            }
          } catch (e) {
            console.log(`  iframe ${i}: cross-origin`);
          }
        });
      }
      
      // Also watch for new iframes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'IFRAME') {
              console.log('📺 New iframe detected!');
              setTimeout(() => injectIntoIframe(node), 100);
            }
          });
        });
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
    };
    setTimeout(checkForIframes, 2000);
    
    // Store originals
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalFetch = window.fetch;
    const originalXHR = XMLHttpRequest;
    
    // Check if Netflix cached XMLHttpRequest
    console.log("XMLHttpRequest === original?", XMLHttpRequest === originalXHR);
    
    // Override XHR constructor too
    let xhrCount = 0;
    window.XMLHttpRequest = function() {
      xhrCount++;
      if (xhrCount % 10 === 1) {  // Log every 10th to avoid spam
        console.log(`🏗️ XHR constructed (${xhrCount} total)`);
      }
      return new originalXHR();
    };
    
    // Copy all properties
    Object.setPrototypeOf(window.XMLHttpRequest, originalXHR);
    Object.setPrototypeOf(window.XMLHttpRequest.prototype, originalXHR.prototype);
    
    // Override XHR open
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (url && typeof url === 'string' && url.includes('?o=')) {
        console.log(`🔴 XHR.open: ${method} ${url?.substring(0, 100)}`);
      }
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    // Override fetch
    window.fetch = function(...args) {
      const [url] = args;
      if (url && typeof url === 'string' && Math.random() < 0.05) {
        console.log(`🔵 Fetch sample: ${url?.substring(0, 100)}`);
      }
      return originalFetch.apply(this, args);
    };
    
    console.log("✅ EARLY INTERCEPTION COMPLETE");
    
    // Monitor prototype changes
    let checkCount = 0;
    const checkPrototype = setInterval(() => {
      checkCount++;
      if (XMLHttpRequest.prototype.open !== originalXHROpen) {
        if (checkCount === 1 || checkCount % 10 === 0) {
          console.log(`✅ XHR.open still overridden (check ${checkCount})`);
        }
      } else {
        console.log(`❌ XHR.open was restored!`);
        clearInterval(checkPrototype);
      }
      if (checkCount > 30) clearInterval(checkPrototype);
    }, 1000);
  })();
  
  // Then initialize the extension
  new IndonesianLearningExtension();
})();
