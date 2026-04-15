export function extractReelsFromGraphql(data) {
  const reels = [];
  const seen = new Set();

  function isReelNode(obj) {
    return (
      obj &&
      typeof obj === 'object' &&
      (obj.shortcode || obj.id) &&
      (obj.video_url || obj.thumbnail_src || obj.display_url || obj.thumbnail_url || obj.video_subtitles_uri)
    );
  }

  function extractCaption(node) {
    if (!node || typeof node !== 'object') {
      return '';
    }
    if (node.edge_media_to_caption?.edges) {
      return node.edge_media_to_caption.edges
        .map(edge => edge?.node?.text || '')
        .filter(Boolean)
        .join(' ')
        .trim();
    }
    if (typeof node.caption === 'string') {
      return node.caption;
    }
    if (typeof node.accessibility_caption === 'string') {
      return node.accessibility_caption;
    }
    return '';
  }

  function extractCreatorUsername(node) {
    if (node.owner?.username) {
      return node.owner.username;
    }
    if (node.user?.username) {
      return node.user.username;
    }
    return '';
  }

  function extractCcUrl(node) {
    return node.video_subtitles_uri || node.cc_url || null;
  }

  function buildReel(node) {
    const id = node.id || node.shortcode || '';
    const shortcode = node.shortcode || id;
    return {
      id,
      shortcode,
      url: `https://www.instagram.com/reel/${shortcode}/`,
      thumbnailUrl: node.thumbnail_src || node.display_url || node.thumbnail_url || '',
      caption: extractCaption(node),
      creatorUsername: extractCreatorUsername(node),
      ccUrl: extractCcUrl(node),
      raw: node
    };
  }

  function walk(node) {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (isReelNode(node)) {
      const id = node.id || node.shortcode;
      if (id && !seen.has(id)) {
        seen.add(id);
        reels.push(buildReel(node));
      }
    }

    for (const key of Object.keys(node)) {
      walk(node[key]);
    }
  }

  walk(data);
  return reels;
}

// Handle REST API format for /api/v1/feed/saved/posts/
export function extractReelsFromRestApi(data) {
  const reels = [];
  const seen = new Set();

  // The REST API likely has a different structure
  // Common patterns: data.items, data.posts, data.feed, etc.
  const possibleArrays = [
    data.items,
    data.posts,
    data.feed,
    data.data,
    data.results,
    data.media
  ];

  for (const arr of possibleArrays) {
    if (Array.isArray(arr)) {
      console.log('[Reel Finder] found array with', arr.length, 'items in REST API response');
      arr.forEach((item, index) => {
        if (item && typeof item === 'object') {
          // Check if this looks like a reel/post
          const mediaType = item.media_type || item.type || item.__typename;
          const isVideo = mediaType === 'VIDEO' || item.video_url || item.video_versions;
          const hasId = item.id || item.pk || item.shortcode;

          if (isVideo && hasId) {
            const id = item.id || item.pk || item.shortcode;
            if (!seen.has(id)) {
              seen.add(id);
              const reel = buildReelFromRestItem(item);
              if (reel) {
                reels.push(reel);
              }
            }
          }
        }
      });
      // If we found an array, break to avoid duplicates
      if (reels.length > 0) break;
    }
  }

  return reels;
}

function buildReelFromRestItem(item) {
  // Extract data from REST API item structure
  const id = item.id || item.pk || item.shortcode || '';
  const shortcode = item.shortcode || item.code || id;

  // Handle different thumbnail URL formats
  let thumbnailUrl = '';
  if (item.image_versions2?.candidates?.[0]?.url) {
    thumbnailUrl = item.image_versions2.candidates[0].url;
  } else if (item.thumbnail_url) {
    thumbnailUrl = item.thumbnail_url;
  } else if (item.display_url) {
    thumbnailUrl = item.display_url;
  }

  // Extract caption
  let caption = '';
  if (item.caption?.text) {
    caption = item.caption.text;
  } else if (typeof item.caption === 'string') {
    caption = item.caption;
  }

  // Extract creator username
  let creatorUsername = '';
  if (item.user?.username) {
    creatorUsername = item.user.username;
  } else if (item.owner?.username) {
    creatorUsername = item.owner.username;
  }

  // Extract CC URL if available
  let ccUrl = null;
  if (item.video_subtitles_uri) {
    ccUrl = item.video_subtitles_uri;
  }

  return {
    id,
    shortcode,
    url: `https://www.instagram.com/reel/${shortcode}/`,
    thumbnailUrl,
    caption,
    creatorUsername,
    ccUrl,
    raw: item
  };
}
