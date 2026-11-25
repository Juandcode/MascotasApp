import { createServerApp } from "./src/server/app.ts";
import { loadServerConfig } from "./src/server/config.ts";
import { prisma } from "./src/server/infrastructure/prisma.ts";

const config = loadServerConfig();
const { httpServer, apolloServer } = await createServerApp();

await new Promise<void>((resolve) => {
  httpServer.listen({ port: config.port }, resolve);
});

console.log(`[startup] GraphQL server ready at http://localhost:${config.port}/graphql`);
console.log(
  `[startup] Upload endpoint ready at http://localhost:${config.port}/api/upload uploadsConfigured=${config.uploadsConfigured}`,
);

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  console.log(`[server] shutting down signal=${signal}`);
  await apolloServer.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
