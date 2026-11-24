# backendmascotas

GraphQL API for pet management. It exposes queries and mutations over a
PostgreSQL database through Apollo Server and Prisma ORM, and it can run both
as a standalone Node server and as an Azure Function. The GraphQL SDL is the
source of truth and TypeScript resolver types are generated with GraphQL Code
Generator.

## Stack

| Area             | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| Language         | TypeScript (ESM, `NodeNext`, `strict`)                        |
| Runtime          | Node.js                                                       |
| API              | Apollo Server 5 + GraphQL 16                                  |
| Schema / types   | GraphQL Code Generator (`typescript`, `typescript-resolvers`) |
| Scalars          | `graphql-scalars` (`DateTime`)                                |
| ORM / database   | Prisma 7 (`prisma-client`, ESM) + `@prisma/adapter-pg`        |
| Database         | PostgreSQL                                                    |
| Serverless       | Azure Functions 4 (`@azure/functions`)                        |
| Tests            | Vitest                                                        |
| Linter           | ESLint + typescript-eslint                                    |
| Package manager  | pnpm 12.21.0                                                  |

## Project structure

```
backendmascotas/
├── main.ts                      # Standalone Apollo server; defines MyContext { db }
├── lib/
│   └── prisma.ts                # PrismaClient + pg adapter and .env loading
├── src/
│   ├── graphql/
│   │   ├── schema.graphql       # GraphQL SDL (source of truth, DateTime scalar)
│   │   ├── schema.ts            # Legacy commented-out typeDefs (unused)
│   │   ├── index.ts             # Resolver map + DateTimeResolver
│   │   ├── queries/PetQuery.ts  # getPets / getPet (context.db.pet)
│   │   └── mutations/PetMutation.ts  # createPet (context.db.pet)
│   ├── functions/
│   │   ├── handler.ts           # Loads the SDL and supplies the Prisma context
│   │   └── graphql.ts           # HTTP function definition "graphql"
│   └── generated/
│       ├── graphql.ts           # Schema/resolver types from codegen (committed)
│       └── prisma/              # Generated Prisma client (do not edit, gitignored)
├── prisma/
│   ├── schema.prisma            # Data model (Pet)
│   └── migrations/              # SQL migrations
├── scripts/
│   └── copy-sdl.mjs             # Copies schema.graphql into dist/ during build
├── tests/
│   ├── pet.test.ts              # Unit tests for queries/mutations
│   └── azure-function.test.ts   # HTTP handler integration test
├── codegen.yml                  # GraphQL Code Generator configuration
├── host.json                    # Azure Functions configuration
├── local.settings.json          # Local Azure Functions settings (gitignored)
├── prisma7.config.ts            # Prisma 7 config (schema, migrations, datasource)
├── tsconfig.json
├── eslint.config.js
└── pnpm-workspace.yaml          # allowBuilds for dependency scripts
```

## Requirements

- Node.js (a version compatible with ESM and `@types/node` 26.x)
- pnpm 12.21.0 (`corepack` or `npm i -g pnpm@12.21.0`)
- PostgreSQL reachable through `DATABASE_URL`

## Installation

```bash
pnpm install
```

The `postinstall` script runs `prisma generate` automatically. If the Prisma
client is missing, generate it manually:

```bash
pnpm prisma:generate
```

The GraphQL resolver types (`src/generated/graphql.ts`) are committed, but they
must be regenerated after editing `src/graphql/schema.graphql`:

```bash
pnpm generate
```

## Code generation

There are two independent generation steps:

| Source                     | Command               | Output                            |
| -------------------------- | --------------------- | --------------------------------- |
| `prisma/schema.prisma`     | `pnpm prisma:generate`| `src/generated/prisma/`           |
| `src/graphql/schema.graphql` | `pnpm generate`     | `src/generated/graphql.ts`        |

`codegen.yml` configures GraphQL Code Generator to:

- generate schema and resolver types with `typescript` and
  `typescript-resolvers`;
- use `MyContext` (from `main.ts`) as the resolver context type;
- map the GraphQL `Pet` type to the Prisma `Pet` model;
- map the `DateTime` scalar to JavaScript `Date`.

Do not edit files under `src/generated/` by hand. The Prisma client is
gitignored; the generated GraphQL types are committed so a clean checkout can
typecheck without running codegen.

## Environment variables

Create a `.env` file at the repository root (it is not committed):

```env
DATABASE_URL=postgres://usuario:password@host:5432/mascotas?sslmode=require
```

- `lib/prisma.ts` throws if `DATABASE_URL` is not set.
- `prisma7.config.ts` reads `DATABASE_URL` through `env()` and is loaded
  automatically by Prisma.
- To run Azure Functions locally, `local.settings.json` must include
  `DATABASE_URL` inside `Values`. This file is in `.gitignore` because it can
  contain credentials.

## Scripts

| Script                  | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `pnpm build`            | Compiles TypeScript to `dist/` and copies the SDL        |
| `pnpm dev`              | Standalone server with reload (`tsx watch main.ts`)      |
| `pnpm start`            | Runs the compiled build (`node dist/main.js`)            |
| `pnpm start:ts`         | Standalone server directly with `tsx`                    |
| `pnpm typecheck`        | `tsc --noEmit`                                           |
| `pnpm lint`             | `eslint .`                                               |
| `pnpm test`             | Vitest, single run                                       |
| `pnpm test:watch`       | Vitest in watch mode                                     |
| `pnpm prisma:generate`  | Generates the Prisma client                              |
| `pnpm prisma:migrate`   | Creates and applies migrations in development            |
| `pnpm prisma:studio`    | Opens Prisma Studio                                      |
| `pnpm generate`         | Runs GraphQL Code Generator (`gql-gen --config codegen.yml`) |
| `pnpm azure:start`      | Starts Azure Functions Core Tools (`func start`)         |
| `pnpm azure:dev`        | Builds and starts Azure Functions                        |

