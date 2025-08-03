import type { MCPResponse, ToolRegistry } from "./types.ts";
import {
  createErrorResponse,
  createSuccessResponse,
  logMCPRequest,
  logMCPResponse,
  validateMCPRequest,
} from "./utils.ts";
import { DomainError } from "./types.ts";
import * as log from "@std/log";

/**
 * MCP message dispatcher that routes requests to appropriate tools
 */
export class MCPDispatcher {
  constructor(private readonly tools: ToolRegistry) {}

  /**
   * Process an MCP request and return the appropriate response
   */
  async processRequest(request: unknown): Promise<MCPResponse> {
    try {
      // Validate request format
      const mcpRequest = validateMCPRequest(request);

      // Log request for debugging
      logMCPRequest(mcpRequest);

      // Check if tool exists
      const toolHandler = this.tools[mcpRequest.tool];
      if (!toolHandler) {
        const error = new DomainError(
          "UNKNOWN_TOOL",
          `Unknown tool: ${mcpRequest.tool}`,
        );
        return createErrorResponse(mcpRequest.id, error);
      }

      // Execute tool handler
      const result = await toolHandler(mcpRequest.params);

      // Create success response
      const response = createSuccessResponse(mcpRequest.id, result);

      // Log response for debugging
      logMCPResponse(response);

      return response;
    } catch (error) {
      log.error("MCP request processing failed", {
        error: (error as Error).message,
      });

      // Convert to MCP error response
      const domainError = error instanceof DomainError
        ? error
        : new DomainError("INTERNAL_ERROR", "Internal server error");

      const requestId =
        typeof request === "object" && request !== null && "id" in request
          ? (request as { id: string }).id
          : "unknown";

      const response = createErrorResponse(
        requestId,
        domainError,
      );

      logMCPResponse(response);
      return response;
    }
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): readonly string[] {
    return Object.keys(this.tools);
  }

  /**
   * Check if a tool exists
   */
  hasTool(toolName: string): boolean {
    return toolName in this.tools;
  }
}
