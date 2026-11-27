# backendmascotas

GraphQL API for pet management. It exposes queries and mutations for lost pets
and their owners over a PostgreSQL database through Apollo Server and Prisma
ORM, and it can run both as a standalone Express server and as an Azure
Function.
The GraphQL SDL is the source of truth and TypeScript resolver types are
generated with GraphQL Code Generator.

## Stack

| Area            | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Language        | TypeScript (ESM, `NodeNext`, `strict`)                        |
| Runtime         | Node.js                                                       |
| API             | Apollo Server 5 + GraphQL 16                                  |
| HTTP server     | Express 5 + `@as-integrations/express5`                       |
| Upload parsing  | `multer` (memory storage)                                     |
| Schema / types  | GraphQL Code Generator (`typescript`, `typescript-resolvers`) |
| Scalars         | `graphql-scalars` (`DateTime`)                                |
| ORM / database  | Prisma 7 (`prisma-client`, ESM) + `@prisma/adapter-pg`        |
| Database        | PostgreSQL                                                    |
| Object storage  | Tigris (`@tigrisdata/storage`, S3-compatible)                 |
| Serverless      | Azure Functions 4 (`@azure/functions`)                        |
| Tests           | Vitest                                                        |
| Linter          | ESLint + typescript-eslint                                    |
| Package manager | pnpm 12.21.0                                                  |

## Project structure

```
backendmascotas/
├── main.ts                      # Bootstrap: config, listen, graceful shutdown
├── src/
│   ├── server/
│   │   ├── app.ts               # Express + Apollo composition (createServerApp)
│   │   ├── config.ts            # Server config validation (PORT, uploads)
│   │   ├── context.ts           # GraphQL context type (MyContext)
│   │   ├── graphql/
│   │   │   ├── schema.graphql   # GraphQL SDL (source of truth, DateTime scalar)
│   │   │   ├── schema.ts        # Legacy commented-out typeDefs (unused)
│   │   │   ├── index.ts         # Resolver map + DateTimeResolver
│   │   │   ├── loggingPlugin.ts # Apollo plugin for console/App Insights logs
│   │   │   ├── queries/PetQuery.ts  # getPets / getPet (context.db.petLost)
│   │   │   ├── queries/UserQuery.ts # getUsers / getUser (context.db.user)
│   │   │   ├── mutations/PetMutation.ts  # createLostPet (context.db.petLost)
│   │   │   └── mutations/UserMutation.ts # createUser (context.db.user)
│   │   ├── infrastructure/
│   │   │   ├── prisma.ts        # PrismaClient + pg adapter and .env loading
│   │   │   └── tigris.ts        # Tigris upload helper (S3-compatible bucket)
│   │   ├── express/
│   │   │   ├── indexs.ts        # createHttpServer: middleware, health, routes
│   │   │   └── uploads/
│   │   │       ├── imageUpload.ts   # Shared validation + Tigris upload logic
│   │   │       └── uploadRouter.ts  # Standalone POST /api/upload/:idUser/:idPet route
│   │   └── functions/
│   │       ├── index.ts         # Azure Functions entrypoint (registers both functions)
│   │       ├── handler.ts       # Loads the SDL and supplies the Prisma context
│   │       ├── graphql.ts       # HTTP function definition "graphql"
│   │       ├── uploadHandler.ts # Azure HTTP adapter for the shared upload logic
│   │       └── upload.ts        # HTTP function definition "upload"
│   └── generated/
│       ├── graphql.ts           # Schema/resolver types from codegen (committed)
│       └── prisma/              # Generated Prisma client (do not edit, gitignored)
├── prisma/
│   ├── schema.prisma            # Data model (User, PetLost, PhotoPetLost)
│   └── migrations/              # SQL migrations
├── scripts/
│   └── copy-sdl.mjs             # Copies schema.graphql into dist/ during build
├── tests/
│   ├── pet.test.ts              # Unit tests for PetLost queries/mutations
│   ├── user.test.ts             # Unit tests for user queries/mutations
│   ├── upload.test.ts           # Unit tests for the upload endpoint
│   └── azure-function.test.ts   # HTTP handler integration test
├── codegen.yml                  # GraphQL Code Generator configuration
├── host.json                    # Azure Functions configuration
├── local.settings.json          # Local Azure Functions settings (gitignored)
├── prisma7.config.ts            # Prisma 7 config (schema, migrations, datasource)
├── tsconfig.json
├── eslint.config.js
├── .prettierrc.json             # Prettier configuration
└── pnpm-workspace.yaml          # allowBuilds for dependency scripts
```

