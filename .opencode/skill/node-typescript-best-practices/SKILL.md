---
name: node-typescript-best-practices
description: Use when writing, reviewing, or refactoring Node.js and TypeScript backend code (ESM, Apollo Server/GraphQL, Prisma, Express/Fastify, Azure Functions). Apply to APIs, resolvers, services, data access, configuration, logging, error handling, and tests. Use for strict typing, async/await, runtime best practices, security, and delivery checklists.
---

# Node.js + TypeScript Best Practices

General Node/TypeScript baseline. The project's `AGENTS.md` is loaded by the
agent and takes precedence for project-specific conventions, commands and
structure; apply these general rules on top of it.

## TypeScript

- Keep `strict` on. Avoid implicit `any`; when the type is unknown, use
  `unknown` and narrow with type guards.
- Do not abuse `as` or `!`. Validate data at runtime at boundaries (HTTP
  input, env, external APIs) and narrow types afterwards.
- Use `import type` for type-only imports.
- Declare explicit return types on exported functions.
- Prefer `const`; use `readonly` for values that do not change.
- Model outcomes with discriminated unions instead of throwing or returning
  loose shapes:

```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
```

- Avoid `enum` in application code; use literal unions or `const` objects.
- Keep functions small and single-purpose; prefer named exports.
- For NodeNext/ESM, use explicit relative extensions (`.js` in compiled code,
  `.ts` when `allowImportingTsExtensions` is enabled).

## Async and the event loop

- Use `async/await`; avoid long `.then` chains.
- Never leave floating promises. If a promise is intentionally fire-and-forget,
  make it explicit and handle rejection:

```ts
void doBackgroundWork().catch((error) => logger.error({ error }, "task failed"));
```

- Run independent async work concurrently with `Promise.all`.
- Do not block the event loop: avoid `fs.*Sync` and heavy CPU work in the
  request path; use streams for large payloads.
- Add timeouts/`AbortController` to outbound calls (HTTP, DB drivers, queues).

## Errors and logging

- Use typed/custom errors; never swallow errors silently.
- Log errors with context and a correlation/request id, without credentials or
  personal data.
- Do not leak internal details to clients. Map internal errors to safe messages
  (in GraphQL, use `GraphQLError` with appropriate extensions/codes).
- Avoid `console.log` in production code; use a structured logger.

## Configuration

- Validate and parse configuration once at startup; fail fast if required
  values are missing. Do not read `process.env` scattered through the code.
- Keep secrets out of source and logs; use environment variables or a secret
  manager.

## Node.js runtime

- Import built-ins with the `node:` prefix (`node:fs`, `node:path`).
- Release resources on shutdown: stop the HTTP server, disconnect Prisma,
  close pools. Handle `SIGINT`/`SIGTERM`.
- Add a health check endpoint for readiness/liveness.
- Prefer streaming and pagination for large data instead of loading everything
  into memory.

## Data access (Prisma)

- Use `select`/`include` to fetch only needed fields.
- Paginate lists (`take`/`skip` or cursor-based) instead of unbounded queries.
- Add indexes through migrations when query patterns require them; never edit
  applied migrations.
- Use transactions for multi-write operations.
- In tests, mock the delegate/client boundary instead of hitting a real DB.

## API / GraphQL

- Keep resolvers thin; put data access in dedicated query/mutation modules.
- Validate and sanitize input at the boundary.
- Avoid N+1 queries (use `include`/batched reads).
- Version or evolve the schema deliberately; keep types in sync with the
  database model.

## Security

- Validate all input; use parameterized queries (Prisma does this).
- Pin dependencies and audit them; do not commit secrets.
- Apply authentication/authorization and rate limiting where appropriate.

## Testing

- Unit tests for business logic; integration tests for boundaries.
- Mock external boundaries, not internal implementation details.
- Cover success paths, validation failures, and error cases.
- Do not depend on real network/DB in unit tests.

## Before delivering

```bash
pnpm typecheck   # or tsc --noEmit
pnpm lint
pnpm test
```

- Review the diff; keep commits small and coherent.
- Update `README.md`/`AGENTS.md` when architecture, scripts, or the data model
  change.
