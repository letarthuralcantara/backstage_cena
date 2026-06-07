import { Router } from 'express'
import UsuarioController from '../controllers/UsuarioController.js'

const router = Router()

// Catálogos — antes de /:id para não conflitar com o parâmetro dinâmico
router.get('/estados', UsuarioController.listarEstados)
router.get('/areas', UsuarioController.listarAreas)
router.get('/instrumentos', UsuarioController.listarInstrumentos)
router.get('/generos', UsuarioController.listarGeneros)
router.get('/daws', UsuarioController.listarDaws)
router.get('/disponibilidades', UsuarioController.listarDisponibilidades)

// Autenticação
router.post('/login', UsuarioController.login)

// CRUD principal
router.get('/', UsuarioController.listar)
router.get('/:id', UsuarioController.buscarPorId)
router.post('/', UsuarioController.criar)
router.put('/:id', UsuarioController.atualizar)
router.delete('/:id', UsuarioController.remover)

export default router