import { promises as fs } from "node:fs";
import path from "node:path";
import prisma from "../database/prisma.js";
import { HttpError } from "../errors/HttpError.js";
import {
  CAMINHO_PUBLICO_IMAGENS_TWEET,
  PASTA_IMAGENS_TWEET,
} from "../config/multer-tweet.js";

const includeAutor = {
  usuario: {
    select: {
      id_usuario: true,
      nome_artistico: true,
      nome_completo: true,
      imagem: { select: { caminho: true } },
    },
  },
} as const;

function mapTweet(t: any) {
  return {
    id_tweet: t.id_tweet,
    id_usuario: t.id_usuario,
    texto: t.texto,
    imagem: t.imagem,
    criado_em: t.criado_em,
    expira_em: t.expira_em, // null = permanente
    autor: {
      id_usuario: t.usuario.id_usuario,
      nome: t.usuario.nome_artistico || t.usuario.nome_completo,
      imagem: t.usuario.imagem?.caminho ?? null,
    },
  };
}

async function removerArquivoTweet(caminhoPublico: string | null): Promise<void> {
  if (!caminhoPublico?.startsWith(`${CAMINHO_PUBLICO_IMAGENS_TWEET}/`)) return;
  const nome = path.basename(caminhoPublico);
  if (
    caminhoPublico !== `${CAMINHO_PUBLICO_IMAGENS_TWEET}/${nome}` ||
    !/^[a-f0-9]{32}\.(jpg|png|gif)$/.test(nome)
  ) {
    return;
  }
  const arquivo = path.resolve(PASTA_IMAGENS_TWEET, nome);
  if (path.dirname(arquivo) !== PASTA_IMAGENS_TWEET) return;
  try {
    await fs.unlink(arquivo);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

// ── Criação ──────────────────────────────────────────────────────────────────
async function create(dados: {
  id_usuario: number;
  texto: string;
  expirar?: boolean;
  imagem?: string | null;
}) {
  const texto = dados.texto.trim();

  const criado_em = new Date();
  const expira_em = dados.expirar
    ? new Date(criado_em.getTime() + 24 * 60 * 60 * 1000)
    : null;

  const tweet = await prisma.tweet.create({
    data: {
      id_usuario: dados.id_usuario,
      texto,
      imagem: dados.imagem ?? null,
      criado_em,
      expira_em,
    },
    include: includeAutor,
  });

  return mapTweet(tweet);
}

// ── Feed: permanentes + temporários ainda não expirados, mais recentes primeiro ─
async function feed() {
  const tweets = await prisma.tweet.findMany({
    where: { OR: [{ expira_em: null }, { expira_em: { gt: new Date() } }] },
    orderBy: { criado_em: "desc" },
    include: includeAutor,
  });
  return tweets.map(mapTweet);
}

async function porUsuario(id_usuario: number) {
  const tweets = await prisma.tweet.findMany({
    where: {
      id_usuario,
      OR: [{ expira_em: null }, { expira_em: { gt: new Date() } }],
    },
    orderBy: { criado_em: "desc" },
    include: includeAutor,
  });
  return tweets.map(mapTweet);
}

async function remover(id_tweet: number, id_usuario: number) {
  const tweet = await prisma.tweet.findUnique({ where: { id_tweet } });
  if (!tweet) throw new HttpError(404, "Tweet não encontrado.");
  if (tweet.id_usuario !== id_usuario) {
    throw new HttpError(403, "Você não pode remover o tweet de outro usuário.");
  }
  await prisma.tweet.delete({ where: { id_tweet } });
  await removerArquivoTweet(tweet.imagem);
}

// ── Limpeza dos tweets temporários expirados (chamada periodicamente) ──────────
async function limparExpirados() {
  const agora = new Date();
  const expirados = await prisma.tweet.findMany({
    where: { expira_em: { lte: agora } },
    select: { id_tweet: true, imagem: true },
  });
  await Promise.all(
    expirados.map((tweet) => removerArquivoTweet(tweet.imagem)),
  );
  const { count } = await prisma.tweet.deleteMany({
    where: { expira_em: { lte: agora } },
  });
  return count;
}

export default { create, feed, porUsuario, remover, limparExpirados };
