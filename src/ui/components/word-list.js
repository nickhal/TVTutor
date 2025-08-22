export class WordList {
  constructor(shadowRoot, storage) {
    this.shadowRoot = shadowRoot;
    this.storage = storage;
    this.words = [];
    this.isVisible = false;
    
    this.createElement();
    this.loadWords();
  }
  
  createElement() {
    this.container = document.createElement('div');
    this.container.className = 'word-list-panel';
    this.container.innerHTML = `
      <div class="word-list-header">
        <h3>Saved Words</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="word-list-controls">
        <input type="text" class="search-input" placeholder="Search words...">
        <button class="export-btn">Export</button>
        <button class="clear-btn">Clear All</button>
      </div>
      <div class="word-list-content"></div>
    `;
    
    this.headerElement = this.container.querySelector('.word-list-header');
    this.contentElement = this.container.querySelector('.word-list-content');
    this.searchInput = this.container.querySelector('.search-input');
    this.closeBtn = this.container.querySelector('.close-btn');
    this.exportBtn = this.container.querySelector('.export-btn');
    this.clearBtn = this.container.querySelector('.clear-btn');
    
    this.setupEventListeners();
    this.shadowRoot.appendChild(this.container);
  }
  
  setupEventListeners() {
    this.closeBtn.addEventListener('click', () => this.hide());
    
    this.searchInput.addEventListener('input', (e) => {
      this.filterWords(e.target.value);
    });
    
    this.exportBtn.addEventListener('click', () => {
      this.exportWords();
    });
    
    this.clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all saved words?')) {
        this.clearAllWords();
      }
    });
  }
  
  async loadWords() {
    this.words = await this.storage.getAllWords();
    this.renderWords();
  }
  
  renderWords() {
    this.contentElement.innerHTML = '';
    
    if (this.words.length === 0) {
      this.contentElement.innerHTML = '<div class="empty-state">No saved words yet. Click on words in subtitles to save them!</div>';
      return;
    }
    
    // Sort by most recent first
    const sortedWords = [...this.words].reverse();
    
    sortedWords.forEach(wordData => {
      const wordCard = this.createWordCard(wordData);
      this.contentElement.appendChild(wordCard);
    });
  }
  
  createWordCard(wordData) {
    const card = document.createElement('div');
    card.className = 'word-card';
    
    const date = new Date(wordData.timestamp || wordData.createdAt);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    card.innerHTML = `
      <div class="word-card-header">
        <span class="word-text">${wordData.word}</span>
        <button class="delete-word-btn" data-word="${wordData.word}">×</button>
      </div>
      <div class="word-definition">${wordData.definition || 'Loading...'}</div>
      <div class="word-context">"${wordData.context || ''}"</div>
      <div class="word-meta">
        <span class="word-platform">${wordData.platform || ''}</span>
        <span class="word-date">${dateStr}</span>
      </div>
    `;
    
    // Add delete handler
    const deleteBtn = card.querySelector('.delete-word-btn');
    deleteBtn.addEventListener('click', () => {
      this.deleteWord(wordData.word);
    });
    
    return card;
  }
  
  async addWord(wordData) {
    await this.storage.saveWord(wordData);
    await this.loadWords();
    
    // Show the panel briefly to confirm save
    this.show();
    setTimeout(() => {
      if (!this.isVisible) {
        this.hide();
      }
    }, 2000);
  }
  
  async deleteWord(word) {
    this.words = this.words.filter(w => w.word !== word);
    await this.storage.saveWords(this.words);
    this.renderWords();
  }
  
  async clearAllWords() {
    this.words = [];
    await this.storage.clearAllData();
    this.renderWords();
  }
  
  filterWords(searchTerm) {
    const filtered = this.words.filter(w => 
      w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.definition && w.definition.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    this.contentElement.innerHTML = '';
    filtered.reverse().forEach(wordData => {
      const wordCard = this.createWordCard(wordData);
      this.contentElement.appendChild(wordCard);
    });
  }
  
  exportWords() {
    if (this.words.length === 0) {
      alert('No words to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Word', 'Definition', 'Context', 'Platform', 'Date'];
    const rows = this.words.map(w => [
      w.word,
      w.definition || '',
      w.context || '',
      w.platform || '',
      w.timestamp || w.createdAt || ''
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `indonesian-words-${Date.now()}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  show() {
    this.container.classList.add('visible');
    this.isVisible = true;
    this.loadWords();
  }
  
  hide() {
    this.container.classList.remove('visible');
    this.isVisible = false;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}