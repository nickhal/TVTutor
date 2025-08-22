export class BaseAdapter {
  constructor(platform) {
    this.platform = platform;
    this.subtitleCallback = null;
    this.observer = null;
  }
  
  // Abstract methods to be implemented by platform adapters
  async waitForPlayer() {
    throw new Error('waitForPlayer must be implemented');
  }
  
  async inject() {
    throw new Error('inject must be implemented');
  }
  
  onSubtitleChange(callback) {
    this.subtitleCallback = callback;
  }
  
  getVideoTitle() {
    throw new Error('getVideoTitle must be implemented');
  }
  
  getCurrentTime() {
    const video = document.querySelector('video');
    return video ? video.currentTime : 0;
  }
  
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
  
  // Utility method for injecting scripts
  injectScript(scriptPath) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(scriptPath);
      script.onload = () => {
        script.remove();
        resolve();
      };
      (document.head || document.documentElement).appendChild(script);
    });
  }
}