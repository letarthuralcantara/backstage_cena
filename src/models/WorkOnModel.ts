import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../database/prisma.js";
import { HttpError } from "../errors/HttpError.js";
import clubeService from "./ClubeModel.js";
import { podeEditarProjeto, podeGerenciarMembros, podeLerMembro, podeMudarVisibilidade } from "../services/workonPermissoes.js";
import { audioTemAssinaturaValida } from "../utils/audio.js";

const includeDono = {
  dono: {
    select: {
      id_usuario: true,
      nome_artistico: true,
      nome_completo: true,
      imagem: { select: { caminho: true } },
    },
  },
} as const;

function getPapelMembro(membros: Array<{ id_usuario: number; papel: string }> = [], idUsuario: number) {
  const membro = membros.find((m) => m.id_usuario === idUsuario);
  return membro?.papel ?? null;
}

function mapBase(workOn: any, idConsulta = 0) {
  const papel = getPapelMembro(workOn.membros ?? [], idConsulta);
  const isMembro = Boolean(papel);
  const isDono = workOn.id_dono === idConsulta;
  const tokenVisible = isDono || papel === "editor" || papel === "ouvinte";
  const base = {
    id_workon: workOn.id_workon,
    id_dono: workOn.id_dono,
    titulo: workOn.titulo,
    descricao: workOn.descricao,
    tipo: workOn.tipo,
    status: workOn.status,
    visibilidade: workOn.visibilidade,
    icone: workOn.icone,
    capa: workOn.capa,
    daw: workOn.daw,
    genero: workOn.genero,
    prazo: workOn.prazo,
    notas: workOn.notas,
    criado_em: workOn.criado_em,
    atualizado_em: workOn.atualizado_em,
    total_membros: Number(workOn._count?.membros ?? workOn.membros?.length ?? 0),
    papel: papel ?? (isDono ? "dono" : null),
    eh_dono: isDono,
    detalhes_publicos: !isMembro && workOn.visibilidade === "publico",
    token_convite: tokenVisible ? workOn.token_convite ?? null : null,
    dono: {
      id_usuario: workOn.dono.id_usuario,
      nome: workOn.dono.nome_artistico || workOn.dono.nome_completo,
      imagem: workOn.dono.imagem?.caminho ?? null,
    },
  };

  if (!isMembro && workOn.visibilidade !== "publico") {
    return {
      ...base,
      descricao: null,
      notas: null,
      capa: null,
      daw: null,
      genero: null,
      prazo: null,
      token_convite: null,
    };
  }
  return base;
}

async function exigirProjeto(id_workon: number) {
  const workOn = await prisma.workOn.findUnique({
    where: { id_workon },
    include: {
      dono: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
      membros: { select: { id_usuario: true, papel: true } },
      _count: { select: { membros: true } },
    },
  });
  if (!workOn) throw new HttpError(404, "Work On não encontrado.");
  return workOn;
}

async function getAcao(idUsuario: number, idWorkon: number) {
  const projeto = await exigirProjeto(idWorkon);
  const papel = getPapelMembro(projeto.membros, idUsuario) ?? (projeto.id_dono === idUsuario ? "dono" : null);
  return { projeto, papel };
}

function validarTipo(tipo: string | undefined) {
  if (tipo && !["album", "ep", "single", "beat_tape", "outro"].includes(tipo)) {
    throw new HttpError(400, "Tipo de projeto inválido.");
  }
}

async function listarPublicos(params: { q?: string; status?: string; genero?: string; tipo?: string; cursor?: number; limite?: number }, idUsuario?: number) {
  const limite = Math.min(params.limite ?? 20, 50);
  const cursor = params.cursor ?? 0;
  const where: any = { visibilidade: "publico" };
  if (params.q) where.titulo = { contains: params.q.trim() };
  if (params.status) where.status = params.status;
  if (params.genero) where.genero = { contains: params.genero.trim() };
  if (params.tipo) where.tipo = params.tipo;
  const workOns = await prisma.workOn.findMany({
    where,
    orderBy: { atualizado_em: "desc" },
    skip: cursor,
    take: limite,
    include: {
      dono: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
      membros: { select: { id_usuario: true, papel: true } },
      _count: { select: { membros: true } },
    },
  });
  return workOns.map((item) => mapBase(item, idUsuario ?? 0));
}

