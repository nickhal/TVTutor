export const config = {
  translation: {
    primaryProvider: 'chrome_native',
    fallbackProvider: 'libre_translate',
    cacheExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxCacheSize: 10000, // words
    debounceDelay: 300 // ms
  },
  
  ui: {
    subtitleDisplayDuration: 5000, // ms
    wordListMaxItems: 50,
    overlayPosition: 'right', // 'right', 'left', 'bottom'
    theme: 'dark' // 'dark', 'light', 'auto'
  },
  
  indonesian: {
    enableAffixExtraction: true,
    enableRootWordDetection: true,
    minWordLength: 2
  },
  
  platforms: {
    netflix: {
      interceptXHR: true,
      monitorDOM: true,
      subtitleFormat: 'ttml'
    },
    youtube: {
      useTextTrackAPI: true,
      monitorCaptions: true,
      subtitleFormat: 'vtt'
    }
  }
};