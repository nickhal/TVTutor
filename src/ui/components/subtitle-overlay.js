export class SubtitleOverlay {
  constructor(shadowRoot, onWordClick) {
    this.shadowRoot = shadowRoot;
    this.onWordClick = onWordClick;
    this.currentSubtitle = null;
    this.hideTimeout = null;
    
    this.createElement();
  }
  
  createElement() {
    this.container = document.createElement('div');
    this.container.className = 'subtitle-overlay';
    this.container.innerHTML = `
      <div class="subtitle-text"></div>
      <div class="subtitle-translation"></div>
    `;
    
    this.textElement = this.container.querySelector('.subtitle-text');
    this.translationElement = this.container.querySelector('.subtitle-translation');
    
    this.shadowRoot.appendChild(this.container);
  }
  
  display(subtitle, translation = null) {
    // Clear previous timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    
    // Clear and rebuild subtitle text with clickable words
    this.textElement.innerHTML = '';
    
    // Tokenize text into words
    const words = this.tokenizeIndonesian(subtitle.text);
    
    words.forEach((word, index) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      wordSpan.textContent = word;
      wordSpan.dataset.index = index;
      wordSpan.dataset.word = word.toLowerCase().replace(/[.,!?;:]/g, '');
      
      // Add click handler
      wordSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleWordClick(wordSpan.dataset.word, subtitle.text);
      });
      
      // Add hover effect
      wordSpan.addEventListener('mouseenter', () => {
        wordSpan.classList.add('hover');
      });
      
      wordSpan.addEventListener('mouseleave', () => {
        wordSpan.classList.remove('hover');
      });
      
      this.textElement.appendChild(wordSpan);
      
      // Add space between words
      if (index < words.length - 1) {
        this.textElement.appendChild(document.createTextNode(' '));
      }
    });
    
    // Show translation if provided
    if (translation) {
      this.translationElement.textContent = translation;
      this.translationElement.style.display = 'block';
    } else {
      this.translationElement.style.display = 'none';
    }
    
    // Show overlay
    this.container.classList.add('visible');
    
    // Auto-hide after 5 seconds
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 5000);
  }
  
  tokenizeIndonesian(text) {
    // Basic tokenization - can be enhanced with proper NLP
    return text.split(/\s+/).filter(word => word.length > 0);
  }
  
  handleWordClick(word, context) {
    if (this.onWordClick) {
      this.onWordClick(word, context);
    }
    
    // Visual feedback
    const wordElement = this.textElement.querySelector(`[data-word="${word}"]`);
    if (wordElement) {
      wordElement.classList.add('clicked');
      setTimeout(() => {
        wordElement.classList.remove('clicked');
      }, 500);
    }
  }
  
  hide() {
    this.container.classList.remove('visible');
  }
  
  updatePosition(position) {
    // Update overlay position based on settings
    switch(position) {
      case 'top':
        this.container.style.bottom = 'auto';
        this.container.style.top = '10%';
        break;
      case 'middle':
        this.container.style.bottom = '50%';
        this.container.style.transform = 'translate(-50%, 50%)';
        break;
      case 'bottom':
      default:
        this.container.style.bottom = '15%';
        this.container.style.top = 'auto';
        break;
    }
  }
}