async function meus(idUsuario: number) {
  const workOns = await prisma.workOn.findMany({
    where: { membros: { some: { id_usuario: idUsuario } } },
    orderBy: { atualizado_em: "desc" },
    include: {
      dono: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
      membros: { select: { id_usuario: true, papel: true } },
      _count: { select: { membros: true } },
    },
  });
  return workOns.map((item) => ({
    ...mapBase(item, idUsuario),
    papel: getPapelMembro(item.membros, idUsuario) ?? (item.id_dono === idUsuario ? "dono" : null),
  }));
}

async function doUsuario(idUsuario: number, usuarioConsulta?: number) {
  const where: any = { id_dono: idUsuario, visibilidade: "publico" };
  const list = await prisma.workOn.findMany({
    where,
    orderBy: { atualizado_em: "desc" },
    include: {
      dono: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
      membros: { select: { id_usuario: true, papel: true } },
      _count: { select: { membros: true } },
    },
  });
  const data = list.map((item) => ({ ...mapBase(item, usuarioConsulta ?? 0) }));
  if (usuarioConsulta) {
    const compartilhados = await prisma.workOn.findMany({
      where: { membros: { some: { id_usuario: usuarioConsulta, workOn: { id_dono: idUsuario } } } },
      orderBy: { atualizado_em: "desc" },
      include: {
        dono: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
        membros: { select: { id_usuario: true, papel: true } },
        _count: { select: { membros: true } },
      },
    });
    return [...data, ...compartilhados.map((item) => mapBase(item, usuarioConsulta))];
  }
  return data;
}

async function criar(idUsuario: number, dados: any) {
  const titulo = String(dados.titulo ?? "").trim();
  if (titulo.length < 3) throw new HttpError(400, "O título deve ter ao menos 3 caracteres.");
  validarTipo(dados.tipo);
  const visibilidade = dados.visibilidade ?? "publico";
  const workOn = await prisma.workOn.create({
    data: {
      id_dono: idUsuario,
      titulo,
      descricao: dados.descricao?.trim() || null,
      tipo: dados.tipo ?? "outro",
      status: dados.status ?? "ideia",
      visibilidade,
      token_convite: visibilidade === "link" ? crypto.randomBytes(24).toString("hex") : null,
      icone: dados.icone?.trim() || null,
      capa: dados.capa || null,
      daw: dados.daw?.trim() || null,
      genero: dados.genero?.trim() || null,
      prazo: dados.prazo ? new Date(dados.prazo) : null,
      notas: dados.notas?.trim() || null,
    },
    include: {
      dono: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
      membros: { select: { id_usuario: true, papel: true } },
      _count: { select: { membros: true } },
    },
  });
  await prisma.workOnMembro.create({
    data: { id_workon: workOn.id_workon, id_usuario: idUsuario, papel: "dono" },
  });
  return mapBase({ ...workOn, membros: [{ id_usuario: idUsuario, papel: "dono" }], _count: { membros: 1 } }, idUsuario);
}

async function detalhe(idWorkon: number, idUsuario: number) {
  const workOn = await exigirProjeto(idWorkon);
  const papel = getPapelMembro(workOn.membros, idUsuario) ?? (workOn.id_dono === idUsuario ? "dono" : null);
  if (workOn.visibilidade === "link" && !podeLerMembro(papel)) {
    throw new HttpError(404, "Work On não encontrado.");
  }
  if (!podeLerMembro(papel)) return mapBase(workOn, idUsuario);

  const detalhes = await prisma.workOn.findUnique({
    where: { id_workon: idWorkon },
    include: {
      dono: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
      membros: {
        include: {
          usuario: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
        },
        orderBy: { entrou_em: "asc" },
      },
      faixas: {
        include: { versoes: { orderBy: { numero: "desc" } } },
        orderBy: { ordem: "asc" },
      },
      tarefas: {
        include: {
          responsavel: { select: { id_usuario: true, nome_artistico: true, nome_completo: true } },
        },
        orderBy: { ordem: "asc" },
      },
      fotos: { orderBy: { ordem: "asc" } },
      _count: { select: { membros: true } },
    },
  });
  if (!detalhes) throw new HttpError(404, "Work On não encontrado.");
  return {
    ...mapBase(detalhes, idUsuario),
    pode_editar: podeEditarProjeto(papel),
    membros: detalhes.membros.map((membro) => ({
      id_usuario: membro.id_usuario,
      papel: membro.papel,
      usuario: {
        id_usuario: membro.usuario.id_usuario,
        nome: membro.usuario.nome_artistico || membro.usuario.nome_completo,
        imagem: membro.usuario.imagem?.caminho ?? null,
      },
    })),
    faixas: detalhes.faixas.map((faixa) => ({
      id_faixa: faixa.id_faixa,
      titulo: faixa.titulo,
      ordem: faixa.ordem,
      bpm: faixa.bpm,
      tom: faixa.tom,
      notas: faixa.notas,
      versoes: faixa.versoes.map((versao) => ({
        id_versao: versao.id_versao,
        numero: versao.numero,
        rotulo: versao.rotulo,
        observacao: versao.observacao,
        mime: versao.mime,
        tamanho_bytes: versao.tamanho_bytes,
        criado_em: versao.criado_em,
      })),
    })),
    tarefas: detalhes.tarefas.map((tarefa) => ({
      ...tarefa,
      responsavel: tarefa.responsavel
        ? {
            id_usuario: tarefa.responsavel.id_usuario,
            nome: tarefa.responsavel.nome_artistico || tarefa.responsavel.nome_completo,
          }
        : null,
    })),
    fotos: detalhes.fotos,
  };
}

