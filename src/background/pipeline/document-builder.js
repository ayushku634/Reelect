/**
 * Document Builder - Assembles complete ReelDocument from raw data and enrichments
 * Combines all pipeline stages into final indexed document
 */

import { tagMetadata } from './metadata-tagger.js';
import { fetchTranscript } from './cc-fetcher.js';

/**
 * Build complete ReelDocument from raw reel data
 * @param {object} rawReel - Raw reel object from interceptor
 * @returns {Promise<object>} Complete ReelDocument
 */
export async function buildReelDocument(rawReel) {
  if (!rawReel || !rawReel.id) {
    throw new Error('Invalid reel data provided to document builder');
  }

  console.log('[Reel Finder] building document for reel:', rawReel.id);

  try {
    // Extract metadata (categories, audio analysis)
    const metadata = tagMetadata(rawReel);
    console.log('[Reel Finder] tagged metadata:', metadata);

    // Fetch transcript if CC URL available
    let transcript = null;
    if (rawReel.ccUrl) {
      console.log('[Reel Finder] fetching transcript from:', rawReel.ccUrl);
      transcript = await fetchTranscript(rawReel.ccUrl);
    }

    // Build complete document
    const document = {
      id: rawReel.id,
      url: rawReel.url,
      thumbnailUrl: rawReel.thumbnailUrl || '',
      creator: {
        username: rawReel.creatorUsername || '',
        displayName: rawReel.creatorUsername || '' // We don't have display name in current data
      },
      caption: rawReel.caption || '',
      hashtags: extractHashtags(rawReel),
      audio: metadata.audio,
      transcript: transcript,
      visualDescription: null, // Will be added in Phase 4
      categories: metadata.categories,
      savedAt: Date.now(), // When user saved it (approximated)
      indexedAt: Date.now(), // When we processed it
      tier: 1
    };

    console.log('[Reel Finder] built document:', {
      id: document.id,
      categories: document.categories,
      hasTranscript: !!document.transcript,
      transcriptLength: document.transcript?.length || 0
    });

    return document;

  } catch (error) {
    console.error('[Reel Finder] error building document:', error);
    throw error;
  }
}

/**
 * Extract hashtags from various sources in the reel data
 * @param {object} rawReel - Raw reel object
 * @returns {string[]} Array of hashtags
 */
function extractHashtags(rawReel) {
  const hashtags = [];

  // From caption (extract #hashtags)
  if (rawReel.caption) {
    const captionHashtags = rawReel.caption.match(/#[\w]+/g);
    if (captionHashtags) {
      hashtags.push(...captionHashtags.map(tag => tag.substring(1))); // Remove #
    }
  }

  // From existing hashtags array if present
  if (rawReel.hashtags && Array.isArray(rawReel.hashtags)) {
    // Clean up hashtags (remove # if present)
    const cleaned = rawReel.hashtags.map(tag =>
      typeof tag === 'string' && tag.startsWith('#') ? tag.substring(1) : tag
    );
    hashtags.push(...cleaned);
  }

  // Remove duplicates and filter
  return [...new Set(hashtags)]
    .filter(tag => tag && typeof tag === 'string' && tag.length > 0)
    .map(tag => tag.toLowerCase());
}

/**
 * Create text for embedding from document
 * Follows the template from system design
 * @param {object} document - ReelDocument
 * @returns {string} Text to embed
 */
export function buildEmbeddingText(document) {
  const parts = [];

  // Creator info
  if (document.creator?.username) {
    parts.push(`Creator: ${document.creator.username}`);
    if (document.creator.displayName && document.creator.displayName !== document.creator.username) {
      parts.push(document.creator.displayName);
    }
  }

  // Categories
  if (document.categories && document.categories.length > 0) {
    parts.push(`Category: ${document.categories.join(", ")}`);
  }

  // Audio info
  if (document.audio?.title) {
    parts.push(`Audio: ${document.audio.title}`);
    if (document.audio.artist) {
      parts.push(`by ${document.audio.artist}`);
    }
  }

  // Caption
  if (document.caption) {
    parts.push(`Caption: ${document.caption}`);
  }

  // Hashtags
  if (document.hashtags && document.hashtags.length > 0) {
    parts.push(`Hashtags: ${document.hashtags.join(" ")}`);
  }

  // Transcript
  if (document.transcript) {
    parts.push(`Transcript: ${document.transcript}`);
  }

  // Visual description (for future Phase 4)
  if (document.visualDescription) {
    parts.push(`Visual: ${document.visualDescription}`);
  }

  return parts.join(' ').trim();
}