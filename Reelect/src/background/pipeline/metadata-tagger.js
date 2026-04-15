/**
 * Metadata Tagger - Enriches reel data with categories and audio analysis
 * Uses keyword dictionaries and pattern matching for classification
 */

// Category keyword dictionaries
const CATEGORY_KEYWORDS = {
  fitness: [
    'gym', 'workout', 'exercise', 'training', 'reps', 'sets', 'squat', 'deadlift',
    'cardio', 'running', 'yoga', 'pilates', 'strength', 'muscle', 'protein',
    'weight', 'lift', 'bench', 'pull', 'push', 'core', 'abs', 'flexibility'
  ],
  nutrition: [
    'recipe', 'cook', 'food', 'eat', 'meal', 'calories', 'protein', 'ingredient',
    'kitchen', 'bake', 'diet', 'healthy', 'nutrition', 'meal prep', 'cooking',
    'breakfast', 'lunch', 'dinner', 'snack', 'smoothie', 'salad'
  ],
  productivity: [
    'routine', 'habit', 'morning', 'focus', 'deep work', 'journaling', 'planning',
    'schedule', 'system', 'organization', 'time management', 'goals', 'motivation',
    'discipline', 'productivity', 'workflow', 'efficiency', 'task', 'deadline'
  ],
  finance: [
    'money', 'invest', 'budget', 'savings', 'stock', 'crypto', 'income', 'passive',
    'wealth', 'financial', 'economy', 'market', 'trading', 'business', 'entrepreneur',
    'startup', 'profit', 'revenue', 'cash', 'bank', 'loan'
  ],
  travel: [
    'travel', 'trip', 'visit', 'hotel', 'flight', 'country', 'city', 'explore',
    'adventure', 'destination', 'vacation', 'holiday', 'tourist', 'backpacking',
    'wanderlust', 'journey', 'road trip', 'beach', 'mountain'
  ],
  tech: [
    'coding', 'app', 'software', 'tool', 'ai', 'developer', 'build', 'tech',
    'product', 'startup', 'programming', 'code', 'javascript', 'python', 'react',
    'web', 'mobile', 'design', 'ui', 'ux', 'digital'
  ],
  'mental health': [
    'anxiety', 'stress', 'therapy', 'mindfulness', 'meditation', 'mental health',
    'burnout', 'healing', 'self care', 'wellness', 'mindset', 'positive', 'gratitude',
    'breathing', 'relaxation', 'therapy', 'counseling', 'depression'
  ],
  'diy craft': [
    'diy', 'craft', 'build', 'make', 'tutorial', 'how to', 'step by step', 'create',
    'art', 'painting', 'drawing', 'sewing', 'knitting', 'woodworking', 'home decor',
    'handmade', 'creative', 'artisan', 'crafting'
  ]
};

// Known aesthetic/ambient audio tracks
const KNOWN_AMBIENT_TRACKS = [
  'lo-fi', 'ambient', 'chill', 'relaxing', 'peaceful', 'meditation',
  'nature sounds', 'ocean waves', 'rain sounds', 'forest sounds'
];

/**
 * Tag a reel with metadata including categories and audio analysis
 * @param {object} reel - Raw reel object from interceptor
 * @returns {object} Enriched metadata
 */
export function tagMetadata(reel) {
  if (!reel || typeof reel !== 'object') {
    return {
      categories: ['Unknown'],
      audio: { title: '', artist: '', isOriginal: false }
    };
  }

  // Extract text for analysis
  const textToAnalyze = getTextForAnalysis(reel);

  // Detect categories
  const categories = detectCategories(textToAnalyze);

  // Analyze audio
  const audio = analyzeAudio(reel);

  return {
    categories: categories.length > 0 ? categories : ['Unknown'],
    audio
  };
}

/**
 * Extract all available text from reel for category detection
 * @param {object} reel - Raw reel object
 * @returns {string} Combined text for analysis
 */
function getTextForAnalysis(reel) {
  const texts = [];

  // Caption text
  if (reel.caption) {
    texts.push(reel.caption);
  }

  // Creator username
  if (reel.creatorUsername) {
    texts.push(reel.creatorUsername);
  }

  // Hashtags
  if (reel.hashtags && Array.isArray(reel.hashtags)) {
    texts.push(reel.hashtags.join(' '));
  }

  // Audio title/artist
  if (reel.audio?.title) {
    texts.push(reel.audio.title);
  }
  if (reel.audio?.artist) {
    texts.push(reel.audio.artist);
  }

  return texts.join(' ').toLowerCase();
}

/**
 * Detect categories based on keyword matching
 * @param {string} text - Text to analyze
 * @returns {string[]} Array of detected categories
 */
function detectCategories(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const detectedCategories = [];
  const words = text.split(/\s+/);

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(keyword =>
      words.some(word => word.includes(keyword) || keyword.includes(word))
    );

    // Require at least 2 keyword matches for category detection
    if (matches.length >= 2) {
      detectedCategories.push(capitalizeCategory(category));
    }
  }

  // Special case: if no categories detected but has tutorial-like language
  if (detectedCategories.length === 0 && isTutorialContent(text)) {
    detectedCategories.push('Tutorial');
  }

  return detectedCategories;
}

/**
 * Check if content appears to be tutorial-style
 * @param {string} text - Text to analyze
 * @returns {boolean} True if appears to be tutorial content
 */
function isTutorialContent(text) {
  const tutorialIndicators = [
    'how to', 'tutorial', 'step by step', 'guide', 'tips', 'hack',
    'trick', 'method', 'way to', 'learn', 'teach', 'show you'
  ];

  return tutorialIndicators.some(indicator => text.includes(indicator));
}

/**
 * Analyze audio metadata
 * @param {object} reel - Raw reel object
 * @returns {object} Audio analysis results
 */
function analyzeAudio(reel) {
  const audio = {
    title: reel.audio?.title || '',
    artist: reel.audio?.artist || '',
    isOriginal: false,
    isTalkingHead: false,
    isAesthetic: false
  };

  // Check if original audio (creator is speaking)
  if (audio.title && audio.title.toLowerCase().includes('original audio')) {
    audio.isOriginal = true;

    // Check if likely talking head content (short original audio = tutorial/advice)
    // Note: We don't have duration in the current data structure, so we'll skip this for now
    // audio.isTalkingHead = audio.isOriginal && duration < 90;
  }

  // Check for aesthetic/ambient tracks
  const audioText = (audio.title + ' ' + audio.artist).toLowerCase();
  audio.isAesthetic = KNOWN_AMBIENT_TRACKS.some(track =>
    audioText.includes(track)
  );

  return audio;
}

/**
 * Capitalize category names for display
 * @param {string} category - Category key
 * @returns {string} Capitalized category name
 */
function capitalizeCategory(category) {
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}