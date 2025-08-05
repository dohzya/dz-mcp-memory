import { startServer } from "./src/api/mcp/server.ts";

if (import.meta.main) {
  await startServer();
}
