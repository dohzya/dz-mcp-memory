# LLM Copilot Instructions

## Language

- **Code and documentation must be written in English**
- All comments, variable names, function names, and documentation should be in
  English
- Only write comments that provide additional information beyond what the code
  already shows

## Comment Guidelines

- **DO NOT** write comments that simply describe what the code does
- **DO** write comments that explain:
  - **Why** the code is written this way (design decisions, trade-offs)
  - **Context** that's not obvious from the code itself
  - **Assumptions** or constraints that affect the implementation
  - **Performance considerations** or optimization rationale
  - **Security considerations** when relevant
  - **Future considerations** or potential improvements

## Examples

### ❌ Bad comments (just describing the code):

```typescript
// Loop through the array
for (const item of items) {
  // Check if item is valid
  if (isValid(item)) {
    // Process the item
    process(item);
  }
}
```

### ✅ Good comments (providing additional context):

```typescript
// Using for...of instead of forEach to avoid callback overhead
// and maintain synchronous execution for better error handling
for (const item of items) {
  // Skip invalid items early to avoid unnecessary processing
  // This is critical for performance with large datasets
  if (isValid(item)) {
    // Process item with retry logic for network failures
    // Retries up to 3 times with exponential backoff
    process(item);
  }
}
```

## Code Style

- Use TypeScript with strict mode
- Follow modern ES6+ patterns
- Prefer functional programming where appropriate
- Write self-documenting code with clear variable and function names
- Use meaningful error messages and logging

## Documentation

- Write comprehensive JSDoc for public APIs
- Include usage examples in documentation
- Document edge cases and error conditions
- Keep documentation up-to-date with code changes
