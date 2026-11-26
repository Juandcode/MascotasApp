import express, { type NextFunction, type Request, type Response, type Router } from "express";
import multer from "multer";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_REQUEST_SIZE_BYTES,
  UPLOAD_FIELD,
  processImageUpload,
} from "./imageUpload.ts";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

export const uploadRouter: Router = express.Router();

uploadRouter.post(
  "/",
  (request, response, next) => {
    const contentLength = Number(request.headers["content-length"] ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE_BYTES) {
      console.log(
        `[upload] rejected status=400 reason=content-length contentLength=${contentLength}`,
      );
      response.status(400).json({ error: "El archivo supera el máximo de 15 MB" });
      return;
    }
    next();
  },
  upload.single(UPLOAD_FIELD),
  async (request: Request, response: Response) => {
    const startedAt = Date.now();
    const file = request.file;

    if (!file) {
      console.log(
        `[upload] rejected status=400 durationMs=${Date.now() - startedAt} reason=missing-file`,
      );
      response.status(400).json({ error: `Debes enviar un archivo en el campo "${UPLOAD_FIELD}"` });
      return;
    }

    const result = await processImageUpload({ buffer: file.buffer, mimetype: file.mimetype });

    console.log(`[upload] response status=${result.status} durationMs=${Date.now() - startedAt}`);

    if (!result.ok) {
      response.status(result.status).json({ error: result.error });
      return;
    }

    response.status(result.status).json(result.body);
  },
);

uploadRouter.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "El archivo supera el máximo de 15 MB"
        : "Formulario multipart inválido";
    console.log(`[upload] rejected status=400 reason=${error.code}`);
    response.status(400).json({ error: message });
    return;
  }

  console.error("[upload] parser failure", error);
  response.status(400).json({ error: "Formulario multipart inválido" });
});
