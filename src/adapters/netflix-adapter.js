import { BaseAdapter } from './base-adapter.js';
import { SELECTORS } from '../shared/constants.js';

export class NetflixAdapter extends BaseAdapter {
  constructor() {
    super('netflix');
    this.selectors = SELECTORS.netflix;
  }
  
  async waitForPlayer() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (document.querySelector(this.selectors.player)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }
  
  async inject() {
    // Inject Netflix-specific interceptor
    await this.injectScript('src/inject/netflix-interceptor.js');
    
    // Setup DOM monitoring for subtitles
    this.startSubtitleMonitoring();
    
    // Listen for intercepted subtitle data
    window.addEventListener('message', (event) => {
      if (event.data.type === 'NETFLIX_SUBTITLE_DATA') {
        this.handleSubtitleData(event.data.payload);
      }
    });
  }
  
  startSubtitleMonitoring() {
    const observe = () => {
      const container = document.querySelector(this.selectors.subtitleContainer);
      
      if (!container) {
        setTimeout(observe, 1000);
        return;
      }
      
      let currentText = '';
      
      this.observer = new MutationObserver(() => {
        const subtitleElements = container.querySelectorAll('span');
        
        if (subtitleElements.length > 0) {
          const text = Array.from(subtitleElements)
            .map(el => el.textContent)
            .join(' ')
            .trim();
          
          if (text && text !== currentText) {
            currentText = text;
            
            if (this.subtitleCallback) {
              this.subtitleCallback({
                text: text,
                timestamp: this.getCurrentTime(),
                platform: 'netflix'
              });
            }
          }
        }
      });
      
      this.observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
      });
    };
    
    observe();
  }
  
  handleSubtitleData(data) {
    // Process TTML subtitle data from interceptor
    console.log('Netflix subtitle data received:', data);
    // Future: Parse and pre-cache upcoming subtitles
  }
  
  getVideoTitle() {
    // Try multiple selectors for video title
    const titleElement = document.querySelector('.video-title h4') ||
                        document.querySelector('.ellipsize-text h4') ||
                        document.querySelector('[data-uia="video-title"]');
    
    return titleElement ? titleElement.textContent : 'Unknown Title';
  }
}