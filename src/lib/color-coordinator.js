// src/lib/color-coordinator.js

export class ColorCoordinator {
  constructor() {
    this.initialized = false;
    this.colorScheme = 'vibrant';
    this.colorPalettes = {
      vibrant: [
        '#FF6B6B',  // Red
        '#4ECDC4',  // Teal
        '#45B7D1',  // Sky Blue
        '#96CEB4',  // Sage Green
        '#FFEAA7',  // Light Yellow
        '#DDA0DD',  // Plum
        '#98D8C8',  // Mint
        '#FFD93D',  // Gold
        '#6C63FF',  // Purple
        '#FF9FF3',  // Pink
      ],
      pastel: [
        '#FFB5B5',  // Pastel Red
        '#B5E7E7',  // Pastel Teal
        '#B5D9E6',  // Pastel Blue
        '#C8E6C8',  // Pastel Green
        '#FFF5CC',  // Pastel Yellow
        '#E6CCE6',  // Pastel Purple
        '#D4F1E6',  // Pastel Mint
        '#FFE6B3',  // Pastel Gold
        '#C8BFFF',  // Pastel Lavender
        '#FFD4E6',  // Pastel Pink
      ],
      highContrast: [
        '#FF0000',  // Bright Red
        '#00FF00',  // Bright Green
        '#0000FF',  // Bright Blue
        '#FFFF00',  // Bright Yellow
        '#FF00FF',  // Magenta
        '#00FFFF',  // Cyan
        '#FF8800',  // Orange
        '#8800FF',  // Violet
        '#00FF88',  // Spring Green
        '#FF0088',  // Rose
      ],
      monochrome: [
        '#2C3E50',  // Dark Blue-Gray
        '#34495E',  // Blue-Gray
        '#546E7A',  // Medium Blue-Gray
        '#607D8B',  // Light Blue-Gray
        '#78909C',  // Lighter Blue-Gray
        '#90A4AE',  // Even Lighter
        '#B0BEC5',  // Very Light
        '#CFD8DC',  // Pale
        '#ECEFF1',  // Almost White
        '#B3E5FC',  // Light Blue
      ]
    };
    
    // Accessibility settings
    this.accessibilityMode = false;
    this.highlightOnHover = true;
    this.underlineConnections = true;
  }

  async initialize() {
    console.log("Initializing color coordinator...");
    
    // Load user preferences if available
    await this.loadPreferences();
    
    this.initialized = true;
    return true;
  }