## Requirements

- Node.js (a version compatible with ESM and `@types/node` 26.x)
- pnpm 12.21.0 (`corepack` or `npm i -g pnpm@12.21.0`)
- PostgreSQL reachable through `DATABASE_URL`
- Tigris bucket credentials for the upload endpoint (`S3_*` variables)

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
must be regenerated after editing `src/server/graphql/schema.graphql`:

```bash
pnpm generate
```

## Code generation

There are two independent generation steps:

| Source                              | Command                | Output                     |
| ----------------------------------- | ---------------------- | -------------------------- |
| `prisma/schema.prisma`              | `pnpm prisma:generate` | `src/generated/prisma/`    |
| `src/server/graphql/schema.graphql` | `pnpm generate`        | `src/generated/graphql.ts` |

`codegen.yml` configures GraphQL Code Generator to:

- generate schema and resolver types with `typescript` and
  `typescript-resolvers`;
- use `MyContext` (from `src/server/context.ts`) as the resolver context type;
- map the GraphQL `PetLost` and `User` types to the Prisma `PetLost` and
  `User` models;
- map the `DateTime` scalar to JavaScript `Date`.

Do not edit files under `src/generated/` by hand. The Prisma client is
gitignored; the generated GraphQL types are committed so a clean checkout can
typecheck without running codegen.

## Environment variables

Create a `.env` file at the repository root (it is not committed):

```env
DATABASE_URL=postgres://usuario:password@host:5432/mascotas?sslmode=require

S3_ENDPOINT=https://t3.storage.dev
S3_BUCKET=tu-bucket
S3_ACCESS_KEY_ID=tu-access-key
S3_SECRET_ACCESS_KEY=tu-secret-key
```

- `src/server/infrastructure/prisma.ts` throws if `DATABASE_URL` is not set.
- `prisma7.config.ts` reads `DATABASE_URL` through `env()` and is loaded
  automatically by Prisma.
- `src/server/infrastructure/tigris.ts` reads the `S3_*` variables lazily. `S3_ENDPOINT` defaults to
  `https://t3.storage.dev`; the bucket and credentials are required for the
  upload endpoint.
- `APPLICATIONINSIGHTS_CONNECTION_STRING` is optional. When set in Azure
  Functions, the host forwards `console.log`/`console.error` output to
  Application Insights; no SDK is required in this project.
- To run Azure Functions locally, `local.settings.json` must include the same
  variables inside `Values`. This file is in `.gitignore` because it can
  contain credentials.

## Scripts

| Script                 | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `pnpm build`           | Compiles TypeScript to `dist/` and copies the SDL            |
| `pnpm dev`             | Standalone server with reload (`tsx watch main.ts`)          |
| `pnpm start`           | Runs the compiled build (`node dist/main.js`)                |
| `pnpm start:ts`        | Standalone server directly with `tsx`                        |
| `pnpm typecheck`       | `tsc --noEmit`                                               |
| `pnpm lint`            | `eslint .`                                                   |
| `pnpm format`          | Formats the code with Prettier                               |
| `pnpm test`            | Vitest, single run                                           |
| `pnpm test:watch`      | Vitest in watch mode                                         |
| `pnpm prisma:generate` | Generates the Prisma client                                  |
| `pnpm prisma:migrate`  | Creates and applies migrations in development                |
| `pnpm prisma:studio`   | Opens Prisma Studio                                          |
| `pnpm generate`        | Runs GraphQL Code Generator (`gql-gen --config codegen.yml`) |
| `pnpm azure:start`     | Starts Azure Functions Core Tools (`func start`)             |
| `pnpm azure:dev`       | Builds and starts Azure Functions                            |

## Database

Current model in `prisma/schema.prisma`:

```prisma
model User {
  id   String    @id @default(uuid())
  name String
  pets PetLost[]
}

model PetLost {
  id        String         @id @default(uuid())
  name      String
  contact   String?
  color     String?
  race      String?
  state     String         @default("perdido")
  createdAt DateTime       @default(now()) @map("created_at")
  photos    PhotoPetLost[]
  userId    String
  user      User           @relation(fields: [userId], references: [id])
}

model PhotoPetLost {
  id        String                      @id @default(uuid())
  petId     String                      @map("pet_id")
  pet       PetLost                     @relation(fields: [petId], references: [id], onDelete: Cascade)
  url       String
  embedding Unsupported("vector(768)")?
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

The SDL lives in `src/server/graphql/schema.graphql`:

```graphql
scalar DateTime

