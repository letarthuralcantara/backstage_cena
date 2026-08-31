import { Router } from 'express'
import UsuarioController from '../controllers/UsuarioController.js'
import { isAuthenticated, isOwner } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import {
  cadastroSchema,
  loginSchema,
  atualizarSchema,
  removerSchema,
  statusSchema,
  alterarSenhaSchema,
} from '../schema/usuario.schema.js'

const router = Router()

// ...rotas de catálogo continuam iguais...

router.post('/login', validate(loginSchema), UsuarioController.login)

router.patch('/:id/status', isAuthenticated, isOwner, validate(statusSchema), UsuarioController.atualizarStatus)
router.get('/:id/configuracoes', isAuthenticated, isOwner, UsuarioController.getConfiguracoes)
router.put('/:id/configuracoes', isAuthenticated, isOwner, UsuarioController.updateConfiguracoes)
router.put('/:id/senha', isAuthenticated, isOwner, validate(alterarSenhaSchema), UsuarioController.alterarSenha)

router.get('/', UsuarioController.listar)
router.get('/:id', UsuarioController.buscarPorId)
router.post('/', validate(cadastroSchema), UsuarioController.criar)
router.put('/:id', isAuthenticated, isOwner, validate(atualizarSchema), UsuarioController.atualizar)
router.delete('/:id', isAuthenticated, isOwner, validate(removerSchema), UsuarioController.remover)

export default router