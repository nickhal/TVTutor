// Bundled content script for Chrome extension - Simplified version
// Assumes all subtitles are Indonesian and translates them

(function() {
  'use strict';

  // Platform Detector
  const PlatformDetector = {
    detect() {
      const hostname = window.location.hostname;
      if (hostname.includes('netflix.com')) return 'netflix';
      if (hostname.includes('youtube.com')) return 'youtube';
      return 'unknown';
    },
    
    isSupported() {
      const platform = this.detect();
      return platform === 'netflix' || platform === 'youtube';
    }
  };

  // Storage Manager (simplified for content script)
  class StorageManager {
    constructor() {
      this.useChrome = typeof chrome !== 'undefined' && chrome.storage;
    }
    
    async saveWord(wordData) {
      if (this.useChrome) {
        try {
          const result = await chrome.storage.local.get('savedWords');
          const words = result.savedWords || [];
          words.push(wordData);
          await chrome.storage.local.set({ savedWords: words });
          return true;
        } catch (error) {
          console.error('Error saving word:', error);
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
      this.currentSubtitle = '';
      this.init();
    }
    
    init() {
      // Create main container
      this.container = document.createElement('div');
      this.container.className = 'indonesian-learning-overlay';
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
      this.subtitleDiv = document.createElement('div');
      this.subtitleDiv.className = 'subtitle-display';
      this.subtitleDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
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
      
      this.container.appendChild(this.subtitleDiv);
      document.body.appendChild(this.container);
      
      console.log('Overlay initialized');
    }
    
    displaySubtitle(text) {
      if (!text || text === '') {
        this.subtitleDiv.style.display = 'none';
        this.currentSubtitle = '';
        return;
      }
      
      // Always update to handle changing subtitles
      this.currentSubtitle = text;
      
      // Translate the Indonesian text
      const translation = this.translateIndonesian(text);
      
      // Display the English translation
      this.subtitleDiv.style.display = 'block';
      this.subtitleDiv.innerHTML = '';
      
      // Create clickable words
      const words = translation.split(/\s+/);
      const originalWords = text.split(/\s+/);
      
      words.forEach((word, index) => {
        const span = document.createElement('span');
        span.textContent = word + ' ';
        span.style.cssText = `
          cursor: pointer;
          display: inline;
          transition: all 0.2s;
        `;
        
        // Store original Indonesian word
        const originalWord = originalWords[index] || originalWords[originalWords.length - 1];
        span.dataset.original = originalWord;
        
        span.addEventListener('mouseenter', () => {
          span.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
          span.style.padding = '2px 4px';
          span.style.borderRadius = '4px';
        });
        
        span.addEventListener('mouseleave', () => {
          span.style.backgroundColor = 'transparent';
          span.style.padding = '0';
        });
        
        span.addEventListener('click', (e) => {
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
        'aku': 'I',
        'saya': 'I',
        'kamu': 'you',
        'dia': 'he/she',
        'kita': 'we',
        'mereka': 'they',
        'ini': 'this',
        'itu': 'that',
        'dan': 'and',
        'atau': 'or',
        'tetapi': 'but',
        'karena': 'because',
        'untuk': 'for',
        'dengan': 'with',
        'dari': 'from',
        'ke': 'to',
        'di': 'at/in',
        'pada': 'on/at',
        'adalah': 'is/are',
        'tidak': 'not',
        'bukan': 'not',
        'sudah': 'already',
        'belum': 'not yet',
        'akan': 'will',
        'bisa': 'can',
        'harus': 'must',
        'ingin': 'want',
        'mau': 'want',
        'ada': 'there is/exist',
        'punya': 'have',
        'yang': 'that/which',
        'apa': 'what',
        'siapa': 'who',
        'dimana': 'where',
        'kapan': 'when',
        'bagaimana': 'how',
        'mengapa': 'why',
        'berapa': 'how many',
        
        // Verbs
        'makan': 'eat',
        'minum': 'drink',
        'tidur': 'sleep',
        'bangun': 'wake up',
        'pergi': 'go',
        'datang': 'come',
        'pulang': 'go home',
        'bermain': 'play',
        'bekerja': 'work',
        'belajar': 'study',
        'membaca': 'read',
        'menulis': 'write',
        'berbicara': 'speak',
        'mendengar': 'hear',
        'melihat': 'see',
        'berpikir': 'think',
        'tahu': 'know',
        'mengerti': 'understand',
        'suka': 'like',
        'cinta': 'love',
        'benci': 'hate',
        'takut': 'afraid',
        'mati': 'die',
        'hidup': 'live',
        'jangan': "don't",
        'pasti': 'definitely',
        'menyelamatkan': 'save',
        'menyelamatkanmu': 'save you',
        'selamatkan': 'save',
        'tolong': 'help/please',
        'membunuh': 'kill',
        'melindungi': 'protect',
        'menolong': 'help',
        'berteriak': 'scream',
        'menangis': 'cry',
        'tertawa': 'laugh',
        'tersenyum': 'smile',
        
        // Adjectives
        'besar': 'big',
        'kecil': 'small',
        'panjang': 'long',
        'pendek': 'short',
        'tinggi': 'tall/high',
        'rendah': 'low',
        'baik': 'good',
        'buruk': 'bad',
        'cantik': 'beautiful',
        'tampan': 'handsome',
        'jelek': 'ugly',
        'pintar': 'smart',
        'bodoh': 'stupid',
        'kuat': 'strong',
        'lemah': 'weak',
        'cepat': 'fast',
        'lambat': 'slow',
        'panas': 'hot',
        'dingin': 'cold',
        'baru': 'new',
        'lama': 'old/long time',
        'mudah': 'easy',
        'sulit': 'difficult',
        'senang': 'happy',
        'sedih': 'sad',
        'marah': 'angry',
        
        // Nouns
        'orang': 'person',
        'anak': 'child',
        'ibu': 'mother',
        'ayah': 'father',
        'kakak': 'older sibling',
        'adik': 'younger sibling',
        'teman': 'friend',
        'musuh': 'enemy',
        'rumah': 'house',
        'sekolah': 'school',
        'kantor': 'office',
        'jalan': 'road/street',
        'kota': 'city',
        'negara': 'country',
        'dunia': 'world',
        'langit': 'sky',
        'bumi': 'earth',
        'air': 'water',
        'api': 'fire',
        'angin': 'wind',
        'matahari': 'sun',
        'bulan': 'moon',
        'bintang': 'star',
        'waktu': 'time',
        'hari': 'day',
        'malam': 'night',
        'pagi': 'morning',
        'sore': 'afternoon/evening',
        
        // Common particles/suffixes
        'nya': 'his/her/its/the',
        'mu': 'your',
        'ku': 'my',
        'lah': '(emphasis)',
        'kah': '(question)',
        
        // Numbers
        'satu': 'one',
        'dua': 'two',
        'tiga': 'three',
        'empat': 'four',
        'lima': 'five',
        'semua': 'all',
        'banyak': 'many',
        'sedikit': 'few/little',
        
        // Demon Slayer specific
        'iblis': 'demon',
        'setan': 'demon',
        'pedang': 'sword',
        'katana': 'katana',
        'darah': 'blood',
        'napas': 'breath',
        'pernafasan': 'breathing',
        'teknik': 'technique',
        'kekuatan': 'power/strength',
        'nezuko': 'Nezuko',
        'tanjiro': 'Tanjiro'
      };
      
      // Translate word by word
      const words = text.toLowerCase().split(/\s+/);
      const translatedWords = words.map(word => {
        // Remove punctuation for lookup
        const cleanWord = word.replace(/[.,!?;:]/g, '');
        
        // Check if word ends with common suffixes
        if (cleanWord.endsWith('nya')) {
          const base = cleanWord.slice(0, -3);
          if (dictionary[base]) {
            return dictionary[base] + '(the)';
          }
        }
        if (cleanWord.endsWith('mu')) {
          const base = cleanWord.slice(0, -2);
          if (dictionary[base]) {
            return 'your ' + dictionary[base];
          }
        }
        if (cleanWord.endsWith('ku')) {
          const base = cleanWord.slice(0, -2);
          if (dictionary[base]) {
            return 'my ' + dictionary[base];
          }
        }
        
        // Look up in dictionary
        return dictionary[cleanWord] || word;
      });
      
      return translatedWords.join(' ');
    }
    
    async handleWordClick(word, context) {
      console.log('Word clicked:', word);
      
      // Create popup
      const existingPopup = document.querySelector('.translation-popup');
      if (existingPopup) {
        existingPopup.remove();
      }
      
      const popup = document.createElement('div');
      popup.className = 'translation-popup';
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
      
      popup.querySelector('button').onclick = () => {
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
        timestamp: new Date().toISOString()
      });
    }
  }

  // Netflix Adapter - Simplified
  class NetflixAdapter {
    constructor() {
      this.callbacks = [];
      this.lastSubtitle = '';
      this.checkInterval = null;
    }
    
    async waitForPlayer() {
      return new Promise((resolve) => {
        const checkPlayer = () => {
          const player = document.querySelector('.watch-video');
          if (player) {
            console.log('Netflix player found');
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
      console.log('Starting Netflix subtitle observation...');
      
      // Check for subtitles every 100ms
      this.checkInterval = setInterval(() => {
        // Use the most specific selector for Netflix subtitles
        const container = document.querySelector('.player-timedtext-text-container');
        
        if (!container) {
          // Clear subtitle if container not found
          if (this.lastSubtitle !== '') {
            this.lastSubtitle = '';
            this.callbacks.forEach(cb => cb(''));
          }
          return;
        }
        
        // Get all text spans - Netflix puts each line in a separate span
        const textElements = container.querySelectorAll('span');
        const lines = [];
        
        textElements.forEach(el => {
          const text = el.textContent.trim();
          // Only add non-empty text that isn't the container itself
          if (text && !el.classList.contains('player-timedtext-text-container')) {
            // Check if this text is already part of another element's text (nested spans)
            let isNested = false;
            textElements.forEach(other => {
              if (other !== el && other.textContent.includes(text) && other.textContent.length > text.length) {
                isNested = true;
              }
            });
            
            if (!isNested) {
              lines.push(text);
            }
          }
        });
        
        // Join all lines with a space (they're parts of the same subtitle)
        const subtitleText = lines.join(' ');
        
        // Check if subtitle changed
        if (subtitleText !== this.lastSubtitle) {
          this.lastSubtitle = subtitleText;
          if (subtitleText) {
            console.log('New subtitle:', subtitleText);
          }
          
          // Notify all callbacks
          this.callbacks.forEach(cb => {
            try {
              cb(subtitleText);
            } catch (error) {
              console.error('Error in subtitle callback:', error);
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
      console.log('🎬 Indonesian Learning Extension initializing...');
      
      // Detect platform
      this.platform = PlatformDetector.detect();
      console.log(`Platform detected: ${this.platform}`);
      
      if (!PlatformDetector.isSupported()) {
        console.log('Platform not supported');
        return;
      }
      
      // Create adapter
      if (this.platform === 'netflix') {
        this.adapter = new NetflixAdapter();
        await this.adapter.waitForPlayer();
      }
      
      // Initialize overlay
      this.overlay = new OverlayManager();
      
      // Setup subtitle monitoring
      if (this.adapter) {
        this.adapter.onSubtitleChange((subtitle) => {
          this.overlay.displaySubtitle(subtitle);
        });
      }
      
      console.log('✅ Extension initialized successfully');
    }
  }

  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new IndonesianLearningExtension();
    });
  } else {
    // Delay initialization to ensure Netflix is loaded
    setTimeout(() => {
      new IndonesianLearningExtension();
    }, 2000);
  }
})();