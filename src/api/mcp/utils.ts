import { z } from "zod";
import type { MCPRequest, MCPResponse, MCPErrorResponse } from "../types/mcp.ts";
import { MCPRequestSchema, DomainError, ValidationError, AuthenticationError } from "../types/mcp.ts";
import * as log from "@std/log";

/**
 * Validate MCP request format
 */
export function validateMCPRequest(request: unknown): MCPRequest {
  try {
    return MCPRequestSchema.parse(request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Invalid MCP request format", {
        errors: error.errors,
        request,
      });
    }
    throw error;
  }
}

/**
 * Create MCP error response
 */
export function createErrorResponse(id: string, error: DomainError): MCPErrorResponse {
  return {
    id,
    error: {
      code: error.code,
      message: error.message,
      details: error.metadata,
    },
  };
}

/**
 * Create MCP success response
 */
export function createSuccessResponse(id: string, result: Record<string, unknown>): MCPResponse {
  return {
    id,
    result,
  };
}

/**
 * Validate authentication token
 */
export function validateAuthToken(authHeader: string | null, expectedToken: string): void {
  if (!authHeader) {
    throw new AuthenticationError("Missing Authorization header");
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Invalid Authorization header format");
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  if (token !== expectedToken) {
    throw new AuthenticationError("Invalid authentication token");
  }
}

/**
 * Parse and validate request body
 */
export function parseRequestBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new ValidationError("Invalid JSON in request body", {
      body,
      error: (error as Error).message,
    });
  }
}

/**
 * Convert memory chunk to serializable format
 */
export function serializeMemoryChunk(memory: {
  readonly id: string;
  readonly text: string;
  readonly metadata: {
    readonly tags: readonly string[];
    readonly context?: string;
    readonly source?: string;
    readonly priority: number;
    readonly category?: string;
  };
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly accessCount: number;
  readonly lastAccessedAt: Date;
}) {
  return {
    id: memory.id,
    text: memory.text,
    metadata: memory.metadata,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
    accessCount: memory.accessCount,
    lastAccessedAt: memory.lastAccessedAt.toISOString(),
  };
}

/**
 * Convert date string back to Date object
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new ValidationError("Invalid date format", { dateString });
  }
  return date;
}

/**
 * Parse search parameters with date conversion
 */
export function parseSearchParams(params: Record<string, unknown>): {
  readonly query?: string;
  readonly tags?: readonly string[];
  readonly category?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: "relevance" | "date" | "access" | "priority";
  readonly sortOrder?: "asc" | "desc";
} {
  const result: Record<string, unknown> = {};

  if (typeof params.query === "string") {
    result.query = params.query;
  }

  if (Array.isArray(params.tags)) {
    result.tags = params.tags.filter(tag => typeof tag === "string");
  }

  if (typeof params.category === "string") {
    result.category = params.category;
  }

  if (typeof params.dateFrom === "string") {
    result.dateFrom = parseDate(params.dateFrom);
  }

  if (typeof params.dateTo === "string") {
    result.dateTo = parseDate(params.dateTo);
  }

  if (typeof params.limit === "number") {
    result.limit = Math.max(1, Math.min(100, params.limit));
  }

  if (typeof params.offset === "number") {
    result.offset = Math.max(0, params.offset);
  }

  if (typeof params.sortBy === "string") {
    const validSortBy = ["relevance", "date", "access", "priority"];
    if (validSortBy.includes(params.sortBy)) {
      result.sortBy = params.sortBy;
    }
  }

  if (typeof params.sortOrder === "string") {
    const validSortOrder = ["asc", "desc"];
    if (validSortOrder.includes(params.sortOrder)) {
      result.sortOrder = params.sortOrder;
    }
  }

  return result;
}

/**
 * Parse memorize parameters
 */
export function parseMemorizeParams(params: Record<string, unknown>): {
  readonly text: string;
  readonly tags?: readonly string[];
  readonly context?: string;
  readonly source?: string;
  readonly priority?: number;
  readonly category?: string;
} {
  if (typeof params.text !== "string" || !params.text.trim()) {
    throw new ValidationError("Text parameter is required and must be a non-empty string");
  }

  const result = {
    text: params.text.trim(),
  } as {
    text: string;
    tags?: readonly string[];
    context?: string;
    source?: string;
    priority?: number;
    category?: string;
  };

  if (Array.isArray(params.tags)) {
    result.tags = params.tags.filter(tag => typeof tag === "string");
  }

  if (typeof params.context === "string") {
    result.context = params.context.trim();
  }

  if (typeof params.source === "string") {
    result.source = params.source.trim();
  }

  if (typeof params.priority === "number") {
    result.priority = Math.max(1, Math.min(10, params.priority));
  }

  if (typeof params.category === "string") {
    result.category = params.category.trim();
  }

  return result;
}

/**
 * Parse reorganize parameters
 */
export function parseReorganizeParams(params: Record<string, unknown>): {
  readonly mergeSimilarTags?: boolean;
  readonly cleanupOldMemories?: boolean;
  readonly optimizeStorage?: boolean;
  readonly maxMemories?: number;
} {
  const result = {} as {
    mergeSimilarTags?: boolean;
    cleanupOldMemories?: boolean;
    optimizeStorage?: boolean;
    maxMemories?: number;
  };

  if (typeof params.mergeSimilarTags === "boolean") {
    result.mergeSimilarTags = params.mergeSimilarTags;
  }

  if (typeof params.cleanupOldMemories === "boolean") {
    result.cleanupOldMemories = params.cleanupOldMemories;
  }

  if (typeof params.optimizeStorage === "boolean") {
    result.optimizeStorage = params.optimizeStorage;
  }

  if (typeof params.maxMemories === "number") {
    result.maxMemories = Math.max(1, params.maxMemories);
  }

  return result;
}

/**
 * Log MCP request for debugging
 */
export function logMCPRequest(request: MCPRequest): void {
  log.debug("MCP request received", {
    id: request.id,
    tool: request.tool,
    paramsKeys: Object.keys(request.params),
  });
}

/**
 * Log MCP response for debugging
 */
export function logMCPResponse(response: MCPResponse): void {
  if ("error" in response) {
    log.warn("MCP error response", {
      id: response.id,
      error: response.error,
    });
  } else {
    log.debug("MCP success response", {
      id: response.id,
      resultKeys: Object.keys(response.result),
    });
  }
}
