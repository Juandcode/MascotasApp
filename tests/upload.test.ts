import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpResponseInit } from "@azure/functions";
import express from "express";
import { createServer } from "node:http";

const { put, remove, createPhotoLostPet } = vi.hoisted(() => {
  process.env.S3_BUCKET = "test-bucket";
  process.env.S3_ACCESS_KEY_ID = "test-access-key";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.S3_ENDPOINT = "https://t3.storage.dev";
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";

  return { put: vi.fn(), remove: vi.fn(), createPhotoLostPet: vi.fn() };
});

vi.mock("@tigrisdata/storage", () => ({ put, remove }));
vi.mock("../src/server/services/photoPetLost.ts", () => ({ createPhotoLostPet }));

import { MAX_FILE_SIZE_BYTES } from "../src/server/express/uploads/imageUpload.ts";
import { uploadHandler } from "../src/server/functions/uploadHandler.ts";
import { uploadRouter } from "../src/server/express/uploads/uploadRouter.ts";

type UploadResponse = {
  filename: string;
  key: string;
  url: string;
  size: number;
  mimetype: string;
  error?: string;
};

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const USER_ID = "8f1f0b18-6b33-4a1e-9b23-7a9f1a0f0f0f";
const PET_ID = "1b7c2d34-5e6f-4a8b-9c0d-1e2f3a4b5c6d";

const context = { error: vi.fn() } as never;

function uploadRequest(file?: File): Request {
  const form = new FormData();
  if (file) {
    form.append("file", file);
  }

  const request = new Request(`http://localhost/api/upload/${USER_ID}/${PET_ID}`, {
    method: "POST",
    body: form,
  });

  return Object.assign(request, { params: { idUser: USER_ID, idPet: PET_ID } });
}

