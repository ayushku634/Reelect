import { extractReelsFromGraphql, extractReelsFromRestApi } from './pipeline/interceptor.js';
import { buildReelDocument } from './pipeline/document-builder.js';
import { tierManager } from './storage/tier-manager.js';
import { db } from './storage/db.js';

console.log('[Reel Finder] background worker started');
const processedShortcodes = new Set();

function updateBadge() {
  tierManager.getTier1Count().then(count => {
    const text = count > 0 ? String(Math.min(count, 999)) : '';
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#4A90E2' });
  }).catch(error => {
    console.error('[Reel Finder] error updating badge:', error);
  });
}

// Initialize badge on startup
updateBadge();

chrome.runtime.onMessage.addListener((message, sender) => {
  console.log('[Reel Finder] received message', message?.type, message?.payload?.source || message?.payload?.method || '');

  if (message?.type === 'API_INTERCEPT') {
    const { url, body, status, method, type } = message.payload;

    console.log('[Reel Finder] processing API intercept:', { url, status, method, type, bodyLength: body?.length });

    try {
      // Try to parse as JSON
      const json = JSON.parse(body);
      console.log('[Reel Finder] successfully parsed JSON response for:', url);

      // Choose extraction method based on URL
      let reels = [];
      if (url.includes('/api/v1/feed/saved/posts/')) {
        console.log('[Reel Finder] using REST API extraction for saved posts');
        reels = extractReelsFromRestApi(json);
      } else {
        console.log('[Reel Finder] using GraphQL extraction');
        reels = extractReelsFromGraphql(json);
      }

      console.log('[Reel Finder] extracted', reels.length, 'reels from API response');

      if (reels.length > 0) {
        console.log('[Reel Finder] sample reel:', reels[0]);
      }

      // Process each reel through the enrichment pipeline
      reels.forEach(async (reel) => {
        try {
          await processReel(reel);
        } catch (error) {
          console.error('[Reel Finder] error processing reel:', reel.id, error);
        }
      });

    } catch (e) {
      console.log('[Reel Finder] failed to parse API response as JSON:', e.message, 'URL:', url);
      // Log first 500 chars of response for debugging
      console.log('[Reel Finder] response preview:', body?.substring(0, 500));
    }
  } else if (message?.type === 'TEST_MESSAGE') {
    console.log('[Reel Finder] test message received:', message.payload);
  }
});

/**
 * Process a single reel through the enrichment pipeline
 * @param {object} reel - Raw reel object from interceptor
 */
async function processReel(reel) {
  // Check if we've already processed this reel
  if (processedShortcodes.has(reel.id)) {
    console.log('[Reel Finder] skipping already processed reel:', reel.id);
    return;
  }

  // Check if it exists in database
  const exists = await tierManager.reelExists(reel.id);
  if (exists) {
    console.log('[Reel Finder] reel already exists in database:', reel.id);
    processedShortcodes.add(reel.id);
    return;
  }

  console.log('[Reel Finder] processing new reel:', reel.id);

  try {
    // Build complete document with enrichments
    const document = await buildReelDocument(reel);

    // Store document and manage tiers
    await tierManager.processNewDocument(document);

    // Mark as processed
    processedShortcodes.add(reel.id);

    // Update badge
    updateBadge();

    console.log('[Reel Finder] successfully processed reel:', reel.id);

  } catch (error) {
    console.error('[Reel Finder] failed to process reel:', reel.id, error);
  }
}
