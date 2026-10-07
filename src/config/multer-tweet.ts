import path from "node:path";
import { criarUploadImagem } from "./multer-imagem.js";

export const PASTA_IMAGENS_TWEET = path.resolve(
  "public",
  "uploads",
  "tweets",
);
export const CAMINHO_PUBLICO_IMAGENS_TWEET = "/uploads/tweets";

export const uploadImagemTweet = criarUploadImagem(PASTA_IMAGENS_TWEET);
