import * as log from "@std/log";

import type { ToolHandler } from "../types.ts";
import type { MemoryService } from "../../../core/services/memory_service.ts";

/**
 * MCP tool for getting memory statistics
 */
export function createGetStatsTool(memoryService: MemoryService): ToolHandler {
  return async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      // Validate that no parameters are provided
      if (Object.keys(params).length > 0) {
        throw new Error("Get stats tool does not accept any parameters");
      }

      log.info("Getting memory statistics");

      // Retrieve statistics
      const stats = await memoryService.getStats();

      log.info("Statistics retrieved", { 
        totalMemories: stats.totalMemories,
        totalTags: stats.totalTags,
        totalCategories: stats.totalCategories,
      });

      return {
        totalMemories: stats.totalMemories,
        totalTags: stats.totalTags,
        totalCategories: stats.totalCategories,
        oldestMemory: stats.oldestMemory?.toISOString() || null,
        newestMemory: stats.newestMemory?.toISOString() || null,
      };
    } catch (error) {
      log.error("Get stats failed", { error: (error as Error).message });
      throw error;
    }
  };
} 