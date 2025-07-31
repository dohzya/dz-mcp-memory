import * as log from "@std/log";
import { Database as SqliteDatabase } from "sqlite3";

import type { StoragePort } from "../core/ports/storage_port.ts";
import type { MemoryChunk, MemorySearchParams, MemorySearchResult } from "../core/models/memory.ts";
import type { DatabaseConfig } from "./index.ts";

/**
 * SQLite database implementation
 * Uses FTS (Full Text Search) for semantic search simulation
 */
export class SqliteDatabase implements StoragePort {
  private db: SqliteDatabase | null = null;
  private nextId = 1;

  constructor(private readonly config: DatabaseConfig) {}

  async initialize(): Promise<void> {
    const dbPath = this.config.databasePath || "./memory.db";
    log.info("Initializing SQLite database", { dbPath });

    this.db = new SqliteDatabase(dbPath);

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        last_accessed_at INTEGER NOT NULL
      )
    `);

    // Create FTS table for text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        id,
        text,
        content='memories',
        content_rowid='rowid'
      )
    `);

    // Create triggers to keep FTS in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, id, text) VALUES (NEW.rowid, NEW.id, NEW.text);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories BEGIN
        DELETE FROM memories_fts WHERE rowid = OLD.rowid;
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories BEGIN
        UPDATE memories_fts SET id = NEW.id, text = NEW.text WHERE rowid = NEW.rowid;
      END
    `);

    log.info("SQLite database initialized");
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      log.info("SQLite database closed");
    }
  }

  async storeMemory(memory: Omit<MemoryChunk, "id" | "createdAt" | "updatedAt" | "accessCount" | "lastAccessedAt">): Promise<MemoryChunk> {
    if (!this.db) throw new Error("Database not initialized");

    const now = new Date();
    const id = `mem-${this.nextId++}`;

    const newMemory: MemoryChunk = {
      id,
      text: memory.text,
      metadata: memory.metadata,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, text, metadata, created_at, updated_at, access_count, last_accessed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      memory.text,
      JSON.stringify(memory.metadata),
      now.getTime(),
      now.getTime(),
      0,
      now.getTime()
    );

    log.info("Stored memory in SQLite", { id, textLength: memory.text.length });

    return newMemory;
  }

  async getMemory(id: string): Promise<MemoryChunk | undefined> {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      SELECT id, text, metadata, created_at, updated_at, access_count, last_accessed_at
      FROM memories
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    // Update access statistics
    const updateStmt = this.db.prepare(`
      UPDATE memories
      SET access_count = access_count + 1, last_accessed_at = ?
      WHERE id = ?
    `);
    updateStmt.run(Date.now(), id);

    return {
      id: row.id,
      text: row.text,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accessCount: row.access_count + 1,
      lastAccessedAt: new Date(),
    };
  }

  async updateMemory(id: string, updates: Partial<MemoryChunk>): Promise<MemoryChunk | undefined> {
    if (!this.db) throw new Error("Database not initialized");

    const current = await this.getMemory(id);
    if (!current) return undefined;

    const updated: MemoryChunk = {
      ...current,
      ...updates,
      updatedAt: new Date(),
    };

    const stmt = this.db.prepare(`
      UPDATE memories
      SET text = ?, metadata = ?, updated_at = ?, access_count = ?, last_accessed_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.text,
      JSON.stringify(updated.metadata),
      updated.updatedAt.getTime(),
      updated.accessCount,
      updated.lastAccessedAt.getTime(),
      id
    );

    return updated;
  }

  async searchMemories(params: MemorySearchParams): Promise<MemorySearchResult> {
    if (!this.db) throw new Error("Database not initialized");

    let query = "SELECT m.id, m.text, m.metadata, m.created_at, m.updated_at, m.access_count, m.last_accessed_at FROM memories m";
    const queryParams: any[] = [];
    const conditions: string[] = [];

    // FTS search if query provided
    if (params.query && params.query.trim()) {
      query = `
        SELECT m.id, m.text, m.metadata, m.created_at, m.updated_at, m.access_count, m.last_accessed_at,
               fts.rank
        FROM memories m
        JOIN memories_fts fts ON m.id = fts.id
        WHERE memories_fts MATCH ?
      `;
      queryParams.push(params.query.trim());
    }

    // Add other filters
    if (params.tags && params.tags.length > 0) {
      conditions.push("JSON_EXTRACT(m.metadata, '$.tags') LIKE ?");
      queryParams.push(`%${params.tags[0]}%`);
    }

    if (params.category) {
      conditions.push("JSON_EXTRACT(m.metadata, '$.category') = ?");
      queryParams.push(params.category);
    }

    if (params.dateFrom) {
      conditions.push("m.created_at >= ?");
      queryParams.push(params.dateFrom.getTime());
    }

    if (params.dateTo) {
      conditions.push("m.created_at <= ?");
      queryParams.push(params.dateTo.getTime());
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      if (!params.query) {
        query += " WHERE " + conditions.join(" AND ");
      } else {
        query += " AND " + conditions.join(" AND ");
      }
    }

    // Add ORDER BY
    if (params.sortBy === "date") {
      query += " ORDER BY m.created_at " + (params.sortOrder === "asc" ? "ASC" : "DESC");
    } else if (params.sortBy === "access") {
      query += " ORDER BY m.access_count " + (params.sortOrder === "asc" ? "ASC" : "DESC");
    } else if (params.sortBy === "priority") {
      query += " ORDER BY JSON_EXTRACT(m.metadata, '$.priority') " + (params.sortOrder === "asc" ? "ASC" : "DESC");
    } else if (params.query) {
      query += " ORDER BY fts.rank";
    }

    // Add LIMIT and OFFSET
    if (params.limit) {
      query += " LIMIT ?";
      queryParams.push(params.limit);
    }

    if (params.offset) {
      query += " OFFSET ?";
      queryParams.push(params.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    const memories: MemoryChunk[] = rows.map(row => ({
      id: row.id,
      text: row.text,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accessCount: row.access_count,
      lastAccessedAt: new Date(row.last_accessed_at),
    }));

    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) as total FROM").replace(/ORDER BY.*/, "");
    const countStmt = this.db.prepare(countQuery);
    const countResult = countStmt.get(...queryParams.slice(0, -2)) as any; // Remove LIMIT/OFFSET params
    const total = countResult?.total || 0;

    return {
      memories,
      total,
      hasMore: params.offset ? (params.offset + memories.length) < total : memories.length < total,
    };
  }

  async getAllTags(): Promise<readonly string[]> {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("SELECT DISTINCT metadata FROM memories");
    const rows = stmt.all() as any[];

    const tags = new Set<string>();
    for (const row of rows) {
      try {
        const metadata = JSON.parse(row.metadata);
        if (metadata.tags && Array.isArray(metadata.tags)) {
          metadata.tags.forEach((tag: string) => tags.add(tag));
        }
      } catch {
        // Ignore invalid JSON
      }
    }

    return Array.from(tags).sort();
  }

  async getAllCategories(): Promise<readonly string[]> {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("SELECT DISTINCT JSON_EXTRACT(metadata, '$.category') as category FROM memories WHERE category IS NOT NULL");
    const rows = stmt.all() as any[];

    return rows.map(row => row.category).filter(Boolean).sort();
  }

  async deleteMemory(id: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("DELETE FROM memories WHERE id = ?");
    const result = stmt.run(id);

    return result.changes > 0;
  }

  async getStats(): Promise<{
    readonly totalMemories: number;
    readonly totalTags: number;
    readonly totalCategories: number;
    readonly oldestMemory: Date | null;
    readonly newestMemory: Date | null;
  }> {
    if (!this.db) throw new Error("Database not initialized");

    const totalStmt = this.db.prepare("SELECT COUNT(*) as total FROM memories");
    const totalResult = totalStmt.get() as any;

    const datesStmt = this.db.prepare("SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM memories");
    const datesResult = datesStmt.get() as any;

    const tags = await this.getAllTags();
    const categories = await this.getAllCategories();

    return {
      totalMemories: totalResult.total,
      totalTags: tags.length,
      totalCategories: categories.length,
      oldestMemory: datesResult.oldest ? new Date(datesResult.oldest) : null,
      newestMemory: datesResult.newest ? new Date(datesResult.newest) : null,
    };
  }

  async cleanup(maxMemories?: number): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    if (!maxMemories) return 0;

    // Delete oldest memories beyond the limit
    const stmt = this.db.prepare(`
      DELETE FROM memories
      WHERE id IN (
        SELECT id FROM memories
        ORDER BY created_at ASC
        LIMIT MAX(0, (SELECT COUNT(*) FROM memories) - ?)
      )
    `);

    const result = stmt.run(maxMemories);
    return result.changes;
  }
}

/**
 * Factory function to create SQLite database instance
 */
export function createSqliteDatabase(config: DatabaseConfig): StoragePort {
  return new SqliteDatabase(config);
}
