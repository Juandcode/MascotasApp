import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpResponseInit } from "@azure/functions";

const { put } = vi.hoisted(() => {
  process.env.S3_BUCKET = "test-bucket";
  process.env.S3_ACCESS_KEY_ID = "test-access-key";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.S3_ENDPOINT = "https://t3.storage.dev";

  return { put: vi.fn() };
});

vi.mock("@tigrisdata/storage", () => ({ put }));

import { MAX_FILE_SIZE_BYTES, uploadHandler } from "../src/functions/uploadHandler.ts";

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
