export class SubtitleOverlay {
  constructor(shadowRoot, onWordClick) {
    this.shadowRoot = shadowRoot;
    this.onWordClick = onWordClick;
    this.currentSubtitle = null;
    this.hideTimeout = null;
    this.colorCoordinator = null;
    this.currentAlignment = null;
    this.currentColors = null;
    
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
    this.translationElement.innerHTML = '';
    
    // Check if translation object has Bergamot data
    const isBergamotTranslation = translation && typeof translation === 'object' && translation.text;
    
    if (isBergamotTranslation) {
      // Handle Bergamot translation with alignment and colors
      this.displayWithAlignment(subtitle, translation);
    } else {
      // Handle simple translation (fallback mode)
      this.displaySimple(subtitle, translation);
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
  
  displaySimple(subtitle, translationText) {
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
    if (translationText) {
      this.translationElement.textContent = translationText;
      this.translationElement.style.display = 'block';
    } else {
      this.translationElement.style.display = 'none';
    }
  }
  
  displayWithAlignment(subtitle, translationData) {
    const { text: translationText, alignment, colors } = translationData;
    
    // Store current alignment and colors
    this.currentAlignment = alignment;
    this.currentColors = colors;
    
    // Tokenize source and target texts
    const sourceWords = this.tokenizeIndonesian(subtitle.text);
    const targetWords = this.tokenizeIndonesian(translationText);
    
    // Display source text with colors
    if (colors && colors.sourceColors) {
      sourceWords.forEach((word, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word aligned-word';
        wordSpan.textContent = word;
        wordSpan.dataset.index = index;
        wordSpan.dataset.type = 'source';
        wordSpan.dataset.word = word.toLowerCase().replace(/[.,!?;:]/g, '');
        
        // Apply color if available
        const color = colors.sourceColors[index];
        if (color) {
          wordSpan.style.color = color;
          wordSpan.dataset.alignmentColor = color;
        }
        
        // Add click handler
        wordSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleAlignedWordClick(index, 'source', subtitle.text);
        });
        
        // Add hover handler for highlighting aligned words
        wordSpan.addEventListener('mouseenter', () => {
          this.highlightAlignedWords(index, 'source');
        });
        
        wordSpan.addEventListener('mouseleave', () => {
          this.clearHighlights();
        });
        
        this.textElement.appendChild(wordSpan);
        
        // Add space between words
        if (index < sourceWords.length - 1) {
          this.textElement.appendChild(document.createTextNode(' '));
        }
      });
    } else {
      // Fallback to simple display
      this.displaySimple(subtitle, null);
    }
    
    // Display translation with colors
    if (colors && colors.targetColors) {
      targetWords.forEach((word, index) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word aligned-word translation-word';
        wordSpan.textContent = word;
        wordSpan.dataset.index = index;
        wordSpan.dataset.type = 'target';
        
        // Apply color if available
        const color = colors.targetColors[index];
        if (color) {
          wordSpan.style.color = color;
          wordSpan.dataset.alignmentColor = color;
        }
        
        // Add hover handler for highlighting aligned words
        wordSpan.addEventListener('mouseenter', () => {
          this.highlightAlignedWords(index, 'target');
        });
        
        wordSpan.addEventListener('mouseleave', () => {
          this.clearHighlights();
        });
        
        this.translationElement.appendChild(wordSpan);
        
        // Add space between words
        if (index < targetWords.length - 1) {
          this.translationElement.appendChild(document.createTextNode(' '));
        }
      });
      
      this.translationElement.style.display = 'block';
    } else if (translationText) {
      // Fallback to simple text display
      this.translationElement.textContent = translationText;
      this.translationElement.style.display = 'block';
    }
  }
  
  highlightAlignedWords(index, type) {
    if (!this.currentAlignment) return;
    
    const { sourceToTarget, targetToSource } = this.currentAlignment;
    
    if (type === 'source' && sourceToTarget) {
      // Highlight source word
      const sourceWord = this.textElement.querySelector(`[data-index="${index}"][data-type="source"]`);
      if (sourceWord) {
        sourceWord.classList.add('alignment-highlight');
      }
      
      // Highlight aligned target words
      const targetIndices = sourceToTarget.get(index) || [];
      targetIndices.forEach(targetIdx => {
        const targetWord = this.translationElement.querySelector(`[data-index="${targetIdx}"][data-type="target"]`);
        if (targetWord) {
          targetWord.classList.add('alignment-highlight');
        }
      });
    } else if (type === 'target' && targetToSource) {
      // Highlight target word
      const targetWord = this.translationElement.querySelector(`[data-index="${index}"][data-type="target"]`);
      if (targetWord) {
        targetWord.classList.add('alignment-highlight');
      }
      
      // Highlight aligned source words
      const sourceIndices = targetToSource.get(index) || [];
      sourceIndices.forEach(sourceIdx => {
        const sourceWord = this.textElement.querySelector(`[data-index="${sourceIdx}"][data-type="source"]`);
        if (sourceWord) {
          sourceWord.classList.add('alignment-highlight');
        }
      });
    }
  }
  
  clearHighlights() {
    const highlightedWords = this.shadowRoot.querySelectorAll('.alignment-highlight');
    highlightedWords.forEach(word => {
      word.classList.remove('alignment-highlight');
    });
  }
  
  handleAlignedWordClick(index, type, context) {
    // Get the word text
    let word = '';
    if (type === 'source') {
      const wordElement = this.textElement.querySelector(`[data-index="${index}"][data-type="source"]`);
      if (wordElement) {
        word = wordElement.dataset.word || wordElement.textContent;
      }
    }
    
    if (word && this.onWordClick) {
      this.onWordClick(word, context);
    }
    
    // Visual feedback
    const wordElement = this.textElement.querySelector(`[data-index="${index}"][data-type="${type}"]`);
    if (wordElement) {
      wordElement.classList.add('clicked');
      setTimeout(() => {
        wordElement.classList.remove('clicked');
      }, 500);
    }
  }
  
  hide() {
    this.container.classList.remove('visible');
    this.clearHighlights();
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
  
  setColorCoordinator(colorCoordinator) {
    this.colorCoordinator = colorCoordinator;
  }
}