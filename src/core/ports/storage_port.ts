import type { MemoryChunk, MemorySearchParams, MemorySearchResult } from "../models/memory.ts";

/**
 * Port d'accès au stockage pour les mémoires (hexagonal)
 */
export interface StoragePort {
  initialize(): Promise<void>;
  close(): Promise<void>;
  storeMemory(memory: Omit<MemoryChunk, "id" | "createdAt" | "updatedAt" | "accessCount" | "lastAccessedAt">): Promise<MemoryChunk>;
  getMemory(id: string): Promise<MemoryChunk | undefined>;
  updateMemory(id: string, updates: Partial<MemoryChunk>): Promise<MemoryChunk | undefined>;
  searchMemories(params: MemorySearchParams): Promise<MemorySearchResult>;
  getAllTags(): Promise<readonly string[]>;
  getAllCategories(): Promise<readonly string[]>;
  deleteMemory(id: string): Promise<boolean>;
  getStats(): Promise<{
    readonly totalMemories: number;
    readonly totalTags: number;
    readonly totalCategories: number;
    readonly oldestMemory: Date | null;
    readonly newestMemory: Date | null;
  }>;
  cleanup(maxMemories?: number): Promise<number>;
}