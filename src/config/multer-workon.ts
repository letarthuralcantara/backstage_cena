import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { HttpError } from "../errors/HttpError.js";
import { TIPOS_AUDIO_PERMITIDOS } from "../schema/conteudo.schema.js";
import { criarUploadImagem } from "./multer-imagem.js";

export const PASTA_AUDIO_WORKON = path.resolve("storage", "workon", "audio");
export const PASTA_CAPAS_WORKON = path.resolve("public", "uploads", "workon", "capas");
export const PASTA_FOTOS_WORKON = path.resolve("public", "uploads", "workon", "fotos");
export const CAMINHO_PUBLICO_CAPAS_WORKON = "/uploads/workon/capas";
export const CAMINHO_PUBLICO_FOTOS_WORKON = "/uploads/workon/fotos";

const WORKON_AUDIO_MAX_MB = Number(process.env.WORKON_AUDIO_MAX_MB ?? 50);
const WORKON_AUDIO_MAX_BYTES = Math.max(1, Number.isFinite(WORKON_AUDIO_MAX_MB) ? WORKON_AUDIO_MAX_MB * 1024 * 1024 : 50 * 1024 * 1024);

fs.mkdirSync(PASTA_AUDIO_WORKON, { recursive: true });
fs.mkdirSync(PASTA_CAPAS_WORKON, { recursive: true });
fs.mkdirSync(PASTA_FOTOS_WORKON, { recursive: true });

export const TIPOS_IMAGEM_WORKON: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
};

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PASTA_AUDIO_WORKON),
  filename: (_req, file, cb) => {
    const extensao = file.mimetype === "audio/x-wav" ? ".wav" : file.mimetype.includes("mpeg") ? ".mp3" : file.mimetype.includes("flac") ? ".flac" : file.mimetype.includes("aac") || file.mimetype.includes("mp4") ? ".m4a" : file.mimetype.includes("ogg") ? ".ogg" : ".bin";
    cb(null, `${crypto.randomBytes(16).toString("hex")}${extensao}`);
  },
});

export const uploadAudioWorkon = multer({
  storage: audioStorage,
  limits: { fileSize: WORKON_AUDIO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_AUDIO_PERMITIDOS.includes(file.mimetype as typeof TIPOS_AUDIO_PERMITIDOS[number])) {
      cb(new HttpError(400, "Formato de áudio não suportado. Use mp3, wav, flac, m4a ou ogg.", [{ code: "custom", path: ["body", "audio"], message: "Formato de áudio não suportado." }]));
      return;
    }
    cb(null, true);
  },
}).single("audio");

export const uploadImagemWorkon = criarUploadImagem(PASTA_CAPAS_WORKON);
export const uploadFotoWorkon = criarUploadImagem(PASTA_FOTOS_WORKON);
