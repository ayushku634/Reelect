/**
 * Tier Manager - Handles Tier 1/2 promotion and demotion
 * Enforces storage limits and manages document lifecycle
 */

import { db } from './db.js';

const DEFAULT_TIER_LIMIT = 200;

export class TierManager {
  constructor() {
    this.tierLimit = DEFAULT_TIER_LIMIT;
    this.init();
  }

  async init() {
    // Load tier limit from settings
    const savedLimit = await db.getSetting('tierLimit');
    if (savedLimit && typeof savedLimit === 'number') {
      this.tierLimit = savedLimit;
    } else {
      // Set default if not exists
      await db.putSetting('tierLimit', DEFAULT_TIER_LIMIT);
    }
  }

  async setTierLimit(limit) {
    this.tierLimit = limit;
    await db.putSetting('tierLimit', limit);
  }

  async getTierLimit() {
    return this.tierLimit;
  }

  /**
   * Process a new document - enforce tier limits and demote if needed
   */
  async processNewDocument(reelDocument) {
    console.log('[Reel Finder] processing new document:', reelDocument.id);

    // Check current Tier 1 count
    const currentCount = await db.getDocumentCount();
    console.log('[Reel Finder] current document count:', currentCount, 'limit:', this.tierLimit);

    // If we're at or over the limit, demote the oldest document
    if (currentCount >= this.tierLimit) {
      await this.demoteOldestDocument();
    }

    // Store the new document
    await db.putDocument(reelDocument);
    console.log('[Reel Finder] stored new document:', reelDocument.id);
  }

  /**
   * Demote the oldest document to Tier 2 (tombstone)
   */
  async demoteOldestDocument() {
    console.log('[Reel Finder] demoting oldest document due to tier limit');

    try {
      // Get all documents to find the oldest
      const allDocs = await db.getAllDocuments();

      if (allDocs.length === 0) {
        console.log('[Reel Finder] no documents to demote');
        return;
      }

      // Find oldest by savedAt timestamp
      const oldestDoc = allDocs.reduce((oldest, current) =>
        (current.savedAt < oldest.savedAt) ? current : oldest
      );

      console.log('[Reel Finder] demoting document:', oldestDoc.id, 'saved at:', new Date(oldestDoc.savedAt));

      // Create tombstone
      const tombstone = {
        id: oldestDoc.id,
        url: oldestDoc.url,
        thumbnailUrl: oldestDoc.thumbnailUrl,
        creatorUsername: oldestDoc.creator.username,
        categories: oldestDoc.categories,
        savedAt: oldestDoc.savedAt,
        tier: 2
      };

      // Store tombstone
      await db.putTombstone(tombstone);

      // Delete full document
      await db.deleteDocument(oldestDoc.id);

      // Delete embedding if it exists
      await db.deleteEmbedding(oldestDoc.id);

      console.log('[Reel Finder] successfully demoted document to tombstone:', oldestDoc.id);

    } catch (error) {
      console.error('[Reel Finder] error demoting document:', error);
    }
  }

  /**
   * Get current Tier 1 document count for badge
   */
  async getTier1Count() {
    return await db.getDocumentCount();
  }

  /**
   * Check if a reel ID exists (in either tier)
   */
  async reelExists(id) {
    const doc = await db.getDocument(id);
    if (doc) return true;

    const tombstone = await db.getTombstone(id);
    return !!tombstone;
  }
}

export const tierManager = new TierManager();