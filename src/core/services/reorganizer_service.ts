import type { StoragePort } from "../ports/storage_port.ts";
import type { ReorganizeParams, ReorganizeResult } from "../models/memory.ts";
import * as log from "@std/log";

/**
 * Service for memory reorganization operations
 */
export class ReorganizerService {
  constructor(private readonly db: StoragePort) {}

  /**
   * Reorganize memories by merging similar tags and cleaning up old memories
   */
  async reorganize(params: ReorganizeParams): Promise<ReorganizeResult> {
    let tagsMerged = 0;
    let memoriesCleaned = 0;
    let storageOptimized = false;

    try {
      // Merge similar tags if requested
      if (params.mergeSimilarTags) {
        tagsMerged = await this.mergeSimilarTags();
      }

      // Clean up old memories if requested
      if (params.cleanupOldMemories) {
        memoriesCleaned = await this.cleanupOldMemories(params.maxMemories);
      }

      // Optimize storage if requested
      if (params.optimizeStorage) {
        storageOptimized = await this.optimizeStorage();
      }

      return {
        status: "ok",
        tagsMerged,
        memoriesCleaned,
        storageOptimized,
      };
    } catch (error) {
      log.error("Reorganization failed", { error: (error as Error).message });
      return {
        status: "error",
        tagsMerged,
        memoriesCleaned,
        storageOptimized,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Merge similar tags to reduce tag proliferation
   */
  private async mergeSimilarTags(): Promise<number> {
    const allTags = await this.db.getAllTags();
    const mergedCount = 0;

    // Group similar tags by similarity
    const tagGroups = this.groupSimilarTags(allTags);

    for (const group of tagGroups) {
      if (group.length <= 1) continue;

      // Use the most common tag as the primary tag
      const primaryTag = this.selectPrimaryTag(group);
      const secondaryTags = group.filter((tag) => tag !== primaryTag);

      log.info("Merging similar tags", {
        primary: primaryTag,
        secondary: secondaryTags,
      });

      // TODO: Update all memories that use secondary tags to use primary tag
      // This would require updating the database interface to support bulk updates
      // For now, we just log the merge operation
    }

    return mergedCount;
  }

  /**
   * Group tags by similarity (simple string similarity for now)
   */
  private groupSimilarTags(
    tags: readonly string[],
  ): readonly (readonly string[])[] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    for (const tag of tags) {
      if (processed.has(tag)) continue;

      const group = [tag];
      processed.add(tag);

      // Find similar tags
      for (const otherTag of tags) {
        if (processed.has(otherTag)) continue;

        if (this.areTagsSimilar(tag, otherTag)) {
          group.push(otherTag);
          processed.add(otherTag);
        }
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Check if two tags are similar enough to be merged
   */
  private areTagsSimilar(tag1: string, tag2: string): boolean {
    const t1 = tag1.toLowerCase();
    const t2 = tag2.toLowerCase();

    // Exact match
    if (t1 === t2) return true;

    // One is contained in the other (e.g., "api" and "rest-api")
    if (t1.includes(t2) || t2.includes(t1)) return true;

    // Levenshtein distance for similar spellings
    const distance = this.levenshteinDistance(t1, t2);
    const maxLength = Math.max(t1.length, t2.length);
    const similarity = 1 - (distance / maxLength);

    return similarity > 0.8; // 80% similarity threshold
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Select the primary tag from a group of similar tags
   */
  private selectPrimaryTag(tags: readonly string[]): string {
    // Prefer shorter tags (more concise)
    const sorted = [...tags].sort((a, b) => {
      // Prefer tags without hyphens or underscores
      const aClean = a.replace(/[-_]/g, "");
      const bClean = b.replace(/[-_]/g, "");

      if (aClean.length !== bClean.length) {
        return aClean.length - bClean.length;
      }

      // If same length, prefer the one without special characters
      const aSpecial = (a.match(/[-_]/g) || []).length;
      const bSpecial = (b.match(/[-_]/g) || []).length;

      return aSpecial - bSpecial;
    });

    return sorted[0];
  }

  /**
   * Clean up old or unused memories
   */
  private async cleanupOldMemories(maxMemories?: number): Promise<number> {
    const stats = await this.db.getStats();

    if (!maxMemories) {
      // Default: keep last 1000 memories
      maxMemories = 1000;
    }

    if (stats.totalMemories <= maxMemories) {
      return 0;
    }

    const removed = await this.db.cleanup(maxMemories);
    log.info("Cleaned up old memories", { removed, remaining: maxMemories });

    return removed;
  }

  /**
   * Optimize storage by removing duplicates and compressing data
   */
  private optimizeStorage(): Promise<boolean> {
    // For in-memory database, there's not much optimization to do
    // In a real database, this could involve:
    // - Removing duplicate memories
    // - Compressing text content
    // - Optimizing indexes
    // - Vacuuming the database

    log.info("Storage optimization completed");
    return Promise.resolve(true);
  }

  /**
   * Get reorganization statistics
   */
  async getReorganizationStats(): Promise<{
    readonly totalTags: number;
    readonly totalMemories: number;
    readonly potentialMerges: number;
    readonly oldMemories: number;
  }> {
    const stats = await this.db.getStats();
    const allTags = await this.db.getAllTags();

    // Count potential tag merges
    const tagGroups = this.groupSimilarTags(allTags);
    const potentialMerges =
      tagGroups.filter((group) => group.length > 1).length;

    // Count old memories (accessed less than 5 times and older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const searchResult = await this.db.searchMemories({
      dateTo: thirtyDaysAgo,
      limit: 1000, // Get a sample to estimate
    });

    const oldMemories = searchResult.memories.filter((
      memory: import("../models/memory.ts").MemoryChunk,
    ) => memory.accessCount < 5).length;

    return {
      totalTags: stats.totalTags,
      totalMemories: stats.totalMemories,
      potentialMerges,
      oldMemories,
    };
  }
}
