import { Router } from 'express'
import PostagemController, { uploadAudio } from '../controllers/PostagemController'

const router = Router()

router.get('/feed', PostagemController.feed)
router.get('/usuario/:id_usuario', PostagemController.porUsuario)
router.post('/', uploadAudio, PostagemController.criar)
router.delete('/:id', PostagemController.remover)

export default router
