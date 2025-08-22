import { SubtitleOverlay } from '../ui/components/subtitle-overlay.js';
import { WordList } from '../ui/components/word-list.js';
import { EVENTS } from '../shared/constants.js';

export class OverlayManager {
  constructor(storage, platform) {
    this.storage = storage;
    this.platform = platform;
    this.shadowRoot = null;
    this.subtitleOverlay = null;
    this.wordList = null;
    
    this.initialize();
  }
  
  initialize() {
    // Create Shadow DOM container
    this.createShadowContainer();
    
    // Initialize components
    this.subtitleOverlay = new SubtitleOverlay(this.shadowRoot, (word, context) => {
      this.handleWordClick(word, context);
    });
    
    this.wordList = new WordList(this.shadowRoot, this.storage);
    
    // Add floating button for word list
    this.createFloatingButton();
    
    // Load and apply styles
    this.applyStyles();
  }
  
  createShadowContainer() {
    // Create host element
    const host = document.createElement('div');
    host.id = 'indonesian-learning-extension-root';
    host.style.position = 'fixed';
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '999999';
    
    // Create shadow root
    this.shadowRoot = host.attachShadow({ mode: 'open' });
    
    // Append to body
    document.body.appendChild(host);
  }
  
  createFloatingButton() {
    const button = document.createElement('button');
    button.className = 'floating-button';
    button.innerHTML = '📚';
    button.title = 'Saved Words';
    
    button.addEventListener('click', () => {
      this.wordList.toggle();
    });
    
    this.shadowRoot.appendChild(button);
  }
  
  applyStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      /* Subtitle Overlay Styles */
      .subtitle-overlay {
        position: fixed;
        bottom: 15%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        border-radius: 8px;
        padding: 20px 30px;
        max-width: 80%;
        pointer-events: auto;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 10;
      }
      
      .subtitle-overlay.visible {
        opacity: 1;
      }
      
      .subtitle-text {
        font-size: 24px;
        line-height: 1.5;
        color: white;
        margin-bottom: 10px;
      }
      
      .subtitle-text .word {
        display: inline-block;
        padding: 2px 4px;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .subtitle-text .word:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .subtitle-text .word.clicked {
        background-color: rgba(76, 175, 80, 0.5);
        animation: pulse 0.5s ease;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      .subtitle-translation {
        font-size: 18px;
        color: #ccc;
        font-style: italic;
      }
      
      /* Word List Panel Styles */
      .word-list-panel {
        position: fixed;
        right: -400px;
        top: 0;
        width: 400px;
        height: 100vh;
        background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.5);
        transition: right 0.3s ease;
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        z-index: 20;
      }
      
      .word-list-panel.visible {
        right: 0;
      }
      
      .word-list-header {
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .word-list-header h3 {
        color: white;
        font-size: 20px;
        font-weight: 500;
      }
      
      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .close-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .word-list-controls {
        padding: 15px 20px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border-radius: 4px;
        font-size: 14px;
        margin-bottom: 10px;
      }
      
      .search-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
      
      .export-btn, .clear-btn {
        padding: 6px 12px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        margin-right: 10px;
        transition: background-color 0.2s;
      }
      
      .export-btn:hover, .clear-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .word-list-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .word-list-content::-webkit-scrollbar {
        width: 8px;
      }
      
      .word-list-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .word-list-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }
      
      .empty-state {
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
        padding: 40px 20px;
        font-size: 14px;
      }
      
      .word-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .word-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .word-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .word-text {
        font-size: 18px;
        font-weight: 500;
        color: #4CAF50;
      }
      
      .delete-word-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s, color 0.2s;
      }
      
      .delete-word-btn:hover {
        background-color: rgba(255, 67, 54, 0.2);
        color: #ff4336;
      }
      
      .word-definition {
        color: white;
        font-size: 14px;
        margin-bottom: 8px;
        line-height: 1.4;
      }
      
      .word-context {
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        font-style: italic;
        margin-bottom: 8px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }
      
      .word-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }
      
      .word-platform {
        text-transform: capitalize;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      
      /* Floating Button */
      .floating-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        border: none;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        cursor: pointer;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 15;
      }
      
      .floating-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(76, 175, 80, 0.6);
      }
      
      .floating-button:active {
        transform: scale(0.95);
      }
    `;
    
    this.shadowRoot.appendChild(styles);
  }
  
  displaySubtitle(subtitle) {
    this.subtitleOverlay.display(subtitle);
  }
  
  async handleWordClick(word, context) {
    // Emit event for word click
    window.dispatchEvent(new CustomEvent(EVENTS.WORD_CLICKED, {
      detail: { word, context }
    }));
  }
  
  addWordToList(wordData) {
    this.wordList.addWord(wordData);
  }
  
  updateSettings(settings) {
    // Update UI based on settings
    if (settings.ui && settings.ui.overlayPosition) {
      this.subtitleOverlay.updatePosition(settings.ui.overlayPosition);
    }
  }
}