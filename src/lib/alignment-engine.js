// src/lib/alignment-engine.js

export class AlignmentEngine {
  constructor() {
    this.initialized = false;
    this.alignmentCache = new Map();
    this.maxCacheSize = 500;
  }

  async initialize() {
    console.log("Initializing alignment engine...");
    this.initialized = true;
    return true;
  }

  // Main alignment function
  async align(sourceText, targetText, sourceTokens = null, targetTokens = null) {
    // Create cache key
    const cacheKey = `${sourceText}::${targetText}`;
    
    // Check cache
    if (this.alignmentCache.has(cacheKey)) {
      return this.alignmentCache.get(cacheKey);
    }

    // Tokenize if tokens not provided
    if (!sourceTokens) {
      sourceTokens = this.tokenize(sourceText, 'id');
    }
    if (!targetTokens) {
      targetTokens = this.tokenize(targetText, 'en');
    }

    // Perform alignment
    const alignment = this.performAlignment(sourceTokens, targetTokens);

    // Post-process alignment
    const processedAlignment = this.postProcessAlignment(alignment, sourceTokens, targetTokens);

    // Cache the result
    this.cacheAlignment(cacheKey, processedAlignment);

    return processedAlignment;
  }

  // Tokenize text into words
  tokenize(text, language) {
    // Simple tokenization - can be enhanced with language-specific rules
    const tokens = text
      .toLowerCase()
      .replace(/[.,!?;:]/g, ' $& ')
      .split(/\s+/)
      .filter(token => token.length > 0);

    return tokens.map((token, index) => ({
      text: token,
      index: index,
      start: text.indexOf(token),
      end: text.indexOf(token) + token.length,
      language: language
    }));
  }

  // Perform word alignment using modified Levenshtein distance
  performAlignment(sourceTokens, targetTokens) {
    const alignment = [];
    const sourceLen = sourceTokens.length;
    const targetLen = targetTokens.length;

    // Build similarity matrix
    const similarityMatrix = this.buildSimilarityMatrix(sourceTokens, targetTokens);

    // Find optimal alignment path using dynamic programming
    const alignmentPath = this.findAlignmentPath(similarityMatrix);

    // Convert path to alignment mappings
    for (const [sourceIdx, targetIdx] of alignmentPath) {
      alignment.push({
        source: sourceIdx,
        target: targetIdx,
        confidence: similarityMatrix[sourceIdx][targetIdx]
      });
    }

    return alignment;
  }

  // Build similarity matrix between source and target tokens
  buildSimilarityMatrix(sourceTokens, targetTokens) {
    const matrix = [];

    for (let i = 0; i < sourceTokens.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < targetTokens.length; j++) {
        matrix[i][j] = this.calculateSimilarity(
          sourceTokens[i],
          targetTokens[j]
        );
      }
    }

