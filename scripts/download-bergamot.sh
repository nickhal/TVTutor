#!/bin/bash

# Script to download Bergamot translator files and models
# Run this script to set up the required files for local translation

echo "======================================"
echo "TVTutor Bergamot Setup Script"
echo "======================================"
echo ""

# Create directories
echo "Creating directories..."
mkdir -p public/models/iden
mkdir -p public/models

# Download Bergamot WASM files
echo ""
echo "Downloading Bergamot WASM files..."
echo "Please visit: https://github.com/browsermt/bergamot-translator/releases"
echo "Download the latest bergamot-translator-worker.js and bergamot-translator-worker.wasm"
echo "Place them in the public/models/ directory"
echo ""
echo "Direct links (may need updating):"
echo "- https://github.com/browsermt/bergamot-translator/releases/download/v0.4.4/bergamot-translator-worker.js"
echo "- https://github.com/browsermt/bergamot-translator/releases/download/v0.4.4/bergamot-translator-worker.wasm"

# Download Indonesian-English model files
echo ""
echo "Downloading Indonesian-English model files..."
cd public/models/iden

# Model file
echo "Downloading model file..."
curl -L -o model.iden.intgemm.alphas.bin \
  "https://github.com/mozilla/firefox-translations-models/raw/main/models/prod/iden/model.iden.intgemm.alphas.bin"

# Vocabulary file
echo "Downloading vocabulary file..."
curl -L -o vocab.iden.spm \
  "https://github.com/mozilla/firefox-translations-models/raw/main/models/prod/iden/vocab.iden.spm"

# Lexical shortlist file
echo "Downloading lexical shortlist file..."
curl -L -o lex.50.50.iden.s2t.bin \
  "https://github.com/mozilla/firefox-translations-models/raw/main/models/prod/iden/lex.50.50.iden.s2t.bin"

# Config file
echo "Creating config file..."
cat > config.intgemm8bit.yml << 'EOF'
# Bergamot model configuration
relative-paths: false
beam-size: 1
normalize: 1.0
word-penalty: 0
max-length-break: 128
mini-batch-words: 1024
workspace: 128
max-length-factor: 2.0
skip-cost: true
cpu-threads: 0
quiet: true
quiet-translation: true
gemm-precision: int8shift
EOF

cd ../../..

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Files have been downloaded to:"
echo "- public/models/iden/ (model files)"
echo ""
echo "IMPORTANT: You still need to manually download:"
echo "1. bergamot-translator-worker.js"
echo "2. bergamot-translator-worker.wasm"
echo "from https://github.com/browsermt/bergamot-translator/releases"
echo "and place them in public/models/"
echo ""
echo "Model size: ~40MB total"
echo "Expected translation latency: <50ms"