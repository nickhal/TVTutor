// src/workers/translation.worker.js

// Bergamot WASM translator worker
let bergamotModule = null;
let translator = null;
let models = new Map();
let currentModelPair = null;

// Initialize Bergamot translator
async function initialize(wasmPath) {
  try {
    console.log('[Worker] Initializing Bergamot translator...');
    
    // Load Bergamot WASM module
    if (typeof importScripts === 'function') {
      // Load the Bergamot worker script
      importScripts('/public/models/bergamot-translator-worker.js');
    }
    
    // Initialize the module
    bergamotModule = await loadBergamotModule(wasmPath);
    
    // Create translator instance
    translator = new bergamotModule.BlockingService({
      cacheSize: 0,
      workers: 1
    });
    
    console.log('[Worker] Bergamot translator initialized');
    self.postMessage({ type: 'initialized' });
  } catch (error) {
    console.error('[Worker] Initialization failed:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

// Load Bergamot WASM module
async function loadBergamotModule(wasmPath) {
  return new Promise((resolve, reject) => {
    const Module = {
      wasmBinaryFile: wasmPath,
      onRuntimeInitialized: function() {
        resolve(this);
      },
      onAbort: function(error) {
        reject(new Error('WASM module loading failed: ' + error));
      }
    };
    
    // Initialize the module
    if (typeof createBergamotModule !== 'undefined') {
      createBergamotModule(Module);
    } else {
      reject(new Error('Bergamot module not found. Make sure bergamot-translator-worker.js is loaded.'));
    }
  });
}

// Load translation model
async function loadModel(languagePair, modelFiles) {
  try {
    console.log(`[Worker] Loading model for ${languagePair}...`);
    
    // Fetch model files
    const [modelData, vocabData, lexData, configData] = await Promise.all([
      fetch(modelFiles.model).then(r => r.arrayBuffer()),
      fetch(modelFiles.vocab).then(r => r.arrayBuffer()),
      fetch(modelFiles.lex).then(r => r.arrayBuffer()),
      fetch(modelFiles.config).then(r => r.text())
    ]);
    
    // Create model configuration
    const modelConfig = {
      model: new Uint8Array(modelData),
      vocab: new Uint8Array(vocabData),
      shortlist: new Uint8Array(lexData),
      config: configData,
      quality: false // Use speed-optimized mode
    };
    
    // Load model into translator
    const model = new bergamotModule.TranslationModel(
      modelConfig.config,
      modelConfig.model,
      modelConfig.vocab,
      modelConfig.shortlist,
      null, // No quality models
      null  // No quality vocabs
    );
    
    models.set(languagePair, model);
    currentModelPair = languagePair;
    
    console.log(`[Worker] Model ${languagePair} loaded successfully`);
    self.postMessage({ type: 'modelLoaded', languagePair });
  } catch (error) {
    console.error(`[Worker] Model loading failed:`, error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

// Translate text
async function translate(id, text, source, target) {
  try {
    const startTime = performance.now();
    
    // Check if we have the right model loaded
    const modelKey = `${source}${target}`;
    if (!models.has(modelKey)) {
      throw new Error(`Model ${modelKey} not loaded`);
    }
    
    const model = models.get(modelKey);
    
    // Create translation request
    const input = new bergamotModule.VectorString();
    input.push_back(text);
    
    // Translate
    const result = translator.translate(
      model,
      input,
      new bergamotModule.VectorResponseOptions()
    );
    
    // Parse result
    const translations = result.get(0);
    const translatedText = translations.getTranslatedText();
    
    // Get alignment information if available
    const sourceTokens = [];
    const targetTokens = [];
    
    // Try to extract tokens (this depends on Bergamot's API)
    try {
      const sentence = translations.get(0);
      
      // Extract source tokens
      for (let i = 0; i < sentence.numSourceTokens(); i++) {
        sourceTokens.push(sentence.getSourceToken(i));
      }
      
      // Extract target tokens
      for (let i = 0; i < sentence.numTargetTokens(); i++) {
        targetTokens.push(sentence.getTargetToken(i));
      }
    } catch (e) {
      console.warn('[Worker] Could not extract tokens:', e);
    }
    
    const duration = performance.now() - startTime;
    console.log(`[Worker] Translation completed in ${duration.toFixed(2)}ms`);
    
    // Clean up
    input.delete();
    result.delete();
    
    self.postMessage({
      type: 'translation',
      id: id,
      data: {
        text: translatedText,
        sourceTokens: sourceTokens,
        targetTokens: targetTokens,
        latency: duration
      }
    });
  } catch (error) {
    console.error('[Worker] Translation failed:', error);
    self.postMessage({
      type: 'translation',
      id: id,
      error: error.message
    });
  }
}

// Translate batch of texts
async function translateBatch(id, texts, source, target) {
  try {
    const startTime = performance.now();
    const modelKey = `${source}${target}`;
    
    if (!models.has(modelKey)) {
      throw new Error(`Model ${modelKey} not loaded`);
    }
    
    const model = models.get(modelKey);
    const results = {};
    
    // Create batch input
    const input = new bergamotModule.VectorString();
    texts.forEach(text => input.push_back(text));
    
    // Translate batch
    const translationResults = translator.translate(
      model,
      input,
      new bergamotModule.VectorResponseOptions()
    );
    
    // Process results
    for (let i = 0; i < texts.length; i++) {
      const translations = translationResults.get(i);
      results[texts[i]] = {
        text: translations.getTranslatedText(),
        sourceTokens: [],
        targetTokens: []
      };
    }
    
    const duration = performance.now() - startTime;
    console.log(`[Worker] Batch translation of ${texts.length} texts in ${duration.toFixed(2)}ms`);
    
    // Clean up
    input.delete();
    translationResults.delete();
    
    self.postMessage({
      type: 'translation',
      id: id,
      data: results
    });
  } catch (error) {
    console.error('[Worker] Batch translation failed:', error);
    self.postMessage({
      type: 'translation',
      id: id,
      error: error.message
    });
  }
}

// Handle messages from main thread
self.onmessage = async function(event) {
  const { action, id, ...params } = event.data;
  
  switch (action) {
    case 'initialize':
      await initialize(params.wasmPath);
      break;
      
    case 'loadModel':
      await loadModel(params.languagePair, params.modelFiles);
      break;
      
    case 'translate':
      await translate(id, params.text, params.source, params.target);
      break;
      
    case 'translateBatch':
      await translateBatch(id, params.texts, params.source, params.target);
      break;
      
    default:
      console.error('[Worker] Unknown action:', action);
      self.postMessage({
        type: 'error',
        error: `Unknown action: ${action}`
      });
  }
};

// Error handler
self.onerror = function(error) {
  console.error('[Worker] Global error:', error);
  self.postMessage({
    type: 'error',
    error: error.message || 'Unknown worker error'
  });
};