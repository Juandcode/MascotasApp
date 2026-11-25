# AGENTS.md

Instructions for agents working in this repository.

Before writing, reviewing, or refactoring code, read
`.opencode/skill/node-typescript-best-practices/SKILL.md` and apply it. This
file wins when a project convention, command, or path conflicts with that
skill.

## Project summary

`backendmascotas` is a GraphQL pets API built with Apollo Server and Prisma ORM
on PostgreSQL. It runs as a standalone Express server and as Azure Functions.
The current domain has `Pet` and `User` entities with list, get by id, and
create operations, plus a dedicated HTTP endpoint that validates image uploads
and stores them in Tigris (S3-compatible object storage).

## Stack and versions

- TypeScript ESM (`NodeNext`, `strict`), Node.js.
- pnpm 12.21.0 (defined in `package.json` and `devEngines`).
- Apollo Server 5.5.2, GraphQL 16.
- Express 5 with `@as-integrations/express5`, `cors`, and `multer` for the
  standalone HTTP server and upload route.
- GraphQL Code Generator (`@graphql-codegen/cli` 8,
  `typescript`/`typescript-resolvers`) and `graphql-scalars` (`DateTime`).
- Prisma 7.10.1 with `@prisma/adapter-pg` (PostgreSQL).
- `@tigrisdata/storage` 3.25.0 for image uploads to a Tigris bucket.
- Azure Functions 4 (`@azure/functions` 4.17.1) and
  `@as-integrations/azure-functions` 0.3.0.
- Vitest for tests, ESLint + typescript-eslint for lint.

## Commands

```bash
pnpm install          # installs dependencies and runs `prisma generate` (postinstall)
pnpm build            # tsc -> dist/ and copies the SDL into dist/src/server/graphql/
pnpm dev              # standalone Express + Apollo server (GraphQL and uploads)
pnpm start            # node dist/main.js
pnpm lint             # eslint .
pnpm typecheck        # tsc --noEmit
pnpm format           # prettier --write .
pnpm test             # vitest run
pnpm test:watch       # vitest
pnpm generate         # GraphQL Code Generator (src/generated/graphql.ts)
pnpm prisma:generate  # regenerates the Prisma client
pnpm prisma:migrate   # development migrations
pnpm azure:start      # func start (run `pnpm build` first)
pnpm azure:dev        # build + func start
```

## Architecture

- `main.ts`: bootstrap only. Loads `src/server/config.ts`, calls
  `createServerApp()` from `src/server/app.ts`, starts the HTTP listener, logs
  startup, and handles `SIGINT`/`SIGTERM`. Do not add application logic here.
- `src/server/app.ts`: Express 5 + Apollo Server composition. Serves GraphQL on
  any path (including `/graphql`), `GET /health`, and `POST /api/upload`; applies
  CORS, JSON body parsing, request/error logging,
  `ApolloServerPluginDrainHttpServer`, and `expressMiddleware` with
  `{ db: prisma }`.
- `src/server/config.ts`: validates `PORT` and reports whether the `S3_*` upload
  settings are configured.
- `src/server/context.ts`: declares `MyContext = { db: PrismaClient }`.
- `src/server/functions/handler.ts`: shared Apollo Server with the Azure
  Functions integration (`startServerAndCreateHandler`). It resolves the SDL
  relative to its own module (`new URL("../graphql/schema.graphql",
import.meta.url)`) and supplies the context factory `{ db: prisma }`, matching
  `src/server/app.ts`.
- `src/server/functions/index.ts`: Azure Functions entrypoint (`main` in
  `package.json`); it imports `graphql.ts` and `upload.ts` so both functions
  are registered.
- `src/server/functions/graphql.ts`: registers the HTTP function `graphql`
  (`GET/POST`, route `graphql`, `authLevel: "function"`), available at
  `/api/graphql`.
- `src/server/functions/upload.ts`: registers the HTTP function `upload`
  (`POST`, route `upload`, `authLevel: "function"`), available at
  `/api/upload`.
- `src/server/functions/uploadHandler.ts`: Azure Functions adapter that validates
  `multipart/form-data` with a `file` field and delegates to
  `src/server/uploads/imageUpload.ts`.
- `src/server/uploads/imageUpload.ts`: shared upload validation (JPEG/PNG/GIF/WebP
  up to 15 MB, magic bytes) and Tigris upload. Used by both the standalone route
  and the Azure Functions adapter.
- `src/server/uploads/uploadRouter.ts`: Express router for `POST /api/upload`,
  using `multer` memory storage and the shared upload processor.
