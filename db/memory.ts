import * as log from "@std/log";

import type { StoragePort } from "../core/ports/storage_port.ts";
import type { MemoryChunk, MemorySearchParams, MemorySearchResult } from "../core/models/memory.ts";

/**
 * In-memory database implementation for development and testing
 * Uses simple text matching for search since we don't have vector embeddings
 */
export class MemoryDatabase implements StoragePort {
  #memories = new Map<string, MemoryChunk>();
  #nextId = 1;

  async initialize(): Promise<void> {
    log.info("Initializing in-memory database");
    this.#memories.clear();
    this.#nextId = 1;
  }

  async close(): Promise<void> {
    log.info("Closing in-memory database");
    this.#memories.clear();
  }

  async storeMemory(memory: Omit<MemoryChunk, "id" | "createdAt" | "updatedAt" | "accessCount" | "lastAccessedAt">): Promise<MemoryChunk> {
    const now = new Date();
    const id = `mem-${this.#nextId++}`;
    
    const newMemory: MemoryChunk = {
      id,
      text: memory.text,
      metadata: memory.metadata,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessedAt: now,
    };

    this.#memories.set(id, newMemory);
    log.info("Stored memory", { id, textLength: memory.text.length });
    
    return newMemory;
  }

  async getMemory(id: string): Promise<MemoryChunk | undefined> {
    const memory = this.#memories.get(id);
    if (memory) {
      // Update access statistics
      const updatedMemory: MemoryChunk = {
        ...memory,
        accessCount: memory.accessCount + 1,
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      };
      this.#memories.set(id, updatedMemory);
      return updatedMemory;
    }
    return undefined;
  }

  async updateMemory(id: string, updates: Partial<MemoryChunk>): Promise<MemoryChunk | undefined> {
    const memory = this.#memories.get(id);
    if (!memory) return undefined;

    const updatedMemory: MemoryChunk = {
      ...memory,
      ...updates,
      updatedAt: new Date(),
    };

    this.#memories.set(id, updatedMemory);
    return updatedMemory;
  }

  async searchMemories(params: MemorySearchParams): Promise<MemorySearchResult> {
    let memories = Array.from(this.#memories.values());

    // Apply filters
    if (params.tags && params.tags.length > 0) {
      memories = memories.filter((memory: MemoryChunk) => 
        params.tags!.some((tag: string) => memory.metadata.tags.includes(tag))
      );
    }

    if (params.category) {
      memories = memories.filter(memory => 
        memory.metadata.category === params.category
      );
    }

    if (params.dateFrom) {
      memories = memories.filter(memory => 
        memory.createdAt >= params.dateFrom!
      );
    }

    if (params.dateTo) {
      memories = memories.filter(memory => 
        memory.createdAt <= params.dateTo!
      );
    }

    // Apply text search (simple substring matching for in-memory)
    if (params.query) {
      const query = params.query.toLowerCase();
      memories = memories.filter((memory: MemoryChunk) => 
        memory.text.toLowerCase().includes(query) ||
        memory.metadata.tags.some((tag: string) => tag.toLowerCase().includes(query)) ||
        (memory.metadata.context && memory.metadata.context.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    const sortBy = params.sortBy || "date";
    const sortOrder = params.sortOrder || "desc";
    
    memories.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "access":
          comparison = a.accessCount - b.accessCount;
          break;
        case "priority":
          comparison = a.metadata.priority - b.metadata.priority;
          break;
        case "relevance":
          // For in-memory, use access count as relevance proxy
          comparison = a.accessCount - b.accessCount;
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    const total = memories.length;
    const hasMore = offset + limit < total;
    const paginatedMemories = memories.slice(offset, offset + limit);

    return {
      memories: paginatedMemories as MemoryChunk[],
      total,
      hasMore,
    };
  }

  async getAllTags(): Promise<readonly string[]> {
    const tagSet = new Set<string>();
    for (const memory of this.#memories.values()) {
      for (const tag of memory.metadata.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }

  async getAllCategories(): Promise<readonly string[]> {
    const categorySet = new Set<string>();
    for (const memory of this.#memories.values()) {
      if (memory.metadata.category) {
        categorySet.add(memory.metadata.category);
      }
    }
    return Array.from(categorySet);
  }

  async deleteMemory(id: string): Promise<boolean> {
    return this.#memories.delete(id);
  }

  async getStats(): Promise<{
    readonly totalMemories: number;
    readonly totalTags: number;
    readonly totalCategories: number;
    readonly oldestMemory: Date | null;
    readonly newestMemory: Date | null;
  }> {
    const totalMemories = this.#memories.size;
    const tags = await this.getAllTags();
    const categories = await this.getAllCategories();
    
    let oldestMemory: Date | null = null;
    let newestMemory: Date | null = null;
    
    for (const memory of this.#memories.values()) {
      if (!oldestMemory || memory.createdAt < oldestMemory) {
        oldestMemory = memory.createdAt;
      }
      if (!newestMemory || memory.createdAt > newestMemory) {
        newestMemory = memory.createdAt;
      }
    }

    return {
      totalMemories,
      totalTags: tags.length,
      totalCategories: categories.length,
      oldestMemory,
      newestMemory,
    };
  }

  async cleanup(maxMemories?: number): Promise<number> {
    if (!maxMemories) return 0;

    const memories = Array.from(this.#memories.values());
    if (memories.length <= maxMemories) return 0;

    // Sort by access count and date (least accessed and oldest first)
    memories.sort((a, b) => {
      const accessDiff = a.accessCount - b.accessCount;
      if (accessDiff !== 0) return accessDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Remove excess memories
    const toRemove = memories.slice(0, memories.length - maxMemories);
    for (const memory of toRemove) {
      this.#memories.delete(memory.id);
    }

    log.info("Cleaned up memories", { removed: toRemove.length, remaining: this.#memories.size });
    return toRemove.length;
  }
}

/**
 * Factory function to create in-memory database
 */
export function createMemoryDatabase(): StoragePort {
  return new MemoryDatabase();
} 