import { Request, Response, NextFunction } from 'express'
import usuarioService, { sanitizeUsuario } from '../models/UsuarioModel.js'
import { HttpError } from '../errors/HttpError.js'
import { verify as argon2Verify } from 'argon2'
import jwt from 'jsonwebtoken'
import EmailService from '../services/EmailService.js'

class UsuarioController {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { field, value } = req.query
      const usuarios = await usuarioService.read(field as string, value)
      res.json(usuarios.map(sanitizeUsuario))
    } catch (error) { next(error) }
  }

  async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const usuario = await usuarioService.readById(id)
      res.json(sanitizeUsuario(usuario))
    } catch (error) { next(error) }
  }

  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const novoUsuario = await usuarioService.create(req.body)

      const secret = process.env.JWT_SECRET
      if (!secret) throw new HttpError(500, 'Configuração de autenticação ausente no servidor.')

      // Emite token já no cadastro para permitir completar o perfil
      // (etapa 2 do onboarding) sem exigir um novo login.
      const token = jwt.sign({ userId: novoUsuario.id_usuario }, secret, { expiresIn: '1h' })

      // O e-mail é efeito colateral, não regra de negócio: um SMTP fora do ar
      // não pode impedir alguém de criar conta. Por isso vive num try/catch
      // próprio, depois do cadastro já persistido, e nunca chega ao next(error).
      try {
        await EmailService.enviarBoasVindas(novoUsuario.email, novoUsuario.nome_completo)
      } catch (mailError) {
        console.error('Falha ao enviar e-mail de boas-vindas:', mailError)
      }

      res.status(201).json({ usuario: sanitizeUsuario(novoUsuario), token })
    } catch (error) {
      next(error)
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id_usuario = Number(req.params.id)
      const usuarioAtualizado = await usuarioService.update({ id_usuario, ...req.body })
      res.json(sanitizeUsuario(usuarioAtualizado))
    } catch (error) { next(error) }
  }

  async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      await usuarioService.remove(id)
      res.status(204).send()
    } catch (error) { next(error) }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, senha } = req.body as { email: string; senha: string }
      const usuario = await usuarioService.findByEmail(email)
      if (!usuario) throw new HttpError(401, 'E-mail ou senha incorretos.')
      const senhaCorreta = await argon2Verify(usuario.senha, senha)
      if (!senhaCorreta) throw new HttpError(401, 'E-mail ou senha incorretos.')

      const secret = process.env.JWT_SECRET
      if (!secret) throw new HttpError(500, 'Configuração de autenticação ausente no servidor.')

      const token = jwt.sign({ userId: usuario.id_usuario }, secret, { expiresIn: '1h' })

      res.status(200).json({ usuario: sanitizeUsuario(usuario), token })
    } catch (error) { next(error) }
  }

  // ── Status ────────────────────────────────────────────────────────────────
  async atualizarStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const { status } = req.body as { status: string }
      const usuario = await usuarioService.updateStatus(id, status)
      res.json(sanitizeUsuario(usuario))
    } catch (error) { next(error) }
  }

  // ── Configurações ─────────────────────────────────────────────────────────
  async getConfiguracoes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const config = await usuarioService.getConfiguracoes(id)
      res.json(config)
    } catch (error) { next(error) }
  }

  async updateConfiguracoes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const config = await usuarioService.updateConfiguracoes(id, req.body)
      res.json(config)
    } catch (error) { next(error) }
  }

  async alterarSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id)
      const { senha_atual, nova_senha } = req.body as {
        senha_atual: string; nova_senha: string
      }
      await usuarioService.alterarSenha(id, senha_atual, nova_senha)
      res.json({ mensagem: 'Senha alterada com sucesso.' })
    } catch (error) { next(error) }
  }

  // ── Esqueci minha senha ──────────────────────────────────────────────────
  async esqueciSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as { email: string }
      const resultado = await usuarioService.gerarCodigoRedefinicao(email)

      // O e-mail é efeito colateral: se o SMTP falhar, não derruba a
      // requisição (mesma regra do cadastro). E respondemos com a mesma
      // mensagem exista ou não o e-mail, pra não vazar quais contas existem.
      if (resultado) {
        try {
          await EmailService.enviarCodigoRedefinicaoSenha(resultado.usuario.email, resultado.usuario.nome_completo, resultado.codigo)
        } catch (mailError) {
          console.error('Falha ao enviar e-mail de redefinição de senha:', mailError)
        }
      }

      res.status(200).json({ mensagem: 'Se este e-mail estiver cadastrado, enviamos um código de verificação.' })
    } catch (error) { next(error) }
  }

  async redefinirSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, codigo, nova_senha } = req.body as { email: string; codigo: string; nova_senha: string }
      await usuarioService.redefinirSenhaComCodigo(email, codigo, nova_senha)
      res.status(200).json({ mensagem: 'Senha redefinida com sucesso.' })
    } catch (error) { next(error) }
  }

  // ── Catálogos ─────────────────────────────────────────────────────────────
  async listarEstados(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])
    } catch (error) { next(error) }
  }

  async listarAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(['Produção Musical','Mixagem','Masterização','Composição','Arranjo','Performance'])
    } catch (error) { next(error) }
  }

  async listarInstrumentos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await usuarioService.listarInstrumentos()) }
    catch (error) { next(error) }
  }

  async listarGeneros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await usuarioService.listarGeneros()) }
    catch (error) { next(error) }
  }

  async listarDaws(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await usuarioService.listarDaws()) }
    catch (error) { next(error) }
  }

  async listarDisponibilidades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await usuarioService.listarDisponibilidades()) }
    catch (error) { next(error) }
  }
}

export default new UsuarioController()