- `src/server/graphql/loggingPlugin.ts`: Apollo plugin that logs operation start,
  duration, and error codes with `console.log`/`console.error`.
- `src/server/graphql/schema.graphql`: GraphQL SDL, the source of truth
  (includes `scalar DateTime`).
- `src/server/graphql/index.ts`: resolver map (`Query`, `Mutation`, `DateTime`)
  using generated `Resolvers` types and `DateTimeResolver`.
- `src/server/graphql/queries/PetQuery.ts` and
  `src/server/graphql/mutations/PetMutation.ts`: pet data-access logic typed with
  generated `QueryResolvers`/`MutationResolvers`. They read the Prisma client
  from the GraphQL context (`context.db.pet`), not from an argument.
- `src/server/graphql/queries/UserQuery.ts` and
  `src/server/graphql/mutations/UserMutation.ts`: user data-access logic typed
  with generated resolver types and read from `context.db.user`.
- `codegen.yml`: GraphQL Code Generator config (schema path, `MyContext`,
  `Pet` -> Prisma model mapper, `DateTime` -> `Date`).
- `src/generated/graphql.ts`: generated schema/resolver types (committed; do
  not edit).
- `src/generated/prisma/`: generated Prisma client (ESM, `.ts` extensions;
  gitignored).
- `src/server/infrastructure/prisma.ts`: single `PrismaClient` instance with
  `PrismaPg` and `.env` loading via `dotenv/config`.
- `src/server/infrastructure/tigris.ts`: `uploadImage()` wrapper around
  `@tigrisdata/storage` `put()`; reads `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`, and `S3_ENDPOINT` lazily, uploads public objects with
  a UUID key, and returns `{ key, url, size, mimetype }`.
- `prisma7.config.ts`: Prisma 7 config (schema, migrations, datasource URL).
- `scripts/copy-sdl.mjs`: copies `schema.graphql` to
  `dist/src/server/graphql/schema.graphql` as part of `pnpm build`, so the
  compiled Azure handler can read it.
- `src/server/graphql/schema.ts`: legacy commented-out `typeDefs`; unused.

Standalone request flow: `main.ts` -> `createServerApp()` ->
`src/server/app.ts` middleware -> Apollo/resolvers (`{ db }`) -> PostgreSQL.

Azure request flow: HTTP `/api/graphql` -> `graphqlHandler` -> Apollo Server
-> resolvers (GraphQL context `{ db }`) -> `context.db.pet` -> PostgreSQL.

Upload flow: HTTP `/api/upload` (standalone Express or Azure Functions)
-> multipart validation -> `src/server/uploads/imageUpload.ts` ->
`src/server/infrastructure/tigris.ts` -> `@tigrisdata/storage` `put()` ->
`uploads/<uuid>.<ext>` in the Tigris bucket. Both transports share the same
validation and upload code.

## Required conventions

- Use TypeScript in strict mode, with no implicit `any`.
- Relative imports must include the `.ts` extension
  (`allowImportingTsExtensions` + `rewriteRelativeImportExtensions`).
- Keep `main.ts` as bootstrap only: configuration in `src/server/config.ts`, the
  GraphQL context in `src/server/context.ts`, and Express/Apollo composition in
  `src/server/app.ts`.
- Keep queries and mutations separate. Access data through the GraphQL context
  (`context.db.pet`) instead of importing `prisma` directly.
- Change the SDL in `src/server/graphql/schema.graphql` and run `pnpm generate`;
  resolver signatures come from `src/generated/graphql.ts`.
- Do not edit `src/generated/graphql.ts`, `src/generated/prisma/`, or `dist/`.
- Uploads: keep uploads out-of-band from GraphQL (Azure Functions only parses
  JSON bodies), accept only images up to 15 MB, verify the content signature,
  generate UUID filenames, and never trust client filenames.
- Uploads go through `src/server/infrastructure/tigris.ts`; do not import `@tigrisdata/storage`
  directly from handlers or resolvers. Never hardcode bucket credentials.
- Keep upload validation in `src/server/uploads/imageUpload.ts`; both the Express
  router and the Azure Functions adapter must use it instead of duplicating
  rules.
- Logs use `console.log`/`console.error` with prefixes (`[http]`,
  `[graphql]`, `[upload]`, `[startup]`, `[functions]`) so Azure Functions can
  forward them to Application Insights. Log request metadata, durations, and
  error codes/summaries, never credentials, file contents, or client filenames.
