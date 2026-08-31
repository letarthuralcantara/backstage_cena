import { z } from 'zod'

const bodyCadastro = z.object({
  nome_completo: z.string().min(3, 'O nome completo deve ter no mínimo 3 caracteres'),
  nome_artistico: z.string().optional(),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  telefone: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  area_atuacao: z.array(z.string()).optional(),
  anos_experiencia: z.number().int().nonnegative().optional(),
  biografia: z.string().optional().nullable(),
  instrumentos: z.array(z.string()).optional(),
  generos: z.array(z.string()).optional(),
  daws: z.array(z.string()).optional(),
})

const bodyLogin = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
})

const bodyAlterarSenha = z.object({
  senha_atual: z.string().min(1, 'A senha atual é obrigatória'),
  nova_senha: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
  confirmar_senha: z.string().min(1, 'A confirmação de senha é obrigatória'),
})

const bodyStatus = z.object({
  status: z.enum(['disponivel', 'ocupado', 'ausente'], {
    message: 'Status deve ser disponivel, ocupado ou ausente',
  }),
})

const params = z.object({
  id: z.coerce.number().int().positive('O id deve ser um número positivo'),
})

export const cadastroSchema = z.object({ body: bodyCadastro })
export const loginSchema = z.object({ body: bodyLogin })
export const atualizarSchema = z.object({ params, body: bodyCadastro.partial() })
export const removerSchema = z.object({ params })
export const statusSchema = z.object({ params, body: bodyStatus })
export const alterarSenhaSchema = z.object({ params, body: bodyAlterarSenha })