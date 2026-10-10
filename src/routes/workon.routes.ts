import { Router } from "express";
import fs from "node:fs/promises";
import WorkOnController from "../controllers/WorkOnController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { uploadAudioWorkon, uploadFotoWorkon, uploadImagemWorkon } from "../config/multer-workon.js";
import {
  atualizarMembroWorkOnSchema,
  atualizarWorkOnSchema,
  capaWorkOnSchema,
  compartilharEmClubeSchema,
  criarWorkOnSchema,
  entrarPorConviteSchema,
  entrarWorkOnSchema,
  faixaWorkOnSchema,
  fotoWorkOnSchema,
  listarWorkOnSchema,
  membroWorkOnSchema,
  publicarPreviaSchema,
  reordenarFaixasSchema,
  reordenarFotosSchema,
  reordenarTarefasSchema,
  semEntradaSchema,
  versaoWorkOnSchema,
  urlVersaoWorkOnSchema,
  workOnParamsSchema,
  workOnUsuarioSchema,
  tarefaWorkOnSchema,
  conviteSchema,
} from "../schema/workon.schema.js";

const router = Router();

router.get("/", isAuthenticated, validate(listarWorkOnSchema), WorkOnController.listar);
router.get("/meus", isAuthenticated, validate(semEntradaSchema), WorkOnController.meus);
router.get("/usuario/:id_usuario", validate(workOnUsuarioSchema), WorkOnController.doUsuario);
router.post("/entrar-por-convite", isAuthenticated, validate(entrarPorConviteSchema), WorkOnController.entrarPorConvite);
router.post("/", isAuthenticated, validate(criarWorkOnSchema), WorkOnController.criar);

router.get("/:id/resumo", isAuthenticated, validate(workOnParamsSchema), WorkOnController.resumo);
router.get("/:id", isAuthenticated, validate(workOnParamsSchema), WorkOnController.detalhe);
router.patch("/:id", isAuthenticated, validate(atualizarWorkOnSchema), WorkOnController.atualizar);
router.delete("/:id", isAuthenticated, validate(workOnParamsSchema), WorkOnController.remover);

router.post("/:id/entrar", isAuthenticated, validate(entrarWorkOnSchema), WorkOnController.entrar);
router.delete("/:id/sair", isAuthenticated, validate(workOnParamsSchema), WorkOnController.sair);
router.post("/:id/convite", isAuthenticated, validate(conviteSchema), WorkOnController.gerarConvite);
router.delete("/:id/convite", isAuthenticated, validate(conviteSchema), WorkOnController.revogarConvite);
router.get("/:id/membros", isAuthenticated, validate(workOnParamsSchema), WorkOnController.membros);
router.post("/:id/membros", isAuthenticated, validate(membroWorkOnSchema), WorkOnController.adicionarMembro);
router.patch("/:id/membros/:id_usuario", isAuthenticated, validate(atualizarMembroWorkOnSchema), WorkOnController.atualizarMembro);
router.delete("/:id/membros/:id_usuario", isAuthenticated, validate(atualizarMembroWorkOnSchema), WorkOnController.removerMembro);

router.post("/:id/faixas", isAuthenticated, validate(faixaWorkOnSchema), WorkOnController.criarFaixa);
router.patch("/:id/faixas/:idFaixa", isAuthenticated, validate(faixaWorkOnSchema), WorkOnController.atualizarFaixa);
router.delete("/:id/faixas/:idFaixa", isAuthenticated, validate(faixaWorkOnSchema), WorkOnController.removerFaixa);
router.patch("/:id/faixas/reordenar", isAuthenticated, validate(reordenarFaixasSchema), WorkOnController.reordenarFaixas);

router.post(
  "/:id/faixas/:idFaixa/versoes",
  isAuthenticated,
  uploadAudioWorkon,
  validate(versaoWorkOnSchema, { onInvalid: (req) => req.file ? fs.unlink(req.file.path) : undefined }),
  WorkOnController.criarVersao,
);
router.delete("/:id/faixas/:idFaixa/versoes/:idVersao", isAuthenticated, validate(versaoWorkOnSchema), WorkOnController.removerVersao);
router.get("/:id/versoes/:idVersao/url", isAuthenticated, validate(urlVersaoWorkOnSchema), WorkOnController.urlVersao);
router.get("/arquivos/:token", WorkOnController.arquivoAssinado);

router.post("/:id/tarefas", isAuthenticated, validate(tarefaWorkOnSchema), WorkOnController.criarTarefa);
router.patch("/:id/tarefas/:idTarefa", isAuthenticated, validate(tarefaWorkOnSchema), WorkOnController.atualizarTarefa);
router.delete("/:id/tarefas/:idTarefa", isAuthenticated, validate(tarefaWorkOnSchema), WorkOnController.removerTarefa);
router.patch("/:id/tarefas/reordenar", isAuthenticated, validate(reordenarTarefasSchema), WorkOnController.reordenarTarefas);

router.post(
  "/:id/fotos",
  isAuthenticated,
  uploadFotoWorkon,
  validate(fotoWorkOnSchema, { onInvalid: (req) => req.file ? fs.unlink(req.file.path) : undefined }),
  WorkOnController.criarFoto,
);
router.patch("/:id/fotos/:idFoto", isAuthenticated, validate(fotoWorkOnSchema), WorkOnController.atualizarLegendaFoto);
router.delete("/:id/fotos/:idFoto", isAuthenticated, validate(fotoWorkOnSchema), WorkOnController.removerFoto);
router.patch("/:id/fotos/reordenar", isAuthenticated, validate(reordenarFotosSchema), WorkOnController.reordenarFotos);
router.put(
  "/:id/capa",
  isAuthenticated,
  uploadImagemWorkon,
  validate(capaWorkOnSchema, { onInvalid: (req) => req.file ? fs.unlink(req.file.path) : undefined }),
  WorkOnController.atualizarCapa,
);
router.delete("/:id/capa", isAuthenticated, validate(capaWorkOnSchema), WorkOnController.removerCapa);

router.post("/:id/versoes/:idVersao/publicar-previa", isAuthenticated, validate(publicarPreviaSchema), WorkOnController.publicarPrevia);
router.post("/:id/compartilhar-em-clube", isAuthenticated, validate(compartilharEmClubeSchema), WorkOnController.compartilharEmClube);

export default router;
