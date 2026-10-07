import prisma from "../database/prisma.js";
import { HttpError } from "../errors/HttpError.js";

type TipoClube = "genero" | "instrumento" | "daw" | "geral";

const TEXTO_AFINIDADE: Record<string, string> = {
  genero: "Você curte",
  instrumento: "Você toca",
  daw: "Você produz no",
};

function imagemPadrao(tipo: TipoClube, tag: string): string | null {
  if (tipo !== "daw") return null;
  const normalizada = tag.toLowerCase().replace(/[^a-z0-9]/g, "");
  const imagens: Record<string, string> = {
    ableton: "/images/clubes%20images/ableton_logo.jpg",
    cubase: "/images/clubes%20images/cubase_logo.svg",
    flstudio: "/images/clubes%20images/fl-studio_logo.png",
    garageband: "/images/clubes%20images/Garageband_logo.png",
    logicpro: "/images/clubes%20images/logic_logo.webp",
    protools: "/images/clubes%20images/protools_logo.svg",
    reaper: "/images/clubes%20images/reapper_logo.jpg",
    studioone: "/images/clubes%20images/studio-one_logo.webp",
  };
  return Object.entries(imagens).find(([nome]) => normalizada.includes(nome))?.[1] ?? null;
}

// ── Clubes padrão ─────────────────────────────────────────────────────────────
// Um clube por gênero, instrumento e DAW do catálogo, criado sob demanda e sem
// dono (id_criador nulo). Roda no máximo a cada 60 s, e cobre itens novos do catálogo.
let ultimaSemeadura = 0;
let semeando: Promise<void> | null = null;

const DESCRICAO_PADRAO: Record<string, (tag: string) => string> = {
  genero: (t) => `Para quem curte ${t}: referências, parcerias e troca de ideias.`,
  instrumento: (t) => `Para quem toca ${t}: dicas, setups e quem procura banda.`,
  daw: (t) => `Para quem produz no ${t}: truques, plugins e feedback de beats.`,
};

async function semearClubesPadrao(): Promise<void> {
  const [generos, instrumentos, daws, existentes] = await Promise.all([
    prisma.genero.findMany({ select: { nome: true } }),
    prisma.instrumento.findMany({ select: { nome: true } }),
    prisma.daw.findMany({ select: { nome: true } }),
    prisma.clube.findMany({ select: { nome: true, tipo: true, tag: true } }),
  ]);

  const nomesUsados = new Set(existentes.map((c) => c.nome));
  const jaExiste = new Set(existentes.map((c) => `${c.tipo}:${c.tag}`));

  const candidatos: { tipo: TipoClube; tag: string }[] = [
    ...generos.map((g) => ({ tipo: "genero" as const, tag: g.nome })),
    ...instrumentos.map((i) => ({ tipo: "instrumento" as const, tag: i.nome })),
    ...daws.map((d) => ({ tipo: "daw" as const, tag: d.nome })),
  ];

  for (const { tipo, tag } of candidatos) {
    if (jaExiste.has(`${tipo}:${tag}`)) continue;
    let nome = `Clube de ${tag}`;
    if (nomesUsados.has(nome)) nome = `Clube de ${tag} (${tipo})`;
    try {
      await prisma.clube.create({
        data: {
          nome,
          tipo,
          tag,
          imagem: imagemPadrao(tipo, tag),
          descricao: DESCRICAO_PADRAO[tipo](tag),
        },
      });
      nomesUsados.add(nome);
    } catch {
      // Corrida com outra requisição criando o mesmo clube: ignorar.
    }
  }
}

export async function garantirClubesPadrao(): Promise<void> {
  if (Date.now() - ultimaSemeadura < 60_000) return;
  semeando ??= semearClubesPadrao()
    .then(() => {
      ultimaSemeadura = Date.now();
    })
    .finally(() => {
      semeando = null;
    });
  await semeando;
}

