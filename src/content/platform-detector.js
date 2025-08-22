import { PLATFORMS } from '../shared/constants.js';

export class PlatformDetector {
  static detect() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('netflix.com')) {
      return PLATFORMS.NETFLIX;
    } else if (hostname.includes('youtube.com')) {
      return PLATFORMS.YOUTUBE;
    }
    
    return PLATFORMS.UNKNOWN;
  }
  
  static isSupported() {
    return this.detect() !== PLATFORMS.UNKNOWN;
  }
  
  static waitForPlatformReady() {
    return new Promise((resolve) => {
      const platform = this.detect();
      
      if (platform === PLATFORMS.UNKNOWN) {
        resolve(false);
        return;
      }
      
      // Platform-specific readiness checks
      const checkReady = () => {
        let isReady = false;
        
        if (platform === PLATFORMS.NETFLIX) {
          // Check if Netflix player is loaded
          isReady = !!(document.querySelector('.watch-video') || 
                      document.querySelector('[data-uia="player"]'));
        } else if (platform === PLATFORMS.YOUTUBE) {
          // Check if YouTube player is loaded
          isReady = !!(document.querySelector('#movie_player') || 
                      document.querySelector('ytd-player'));
        }
        
        if (isReady) {
          resolve(true);
        } else {
          setTimeout(checkReady, 500);
        }
      };
      
      checkReady();
    });
  }
}