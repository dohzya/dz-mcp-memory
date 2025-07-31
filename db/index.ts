import type { MemoryChunk, MemorySearchParams, MemorySearchResult } from "../types/memory.ts";

/**
 * Database interface for memory storage operations
 */
export interface Database {
  /**
   * Initialize the database connection and create tables
   */
  initialize(): Promise<void>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;

  /**
   * Store a new memory chunk
   */
  storeMemory(memory: Omit<MemoryChunk, "id" | "createdAt" | "updatedAt" | "accessCount" | "lastAccessedAt">): Promise<MemoryChunk>;

  /**
   * Retrieve a memory chunk by ID
   */
  getMemory(id: string): Promise<MemoryChunk | undefined>;

  /**
   * Update a memory chunk (e.g., increment access count)
   */
  updateMemory(id: string, updates: Partial<MemoryChunk>): Promise<MemoryChunk | undefined>;

  /**
   * Search memories with semantic search and filtering
   */
  searchMemories(params: MemorySearchParams): Promise<MemorySearchResult>;

  /**
   * Get all tags used in the database
   */
  getAllTags(): Promise<readonly string[]>;

  /**
   * Get all categories used in the database
   */
  getAllCategories(): Promise<readonly string[]>;

  /**
   * Delete a memory chunk
   */
  deleteMemory(id: string): Promise<boolean>;

  /**
   * Get memory statistics
   */
  getStats(): Promise<{
    readonly totalMemories: number;
    readonly totalTags: number;
    readonly totalCategories: number;
    readonly oldestMemory: Date | null;
    readonly newestMemory: Date | null;
  }>;

  /**
   * Clean up old or unused memories
   */
  cleanup(maxMemories?: number): Promise<number>;
}

/**
 * Database configuration options
 */
export interface DatabaseConfig {
  readonly type: "pgvector" | "sqlite" | "memory";
  readonly connectionString?: string;
  readonly databasePath?: string;
  readonly maxConnections?: number;
}

/**
 * Factory function to create database instance
 */
export async function createDatabase(config: DatabaseConfig): Promise<Database> {
  switch (config.type) {
    case "pgvector":
      const { createPgVectorDatabase } = await import("./pgvector.ts");
      return createPgVectorDatabase(config);
    case "sqlite":
      const { createSqliteDatabase } = await import("./sqlite.ts");
      return createSqliteDatabase(config);
    case "memory":
      const { createMemoryDatabase } = await import("./memory.ts");
      return createMemoryDatabase();
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
} 