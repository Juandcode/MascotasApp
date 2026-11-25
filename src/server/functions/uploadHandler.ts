import type { HttpHandler, HttpResponseInit } from "@azure/functions";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_REQUEST_SIZE_BYTES,
  UPLOAD_FIELD,
  processImageUpload,
} from "../uploads/imageUpload.ts";

function badRequest(error: string): HttpResponseInit {
  return { status: 400, jsonBody: { error } };
}

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export const uploadHandler: HttpHandler = async (request, context) => {
  const startedAt = Date.now();
  console.log(
    `[http] upload method=${request.method} path=${request.url.split("?")[0]} invocationId=${context.invocationId} contentLength=${request.headers.get("content-length") ?? "unknown"}`,
  );

  const reject = (error: string): HttpResponseInit => {
    console.log(
      `[http] upload rejected status=400 invocationId=${context.invocationId} durationMs=${Date.now() - startedAt} reason=${error}`,
    );
    return badRequest(error);
  };

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return reject("El Content-Type debe ser multipart/form-data");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE_BYTES) {
    return reject("El archivo supera el máximo de 15 MB");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return reject("Formulario multipart inválido");
  }

  const file = formData.get(UPLOAD_FIELD);
  if (!isFile(file)) {
    return reject(`Debes enviar un archivo en el campo "${UPLOAD_FIELD}"`);
  }

  if (file.size === 0) {
    return reject("El archivo está vacío");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return reject("El archivo supera el máximo de 15 MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await processImageUpload({ buffer, mimetype: file.type });

  console.log(
    `[http] upload response status=${result.status} invocationId=${context.invocationId} durationMs=${Date.now() - startedAt}`,
  );

  if (!result.ok) {
    return { status: result.status, jsonBody: { error: result.error } };
  }

  return { status: result.status, jsonBody: result.body };
};
