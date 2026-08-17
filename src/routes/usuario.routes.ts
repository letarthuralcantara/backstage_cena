import { Router } from 'express'
import UsuarioController from '../controllers/UsuarioController.js'
import { isAuthenticated, isOwner } from '../middlewares/auth.js'

const router = Router()

// Catálogos — antes de /:id para não conflitar
router.get('/estados',          UsuarioController.listarEstados)
router.get('/areas',            UsuarioController.listarAreas)
router.get('/instrumentos',     UsuarioController.listarInstrumentos)
router.get('/generos',          UsuarioController.listarGeneros)
router.get('/daws',             UsuarioController.listarDaws)
router.get('/disponibilidades', UsuarioController.listarDisponibilidades)

// Autenticação
router.post('/login', UsuarioController.login)

// Sub-rotas antes de /:id para não conflitar
router.patch('/:id/status',           isAuthenticated, isOwner, UsuarioController.atualizarStatus)
router.get('/:id/configuracoes',      isAuthenticated, isOwner, UsuarioController.getConfiguracoes)
router.put('/:id/configuracoes',      isAuthenticated, isOwner, UsuarioController.updateConfiguracoes)
router.put('/:id/senha',              isAuthenticated, isOwner, UsuarioController.alterarSenha)

// CRUD principal
router.get('/',     UsuarioController.listar)
router.get('/:id',  UsuarioController.buscarPorId)
router.post('/',    UsuarioController.criar)
router.put('/:id',  isAuthenticated, isOwner, UsuarioController.atualizar)
router.delete('/:id', isAuthenticated, isOwner, UsuarioController.remover)

export default router