- Follow ESLint rules (`no-unused-vars` ignores arguments that start with `_`).

## Secrets and configuration

- `DATABASE_URL` is required. Use `.env` locally.
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` are required for
  uploads; `S3_ENDPOINT` defaults to `https://t3.storage.dev`.
- `APPLICATIONINSIGHTS_CONNECTION_STRING` is optional; when configured in
  Azure Functions the host sends console logs to Application Insights without
  an SDK.
- `.env` and `local.settings.json` are in `.gitignore`. Never commit
  credentials or connection strings.
- `local.settings.json` may contain a real `DATABASE_URL` and real `S3_*`
  credentials; do not display them or copy them into code or docs.

## Tests

- Vitest tests live in `tests/`.
- For data logic, call the resolver with a context `{ db }` whose `pet` or
  `user` delegate is mocked (e.g. `{ db: { pet: delegate } }`).
- For the HTTP handler, build a `Request` and assert the response (see
  `tests/azure-function.test.ts`).
- For uploads, build a `FormData` request, set dummy `S3_*` env vars before
  importing the handler, and mock `@tigrisdata/storage` `put()` (see
  `tests/upload.test.ts`). Do not require real credentials in tests.
- Test the standalone upload route by mounting `src/server/uploads/uploadRouter.ts` on
  a real Express app and listening on an ephemeral port; close all connections
  after the test.
- Run `pnpm test` before considering a change done.
- The handler test sets a dummy `DATABASE_URL` before importing the handler so
  the Prisma context can be constructed without a real database.

## Verification before delivery

```bash
pnpm lint
pnpm test
pnpm typecheck
```

Run `pnpm generate` as well when `src/server/graphql/schema.graphql` changes.

## Code best practices

General Node.js and TypeScript practices (typing, async, errors, logging,
configuration, Prisma, GraphQL, security, and tests) live in
`.opencode/skill/node-typescript-best-practices/SKILL.md`. Read that file and
follow it. Keep the project rules in this document for commands, layout, and
delivery.

## Process best practices

- Commits: descriptive messages in the imperative mood, one coherent change
  per commit; do not include `dist/`, `node_modules/`, `.env`, or
  `local.settings.json`.
- Do not commit directly to `main`: create a branch per change and open a PR.
- Keep resolvers thin: data logic lives in `src/server/graphql/queries/` and
  `src/server/graphql/mutations/`.
- Test each new resolver by mocking `context.db.pet`, and cover the HTTP
  handler with a real GraphQL request.
- After changing the SDL, run `pnpm generate` and commit
  `src/generated/graphql.ts`.
- Migrations: one migration per model change, and do not edit migrations that
  have already been applied; regenerate the client with `pnpm prisma:generate`.
- Prisma queries: use `select`/`include` to avoid unnecessary fields, and add
  indexes through a migration when appropriate.
- Errors: do not expose internal details or credentials in GraphQL responses
  or logs.
- Documentation: update `README.md` and `AGENTS.md` when the architecture,
  scripts, or data model change.
- Before considering a change done: `pnpm lint`, `pnpm test`, and
  `pnpm typecheck`.

## Known limitations

- Azure Functions loads `dist/`: run `pnpm build` before `func start` or
  deploying, otherwise the compiled handler and the copied SDL are missing or
  stale.
- `src/server/graphql/schema.ts` is a commented-out legacy file; do not add schema
  changes there.
- Uploads depend on Tigris availability and valid `S3_*` credentials; missing
  configuration or a storage error makes `POST /api/upload` return `500`.
- Objects are uploaded with public access. If the bucket forbids public objects,
  change `src/server/infrastructure/tigris.ts` to private access and return signed URLs.
- Uploads are not persisted in PostgreSQL yet (no image key/URL columns on
  `Pet`).
- Azure Functions only forwards `console.*` output to Application Insights when
  `APPLICATIONINSIGHTS_CONNECTION_STRING` is configured in the Function App.
- `azure-functions-core-tools` downloads the Core Tools binary on its first
  run; the first `func start` can take a while.

## Suggested workflow

1. Understand the change in `prisma/schema.prisma` and `src/server/graphql/`.
2. Update `src/server/graphql/schema.graphql`, then run `pnpm generate` and update the
   resolvers in `src/server/graphql/index.ts`, `queries/`, and `mutations/`.
3. If the data model changes, run `pnpm prisma:migrate` and
   `pnpm prisma:generate`.
4. Add or update tests in `tests/` using a mocked `{ db }` context.
5. Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
6. Do not commit unless explicitly asked.
