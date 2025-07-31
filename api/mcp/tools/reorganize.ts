import * as log from "@std/log";

import type { ToolHandler } from "../types.ts";
import type { ReorganizerService } from "../../../core/services/reorganizer_service.ts";
import { parseReorganizeParams } from "../utils.ts";

/**
 * MCP tool for reorganizing memories
 * Merges similar tags, cleans up old memories, and optimizes storage
 */
export function createReorganizeTool(reorganizerService: ReorganizerService): ToolHandler {
  return async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      // Parse and validate reorganization parameters
      const reorganizeParams = parseReorganizeParams(params);
      
      log.info("Starting memory reorganization", { 
        mergeSimilarTags: reorganizeParams.mergeSimilarTags,
        cleanupOldMemories: reorganizeParams.cleanupOldMemories,
        optimizeStorage: reorganizeParams.optimizeStorage,
        maxMemories: reorganizeParams.maxMemories,
      });

      // Perform reorganization
      const result = await reorganizerService.reorganize(reorganizeParams);

      log.info("Reorganization completed", { 
        status: result.status,
        tagsMerged: result.tagsMerged,
        memoriesCleaned: result.memoriesCleaned,
        storageOptimized: result.storageOptimized,
      });

      return {
        status: result.status,
        tagsMerged: result.tagsMerged,
        memoriesCleaned: result.memoriesCleaned,
        storageOptimized: result.storageOptimized,
        ...(result.error && { error: result.error }),
      };
    } catch (error) {
      log.error("Memory reorganization failed", { error: (error as Error).message });
      throw error;
    }
  };
} 