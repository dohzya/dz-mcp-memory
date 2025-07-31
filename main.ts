import { serve } from "https://deno.land/std@0.218.0/http/server.ts";
import * as log from "@std/log";

import { createDatabase } from "./db/index.ts";
import { MemoryService } from "./core/services/memory_service.ts";
import { ReorganizerService } from "./core/services/reorganizer_service.ts";
import { MCPDispatcher } from "./api/mcp/dispatcher.ts";
import { validateAuthToken, parseRequestBody } from "./api/mcp/utils.ts";
import { createMemorizeTool } from "./api/mcp/tools/memorize.ts";
import { createListTool } from "./api/mcp/tools/list.ts";
import { createReorganizeTool } from "./api/mcp/tools/reorganize.ts";
import { createGetMemoryTool } from "./api/mcp/tools/get_memory.ts";
import { createGetTagsTool } from "./api/mcp/tools/get_tags.ts";
import { createGetCategoriesTool } from "./api/mcp/tools/get_categories.ts";
import { createGetStatsTool } from "./api/mcp/tools/get_stats.ts";

/**
 * Application configuration
 */
interface Config {
  readonly port: number;
  readonly authToken: string;
  readonly database: {
    readonly type: "pgvector" | "sqlite" | "memory";
    readonly connectionString?: string;
    readonly databasePath?: string;
  };
  readonly logLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR";
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Config = {
  port: 8000,
  authToken: Deno.env.get("MCP_AUTH_TOKEN") || "default-token-change-in-production",
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
async function initializeServices(config: Config) {
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

/**
 * Handle HTTP requests
 */
async function handleRequest(request: Request, dispatcher: MCPDispatcher, config: Config): Promise<Response> {
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
    log.error("Request handling failed", { error: error.message });

    // Return error response
    const errorResponse = {
      id: "error",
      error: {
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "Internal server error",
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

/**
 * Handle CORS preflight requests
 */
function handleCORS(request: Request): Response {
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
 * Main application entry point
 */
async function main() {
  const config = DEFAULT_CONFIG;
  
  try {
    // Initialize services
    const { database, dispatcher } = await initializeServices(config);

    // Create request handler
    const handler = async (request: Request): Promise<Response> => {
      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return handleCORS(request);
      }

      // Only accept POST requests
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      return await handleRequest(request, dispatcher, config);
    };

    // Start server
    log.info("Starting MCP server", { port: config.port });
    
    await serve(handler, { port: config.port });

  } catch (error) {
    log.error("Failed to start server", { error: error.message });
    Deno.exit(1);
  }
}

// Start the application
if (import.meta.main) {
  main();
} 