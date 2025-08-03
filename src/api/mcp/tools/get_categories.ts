import * as log from "@std/log";

import type { ToolHandler } from "../types.ts";
import type { MemoryService } from "../../../core/services/memory_service.ts";

/**
 * MCP tool for getting all available categories
 */
export function createGetCategoriesTool(
  memoryService: MemoryService,
): ToolHandler {
  return async (
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    try {
      // Validate that no parameters are provided
      if (Object.keys(params).length > 0) {
        throw new Error("Get categories tool does not accept any parameters");
      }

      log.info("Getting all categories");

      // Retrieve all categories
      const categories = await memoryService.getAllCategories();

      log.info("Categories retrieved", { count: categories.length });

      return {
        categories,
      };
    } catch (error) {
      log.error("Get categories failed", { error: (error as Error).message });
      throw error;
    }
  };
}
