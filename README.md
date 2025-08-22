# Indonesian Learning Chrome Extension

A Chrome extension for learning Indonesian while watching Netflix and YouTube with real-time subtitle translations and vocabulary building.

## Features

- 🎬 **Real-time Subtitle Translation**: Instant Indonesian to English translation
- 📝 **Click-to-Save Words**: Click any word in subtitles to save with definition
- 🎯 **Platform Support**: Works on Netflix (YouTube support coming soon)
- 💾 **Local Storage**: All words saved locally with context
- 🚀 **Fast Translation**: Chrome native API with LibreTranslate fallback
- 📊 **Export Vocabulary**: Export saved words to CSV

## Installation

### Development Mode
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select this extension directory

## Usage

1. Navigate to Netflix
2. Play content with Indonesian subtitles
3. Click words in subtitles to save them
4. Click the 📚 floating button to view saved words
5. Export vocabulary for external study

## Project Structure

```
├── manifest.json           # Extension manifest
├── src/
│   ├── background/        # Service worker
│   ├── content/          # Content scripts
│   ├── adapters/         # Platform adapters
│   ├── inject/           # Injected scripts
│   ├── lib/              # Shared libraries
│   ├── ui/               # UI components
│   └── shared/           # Constants and config
└── data/                  # Indonesian language data
```

## How It Works

1. **Platform Detection**: Automatically detects Netflix or YouTube
2. **Subtitle Monitoring**: Watches for subtitle changes using DOM observation
3. **Shadow DOM UI**: Creates isolated UI components that won't conflict with website styles
4. **Click to Learn**: Click any word in subtitles to get instant translation
5. **Smart Caching**: Caches translations locally for faster access

## Translation Providers

- **Chrome Native API** (Primary) - Fast, offline translation
- **LibreTranslate** (Fallback) - Free, open-source API
- **Local Dictionary** (Last resort) - Basic word lookup

## Privacy

- All data stored locally
- No user tracking
- Open source

## Known Limitations

- YouTube support is not yet fully implemented
- Chrome's built-in translator requires Chrome 130+
- LibreTranslate public API may have rate limits

## License

MIT