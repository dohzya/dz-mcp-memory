import * as log from "@std/log";

import type { ToolHandler } from "../types.ts";
import type { MemoryService } from "../../../core/services/memory_service.ts";
import { serializeMemoryChunk } from "../utils.ts";
import { NotFoundError, ValidationError } from "../types.ts";

/**
 * MCP tool for getting a specific memory by ID
 */
export function createGetMemoryTool(memoryService: MemoryService): ToolHandler {
  return async (
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    try {
      // Validate memory ID parameter
      if (typeof params.id !== "string" || !params.id.trim()) {
        throw new ValidationError(
          "Memory ID is required and must be a non-empty string",
        );
      }

      const memoryId = params.id.trim();

      log.info("Getting memory", { memoryId });

      // Retrieve memory
      const memory = await memoryService.getMemory(memoryId);

      if (!memory) {
        throw new NotFoundError("Memory", memoryId);
      }

      log.info("Memory retrieved", {
        memoryId,
        textLength: memory.text.length,
        accessCount: memory.accessCount,
      });

      return {
        memory: serializeMemoryChunk(memory),
      };
    } catch (error) {
      log.error("Get memory failed", { error: (error as Error).message });
      throw error;
    }
  };
}
