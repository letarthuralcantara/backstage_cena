import prisma from '../database/prisma.js'
import { HttpError } from '../errors/HttpError.js'

const TEXTO_MAX_CHARS = 280

const includeAutor = {
  usuario: {
    select: {
      id_usuario: true,
      nome_artistico: true,
      nome_completo: true,
    },
  },
} as const

function mapTweet(t: any) {
  return {
    id_tweet: t.id_tweet,
    id_usuario: t.id_usuario,
    texto: t.texto,
    criado_em: t.criado_em,
    expira_em: t.expira_em, // null = permanente
    autor: {
      id_usuario: t.usuario.id_usuario,
      nome: t.usuario.nome_artistico || t.usuario.nome_completo,
    },
  }
}

// ── Criação ──────────────────────────────────────────────────────────────────
async function create(dados: { id_usuario: number; texto: string; expirar?: boolean }) {
  const texto = (dados.texto || '').trim().slice(0, TEXTO_MAX_CHARS)
  if (!texto) throw new HttpError(400, 'O tweet não pode ficar vazio.')

  const criado_em = new Date()
  const expira_em = dados.expirar ? new Date(criado_em.getTime() + 24 * 60 * 60 * 1000) : null

  const tweet = await prisma.tweet.create({
    data: { id_usuario: dados.id_usuario, texto, criado_em, expira_em },
    include: includeAutor,
  })

  return mapTweet(tweet)
}

// ── Feed: permanentes + temporários ainda não expirados, mais recentes primeiro ─
async function feed() {
  const tweets = await prisma.tweet.findMany({
    where: { OR: [{ expira_em: null }, { expira_em: { gt: new Date() } }] },
    orderBy: { criado_em: 'desc' },
    include: includeAutor,
  })
  return tweets.map(mapTweet)
}

async function porUsuario(id_usuario: number) {
  const tweets = await prisma.tweet.findMany({
    where: { id_usuario, OR: [{ expira_em: null }, { expira_em: { gt: new Date() } }] },
    orderBy: { criado_em: 'desc' },
    include: includeAutor,
  })
  return tweets.map(mapTweet)
}

async function remover(id_tweet: number, id_usuario: number) {
  const tweet = await prisma.tweet.findUnique({ where: { id_tweet } })
  if (!tweet) throw new HttpError(404, 'Tweet não encontrado.')
  if (tweet.id_usuario !== id_usuario) {
    throw new HttpError(403, 'Você não pode remover o tweet de outro usuário.')
  }
  await prisma.tweet.delete({ where: { id_tweet } })
}

// ── Limpeza dos tweets temporários expirados (chamada periodicamente) ──────────
async function limparExpirados() {
  const { count } = await prisma.tweet.deleteMany({
    where: { expira_em: { lte: new Date() } },
  })
  return count
}

export default { create, feed, porUsuario, remover, limparExpirados }