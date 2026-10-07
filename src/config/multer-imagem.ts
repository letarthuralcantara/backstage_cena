import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { HttpError } from "../errors/HttpError.js";

// ── Upload de imagem de perfil (avatar) ───────────────────────────────────────
// O banco guarda só o caminho público; o binário vive em public/uploads/avatars,
// servido pelo mesmo express.static("public") do restante do front.
export const PASTA_AVATARES = path.resolve("public", "uploads", "avatars");
export const CAMINHO_PUBLICO_AVATARES = "/uploads/avatars";
export const TAMANHO_IMAGEM_MAX_BYTES = 2 * 1024 * 1024;

// A extensão vem do MIME validado, nunca de file.originalname (que é do cliente).
export const TIPOS_IMAGEM_PERMITIDOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
};

export function criarUploadImagem(pastaDestino: string) {
  fs.mkdirSync(pastaDestino, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, pastaDestino),
    filename: (_req, file, cb) => {
      const extensao = TIPOS_IMAGEM_PERMITIDOS[file.mimetype] ?? "";
      cb(null, `${crypto.randomBytes(16).toString("hex")}${extensao}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: TAMANHO_IMAGEM_MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!(file.mimetype in TIPOS_IMAGEM_PERMITIDOS)) {
        cb(
          new HttpError(
            400,
            "Formato de imagem não suportado. Use jpeg, png ou gif.",
            [
              {
                code: "custom",
                path: ["body", "image"],
                message: "Formato de imagem não suportado. Use jpeg, png ou gif.",
              },
            ],
          ),
        );
        return;
      }
      cb(null, true);
    },
  }).single("image");
}

export const uploadImagem = criarUploadImagem(PASTA_AVATARES);