## Database

Current model in `prisma/schema.prisma`:

```prisma
model Pet {
  id        Int      @id @default(autoincrement())
  name      String
  species   String
  age       Int?
  createdAt DateTime @default(now())
}
```

- Provider: `postgresql`.
- Migrations live in `prisma/migrations/`.
- The client is generated in `src/generated/prisma/` as ESM with `.ts`
  extensions (`moduleFormat: "esm"`, `importFileExtension: "ts"`).
- `prisma7.config.ts` points Prisma at `prisma/schema.prisma` and
  `prisma/migrations/`, and provides the datasource URL.

Typical flow after a model change:

```bash
pnpm prisma:migrate   # creates and applies the migration
pnpm prisma:generate  # regenerates the client
```

## GraphQL API

The SDL lives in `src/graphql/schema.graphql`:

```graphql
scalar DateTime

type Pet {
  id: ID!
  name: String!
  species: String!
  age: Int
  createdAt: DateTime!
}

input CreatePetInput {
  name: String!
  species: String!
  age: Int
}

type Query {
  pets: [Pet!]!
  pet(id: ID!): Pet
}

type Mutation {
  createPet(input: CreatePetInput!): Pet!
}
```

Examples:

```graphql
query {
  pets {
    id
    name
    species
    age
    createdAt
  }
}

query {
  pet(id: "1") {
    id
    name
    species
  }
}

mutation {
  createPet(input: { name: "Michi", species: "Gato", age: 2 }) {
    id
    name
  }
}
```

Notes:

- `DateTime` is implemented with `DateTimeResolver` from `graphql-scalars` and
  is serialized as an ISO-8601 string.
- Resolvers receive the GraphQL context `MyContext` (`{ db: PrismaClient }`,
  declared in `main.ts`) and query through `context.db.pet`. They do not import
  `prisma` directly. Both `main.ts` and the Azure Functions handler supply
  `{ db: prisma }`.
- `getPets` sorts by `createdAt` descending.
- `getPet` converts `id` (GraphQL `ID`, a string) to a number and throws a
  `GraphQLError` with code `BAD_USER_INPUT` when it is not an integer.
- Resolver signatures are typed from the generated `QueryResolvers` /
  `MutationResolvers`, so run `pnpm generate` after changing the SDL.

## Local run

Standalone server (default port 5000, `PORT` variable):

```bash
pnpm dev
```

Azure Functions (the host loads `dist/`, so build first):

```bash
pnpm build
pnpm azure:start

# or build and start in one step
pnpm azure:dev
```

The HTTP function `graphql` is exposed at `POST/GET /api/graphql` with
`authLevel: "function"`. Locally, the Functions host serves it at
`http://localhost:7071/api/graphql`. The build also copies
`src/graphql/schema.graphql` to `dist/src/graphql/schema.graphql`, which is
where the handler reads it from.

`azure-functions-core-tools` is a dev dependency: on its first run it downloads
the Core Tools binary, so the first `func start` can take several minutes.

## Tests

```bash
pnpm test
```

Tests live in `tests/`. `pet.test.ts` covers the `Pet` queries and mutations
with a mocked `{ db }` context, and `azure-function.test.ts` sends a real
GraphQL request through the Functions handler.

## Deploying to Azure Functions

1. Build: `pnpm build`. This compiles to `dist/` and copies the SDL to
   `dist/src/graphql/schema.graphql`.
2. Set `DATABASE_URL` in the Function App configuration. The handler creates
   the Prisma client and exposes it to resolvers through the GraphQL context.
3. `host.json` uses version 2.0; the Node runtime is set with
   `FUNCTIONS_WORKER_RUNTIME: "node"` in `local.settings.json` (local) or in
   the application settings (Azure).
4. The function entrypoint is `dist/src/functions/graphql.js`
   (`main` field in `package.json`).
5. Make sure the deployment package includes the `dist/` output from the build
   (the Functions host loads the compiled handler and the copied SDL).

## Conventions and notes

- Relative imports use the `.ts` extension (required by TypeScript's
  `allowImportingTsExtensions` and `rewriteRelativeImportExtensions`).
- `src/generated/prisma/` is ignored by ESLint and git: do not edit it.
- `src/generated/graphql.ts` is generated by `pnpm generate`: do not edit it.
- `src/graphql/schema.ts` is a commented-out legacy `typeDefs` module; the SDL
  in `schema.graphql` is the source of truth.
- Data access goes through the GraphQL context (`context.db`), not through a
  direct `prisma` import inside resolvers.
- `dist/` and `node_modules/` are ignored.
- Code is compiled in `strict` mode with `noUnusedLocals` and
  `noUnusedParameters`.

## Known limitations

- Azure Functions loads the compiled output, so run `pnpm build` before
  `func start` or deploying; otherwise `dist/` and the copied SDL may be
  missing or stale.
- `azure-functions-core-tools` downloads the Core Tools binary on its first
  run; the first `func start` can take a while.
