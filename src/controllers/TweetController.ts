import { Request, Response, NextFunction } from "express";
import { promises as fs } from "node:fs";
import { CAMINHO_PUBLICO_IMAGENS_TWEET } from "../config/multer-tweet.js";
import { imagemTemAssinaturaValida } from "../utils/imagem.js";
import { removerUploadTemporario } from "../utils/upload.js";
import tweetService from "../models/TweetModel.js";
import { HttpError } from "../errors/HttpError.js";

function erroImagemTweet(mensagem: string): HttpError {
  return new HttpError(400, mensagem, [
    { code: "custom", path: ["body", "image"], message: mensagem },
  ]);
}

const TweetController = {
  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id_usuario = req.userId;
      if (!id_usuario) throw new HttpError(401, "Usuário não autenticado.");

      const arquivo = req.file;
      if (arquivo) {
        const inicio = await fs.open(arquivo.path, "r").then(async (handle) => {
          try {
            const buffer = Buffer.alloc(12);
            await handle.read(buffer, 0, 12, 0);
            return buffer;
          } finally {
            await handle.close();
          }
        });
        if (!imagemTemAssinaturaValida(inicio, arquivo.mimetype)) {
          throw erroImagemTweet("O conteúdo do arquivo não é uma imagem válida.");
        }
      }

      const tweet = await tweetService.create({
        id_usuario,
        texto: req.body.texto,
        expirar: req.body.expirar,
        imagem: arquivo
          ? `${CAMINHO_PUBLICO_IMAGENS_TWEET}/${arquivo.filename}`
          : null,
      });

      res.status(201).json(tweet);
    } catch (error) {
      try {
        await removerUploadTemporario(req.file);
      } catch (cleanupError) {
        console.error("Erro ao remover imagem de tweet após falha:", cleanupError);
      }
      next(error);
    }
  },

  async feed(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tweets = await tweetService.feed();
      res.json(tweets);
    } catch (error) {
      next(error);
    }
  },

  async porUsuario(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id_usuario = Number(req.params.id_usuario);
      const tweets = await tweetService.porUsuario(id_usuario);
      res.json(tweets);
    } catch (error) {
      next(error);
    }
  },

  async remover(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id_tweet = Number(req.params.id);
      if (!req.userId) throw new HttpError(401, "Usuário não autenticado.");
      await tweetService.remover(id_tweet, req.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

export default TweetController;
