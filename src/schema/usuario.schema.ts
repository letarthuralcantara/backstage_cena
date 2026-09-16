import { z } from 'zod'

const bodyCadastro = z.object({
  nome_completo: z.string().trim().min(3, 'O nome completo deve ter no mínimo 3 caracteres'),
  nome_artistico: z.string().trim().optional(),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  telefone: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  area_atuacao: z.array(z.string()).optional(),
  anos_experiencia: z.number().int().nonnegative().optional(),
  biografia: z.string().trim().min(5, 'A biografia deve ter no mínimo 5 caracteres').optional().nullable(),
  instrumentos: z.array(z.string()).optional(),
  generos: z.array(z.string()).optional(),
  daws: z.array(z.string()).optional(),
  disponibilidades: z.array(z.string()).optional(),
  redes_sociais: z.record(z.string(), z.string()).nullable().optional(),
  status: z.enum(['disponivel', 'ocupado', 'nao_perturbe', 'invisivel']).optional(),
}).strict()

const bodyLogin = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
}).strict()

const bodyAlterarSenha = z.object({
  senha_atual: z.string().min(1, 'A senha atual é obrigatória'),
  nova_senha: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
  confirmar_senha: z.string().min(1, 'A confirmação de senha é obrigatória'),
}).refine(data => data.nova_senha === data.confirmar_senha, {
  path: ['confirmar_senha'],
  message: 'A confirmação de senha não coincide com a nova senha',
})

const bodyStatus = z.object({
  status: z.enum(['disponivel', 'ocupado', 'nao_perturbe', 'invisivel'], {
    message: 'Status inválido',
  }),
}).strict()

const queryLista = z.object({
  field: z.enum(['nome_completo', 'nome_artistico', 'email', 'cidade', 'estado', 'status']).optional(),
  value: z.string().trim().optional(),
}).strict()

const bodyConfiguracoes = z.object({
  mostrar_email: z.coerce.number().int().min(0).max(1).optional(),
  mostrar_telefone: z.coerce.number().int().min(0).max(1).optional(),
  mostrar_redes_sociais: z.coerce.number().int().min(0).max(1).optional(),
  perfil_publico: z.coerce.number().int().min(0).max(1).optional(),
}).refine(data => Object.keys(data).length > 0, 'Informe ao menos uma configuração para atualizar')

const params = z.object({
  id: z.coerce.number().int().positive('O id deve ser um número positivo'),
})

export const cadastroSchema = z.object({ body: bodyCadastro })
export const loginSchema = z.object({ body: bodyLogin })
export const atualizarSchema = z.object({ params, body: bodyCadastro.partial() })
export const removerSchema = z.object({ params })
export const statusSchema = z.object({ params, body: bodyStatus })
export const alterarSenhaSchema = z.object({ params, body: bodyAlterarSenha })
export const listarSchema = z.object({ query: queryLista })
export const buscarSchema = z.object({ params })
export const configuracoesSchema = z.object({ params })
export const atualizarConfiguracoesSchema = z.object({ params, body: bodyConfiguracoes })
export const semEntradaSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  query: z.object({}).strict(),
  params: z.object({}).strict(),
})