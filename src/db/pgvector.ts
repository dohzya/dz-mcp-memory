import * as log from "@std/log";
import { Client } from "pg";

import type { StoragePort } from "../core/ports/storage_port.ts";
import type { MemoryChunk, MemorySearchParams, MemorySearchResult } from "../core/models/memory.ts";
import type { DatabaseConfig } from "./index.ts";

/**
 * PostgreSQL with pgvector extension implementation
 * Uses vector embeddings for semantic search
 */
export class PgVectorDatabase implements StoragePort {
  private client: Client | null = null;
  private nextId = 1;

  constructor(private readonly config: DatabaseConfig) {}

  async initialize(): Promise<void> {
    const connectionString = this.config.connectionString || "postgresql://localhost:5432/memory";
    log.info("Initializing PostgreSQL database with pgvector", { connectionString });

    this.client = new Client(connectionString);
    await this.client.connect();

    // Enable pgvector extension
    await this.client.queryObject("CREATE EXTENSION IF NOT EXISTS vector");

    // Create memories table with vector column
    await this.client.queryObject(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        metadata JSONB NOT NULL,
        embedding vector(1536), -- OpenAI embedding size
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        access_count INTEGER NOT NULL DEFAULT 0,
        last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await this.client.queryObject("CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories (created_at)");
    await this.client.queryObject("CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN ((metadata->'tags'))");
    await this.client.queryObject("CREATE INDEX IF NOT EXISTS idx_memories_category ON memories ((metadata->>'category'))");
    await this.client.queryObject("CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)");

    // Create function to update updated_at timestamp
    await this.client.queryObject(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for updated_at
    await this.client.queryObject(`
      CREATE TRIGGER IF NOT EXISTS update_memories_updated_at
      BEFORE UPDATE ON memories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    log.info("PostgreSQL database with pgvector initialized");
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      log.info("PostgreSQL database closed");
    }
  }

  async storeMemory(memory: Omit<MemoryChunk, "id" | "createdAt" | "updatedAt" | "accessCount" | "lastAccessedAt">): Promise<MemoryChunk> {
    if (!this.client) throw new Error("Database not initialized");

    const id = `mem-${this.nextId++}`;

    // For now, we'll use a simple embedding (in a real implementation, you'd use OpenAI API)
    // This is just a placeholder - proper semantic search would require actual embeddings
    const embedding = this.generateSimpleEmbedding(memory.text);

    const result = await this.client.queryObject(
      `INSERT INTO memories (id, text, metadata, embedding, access_count, last_accessed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, text, metadata, created_at, updated_at, access_count, last_accessed_at`,
      [id, memory.text, JSON.stringify(memory.metadata), `[${embedding.join(",")}]`, 0, new Date()]
    );

    const row = result.rows[0] as any;

    const newMemory: MemoryChunk = {
      id: row.id,
      text: row.text,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accessCount: row.access_count,
      lastAccessedAt: new Date(row.last_accessed_at),
    };

    log.info("Stored memory in PostgreSQL", { id, textLength: memory.text.length });

    return newMemory;
  }

  async getMemory(id: string): Promise<MemoryChunk | undefined> {
    if (!this.client) throw new Error("Database not initialized");

    // Update access statistics first
    await this.client.queryObject(
      "UPDATE memories SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = $1",
      [id]
    );

    const result = await this.client.queryObject(
      "SELECT id, text, metadata, created_at, updated_at, access_count, last_accessed_at FROM memories WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) return undefined;

    const row = result.rows[0] as any;

    return {
      id: row.id,
      text: row.text,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accessCount: row.access_count,
      lastAccessedAt: new Date(row.last_accessed_at),
    };
  }

  async updateMemory(id: string, updates: Partial<MemoryChunk>): Promise<MemoryChunk | undefined> {
    if (!this.client) throw new Error("Database not initialized");

    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.text !== undefined) {
      setParts.push(`text = $${paramIndex++}`);
      values.push(updates.text);
    }

    if (updates.metadata !== undefined) {
      setParts.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updates.accessCount !== undefined) {
      setParts.push(`access_count = $${paramIndex++}`);
      values.push(updates.accessCount);
    }

    if (updates.lastAccessedAt !== undefined) {
      setParts.push(`last_accessed_at = $${paramIndex++}`);
      values.push(updates.lastAccessedAt);
    }

    if (setParts.length === 0) {
      return await this.getMemory(id);
    }

    values.push(id);

    const result = await this.client.queryObject(
      `UPDATE memories SET ${setParts.join(", ")} WHERE id = $${paramIndex}
       RETURNING id, text, metadata, created_at, updated_at, access_count, last_accessed_at`,
      values
    );

    if (result.rows.length === 0) return undefined;

    const row = result.rows[0] as any;

    return {
      id: row.id,
      text: row.text,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accessCount: row.access_count,
      lastAccessedAt: new Date(row.last_accessed_at),
    };
  }

  async searchMemories(params: MemorySearchParams): Promise<MemorySearchResult> {
    if (!this.client) throw new Error("Database not initialized");

    let query = "SELECT id, text, metadata, created_at, updated_at, access_count, last_accessed_at FROM memories";
    const values: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    // Semantic search using vector similarity
    if (params.query?.trim()) {
      const queryEmbedding = this.generateSimpleEmbedding(params.query);
      query = `
        SELECT id, text, metadata, created_at, updated_at, access_count, last_accessed_at,
               (1 - (embedding <=> $${paramIndex})) as similarity
        FROM memories
      `;
      values.push(`[${queryEmbedding.join(",")}]`);
      paramIndex++;
      conditions.push("embedding IS NOT NULL");
    }

    // Tag filtering
    if (params.tags && params.tags.length > 0) {
      conditions.push(`metadata->'tags' ?| $${paramIndex}`);
      values.push(params.tags);
      paramIndex++;
    }

    // Category filtering
    if (params.category) {
      conditions.push(`metadata->>'category' = $${paramIndex}`);
      values.push(params.category);
      paramIndex++;
    }

    // Date filtering
    if (params.dateFrom) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(params.dateFrom);
      paramIndex++;
    }

    if (params.dateTo) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(params.dateTo);
      paramIndex++;
    }

    // Add WHERE clause
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // Add ORDER BY
    if (params.sortBy === "date") {
      query += " ORDER BY created_at " + (params.sortOrder === "asc" ? "ASC" : "DESC");
    } else if (params.sortBy === "access") {
      query += " ORDER BY access_count " + (params.sortOrder === "asc" ? "ASC" : "DESC");
    } else if (params.sortBy === "priority") {
      query += " ORDER BY (metadata->>'priority')::integer " + (params.sortOrder === "asc" ? "ASC" : "DESC");
    } else if (params.query?.trim()) {
      query += " ORDER BY similarity DESC";
    }

    // Add LIMIT and OFFSET
    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }

    if (params.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
      paramIndex++;
    }

    const result = await this.client.queryObject(query, values);

    const memories: MemoryChunk[] = result.rows.map(row => {
      const r = row as any;
      return {
        id: r.id,
        text: r.text,
        metadata: JSON.parse(r.metadata),
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
        accessCount: r.access_count,
        lastAccessedAt: new Date(r.last_accessed_at),
      };
    });

    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) as total FROM")
                           .replace(/ORDER BY.*/, "");
    const countValues = values.slice(0, -2); // Remove LIMIT/OFFSET values
    const countResult = await this.client.queryObject(countQuery, countValues);
    const total = (countResult.rows[0] as any).total;

    return {
      memories,
      total,
      hasMore: params.offset ? (params.offset + memories.length) < total : memories.length < total,
    };
  }

  async getAllTags(): Promise<readonly string[]> {
    if (!this.client) throw new Error("Database not initialized");

    const result = await this.client.queryObject(`
      SELECT DISTINCT jsonb_array_elements_text(metadata->'tags') as tag
      FROM memories
      WHERE metadata->'tags' IS NOT NULL
      ORDER BY tag
    `);

    return result.rows.map(row => (row as any).tag);
  }

  async getAllCategories(): Promise<readonly string[]> {
    if (!this.client) throw new Error("Database not initialized");

    const result = await this.client.queryObject(`
      SELECT DISTINCT metadata->>'category' as category
      FROM memories
      WHERE metadata->>'category' IS NOT NULL
      ORDER BY category
    `);

    return result.rows.map(row => (row as any).category);
  }

  async deleteMemory(id: string): Promise<boolean> {
    if (!this.client) throw new Error("Database not initialized");

    const result = await this.client.queryObject(
      "DELETE FROM memories WHERE id = $1",
      [id]
    );

    return result.rowCount !== undefined && result.rowCount > 0;
  }

  async getStats(): Promise<{
    readonly totalMemories: number;
    readonly totalTags: number;
    readonly totalCategories: number;
    readonly oldestMemory: Date | null;
    readonly newestMemory: Date | null;
  }> {
    if (!this.client) throw new Error("Database not initialized");

    const result = await this.client.queryObject(`
      SELECT
        COUNT(*) as total_memories,
        MIN(created_at) as oldest_memory,
        MAX(created_at) as newest_memory
      FROM memories
    `);

    const row = result.rows[0] as any;
    const tags = await this.getAllTags();
    const categories = await this.getAllCategories();

    return {
      totalMemories: parseInt(row.total_memories),
      totalTags: tags.length,
      totalCategories: categories.length,
      oldestMemory: row.oldest_memory ? new Date(row.oldest_memory) : null,
      newestMemory: row.newest_memory ? new Date(row.newest_memory) : null,
    };
  }

  async cleanup(maxMemories?: number): Promise<number> {
    if (!this.client) throw new Error("Database not initialized");

    if (!maxMemories) return 0;

    const result = await this.client.queryObject(`
      DELETE FROM memories
      WHERE id IN (
        SELECT id FROM memories
        ORDER BY created_at ASC
        LIMIT GREATEST(0, (SELECT COUNT(*) FROM memories) - $1)
      )
    `, [maxMemories]);

    return result.rowCount || 0;
  }

  /**
   * Generate a simple embedding for text (placeholder implementation)
   * In a real implementation, you would use OpenAI's embedding API
   */
  private generateSimpleEmbedding(text: string): number[] {
    // Very simple hash-based embedding for demonstration
    // This is NOT suitable for production - use proper embeddings
    const embedding = new Array(1536).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const index = (charCode + i + j) % embedding.length;
        embedding[index] += 0.1;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }
}

/**
 * Factory function to create PostgreSQL database instance
 */
export function createPgVectorDatabase(config: DatabaseConfig): StoragePort {
  return new PgVectorDatabase(config);
}
