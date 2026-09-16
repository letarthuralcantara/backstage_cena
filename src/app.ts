import 'dotenv/config'
import express, { Request, Response } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import usuarioRouter from './routes/usuario.routes.js'
import postagemRouter from './routes/postagem.routes.js'
import tweetRouter from './routes/tweet.routes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { requireJson } from './middlewares/requireJson.js'

const app = express()

app.use(morgan('dev'))
app.use(express.json())
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) ?? 'http://localhost:3000' }))
app.use(express.static('public'))

app.use('/api/usuarios', requireJson, usuarioRouter)
app.use('/api/postagens', postagemRouter)
app.use('/api/tweets', requireJson, tweetRouter)

app.get('/', (_req: Request, res: Response) => {
  res.json({ mensagem: 'API Backstage Cena rodando' })
})

app.use((req: Request, res: Response, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ erro: 'Rota não encontrada.' })
    return
  }
  res.status(404).sendFile('404.html', { root: 'public' }, (err) => { if (err) next(err) })
})

app.use(errorHandler)

export default app
