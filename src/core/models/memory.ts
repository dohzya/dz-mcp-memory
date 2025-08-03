import { z } from "zod";

/**
 * Represents a memory chunk with its metadata
 */
export interface MemoryChunk {
  readonly id: string;
  readonly text: string;
  readonly metadata: MemoryMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly accessCount: number;
  readonly lastAccessedAt: Date;
}

/**
 * Metadata associated with a memory chunk
 */
export interface MemoryMetadata {
  readonly tags: readonly string[];
  readonly context?: string;
  readonly source?: string;
  readonly priority: number; // 1-10, higher = more important
  readonly category?: string;
  readonly relatedIds?: readonly string[];
}

/**
 * Search parameters for listing memories
 */
export interface MemorySearchParams {
  readonly query?: string;
  readonly tags?: readonly string[];
  readonly category?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: "relevance" | "date" | "access" | "priority";
  readonly sortOrder?: "asc" | "desc";
}

/**
 * Result of a memory search operation
 */
export interface MemorySearchResult {
  readonly memories: readonly MemoryChunk[];
  readonly total: number;
  readonly hasMore: boolean;
}

/**
 * Parameters for memorization
 */
export interface MemorizeParams {
  readonly text: string;
  readonly tags?: readonly string[];
  readonly context?: string;
  readonly source?: string;
  readonly priority?: number;
  readonly category?: string;
}

/**
 * Result of memorization operation
 */
export interface MemorizeResult {
  readonly status: "ok" | "error";
  readonly memoryIds: readonly string[];
  readonly chunksCreated: number;
  readonly error?: string;
}

/**
 * Reorganization parameters
 */
export interface ReorganizeParams {
  readonly mergeSimilarTags?: boolean;
  readonly cleanupOldMemories?: boolean;
  readonly optimizeStorage?: boolean;
  readonly maxMemories?: number;
}

/**
 * Reorganization result
 */
export interface ReorganizeResult {
  readonly status: "ok" | "error";
  readonly tagsMerged: number;
  readonly memoriesCleaned: number;
  readonly storageOptimized: boolean;
  readonly error?: string;
}

// Zod schemas for validation
export const MemoryChunkSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  metadata: z.object({
    tags: z.array(z.string()),
    context: z.string().optional(),
    source: z.string().optional(),
    priority: z.number().min(1).max(10),
    category: z.string().optional(),
    relatedIds: z.array(z.string()).optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  accessCount: z.number().min(0),
  lastAccessedAt: z.date(),
});

export const MemorizeParamsSchema = z.object({
  text: z.string().min(1, "Text cannot be empty"),
  tags: z.array(z.string()).optional(),
  context: z.string().optional(),
  source: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
  category: z.string().optional(),
});

export const MemorySearchParamsSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  sortBy: z.enum(["relevance", "date", "access", "priority"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const ReorganizeParamsSchema = z.object({
  mergeSimilarTags: z.boolean().optional(),
  cleanupOldMemories: z.boolean().optional(),
  optimizeStorage: z.boolean().optional(),
  maxMemories: z.number().min(1).optional(),
});
