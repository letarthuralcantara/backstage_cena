import { Router } from 'express'
import TweetController from '../controllers/TweetController.js'

const router = Router()

router.get('/feed', TweetController.feed)
router.get('/usuario/:id_usuario', TweetController.porUsuario)
router.post('/', TweetController.criar)
router.delete('/:id', TweetController.remover)

export default router