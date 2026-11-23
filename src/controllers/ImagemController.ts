import { Request, Response, NextFunction } from "express";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp, { type Metadata } from "sharp";
import imagemService from "../models/ImagemModel.js";
import { HttpError } from "../errors/HttpError.js";
import {
  CAMINHO_PUBLICO_AVATARES,
  PASTA_AVATARES,
  TIPOS_IMAGEM_PERMITIDOS,
} from "../config/multer-imagem.js";

function erroImagem(mensagem: string): HttpError {
  return new HttpError(400, mensagem, [
    { code: "custom", path: ["body", "image"], message: mensagem },
  ]);
}

function arquivoTemTerminatorCompleto(buffer: Buffer, formato: string): boolean {
  if (formato === "png") {
    return buffer.subarray(-12).equals(
      Buffer.from("0000000049454e44ae426082", "hex"),
    );
  }
  if (formato === "jpeg")
    return buffer.length >= 2 && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9;
  if (formato === "gif")
    return buffer.length >= 1 && buffer.at(-1) === 0x3b;
  return false;
}

const ImagemController = {
  // POST e PUT /api/usuarios/imagem: mesma regra (um avatar por usuário).
  // 201 quando é o primeiro avatar, 200 quando substitui o anterior.
  async enviar(req: Request, res: Response, next: NextFunction): Promise<void> {
    const arquivo = req.file;
    let destino: string | undefined;
    try {
      if (!arquivo) throw erroImagem("Envie uma imagem no campo \"image\".");
      if (!arquivo.buffer) throw erroImagem("Falha ao carregar o arquivo enviado.");

      const id_usuario = req.userId;
      if (!id_usuario) throw new HttpError(401, "Usuário não autenticado.");

      let metadata: Metadata;
      try {
        metadata = await sharp(arquivo.buffer, {
          failOn: "truncated",
          limitInputPixels: 25_000_000,
        }).metadata();
        await sharp(arquivo.buffer, {
          failOn: "truncated",
          limitInputPixels: 25_000_000,
          animated: false,
        }).toBuffer();
      } catch {
        throw erroImagem("O conteúdo do arquivo não é uma imagem válida.");
      }

      const formatoEsperado =
        arquivo.mimetype === "image/png" ? "png"
        : arquivo.mimetype === "image/jpeg" ? "jpeg"
        : arquivo.mimetype === "image/gif" ? "gif"
        : undefined;
      if (!formatoEsperado || metadata.format !== formatoEsperado)
        throw erroImagem("O MIME declarado não corresponde ao conteúdo da imagem.");
      if (!arquivoTemTerminatorCompleto(arquivo.buffer, formatoEsperado))
        throw erroImagem("O conteúdo da imagem está incompleto ou truncado.");

      const extensao = TIPOS_IMAGEM_PERMITIDOS[arquivo.mimetype];
      await fsPromises.mkdir(PASTA_AVATARES, { recursive: true });
      let filename = "";
      for (;;) {
        filename = `${crypto.randomBytes(16).toString("hex")}${extensao}`;
        destino = path.join(PASTA_AVATARES, filename);
        try {
          await fsPromises.writeFile(destino, arquivo.buffer, { flag: "wx" });
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "EEXIST") {
            destino = undefined;
            continue;
          }
          throw error;
        }
      }

      const caminho = `${CAMINHO_PUBLICO_AVATARES}/${filename}`;
      const { imagem, criada } = await imagemService.salvar(id_usuario, caminho);
      res.status(criada ? 201 : 200).json({ imagem });
    } catch (error) {
      if (destino) await fsPromises.unlink(destino).catch(() => undefined);
      next(error);
    }
  },
};

export default ImagemController;
