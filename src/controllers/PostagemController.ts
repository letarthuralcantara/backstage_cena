import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import postagemService from '../models/PostagemModel.js'
import { HttpError } from '../errors/HttpError.js'

// ── Upload de áudio ────────────────────────────────────────────────────────────
const PASTA_UPLOADS_AUDIO = 'public/uploads/audio'
fs.mkdirSync(PASTA_UPLOADS_AUDIO, { recursive: true }) // garante que a pasta exista, mesmo em um clone novo do repo

const TIPOS_PERMITIDOS = new Set([
  'audio/mpeg', // mp3
  'audio/mp4',  // m4a
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
])
const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024 // 15MB é de sobra pra uma prévia de até 60s

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PASTA_UPLOADS_AUDIO),
  filename: (_req, file, cb) => {
    const nomeUnico = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`
    cb(null, nomeUnico)
  },
})

export const uploadAudio = multer({
  storage,
  limits: { fileSize: TAMANHO_MAXIMO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      cb(new HttpError(415, 'Formato de áudio não suportado. Use mp3, wav, m4a ou ogg.'))
      return
    }
    cb(null, true)
  },
}).single('audio')

// ── Controller ───────────────────────────────────────────────────────────────
const PostagemController = {
  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new HttpError(400, 'Arquivo de áudio é obrigatório.')

      // TODO: quando a autenticação real (JWT) existir, troque isto por
      // req.usuarioId, vindo do middleware requireAuth — nunca confie em um
      // id_usuario mandado livremente pelo cliente no corpo da requisição.
      const id_usuario = Number(req.body.id_usuario)
      if (!id_usuario) throw new HttpError(400, 'id_usuario é obrigatório.')

      const inicio_seg = req.body.inicio_seg !== undefined ? Number(req.body.inicio_seg) : 0
      const duracao_seg = req.body.duracao_seg !== undefined ? Number(req.body.duracao_seg) : 30

      const postagem = await postagemService.create({
        id_usuario,
        titulo: req.body.titulo,
        audio_url: `/uploads/audio/${req.file.filename}`,
        inicio_seg,
        duracao_seg,
      })

      res.status(201).json(postagem)
    } catch (error) {
      next(error)
    }
  },

  async feed(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const postagens = await postagemService.feed()
      res.json(postagens)
    } catch (error) {
      next(error)
    }
  },

  async porUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id_usuario = Number(req.params.id_usuario)
      const postagens = await postagemService.porUsuario(id_usuario)
      res.json(postagens)
    } catch (error) {
      next(error)
    }
  },

  async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id_postagem = Number(req.params.id)
      // TODO: mesma observação do criar() — id_usuario deveria vir do token,
      // não do corpo da requisição, assim que a autenticação real existir.
      const id_usuario = Number(req.body.id_usuario)
      await postagemService.remover(id_postagem, id_usuario)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
}

export default PostagemController