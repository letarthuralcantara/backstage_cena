import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import usuarioRouter from './routes/usuario.routes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { requireJson } from './middlewares/requireJson.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

// ── Middlewares globais ───────────────────────────────────────────────────────
app.use(morgan('dev'))
app.use(express.json())
app.use(cors())
app.use(express.static('public'))
app.use(requireJson)

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/usuarios', usuarioRouter)

app.get('/', (_req, res) => {
  res.json({ mensagem: 'API Backstage Cena rodando' })
})

// ── Middleware de erros (deve ser o último) ───────────────────────────────────
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`)
})

export default app
