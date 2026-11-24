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
- Prisma 7.10.1 with `@prisma/adapter-pg` (PostgreSQL).
- Azure Functions 4 (`@azure/functions` 4.17.1) and
  `@as-integrations/azure-functions` 0.3.0.
- Vitest for tests, ESLint + typescript-eslint for lint.

## Commands

```bash
pnpm install          # installs dependencies and runs `prisma generate` (postinstall)
pnpm build            # tsc -> dist/
pnpm dev              # standalone server with tsx watch (port 5000 by default)
pnpm start            # node dist/main.js
pnpm lint             # eslint .
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest run
pnpm test:watch       # vitest
pnpm prisma:generate  # regenerates the Prisma client
pnpm prisma:migrate   # development migrations
pnpm azure:start      # func start (local Azure Functions)
pnpm azure:dev        # build + func start
```

## Architecture

- `main.ts`: standalone Apollo Server for local development.
- `src/functions/handler.ts`: shared Apollo Server with the Azure Functions
  integration (`startServerAndCreateHandler`).
- `src/functions/graphql.ts`: registers the HTTP function `graphql`
  (`GET/POST`, route `graphql`, `authLevel: "function"`), available at
  `/api/graphql`.
- `src/graphql/schema.ts`: GraphQL `typeDefs`.
- `src/graphql/index.ts`: `Query`/`Mutation` resolvers.
- `src/graphql/queries/PetQuery.ts` and `src/graphql/mutations/PetMutation.ts`:
  data-access logic. They receive the Prisma delegate (`prisma.pet`) as a
  parameter so it can be mocked in tests.
- `lib/prisma.ts`: single `PrismaClient` instance with `PrismaPg` and `.env`
  loading via `dotenv/config`.
- `src/generated/prisma/`: generated Prisma client (ESM, `.ts` extensions).

Request flow: HTTP `/api/graphql` -> `graphqlHandler` -> Apollo Server
-> resolvers -> Prisma delegate -> PostgreSQL.

## Required conventions

- Use TypeScript in strict mode, with no implicit `any`.
- Relative imports must include the `.ts` extension
  (`allowImportingTsExtensions` + `rewriteRelativeImportExtensions`).
- Keep queries and mutations separate, and pass the Prisma delegate as an
  argument instead of importing `prisma` directly.
- Do not edit `src/generated/prisma/` or `dist/`.
- Follow ESLint rules (`no-unused-vars` ignores arguments that start with `_`).

## Secrets and configuration

- `DATABASE_URL` is required. Use `.env` locally.
- `.env` and `local.settings.json` are in `.gitignore`. Never commit
  credentials or connection strings.
- `local.settings.json` may contain a real `DATABASE_URL`; do not display it
  or copy it into code or docs.

## Tests

- Vitest tests live in `tests/`.
- For data logic, mock the Prisma delegate (see `tests/pet.test.ts`).
- For the HTTP handler, build a `Request` and assert the response (see
  `tests/azure-function.test.ts`).
- Run `pnpm test` before considering a change done.

## Verification before delivery

```bash
pnpm lint
pnpm test
pnpm typecheck
```

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
- Test each new resolver by mocking the Prisma delegate, and cover the HTTP
  handler with a real GraphQL request.
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

- `azure-functions-core-tools` downloads the Core Tools binary on its first
  run; the first `func start` can take a while.

## Suggested workflow

1. Understand the change in `prisma/schema.prisma` and `src/graphql/`.
2. Update the GraphQL schema and the corresponding resolvers.
3. If the data model changes, run `pnpm prisma:migrate` and
   `pnpm prisma:generate`.
4. Add or update tests in `tests/`.
5. Run `pnpm lint` and `pnpm test`.
6. Do not commit unless explicitly asked.
