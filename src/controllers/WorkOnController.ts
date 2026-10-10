import crypto from "node:crypto";
import { NextFunction, Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import workonService from "../models/WorkOnModel.js";
import { HttpError } from "../errors/HttpError.js";

function usuarioAtual(req: Request): number {
  if (!req.userId) throw new HttpError(401, "Usuário não autenticado.");
  return req.userId;
}

type Handler = (req: Request, res: Response) => Promise<void>;
const seguro = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

const WorkOnController = {
  listar: seguro(async (req, res) => {
    res.json(await workonService.listarPublicos(req.query as any, usuarioAtual(req)));
  }),
  meus: seguro(async (req, res) => {
    res.json(await workonService.meus(usuarioAtual(req)));
  }),
  doUsuario: seguro(async (req, res) => {
    const idUsuario = Number(req.params.id_usuario);
    res.json(await workonService.doUsuario(idUsuario, req.userId));
  }),
  criar: seguro(async (req, res) => {
    res.status(201).json(await workonService.criar(usuarioAtual(req), req.body));
  }),
  detalhe: seguro(async (req, res) => {
    const id = Number(req.params.id);
    res.json(await workonService.detalhe(id, usuarioAtual(req)));
  }),
  resumo: seguro(async (req, res) => {
    res.json(await workonService.resumo(Number(req.params.id), usuarioAtual(req)));
  }),
  atualizar: seguro(async (req, res) => {
    res.json(await workonService.atualizar(Number(req.params.id), usuarioAtual(req), req.body));
  }),
  remover: seguro(async (req, res) => {
    await workonService.remover(Number(req.params.id), usuarioAtual(req));
    res.status(204).end();
  }),
  entrar: seguro(async (req, res) => {
    res.json(await workonService.entrar(Number(req.params.id), usuarioAtual(req)));
  }),
  entrarPorConvite: seguro(async (req, res) => {
    const token = String(req.body.token ?? "").trim();
    res.json(await workonService.entrarPorConvite(token, usuarioAtual(req)));
  }),
  sair: seguro(async (req, res) => {
    await workonService.sair(Number(req.params.id), usuarioAtual(req));
    res.status(204).end();
  }),
  gerarConvite: seguro(async (req, res) => {
    res.json(await workonService.gerarConvite(Number(req.params.id), usuarioAtual(req)));
  }),
  revogarConvite: seguro(async (req, res) => {
    await workonService.revogarConvite(Number(req.params.id), usuarioAtual(req));
    res.status(204).end();
  }),
  membros: seguro(async (req, res) => {
    res.json(await workonService.listarMembros(Number(req.params.id), usuarioAtual(req)));
  }),
  adicionarMembro: seguro(async (req, res) => {
    res.status(201).json(await workonService.adicionarMembro(Number(req.params.id), usuarioAtual(req), Number(req.body.id_usuario), req.body.papel));
  }),
  atualizarMembro: seguro(async (req, res) => {
    res.json(await workonService.atualizarMembro(Number(req.params.id), usuarioAtual(req), Number(req.params.id_usuario), req.body.papel));
  }),
  removerMembro: seguro(async (req, res) => {
    await workonService.removerMembro(Number(req.params.id), usuarioAtual(req), Number(req.params.id_usuario));
    res.status(204).end();
  }),
  criarFaixa: seguro(async (req, res) => {
    res.status(201).json(await workonService.criarFaixa(Number(req.params.id), usuarioAtual(req), req.body));
  }),
  atualizarFaixa: seguro(async (req, res) => {
    res.json(await workonService.atualizarFaixa(Number(req.params.id), usuarioAtual(req), Number(req.params.idFaixa ?? req.params.id), req.body));
  }),
  removerFaixa: seguro(async (req, res) => {
    await workonService.removerFaixa(Number(req.params.id), usuarioAtual(req), Number(req.params.idFaixa ?? req.params.id));
    res.status(204).end();
  }),
  reordenarFaixas: seguro(async (req, res) => {
    await workonService.reordenarFaixas(Number(req.params.id), usuarioAtual(req), req.body.ids);
    res.status(204).end();
  }),
  criarVersao: seguro(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Envie um arquivo no campo "audio".');
    try {
      res.status(201).json(await workonService.criarVersao(Number(req.params.id), usuarioAtual(req), Number(req.params.idFaixa), req.file, req.body));
    } catch (error) {
      await fs.unlink(req.file.path).catch(() => undefined);
      throw error;
    }
  }),
  removerVersao: seguro(async (req, res) => {
    await workonService.removerVersao(Number(req.params.id), usuarioAtual(req), Number(req.params.idVersao));
    res.status(204).end();
  }),
  urlVersao: seguro(async (req, res) => {
    res.json(await workonService.urlVersao(Number(req.params.id), usuarioAtual(req), Number(req.params.idVersao)));
  }),
  arquivoAssinado: seguro(async (req, res) => {
    const { token } = req.params as { token: string };
    const secret = process.env.WORKON_FILE_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error("WORKON_FILE_SECRET não configurado.");
    const pathname = req.query.nome as string | undefined;
    const exp = Number(req.query.exp ?? 0);
    if (!pathname || !exp || !/^[a-f\d]{64}$/i.test(token) || path.basename(pathname) !== pathname) {
      throw new HttpError(403, "Link de arquivo inválido.");
    }
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify({ nome: pathname, exp })).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"))) {
      throw new HttpError(403, "Assinatura inválida.");
    }
    if (Date.now() / 1000 > exp) throw new HttpError(403, "Link expirado.");
    res.sendFile(path.resolve(process.cwd(), "storage", "workon", "audio", pathname));
  }),
  criarTarefa: seguro(async (req, res) => {
    res.status(201).json(await workonService.criarTarefa(Number(req.params.id), usuarioAtual(req), req.body));
  }),
  atualizarTarefa: seguro(async (req, res) => {
    res.json(await workonService.atualizarTarefa(Number(req.params.id), usuarioAtual(req), Number(req.params.idTarefa ?? req.params.id), req.body));
  }),
  removerTarefa: seguro(async (req, res) => {
    await workonService.removerTarefa(Number(req.params.id), usuarioAtual(req), Number(req.params.idTarefa ?? req.params.id));
    res.status(204).end();
  }),
  reordenarTarefas: seguro(async (req, res) => {
    await workonService.reordenarTarefas(Number(req.params.id), usuarioAtual(req), req.body.ids);
    res.status(204).end();
  }),
  criarFoto: seguro(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Envie uma imagem no campo "image".');
    try {
      res.status(201).json(await workonService.criarFoto(Number(req.params.id), usuarioAtual(req), req.file, req.body.legenda));
    } catch (error) {
      await fs.unlink(req.file.path).catch(() => undefined);
      throw error;
    }
  }),
  atualizarLegendaFoto: seguro(async (req, res) => {
    res.json(await workonService.atualizarLegendaFoto(Number(req.params.id), usuarioAtual(req), Number(req.params.idFoto ?? req.params.id), req.body.legenda));
  }),
  removerFoto: seguro(async (req, res) => {
    await workonService.removerFoto(Number(req.params.id), usuarioAtual(req), Number(req.params.idFoto ?? req.params.id));
    res.status(204).end();
  }),
  reordenarFotos: seguro(async (req, res) => {
    await workonService.reordenarFotos(Number(req.params.id), usuarioAtual(req), req.body.ids);
    res.status(204).end();
  }),
  atualizarCapa: seguro(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Envie uma imagem no campo "image".');
    try {
      res.json(await workonService.atualizarCapa(Number(req.params.id), usuarioAtual(req), req.file));
    } catch (error) {
      await fs.unlink(req.file.path).catch(() => undefined);
      throw error;
    }
  }),
  removerCapa: seguro(async (req, res) => {
    await workonService.removerCapa(Number(req.params.id), usuarioAtual(req));
    res.status(204).end();
  }),
  publicarPrevia: seguro(async (req, res) => {
    res.status(201).json(await workonService.publicarPrevia(Number(req.params.id), usuarioAtual(req), req.body));
  }),
  compartilharEmClube: seguro(async (req, res) => {
    res.status(201).json(await workonService.compartilharEmClube(Number(req.params.id), usuarioAtual(req), Number(req.body.id_clube)));
  }),
};

export default WorkOnController;
