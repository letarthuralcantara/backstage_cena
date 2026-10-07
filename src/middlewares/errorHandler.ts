import { Request, Response, NextFunction } from "express";
import { HttpError } from "../errors/HttpError.js";
import multer from "multer";

/**
 * Middleware global de tratamento de erros.
 * Deve ser registrado após todas as rotas no server.ts.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.code).json({
      erro: err.message,
      ...(err.issues ? { issues: err.issues } : {}),
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "O arquivo excede o limite permitido."
        : "Falha no upload.";
    // O campo vem do próprio Multer (ex.: "audio" ou "image"), em vez de fixo.
    const campo = err.field || "arquivo";
    res.status(400).json({
      erro: message,
      issues: [
        {
          code: "custom",
          path: ["body", campo],
          message,
        },
      ],
    });
    return;
  }
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    err.status === 400 &&
    "body" in err
  ) {
    res.status(400).json({
      erro: "JSON malformado.",
      issues: [
        {
          code: "custom",
          path: ["body"],
          message: "O corpo da requisição deve conter JSON válido.",
        },
      ],
    });
    return;
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "P2002"
  ) {
    const meta = "meta" in err ? err.meta : undefined;
    const target =
      typeof meta === "object" && meta !== null && "target" in meta
        ? meta.target
        : undefined;
    const field = Array.isArray(target) ? target[0] : target;
    const issues =
      typeof field === "string"
        ? [
            {
              code: "custom",
              path: ["body", field],
              message: "Este valor já está cadastrado.",
            },
          ]
        : undefined;
    res.status(409).json({
      erro: "Conflito: um registro com este valor já existe.",
      ...(issues ? { issues } : {}),
    });
    return;
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
}