type User {
  id: ID!
  name: String!
  pets: [PetLost!]!
}

type PetLost {
  id: ID!
  name: String!
  contact: String
  color: String
  race: String
  state: String!
  createdAt: DateTime!
  photos: [PhotoPetLost!]!
  userId: String!
  user: User!
}

type PhotoPetLost {
  id: ID!
  petId: String!
  pet: PetLost!
  url: String!
}

input CreateLostPetInput {
  name: String!
  contact: String
  color: String
  race: String
  userId: String!
}

input CreateUserInput {
  name: String!
}

type Query {
  pets: [PetLost!]!
  pet(id: ID!): PetLost
  users: [User!]!
  user(id: ID!): User
}

type Mutation {
  createLostPet(input: CreateLostPetInput!): PetLost!
  createUser(input: CreateUserInput!): User!
}
```

Examples:

```graphql
query {
  pets {
    id
    name
    state
    createdAt
    photos {
      url
    }
  }
}

query {
  pet(id: "<uuid>") {
    id
    name
    state
    photos {
      url
    }
  }
}

mutation {
  createLostPet(
    input: { name: "Michi", contact: "+52...", color: "negro", race: "gato", userId: "<uuid>" }
  ) {
    id
    name
    state
  }
}
```

Notes:

- `DateTime` is implemented with `DateTimeResolver` from `graphql-scalars` and
  is serialized as an ISO-8601 string.
- Resolvers receive the GraphQL context `MyContext` (`{ db: PrismaClient }`,
  declared in `src/server/context.ts`) and query through `context.db.petLost`
  or `context.db.user`. They do not import `prisma` directly. Both
  `src/server/app.ts` and the Azure Functions handler supply `{ db: prisma }`.
- `getPets` sorts by `createdAt` descending and includes each pet's user.
- `getPet` validates `id` as a UUID and throws a `GraphQLError` with code
  `BAD_USER_INPUT` when it is not valid.
- `getUsers` sorts by name ascending and includes each user's pets; `getUser`
  looks users up by their UUID.
- `PetLost.state` defaults to `"perdido"`; `PetLost.userId` and `PetLost.user`
  are required.
- `PhotoPetLost` exposes only `id`, `petId`, `pet`, and `url`; the internal
  `embedding` (vector) column is not exposed in GraphQL.
- Resolver signatures are typed from the generated `QueryResolvers` /
  `MutationResolvers`, so run `pnpm generate` after changing the SDL.

## File uploads

Uploads are handled out-of-band from GraphQL, the approach Apollo recommends.
The Azure Functions integration only parses JSON bodies, so a GraphQL `Upload`
scalar would not reach the server; instead there is a dedicated HTTP endpoint
on both the standalone Express server and the Azure Functions host.

`POST /api/upload/:idUser/:idPet` (`multipart/form-data`; `authLevel: "function"` in Azure):

- Route parameters `idUser` and `idPet` must be valid UUIDs. Both are validated
  by both transports; the image is not persisted in PostgreSQL yet.
- Field name: `file`.
- Allowed image types: JPEG, PNG, GIF, and WebP. The declared MIME type must
  match the file signature (magic bytes).
- Maximum size: 15 MB (`15 * 1024 * 1024`).
- Files are uploaded to the configured Tigris bucket with the key
  `uploads/<idUser>/<idPet>/<YYYY-MM-DD>_<uuid>.<ext>` using
  `@tigrisdata/storage`; the date comes before the generated id.
- Objects are uploaded with public access and a one-year immutable
  `Cache-Control`; the response includes the public `url`.
- Credentials come from `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`, and `S3_ENDPOINT` (see
  [Environment variables](#environment-variables)).
- Validation lives in `src/server/express/uploads/imageUpload.ts` and is shared
  by the standalone Express route (`uploadRouter.ts`) and the Azure Functions
  adapter.

Standalone server:

```bash
curl -X POST "http://localhost:5000/api/upload/<user-uuid>/<pet-uuid>" \
  -F "file=@mascota.png"
```

Azure Functions:

```bash
curl -X POST "http://localhost:7071/api/upload/<user-uuid>/<pet-uuid>?code=<function-key>" \
  -F "file=@mascota.png"
