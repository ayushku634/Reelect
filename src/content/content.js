console.log('[Reel Finder] content script injected on', location.href);

// Inject the page interceptor script
const interceptorUrl = chrome.runtime.getURL('public/page-interceptor.js');
const script = document.createElement('script');
script.src = interceptorUrl;
script.type = 'text/javascript';
(document.head || document.documentElement).appendChild(script);

// Listen for intercepted API calls
window.addEventListener('reelFinderApi', (event) => {
  const { url, body, status, method, type } = event.detail;

  console.log('[Reel Finder] received intercepted data:', { url, status, method, type });

  // Send to background script for processing
  chrome.runtime.sendMessage({
    type: 'API_INTERCEPT',
    payload: { url, body, status, method, type }
  });
});

// Test message to verify communication
chrome.runtime.sendMessage({
  type: 'TEST_MESSAGE',
  payload: { source: 'content script', url: location.href }
});

console.log('[Reel Finder] content script setup complete');
