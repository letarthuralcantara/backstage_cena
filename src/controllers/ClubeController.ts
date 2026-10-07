import { Request, Response, NextFunction } from "express";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import clubeService from "../models/ClubeModel.js";
import { HttpError } from "../errors/HttpError.js";
import {
  CAMINHO_PUBLICO_IMAGENS_CLUBE,
  PASTA_IMAGENS_CLUBE,
} from "../config/multer-clube.js";
import { imagemTemAssinaturaValida } from "../utils/imagem.js";

function usuarioAtual(req: Request): number {
  if (!req.userId) throw new HttpError(401, "Usuário não autenticado.");
  return req.userId;
}

type Handler = (req: Request, res: Response) => Promise<void>;

// Evita repetir try/catch em cada handler: qualquer erro vai para o errorHandler.
const seguro =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const ClubeController = {
  listar: seguro(async (req, res) => {
    const { q, tipo } = req.query as { q?: string; tipo?: string };
    res.json(await clubeService.listar(usuarioAtual(req), { q, tipo }));
  }),

  recomendados: seguro(async (req, res) => {
    const limite = req.query.limite ? Number(req.query.limite) : undefined;
    res.json(await clubeService.recomendados(usuarioAtual(req), limite));
  }),

  meus: seguro(async (req, res) => {
    res.json(await clubeService.meus(usuarioAtual(req)));
  }),

  doUsuario: seguro(async (req, res) => {
    res.json(await clubeService.doUsuario(Number(req.params.id_usuario)));
  }),

  detalhe: seguro(async (req, res) => {
    res.json(await clubeService.detalhe(Number(req.params.id), usuarioAtual(req)));
  }),

  buscar: seguro(async (req, res) => {
    const { q } = req.query as { q: string };
    res.json(
      await clubeService.buscarNoClube(
        Number(req.params.id),
        usuarioAtual(req),
        q,
      ),
    );
  }),

  criar: seguro(async (req, res) => {
    res.status(201).json(await clubeService.criar(usuarioAtual(req), req.body));
  }),

  enviarImagem: seguro(async (req, res) => {
    const arquivo = req.file;
    try {
      if (!arquivo)
        throw new HttpError(400, 'Envie uma imagem no campo "image".');

      const inicio = await fsPromises
        .open(arquivo.path, "r")
        .then(async (handle) => {
          try {
            const buffer = Buffer.alloc(12);
            await handle.read(buffer, 0, 12, 0);
            return buffer;
          } finally {
            await handle.close();
          }
        });
      if (!imagemTemAssinaturaValida(inicio, arquivo.mimetype))
        throw new HttpError(400, "O conteúdo do arquivo não é uma imagem válida.");

      const caminho = `${CAMINHO_PUBLICO_IMAGENS_CLUBE}/${arquivo.filename}`;
      const resultado = await clubeService.salvarImagem(
        Number(req.params.id),
        usuarioAtual(req),
        caminho,
      );

      if (resultado.imagemAnterior?.startsWith(`${CAMINHO_PUBLICO_IMAGENS_CLUBE}/`)) {
        await fsPromises
          .unlink(path.join(PASTA_IMAGENS_CLUBE, path.basename(resultado.imagemAnterior)))
          .catch(() => undefined);
      }
      res.json({ clube: resultado.clube });
    } catch (error) {
      if (arquivo) await fsPromises.unlink(arquivo.path).catch(() => undefined);
      throw error;
    }
  }),

  entrar: seguro(async (req, res) => {
    res.json(await clubeService.entrar(Number(req.params.id), usuarioAtual(req)));
  }),

  sair: seguro(async (req, res) => {
    await clubeService.sair(Number(req.params.id), usuarioAtual(req));
    res.status(204).end();
  }),

  remover: seguro(async (req, res) => {
    const imagem = await clubeService.remover(
      Number(req.params.id),
      usuarioAtual(req),
    );
    if (imagem?.startsWith(`${CAMINHO_PUBLICO_IMAGENS_CLUBE}/`)) {
      await fsPromises
        .unlink(path.join(PASTA_IMAGENS_CLUBE, path.basename(imagem)))
        .catch(() => undefined);
    }
    res.status(204).end();
  }),

  mensagens: seguro(async (req, res) => {
    const depois =
      req.query.depois !== undefined ? Number(req.query.depois) : undefined;
    res.json(
      await clubeService.listarMensagens(
        Number(req.params.id),
        usuarioAtual(req),
        depois,
      ),
    );
  }),

  enviarMensagem: seguro(async (req, res) => {
    res
      .status(201)
      .json(
        await clubeService.enviarMensagem(
          Number(req.params.id),
          usuarioAtual(req),
          req.body.texto,
        ),
      );
  }),
};

export default ClubeController;