```

Successful response (`201`):

```json
{
  "filename": "2026-11-26_259ee0dd-67ce-4750-a786-b22b5b5012c8.png",
  "key": "uploads/8f1f0b18-6b33-4a1e-9b23-7a9f1a0f0f0f/1b7c2d34-5e6f-4a8b-9c0d-1e2f3a4b5c6d/2026-11-26_259ee0dd-67ce-4750-a786-b22b5b5012c8.png",
  "url": "https://<bucket>.t3.storage.dev/uploads/8f1f0b18-6b33-4a1e-9b23-7a9f1a0f0f0f/1b7c2d34-5e6f-4a8b-9c0d-1e2f3a4b5c6d/2026-11-26_259ee0dd-67ce-4750-a786-b22b5b5012c8.png",
  "size": 1024,
  "mimetype": "image/png"
}
```

Invalid requests return `400` with `{ "error": "..." }` for a missing file,
non-image or spoofed content, or a file over 15 MB. Storage failures return
`500` with a generic message; the underlying error is logged server-side.

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
`src/server/graphql/schema.graphql` to
`dist/src/server/graphql/schema.graphql`, which is where the handler reads it
from.

The standalone server exposes GraphQL on any path (including `/graphql`) and
the upload route at `POST /api/upload/:idUser/:idPet`. It also exposes `GET /health` for
readiness checks. `main.ts` only bootstraps the process; `src/server/app.ts`
composes Express, Apollo, middleware, and routes.

### Logs and Application Insights

The standalone server and the Azure Functions handlers log with
`console.log`/`console.error` using prefixes such as `[http]`, `[graphql]`,
`[upload]`, and `[startup]`. In Azure Functions, set
`APPLICATIONINSIGHTS_CONNECTION_STRING` in the Function App settings and the
host will send those logs to Application Insights. No extra SDK or code is
required.

Logs include request method/path, operation names, durations, invocation IDs,
upload key/size/MIME type, and error summaries. They never include credentials
or file contents.

`azure-functions-core-tools` is a dev dependency: on its first run it downloads
the Core Tools binary, so the first `func start` can take several minutes.

## Tests

```bash
pnpm test
```

Tests live in `tests/`. `pet.test.ts` and `user.test.ts` cover the `PetLost` and
`User` queries and mutations with a mocked `{ db }` context, `upload.test.ts`
covers image validation, storage, and the standalone Express route with a
mocked `@tigrisdata/storage` client, and `azure-function.test.ts` sends a real
GraphQL request through the Functions handler.

## Deploying to Azure Functions

1. Build: `pnpm build`. This compiles to `dist/` and copies the SDL to
   `dist/src/server/graphql/schema.graphql`.
2. Set `DATABASE_URL`, the `S3_*` variables, and (optionally)
   `APPLICATIONINSIGHTS_CONNECTION_STRING` in the Function App configuration.
   The handler creates the Prisma client and exposes it to resolvers through
   the GraphQL context; the upload endpoint uses Tigris.
3. `host.json` uses version 2.0; the Node runtime is set with
   `FUNCTIONS_WORKER_RUNTIME: "node"` in `local.settings.json` (local) or in
   the application settings (Azure).
4. The function entrypoint is `dist/src/server/functions/index.js`
   (`main` field in `package.json`). It imports and registers both the
   `graphql` and `upload` functions.
5. Make sure the deployment package includes the `dist/` output from the build
   (the Functions host loads the compiled handler and the copied SDL).

## Conventions and notes

- Relative imports use the `.ts` extension (required by TypeScript's
  `allowImportingTsExtensions` and `rewriteRelativeImportExtensions`).
- `src/generated/prisma/` is ignored by ESLint and git: do not edit it.
- `src/generated/graphql.ts` is generated by `pnpm generate`: do not edit it.
- `src/server/graphql/schema.ts` is a commented-out legacy `typeDefs` module; the SDL
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
- Uploads require network access to Tigris and valid `S3_*` credentials; a
  missing variable or storage error makes `POST /api/upload/:idUser/:idPet` return `500`.
- Objects are uploaded as public by default. If the bucket policy forbids
  public access, adjust `src/server/infrastructure/tigris.ts` and serve private
  objects with signed URLs instead.
- The upload endpoint does not persist rows in PostgreSQL yet: it only stores
  the object in Tigris and returns its URL. `PhotoPetLost` already has `url`
  (and an internal `embedding`), but no GraphQL mutation creates photo records.
- `azure-functions-core-tools` downloads the Core Tools binary on its first
  run; the first `func start` can take a while.