    return matrix;
  }

  // Calculate similarity between two tokens
  calculateSimilarity(sourceToken, targetToken) {
    // Use translation probability if available
    const translationProb = this.getTranslationProbability(
      sourceToken.text,
      targetToken.text
    );
    
    if (translationProb > 0) {
      return translationProb;
    }

    // Fallback to position-based heuristic
    const positionSimilarity = 1 - Math.abs(
      sourceToken.index / sourceToken.length - 
      targetToken.index / targetToken.length
    );

    // Consider punctuation alignment
    if (this.isPunctuation(sourceToken.text) && this.isPunctuation(targetToken.text)) {
      return 0.9;
    }

    return positionSimilarity * 0.5;
  }

  // Get translation probability from dictionary or model
  getTranslationProbability(sourceWord, targetWord) {
    // Simple dictionary for common Indonesian-English translations
    const dictionary = {
      'saya': ['i', 'me', 'my'],
      'anda': ['you', 'your'],
      'dia': ['he', 'she', 'him', 'her'],
      'mereka': ['they', 'them', 'their'],
      'ini': ['this'],
      'itu': ['that'],
      'dan': ['and'],
      'atau': ['or'],
      'tetapi': ['but'],
      'dengan': ['with'],
      'untuk': ['for', 'to'],
      'dari': ['from', 'of'],
      'ke': ['to'],
      'di': ['at', 'in', 'on'],
      'yang': ['which', 'that', 'who'],
      'tidak': ['not', 'no'],
      'ada': ['there', 'exist', 'have'],
      'adalah': ['is', 'are'],
      'akan': ['will', 'going'],
      'sudah': ['already', 'have'],
      'bisa': ['can', 'able'],
      'harus': ['must', 'have to'],
      'pergi': ['go', 'going', 'went'],
      'datang': ['come', 'coming', 'came'],
      'makan': ['eat', 'eating', 'ate'],
      'minum': ['drink', 'drinking', 'drank'],
      'tidur': ['sleep', 'sleeping', 'slept'],
      'bekerja': ['work', 'working', 'worked'],
      'belajar': ['study', 'learn', 'studying', 'learning'],
      'rumah': ['house', 'home'],
      'sekolah': ['school'],
      'pasar': ['market'],
      'toko': ['shop', 'store'],
      'mobil': ['car'],
      'motor': ['motorcycle', 'bike'],
      'buku': ['book'],
      'air': ['water'],
      'makanan': ['food'],
      'minuman': ['drink', 'beverage'],
      'besar': ['big', 'large'],
      'kecil': ['small', 'little'],
      'baru': ['new'],
      'lama': ['old', 'long'],
      'baik': ['good', 'well'],
      'buruk': ['bad'],
      'panas': ['hot'],
      'dingin': ['cold'],
      'cepat': ['fast', 'quick'],
      'lambat': ['slow'],
      'satu': ['one', '1'],
      'dua': ['two', '2'],
      'tiga': ['three', '3'],
      'empat': ['four', '4'],
      'lima': ['five', '5']
    };

    const sourceLower = sourceWord.toLowerCase();
    const targetLower = targetWord.toLowerCase();

    if (dictionary[sourceLower] && dictionary[sourceLower].includes(targetLower)) {
      return 0.9;
    }

    return 0;
  }

  // Check if token is punctuation
  isPunctuation(token) {
    return /^[.,!?;:'"()[\]{}]$/.test(token);
  }

  // Find optimal alignment path through similarity matrix
  findAlignmentPath(similarityMatrix) {
    const sourceLen = similarityMatrix.length;
    const targetLen = similarityMatrix[0] ? similarityMatrix[0].length : 0;
    
    if (sourceLen === 0 || targetLen === 0) {
      return [];
    }

    // Dynamic programming to find best path
    const path = [];
    const dp = Array(sourceLen + 1).fill(null).map(() => 
      Array(targetLen + 1).fill(-Infinity)
    );
    
    dp[0][0] = 0;

    // Fill DP table
    for (let i = 0; i <= sourceLen; i++) {
      for (let j = 0; j <= targetLen; j++) {
        if (i > 0 && j > 0) {
          // Align tokens
          dp[i][j] = Math.max(
            dp[i][j],
            dp[i-1][j-1] + similarityMatrix[i-1][j-1]
          );
        }
        if (i > 0) {
          // Skip source token
          dp[i][j] = Math.max(dp[i][j], dp[i-1][j] - 0.1);
        }
        if (j > 0) {
          // Skip target token
          dp[i][j] = Math.max(dp[i][j], dp[i][j-1] - 0.1);
        }
      }
    }

    // Backtrack to find path
    let i = sourceLen;
    let j = targetLen;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && 
          dp[i][j] === dp[i-1][j-1] + similarityMatrix[i-1][j-1]) {
        path.push([i-1, j-1]);
        i--;
        j--;
      } else if (i > 0 && dp[i][j] === dp[i-1][j] - 0.1) {
        i--;
      } else if (j > 0 && dp[i][j] === dp[i][j-1] - 0.1) {
        j--;
      } else {
        break;
      }
    }

    return path.reverse();
  }

  // Post-process alignment to handle phrases and multi-word expressions
  postProcessAlignment(alignment, sourceTokens, targetTokens) {
    const processed = {
      wordAlignment: [],
      phraseAlignment: [],
      sourceToTarget: new Map(),
      targetToSource: new Map()
    };

    // Group alignments by source and target indices
    for (const align of alignment) {
      // Word-level alignment
      processed.wordAlignment.push({
        sourceIndex: align.source,
        targetIndex: align.target,
        sourceWord: sourceTokens[align.source]?.text || '',
        targetWord: targetTokens[align.target]?.text || '',
        confidence: align.confidence
      });

      // Build bidirectional maps
      if (!processed.sourceToTarget.has(align.source)) {
        processed.sourceToTarget.set(align.source, []);
      }
      processed.sourceToTarget.get(align.source).push(align.target);

      if (!processed.targetToSource.has(align.target)) {
        processed.targetToSource.set(align.target, []);
      }
      processed.targetToSource.get(align.target).push(align.source);
    }

    // Detect phrases (consecutive words mapping to consecutive words)
    processed.phraseAlignment = this.detectPhrases(
      processed.sourceToTarget,
      sourceTokens,
      targetTokens
    );

    return processed;
  }

  // Detect phrase alignments
  detectPhrases(sourceToTarget, sourceTokens, targetTokens) {
    const phrases = [];
    const visited = new Set();

    for (const [sourceIdx, targetIndices] of sourceToTarget) {
      if (visited.has(sourceIdx)) continue;

      // Check if this is part of a phrase
      const sourcePhrase = [sourceIdx];
      const targetPhrase = [...targetIndices];

      // Extend phrase forward
      let nextSource = sourceIdx + 1;
      while (sourceToTarget.has(nextSource)) {
        const nextTargets = sourceToTarget.get(nextSource);
        const consecutive = nextTargets.some(t => 
          targetPhrase.includes(t - 1) || targetPhrase.includes(t + 1)
        );

        if (consecutive) {
          sourcePhrase.push(nextSource);
          targetPhrase.push(...nextTargets.filter(t => !targetPhrase.includes(t)));
          visited.add(nextSource);
          nextSource++;
        } else {
          break;
        }
      }

      // Only consider it a phrase if it's multi-word
      if (sourcePhrase.length > 1 || targetPhrase.length > 1) {
        phrases.push({
          sourceIndices: sourcePhrase,
          targetIndices: targetPhrase.sort((a, b) => a - b),
          sourceText: sourcePhrase.map(i => sourceTokens[i]?.text || '').join(' '),
          targetText: targetPhrase.map(i => targetTokens[i]?.text || '').join(' ')
        });
      }
    }

    return phrases;
  }

  // Cache alignment result
  cacheAlignment(key, alignment) {
    this.alignmentCache.set(key, alignment);

    // Limit cache size
    if (this.alignmentCache.size > this.maxCacheSize) {
      const firstKey = this.alignmentCache.keys().next().value;
      this.alignmentCache.delete(firstKey);
    }
  }

  // Get alignment statistics
  getStatistics(alignment) {
    const stats = {
      totalAlignments: alignment.wordAlignment.length,
      averageConfidence: 0,
      phraseCount: alignment.phraseAlignment.length,
      oneToMany: 0,
      manyToOne: 0,
      oneToOne: 0
    };

    // Calculate average confidence
    if (alignment.wordAlignment.length > 0) {
      const totalConfidence = alignment.wordAlignment.reduce(
        (sum, align) => sum + align.confidence, 0
      );
      stats.averageConfidence = totalConfidence / alignment.wordAlignment.length;
    }

    // Count alignment types
    for (const [source, targets] of alignment.sourceToTarget) {
      if (targets.length === 1) {
        const targetSources = alignment.targetToSource.get(targets[0]);
        if (targetSources && targetSources.length === 1) {
          stats.oneToOne++;
        } else {
          stats.manyToOne++;
        }
      } else if (targets.length > 1) {
        stats.oneToMany++;
      }
    }

    return stats;
  }

  // Clear alignment cache
  clearCache() {
    this.alignmentCache.clear();
    console.log("Alignment cache cleared");
  }
}