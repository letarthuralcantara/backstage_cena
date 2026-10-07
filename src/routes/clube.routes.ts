import { Router } from "express";
import ClubeController from "../controllers/ClubeController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { semEntradaSchema } from "../schema/conteudo.schema.js";
import { uploadImagemClube } from "../config/multer-clube.js";
import {
  clubeParamsSchema,
  clubeUsuarioSchema,
  buscaClubeSchema,
  criarClubeSchema,
  criarMensagemSchema,
  listarClubesSchema,
  listarMensagensSchema,
  recomendadosSchema,
} from "../schema/clube.schema.js";

const router = Router();

// Rotas fixas ANTES de "/:id", senão "recomendados" seria lido como um id.
router.get("/", isAuthenticated, validate(listarClubesSchema), ClubeController.listar);
router.get("/recomendados", isAuthenticated, validate(recomendadosSchema), ClubeController.recomendados);
router.get("/meus", isAuthenticated, validate(semEntradaSchema), ClubeController.meus);
// Pública, como o próprio perfil: alimenta a seção "Clubes" de qualquer perfil.
router.get("/usuario/:id_usuario", validate(clubeUsuarioSchema), ClubeController.doUsuario);
router.get(
  "/:id/busca",
  isAuthenticated,
  validate(buscaClubeSchema),
  ClubeController.buscar,
);

router.post("/", isAuthenticated, validate(criarClubeSchema), ClubeController.criar);
router.post(
  "/:id/imagem",
  isAuthenticated,
  validate(clubeParamsSchema),
  uploadImagemClube,
  ClubeController.enviarImagem,
);
router.put(
  "/:id/imagem",
  isAuthenticated,
  validate(clubeParamsSchema),
  uploadImagemClube,
  ClubeController.enviarImagem,
);

router.get("/:id", isAuthenticated, validate(clubeParamsSchema), ClubeController.detalhe);
router.delete("/:id", isAuthenticated, validate(clubeParamsSchema), ClubeController.remover);
router.post("/:id/entrar", isAuthenticated, validate(clubeParamsSchema), ClubeController.entrar);
router.delete("/:id/sair", isAuthenticated, validate(clubeParamsSchema), ClubeController.sair);

// Chat: só membros leem e escrevem (checado no model).
router.get("/:id/mensagens", isAuthenticated, validate(listarMensagensSchema), ClubeController.mensagens);
router.post("/:id/mensagens", isAuthenticated, validate(criarMensagemSchema), ClubeController.enviarMensagem);

export default router;
