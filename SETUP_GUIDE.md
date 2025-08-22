# Indonesian Learning Extension - Setup Guide

## 🚀 Quick Start (2 minutes)

### Prerequisites
- Google Chrome browser (version 88+ required, 130+ recommended)
- Netflix account with Indonesian subtitle content

### Installation Steps

1. **Download the Extension**
   ```bash
   # Clone or download this repository
   git clone [repository-url]
   # Or download and extract the ZIP file
   ```

2. **Open Chrome Extensions Page**
   - Open Chrome browser
   - Type `chrome://extensions/` in the address bar
   - Or: Menu (⋮) → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner
   - The toggle should turn blue when enabled

4. **Load the Extension**
   - Click "Load unpacked" button (appears after enabling developer mode)
   - Navigate to the TVT folder you downloaded
   - Select the folder and click "Select Folder"
   - The extension should appear in your extensions list

5. **Verify Installation**
   - Look for "Indonesian Learning Assistant" in your extensions list
   - Ensure it's enabled (toggle should be blue)
   - You should see the extension in your Chrome toolbar

## 📺 Using the Extension

### First Time Setup

1. **Navigate to Netflix**
   - Go to https://www.netflix.com
   - Sign in to your account

2. **Find Indonesian Content**
   - Search for content with Indonesian audio or subtitles
   - Popular options:
     - Indonesian movies/series
     - International content with Indonesian subtitle option
     - Anime with Indonesian subs

3. **Enable Indonesian Subtitles**
   - Start playing your chosen content
   - Click the subtitles icon in the Netflix player
   - Select "Indonesian" or "Bahasa Indonesia"

### Using the Features

#### 🖱️ Click to Learn
- **Click any word** in the subtitles to:
  - Get instant English translation
  - Save the word to your vocabulary list
  - See the word highlighted briefly

#### 📚 View Saved Words
- Click the **green floating button (📚)** in the bottom right
- The word list panel will slide in from the right
- Features available:
  - Search your saved words
  - View definitions and context
  - See when each word was saved
  - Delete words you've learned

#### 📊 Export Vocabulary
- Open the word list panel
- Click "Export" button
- Choose location to save CSV file
- Import into Anki, Excel, or other study tools

## 🔧 Troubleshooting

### Extension Not Working?

1. **Check Netflix Detection**
   - Open Chrome DevTools (F12)
   - Go to Console tab
   - Look for: "🎬 Indonesian Learning Extension initializing..."
   - Should see: "Platform detected: netflix"

2. **Subtitles Not Appearing**
   - Ensure Indonesian subtitles are selected in Netflix
   - Try refreshing the page (F5)
   - Check if regular Netflix subtitles are visible

3. **Words Not Clickable**
   - Wait 2-3 seconds after subtitles appear
   - Try hovering over words (should show hover effect)
   - Check console for errors

4. **Translation Not Working**
   ```javascript
   // Check in console:
   localStorage.getItem('saved_words')
   // Should return array or null, not undefined
   ```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Extension not visible | Check if enabled in chrome://extensions/ |
| No floating button | Refresh Netflix page, wait for video to load |
| Translations fail | Check internet connection for LibreTranslate |
| Words not saving | Clear browser cache, reload extension |
| Panel won't open | Check for console errors, disable other extensions |

## ⚙️ Advanced Configuration

### Using Chrome Storage Instead of localStorage

Edit `src/lib/storage-manager.js`:
```javascript
// Change line 3 from:
this.useLocalStorage = true;
// To:
this.useLocalStorage = false;
```

### Changing Translation Provider Priority

Edit `src/lib/translator.js`:
```javascript
// Modify initialize() to change provider preference
if (!this.provider) {
  this.provider = 'libretranslate'; // Force LibreTranslate
}
```

### Adjusting UI Position

Edit `src/content/overlay-manager.js`:
```javascript
// Find createFloatingButton() and modify:
button.style.bottom = '20px';  // Adjust vertical position
button.style.right = '20px';   // Adjust horizontal position
```

## 🧪 Testing Different Scenarios

### Test Suite

1. **Basic Word Click**
   - Play video with Indonesian subs
   - Click a word
   - Verify it saves and shows translation

2. **Multiple Words**
   - Click 5-10 different words
   - Open word list
   - Verify all are saved

3. **Export Function**
   - Save at least 5 words
   - Click Export
   - Open CSV file
   - Verify data integrity

4. **Page Navigation**
   - Save some words
   - Navigate to different video
   - Check if words persist
   - Verify extension reinitializes

## 🔒 Privacy & Security

### Data Storage
- **All data stored locally** on your computer
- No external servers except for translation
- No user tracking or analytics
- No account required

### Permissions Explained
- `storage` - Save your vocabulary locally
- `activeTab` - Detect Netflix/YouTube
- `host_permissions` - Access Netflix for subtitle detection

## 🚦 Performance Tips

### Optimize for Better Performance

1. **Clear Old Words**
   - Regularly export and clear learned words
   - Keeps storage lean and fast

2. **Browser Settings**
   - Disable unnecessary extensions while using
   - Ensure Chrome has adequate memory allocation

3. **Network**
   - Stable internet improves translation speed
   - Consider downloading Chrome's offline translation models

## 📱 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 130+ | ✅ Full support with native translation |
| Chrome 88-129 | ✅ Works with LibreTranslate |
| Edge | ⚠️ Should work (Chromium-based) |
| Firefox | ❌ Not supported (Manifest V3 differences) |
| Safari | ❌ Not supported |

## 🎯 Tips for Language Learning

### Maximize Learning

1. **Start with Kids' Shows**
   - Simpler vocabulary
   - Clearer pronunciation
   - Repetitive phrases

2. **Focus on Common Words**
   - Click frequently appearing words first
   - Master basics before complex vocabulary

3. **Use Context**
   - Pay attention to visual cues
   - Note how words are used in sentences

4. **Regular Practice**
   - Set daily word goals (10-20 words)
   - Review exported vocabulary weekly
   - Use spaced repetition with exported CSV

## 🆘 Getting Help

### Resources

1. **Check Console Logs**
   ```javascript
   // In Chrome DevTools Console:
   console.log(localStorage.getItem('saved_words'));
   ```

2. **Reset Extension**
   ```javascript
   // Clear all data and start fresh:
   localStorage.clear();
   location.reload();
   ```

3. **Report Issues**
   - Include Chrome version
   - Include console errors
   - Describe steps to reproduce

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Green floating button appears on Netflix
- ✅ Subtitles have hover effects
- ✅ Clicking words shows brief animation
- ✅ Word list shows saved vocabulary
- ✅ Export creates valid CSV file

---

*Happy Learning! Selamat belajar! 🇮🇩*