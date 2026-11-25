import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(rootDir, "src", "server", "graphql", "schema.graphql");
const target = join(rootDir, "dist", "src", "server", "graphql", "schema.graphql");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
