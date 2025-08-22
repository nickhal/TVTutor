// Check Chrome Translation API availability
async function checkChromeAPI() {
  const resultDiv = document.getElementById("chrome-result");
  const statusSpan = document.getElementById("chrome-status");

  try {
    resultDiv.className = "result info";
    resultDiv.textContent = "Checking Chrome Translation API...\n\n";

    // Check if API exists
    if (typeof chrome === "undefined") {
      throw new Error(
        "Chrome API not available - not running in extension context"
      );
    }

    // Send message to service worker
    chrome.runtime.sendMessage(
      {
        type: "PING",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resultDiv.className = "result error";
          resultDiv.textContent =
            "Error: " + chrome.runtime.lastError.message;
          statusSpan.className = "status not-ready";
          statusSpan.textContent = "Not Available";
        } else if (response) {
          if (response.provider === "google-unofficial") {
            resultDiv.className = "result success";
            resultDiv.textContent = 'Using Google Translate (unofficial API):\n' + JSON.stringify(response, null, 2);
            statusSpan.className = "status ready";
            statusSpan.textContent = "Ready (Google)";
          } else if (response.translatorAvailable) {
            resultDiv.className = "result success";
            resultDiv.textContent = JSON.stringify(response, null, 2);
            statusSpan.className = "status ready";
            statusSpan.textContent = "Ready";
          } else {
            resultDiv.className = "result info";
            resultDiv.textContent = 'Translation available via fallback:\n' + JSON.stringify(response, null, 2);
            statusSpan.className = "status ready";
            statusSpan.textContent = "Ready (Fallback)";
          }
        }
      }
    );
  } catch (error) {
    resultDiv.className = "result error";
    resultDiv.textContent = "Error: " + error.message;
    statusSpan.className = "status not-ready";
    statusSpan.textContent = "Error";
  }
}

// Test Chrome translation
async function testChromeTranslation() {
  const text = document.getElementById('test-input').value || 'Selamat pagi';
  const resultDiv = document.getElementById('chrome-result');
  
  try {
    chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      data: { word: text, context: 'test' }
    }, response => {
      if (chrome.runtime.lastError) {
        resultDiv.className = 'result error';
        resultDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
      } else if (response) {
        resultDiv.className = response.error ? "result error" : "result success";
        resultDiv.textContent = `Input: "${text}"\nTranslation: ${
          response.translation || response.error || "No translation"
        }`;
      }
    });
  } catch (error) {
    resultDiv.className = 'result error';
    resultDiv.textContent = 'Error: ' + error.message;
  }
}

// Test via service worker
async function testServiceWorker() {
  const text =
    document.getElementById("test-input").value || "Selamat pagi";
  const resultDiv = document.getElementById("translation-result");

  try {
    resultDiv.className = "result info";
    resultDiv.textContent = "Sending to service worker...";

    chrome.runtime.sendMessage(
      {
        type: "TRANSLATE",
        data: { word: text, context: "test" },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resultDiv.className = "result error";
          resultDiv.textContent =
            "Error: " + chrome.runtime.lastError.message;
        } else if (response) {
          resultDiv.className = response.error
            ? "result error"
            : "result success";
          resultDiv.textContent = JSON.stringify(response, null, 2);
        }
      }
    );
  } catch (error) {
    resultDiv.className = "result error";
    resultDiv.textContent = "Error: " + error.message;
  }
}

// Test all translation methods
async function testAllMethods() {
  const text =
    document.getElementById("test-input").value || "Selamat pagi";
  const resultDiv = document.getElementById("translation-result");

  try {
    resultDiv.className = "result info";
    resultDiv.textContent = "Testing all translation methods...\n\n";

    // Test Google Unofficial
    try {
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=en&dt=t&q=${encodeURIComponent(
        text
      )}`;
      const googleResponse = await fetch(googleUrl);
      const googleData = await googleResponse.json();
      let googleTranslation = "";
      if (googleData && googleData[0]) {
        for (let i = 0; i < googleData[0].length; i++) {
          if (googleData[0][i] && googleData[0][i][0]) {
            googleTranslation += googleData[0][i][0];
          }
        }
      }
      resultDiv.textContent += `✅ Google Unofficial: "${googleTranslation}"\n`;
    } catch (e) {
      resultDiv.textContent += `❌ Google Unofficial: ${e.message}\n`;
    }

    // Test LibreTranslate
    try {
      const libreResponse = await fetch(
        "https://libretranslate.com/translate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: "id",
            target: "en",
            format: "text",
          }),
        }
      );
      const libreData = await libreResponse.json();
      resultDiv.textContent += `✅ LibreTranslate: "${
        libreData.translatedText || "No translation"
      }"\n`;
    } catch (e) {
      resultDiv.textContent += `❌ LibreTranslate: ${e.message}\n`;
    }

    // Test MyMemory
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=id|en`;
      const myMemoryResponse = await fetch(myMemoryUrl);
      const myMemoryData = await myMemoryResponse.json();
      resultDiv.textContent += `✅ MyMemory: "${
        myMemoryData.responseData?.translatedText || "No translation"
      }"\n`;
    } catch (e) {
      resultDiv.textContent += `❌ MyMemory: ${e.message}\n`;
    }
  } catch (error) {
    resultDiv.className = "result error";
    resultDiv.textContent = "Error: " + error.message;
  }
}