  // Load user preferences from storage
  async loadPreferences() {
    try {
      // Check if we're in a browser extension context
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['colorScheme', 'accessibilityMode']);
        if (result.colorScheme) {
          this.colorScheme = result.colorScheme;
        }
        if (result.accessibilityMode !== undefined) {
          this.accessibilityMode = result.accessibilityMode;
        }
      }
    } catch (error) {
      console.warn("Could not load color preferences:", error);
    }
  }

  // Main function to assign colors based on alignment
  async assignColors(alignment, sourceTokens, targetTokens) {
    if (!alignment || !alignment.wordAlignment) {
      return null;
    }

    const palette = this.getCurrentPalette();
    const colorAssignment = {
      sourceColors: [],
      targetColors: [],
      phraseGroups: [],
      scheme: this.colorScheme,
      palette: palette
    };

    // Initialize color arrays
    for (let i = 0; i < sourceTokens.length; i++) {
      colorAssignment.sourceColors[i] = null;
    }
    for (let i = 0; i < targetTokens.length; i++) {
      colorAssignment.targetColors[i] = null;
    }

    // Assign colors for phrase alignments first (they take priority)
    if (alignment.phraseAlignment && alignment.phraseAlignment.length > 0) {
      this.assignPhraseColors(alignment.phraseAlignment, colorAssignment, palette);
    }

    // Assign colors for word alignments
    this.assignWordColors(alignment, colorAssignment, palette);

    // Handle unaligned words
    this.handleUnalignedWords(colorAssignment, sourceTokens, targetTokens);

    return colorAssignment;
  }

  // Get current color palette based on settings
  getCurrentPalette() {
    let scheme = this.colorScheme;
    
    // Override with high contrast if accessibility mode is on
    if (this.accessibilityMode) {
      scheme = 'highContrast';
    }
    
    return this.colorPalettes[scheme] || this.colorPalettes.vibrant;
  }

  // Assign colors for phrase alignments
  assignPhraseColors(phraseAlignments, colorAssignment, palette) {
    let colorIndex = 0;

    for (const phrase of phraseAlignments) {
      const color = palette[colorIndex % palette.length];
      
      // Create phrase group for rendering
      const phraseGroup = {
        id: `phrase-${colorIndex}`,
        color: color,
        sourceIndices: phrase.sourceIndices,
        targetIndices: phrase.targetIndices,
        sourceText: phrase.sourceText,
        targetText: phrase.targetText
      };
      
      colorAssignment.phraseGroups.push(phraseGroup);

      // Assign the same color to all words in the phrase
      for (const sourceIdx of phrase.sourceIndices) {
        if (sourceIdx >= 0 && sourceIdx < colorAssignment.sourceColors.length) {
          colorAssignment.sourceColors[sourceIdx] = color;
        }
      }

      for (const targetIdx of phrase.targetIndices) {
        if (targetIdx >= 0 && targetIdx < colorAssignment.targetColors.length) {
          colorAssignment.targetColors[targetIdx] = color;
        }
      }

      colorIndex++;
    }
  }

  // Assign colors for word-level alignments
  assignWordColors(alignment, colorAssignment, palette) {
    const usedSourceIndices = new Set();
    const usedTargetIndices = new Set();
    let colorIndex = colorAssignment.phraseGroups.length; // Start after phrase colors

    // First pass: collect already colored indices
    colorAssignment.sourceColors.forEach((color, idx) => {
      if (color !== null) usedSourceIndices.add(idx);
    });
    colorAssignment.targetColors.forEach((color, idx) => {
      if (color !== null) usedTargetIndices.add(idx);
    });

    // Group alignments by source word for consistent coloring
    const sourceGroups = new Map();
    for (const align of alignment.wordAlignment) {
      if (!sourceGroups.has(align.sourceIndex)) {
        sourceGroups.set(align.sourceIndex, []);
      }
      sourceGroups.get(align.sourceIndex).push(align.targetIndex);
    }

    // Assign colors to each source group
    for (const [sourceIdx, targetIndices] of sourceGroups) {
      // Skip if already colored (part of a phrase)
      if (usedSourceIndices.has(sourceIdx)) continue;

      const color = palette[colorIndex % palette.length];

      // Color the source word
      if (sourceIdx >= 0 && sourceIdx < colorAssignment.sourceColors.length) {
        colorAssignment.sourceColors[sourceIdx] = color;
      }

      // Color all aligned target words with the same color
      for (const targetIdx of targetIndices) {
        if (!usedTargetIndices.has(targetIdx) && 
            targetIdx >= 0 && 
            targetIdx < colorAssignment.targetColors.length) {
          colorAssignment.targetColors[targetIdx] = color;
          usedTargetIndices.add(targetIdx);
        }
      }

      colorIndex++;
    }
  }

  // Handle unaligned words (no translation mapping)
  handleUnalignedWords(colorAssignment, sourceTokens, targetTokens) {
    const unalignedColor = this.getUnalignedColor();

    // Mark unaligned source words
    for (let i = 0; i < colorAssignment.sourceColors.length; i++) {
      if (colorAssignment.sourceColors[i] === null) {
        // Skip punctuation
        if (!this.isPunctuation(sourceTokens[i]?.text)) {
          colorAssignment.sourceColors[i] = unalignedColor;
        }
      }
    }

    // Mark unaligned target words
    for (let i = 0; i < colorAssignment.targetColors.length; i++) {
      if (colorAssignment.targetColors[i] === null) {
        // Skip punctuation
        if (!this.isPunctuation(targetTokens[i]?.text)) {
          colorAssignment.targetColors[i] = unalignedColor;
        }
      }
    }
  }

  // Get color for unaligned words
  getUnalignedColor() {
    if (this.accessibilityMode) {
      return '#808080'; // Gray for high contrast
    }
    return '#CCCCCC'; // Light gray for normal mode
  }

  // Check if token is punctuation
  isPunctuation(token) {
    if (!token) return false;
    return /^[.,!?;:'"()[\]{}]$/.test(token);
  }

  // Generate CSS styles for colored display
  generateStyles(colorAssignment) {
    const styles = [];
    
    // Base styles for word spans
    styles.push(`
      .aligned-word {
        display: inline-block;
        padding: 2px 4px;
        margin: 0 2px;
        border-radius: 3px;
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
      }
      
      .aligned-word:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      
      .aligned-word.highlighted {
        animation: pulse 0.5s ease-in-out;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `);

    // Styles for phrase groups with underlines
    if (this.underlineConnections) {
      styles.push(`
        .phrase-group {
          position: relative;
          display: inline-block;
        }
        
        .phrase-group::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: currentColor;
          opacity: 0.5;
        }
      `);
    }

    // Generate color-specific styles
    colorAssignment.sourceColors.forEach((color, index) => {
      if (color) {
        styles.push(`
          .source-word-${index} {
            color: ${color};
            ${this.accessibilityMode ? `font-weight: bold;` : ''}
          }
        `);
      }
    });

    colorAssignment.targetColors.forEach((color, index) => {
      if (color) {
        styles.push(`
          .target-word-${index} {
            color: ${color};
            ${this.accessibilityMode ? `font-weight: bold;` : ''}
          }
        `);
      }
    });

    // Hover highlight styles
    if (this.highlightOnHover) {
      styles.push(`
        .aligned-word[data-alignment-group]:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        .aligned-word.alignment-highlight {
          background-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 10px currentColor;
        }
      `);
    }

    return styles.join('\n');
  }

  // Create HTML elements with proper color classes
  createColoredElements(text, colors, tokens, type = 'source') {
    const elements = [];
    
    tokens.forEach((token, index) => {
      const color = colors[index];
      const element = {
        tag: 'span',
        className: `aligned-word ${type}-word-${index}`,
        text: token.text,
        style: color ? `color: ${color};` : '',
        attributes: {
          'data-index': index,
          'data-type': type,
          'data-color': color || 'none'
        }
      };

      elements.push(element);
    });

    return elements;
  }

  // Set color scheme
  setColorScheme(scheme) {
    if (this.colorPalettes[scheme]) {
      this.colorScheme = scheme;
      console.log(`Color scheme changed to: ${scheme}`);
      
      // Save preference
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ colorScheme: scheme });
      }
      
      return true;
    }
    
    console.warn(`Unknown color scheme: ${scheme}`);
    return false;
  }

  // Toggle accessibility mode
  toggleAccessibilityMode() {
    this.accessibilityMode = !this.accessibilityMode;
    console.log(`Accessibility mode: ${this.accessibilityMode ? 'ON' : 'OFF'}`);
    
    // Save preference
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ accessibilityMode: this.accessibilityMode });
    }
    
    return this.accessibilityMode;
  }

  // Get available color schemes
  getAvailableSchemes() {
    return Object.keys(this.colorPalettes);
  }

  // Get current settings
  getSettings() {
    return {
      colorScheme: this.colorScheme,
      accessibilityMode: this.accessibilityMode,
      highlightOnHover: this.highlightOnHover,
      underlineConnections: this.underlineConnections,
      availableSchemes: this.getAvailableSchemes()
    };
  }
}