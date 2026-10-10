import { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/HttpError.js";
import { criarSpotifyAuthorization, finalizarSpotifyAuthorization, SpotifyApiError } from "../services/musica/spotifyOAuth.js";
import {
  atualizarVisibilidade,
  desconectarMusica,
  obterAgora,
  obterMinhaConexao,
  obterTop,
  salvarConexaoLastFm,
} from "../services/musica/MusicaModel.js";
import { LastFmApiError, LastFmProvider } from "../services/musica/providers.js";
import { z } from "zod";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
const seguro = (handler: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res).catch(next);
};

const parametrosTop = z.object({
  tipo: z.enum(["artistas", "faixas"]),
  periodo: z.enum(["curto", "medio", "longo"]).default("curto"),
  limite: z.coerce.number().int().min(1).max(50).default(10),
});
const esquemaVisibilidade = z.object({ visibilidade: z.enum(["publico", "clubes", "oculto"]) }).strict();
const esquemaLastFm = z.object({
  username: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N}_-]+$/u, "Nome de usuário inválido."),
}).strict();
const lastFmProvider = new LastFmProvider();

function responderErroConsulta(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof SpotifyApiError && error.code === "invalid_grant") {
    res.status(200).json({ conectado: false, estado: "desconectado" });
    return;
  }
  if (error instanceof SpotifyApiError && error.status === 403) {
    res.status(200).json({ conectado: false, estado: "nao_autorizado" });
    return;
  }
  if (error instanceof SpotifyApiError && error.status === 429) {
    if (error.retryAfter) res.setHeader("Retry-After", error.retryAfter);
    res.status(429).json({ conectado: true, estado: "limite_atingido", erro: "O Spotify limitou as consultas. Tente novamente mais tarde." });
    return;
  }
  if (error instanceof LastFmApiError && error.status === 403) {
    res.status(200).json({ conectado: false, estado: "atividade_privada" });
    return;
  }
  if (error instanceof LastFmApiError && error.status === 429) {
    if (error.retryAfter) res.setHeader("Retry-After", error.retryAfter);
    res.status(429).json({ conectado: true, estado: "limite_atingido", erro: "O Last.fm limitou as consultas. Tente novamente mais tarde." });
    return;
  }
  next(error);
}

function redirecionarConfig(res: Response, resultado: "ok" | "erro", motivo?: string) {
  const query = new URLSearchParams({ musica: resultado });
  if (motivo) query.set("motivo", motivo);
  res.redirect(303, `/pages/config.html?${query.toString()}`);
}

const MusicaController = {
  conectarSpotify: seguro(async (req, res) => {
    if (!req.userId) throw new HttpError(401, "Usuário não autenticado.");
    res.json({ url: criarSpotifyAuthorization(req.userId) });
  }),

  conectarLastFm: seguro(async (req, res) => {
    if (!req.userId) throw new HttpError(401, "Usuário não autenticado.");
    const entrada = esquemaLastFm.safeParse(req.body);
    if (!entrada.success) throw new HttpError(400, "Informe um nome de usuário Last.fm válido.");
    const usuario = await lastFmProvider.validarUsuario(entrada.data.username);
    res.status(200).json(await salvarConexaoLastFm(req.userId, usuario.id, usuario.nome));
  }),

  obterMinhaConexao: seguro(async (req, res) => {
    if (!req.userId) throw new HttpError(401, "Usuário não autenticado.");
    res.json(await obterMinhaConexao(req.userId));
  }),

  atualizarVisibilidade: seguro(async (req, res) => {
    if (!req.userId) throw new HttpError(401, "Usuário não autenticado.");
    const entrada = esquemaVisibilidade.safeParse(req.body);
    if (!entrada.success) throw new HttpError(400, "Visibilidade musical inválida.");
    res.json(await atualizarVisibilidade(req.userId, entrada.data.visibilidade));
  }),

  desconectarMusica: seguro(async (req, res) => {
    if (!req.userId) throw new HttpError(401, "Usuário não autenticado.");
    res.json(await desconectarMusica(req.userId));
  }),

  obterAgora: (req: Request, res: Response, next: NextFunction) => {
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    if (!id.success) return next(new HttpError(400, "Identificador de usuário inválido."));
    obterAgora(id.data, req.userId)
      .then((value) => res.json(value))
      .catch((error: unknown) => responderErroConsulta(error, res, next));
  },

  obterTop: (req: Request, res: Response, next: NextFunction) => {
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    const query = parametrosTop.safeParse(req.query);
    if (!id.success || !query.success) return next(new HttpError(400, "Parâmetros de consulta musical inválidos."));
    const tipo = query.data.tipo === "artistas" ? "artista" : "faixa";
    obterTop(id.data, req.userId, tipo, query.data.periodo, query.data.limite)
      .then((value) => res.json(value))
      .catch((error: unknown) => responderErroConsulta(error, res, next));
  },

  callbackSpotify: seguro(async (req, res) => {
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (typeof req.query.error === "string") {
      redirecionarConfig(res, "erro", "acesso_negado");
      return;
    }
    if (!state || !code) {
      redirecionarConfig(res, "erro", "resposta_invalida");
      return;
    }
    try {
      await finalizarSpotifyAuthorization(state, code);
      redirecionarConfig(res, "ok");
    } catch (error) {
      if (error instanceof HttpError && error.code === 400) {
        redirecionarConfig(res, "erro", "state_invalido");
        return;
      }
      if (error instanceof Error && "status" in error && error.status === 429) {
        redirecionarConfig(res, "erro", "limite");
        return;
      }
      if (error instanceof Error && "status" in error && error.status === 403) {
        redirecionarConfig(res, "erro", "nao_autorizado");
        return;
      }
      throw error;
    }
  }),
};

export default MusicaController;