async function resumo(idWorkon: number, idUsuario: number) {
  const workOn = await exigirProjeto(idWorkon);
  const papel = getPapelMembro(workOn.membros, idUsuario) ?? (workOn.id_dono === idUsuario ? "dono" : null);
  if (workOn.visibilidade === "link" && !podeLerMembro(papel)) throw new HttpError(404, "Work On não encontrado.");
  if (!podeLerMembro(papel) && workOn.visibilidade !== "publico") throw new HttpError(404, "Work On não encontrado.");
  return {
    id_workon: workOn.id_workon,
    titulo: workOn.titulo,
    capa: workOn.capa,
    icone: workOn.icone,
    status: workOn.status,
    tipo: workOn.tipo,
    visibilidade: workOn.visibilidade,
    total_membros: Number(workOn._count?.membros ?? workOn.membros.length),
    dono: {
      id_usuario: workOn.dono.id_usuario,
      nome: workOn.dono.nome_artistico || workOn.dono.nome_completo,
      imagem: workOn.dono.imagem?.caminho ?? null,
    },
  };
}

async function atualizar(idWorkon: number, idUsuario: number, dados: any) {
  const { projeto, papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode editar este projeto.");
  if (dados.visibilidade !== undefined && !podeMudarVisibilidade(papel)) throw new HttpError(403, "Apenas o dono pode alterar a visibilidade.");
  if (dados.tipo !== undefined) validarTipo(dados.tipo);
  const data: any = {};
  if (dados.titulo !== undefined) data.titulo = String(dados.titulo).trim();
  if (dados.descricao !== undefined) data.descricao = dados.descricao === null ? null : String(dados.descricao).trim();
  if (dados.tipo !== undefined) data.tipo = dados.tipo;
  if (dados.status !== undefined) data.status = dados.status;
  if (dados.visibilidade !== undefined) data.visibilidade = dados.visibilidade;
  if (dados.icone !== undefined) data.icone = dados.icone === null ? null : String(dados.icone).trim();
  if (dados.daw !== undefined) data.daw = dados.daw === null ? null : String(dados.daw).trim();
  if (dados.genero !== undefined) data.genero = dados.genero === null ? null : String(dados.genero).trim();
  if (dados.prazo !== undefined) data.prazo = dados.prazo === null ? null : new Date(dados.prazo);
  if (dados.notas !== undefined) data.notas = dados.notas === null ? null : String(dados.notas).trim();
  if (dados.token_convite !== undefined) data.token_convite = dados.token_convite === null ? null : String(dados.token_convite).trim();
  if (data.titulo && data.titulo.length < 3) throw new HttpError(400, "O título deve ter ao menos 3 caracteres.");
  const atualizado = await prisma.workOn.update({
    where: { id_workon: idWorkon },
    data,
    include: {
      dono: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } },
      membros: { select: { id_usuario: true, papel: true } },
      _count: { select: { membros: true } },
    },
  });
  return mapBase({ ...atualizado, _count: { membros: atualizado._count?.membros ?? 0 } }, idUsuario);
}