// Test all APIs availability
async function testAPIs() {
  const resultDiv = document.getElementById("api-result");
  resultDiv.className = "result info";
  resultDiv.textContent = "Testing API availability...\n\n";

  const apis = [
    {
      name: "Google Translate (Unofficial)",
      url: "https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=en&dt=t&q=test",
    },
    {
      name: "LibreTranslate",
      url: "https://libretranslate.com/languages",
    },
    {
      name: "MyMemory",
      url: "https://api.mymemory.translated.net/get?q=test&langpair=id|en",
    },
  ];

  for (const api of apis) {
    try {
      const response = await fetch(api.url);
      if (response.ok) {
        resultDiv.textContent += `✅ ${api.name}: Available (Status: ${response.status})\n`;
      } else {
        resultDiv.textContent += `⚠️ ${api.name}: Status ${response.status}\n`;
      }
    } catch (e) {
      resultDiv.textContent += `❌ ${api.name}: ${e.message}\n`;
    }
  }
}

// Test specific phrase
async function testPhrase(phrase) {
  document.getElementById("test-input").value = phrase;
  const resultDiv = document.getElementById("phrase-result");

  try {
    resultDiv.className = "result info";
    resultDiv.textContent = `Translating: "${phrase}"...\n\n`;

    chrome.runtime.sendMessage(
      {
        type: "TRANSLATE",
        data: { word: phrase, context: "test phrase" },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resultDiv.className = "result error";
          resultDiv.textContent =
            "Error: " + chrome.runtime.lastError.message;
        } else if (response) {
          resultDiv.className = response.error
            ? "result error"
            : "result success";
          resultDiv.textContent = `Indonesian: "${phrase}"\nEnglish: "${
            response.translation || response.error || "No translation"
          }"`;
        }
      }
    );
  } catch (error) {
    resultDiv.className = "result error";
    resultDiv.textContent = "Error: " + error.message;
  }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Add click event listeners to buttons
  document.getElementById('btn-check-chrome').addEventListener('click', checkChromeAPI);
  document.getElementById('btn-test-chrome').addEventListener('click', testChromeTranslation);
  document.getElementById('btn-test-all').addEventListener('click', testAllMethods);
  document.getElementById('btn-test-sw').addEventListener('click', testServiceWorker);
  document.getElementById('btn-test-apis').addEventListener('click', testAPIs);
  
  // Add phrase test buttons
  document.getElementById('btn-phrase-1').addEventListener('click', () => testPhrase('Apa kabar?'));
  document.getElementById('btn-phrase-2').addEventListener('click', () => testPhrase('Terima kasih banyak'));
  document.getElementById('btn-phrase-3').addEventListener('click', () => testPhrase('Saya tidak mengerti'));
  document.getElementById('btn-phrase-4').addEventListener('click', () => testPhrase('Dimana kamar mandi?'));
  
  // Check status on load
  if (typeof chrome !== "undefined" && chrome.runtime) {
    checkChromeAPI();
  } else {
    document.getElementById("chrome-status").className = "status not-ready";
    document.getElementById("chrome-status").textContent = "Not in Extension";
    document.getElementById("chrome-result").className = "result info";
    document.getElementById("chrome-result").textContent =
      'This page must be opened from the extension.\n\n1. Install the extension\n2. Go to chrome://extensions/\n3. Find the extension and click "Details"\n4. Navigate to chrome-extension://[extension-id]/test.html';
  }
});