# AGENTS.md

Instructions for agents working in this repository.

Before writing, reviewing, or refactoring code, read
`.opencode/skill/node-typescript-best-practices/SKILL.md` and apply it. This
file wins when a project convention, command, or path conflicts with that
skill.

## Project summary

`backendmascotas` is a GraphQL pets API built with Apollo Server and Prisma ORM
on PostgreSQL, deployed to Azure Functions. The current domain is a single
`Pet` entity with a basic CRUD (list, get by id, and create).

## Stack and versions

- TypeScript ESM (`NodeNext`, `strict`), Node.js.
- pnpm 12.21.0 (defined in `package.json` and `devEngines`).
- Apollo Server 5.5.2, GraphQL 16.
- GraphQL Code Generator (`@graphql-codegen/cli` 8,
  `typescript`/`typescript-resolvers`) and `graphql-scalars` (`DateTime`).
- Prisma 7.10.1 with `@prisma/adapter-pg` (PostgreSQL).
- Azure Functions 4 (`@azure/functions` 4.17.1) and
  `@as-integrations/azure-functions` 0.3.0.
- Vitest for tests, ESLint + typescript-eslint for lint.

## Commands

```bash
pnpm install          # installs dependencies and runs `prisma generate` (postinstall)
pnpm build            # tsc -> dist/ and copies the SDL into dist/src/graphql/
pnpm dev              # standalone server with tsx watch (port 5000 by default)
pnpm start            # node dist/main.js
pnpm lint             # eslint .
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest run
pnpm test:watch       # vitest
pnpm generate         # GraphQL Code Generator (src/generated/graphql.ts)
pnpm prisma:generate  # regenerates the Prisma client
pnpm prisma:migrate   # development migrations
pnpm azure:start      # func start (run `pnpm build` first)
pnpm azure:dev        # build + func start
```

## Architecture

- `main.ts`: standalone Apollo Server for local development. Declares
  `MyContext = { db: PrismaClient }` and supplies `{ db: prisma }` as the
  GraphQL context.
- `src/functions/handler.ts`: shared Apollo Server with the Azure Functions
  integration (`startServerAndCreateHandler`). It resolves the SDL relative to
  its own module (`new URL("../graphql/schema.graphql", import.meta.url)`)
  and supplies the context factory `{ db: prisma }`, matching `main.ts`.
- `src/functions/graphql.ts`: registers the HTTP function `graphql`
  (`GET/POST`, route `graphql`, `authLevel: "function"`), available at
  `/api/graphql`.
- `src/graphql/schema.graphql`: GraphQL SDL, the source of truth (includes
  `scalar DateTime`).
- `src/graphql/index.ts`: resolver map (`Query`, `Mutation`, `DateTime`) using
  generated `Resolvers` types and `DateTimeResolver`.
- `src/graphql/queries/PetQuery.ts` and `src/graphql/mutations/PetMutation.ts`:
  data-access logic typed with generated `QueryResolvers`/`MutationResolvers`.
  They read the Prisma client from the GraphQL context (`context.db.pet`), not
  from an argument.
- `codegen.yml`: GraphQL Code Generator config (schema path, `MyContext`,
  `Pet` -> Prisma model mapper, `DateTime` -> `Date`).
- `src/generated/graphql.ts`: generated schema/resolver types (committed; do
  not edit).
- `src/generated/prisma/`: generated Prisma client (ESM, `.ts` extensions;
  gitignored).
- `lib/prisma.ts`: single `PrismaClient` instance with `PrismaPg` and `.env`
  loading via `dotenv/config`.
- `prisma7.config.ts`: Prisma 7 config (schema, migrations, datasource URL).
- `scripts/copy-sdl.mjs`: copies `schema.graphql` to
  `dist/src/graphql/schema.graphql` as part of `pnpm build`, so the compiled
  Azure handler can read it.
- `src/graphql/schema.ts`: legacy commented-out `typeDefs`; unused.

Request flow: HTTP `/api/graphql` -> `graphqlHandler` -> Apollo Server
-> resolvers (GraphQL context `{ db }`) -> `context.db.pet` -> PostgreSQL.

## Required conventions

- Use TypeScript in strict mode, with no implicit `any`.
- Relative imports must include the `.ts` extension
  (`allowImportingTsExtensions` + `rewriteRelativeImportExtensions`).
- Keep queries and mutations separate. Access data through the GraphQL context
  (`context.db.pet`) instead of importing `prisma` directly.
- Change the SDL in `src/graphql/schema.graphql` and run `pnpm generate`;
  resolver signatures come from `src/generated/graphql.ts`.
- Do not edit `src/generated/graphql.ts`, `src/generated/prisma/`, or `dist/`.
- Follow ESLint rules (`no-unused-vars` ignores arguments that start with `_`).

## Secrets and configuration

- `DATABASE_URL` is required. Use `.env` locally.
- `.env` and `local.settings.json` are in `.gitignore`. Never commit
  credentials or connection strings.
- `local.settings.json` may contain a real `DATABASE_URL`; do not display it
  or copy it into code or docs.

## Tests

- Vitest tests live in `tests/`.
- For data logic, call the resolver with a context `{ db }` whose `pet`
  delegate is mocked (e.g. `{ db: { pet: delegate } }`).
- For the HTTP handler, build a `Request` and assert the response (see
  `tests/azure-function.test.ts`).
- Run `pnpm test` before considering a change done.
- The handler test sets a dummy `DATABASE_URL` before importing the handler so
  the Prisma context can be constructed without a real database.

## Verification before delivery

```bash
pnpm lint
pnpm test
pnpm typecheck
```

Run `pnpm generate` as well when `src/graphql/schema.graphql` changes.

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
- Keep resolvers thin: data logic lives in `src/graphql/queries/` and
  `src/graphql/mutations/`.
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
- `src/graphql/schema.ts` is a commented-out legacy file; do not add schema
  changes there.
- `azure-functions-core-tools` downloads the Core Tools binary on its first
  run; the first `func start` can take a while.

## Suggested workflow

1. Understand the change in `prisma/schema.prisma` and `src/graphql/`.
2. Update `src/graphql/schema.graphql`, then run `pnpm generate` and update the
   resolvers in `src/graphql/index.ts`, `queries/`, and `mutations/`.
3. If the data model changes, run `pnpm prisma:migrate` and
   `pnpm prisma:generate`.
4. Add or update tests in `tests/` using a mocked `{ db }` context.
5. Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
6. Do not commit unless explicitly asked.