async function startStandaloneUploadServer(): Promise<{
  baseUrl: string;
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
    baseUrl: `http://127.0.0.1:${address.port}/api/upload`,
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
  remove.mockReset();
  createPhotoLostPet.mockReset();
  createPhotoLostPet.mockResolvedValue({
    ok: true,
    photo: { id: "photo-id", petId: PET_ID, key: "photo-key", url: "https://photo" },
  });
  put.mockImplementation(async (key: string, body: Buffer, options?: { contentType?: string }) => ({
    data: {
      path: key,
      url: `https://test-bucket.t3.storage.dev/${key}`,
      size: body.length,
      contentType: options?.contentType,
    },
  }));
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
    expect(body.filename).toMatch(/^\d{4}-\d{2}-\d{2}_[0-9a-f-]{36}\.png$/);
    expect(body.key).toBe(`uploads/${USER_ID}/${PET_ID}/${body.filename}`);
    expect(body.url).toBe(
      `https://test-bucket.t3.storage.dev/uploads/${USER_ID}/${PET_ID}/${body.filename}`,
    );
    expect(body.size).toBe(PNG_BYTES.length);
    expect(body.mimetype).toBe("image/png");

    expect(put).toHaveBeenCalledTimes(1);
    const [key, uploadedBuffer, options] = put.mock.calls[0] ?? [];
    expect(key).toBe(`uploads/${USER_ID}/${PET_ID}/${body.filename}`);
    expect(createPhotoLostPet).toHaveBeenCalledWith(expect.anything(), {
      key: `uploads/${USER_ID}/${PET_ID}/${body.filename}`,
      url: `https://test-bucket.t3.storage.dev/uploads/${USER_ID}/${PET_ID}/${body.filename}`,
      petId: PET_ID,
      idUser: USER_ID,
    });
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

      const response = await fetch(`${standalone.baseUrl}/${USER_ID}/${PET_ID}`, {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as UploadResponse;

      expect(response.status).toBe(201);
      expect(body.filename).toMatch(/^\d{4}-\d{2}-\d{2}_[0-9a-f-]{36}\.png$/);
      expect(body.key).toBe(`uploads/${USER_ID}/${PET_ID}/${body.filename}`);
      expect(body.url).toBe(
        `https://test-bucket.t3.storage.dev/uploads/${USER_ID}/${PET_ID}/${body.filename}`,
      );
      expect(put).toHaveBeenCalledTimes(1);
      expect(createPhotoLostPet).toHaveBeenCalledWith(expect.anything(), {
        key: `uploads/${USER_ID}/${PET_ID}/${body.filename}`,
        url: `https://test-bucket.t3.storage.dev/uploads/${USER_ID}/${PET_ID}/${body.filename}`,
        petId: PET_ID,
        idUser: USER_ID,
      });
    } finally {
      await standalone.close();
    }
  });

  it("elimina el objeto si la mascota no pertenece al usuario", async () => {
    createPhotoLostPet.mockResolvedValueOnce({
      ok: false,
      status: 400,
      error: "La mascota no pertenece al usuario",
    });
    const file = new File([PNG_BYTES], "mascota.png", { type: "image/png" });

    const response = (await uploadHandler(
      uploadRequest(file) as never,
      context,
    )) as HttpResponseInit;

    expect(response.status).toBe(400);
    expect((response.jsonBody as UploadResponse).error).toMatch(/no pertenece/i);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("responde 500 y elimina el objeto si falla la persistencia", async () => {
    createPhotoLostPet.mockRejectedValueOnce(new Error("db caída"));
    const file = new File([PNG_BYTES], "mascota.png", { type: "image/png" });

    const response = (await uploadHandler(
      uploadRequest(file) as never,
      context,
    )) as HttpResponseInit;

    expect(response.status).toBe(500);
    expect((response.jsonBody as UploadResponse).error).toBe("No se pudo guardar el archivo");
    expect(JSON.stringify(response.jsonBody)).not.toContain("db caída");
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("rechaza un id de usuario inválido en el handler de Azure", async () => {
    const form = new FormData();
    form.append("file", new File([PNG_BYTES], "mascota.png", { type: "image/png" }));
    const request = Object.assign(
      new Request(`http://localhost/api/upload/123/${PET_ID}`, { method: "POST", body: form }),
      { params: { idUser: "123", idPet: PET_ID } },
    );

    const response = (await uploadHandler(request as never, context)) as HttpResponseInit;

    expect(response.status).toBe(400);
    expect((response.jsonBody as UploadResponse).error).toMatch(/id de usuario/i);
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza un id de mascota inválido en el handler de Azure", async () => {
    const form = new FormData();
    form.append("file", new File([PNG_BYTES], "mascota.png", { type: "image/png" }));
    const request = Object.assign(
      new Request(`http://localhost/api/upload/${USER_ID}/123`, { method: "POST", body: form }),
      { params: { idUser: USER_ID, idPet: "123" } },
    );

    const response = (await uploadHandler(request as never, context)) as HttpResponseInit;

    expect(response.status).toBe(400);
    expect((response.jsonBody as UploadResponse).error).toMatch(/id de mascota/i);
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza un id de usuario inválido en el servidor standalone", async () => {
    const standalone = await startStandaloneUploadServer();

    try {
      const form = new FormData();
      form.append("file", new File([PNG_BYTES], "mascota.png", { type: "image/png" }));

      const response = await fetch(`${standalone.baseUrl}/123/${PET_ID}`, {
        method: "POST",
        body: form,
      });

      expect(response.status).toBe(400);
      expect(((await response.json()) as UploadResponse).error).toMatch(/id de usuario/i);
      expect(put).not.toHaveBeenCalled();
    } finally {
      await standalone.close();
    }
  });

  it("rechaza un id de mascota inválido en el servidor standalone", async () => {
    const standalone = await startStandaloneUploadServer();

    try {
      const form = new FormData();
      form.append("file", new File([PNG_BYTES], "mascota.png", { type: "image/png" }));

      const response = await fetch(`${standalone.baseUrl}/${USER_ID}/123`, {
        method: "POST",
        body: form,
      });

      expect(response.status).toBe(400);
      expect(((await response.json()) as UploadResponse).error).toMatch(/id de mascota/i);
      expect(put).not.toHaveBeenCalled();
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
    const file = new File([new Uint8Array(MAX_FILE_SIZE_BYTES + 1)], "grande.png", {
      type: "image/png",
    });

    const response = (await uploadHandler(
      uploadRequest(file) as never,
      context,
    )) as HttpResponseInit;

    expect(response.status).toBe(400);
    expect((response.jsonBody as UploadResponse).error).toMatch(/15 MB/);
    expect(put).not.toHaveBeenCalled();
  });

  it("rechaza solicitudes sin archivo", async () => {
    const response = (await uploadHandler(uploadRequest() as never, context)) as HttpResponseInit;

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
