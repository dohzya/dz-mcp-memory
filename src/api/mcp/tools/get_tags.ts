import * as log from "@std/log";

import type { ToolHandler } from "../types.ts";
import type { MemoryService } from "../../../core/services/memory_service.ts";

/**
 * MCP tool for getting all available tags
 */
export function createGetTagsTool(memoryService: MemoryService): ToolHandler {
  return async (
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    try {
      // Validate that no parameters are provided
      if (Object.keys(params).length > 0) {
        throw new Error("Get tags tool does not accept any parameters");
      }

      log.info("Getting all tags");

      // Retrieve all tags
      const tags = await memoryService.getAllTags();

      log.info("Tags retrieved", { count: tags.length });

      return {
        tags,
      };
    } catch (error) {
      log.error("Get tags failed", { error: (error as Error).message });
      throw error;
    }
  };
}
