import { assertEquals, assertExists } from "https://deno.land/std@0.218.0/assert/mod.ts";
import { MemoryService } from "../core/services/memory_service.ts";
import { createMemoryDatabase } from "../db/memory.ts";

Deno.test("MemoryService - memorize text", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  const memoryService = new MemoryService(db);
  
  const result = await memoryService.memorize({
    text: "This is a test memory about API endpoints. The issue was with authentication.",
    tags: ["api", "test"],
    context: "Testing",
    priority: 8,
  });
  
  assertEquals(result.chunksCreated, 1);
  assertEquals(result.memoryIds.length, 1);
  
  // Verify memory was stored
  const memory = await memoryService.getMemory(result.memoryIds[0]);
  assertExists(memory);
  assertEquals(memory.text.includes("API endpoints"), true);
  assertEquals(memory.metadata.tags.includes("api"), true);
  assertEquals(memory.metadata.priority, 8);
});

Deno.test("MemoryService - split long text into chunks", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  // chunkSize bas pour forcer le découpage
  const memoryService = new MemoryService(db, { chunkSize: 50 });
  
  const longText = `
    First paragraph with some content about backend development.
    This paragraph contains information about database queries and SQL optimization.
    
    Second paragraph about API design and REST principles.
    This includes details about authentication and authorization.
    
    Third paragraph about deployment and Docker containers.
    Information about Kubernetes orchestration and scaling.
  `.trim();
  
  const result = await memoryService.memorize({
    text: longText,
    tags: ["backend", "api"],
  });
  
  // Doit créer plusieurs chunks même pour des paragraphes courts
  assertEquals(result.chunksCreated > 1, true);
  assertEquals(result.memoryIds.length, result.chunksCreated);
});

Deno.test("MemoryService - search memories", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  const memoryService = new MemoryService(db);
  
  // Store some test memories
  await memoryService.memorize({
    text: "API authentication issue with JWT tokens",
    tags: ["api", "auth", "jwt"],
    category: "troubleshooting",
  });
  
  await memoryService.memorize({
    text: "Database query optimization for user profiles",
    tags: ["database", "sql", "optimization"],
    category: "database",
  });
  
  // Search by query
  const searchResult = await memoryService.searchMemories({
    query: "API",
    limit: 10,
  });
  
  assertEquals(searchResult.memories.length > 0, true);
  assertEquals(searchResult.memories[0].text.includes("API"), true);
  
  // Search by tags
  const tagSearchResult = await memoryService.searchMemories({
    tags: ["database"],
    limit: 10,
  });
  
  assertEquals(tagSearchResult.memories.length > 0, true);
  assertEquals(tagSearchResult.memories[0].metadata.tags.includes("database"), true);
});

Deno.test("MemoryService - get tags and categories", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  const memoryService = new MemoryService(db);
  
  // Store memories with different tags and categories
  await memoryService.memorize({
    text: "Test memory 1",
    tags: ["api", "test"],
    category: "testing",
  });
  
  await memoryService.memorize({
    text: "Test memory 2",
    tags: ["database", "sql"],
    category: "database",
  });
  
  const tags = await memoryService.getAllTags();
  const categories = await memoryService.getAllCategories();
  
  assertEquals(tags.includes("api"), true);
  assertEquals(tags.includes("database"), true);
  assertEquals(categories.includes("testing"), true);
  assertEquals(categories.includes("database"), true);
}); 