async function remover(idWorkon: number, idUsuario: number) {
  const { projeto, papel } = await getAcao(idUsuario, idWorkon);
  if (papel !== "dono") throw new HttpError(403, "Apenas o dono pode excluir o projeto.");
  const fotos = await prisma.workOnFoto.findMany({ where: { id_workon: idWorkon }, select: { caminho: true } });
  const fotosParaRemover = fotos.map((foto) => foto.caminho).filter((c) => c.startsWith("/uploads/workon/"));
  await prisma.workOn.delete({ where: { id_workon: idWorkon } });
  await Promise.all(fotosParaRemover.map((c) => fs.unlink(path.join(process.cwd(), "public", c.replace(/^\//, ""))).catch(() => undefined)));
  if (projeto.capa) {
    await fs.unlink(path.join(process.cwd(), "public", projeto.capa.replace(/^\//, ""))).catch(() => undefined);
  }
}

async function entrar(idWorkon: number, idUsuario: number) {
  const projeto = await exigirProjeto(idWorkon);
  const papel = getPapelMembro(projeto.membros, idUsuario);
  if (papel) return { ...mapBase(projeto, idUsuario), papel };
  if (projeto.visibilidade !== "publico") throw new HttpError(403, "Este projeto não está disponível para entrada pública.");
  const membro = await prisma.workOnMembro.create({
    data: { id_workon: idWorkon, id_usuario: idUsuario, papel: "ouvinte" },
  });
  return { ok: true, papel: membro.papel, id_workon: idWorkon };
}

async function entrarPorConvite(token: string, idUsuario: number) {
  const projeto = await prisma.workOn.findFirst({
    where: { token_convite: token },
    include: { membros: { select: { id_usuario: true, papel: true } } },
  });
  if (!projeto) throw new HttpError(404, "Convite inválido.");
  if (projeto.membros.some((m) => m.id_usuario === idUsuario)) return { ok: true, papel: projeto.membros.find((m) => m.id_usuario === idUsuario)?.papel ?? "ouvinte" };
  await prisma.workOnMembro.create({ data: { id_workon: projeto.id_workon, id_usuario: idUsuario, papel: "ouvinte" } });
  return { ok: true, papel: "ouvinte" };
}

async function sair(idWorkon: number, idUsuario: number) {
  const { projeto, papel } = await getAcao(idUsuario, idWorkon);
  if (papel === "dono") throw new HttpError(403, "O dono não pode sair do projeto.");
  if (!papel) throw new HttpError(404, "Você não é membro deste trabalho.");
  await prisma.workOnMembro.delete({ where: { id_workon_id_usuario: { id_workon: idWorkon, id_usuario: idUsuario } } });
}

async function gerarConvite(idWorkon: number, idUsuario: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (papel !== "dono") throw new HttpError(403, "Apenas o dono pode gerar o convite.");
  const token = crypto.randomBytes(24).toString("hex");
  const workOn = await prisma.workOn.update({ where: { id_workon: idWorkon }, data: { token_convite: token, visibilidade: "link" } });
  return { token, visibilidade: workOn.visibilidade };
}

async function revogarConvite(idWorkon: number, idUsuario: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (papel !== "dono") throw new HttpError(403, "Apenas o dono pode revogar o convite.");
  await prisma.workOn.update({ where: { id_workon: idWorkon }, data: { token_convite: null } });
}

async function listarMembros(idWorkon: number, idUsuario: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeLerMembro(papel) && papel !== "dono") throw new HttpError(403, "Você não pode ver os membros deste projeto.");
  const membros = await prisma.workOnMembro.findMany({
    where: { id_workon: idWorkon },
    include: { usuario: { select: { id_usuario: true, nome_artistico: true, nome_completo: true, imagem: { select: { caminho: true } } } } },
    orderBy: { entrou_em: "asc" },
  });
  return membros.map((m) => ({
    id_usuario: m.id_usuario,
    papel: m.papel,
    entrou_em: m.entrou_em,
    usuario: { id_usuario: m.usuario.id_usuario, nome: m.usuario.nome_artistico || m.usuario.nome_completo, imagem: m.usuario.imagem?.caminho ?? null },
  }));
}

async function adicionarMembro(idWorkon: number, idUsuario: number, idUsuarioAlvo: number, papel: string) {
  const { papel: papelAtual } = await getAcao(idUsuario, idWorkon);
  if (!podeGerenciarMembros(papelAtual)) throw new HttpError(403, "Apenas o dono pode gerenciar membros.");
  if (!["editor", "ouvinte"].includes(papel)) throw new HttpError(400, "Papel inválido.");
  const usuario = await prisma.usuario.findUnique({ where: { id_usuario: idUsuarioAlvo } });
  if (!usuario) throw new HttpError(404, "Usuário não encontrado.");
  await prisma.workOnMembro.upsert({
    where: { id_workon_id_usuario: { id_workon: idWorkon, id_usuario: idUsuarioAlvo } },
    create: { id_workon: idWorkon, id_usuario: idUsuarioAlvo, papel },
    update: { papel },
  });
  return { id_workon: idWorkon, id_usuario: idUsuarioAlvo, papel };
}

async function atualizarMembro(idWorkon: number, idUsuario: number, idUsuarioAlvo: number, papel: string) {
  const { papel: papelAtual } = await getAcao(idUsuario, idWorkon);
  if (!podeGerenciarMembros(papelAtual)) throw new HttpError(403, "Apenas o dono pode alterar papéis.");
  if (!["editor", "ouvinte"].includes(papel)) throw new HttpError(400, "Papel inválido.");
  const membro = await prisma.workOnMembro.findUnique({ where: { id_workon_id_usuario: { id_workon: idWorkon, id_usuario: idUsuarioAlvo } } });
  if (!membro) throw new HttpError(404, "Membro não encontrado.");
  const atual = await prisma.workOnMembro.update({
    where: { id_workon_id_usuario: { id_workon: idWorkon, id_usuario: idUsuarioAlvo } },
    data: { papel },
  });
  return atual;
}

async function removerMembro(idWorkon: number, idUsuario: number, idUsuarioAlvo: number) {
  const { papel: papelAtual } = await getAcao(idUsuario, idWorkon);
  if (!podeGerenciarMembros(papelAtual)) throw new HttpError(403, "Apenas o dono pode remover membros.");
  const membro = await prisma.workOnMembro.findUnique({ where: { id_workon_id_usuario: { id_workon: idWorkon, id_usuario: idUsuarioAlvo } } });
  if (!membro) throw new HttpError(404, "Membro não encontrado.");
  if (membro.papel === "dono") throw new HttpError(403, "O dono não pode ser removido.");
  await prisma.workOnMembro.delete({ where: { id_workon_id_usuario: { id_workon: idWorkon, id_usuario: idUsuarioAlvo } } });
}

async function criarFaixa(idWorkon: number, idUsuario: number, dados: any) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode editar faixas neste projeto.");
  const ultima = await prisma.workOnFaixa.findFirst({ where: { id_workon: idWorkon }, orderBy: { ordem: "desc" } });
  const faixa = await prisma.workOnFaixa.create({
    data: {
      id_workon: idWorkon,
      titulo: String(dados.titulo ?? "Nova faixa").trim(),
      ordem: Number(dados.ordem ?? (ultima?.ordem ?? 0) + 1),
      bpm: dados.bpm ? Number(dados.bpm) : null,
      tom: dados.tom ? String(dados.tom).trim() : null,
      notas: dados.notas ? String(dados.notas).trim() : null,
    },
  });
  return faixa;
}

async function atualizarFaixa(idWorkon: number, idUsuario: number, idFaixa: number, dados: any) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode editar faixas neste projeto.");
  const faixa = await prisma.workOnFaixa.findUnique({ where: { id_faixa: idFaixa } });
  if (!faixa || faixa.id_workon !== idWorkon) throw new HttpError(404, "Faixa não encontrada.");
  const atual = await prisma.workOnFaixa.update({
    where: { id_faixa: idFaixa },
    data: {
      titulo: dados.titulo !== undefined ? String(dados.titulo).trim() : undefined,
      ordem: dados.ordem !== undefined ? Number(dados.ordem) : undefined,
      bpm: dados.bpm !== undefined ? Number(dados.bpm) : undefined,
      tom: dados.tom !== undefined ? String(dados.tom).trim() : undefined,
      notas: dados.notas !== undefined ? String(dados.notas).trim() : undefined,
    },
  });
  return atual;
}

async function removerFaixa(idWorkon: number, idUsuario: number, idFaixa: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode remover faixas deste projeto.");
  const faixa = await prisma.workOnFaixa.findUnique({ where: { id_faixa: idFaixa } });
  if (!faixa || faixa.id_workon !== idWorkon) throw new HttpError(404, "Faixa não encontrada.");
  await prisma.workOnFaixa.delete({ where: { id_faixa: idFaixa } });
}

async function reordenarFaixas(idWorkon: number, idUsuario: number, ids: number[]) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode reordenar faixas deste projeto.");
  const faixas = await prisma.workOnFaixa.findMany({ where: { id_workon: idWorkon }, select: { id_faixa: true, ordem: true } });
  await Promise.all(ids.map(async (id, index) => {
    const item = faixas.find((f) => f.id_faixa === id);
    if (!item) return;
    await prisma.workOnFaixa.update({ where: { id_faixa: id }, data: { ordem: index + 1 } });
  }));
}

async function criarVersao(idWorkon: number, idUsuario: number, idFaixa: number, file: Express.Multer.File, dados: any) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode adicionar versões neste projeto.");
  const faixa = await prisma.workOnFaixa.findUnique({ where: { id_faixa: idFaixa } });
  if (!faixa || faixa.id_workon !== idWorkon) throw new HttpError(404, "Faixa não encontrada.");
  const arquivo = await fs.open(file.path, "r");
  const assinatura = Buffer.alloc(12);
  try {
    await arquivo.read(assinatura, 0, assinatura.length, 0);
  } finally {
    await arquivo.close();
  }
  if (!audioTemAssinaturaValida(assinatura)) {
    throw new HttpError(400, "O conteúdo do arquivo não corresponde a um áudio válido.", [
      { code: "custom", path: ["body", "audio"], message: "O conteúdo do arquivo não corresponde a um áudio válido." },
    ]);
  }
  const nomeArquivo = `${crypto.randomBytes(16).toString("hex")}${path.extname(file.originalname || ".bin")}`;
  const destino = path.resolve(process.cwd(), "storage", "workon", "audio", nomeArquivo);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.copyFile(file.path, destino);
  await fs.unlink(file.path).catch(() => undefined);
  const numero = (await prisma.workOnVersao.findMany({ where: { id_faixa: idFaixa }, select: { numero: true } })).length + 1;
  const criada = await prisma.workOnVersao.create({
    data: {
      id_faixa: idFaixa,
      numero,
      rotulo: dados.rotulo ? String(dados.rotulo).trim() : null,
      observacao: dados.observacao ? String(dados.observacao).trim() : null,
      arquivo: nomeArquivo,
      mime: file.mimetype,
      tamanho_bytes: file.size,
      id_autor: idUsuario,
    },
  });
  return criada;
}

async function removerVersao(idWorkon: number, idUsuario: number, idVersao: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode remover versões deste projeto.");
  const versao = await prisma.workOnVersao.findUnique({ where: { id_versao: idVersao }, include: { faixa: true } });
  if (!versao || versao.faixa.id_workon !== idWorkon) throw new HttpError(404, "Versão não encontrada.");
  const alvo = path.resolve(process.cwd(), "storage", "workon", "audio", versao.arquivo);
  await fs.unlink(alvo).catch(() => undefined);
  await prisma.workOnVersao.delete({ where: { id_versao: idVersao } });
}

async function urlVersao(idWorkon: number, idUsuario: number, idVersao: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeLerMembro(papel)) throw new HttpError(403, "Você precisa ser membro do projeto para acessar esta versão.");
  const versao = await prisma.workOnVersao.findUnique({
    where: { id_versao: idVersao },
    include: { faixa: true },
  });
  if (!versao || versao.faixa.id_workon !== idWorkon) throw new HttpError(404, "Versão não encontrada.");
  const secret = process.env.WORKON_FILE_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("WORKON_FILE_SECRET não configurado.");
  const exp = Math.floor(Date.now() / 1000) + 10 * 60;
  const payload = { nome: versao.arquivo, exp };
  const token = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  return { url: `/api/workons/arquivos/${encodeURIComponent(token)}?nome=${encodeURIComponent(versao.arquivo)}&exp=${exp}` };
}

async function criarTarefa(idWorkon: number, idUsuario: number, dados: any) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode editar tarefas neste projeto.");
  const ultima = await prisma.workOnTarefa.findFirst({ where: { id_workon: idWorkon }, orderBy: { ordem: "desc" } });
  const tarefa = await prisma.workOnTarefa.create({
    data: {
      id_workon: idWorkon,
      texto: String(dados.texto ?? "").trim(),
      feita: !!dados.feita,
      prazo: dados.prazo ? new Date(dados.prazo) : null,
      ordem: Number(dados.ordem ?? (ultima?.ordem ?? 0) + 1),
      id_responsavel: dados.id_responsavel ? Number(dados.id_responsavel) : null,
    },
  });
  return tarefa;
}

async function atualizarTarefa(idWorkon: number, idUsuario: number, idTarefa: number, dados: any) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode editar tarefas neste projeto.");
  const tarefa = await prisma.workOnTarefa.findUnique({ where: { id_tarefa: idTarefa } });
  if (!tarefa || tarefa.id_workon !== idWorkon) throw new HttpError(404, "Tarefa não encontrada.");
  return prisma.workOnTarefa.update({
    where: { id_tarefa: idTarefa },
    data: {
      texto: dados.texto !== undefined ? String(dados.texto).trim() : undefined,
      feita: dados.feita !== undefined ? Boolean(dados.feita) : undefined,
      prazo: dados.prazo !== undefined ? (dados.prazo === null ? null : new Date(dados.prazo)) : undefined,
      ordem: dados.ordem !== undefined ? Number(dados.ordem) : undefined,
      id_responsavel: dados.id_responsavel !== undefined ? (dados.id_responsavel === null ? null : Number(dados.id_responsavel)) : undefined,
    },
  });
}

