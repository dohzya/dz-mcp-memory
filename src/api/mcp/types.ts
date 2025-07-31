import type { MCPRequest, MCPErrorResponse, MCPSuccessResponse, MCPResponse } from "../types/mcp.ts";
import type { MemoryChunk, MemorySearchParams, ReorganizeParams } from "../../core/models/memory.ts";

// Re-export types from base MCP types
export type { MCPResponse };
export { DomainError } from "../types/mcp.ts";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * MCP tool handler function type
 */
export type ToolHandler = (params: Record<string, unknown>) => Promise<Record<string, unknown>>;

/**
 * Tool registry mapping tool names to handlers
 */
export interface ToolRegistry {
  readonly [toolName: string]: ToolHandler;
}

/**
 * MCP request with typed parameters
 */
export interface TypedMCPRequest<T = Record<string, unknown>> extends Omit<MCPRequest, "params"> {
  readonly params: T;
}

/**
 * Specific request types for each tool
 */
export interface MemorizeRequest extends TypedMCPRequest<{ readonly memoryChunks: MemoryChunk[] }> {
  readonly tool: "memorize";
}

export interface ListRequest extends TypedMCPRequest<MemorySearchParams> {
  readonly tool: "list";
}

export interface ReorganizeRequest extends TypedMCPRequest<ReorganizeParams> {
  readonly tool: "reorganize";
}

export interface GetMemoryRequest extends TypedMCPRequest<{ readonly id: string }> {
  readonly tool: "get_memory";
}

export interface GetTagsRequest extends TypedMCPRequest<Record<string, never>> {
  readonly tool: "get_tags";
}

export interface GetCategoriesRequest extends TypedMCPRequest<Record<string, never>> {
  readonly tool: "get_categories";
}

export interface GetStatsRequest extends TypedMCPRequest<Record<string, never>> {
  readonly tool: "get_stats";
}

/**
 * Union type for all possible MCP requests
 */
export type TypedMCPRequestUnion =
  | MemorizeRequest
  | ListRequest
  | ReorganizeRequest
  | GetMemoryRequest
  | GetTagsRequest
  | GetCategoriesRequest
  | GetStatsRequest;

/**
 * Response types for each tool
 */
export interface MemorizeResponse extends MCPSuccessResponse {
  readonly result: {
    readonly status: "ok";
    readonly memoryIds: readonly string[];
    readonly chunksCreated: number;
  };
}

export interface ListResponse extends MCPSuccessResponse {
  readonly result: {
    readonly memories: Array<{
      readonly id: string;
      readonly text: string;
      readonly metadata: {
        readonly tags: readonly string[];
        readonly context?: string;
        readonly source?: string;
        readonly priority: number;
        readonly category?: string;
      };
      readonly createdAt: string;
      readonly updatedAt: string;
      readonly accessCount: number;
      readonly lastAccessedAt: string;
    }>;
    readonly total: number;
    readonly hasMore: boolean;
  };
}

export interface ReorganizeResponse extends MCPSuccessResponse {
  readonly result: {
    readonly status: "ok" | "error";
    readonly tagsMerged: number;
    readonly memoriesCleaned: number;
    readonly storageOptimized: boolean;
    readonly error?: string;
  };
}

export interface GetMemoryResponse extends MCPSuccessResponse {
  readonly result: {
    readonly memory?: {
      readonly id: string;
      readonly text: string;
      readonly metadata: {
        readonly tags: readonly string[];
        readonly context?: string;
        readonly source?: string;
        readonly priority: number;
        readonly category?: string;
      };
      readonly createdAt: string;
      readonly updatedAt: string;
      readonly accessCount: number;
      readonly lastAccessedAt: string;
    };
  };
}

export interface GetTagsResponse extends MCPSuccessResponse {
  readonly result: {
    readonly tags: readonly string[];
  };
}

export interface GetCategoriesResponse extends MCPSuccessResponse {
  readonly result: {
    readonly categories: readonly string[];
  };
}

export interface GetStatsResponse extends MCPSuccessResponse {
  readonly result: {
    readonly totalMemories: number;
    readonly totalTags: number;
    readonly totalCategories: number;
    readonly oldestMemory: string | null;
    readonly newestMemory: string | null;
  };
}

/**
 * Union type for all possible MCP success responses
 */
export type TypedMCPSuccessResponseUnion =
  | MemorizeResponse
  | ListResponse
  | ReorganizeResponse
  | GetMemoryResponse
  | GetTagsResponse
  | GetCategoriesResponse
  | GetStatsResponse;

/**
 * Union type for all possible MCP responses
 */
export type TypedMCPResponseUnion = TypedMCPSuccessResponseUnion | MCPErrorResponse;
