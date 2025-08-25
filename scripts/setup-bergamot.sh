#!/bin/bash

# Complete Bergamot Setup Script for TVTutor
# This script handles both pre-built downloads and local builds

set -e

echo "======================================"
echo "TVTutor Bergamot Complete Setup"
echo "======================================"
echo ""

# Function to download pre-built artifacts
download_prebuilt() {
    echo "Attempting to download pre-built Bergamot artifacts..."
    
    # Create directories
    mkdir -p public/models
    mkdir -p temp
    
    # Check Mozilla's CDN for pre-built files
    MOZILLA_CDN="https://firefox-settings-attachments.cdn.mozilla.net/main-workspace/ms-browser-translations"
    
    echo "Checking Mozilla CDN for pre-built WASM..."
    
    # Try to download from Mozilla's translation extension
    if curl -L -o temp/bergamot.zip "https://github.com/mozilla/firefox-translations/archive/refs/heads/main.zip" 2>/dev/null; then
        echo "Extracting Mozilla's Bergamot implementation..."
        cd temp
        unzip -q bergamot.zip
        
        # Look for WASM files in the Mozilla extension
        if [ -f "firefox-translations-main/extension/model/bergamot-translator-worker.wasm" ]; then
            cp firefox-translations-main/extension/model/bergamot-translator-worker.* ../public/models/
            echo "✅ Found pre-built WASM files from Mozilla!"
            cd ..
            rm -rf temp
            return 0
        fi
        cd ..
    fi
    
    echo "Pre-built files not found. You'll need to build from source."
    return 1
}

# Function to build from source
build_from_source() {
    echo "Setting up to build Bergamot from source..."
    
    # Check if build directory already exists
    if [ -d "bergamot-translator" ]; then
        echo "Bergamot repository already exists. Using existing clone."
        cd bergamot-translator
        git pull
    else
        echo "Cloning Bergamot translator repository..."
        git clone --recursive https://github.com/browsermt/bergamot-translator.git
        cd bergamot-translator
    fi
    
    # Check for Emscripten
    if [ "$EMSDK" == "" ]; then
        echo ""
        echo "⚠️  Emscripten not found. Setting up Emscripten..."
        
        if [ ! -d "emsdk" ]; then
            git clone https://github.com/emscripten-core/emsdk.git
        fi
        
        cd emsdk
        ./emsdk install 3.1.8
        ./emsdk activate 3.1.8
        source ./emsdk_env.sh
        cd ..
    fi
    
    echo "Building Bergamot WASM..."
    
    # Create build directory
    mkdir -p build-wasm
    cd build-wasm
    
    # Configure and build
    emcmake cmake -DCOMPILE_WASM=on ../
    emmake make -j2
    
    # Patch artifacts
    bash ../wasm/patch-artifacts-import-gemm-module.sh
    
    # Copy artifacts to public directory
    echo "Copying WASM artifacts..."
    cp bergamot-translator-worker.js ../../public/models/
    cp bergamot-translator-worker.wasm ../../public/models/
    
    cd ../..
    
    echo "✅ Bergamot WASM built successfully!"
}

# Function to download Indonesian model
download_model() {
    echo ""
    echo "Downloading Indonesian-English translation model..."
    
    mkdir -p public/models/iden
    cd public/models/iden
    
    # Use Mozilla's production models (better quality than tiny)
    BASE_URL="https://github.com/mozilla/firefox-translations-models/raw/main/models/prod/iden"
    
    echo "Downloading model files (this may take a while)..."
    
    # Download model file (~17MB)
    echo -n "  Downloading model file... "
    if curl -L -o model.iden.intgemm.alphas.bin "$BASE_URL/model.iden.intgemm.alphas.bin" 2>/dev/null; then
        echo "✓"
    else
        echo "✗ Failed"
        exit 1
    fi
    
    # Download vocabulary (~800KB)
    echo -n "  Downloading vocabulary... "
    if curl -L -o vocab.iden.spm "$BASE_URL/vocab.iden.spm" 2>/dev/null; then
        echo "✓"
    else
        echo "✗ Failed"
        exit 1
    fi
    
    # Download lexical shortlist (~3MB)
    echo -n "  Downloading shortlist... "
    if curl -L -o lex.50.50.iden.s2t.bin "$BASE_URL/lex.50.50.iden.s2t.bin" 2>/dev/null; then
        echo "✓"
    else
        echo "✗ Failed"
        exit 1
    fi
    
    # Create config file
    echo -n "  Creating config file... "
    cat > config.intgemm8bit.yml << 'EOF'
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
alignment: soft
EOF
    echo "✓"
    
    cd ../../..
    echo "✅ Model files downloaded successfully!"
}

# Main setup flow
echo "Choose setup method:"
echo "1) Try to download pre-built files (fastest)"
echo "2) Build from source (requires build tools)"
echo "3) Download model files only (if you have WASM already)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        if download_prebuilt; then
            download_model
        else
            echo ""
            echo "Would you like to build from source instead? (y/n)"
            read -p "> " build_choice
            if [ "$build_choice" = "y" ]; then
                build_from_source
                download_model
            fi
        fi
        ;;
    2)
        build_from_source
        download_model
        ;;
    3)
        download_model
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Verify installation
echo ""
echo "======================================"
echo "Verifying Installation"
echo "======================================"
echo ""

MISSING_FILES=()

# Check for WASM files
if [ ! -f "public/models/bergamot-translator-worker.js" ]; then
    MISSING_FILES+=("bergamot-translator-worker.js")
fi

if [ ! -f "public/models/bergamot-translator-worker.wasm" ]; then
    MISSING_FILES+=("bergamot-translator-worker.wasm")
fi

# Check for model files
if [ ! -f "public/models/iden/model.iden.intgemm.alphas.bin" ]; then
    MISSING_FILES+=("model file")
fi

if [ ! -f "public/models/iden/vocab.iden.spm" ]; then
    MISSING_FILES+=("vocabulary file")
fi

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "✅ All files installed successfully!"
    echo ""
    echo "You can now test the integration by opening test-bergamot.html"
    echo ""
    echo "File sizes:"
    ls -lh public/models/bergamot-translator-worker.* 2>/dev/null || true
    ls -lh public/models/iden/*.bin 2>/dev/null || true
else
    echo "⚠️  Missing files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "Please run the setup again or build from source."
fi