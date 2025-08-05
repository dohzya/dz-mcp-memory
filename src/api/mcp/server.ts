import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import * as log from "@std/log";

import { createDatabase } from "../../db/index.ts";
import { MemoryService } from "../../core/services/memory_service.ts";
import { ReorganizerService } from "../../core/services/reorganizer_service.ts";
import { MCPDispatcher } from "./dispatcher.ts";
import { parseRequestBody, validateAuthToken } from "./utils.ts";
import { createMemorizeTool } from "./tools/memorize.ts";
import { createListTool } from "./tools/list.ts";
import { createReorganizeTool } from "./tools/reorganize.ts";
import { createGetMemoryTool } from "./tools/get_memory.ts";
import { createGetTagsTool } from "./tools/get_tags.ts";
import { createGetCategoriesTool } from "./tools/get_categories.ts";
import { createGetStatsTool } from "./tools/get_stats.ts";

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
    type: "memory", // Use in-memory for development
    connectionString: Deno.env.get("DATABASE_URL"),
    databasePath: Deno.env.get("DATABASE_PATH"),
  },
  logLevel: (Deno.env.get("LOG_LEVEL") as Config["logLevel"]) || "INFO",
};

/**
 * Initialize application services
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

  log.info("Initializing MCP dz-memory server", {
    port: config.port,
    databaseType: config.database.type,
    logLevel: config.logLevel,
  });

  // Initialize database
  const database = await createDatabase(config.database);
  await database.initialize();

  // Initialize services
  const memoryService = new MemoryService(database);
  const reorganizerService = new ReorganizerService(database);

  // Create tool handlers
  const tools = {
    memorize: createMemorizeTool(memoryService),
    list: createListTool(memoryService),
    reorganize: createReorganizeTool(reorganizerService),
    get_memory: createGetMemoryTool(memoryService),
    get_tags: createGetTagsTool(memoryService),
    get_categories: createGetCategoriesTool(memoryService),
    get_stats: createGetStatsTool(memoryService),
  };

  // Create dispatcher
  const dispatcher = new MCPDispatcher(tools);

  log.info("Services initialized", {
    availableTools: dispatcher.getAvailableTools(),
  });

  return { database, dispatcher };
}

async function handleRequest(
  request: Request,
  dispatcher: MCPDispatcher,
  config: Config,
): Promise<Response> {
  try {
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    validateAuthToken(authHeader, config.authToken);

    // Parse request body
    const body = await request.text();
    const requestData = parseRequestBody(body);

    // Process MCP request
    const response = await dispatcher.processRequest(requestData);

    // Return JSON response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Request handling failed", { error: errorMessage });

    // Return error response
    const errorResponse = {
      id: "error",
      error: {
        code: error instanceof Error && "code" in error
          ? (error as { code: string }).code
          : "INTERNAL_ERROR",
        message: errorMessage || "Internal server error",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
}

function handleCORS(_request: Request): Response {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * Start MCP server
 */
export async function startServer(
  config: Config = DEFAULT_CONFIG,
): Promise<void> {
  try {
    const { dispatcher } = await initializeServices(config);

    const handler = async (request: Request): Promise<Response> => {
      if (request.method === "OPTIONS") {
        return handleCORS(request);
      }

      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      return await handleRequest(request, dispatcher, config);
    };

    log.info("Starting MCP server", { port: config.port });

    await serve(handler, { port: config.port });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Failed to start server", { error: errorMessage });
    Deno.exit(1);
  }
}