// ── Mapeamento ────────────────────────────────────────────────────────────────
function includeClube(id_usuario: number) {
  return {
    _count: { select: { membros: true } },
    // Só a linha do próprio usuário: serve para saber se ele participa.
    membros: { where: { id_usuario }, select: { id_usuario: true } },
  } as const;
}

function mapClube(c: any, id_usuario: number) {
  return {
    id_clube: c.id_clube as number,
    nome: c.nome as string,
    descricao: c.descricao as string | null,
    tipo: c.tipo as TipoClube,
    tag: c.tag as string | null,
    imagem: c.imagem as string | null,
    criado_em: c.criado_em as Date,
    total_membros: c._count.membros as number,
    participa: (c.membros?.length ?? 0) > 0,
    eh_dono: c.id_criador === id_usuario,
    padrao: c.id_criador === null,
  };
}

const norm = (v: string) => v.trim().toLowerCase();

// ── Consultas ─────────────────────────────────────────────────────────────────
async function listar(
  id_usuario: number,
  filtros: { q?: string; tipo?: string } = {},
) {
  await garantirClubesPadrao();
  const rows = await prisma.clube.findMany({
    where: {
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.q ? { nome: { contains: filtros.q } } : {}),
    },
    include: includeClube(id_usuario),
    take: 200,
  });
  return rows
    .map((c) => mapClube(c, id_usuario))
    .sort(
      (a, b) =>
        b.total_membros - a.total_membros || a.nome.localeCompare(b.nome),
    );
}

/**
 * Recomendação por afinidade: clube de gênero, instrumento ou DAW que o usuário
 * declarou no perfil vem primeiro (com o motivo). Se sobrar espaço, completa com
 * os clubes mais populares. Clubes em que ele já participa ficam de fora.
 */
async function recomendados(id_usuario: number, limite = 12) {
  await garantirClubesPadrao();

  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario },
    include: {
      instrumentos: { include: { instrumento: true } },
      generos: { include: { genero: true } },
      daws: { include: { daw: true } },
    },
  });
  if (!usuario) throw new HttpError(404, "Usuário não encontrado.");

  const afinidades: Record<string, Set<string>> = {
    genero: new Set(usuario.generos.map((g) => norm(g.genero.nome))),
    instrumento: new Set(
      usuario.instrumentos.map((i) => norm(i.instrumento.nome)),
    ),
    daw: new Set(usuario.daws.map((d) => norm(d.daw.nome))),
  };

  const rows = await prisma.clube.findMany({
    where: { membros: { none: { id_usuario } } },
    include: includeClube(id_usuario),
    take: 300,
  });

  const pontuados = rows.map((c) => {
    const mapeado = mapClube(c, id_usuario);
    const combina =
      mapeado.tag !== null && afinidades[mapeado.tipo]?.has(norm(mapeado.tag));
    return {
      ...mapeado,
      afinidade: combina ? 1 : 0,
      motivo: combina
        ? `${TEXTO_AFINIDADE[mapeado.tipo]} ${mapeado.tag}`
        : null,
    };
  });

  return pontuados
    .sort(
      (a, b) =>
        b.afinidade - a.afinidade ||
        b.total_membros - a.total_membros ||
        a.nome.localeCompare(b.nome),
    )
    .slice(0, limite);
}

async function meus(id_usuario: number) {
  const vinculos = await prisma.clubeMembro.findMany({
    where: { id_usuario },
    orderBy: { entrou_em: "desc" },
    include: { clube: { include: includeClube(id_usuario) } },
  });
  return vinculos.map((v) => mapClube(v.clube, id_usuario));
}

// Dado público (aparece no perfil): só o essencial de cada clube.
async function doUsuario(id_usuario: number) {
  const vinculos = await prisma.clubeMembro.findMany({
    where: { id_usuario },
    orderBy: { entrou_em: "desc" },
    include: {
      clube: {
        select: { id_clube: true, nome: true, tipo: true, tag: true, imagem: true },
      },
    },
  });
  return vinculos.map((v) => v.clube);
}

