import { randomUUID } from "node:crypto";
import type { HttpHandler, HttpResponseInit } from "@azure/functions";
import { uploadImage } from "../../lib/tigris.ts";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const MAX_REQUEST_SIZE_BYTES = MAX_FILE_SIZE_BYTES + 1024 * 1024;
const UPLOAD_FIELD = "file";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

function badRequest(error: string): HttpResponseInit {
  return { status: 400, jsonBody: { error } };
}

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function sniffImageMimeType(buffer: Buffer): string | undefined {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return "image/png";
  }

  const header = buffer.subarray(0, 6).toString("ascii");
  if (header === "GIF87a" || header === "GIF89a") {
    return "image/gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return undefined;
}

export const uploadHandler: HttpHandler = async (request, context) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return badRequest("El Content-Type debe ser multipart/form-data");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE_BYTES) {
    return badRequest("El archivo supera el máximo de 15 MB");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Formulario multipart inválido");
  }

  const file = formData.get(UPLOAD_FIELD);
  if (!isFile(file)) {
    return badRequest(`Debes enviar un archivo en el campo "${UPLOAD_FIELD}"`);
  }

  if (file.size === 0) {
    return badRequest("El archivo está vacío");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return badRequest("El archivo supera el máximo de 15 MB");
  }

  const declaredMimeType = file.type.toLowerCase().replace("image/jpg", "image/jpeg");
  const extension = IMAGE_EXTENSIONS[declaredMimeType];
  if (!extension) {
    return badRequest("Solo se permiten imágenes JPEG, PNG, GIF o WebP");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (sniffImageMimeType(buffer) !== declaredMimeType) {
    return badRequest("El contenido del archivo no corresponde a una imagen válida");
  }

  const filename = `${randomUUID()}${extension}`;

  try {
    const uploaded = await uploadImage(`uploads/${filename}`, buffer, declaredMimeType);

    return {
      status: 201,
      jsonBody: {
        filename,
        key: uploaded.key,
        url: uploaded.url,
        size: uploaded.size,
        mimetype: uploaded.mimetype,
      },
    };
  } catch (error) {
    context.error("No se pudo subir la imagen a Tigris", error);
    return { status: 500, jsonBody: { error: "No se pudo guardar el archivo" } };
  }
};
