import { parse } from "@std/flags";
import { DEFAULT_CONFIG, initializeServices } from "../server.ts";
import type { MCPRequest, MCPResponse } from "../base.ts";

/**
 * Run CLI request using MCP tools.
 */
export async function runCli(args: string[]): Promise<MCPResponse | void> {
  const flags = parse(args, {
    string: ["tags", "context", "source", "category", "text", "log-level"],
    boolean: ["help"],
    alias: { h: "help" },
  });

  const [toolArg, ...rest] = flags._;
  if (flags.help || !toolArg) {
    console.log(
      "Usage: dz-mcp-memory <tool> [options] [text]",
    );
    return;
  }

  const tool = String(toolArg).replaceAll("-", "_");

  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flags)) {
    if (
      key === "_" ||
      key === "help" ||
      key === "h" ||
      key === "log-level" ||
      value === undefined ||
      value === false
    ) {
      continue;
    }
    params[key] = value;
  }

  if (rest.length > 0 && params.text === undefined) {
    params.text = rest.join(" ");
  }

  if (params.tags) {
    const tagValue = params.tags;
    params.tags = Array.isArray(tagValue)
      ? tagValue.map(String)
      : String(tagValue).split(",").map((t) => t.trim()).filter(Boolean);
  }

  const logLevel = (flags["log-level"] ??
    DEFAULT_CONFIG.logLevel) as typeof DEFAULT_CONFIG.logLevel;
  const { dispatcher, database } = await initializeServices({
    ...DEFAULT_CONFIG,
    logLevel,
  });
  try {
    const request: MCPRequest = { id: "cli", tool, params };
    const response = await dispatcher.processRequest(request);
    console.log(JSON.stringify(response, null, 2));
    return response;
  } finally {
    await database.close();
  }
}

if (import.meta.main) {
  await runCli(Deno.args);
}