async function detalhe(id_clube: number, id_usuario: number) {
  const clube = await prisma.clube.findUnique({
    where: { id_clube },
    include: includeClube(id_usuario),
  });
  if (!clube) throw new HttpError(404, "Clube não encontrado.");

  const membros = await prisma.clubeMembro.findMany({
    where: { id_clube },
    orderBy: { entrou_em: "asc" },
    take: 30,
    include: {
      usuario: {
        select: {
          id_usuario: true,
          nome_artistico: true,
          nome_completo: true,
          imagem: { select: { caminho: true } },
        },
      },
    },
  });

  return {
    ...mapClube(clube, id_usuario),
    membros: membros.map((m) => ({
      id_usuario: m.usuario.id_usuario,
      nome: m.usuario.nome_artistico || m.usuario.nome_completo,
      foto: m.usuario.imagem?.caminho ?? null,
      papel: m.papel,
    })),
  };
}

// ── Escrita ───────────────────────────────────────────────────────────────────
async function criar(
  id_usuario: number,
  dados: { nome: string; descricao?: string; tipo: TipoClube; tag?: string },
) {
  const existente = await prisma.clube.findUnique({ where: { nome: dados.nome } });
  if (existente)
    throw new HttpError(409, "Já existe um clube com esse nome.", [
      { code: "custom", path: ["body", "nome"], message: "Já existe um clube com esse nome." },
    ]);

  const clube = await prisma.clube.create({
    data: {
      nome: dados.nome,
      descricao: dados.descricao || null,
      tipo: dados.tipo,
      tag: dados.tipo === "geral" ? null : (dados.tag ?? null),
      id_criador: id_usuario,
      membros: { create: { id_usuario, papel: "dono" } },
    },
    include: includeClube(id_usuario),
  });
  return mapClube(clube, id_usuario);
}

async function salvarImagem(
  id_clube: number,
  id_usuario: number,
  imagem: string,
) {
  const anterior = await prisma.clube.findUnique({
    where: { id_clube },
    select: { id_criador: true, imagem: true },
  });
  if (!anterior) throw new HttpError(404, "Clube não encontrado.");
  if (anterior.id_criador !== id_usuario)
    throw new HttpError(403, "Só o dono pode alterar a imagem do clube.");

  const clube = await prisma.clube.update({
    where: { id_clube },
    data: { imagem },
    include: includeClube(id_usuario),
  });
  return { clube: mapClube(clube, id_usuario), imagemAnterior: anterior.imagem };
}

async function entrar(id_clube: number, id_usuario: number) {
  const clube = await prisma.clube.findUnique({ where: { id_clube } });
  if (!clube) throw new HttpError(404, "Clube não encontrado.");
  await prisma.clubeMembro.upsert({
    where: { id_clube_id_usuario: { id_clube, id_usuario } },
    create: { id_clube, id_usuario },
    update: {},
  });
  return detalhe(id_clube, id_usuario);
}

async function sair(id_clube: number, id_usuario: number) {
  const vinculo = await prisma.clubeMembro.findUnique({
    where: { id_clube_id_usuario: { id_clube, id_usuario } },
  });
  if (!vinculo) throw new HttpError(404, "Você não participa deste clube.");
  if (vinculo.papel === "dono")
    throw new HttpError(
      400,
      "O dono não pode sair do clube. Exclua o clube se quiser encerrá-lo.",
    );
  await prisma.clubeMembro.delete({
    where: { id_clube_id_usuario: { id_clube, id_usuario } },
  });
}

async function remover(id_clube: number, id_usuario: number) {
  const clube = await prisma.clube.findUnique({ where: { id_clube } });
  if (!clube) throw new HttpError(404, "Clube não encontrado.");
  if (clube.id_criador !== id_usuario)
    throw new HttpError(403, "Só o dono pode excluir o clube.");
  await prisma.clube.delete({ where: { id_clube } });
  return clube.imagem;
}

