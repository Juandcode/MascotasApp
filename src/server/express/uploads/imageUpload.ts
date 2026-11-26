import { randomUUID } from "node:crypto";
import { uploadImage } from "../../infrastructure/tigris.ts";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_REQUEST_SIZE_BYTES = MAX_FILE_SIZE_BYTES + 1024 * 1024;
export const UPLOAD_FIELD = "file";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export type ImageUploadInput = {
  buffer: Buffer;
  mimetype: string;
};

export type UploadedImageMetadata = {
  filename: string;
  key: string;
  url: string;
  size: number;
  mimetype: string;
};

export type ImageUploadResult =
  | { ok: true; status: 201; body: UploadedImageMetadata }
  | { ok: false; status: 400 | 500; error: string };

function sniffImageMimeType(buffer: Buffer): string | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
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

function validateImageInput(
  input: ImageUploadInput,
): { ok: true; mimetype: string; extension: string } | { ok: false; error: string } {
  if (input.buffer.length === 0) {
    return { ok: false, error: "El archivo está vacío" };
  }

  if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "El archivo supera el máximo de 15 MB" };
  }

  const declaredMimeType = input.mimetype.toLowerCase().replace("image/jpg", "image/jpeg");
  const extension = IMAGE_EXTENSIONS[declaredMimeType];
  if (!extension) {
    return { ok: false, error: "Solo se permiten imágenes JPEG, PNG, GIF o WebP" };
  }

  if (sniffImageMimeType(input.buffer) !== declaredMimeType) {
    return { ok: false, error: "El contenido del archivo no corresponde a una imagen válida" };
  }

  return { ok: true, mimetype: declaredMimeType, extension };
}

export async function processImageUpload(input: ImageUploadInput): Promise<ImageUploadResult> {
  const validation = validateImageInput(input);
  if (!validation.ok) {
    console.log(
      `[upload] rejected size=${input.buffer.length} mimetype=${input.mimetype || "unknown"} reason=${validation.error}`,
    );
    return { ok: false, status: 400, error: validation.error };
  }

  const filename = `${randomUUID()}${validation.extension}`;
  const key = `uploads/${filename}`;
  const startedAt = Date.now();

  console.log(
    `[upload] start key=${key} size=${input.buffer.length} mimetype=${validation.mimetype}`,
  );

  try {
    const uploaded = await uploadImage(key, input.buffer, validation.mimetype);

    console.log(
      `[upload] success key=${uploaded.key} size=${uploaded.size} mimetype=${uploaded.mimetype} durationMs=${Date.now() - startedAt}`,
    );

    return {
      ok: true,
      status: 201,
      body: {
        filename,
        key: uploaded.key,
        url: uploaded.url,
        size: uploaded.size,
        mimetype: uploaded.mimetype,
      },
    };
  } catch (error) {
    console.error(
      `[upload] failure key=${key} size=${input.buffer.length} mimetype=${validation.mimetype} durationMs=${Date.now() - startedAt}`,
      error,
    );

    return { ok: false, status: 500, error: "No se pudo guardar el archivo" };
  }
}
