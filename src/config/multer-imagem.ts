import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { HttpError } from "../errors/HttpError.js";

export const PASTA_AVATARES = path.resolve("public", "uploads", "avatars");
export const CAMINHO_PUBLICO_AVATARES = "/uploads/avatars";
export const TAMANHO_IMAGEM_MAX_BYTES = 2 * 1024 * 1024;

export const TIPOS_IMAGEM_PERMITIDOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
};

/**
 * Storage em disco com nome aleatório e remoção do parcial quando o stream
 * emite "limit". O uso de { flags: "wx" } impede sobrescrita mesmo em caso
 * de colisão inesperada.
 */
function criarStorageSeguro(pastaDestino: string): multer.StorageEngine {
  fs.mkdirSync(pastaDestino, { recursive: true });

  return {
    _handleFile(_req, file, callback) {
      const extensao = TIPOS_IMAGEM_PERMITIDOS[file.mimetype] ?? "";
      const filename = `${crypto.randomBytes(16).toString("hex")}${extensao}`;
      const destino = path.join(pastaDestino, filename);
      const saida = fs.createWriteStream(destino, { flags: "wx" });
      let finalizado = false;

      const falhar = (error: unknown) => {
        if (finalizado) return;
        finalizado = true;
        saida.destroy();
        void fs.promises.unlink(destino).catch(() => undefined).finally(() => {
          callback(error instanceof Error ? error : new Error("Falha no upload."));
        });
      };

      file.stream.once("limit", () => {
        falhar(new multer.MulterError("LIMIT_FILE_SIZE", file.fieldname));
      });
      file.stream.once("error", falhar);
      saida.once("error", falhar);
      saida.once("finish", () => {
        if (finalizado) return;
        finalizado = true;
        callback(null, {
          destination: pastaDestino,
          filename,
          path: destino,
          size: saida.bytesWritten,
        });
      });

      file.stream.pipe(saida);
    },

    _removeFile(_req, file, callback) {
      if (!file.path) {
        callback(null);
        return;
      }
      fs.promises.unlink(file.path).then(() => callback(null)).catch((error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") callback(null);
        else callback(error);
      });
    },
  };
}

export function criarUploadImagem(pastaDestino: string) {
  return multer({
    storage: criarStorageSeguro(pastaDestino),
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
}

export const uploadImagem = criarUploadImagem(PASTA_AVATARES);