// ── Chat ──────────────────────────────────────────────────────────────────────
async function exigirMembro(id_clube: number, id_usuario: number) {
  const clube = await prisma.clube.findUnique({
    where: { id_clube },
    select: { id_clube: true },
  });
  if (!clube) throw new HttpError(404, "Clube não encontrado.");
  const vinculo = await prisma.clubeMembro.findUnique({
    where: { id_clube_id_usuario: { id_clube, id_usuario } },
  });
  if (!vinculo)
    throw new HttpError(403, "Entre no clube para participar do chat.");
}

const includeAutorMensagem = {
  usuario: {
    select: {
      id_usuario: true,
      nome_artistico: true,
      nome_completo: true,
      imagem: { select: { caminho: true } },
    },
  },
} as const;

function mapMensagem(m: any, id_usuario: number) {
  return {
    id_mensagem: m.id_mensagem as number,
    texto: m.texto as string,
    criado_em: m.criado_em as Date,
    minha: m.id_usuario === id_usuario,
    autor: {
      id_usuario: m.usuario.id_usuario as number,
      nome: (m.usuario.nome_artistico || m.usuario.nome_completo) as string,
      foto: (m.usuario.imagem?.caminho ?? null) as string | null,
    },
  };
}

async function buscarNoClube(id_clube: number, id_usuario: number, q: string) {
  await exigirMembro(id_clube, id_usuario);
  const [membros, mensagens] = await Promise.all([
    prisma.clubeMembro.findMany({
      where: {
        id_clube,
        usuario: {
          is: {
            OR: [
              { nome_artistico: { contains: q } },
              { nome_completo: { contains: q } },
            ],
          },
        },
      },
      orderBy: { entrou_em: "asc" },
      take: 20,
      select: {
        id_usuario: true,
        papel: true,
        usuario: {
          select: {
            id_usuario: true,
            nome_artistico: true,
            nome_completo: true,
            imagem: { select: { caminho: true } },
          },
        },
      },
    }),
    prisma.clubeMensagem.findMany({
      where: { id_clube, texto: { contains: q } },
      orderBy: { id_mensagem: "desc" },
      take: 20,
      include: includeAutorMensagem,
    }),
  ]);

  return {
    membros: membros.map((m) => ({
      id_usuario: m.usuario.id_usuario,
      nome: m.usuario.nome_artistico || m.usuario.nome_completo,
      foto: m.usuario.imagem?.caminho ?? null,
    })),
    mensagens: mensagens.map((m) => mapMensagem(m, id_usuario)),
  };
}

/** Sem `depois`: as 50 últimas. Com `depois`: só o que chegou após esse id (polling). */
async function listarMensagens(
  id_clube: number,
  id_usuario: number,
  depois?: number,
) {
  await exigirMembro(id_clube, id_usuario);
  if (depois !== undefined) {
    const novas = await prisma.clubeMensagem.findMany({
      where: { id_clube, id_mensagem: { gt: depois } },
      orderBy: { id_mensagem: "asc" },
      take: 100,
      include: includeAutorMensagem,
    });
    return novas.map((m) => mapMensagem(m, id_usuario));
  }
  const recentes = await prisma.clubeMensagem.findMany({
    where: { id_clube },
    orderBy: { id_mensagem: "desc" },
    take: 50,
    include: includeAutorMensagem,
  });
  return recentes.reverse().map((m) => mapMensagem(m, id_usuario));
}

async function enviarMensagem(
  id_clube: number,
  id_usuario: number,
  texto: string,
) {
  await exigirMembro(id_clube, id_usuario);
  const m = await prisma.clubeMensagem.create({
    data: { id_clube, id_usuario, texto },
    include: includeAutorMensagem,
  });
  return mapMensagem(m, id_usuario);
}

export default {
  listar,
  recomendados,
  meus,
  doUsuario,
  detalhe,
  criar,
  salvarImagem,
  entrar,
  sair,
  remover,
  buscarNoClube,
  listarMensagens,
  enviarMensagem,
};
