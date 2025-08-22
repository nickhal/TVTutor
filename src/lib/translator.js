export class Translator {
  constructor() {
    this.cache = new Map();
    this.provider = null;
    this.initialized = false;
    
    this.initialize();
  }
  
  async initialize() {
    // Try Chrome's built-in translator first (available in Chrome 130+)
    if ('translation' in self && typeof chrome !== 'undefined') {
      try {
        // Check if translation API is available
        const canTranslate = await self.translation.canTranslate({
          sourceLanguage: 'id',
          targetLanguage: 'en'
        });
        
        if (canTranslate === 'readily') {
          this.chromeTranslator = await self.translation.createTranslator({
            sourceLanguage: 'id',
            targetLanguage: 'en'
          });
          this.provider = 'chrome';
          console.log('Using Chrome built-in translator');
        }
      } catch (e) {
        console.log('Chrome translator not available:', e);
      }
    }
    
    // Fallback to LibreTranslate
    if (!this.provider) {
      this.provider = 'libretranslate';
      this.libreTranslateUrl = 'https://libretranslate.com/translate';
      console.log('Using LibreTranslate API');
    }
    
    this.initialized = true;
  }
  
  async translate(text, options = {}) {
    const { useCache = true, context = null } = options;
    
    // Check cache
    if (useCache && this.cache.has(text)) {
      return this.cache.get(text);
    }
    
    let translation;
    const startTime = performance.now();
    
    try {
      switch (this.provider) {
        case 'chrome':
          translation = await this.translateWithChrome(text);
          break;
        case 'libretranslate':
          translation = await this.translateWithLibreTranslate(text);
          break;
        default:
          throw new Error('No translation provider available');
      }
      
      const duration = performance.now() - startTime;
      console.log(`Translation completed in ${duration.toFixed(2)}ms`);
      
      // Cache result
      this.cache.set(text, translation);
      
      // Limit cache size
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return `[Translation Error: ${text}]`;
    }
  }
  
  async translateWithChrome(text) {
    if (!this.chromeTranslator) {
      throw new Error('Chrome translator not initialized');
    }
    
    return await this.chromeTranslator.translate(text);
  }
  
  async translateWithLibreTranslate(text) {
    try {
      const response = await fetch(this.libreTranslateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: 'id',
          target: 'en',
          format: 'text'
        })
      });
      
      if (!response.ok) {
        throw new Error(`LibreTranslate API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.translatedText;
    } catch (error) {
      // If LibreTranslate fails, try a simple dictionary lookup as last resort
      return this.simpleDictionaryLookup(text);
    }
  }
  
  simpleDictionaryLookup(text) {
    // Basic Indonesian-English dictionary for common words
    const dictionary = {
      'saya': 'I/me',
      'kamu': 'you',
      'dia': 'he/she',
      'kita': 'we (inclusive)',
      'kami': 'we (exclusive)',
      'mereka': 'they',
      'ini': 'this',
      'itu': 'that',
      'apa': 'what',
      'siapa': 'who',
      'kapan': 'when',
      'dimana': 'where',
      'bagaimana': 'how',
      'mengapa': 'why',
      'tidak': 'no/not',
      'ya': 'yes',
      'dan': 'and',
      'atau': 'or',
      'tetapi': 'but',
      'untuk': 'for',
      'dengan': 'with',
      'dari': 'from',
      'ke': 'to',
      'di': 'at/in',
      'pada': 'on/at',
      'adalah': 'is/are',
      'makan': 'eat',
      'minum': 'drink',
      'tidur': 'sleep',
      'bangun': 'wake up',
      'pergi': 'go',
      'datang': 'come',
      'besar': 'big',
      'kecil': 'small',
      'banyak': 'many/much',
      'sedikit': 'few/little',
      'baik': 'good',
      'buruk': 'bad',
      'cantik': 'beautiful',
      'tampan': 'handsome',
      'cepat': 'fast',
      'lambat': 'slow',
      'panas': 'hot',
      'dingin': 'cold',
      'baru': 'new',
      'lama': 'old/long time',
      'rumah': 'house',
      'mobil': 'car',
      'jalan': 'road/walk',
      'air': 'water',
      'api': 'fire',
      'tanah': 'earth/land',
      'langit': 'sky',
      'matahari': 'sun',
      'bulan': 'moon/month',
      'bintang': 'star',
      'pohon': 'tree',
      'bunga': 'flower',
      'buku': 'book',
      'sekolah': 'school',
      'guru': 'teacher',
      'murid': 'student',
      'teman': 'friend',
      'keluarga': 'family',
      'ayah': 'father',
      'ibu': 'mother',
      'anak': 'child',
      'kakak': 'older sibling',
      'adik': 'younger sibling',
      'suami': 'husband',
      'istri': 'wife',
      'cinta': 'love',
      'senang': 'happy',
      'sedih': 'sad',
      'marah': 'angry',
      'takut': 'afraid',
      'berani': 'brave',
      'uang': 'money',
      'waktu': 'time',
      'hari': 'day',
      'minggu': 'week',
      'tahun': 'year',
      'sekarang': 'now',
      'nanti': 'later',
      'kemarin': 'yesterday',
      'besok': 'tomorrow',
      'sudah': 'already',
      'belum': 'not yet',
      'akan': 'will',
      'bisa': 'can/able',
      'harus': 'must',
      'mau': 'want',
      'suka': 'like',
      'terima kasih': 'thank you',
      'sama-sama': 'you\'re welcome',
      'maaf': 'sorry',
      'tolong': 'please/help',
      'selamat': 'congratulations/safe'
    };
    
    const lowerText = text.toLowerCase();
    return dictionary[lowerText] || `[${text}]`;
  }
  
  async translateBatch(texts) {
    // Translate multiple texts efficiently
    const translations = await Promise.all(
      texts.map(text => this.translate(text))
    );
    
    return texts.reduce((acc, text, index) => {
      acc[text] = translations[index];
      return acc;
    }, {});
  }
  
  clearCache() {
    this.cache.clear();
  }
}