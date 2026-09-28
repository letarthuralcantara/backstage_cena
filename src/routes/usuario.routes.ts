import { Router } from "express";
import UsuarioController from "../controllers/UsuarioController.js";
import { isAuthenticated, isOwner } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { HttpError } from "../errors/HttpError.js";
import { rateLimit } from "express-rate-limit";
import {
  cadastroSchema,
  loginSchema,
  esqueciSenhaSchema,
  redefinirSenhaSchema,
  atualizarSchema,
  removerSchema,
  statusSchema,
  alterarSenhaSchema,
  listarSchema,
  buscarSchema,
  configuracoesSchema,
  atualizarConfiguracoesSchema,
  semEntradaSchema,
} from "../schema/usuario.schema.js";

const router = Router();

function criarLimitador(max: number, message: string) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, message)),
  });
}

const limitarLogin = criarLimitador(
  10,
  "Muitas tentativas de login. Tente novamente em 15 minutos.",
);
const limitarSolicitacaoReset = criarLimitador(
  5,
  "Muitas solicitações de redefinição. Tente novamente em 15 minutos.",
);
const limitarTentativaReset = criarLimitador(
  5,
  "Muitas tentativas de código. Solicite um novo código mais tarde.",
);

router.get(
  "/estados",
  validate(semEntradaSchema),
  UsuarioController.listarEstados,
);
router.get("/areas", validate(semEntradaSchema), UsuarioController.listarAreas);
router.get(
  "/instrumentos",
  validate(semEntradaSchema),
  UsuarioController.listarInstrumentos,
);
router.get(
  "/generos",
  validate(semEntradaSchema),
  UsuarioController.listarGeneros,
);
router.get("/daws", validate(semEntradaSchema), UsuarioController.listarDaws);
router.get(
  "/disponibilidades",
  validate(semEntradaSchema),
  UsuarioController.listarDisponibilidades,
);

router.post(
  "/login",
  limitarLogin,
  validate(loginSchema),
  UsuarioController.login,
);
router.post(
  "/esqueci-senha",
  limitarSolicitacaoReset,
  validate(esqueciSenhaSchema),
  UsuarioController.esqueciSenha,
);
router.post(
  "/redefinir-senha",
  limitarTentativaReset,
  validate(redefinirSenhaSchema),
  UsuarioController.redefinirSenha,
);

router.patch(
  "/:id/status",
  isAuthenticated,
  validate(statusSchema),
  isOwner,
  UsuarioController.atualizarStatus,
);
router.get(
  "/:id/configuracoes",
  isAuthenticated,
  validate(configuracoesSchema),
  isOwner,
  UsuarioController.getConfiguracoes,
);
router.put(
  "/:id/configuracoes",
  isAuthenticated,
  validate(atualizarConfiguracoesSchema),
  isOwner,
  UsuarioController.updateConfiguracoes,
);
router.put(
  "/:id/senha",
  isAuthenticated,
  validate(alterarSenhaSchema),
  isOwner,
  UsuarioController.alterarSenha,
);

router.get("/", validate(listarSchema), UsuarioController.listar);
router.get("/:id", validate(buscarSchema), UsuarioController.buscarPorId);
router.post("/", validate(cadastroSchema), UsuarioController.criar);
router.put(
  "/:id",
  isAuthenticated,
  validate(atualizarSchema),
  isOwner,
  UsuarioController.atualizar,
);
router.delete(
  "/:id",
  isAuthenticated,
  validate(removerSchema),
  isOwner,
  UsuarioController.remover,
);

export default router;
