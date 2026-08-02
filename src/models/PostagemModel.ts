import fs from 'node:fs/promises'
import path from 'node:path'
import prisma from '../database/prisma.js'
import { HttpError } from '../errors/HttpError.js'

const DURACAO_MAXIMA_SEG = 60 // trava de segurança: ninguém posta prévia de 10 minutos
const PASTA_UPLOADS = path.resolve('public')

async function apagarArquivo(audio_url: string) {
  try {
    // audio_url é algo como "/uploads/audio/arquivo.mp3" (caminho público)
    await fs.unlink(path.join(PASTA_UPLOADS, audio_url))
  } catch {
    // se o arquivo já não existir, não é um erro que deva quebrar a operação
  }
}

const includeAutor = {
  usuario: {
    select: {
      id_usuario: true,
      nome_artistico: true,
      nome_completo: true,
    },
  },
} as const

function mapPostagem(p: any) {
  return {
    id_postagem: p.id_postagem,
    id_usuario: p.id_usuario,
    titulo: p.titulo,
    audio_url: p.audio_url,
    inicio_seg: p.inicio_seg,
    duracao_seg: p.duracao_seg,
    criado_em: p.criado_em,
    expira_em: p.expira_em,
    autor: {
      id_usuario: p.usuario.id_usuario,
      nome: p.usuario.nome_artistico || p.usuario.nome_completo,
    },
  }
}

const TITULO_MAX_CHARS = 60

// ── Criação ──────────────────────────────────────────────────────────────────
async function create(dados: {
  id_usuario: number
  audio_url: string
  titulo?: string
  inicio_seg?: number
  duracao_seg?: number
}) {
  const inicio_seg = Math.max(0, Number(dados.inicio_seg ?? 0))
  const duracao_seg = Math.min(
    DURACAO_MAXIMA_SEG,
    Math.max(1, Number(dados.duracao_seg ?? 30))
  )
  const titulo = dados.titulo?.trim().slice(0, TITULO_MAX_CHARS) || null

  const criado_em = new Date()
  const expira_em = new Date(criado_em.getTime() + 24 * 60 * 60 * 1000) // +24h

  const postagem = await prisma.postagem.create({
    data: {
      id_usuario: dados.id_usuario,
      titulo,
      audio_url: dados.audio_url,
      inicio_seg,
      duracao_seg,
      criado_em,
      expira_em,
    },
    include: includeAutor,
  })

  return mapPostagem(postagem)
}

// ── Feed: só postagens ainda não expiradas, mais recentes primeiro ─────────────
async function feed() {
  const postagens = await prisma.postagem.findMany({
    where: { expira_em: { gt: new Date() } },
    orderBy: { criado_em: 'desc' },
    include: includeAutor,
  })
  return postagens.map(mapPostagem)
}

// ── Postagens ativas de um usuário específico (ex: perfil dele) ───────────────
async function porUsuario(id_usuario: number) {
  const postagens = await prisma.postagem.findMany({
    where: { id_usuario, expira_em: { gt: new Date() } },
    orderBy: { criado_em: 'desc' },
    include: includeAutor,
  })
  return postagens.map(mapPostagem)
}

// ── Remoção (só o dono pode remover — checagem fica no controller/authMiddleware) ─
async function remover(id_postagem: number, id_usuario: number) {
  const postagem = await prisma.postagem.findUnique({ where: { id_postagem } })
  if (!postagem) throw new HttpError(404, 'Postagem não encontrada.')
  if (postagem.id_usuario !== id_usuario) {
    throw new HttpError(403, 'Você não pode remover a postagem de outro usuário.')
  }
  await prisma.postagem.delete({ where: { id_postagem } })
  await apagarArquivo(postagem.audio_url)
}

// ── Limpeza de postagens expiradas (chamada periodicamente, ver server.ts) ─────
async function limparExpiradas() {
  const expiradas = await prisma.postagem.findMany({
    where: { expira_em: { lte: new Date() } },
    select: { id_postagem: true, audio_url: true },
  })
  if (expiradas.length === 0) return 0

  await prisma.postagem.deleteMany({
    where: { id_postagem: { in: expiradas.map(p => p.id_postagem) } },
  })
  await Promise.all(expiradas.map(p => apagarArquivo(p.audio_url)))
  return expiradas.length
}

export default { create, feed, porUsuario, remover, limparExpiradas }