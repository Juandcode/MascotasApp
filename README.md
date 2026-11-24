# backendmascotas

GraphQL API for pet management. It exposes queries and mutations over a
PostgreSQL database through Apollo Server and Prisma ORM, and it can run both
as a standalone Node server and as an Azure Function.

## Stack

| Area             | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Language         | TypeScript (ESM, `NodeNext`, `strict`)                  |
| Runtime          | Node.js                                                 |
| API              | Apollo Server 5 + GraphQL 16                            |
| ORM / database   | Prisma 7 (`prisma-client`, ESM) + `@prisma/adapter-pg` |
| Database         | PostgreSQL                                              |
| Serverless       | Azure Functions 4 (`@azure/functions`)                  |
| Tests            | Vitest                                                  |
| Linter           | ESLint + typescript-eslint                              |
| Package manager  | pnpm 12.21.0                                            |

## Project structure

```
backendmascotas/
├── main.ts                      # Standalone Apollo server (local development)
├── lib/
│   └── prisma.ts                # Prisma client with the pg adapter and .env loading
├── src/
│   ├── graphql/
│   │   ├── schema.ts            # GraphQL typeDefs (Pet model)
│   │   ├── index.ts             # Resolvers (Query/Mutation)
│   │   ├── queries/PetQuery.ts  # getPets / getPet
│   │   └── mutations/PetMutation.ts  # createPet
│   ├── functions/
│   │   ├── handler.ts           # Apollo Server + Azure Functions integration
│   │   └── graphql.ts           # HTTP function definition "graphql"
│   └── generated/prisma/        # Generated Prisma client (do not edit, gitignored)
├── prisma/
│   ├── schema.prisma            # Data model (Pet)
│   └── migrations/              # SQL migrations
├── tests/
│   ├── pet.test.ts              # Unit tests for queries/mutations (mocked delegate)
│   └── azure-function.test.ts   # HTTP handler integration test
├── host.json                    # Azure Functions configuration
├── local.settings.json          # Local Azure Functions settings (gitignored)
├── prisma7.config.ts            # Prisma 7 configuration
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

## Environment variables

Create a `.env` file at the repository root (it is not committed):

```env
DATABASE_URL=postgres://usuario:password@host:5432/mascotas?sslmode=require
```

- `lib/prisma.ts` throws if `DATABASE_URL` is not set.
- To run Azure Functions locally, `local.settings.json` must include
  `DATABASE_URL` inside `Values`. This file is in `.gitignore` because it can
  contain credentials.

## Scripts

| Script                  | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `pnpm build`            | Compiles TypeScript to `dist/`                          |
| `pnpm dev`              | Standalone server with reload (`tsx watch main.ts`)    |
| `pnpm start`            | Runs the compiled build (`node dist/main.js`)           |
| `pnpm start:ts`         | Standalone server directly with `tsx`                   |
| `pnpm typecheck`        | `tsc --noEmit`                                          |
| `pnpm lint`             | `eslint .`                                              |
| `pnpm test`             | Vitest, single run                                      |
| `pnpm test:watch`       | Vitest in watch mode                                    |
| `pnpm prisma:generate`  | Generates the Prisma client                             |
| `pnpm prisma:migrate`   | Creates and applies migrations in development           |
| `pnpm prisma:studio`    | Opens Prisma Studio                                     |
| `pnpm azure:start`      | Starts Azure Functions Core Tools (`func start`)        |
| `pnpm azure:dev`        | Builds and starts Azure Functions                       |

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

Typical flow:

```bash
pnpm prisma:migrate   # creates and applies the migration
pnpm prisma:generate  # regenerates the client
```

## GraphQL API

Schema (`src/graphql/schema.ts`):

```graphql
type Pet {
  id: ID!
  name: String!
  species: String!
  age: Int
  createdAt: String!
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

- `getPets` sorts by `createdAt` descending.
- `getPet` receives `id` as a string (GraphQL `ID`) and converts it to a number.

## Local run

Standalone server (default port 5000, `PORT` variable):

```bash
pnpm dev
```

Azure Functions:

```bash
pnpm azure:start
```

The HTTP function `graphql` is exposed at `POST/GET /api/graphql` with
`authLevel: "function"`. Locally, the Functions host serves it at
`http://localhost:7071/api/graphql`.

`azure-functions-core-tools` is a dev dependency: on its first run it downloads
the Core Tools binary, so the first `func start` can take several minutes.

## Tests

```bash
pnpm test
```

Tests cover the `Pet` queries and mutations using a mocked Prisma delegate, and
the Azure Functions handler with a real GraphQL request.

## Deploying to Azure Functions

1. Build: `pnpm build`.
2. Set `DATABASE_URL` in the Function App configuration.
3. `host.json` uses version 2.0; the Node runtime is set with
   `FUNCTIONS_WORKER_RUNTIME: "node"` in `local.settings.json` (local) or in
   the application settings (Azure).
4. The function entrypoint is `dist/src/functions/graphql.js`
   (`main` field in `package.json`).

## Conventions and notes

- Relative imports use the `.ts` extension (required by TypeScript's
  `allowImportingTsExtensions` and `rewriteRelativeImportExtensions`).
- `src/generated/prisma/` is ignored by ESLint and git: do not edit it.
- `dist/` and `node_modules/` are ignored.
- Code is compiled in `strict` mode with `noUnusedLocals` and
  `noUnusedParameters`.

## Known limitations

- `dist/` contains leftover duplicate artifacts (`dist/graphql` and
  `dist/src/graphql`) from earlier configurations; they are regenerated by
  `pnpm build`.
- `azure-functions-core-tools` downloads the Core Tools binary on its first
  run; the first `func start` can take a while.
