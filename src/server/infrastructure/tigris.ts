import "dotenv/config";
import { put, remove } from "@tigrisdata/storage";

type TigrisConfig = {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
};

export type UploadedImage = {
  key: string;
  url: string;
  size: number;
  mimetype: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not defined`);
  }
  return value;
}

function getTigrisConfig(): TigrisConfig {
  return {
    bucket: requiredEnv("S3_BUCKET"),
    accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    endpoint: process.env.S3_ENDPOINT ?? "https://t3.storage.dev",
  };
}

export async function uploadImage(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<UploadedImage> {
  const result = await put(key, body, {
    access: "public",
    allowOverwrite: false,
    contentType,
    cacheControl: "public, max-age=31536000, immutable",
    config: getTigrisConfig(),
  });

  if (result.error) {
    throw new Error(`No se pudo subir la imagen a Tigris: ${result.error.message}`);
  }

  if (!result.data) {
    throw new Error("Tigris no devolvió los datos del objeto subido");
  }

  return {
    key: result.data.path,
    url: result.data.url,
    size: result.data.size,
    mimetype: result.data.contentType ?? contentType,
  };
}

export async function deleteImage(key: string): Promise<void> {
  const result = await remove(key, { config: getTigrisConfig() });

  if (result.error) {
    throw new Error(`No se pudo eliminar la imagen de Tigris: ${result.error.message}`);
  }
}
