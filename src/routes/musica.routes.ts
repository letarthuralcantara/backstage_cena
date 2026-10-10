import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { HttpError } from "../errors/HttpError.js";
import MusicaController from "../controllers/MusicaController.js";
import { isAuthenticated, optionalAuthentication } from "../middlewares/auth.js";

const router = Router();
const limitarOAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new HttpError(429, "Muitas tentativas de conexão musical. Tente novamente mais tarde.")),
});
const limitarLeitura = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new HttpError(429, "Muitas consultas musicais. Aguarde antes de tentar novamente.")),
});

router.post("/spotify/conectar", isAuthenticated, limitarOAuth, MusicaController.conectarSpotify);
router.get("/spotify/callback", limitarOAuth, MusicaController.callbackSpotify);
router.post("/lastfm/conectar", isAuthenticated, limitarOAuth, MusicaController.conectarLastFm);
router.get("/minha", isAuthenticated, MusicaController.obterMinhaConexao);
router.patch("/minha", isAuthenticated, MusicaController.atualizarVisibilidade);
router.delete("/minha", isAuthenticated, MusicaController.desconectarMusica);
router.get("/usuario/:id/agora", limitarLeitura, optionalAuthentication, MusicaController.obterAgora);
router.get("/usuario/:id/top", limitarLeitura, optionalAuthentication, MusicaController.obterTop);

export default router;
