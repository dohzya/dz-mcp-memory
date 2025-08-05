import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runCli } from "../src/api/cli/mod.ts";

Deno.test("CLI get-stats command", async () => {
  const result = await runCli(["get-stats"]) as { totalMemories: number };
  assertEquals(result.totalMemories, 0);
});
