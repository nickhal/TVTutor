export const PLATFORMS = {
  NETFLIX: 'netflix',
  YOUTUBE: 'youtube',
  UNKNOWN: 'unknown'
};

export const SELECTORS = {
  netflix: {
    player: '.watch-video',
    subtitleContainer: '.player-timedtext-text-container',
    subtitleText: '.player-timedtext-text-container span',
    video: 'video'
  },
  youtube: {
    player: '#movie_player',
    subtitleContainer: '.ytp-caption-window-container',
    subtitleText: '.ytp-caption-segment',
    video: 'video.html5-main-video'
  }
};

export const TRANSLATION_PROVIDERS = {
  CHROME_NATIVE: 'chrome_native',
  LIBRE_TRANSLATE: 'libre_translate',
  LOCAL_MODEL: 'local_model'
};

export const STORAGE_KEYS = {
  SAVED_WORDS: 'saved_words',
  SETTINGS: 'settings',
  CACHE: 'translation_cache',
  SESSION: 'current_session'
};

export const EVENTS = {
  SUBTITLE_DETECTED: 'subtitle_detected',
  WORD_CLICKED: 'word_clicked',
  WORD_SAVED: 'word_saved',
  TRANSLATION_COMPLETE: 'translation_complete'
};