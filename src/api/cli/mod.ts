import { parse } from "@std/flags";
import { DEFAULT_CONFIG, initializeServices } from "../init.ts";

function parseTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const arr = Array.isArray(value) ? value : String(value).split(",");
  return arr.map((v) => String(v).trim()).filter((v) => v.length > 0);
}

export async function runCli(args: string[]) {
  const top = parse(args, {
    boolean: ["help"],
    alias: { h: "help" },
    stopEarly: true,
  });
  const [command, ...rest] = top._;
  if (top.help || !command) {
    console.log("Usage: dz-mcp-memory <command> [options]");
    return;
  }

  const cmd = String(command);
  const { database, memoryService, reorganizerService } =
    await initializeServices(DEFAULT_CONFIG);
  try {
    switch (cmd) {
      case "memorize": {
        const flags = parse(rest.map(String), {
          string: ["tags", "context", "source", "category"],
        });
        const text = flags._.join(" ").trim();
        if (!text) {
          console.error("memorize requires text argument");
          return;
        }
        const result = await memoryService.memorize({
          text,
          tags: parseTags(flags.tags),
          context: flags.context && String(flags.context),
          source: flags.source && String(flags.source),
          category: flags.category && String(flags.category),
        });
        console.log(JSON.stringify(result, null, 2));
        return result;
      }
      case "list": {
        const flags = parse(rest.map(String), {
          string: ["tags", "category", "query"],
        });
        const result = await memoryService.searchMemories({
          query: flags.query && String(flags.query),
          tags: parseTags(flags.tags),
          category: flags.category && String(flags.category),
          limit: flags.limit !== undefined ? Number(flags.limit) : undefined,
          offset: flags.offset !== undefined ? Number(flags.offset) : undefined,
        });
        console.log(JSON.stringify(result, null, 2));
        return result;
      }
      case "reorganize": {
        const flags = parse(rest.map(String), {
          boolean: [
            "merge-similar-tags",
            "cleanup-old-memories",
            "optimize-storage",
          ],
        });
        const result = await reorganizerService.reorganize({
          mergeSimilarTags: Boolean(flags["merge-similar-tags"]),
          cleanupOldMemories: Boolean(flags["cleanup-old-memories"]),
          optimizeStorage: Boolean(flags["optimize-storage"]),
          maxMemories: flags["max-memories"] !== undefined
            ? Number(flags["max-memories"])
            : undefined,
        });
        console.log(JSON.stringify(result, null, 2));
        return result;
      }
      case "get-memory":
      case "get_memory": {
        const flags = parse(rest.map(String), { string: ["id"] });
        const id = flags.id ?? flags._[0];
        if (!id) {
          console.error("get-memory requires an id");
          return;
        }
        const result = await memoryService.getMemory(String(id));
        console.log(JSON.stringify(result, null, 2));
        return result;
      }
      case "get-tags":
      case "get_tags": {
        const result = await memoryService.getAllTags();
        console.log(JSON.stringify({ tags: result }, null, 2));
        return result;
      }
      case "get-categories":
      case "get_categories": {
        const result = await memoryService.getAllCategories();
        console.log(JSON.stringify({ categories: result }, null, 2));
        return result;
      }
      case "get-stats":
      case "get_stats": {
        const result = await memoryService.getStats();
        console.log(JSON.stringify(result, null, 2));
        return result;
      }
      default:
        console.error(`Unknown command: ${cmd}`);
        return;
    }
  } finally {
    await database.close();
  }
}

if (import.meta.main) {
  await runCli(Deno.args);
}
