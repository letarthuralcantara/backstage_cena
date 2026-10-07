import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { HttpError } from "../errors/HttpError.js";
import {
  TAMANHO_IMAGEM_MAX_BYTES,
  TIPOS_IMAGEM_PERMITIDOS,
} from "./multer-imagem.js";

export const PASTA_IMAGENS_CLUBE = path.resolve("public", "uploads", "clubes");
export const CAMINHO_PUBLICO_IMAGENS_CLUBE = "/uploads/clubes";

fs.mkdirSync(PASTA_IMAGENS_CLUBE, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PASTA_IMAGENS_CLUBE),
  filename: (_req, file, cb) => {
    const extensao = TIPOS_IMAGEM_PERMITIDOS[file.mimetype] ?? "";
    cb(null, `${crypto.randomBytes(16).toString("hex")}${extensao}`);
  },
});

export const uploadImagemClube = multer({
  storage,
  limits: { fileSize: TAMANHO_IMAGEM_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!(file.mimetype in TIPOS_IMAGEM_PERMITIDOS)) {
      cb(
        new HttpError(400, "Formato de imagem não suportado. Use jpeg, png ou gif.", [
          {
            code: "custom",
            path: ["body", "image"],
            message: "Formato de imagem não suportado. Use jpeg, png ou gif.",
          },
        ]),
      );
      return;
    }
    cb(null, true);
  },
}).single("image");