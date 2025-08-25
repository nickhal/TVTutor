# TVTutor Bergamot Quick Start

## Two Options to Get Bergamot Working:

### Option 1: Use Pre-Built Files (Easiest)
If you can find pre-built Bergamot WASM files:

1. Download these two files:
   - `bergamot-translator-worker.js`
   - `bergamot-translator-worker.wasm`

2. Place them in `public/models/`

3. Run the model download:
```bash
chmod +x scripts/setup-bergamot.sh
./scripts/setup-bergamot.sh
# Choose option 3 (Download model files only)
```

### Option 2: Build From Source
If you need to build Bergamot yourself:

```bash
# Run the complete setup script
chmod +x scripts/setup-bergamot.sh
./scripts/setup-bergamot.sh
# Choose option 2 (Build from source)
```

This will:
- Clone Bergamot repository
- Install Emscripten if needed
- Build WASM files
- Download Indonesian model
- Verify installation

## Where to Find Pre-Built Files:

1. **Mozilla Firefox Translations** (might have them):
   - https://github.com/mozilla/firefox-translations
   - Look in `extension/model/` directory

2. **Bergamot Project Releases**:
   - https://github.com/browsermt/bergamot-translator/releases
   - Check for compiled WASM artifacts

3. **Build Your Own** (20-30 minutes):
   - The setup script handles everything
   - Requires ~2GB disk space temporarily
   - Produces ~5MB WASM files

## Testing Your Setup:

```bash
# After setup, test it:
open test-bergamot.html
```

You should see:
- "✅ Bergamot translator ready!" 
- Translation latency < 50ms
- Color-coded word alignment

## Troubleshooting:

**If Bergamot doesn't load:**
- Check browser console for errors
- Verify files exist in `public/models/`
- Try Chrome/Firefox (Safari has limited WASM support)

**If translation is slow:**
- Make sure you're using production models (not tiny)
- Check that WASM SIMD is enabled in your browser
- Verify models are cached in IndexedDB

## File Structure After Setup:
```
public/models/
├── bergamot-translator-worker.js    # ~100KB
├── bergamot-translator-worker.wasm  # ~5MB
└── iden/
    ├── model.iden.intgemm.alphas.bin  # ~17MB
    ├── vocab.iden.spm                 # ~800KB
    ├── lex.50.50.iden.s2t.bin        # ~3MB
    └── config.intgemm8bit.yml         # ~1KB
```

Total size: ~26MB (cached locally for instant translation)

## The Color System Works Like This:

Indonesian: "Saya pergi ke pasar"
- "Saya" → Red
- "pergi" → Teal  
- "ke" → Blue
- "pasar" → Green

English: "I go to the market"
- "I" → Red (matches "Saya")
- "go" → Teal (matches "pergi")
- "to" → Blue (matches "ke")
- "the market" → Green (matches "pasar")

This visual alignment helps you instantly see which words translate to which!