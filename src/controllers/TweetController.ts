import { Request, Response, NextFunction } from 'express'
import tweetService from '../models/TweetModel.js'
import { HttpError } from '../errors/HttpError.js'

const TweetController = {
  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: mesma observação dos outros controllers — quando a autenticação
      // real (JWT) existir, troque por req.usuarioId em vez de confiar no
      // id_usuario mandado pelo cliente no corpo da requisição.
      const id_usuario = Number(req.body.id_usuario)
      if (!id_usuario) throw new HttpError(400, 'id_usuario é obrigatório.')

      const tweet = await tweetService.create({
        id_usuario,
        texto: req.body.texto,
        expirar: Boolean(req.body.expirar),
      })

      res.status(201).json(tweet)
    } catch (error) {
      next(error)
    }
  },

  async feed(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tweets = await tweetService.feed()
      res.json(tweets)
    } catch (error) {
      next(error)
    }
  },

  async porUsuario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id_usuario = Number(req.params.id_usuario)
      const tweets = await tweetService.porUsuario(id_usuario)
      res.json(tweets)
    } catch (error) {
      next(error)
    }
  },

  async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id_tweet = Number(req.params.id)
      const id_usuario = Number(req.body.id_usuario)
      await tweetService.remover(id_tweet, id_usuario)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
}

export default TweetController