async function removerTarefa(idWorkon: number, idUsuario: number, idTarefa: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode remover tarefas deste projeto.");
  const tarefa = await prisma.workOnTarefa.findUnique({ where: { id_tarefa: idTarefa } });
  if (!tarefa || tarefa.id_workon !== idWorkon) throw new HttpError(404, "Tarefa não encontrada.");
  await prisma.workOnTarefa.delete({ where: { id_tarefa: idTarefa } });
}

async function reordenarTarefas(idWorkon: number, idUsuario: number, ids: number[]) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode reordenar tarefas deste projeto.");
  await Promise.all(ids.map(async (id, index) => {
    await prisma.workOnTarefa.updateMany({ where: { id_tarefa: id, id_workon: idWorkon }, data: { ordem: index + 1 } });
  }));
}

async function criarFoto(idWorkon: number, idUsuario: number, file: Express.Multer.File, legenda?: string) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode adicionar fotos neste projeto.");
  const nomeArquivo = `${crypto.randomBytes(16).toString("hex")}${path.extname(file.originalname || ".png")}`;
  const destino = path.resolve(process.cwd(), "public", "uploads", "workon", "fotos", nomeArquivo);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.copyFile(file.path, destino);
  await fs.unlink(file.path).catch(() => undefined);
  const ultima = await prisma.workOnFoto.findFirst({ where: { id_workon: idWorkon }, orderBy: { ordem: "desc" } });
  const foto = await prisma.workOnFoto.create({
    data: { id_workon: idWorkon, caminho: `/uploads/workon/fotos/${nomeArquivo}`, legenda: legenda?.trim() || null, ordem: (ultima?.ordem ?? 0) + 1, id_autor: idUsuario },
  });
  return foto;
}

