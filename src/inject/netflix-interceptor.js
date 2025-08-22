// Injected into main world to access Netflix's internal APIs
(function() {
  'use strict';
  
  console.log('Netflix interceptor injected');
  
  // Intercept XMLHttpRequest to capture subtitle requests
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    this._method = method;
    return originalOpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function() {
    if (this._url) {
      // Check if this is a subtitle request
      if (this._url.includes('?o=') && 
          (this._url.includes('.xml') || 
           this._url.includes('ttml') || 
           this._url.includes('dfxp'))) {
        
        this.addEventListener('load', function() {
          // Send subtitle data to content script
          window.postMessage({
            type: 'NETFLIX_SUBTITLE_DATA',
            payload: {
              url: this._url,
              data: this.responseText,
              timestamp: Date.now()
            }
          }, '*');
        });
      }
    }
    
    return originalSend.apply(this, arguments);
  };
  
  // Try to access Netflix's player API
  const getNetflixPlayer = () => {
    try {
      const videoPlayer = netflix?.appContext?.state?.playerApp?.getAPI()?.videoPlayer;
      if (videoPlayer) {
        const sessionIds = videoPlayer.getAllPlayerSessionIds();
        if (sessionIds && sessionIds.length > 0) {
          return videoPlayer.getVideoPlayerBySessionId(sessionIds[0]);
        }
      }
    } catch (e) {
      // Player not ready yet
    }
    return null;
  };
  
  // Monitor for player availability
  const monitorPlayer = setInterval(() => {
    const player = getNetflixPlayer();
    if (player) {
      console.log('Netflix player detected');
      clearInterval(monitorPlayer);
      
      // Send player info to content script
      window.postMessage({
        type: 'NETFLIX_PLAYER_READY',
        payload: {
          hasPlayer: true,
          currentTime: player.getCurrentTime(),
          duration: player.getDuration()
        }
      }, '*');
    }
  }, 1000);
  
  // Intercept fetch requests as well
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    if (typeof url === 'string' && url.includes('?o=')) {
      return originalFetch.apply(this, args).then(async response => {
        const clonedResponse = response.clone();
        
        if (url.includes('.xml') || url.includes('ttml')) {
          const text = await clonedResponse.text();
          
          window.postMessage({
            type: 'NETFLIX_SUBTITLE_DATA',
            payload: {
              url: url,
              data: text,
              timestamp: Date.now()
            }
          }, '*');
        }
        
        return response;
      });
    }
    
    return originalFetch.apply(this, args);
  };
})();