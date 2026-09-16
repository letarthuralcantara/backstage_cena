import 'dotenv/config'
import postagemService from './models/PostagemModel.js'
import tweetService from './models/TweetModel.js'
import app from './app.js'
const PORT = Number(process.env.PORT ?? 3000)

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