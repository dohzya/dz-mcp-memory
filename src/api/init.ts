import * as log from "@std/log";

import { createDatabase } from "../db/index.ts";
import { MemoryService } from "../core/services/memory_service.ts";
import { ReorganizerService } from "../core/services/reorganizer_service.ts";

/**
 * Application configuration
 */
export interface Config {
  readonly port: number;
  readonly authToken: string;
  readonly database: {
    readonly type: "pgvector" | "sqlite" | "memory";
    readonly connectionString?: string;
    readonly databasePath?: string;
  };
  readonly logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Config = {
  port: 8000,
  authToken: Deno.env.get("MCP_AUTH_TOKEN") ||
    "default-token-change-in-production",
  database: {
    type: "memory",
    connectionString: Deno.env.get("DATABASE_URL"),
    databasePath: Deno.env.get("DATABASE_PATH"),
  },
  logLevel: (Deno.env.get("LOG_LEVEL") as Config["logLevel"]) || "INFO",
};

/**
 * Initialize core application services without any specific adapter
 */
export async function initializeServices(config: Config) {
  // Configure logging
  log.setup({
    handlers: {
      console: new log.ConsoleHandler(config.logLevel),
    },
    loggers: {
      default: { level: config.logLevel, handlers: ["console"] },
    },
  });

  log.info("Initializing services", {
    port: config.port,
    databaseType: config.database.type,
    logLevel: config.logLevel,
  });

  // Initialize database
  const database = await createDatabase(config.database);
  await database.initialize();

  // Initialize domain services
  const memoryService = new MemoryService(database);
  const reorganizerService = new ReorganizerService(database);

  return { database, memoryService, reorganizerService };
}
