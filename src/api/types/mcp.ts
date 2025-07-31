/**
 * Basic MCP (Model Context Protocol) types and interfaces
 */

import { z } from "zod";

/**
 * Base MCP request structure
 */
export interface MCPRequest {
  readonly id: string;
  readonly tool: string;
  readonly params: Record<string, unknown>;
}

/**
 * Base response properties
 */
interface MCPBaseResponse {
  readonly id: string;
}

/**
 * MCP success response
 */
export interface MCPSuccessResponse extends MCPBaseResponse {
  readonly result: Record<string, unknown>;
}

/**
 * MCP error response
 */
export interface MCPErrorResponse extends MCPBaseResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

/**
 * Base MCP response structure - union of success and error responses
 */
export type MCPResponse = MCPSuccessResponse | MCPErrorResponse;

/**
 * Domain error for consistent error handling
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * Validation error class
 */
export class ValidationError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, metadata);
    this.name = "ValidationError";
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends DomainError {
  constructor(message: string) {
    super("AUTHENTICATION_ERROR", message);
    this.name = "AuthenticationError";
  }
}

/**
 * Zod schema for MCP request validation
 */
export const MCPRequestSchema = z.object({
  id: z.string(),
  tool: z.string(),
  params: z.record(z.unknown()),
});
