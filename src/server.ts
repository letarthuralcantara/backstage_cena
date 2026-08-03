import express, { Request, Response } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import usuarioRouter from './routes/usuario.routes.js'
import postagemRouter from './routes/postagem.routes.js'
import tweetRouter from './routes/tweet.routes.js'
import postagemService from './models/PostagemModel.js'
import tweetService from './models/TweetModel.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { requireJson } from './middlewares/requireJson.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

// ── Middlewares globais ───────────────────────────────────────────────────────
app.use(morgan('dev'))
app.use(express.json())
app.use(cors())
app.use(express.static('public'))

// ── Rotas ─────────────────────────────────────────────────────────────────────
// requireJson só se aplica às rotas que recebem JSON: a de postagem recebe
// multipart/form-data (upload de áudio), não application/json.
app.use('/api/usuarios', requireJson, usuarioRouter)
app.use('/api/postagens', postagemRouter)
app.use('/api/tweets', requireJson, tweetRouter)

app.get('/', (_req: Request, res: Response) => {
  res.json({ mensagem: 'API Backstage Cena rodando' })
})

// ── Middleware de erros (deve ser o último) ───────────────────────────────────
app.use(errorHandler)

// ── Limpeza periódica de postagens/tweets temporários expirados ────────────────
const UMA_HORA_MS = 60 * 60 * 1000
setInterval(() => {
  postagemService.limparExpiradas().catch(err => console.error('Erro ao limpar postagens expiradas:', err))
  tweetService.limparExpirados().catch(err => console.error('Erro ao limpar tweets expirados:', err))
}, UMA_HORA_MS)

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`)
})

export default app