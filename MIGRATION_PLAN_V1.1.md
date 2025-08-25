# TVTutor v1.1 Migration Plan
## Bergamot Local Translation & Color Coordination

### Overview
This document outlines the complete migration plan from Google Translate's unofficial API to Bergamot for **INSTANT, NEAR-ZERO LATENCY** translation, along with implementing color coordination for enhanced subtitle display in TVTutor v1.1.

### Current State Analysis
- **Translation Provider**: Google Translate unofficial API (`translate.googleapis.com`)
- **Current Latency**: 200-500ms per translation (network dependent)
- **Bottlenecks**: Network round-trip time, API processing, rate limiting
- **Architecture**: Client-side translation with caching
- **Language Pair**: Indonesian (id) → English (en)
- **UI Components**: Subtitle overlay with word-by-word clickable interface

### Goals for v1.1
1. **INSTANT Translation**: Target <10ms latency with pre-loaded Bergamot models
2. **Zero Network Dependency**: Eliminate ALL network calls for translation
3. **Color Coordination**: Real-time visual differentiation with no performance impact
4. **Predictive Pre-translation**: Translate ahead for truly instant display

---

## Phase 1: Ultra-Low Latency Architecture

### 1.1 Performance-First Technology Stack
- **Bergamot Translator**: [browsermt/bergamot-translator](https://github.com/browsermt/bergamot-translator) - Open source WASM translation engine
- **Indonesian-English Model**: [Mozilla Firefox Translations Models](https://github.com/mozilla/firefox-translations-models/tree/main/models/tiny/iden) - Open source, optimized for browser use
- **WASM with SIMD**: Hardware-accelerated translation processing
- **Model Format**: Pre-trained tiny models optimized for speed
- **Memory Strategy**: Keep model hot in memory, never unload

### 1.2 Required Files from Open Source Repos
```
bergamot-translator/
├── bergamot-translator-worker.js  # From browsermt/bergamot-translator
├── bergamot-translator-worker.wasm # Compiled WASM binary
└── models/
    └── iden/                      # From mozilla/firefox-translations-models
        ├── model.iden.intgemm.alphas.bin
        ├── lex.50.50.iden.s2t.bin 
        ├── vocab.iden.spm
        └── config.intgemm8bit.yml
```

**Model Details:**
- Size: ~17MB compressed (tiny model)
- Type: int8 quantized for speed
- Source languages: Indonesian → English
- Optimized for: Browser runtime performance

### 1.3 Zero-Latency Integration Strategy

1. **Pre-load Everything on Extension Start**
   - Load Bergamot WASM immediately on page load
   - Initialize model in memory before first subtitle appears
   - Keep translation engine "warm" at all times

2. **Model Implementation - Mozilla's Tiny Model**
   - Use Mozilla's pre-trained Indonesian-English tiny model (~17MB)
   - Already optimized and quantized for browser performance
   - Achieves <50ms translation time vs 900ms network calls
   - No need to train or optimize - ready to use!

3. **Parallel Processing Architecture**
   ```javascript
   // Triple-buffer approach for instant translation
   class InstantTranslator {
     constructor() {
       this.currentBuffer = 0;
       this.buffers = [
         new TranslationBuffer(), // Active translation
         new TranslationBuffer(), // Pre-computing next
         new TranslationBuffer()  // Ready for swap
       ];
     }
   }
   ```

---

## Phase 2: Text Alignment Strategy

### 2.1 Alignment Options

#### Option A: Custom Alignment Implementation (Recommended)
```javascript
class CustomAligner {
  // Levenshtein distance-based alignment
  alignTexts(source, target, sourceTokens, targetTokens) {
    // 1. Tokenize both texts
    // 2. Build similarity matrix
    // 3. Find optimal alignment path
    // 4. Return word-to-word mappings
  }
  
  // Features:
  // - Word boundary detection
  // - Punctuation handling
  // - Multi-word expression support
}
```

#### Option B: Awesome Align Integration
- **Pros**: State-of-the-art alignment quality
- **Cons**: Additional 100MB+ model size, Python dependency
- **Decision**: Skip for v1.1, consider for v2.0 if alignment quality issues arise

### 2.2 Alignment Requirements
- Map Indonesian words to English translations
- Handle 1-to-many and many-to-1 mappings
- Preserve timing information for subtitles
- Support phrase-level alignment for idioms

---

## Phase 3: Color Coordination for Word Mapping

### 3.1 PRIMARY GOAL: Visual Word Alignment

The color system's main purpose is to **clearly show which Indonesian words map to which English words**, especially for:
- One-to-many mappings (1 Indonesian word → multiple English words)
- Many-to-one mappings (multiple Indonesian words → 1 English word)
- Phrase translations (idioms, expressions)

#### Alignment Color Scheme
```css
:root {
  /* Each Indonesian word gets a unique color from this palette */
  --word-1: #FF6B6B;  /* Red */
  --word-2: #4ECDC4;  /* Teal */
  --word-3: #45B7D1;  /* Sky Blue */
  --word-4: #96CEB4;  /* Sage Green */
  --word-5: #FFEAA7;  /* Light Yellow */
  --word-6: #DDA0DD;  /* Plum */
  --word-7: #98D8C8;  /* Mint */
  --word-8: #FFD93D;  /* Gold */
  /* Cycle through colors for longer sentences */
}
```

Example visualization:
```
Indonesian: "Saya pergi ke pasar"
           [Red][Teal][Sky][Sage]

English:   "I   go   to  the market"
          [Red][Teal][Sky][Sage][Sage]
```

The matching colors instantly show that "pasar" → "the market" (both Sage)

### 3.2 Implementation Architecture
```javascript
class AlignmentColorMapper {
  constructor() {
    this.colorPalette = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFD93D'
    ];
  }
  
  // Map colors based on word alignment
  mapColors(indonesianWords, englishWords, alignment) {
    const indonesianColors = [];
    const englishColors = [];
    
    // Assign colors to Indonesian words
    indonesianWords.forEach((word, idx) => {
      indonesianColors[idx] = this.colorPalette[idx % this.colorPalette.length];
    });
    
    // Map same colors to aligned English words
    englishWords.forEach((word, idx) => {
      const sourceIdx = alignment[idx]; // Which Indonesian word this maps to
      englishColors[idx] = indonesianColors[sourceIdx];
    });
    
    return { indonesianColors, englishColors };
  }
}
```

### 3.3 Visual Alignment Display
- Hover over any word to highlight its translation pair
- Click to lock the highlight
- Subtle underline connects multi-word mappings
- Accessibility: High contrast mode for better visibility

---

## Phase 4: Implementation Timeline

### Week 1: Bergamot Setup
- [ ] Clone browsermt/bergamot-translator repository
- [ ] Build or download pre-built WASM binaries
- [ ] Set up Web Worker architecture
- [ ] Create BergamotTranslator class extending current Translator

### Week 2: Model Integration  
- [ ] Download Mozilla's Indonesian-English tiny model
- [ ] Integrate model files into extension structure
- [ ] Implement model loading from local files
- [ ] Test translation quality and <50ms performance target

### Week 3: Alignment System
- [ ] Implement custom alignment algorithm
- [ ] Create word-level mapping system
- [ ] Test alignment accuracy with sample texts
- [ ] Integrate with subtitle display timing

### Week 4: Color Coordination for Alignment
- [ ] Implement AlignmentColorMapper class
- [ ] Create color palette for word mapping visualization
- [ ] Add hover/click interactions for paired words
- [ ] Integrate with SubtitleOverlay component

### Week 5: Testing & Optimization
- [ ] Performance benchmarking
- [ ] Memory usage optimization
- [ ] Cross-browser testing
- [ ] User acceptance testing

---

## Phase 5: Technical Implementation Details

### 5.1 New File Structure
```
src/
├── lib/
│   ├── translator.js           # Keep as base class
│   ├── bergamot-translator.js  # New Bergamot implementation
│   ├── alignment-engine.js     # Text alignment logic
│   └── color-coordinator.js    # Color mapping system
├── workers/
│   └── translation.worker.js   # Web Worker for Bergamot
├── models/
│   ├── loader.js               # Model loading utilities
│   └── cache.js                # IndexedDB caching
└── data/
    ├── word-frequency.json     # Word frequency data
    └── pos-rules.json          # POS tagging rules
```

### 5.2 Bergamot Translator Implementation
```javascript
// src/lib/bergamot-translator.js
export class BergamotTranslator extends Translator {
  constructor() {
    super();
    this.worker = null;
    this.modelLoaded = false;
    this.aligner = new AlignmentEngine();
    this.colorCoordinator = new ColorCoordinator();
  }
  
  async initialize() {
    // 1. Create Web Worker
    this.worker = new Worker('/workers/translation.worker.js');
    
    // 2. Load model into worker
    await this.loadModel('id-en');
    
    // 3. Initialize alignment engine
    await this.aligner.initialize();
    
    // 4. Initialize color coordinator
    await this.colorCoordinator.initialize();
    
    this.initialized = true;
  }
  
  async translate(text, options = {}) {
    const { includeAlignment = true, includeColors = true } = options;
    
    // Send to worker for translation
    const translation = await this.sendToWorker({
      action: 'translate',
      text: text,
      source: 'id',
      target: 'en'
    });
    
    let result = {
      text: translation.text,
      originalText: text
    };
    
    // Add alignment if requested
    if (includeAlignment) {
      result.alignment = await this.aligner.align(
        text, 
        translation.text,
        translation.tokens
      );
    }
    
    // Add colors if requested
    if (includeColors) {
      result.colors = await this.colorCoordinator.assignColors(
        result.alignment
      );
    }
    
    return result;
  }
}
```

### 5.3 Subtitle Display Enhancement
```javascript
// src/ui/components/subtitle-overlay.js updates
class SubtitleOverlay {
  display(subtitle) {
    const { text, alignment, colors } = subtitle.translation;
    
    // Clear previous content
    this.clear();
    
    // Display original text with colors
    const originalWords = subtitle.originalText.split(' ');
    const translatedWords = text.split(' ');
    
    originalWords.forEach((word, index) => {
      const wordElement = this.createWordElement(word);
      
      // Apply color based on color scheme
      if (colors && colors[index]) {
        wordElement.style.color = colors[index];
      }
      
      // Add hover tooltip with translation
      if (alignment && alignment[index]) {
        wordElement.dataset.translation = alignment[index];
      }
      
      this.container.appendChild(wordElement);
    });
    
    // Display translation below
    this.displayTranslation(text);
  }
}
```

---

## Phase 6: Migration Strategy

### 6.1 Gradual Rollout
1. **Stage 1**: Implement Bergamot alongside existing providers
2. **Stage 2**: A/B test with subset of users
3. **Stage 3**: Make Bergamot primary, keep Google as fallback
4. **Stage 4**: Full migration to local-only translation

### 6.2 Fallback Mechanism
```javascript
class TranslatorManager {
  async translate(text) {
    try {
      // Try Bergamot first
      return await this.bergamotTranslator.translate(text);
    } catch (error) {
      console.warn('Bergamot translation failed:', error);
      
      // Fallback to Google
      return await this.googleTranslator.translate(text);
    }
  }
}
```

### 6.3 Data Migration
- Export existing translation cache
- Convert cache format for Bergamot compatibility
- Preserve user's saved words and preferences

---

## Phase 7: Performance Optimization

### 7.1 Model Loading Strategy
- **Lazy Loading**: Load model only when first translation requested
- **Progressive Loading**: Load core model first, enhancement models later
- **Caching**: Store model in IndexedDB after first download

### 7.2 Memory Management
- **Worker Pooling**: Multiple workers for parallel translation
- **Memory Limits**: Monitor and enforce memory usage caps
- **Garbage Collection**: Proper cleanup of unused translations

### 7.3 Instant Translation Strategy
```javascript
class InstantTranslator {
  constructor() {
    this.bergamot = null;
    this.ready = false;
  }
  
  async initialize() {
    // Load 40MB model once at startup
    this.bergamot = await BergamotTranslator.load('id-en-40mb.bin');
    this.ready = true;
    console.log('Bergamot ready - expecting <50ms translations');
  }
  
  async translate(text) {
    if (!this.ready) await this.initialize();
    
    // Direct translation - no network, no queue, just WASM speed
    const start = performance.now();
    const result = await this.bergamot.translate(text);
    const latency = performance.now() - start;
    
    console.log(`Translation in ${latency}ms (vs 900ms API)`);
    return result;
  }
}
```

---

## Phase 8: Testing Plan

### 8.1 Unit Tests
- Bergamot translator initialization
- Translation accuracy
- Alignment algorithm correctness
- Color assignment logic
- Worker communication

### 8.2 Integration Tests
- End-to-end subtitle display
- Performance under load
- Memory leak detection
- Fallback mechanism
- Cache persistence

### 8.3 User Acceptance Criteria
- Translation latency < 100ms
- Memory usage < 150MB
- Translation quality score > 0.8 BLEU
- Color distinction clarity
- Smooth UI interactions

---

## Phase 9: Documentation Updates

### 9.1 User Documentation
- How to enable local translation
- Color scheme explanations
- Customization options
- Troubleshooting guide

### 9.2 Developer Documentation
- Architecture overview
- API documentation
- Extension points
- Contributing guidelines

---

## Risk Analysis & Mitigation

### Risks
1. **Model Size**: Bergamot models might be too large
   - *Mitigation*: Use quantized models, lazy loading

2. **Browser Compatibility**: WASM support varies
   - *Mitigation*: Feature detection, graceful fallback

3. **Translation Quality**: Local models may underperform
   - *Mitigation*: Hybrid approach with online fallback

4. **Performance Impact**: Heavy CPU usage
   - *Mitigation*: Web Workers, translation caching

5. **Alignment Accuracy**: Custom alignment may be imperfect
   - *Mitigation*: User-correctable alignments, continuous improvement

---

## Success Metrics

### Technical Metrics
- Translation latency: < 50ms (vs current 900ms) - **18x faster!**
- Memory footprint: ~50MB for model + runtime
- Zero network requests for translation
- Instant word alignment visualization

### User Experience Goals
- No perceptible delay when subtitles appear
- Clear visual mapping between Indonesian and English words via colors
- Works offline/on slow connections
- Learning is enhanced by seeing word relationships instantly

---

## Appendix A: Resources

### Direct Implementation Resources (Open Source)
- **[Bergamot Translator Engine](https://github.com/browsermt/bergamot-translator)** - WASM translation library
- **[Indonesian-English Model](https://github.com/mozilla/firefox-translations-models/tree/main/models/tiny/iden)** - Pre-trained, ready to use
- [Bergamot Browser Extension Example](https://github.com/mozilla/firefox-translations)
- [Marian NMT Framework](https://marian-nmt.github.io/) (for custom models if needed)

### Model Training Resources
- [OPUS Parallel Corpus](https://opus.nlpl.eu/)
- [Indonesian-English Dataset](https://github.com/indonesian-nlp/id-en-corpus)

### Alignment Tools
- [Awesome Align](https://github.com/neulab/awesome-align)
- [fast_align](https://github.com/clab/fast_align)
- [SimAlign](https://github.com/cisnlp/simalign)

### Color Theory Resources
- [Material Design Color System](https://material.io/design/color/)
- [Accessible Colors](https://accessible-colors.com/)

---

## Appendix B: Configuration Schema

```json
{
  "translation": {
    "provider": "bergamot",
    "fallbackProvider": "google",
    "modelPath": "/models/id-en/",
    "cacheEnabled": true,
    "maxCacheSize": 10000,
    "batchingEnabled": true,
    "maxBatchSize": 10
  },
  "alignment": {
    "algorithm": "custom",
    "confidenceThreshold": 0.7,
    "phraseDetection": true
  },
  "colorCoordination": {
    "enabled": true,
    "scheme": "alignment",  // Primary use: show word mappings
    "colorPalette": "vibrant",
    "highlightOnHover": true,
    "accessibilityMode": "high-contrast"
  },
  "performance": {
    "useWebWorkers": true,
    "workerPoolSize": 2,
    "memoryLimit": 150,
    "translationTimeout": 5000
  }
}
```

---

## Next Steps

1. **Immediate Actions**:
   - Clone https://github.com/browsermt/bergamot-translator
   - Download model from https://github.com/mozilla/firefox-translations-models/tree/main/models/tiny/iden
   - Set up development environment with WASM support
   - Create proof-of-concept with basic Bergamot integration

2. **Week 1 Deliverables**:
   - Working Bergamot translator prototype
   - Performance benchmarks
   - Decision on alignment strategy

3. **Month 1 Goals**:
   - Complete v1.1 implementation
   - Beta testing with select users
   - Performance optimization

This migration plan provides a comprehensive roadmap for transitioning TVTutor to **instant local translation** using Bergamot and Mozilla's open-source Indonesian model. The color coordination system will clearly visualize word alignments, making language learning connections obvious. With both the translator and model being open source, implementation is straightforward - just integrate the existing components for 18x faster translations!