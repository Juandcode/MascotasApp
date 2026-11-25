export type ServerConfig = {
  port: number;
  uploadsConfigured: boolean;
};

export function loadServerConfig(): ServerConfig {
  const port = Number(process.env.PORT ?? 5000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return {
    port,
    uploadsConfigured: Boolean(
      process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY,
    ),
  };
}
