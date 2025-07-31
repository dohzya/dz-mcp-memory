import * as log from "@std/log";
import type { MemoryChunk, MemoryMetadata, MemorizeParams } from "../models/memory.ts";
import type { StoragePort } from "../ports/storage_port.ts";

/**
 * Service for memory management operations
 */
export class MemoryService {
  private readonly chunkSize: number;

  constructor(private readonly db: StoragePort, options?: { chunkSize?: number }) {
    this.chunkSize = options?.chunkSize ?? 500;
  }

  /**
   * Memorize text by splitting it into chunks and storing them
   */
  async memorize(params: MemorizeParams): Promise<{
    readonly memoryIds: readonly string[];
    readonly chunksCreated: number;
  }> {
    // Validate input
    if (!params.text.trim()) {
      throw new Error("Text cannot be empty");
    }

    // Split text into meaningful chunks
    const chunks = this.splitTextIntoChunks(params.text);
    log.info("Split text into chunks", { 
      originalLength: params.text.length, 
      chunksCount: chunks.length 
    });

    // Create memory chunks with metadata
    const memoryIds: string[] = [];
    for (const chunk of chunks) {
      const metadata = this.detectMetadata(chunk, params);
      const memory = await this.db.storeMemory({
        text: chunk,
        metadata,
      });
      memoryIds.push(memory.id);
    }

    return {
      memoryIds,
      chunksCreated: chunks.length,
    };
  }

  /**
   * Split text into independent information chunks
   * Uses sentence boundaries and paragraph breaks for natural splitting
   */
  private splitTextIntoChunks(text: string): readonly string[] {
    // Normalize whitespace
    const normalized = text.replace(/\s+/g, " ").trim();
    
    // Split by paragraphs first (double newlines)
    const paragraphs = normalized.split(/\n\s*\n/);
    
    const chunks: string[] = [];
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;
      
      // If paragraph is short enough, keep it as one chunk
      if (paragraph.length <= this.chunkSize) {
        chunks.push(paragraph.trim());
        continue;
      }
      
      // Split long paragraphs by sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let currentChunk = "";
      
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length === 0) continue;
        
        // If adding this sentence would make chunk too long, start new chunk
        if (currentChunk.length + trimmed.length > this.chunkSize) {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
          }
        }
        
        currentChunk += (currentChunk.length > 0 ? " " : "") + trimmed;
      }
      
      // Add remaining chunk
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
    }
    
    return chunks;
  }

  /**
   * Detect metadata for a text chunk
   */
  private detectMetadata(chunk: string, params: MemorizeParams): MemoryMetadata {
    const tags = new Set<string>();
    
    // Add user-provided tags
    if (params.tags) {
      for (const tag of params.tags) {
        tags.add(tag.toLowerCase());
      }
    }
    
    // Auto-detect tags from text content
    const autoTags = this.extractTagsFromText(chunk);
    for (const tag of autoTags) {
      tags.add(tag);
    }
    
    // Detect category if not provided
    let category = params.category;
    if (!category) {
      category = this.detectCategory(chunk);
    }
    
    return {
      tags: Array.from(tags),
      context: params.context,
      source: params.source,
      priority: params.priority || 5, // Default priority
      category,
      relatedIds: [],
    };
  }

  /**
   * Extract potential tags from text content
   */
  private extractTagsFromText(text: string): readonly string[] {
    const tags = new Set<string>();
    
    // Extract words that look like tags (camelCase, kebab-case, or all caps)
    const tagPatterns = [
      /[A-Z][a-z]+(?:[A-Z][a-z]+)*/g, // camelCase
      /[a-z]+(?:-[a-z]+)*/g, // kebab-case
      /[A-Z]{2,}/g, // ALL_CAPS
    ];
    
    for (const pattern of tagPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (match.length >= 3) { // Only consider tags with 3+ characters
            tags.add(match.toLowerCase());
          }
        }
      }
    }
    
    // Extract technical terms (words that might be technologies, frameworks, etc.)
    const technicalTerms = [
      "api", "http", "https", "json", "xml", "sql", "nosql", "react", "vue", "angular",
      "node", "python", "java", "javascript", "typescript", "docker", "kubernetes",
      "aws", "azure", "gcp", "git", "github", "gitlab", "jenkins", "ci", "cd",
      "rest", "graphql", "websocket", "oauth", "jwt", "ssl", "tls", "cdn", "api",
      "database", "cache", "redis", "postgres", "mysql", "mongodb", "elasticsearch",
    ];
    
    const lowerText = text.toLowerCase();
    for (const term of technicalTerms) {
      if (lowerText.includes(term)) {
        tags.add(term);
      }
    }
    
    return Array.from(tags);
  }

  /**
   * Detect category based on text content
   */
  private detectCategory(text: string): string | undefined {
    const lowerText = text.toLowerCase();
    
    // Simple category detection based on keywords
    if (lowerText.includes("bug") || lowerText.includes("error") || lowerText.includes("issue")) {
      return "troubleshooting";
    }
    
    if (lowerText.includes("api") || lowerText.includes("endpoint") || lowerText.includes("rest")) {
      return "api";
    }
    
    if (lowerText.includes("database") || lowerText.includes("sql") || lowerText.includes("query")) {
      return "database";
    }
    
    if (lowerText.includes("deploy") || lowerText.includes("docker") || lowerText.includes("kubernetes")) {
      return "deployment";
    }
    
    if (lowerText.includes("test") || lowerText.includes("spec") || lowerText.includes("unit")) {
      return "testing";
    }
    
    return undefined;
  }

  /**
   * Get memory by ID with access tracking
   */
  async getMemory(id: string): Promise<MemoryChunk | undefined> {
    return await this.db.getMemory(id);
  }

  /**
   * Search memories with various filters
   */
  async searchMemories(params: {
    readonly query?: string;
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly dateFrom?: Date;
    readonly dateTo?: Date;
    readonly limit?: number;
    readonly offset?: number;
    readonly sortBy?: "relevance" | "date" | "access" | "priority";
    readonly sortOrder?: "asc" | "desc";
  }) {
    return await this.db.searchMemories(params);
  }

  /**
   * Get all available tags
   */
  async getAllTags(): Promise<readonly string[]> {
    return await this.db.getAllTags();
  }

  /**
   * Get all available categories
   */
  async getAllCategories(): Promise<readonly string[]> {
    return await this.db.getAllCategories();
  }

  /**
   * Get memory statistics
   */
  async getStats() {
    return await this.db.getStats();
  }
} 