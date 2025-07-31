import { assertEquals } from "https://deno.land/std@0.218.0/assert/mod.ts";

import { MCPDispatcher } from "../api/mcp/dispatcher.ts";
import { createMemoryDatabase } from "../db/memory.ts";
import { MemoryService } from "../core/services/memory_service.ts";
import { ReorganizerService } from "../core/services/reorganizer_service.ts";
import { createMemorizeTool } from "../api/mcp/tools/memorize.ts";
import { createListTool } from "../api/mcp/tools/list.ts";
import { createReorganizeTool } from "../api/mcp/tools/reorganize.ts";
import { createGetMemoryTool } from "../api/mcp/tools/get_memory.ts";
import { createGetTagsTool } from "../api/mcp/tools/get_tags.ts";
import { createGetCategoriesTool } from "../api/mcp/tools/get_categories.ts";
import { createGetStatsTool } from "../api/mcp/tools/get_stats.ts";

Deno.test("MCPDispatcher - process memorize request", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  const memoryService = new MemoryService(db);
  const reorganizerService = new ReorganizerService(db);
  
  const tools = {
    memorize: createMemorizeTool(memoryService),
    list: createListTool(memoryService),
    reorganize: createReorganizeTool(reorganizerService),
    get_memory: createGetMemoryTool(memoryService),
    get_tags: createGetTagsTool(memoryService),
    get_categories: createGetCategoriesTool(memoryService),
    get_stats: createGetStatsTool(memoryService),
  };
  
  const dispatcher = new MCPDispatcher(tools);
  
  const request = {
    id: "test-1",
    tool: "memorize",
    params: {
      text: "Test memory for MCP dispatcher",
      tags: ["test", "mcp"],
      priority: 7,
    },
  };
  
  const response = await dispatcher.processRequest(request);
  
  assertEquals(response.id, "test-1");
  assertEquals("error" in response, false);
  
  if ("result" in response) {
    assertEquals(response.result.status, "ok");
    assertEquals(typeof response.result.memoryIds, "object");
    assertEquals(typeof response.result.chunksCreated, "number");
  }
});

Deno.test("MCPDispatcher - process list request", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  const memoryService = new MemoryService(db);
  const reorganizerService = new ReorganizerService(db);
  
  const tools = {
    memorize: createMemorizeTool(memoryService),
    list: createListTool(memoryService),
    reorganize: createReorganizeTool(reorganizerService),
    get_memory: createGetMemoryTool(memoryService),
    get_tags: createGetTagsTool(memoryService),
    get_categories: createGetCategoriesTool(memoryService),
    get_stats: createGetStatsTool(memoryService),
  };
  
  const dispatcher = new MCPDispatcher(tools);
  
  // First memorize some data
  await dispatcher.processRequest({
    id: "memorize-1",
    tool: "memorize",
    params: {
      text: "Test memory for list search",
      tags: ["test", "search"],
    },
  });
  
  // Then search for it
  const request = {
    id: "test-2",
    tool: "list",
    params: {
      query: "test",
      limit: 10,
    },
  };
  
  const response = await dispatcher.processRequest(request);
  
  assertEquals(response.id, "test-2");
  assertEquals("error" in response, false);
  
  if ("result" in response) {
    assertEquals(typeof response.result.memories, "object");
    assertEquals(typeof response.result.total, "number");
    assertEquals(typeof response.result.hasMore, "boolean");
  }
});

Deno.test("MCPDispatcher - handle unknown tool", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  const memoryService = new MemoryService(db);
  const reorganizerService = new ReorganizerService(db);
  
  const tools = {
    memorize: createMemorizeTool(memoryService),
    list: createListTool(memoryService),
    reorganize: createReorganizeTool(reorganizerService),
    get_memory: createGetMemoryTool(memoryService),
    get_tags: createGetTagsTool(memoryService),
    get_categories: createGetCategoriesTool(memoryService),
    get_stats: createGetStatsTool(memoryService),
  };
  
  const dispatcher = new MCPDispatcher(tools);
  
  const request = {
    id: "test-3",
    tool: "unknown_tool",
    params: {},
  };
  
  const response = await dispatcher.processRequest(request);
  
  assertEquals(response.id, "test-3");
  assertEquals("error" in response, true);
  
  if ("error" in response) {
    assertEquals(response.error.code, "UNKNOWN_TOOL");
  }
});

Deno.test("MCPDispatcher - handle invalid request format", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  const memoryService = new MemoryService(db);
  const reorganizerService = new ReorganizerService(db);
  
  const tools = {
    memorize: createMemorizeTool(memoryService),
    list: createListTool(memoryService),
    reorganize: createReorganizeTool(reorganizerService),
    get_memory: createGetMemoryTool(memoryService),
    get_tags: createGetTagsTool(memoryService),
    get_categories: createGetCategoriesTool(memoryService),
    get_stats: createGetStatsTool(memoryService),
  };
  
  const dispatcher = new MCPDispatcher(tools);
  
  const invalidRequest = {
    // Missing required fields
    id: "test-4",
  };
  
  const response = await dispatcher.processRequest(invalidRequest);
  
  assertEquals("error" in response, true);
  
  if ("error" in response) {
    assertEquals(response.error.code, "VALIDATION_ERROR");
  }
});

Deno.test("MCPDispatcher - get available tools", async () => {
  const db = createMemoryDatabase();
  await db.initialize();
  
  const memoryService = new MemoryService(db);
  const reorganizerService = new ReorganizerService(db);
  
  const tools = {
    memorize: createMemorizeTool(memoryService),
    list: createListTool(memoryService),
    reorganize: createReorganizeTool(reorganizerService),
    get_memory: createGetMemoryTool(memoryService),
    get_tags: createGetTagsTool(memoryService),
    get_categories: createGetCategoriesTool(memoryService),
    get_stats: createGetStatsTool(memoryService),
  };
  
  const dispatcher = new MCPDispatcher(tools);
  
  const availableTools = dispatcher.getAvailableTools();
  
  assertEquals(availableTools.includes("memorize"), true);
  assertEquals(availableTools.includes("list"), true);
  assertEquals(availableTools.includes("reorganize"), true);
  assertEquals(availableTools.includes("get_memory"), true);
  assertEquals(availableTools.includes("get_tags"), true);
  assertEquals(availableTools.includes("get_categories"), true);
  assertEquals(availableTools.includes("get_stats"), true);
  assertEquals(availableTools.length, 7);
}); 