import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createMemoryDatabase } from "../src/db/memory.ts";
import { MemoryService } from "../src/core/services/memory_service.ts";
import { ReorganizerService } from "../src/core/services/reorganizer_service.ts";

Deno.test("ReorganizerService merges similar tags", async () => {
  const db = createMemoryDatabase();
  await db.initialize();

  const memoryService = new MemoryService(db);
  const reorganizer = new ReorganizerService(db);

  await memoryService.memorize({
    text: "First memory about API",
    tags: ["api"],
  });

  await memoryService.memorize({
    text: "Second memory about API server",
    tags: ["api-server"],
  });

  const result = await reorganizer.reorganize({ mergeSimilarTags: true });
  assertEquals(result.status, "ok");
  assertEquals(result.tagsMerged > 0, true);

  const searchApiServer = await memoryService.searchMemories({
    tags: ["api-server"],
  });
  assertEquals(searchApiServer.total, 0);

  const searchApi = await memoryService.searchMemories({ tags: ["api"] });
  assertEquals(searchApi.total, 2);
});