async function atualizarLegendaFoto(idWorkon: number, idUsuario: number, idFoto: number, legenda: string) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode alterar fotos neste projeto.");
  const foto = await prisma.workOnFoto.findUnique({ where: { id_foto: idFoto } });
  if (!foto || foto.id_workon !== idWorkon) throw new HttpError(404, "Foto não encontrada.");
  return prisma.workOnFoto.update({ where: { id_foto: idFoto }, data: { legenda: legenda.trim() || null } });
}

async function removerFoto(idWorkon: number, idUsuario: number, idFoto: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode remover fotos neste projeto.");
  const foto = await prisma.workOnFoto.findUnique({ where: { id_foto: idFoto } });
  if (!foto || foto.id_workon !== idWorkon) throw new HttpError(404, "Foto não encontrada.");
  await fs.unlink(path.join(process.cwd(), "public", foto.caminho.replace(/^\//, ""))).catch(() => undefined);
  await prisma.workOnFoto.delete({ where: { id_foto: idFoto } });
}

async function reordenarFotos(idWorkon: number, idUsuario: number, ids: number[]) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode reordenar fotos deste projeto.");
  await Promise.all(ids.map(async (id, index) => {
    await prisma.workOnFoto.updateMany({ where: { id_foto: id, id_workon: idWorkon }, data: { ordem: index + 1 } });
  }));
}

async function atualizarCapa(idWorkon: number, idUsuario: number, file: Express.Multer.File) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode definir capa deste projeto.");
  const nomeArquivo = `${crypto.randomBytes(16).toString("hex")}${path.extname(file.originalname || ".png")}`;
  const destino = path.resolve(process.cwd(), "public", "uploads", "workon", "capas", nomeArquivo);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.copyFile(file.path, destino);
  await fs.unlink(file.path).catch(() => undefined);
  const atual = await prisma.workOn.update({ where: { id_workon: idWorkon }, data: { capa: `/uploads/workon/capas/${nomeArquivo}` } });
  return atual;
}

async function removerCapa(idWorkon: number, idUsuario: number) {
  const { papel } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode remover a capa deste projeto.");
  const projeto = await prisma.workOn.findUnique({ where: { id_workon: idWorkon }, select: { capa: true } });
  if (projeto?.capa) {
    await fs.unlink(path.join(process.cwd(), "public", projeto.capa.replace(/^\//, ""))).catch(() => undefined);
  }
  await prisma.workOn.update({ where: { id_workon: idWorkon }, data: { capa: null } });
}

async function publicarPrevia(idWorkon: number, idUsuario: number, dados: any) {
  const { papel, projeto } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode publicar uma prévia deste projeto.");
  if (projeto.visibilidade !== "publico" && !dados.confirmar) throw new HttpError(403, "Esse projeto é privado. Confirme explicitamente para publicar uma prévia.");
  const versao = await prisma.workOnVersao.findFirst({ where: { faixa: { id_workon: idWorkon } }, orderBy: { id_versao: "desc" } });
  if (!versao) throw new HttpError(404, "Nenhuma versão disponível para publicar como prévia.");
  const source = path.resolve(process.cwd(), "storage", "workon", "audio", versao.arquivo);
  const destino = path.resolve(process.cwd(), "public", "uploads", "audio", `${crypto.randomBytes(12).toString("hex")}${path.extname(versao.arquivo)}`);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.copyFile(source, destino);
  const { default: postagemService } = await import("./PostagemModel.js");
  return postagemService.create({ id_usuario: idUsuario, titulo: projeto.titulo, audio_url: `/uploads/audio/${path.basename(destino)}`, inicio_seg: 0, duracao_seg: 30 });
}

async function compartilharEmClube(idWorkon: number, idUsuario: number, idClube: number) {
  const { papel, projeto } = await getAcao(idUsuario, idWorkon);
  if (!podeEditarProjeto(papel)) throw new HttpError(403, "Você não pode compartilhar este projeto.");
  const clube = await prisma.clube.findUnique({
    where: { id_clube: idClube },
    include: { membros: { where: { id_usuario: idUsuario }, select: { id_usuario: true } } },
  });
  if (!clube) throw new HttpError(404, "Clube não encontrado.");
  if (clube.membros.length === 0) throw new HttpError(403, "Você precisa ser membro do clube para compartilhar este projeto.");
  return clubeService.enviarMensagem(
    idClube,
    idUsuario,
    `Work On "${projeto.titulo}": /api/workons/${idWorkon}`,
  );
}

export default {
  listarPublicos,
  meus,
  doUsuario,
  criar,
  detalhe,
  resumo,
  atualizar,
  remover,
  entrar,
  entrarPorConvite,
  sair,
  gerarConvite,
  revogarConvite,
  listarMembros,
  adicionarMembro,
  atualizarMembro,
  removerMembro,
  criarFaixa,
  atualizarFaixa,
  removerFaixa,
  reordenarFaixas,
  criarVersao,
  removerVersao,
  urlVersao,
  criarTarefa,
  atualizarTarefa,
  removerTarefa,
  reordenarTarefas,
  criarFoto,
  atualizarLegendaFoto,
  removerFoto,
  reordenarFotos,
  atualizarCapa,
  removerCapa,
  publicarPrevia,
  compartilharEmClube,
};
