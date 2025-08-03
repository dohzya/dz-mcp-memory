import type { StoragePort } from "../core/ports/storage_port.ts";

/**
 * Database interface for memory storage operations
 * This is an alias for StoragePort to maintain consistent naming
 */
export type Database = StoragePort;

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
export async function createDatabase(
  config: DatabaseConfig,
): Promise<Database> {
  switch (config.type) {
    case "pgvector": {
      // TODO: Implement when dependencies are stable
      throw new Error(
        "PostgreSQL with pgvector support is not yet implemented",
      );
    }
    case "sqlite": {
      // TODO: Implement when dependencies are stable
      throw new Error("SQLite support is not yet implemented");
    }
    case "memory": {
      const { createMemoryDatabase } = await import("./memory.ts");
      return createMemoryDatabase();
    }
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}
