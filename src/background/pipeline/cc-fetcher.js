/**
 * CC Fetcher - Fetches and parses .vtt subtitle files
 * Converts Instagram's auto-generated captions to clean transcript text
 */

/**
 * Fetch and parse a .vtt subtitle file
 * @param {string} vttUrl - URL to the .vtt file
 * @returns {Promise<string|null>} Clean transcript text or null if unavailable
 */
export async function fetchTranscript(vttUrl) {
  if (!vttUrl) {
    console.log('[Reel Finder] no VTT URL provided');
    return null;
  }

  try {
    console.log('[Reel Finder] fetching transcript from:', vttUrl);

    const response = await fetch(vttUrl);
    if (!response.ok) {
      console.log('[Reel Finder] VTT fetch failed:', response.status, response.statusText);
      return null;
    }

    const vttText = await response.text();
    const transcript = parseVttToTranscript(vttText);

    console.log('[Reel Finder] extracted transcript:', transcript?.substring(0, 100) + '...');
    return transcript;

  } catch (error) {
    console.error('[Reel Finder] error fetching transcript:', error);
    return null;
  }
}

/**
 * Parse VTT content to clean transcript text
 * @param {string} vttText - Raw VTT file content
 * @returns {string|null} Clean transcript or null if parsing fails
 */
function parseVttToTranscript(vttText) {
  if (!vttText || typeof vttText !== 'string') {
    return null;
  }

  try {
    // Split into lines
    const lines = vttText.split('\n').map(line => line.trim());

    // Filter out VTT headers and metadata
    const transcriptLines = lines.filter(line => {
      // Skip WEBVTT header
      if (line.toUpperCase() === 'WEBVTT') return false;

      // Skip empty lines
      if (!line) return false;

      // Skip timestamp lines (contain colons and dashes like "00:00:01.000 --> 00:00:04.000")
      if (line.includes('-->') && /\d{2}:\d{2}/.test(line)) return false;

      // Skip cue numbers (just digits)
      if (/^\d+$/.test(line)) return false;

      return true;
    });

    // Join lines with spaces
    let transcript = transcriptLines.join(' ');

    // Clean up common auto-caption issues
    transcript = cleanTranscript(transcript);

    // Return null if transcript is too short or empty
    if (!transcript || transcript.length < 10) {
      return null;
    }

    return transcript.trim();

  } catch (error) {
    console.error('[Reel Finder] error parsing VTT:', error);
    return null;
  }
}

/**
 * Clean up common auto-caption artifacts
 * @param {string} text - Raw transcript text
 * @returns {string} Cleaned transcript
 */
function cleanTranscript(text) {
  if (!text) return '';

  let cleaned = text;

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove common filler words that auto-captions add
  cleaned = cleaned.replace(/\b(um|uh|like|you know|so|well|actually|basically|i mean)\b/gi, '');

  // Deduplicate consecutive repeated phrases (common in auto-captions)
  cleaned = deduplicateRepeatedPhrases(cleaned);

  // Remove leading/trailing punctuation that might be artifacts
  cleaned = cleaned.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9]+$/, '');

  return cleaned.trim();
}

/**
 * Remove consecutive duplicate phrases that auto-captions often repeat
 * @param {string} text - Transcript text
 * @returns {string} Text with duplicates removed
 */
function deduplicateRepeatedPhrases(text) {
  if (!text) return '';

  const words = text.split(' ');
  const result = [];
  let lastPhrase = '';
  let phraseCount = 0;

  for (let i = 0; i < words.length; i++) {
    const currentPhrase = words.slice(i, i + 3).join(' ').toLowerCase(); // Check 3-word phrases

    if (currentPhrase === lastPhrase && currentPhrase.length > 5) {
      phraseCount++;
      // If we've seen this phrase 2+ times consecutively, skip it
      if (phraseCount >= 2) {
        continue;
      }
    } else {
      phraseCount = 0;
      lastPhrase = currentPhrase;
    }

    result.push(words[i]);
  }

  return result.join(' ');
}