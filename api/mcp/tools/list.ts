import * as log from "@std/log";

import type { ToolHandler } from "../types.ts";
import type { MemoryService } from "../../../core/services/memory_service.ts";
import { parseSearchParams, serializeMemoryChunk } from "../utils.ts";
import type { MemoryChunk } from "../../../core/models/memory.ts";

/**
 * MCP tool for listing/searching memories
 * Supports semantic search, filtering, and pagination
 */
export function createListTool(memoryService: MemoryService): ToolHandler {
  return async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      // Parse and validate search parameters
      const searchParams = parseSearchParams(params);
      
      log.info("Searching memories", { 
        query: searchParams.query,
        tags: searchParams.tags?.length || 0,
        category: searchParams.category,
        limit: searchParams.limit,
        offset: searchParams.offset,
      });

      // Perform search
      const result = await memoryService.searchMemories(searchParams);

      // Serialize memories for response
      const serializedMemories = result.memories.map((memory: MemoryChunk) => 
        serializeMemoryChunk(memory)
      );

      log.info("Search completed", { 
        found: result.memories.length,
        total: result.total,
        hasMore: result.hasMore,
      });

      return {
        memories: serializedMemories,
        total: result.total,
        hasMore: result.hasMore,
      };
    } catch (error) {
      log.error("Memory search failed", { error: (error as Error).message });
      throw error;
    }
  };
} 