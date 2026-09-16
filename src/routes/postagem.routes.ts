import { Router } from 'express'
import PostagemController, { uploadAudio } from '../controllers/PostagemController.js'
import { isAuthenticated, isOwner } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { postagemParamsSchema, postagemUsuarioSchema, criarPostagemSchema, semEntradaSchema } from '../schema/conteudo.schema.js'

const router = Router()

router.get('/feed', validate(semEntradaSchema), PostagemController.feed)
router.get('/usuario/:id_usuario', validate(postagemUsuarioSchema), PostagemController.porUsuario)
router.post('/', isAuthenticated, uploadAudio, validate(criarPostagemSchema), PostagemController.criar)
router.delete('/:id', isAuthenticated, validate(postagemParamsSchema), isOwner, PostagemController.remover)

export default router
