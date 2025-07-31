# TypeScript/JavaScript Code Style Guidelines

> **Note:** This style guide follows Deno's code style conventions for consistency and best practices.

## 1. General Structure

- **Modules:** Use ES6 import/export. Group imports by origin (external libraries first, then internal modules).
- **Files:** One file = one logical module. Use `mod.ts` as entry point (not `index.ts`). Use underscores in filenames (`file_server.ts`).
- **Exported functions:** Max 2 required args, put the rest in an options object.

## 1.1 Import Order

- **Import order:**
  - First, import external libraries (Deno std, npm, etc.)
  - Then, add a blank line
  - Then, import local modules (project files)

Example:
```ts
import * as log from "@std/log";
import { z } from "zod";

import { MyService } from "../core/services/my_service.ts";
import { SpecificConfig } from "./config.ts";
```

## 2. Naming

- **Variables and functions:** Use camelCase, including acronyms (e.g., `convertUrl`, not `convertURL`).
- **Types and interfaces:** Use PascalCase (e.g., `WorktreeListItem`, `InitWorkspaceOptions`).
- **Constants:** Use UPPER_SNAKE_CASE for top-level static items, otherwise camelCase.
- **Private fields:** Use `#field` syntax over `private` keyword.

## 3. Typing

- Always explicitly type arguments and return values of public functions.
- Use `zod` for data schema validation.
- Prefer `readonly` types for objects that should not be mutated.
- Use union types for object variants (e.g., `type Task = {...} | {...}`).

## 4. Functions

- **Declaration:** Use the `function` keyword for exported functions, and arrow functions for callbacks or internal functions.
- **Async/await:** Always use `async/await` for promise handling, never chain `.then()` or `.catch()`.
- **Explicit return:** Always explicitly return the expected value.

## 5. Error Handling

- **Business errors**: Expected domain failures (validation, not-found, etc.). Return `T | ErrorClass` unions, handle locally.
- **Technical errors**: Unexpected failures (network, database, etc.). Throw to bubble up to central handler.

example:
```ts
// Business errors: return union
class DomainError {
  constructor(public code: string, public message: string, public metadata?: any) {}
}

function parseData(input: string): MyData | DomainError {
  if (!isValid(input)) {
    return new DomainError('PARSE_INVALID', 'Invalid format', { input });
  }
  return buildMyData(input);
}

const result = parseData(raw);
if (result instanceof DomainError) {
  logger.warn(result.code, result.metadata);
} else {
  doSomethingWith(result);
}

// Technical errors: throw
function getById(id: string): Promise<User | undefined> {
  const row = db.findById(id); // may throw
  return row ? schema.parse(row) : undefined; // may throw
}
```

## 6. Logging and Output

- Use Deno's standard logging module (`@std/log`).
- Configure log levels per environment (dev: DEBUG, prod: INFO).
- Include context in log messages with structured data.

```ts
import * as log from "@std/log";

// Configure logger (typically in main.ts)
log.setup({
  handlers: {
    console: new log.ConsoleHandler("DEBUG"),
  },
  loggers: {
    default: { level: "DEBUG", handlers: ["console"] },
  },
});

// Usage in modules
log.info("User created", { userId: "123", email: "user@example.com" });
log.warning("Rate limit approaching", { userId: "123", attempts: 8 });
log.error("Database connection failed", { error: err.message });
```

## 7. Syntax Style

> **Formatting:** Use `deno fmt` for consistent code formatting. The rules below describe the expected output.

- **Indentation:** 2 spaces, never tabs.
- **Spaces:** Always put a space after commas and around operators.
- **Braces:** Always open braces on the same line.
- **Parentheses:** Always wrap conditions and arguments in parentheses, even for single-line blocks.
- **Semicolons:** Always end statements with a semicolon.

## 8. Objects and Arrays

- Prefer immutable objects (`Object.freeze`, `as const`) when possible.
- Use destructuring to extract properties.

## 9. Imports

- Always use relative paths for internal modules (e.g., `./_utils.ts`).
- Group external imports at the top of the file, then internal imports.

## 10. Miscellaneous

- **Comments:** Prefer context or intent comments, avoid obvious comments.
- **TODO/FIXME:** Use format `// TODO(username)` or `// TODO(#123)` with GitHub username or issue number.
- **Dead code:** Remove obsolete commented code, unless it serves as an example or documentation.
- **JSDoc:** Document all exported symbols with single-line JSDoc when possible.

---

## Example File Structure

```typescript
import $ from "@david/dax";
import { exists } from "@std/fs/exists";
import * as path from "@std/path/join";
import { z } from "zod";

// ... internal imports ...

export type MyType = { ... };

export async function myFunction(arg: string): Promise<void> {
  if (!arg) {
    die(1, "Missing argument");
  }
  // ... code ...
}
```

---

This guide is based on the analyzed project's codebase. It can be adapted to the specific needs of another project, but it ensures style and structure consistency to facilitate maintenance and collaboration.
