import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpResponseInit } from "@azure/functions";
import express from "express";
import { createServer } from "node:http";

const { put } = vi.hoisted(() => {
  process.env.S3_BUCKET = "test-bucket";
  process.env.S3_ACCESS_KEY_ID = "test-access-key";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.S3_ENDPOINT = "https://t3.storage.dev";

  return { put: vi.fn() };
});

vi.mock("@tigrisdata/storage", () => ({ put }));

import { MAX_FILE_SIZE_BYTES } from "../src/server/uploads/imageUpload.ts";
import { uploadHandler } from "../src/server/functions/uploadHandler.ts";
import { uploadRouter } from "../src/server/uploads/uploadRouter.ts";

type UploadResponse = {
  filename: string;
  key: string;
  url: string;
  size: number;
  mimetype: string;
  error?: string;
};

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const context = { error: vi.fn() } as never;

function uploadRequest(file?: File): Request {
  const form = new FormData();
  if (file) {
    form.append("file", file);
  }

  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: form,
  });
}

async function startStandaloneUploadServer(): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const app = express();
  app.use("/api/upload", uploadRouter);
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("No se pudo obtener el puerto del servidor de prueba");
  }

  return {
    url: `http://127.0.0.1:${address.port}/api/upload`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }),
  };
}

beforeEach(() => {
  put.mockReset();
  put.mockImplementation(
    async (key: string, body: Buffer, options?: { contentType?: string }) => ({
      data: {
        path: key,
        url: `https://test-bucket.t3.storage.dev/${key}`,
        size: body.length,
        contentType: options?.contentType,
      },
    }),
  );
});

describe("upload handler", () => {
  it("sube una imagen válida a Tigris y devuelve sus metadatos", async () => {
    const file = new File([PNG_BYTES], "mascota.png", { type: "image/png" });

    const response = (await uploadHandler(
      uploadRequest(file) as never,
      context,
    )) as HttpResponseInit;
    const body = response.jsonBody as UploadResponse;

    expect(response.status).toBe(201);
    expect(body.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(body.key).toBe(`uploads/${body.filename}`);
    expect(body.url).toBe(`https://test-bucket.t3.storage.dev/uploads/${body.filename}`);
    expect(body.size).toBe(PNG_BYTES.length);
    expect(body.mimetype).toBe("image/png");

    expect(put).toHaveBeenCalledTimes(1);
    const [key, uploadedBuffer, options] = put.mock.calls[0] ?? [];
    expect(key).toBe(`uploads/${body.filename}`);
    expect(Buffer.isBuffer(uploadedBuffer)).toBe(true);
    expect(options).toMatchObject({
      access: "public",
      contentType: "image/png",
      config: {
        bucket: "test-bucket",
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
        endpoint: "https://t3.storage.dev",
      },
    });
  });

  it("sube una imagen válida por el servidor standalone", async () => {
    const standalone = await startStandaloneUploadServer();

    try {
      const form = new FormData();
      form.append("file", new File([PNG_BYTES], "mascota.png", { type: "image/png" }));

      const response = await fetch(standalone.url, {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as UploadResponse;

      expect(response.status).toBe(201);
      expect(body.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
      expect(body.key).toBe(`uploads/${body.filename}`);
      expect(body.url).toBe(`https://test-bucket.t3.storage.dev/uploads/${body.filename}`);
      expect(put).toHaveBeenCalledTimes(1);
    } finally {
      await standalone.close();
    }
  });

  it("rechaza archivos que no son imágenes sin subirlos", async () => {
    const file = new File([new TextEncoder().encode("no soy una imagen")], "nota.txt", {
      type: "text/plain",
    });

    const response = (await uploadHandler(
      uploadRequest(file) as never,
      context,
    )) as HttpResponseInit;

    expect(response.status).toBe(400);
    expect((response.jsonBody as UploadResponse).error).toMatch(/imágenes/i);
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza archivos cuyo contenido no coincide con el tipo declarado", async () => {
    const file = new File([new TextEncoder().encode("contenido falso")], "falsa.png", {
      type: "image/png",
    });

    const response = (await uploadHandler(
      uploadRequest(file) as never,
      context,
    )) as HttpResponseInit;

    expect(response.status).toBe(400);
    expect((response.jsonBody as UploadResponse).error).toMatch(/imagen válida/i);
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza archivos mayores a 15 MB sin subirlos", async () => {
    const file = new File(
      [new Uint8Array(MAX_FILE_SIZE_BYTES + 1)],
      "grande.png",
      { type: "image/png" },
    );

    const response = (await uploadHandler(
      uploadRequest(file) as never,
      context,
    )) as HttpResponseInit;

    expect(response.status).toBe(400);
    expect((response.jsonBody as UploadResponse).error).toMatch(/15 MB/);
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza solicitudes sin archivo", async () => {
    const response = (await uploadHandler(
      uploadRequest() as never,
      context,
    )) as HttpResponseInit;

    expect(response.status).toBe(400);
    expect((response.jsonBody as UploadResponse).error).toMatch(/campo "file"/);
    expect(put).not.toHaveBeenCalled();
  });

  it("responde 500 sin exponer detalles si Tigris falla", async () => {
    put.mockResolvedValueOnce({ error: new Error("fallo interno del bucket") });
    const file = new File([PNG_BYTES], "mascota.png", { type: "image/png" });

    const response = (await uploadHandler(
      uploadRequest(file) as never,
      context,
    )) as HttpResponseInit;

    expect(response.status).toBe(500);
    expect((response.jsonBody as UploadResponse).error).toBe("No se pudo guardar el archivo");
    expect(JSON.stringify(response.jsonBody)).not.toContain("fallo interno");
  });
});
