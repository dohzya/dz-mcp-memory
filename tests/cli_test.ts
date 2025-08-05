import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runCli } from "../src/api/mcp/cli/mod.ts";
import type { MCPResponse } from "../src/api/mcp/base.ts";

Deno.test("CLI get_stats command", async () => {
  const response = await runCli([
    "get-stats",
    "--log-level",
    "ERROR",
  ]) as MCPResponse;
  assertEquals(response.id, "cli");
  assertEquals("error" in response, false);
});
