import { Router } from 'express'
import PostagemController, { uploadAudio } from '../controllers/PostagemController.js'
import { isAuthenticated } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { postagemParamsSchema, postagemUsuarioSchema, criarPostagemSchema, semEntradaSchema } from '../schema/conteudo.schema.js'

const router = Router()

router.get('/feed', validate(semEntradaSchema), PostagemController.feed)
router.get('/usuario/:id_usuario', validate(postagemUsuarioSchema), PostagemController.porUsuario)
router.post('/', isAuthenticated, uploadAudio, validate(criarPostagemSchema), PostagemController.criar)
// Não usamos o middleware isOwner aqui: nele, `:id` seria interpretado como o
// id do usuário logado, mas nesta rota `:id` é o id da POSTAGEM. Quem checa
// se `id_usuario` da postagem bate com o usuário autenticado é o
// PostagemModel.remover, que já recebe req.userId e lança 403 se não bater.
router.delete('/:id', isAuthenticated, validate(postagemParamsSchema), PostagemController.remover)

export default router
