import * as log from "@std/log";

import type { ToolHandler } from "../types.ts";
import type { MemoryService } from "../../../core/services/memory_service.ts";
import { parseMemorizeParams } from "../utils.ts";

/**
 * MCP tool for memorizing text
 * Splits text into chunks and stores them with metadata
 */
export function createMemorizeTool(memoryService: MemoryService): ToolHandler {
  return async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      // Parse and validate parameters
      const memorizeParams = parseMemorizeParams(params);
      
      log.info("Memorizing text", { 
        textLength: memorizeParams.text.length,
        tags: memorizeParams.tags?.length || 0,
        category: memorizeParams.category,
      });

      // Process memorization
      const result = await memoryService.memorize(memorizeParams);

      log.info("Memorization completed", { 
        memoryIds: result.memoryIds.length,
        chunksCreated: result.chunksCreated,
      });

      return {
        status: "ok",
        memoryIds: result.memoryIds,
        chunksCreated: result.chunksCreated,
      };
    } catch (error) {
      log.error("Memorization failed", { error: (error as Error).message });
      throw error;
    }
  };
} 