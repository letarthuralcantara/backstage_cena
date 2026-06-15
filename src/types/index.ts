// ── Entidades retornadas pela API ──────────────────────────────────────────

export interface Usuario {
  id_usuario: number
  nome_completo: string
  nome_artistico: string
  email: string
  senha: string
  telefone: string | null
  cidade: string | null
  estado: string | null
  bairro: string | null
  area_atuacao: string | string[] | null
  anos_experiencia: number
  biografia: string | null
  cadastro_completo: number
  redes_sociais: Record<string, string> | null
  status: UserStatus
  // Relacionamentos (populados pelos JOINs no model)
  instrumentos?: string[]
  generos?: string[]
  disponibilidades?: string[]
  daws?: string[]
}

// ── Inputs de criação e atualização ───────────────────────────────────────

export interface CreateUsuarioInput {
  nome_completo: string
  nome_artistico?: string
  email: string
  senha: string
  telefone?: string | null
  cidade?: string | null
  estado?: string | null
  bairro?: string | null
  area_atuacao?: string | string[] | null
  anos_experiencia?: number
  biografia?: string | null
  cadastro_completo?: number
  redes_sociais?: Record<string, string> | null
  instrumentos?: string[]
  generos?: string[]
  disponibilidades?: string[]
  daws?: string[]
  status?: UserStatus
}

export interface UpdateUsuarioInput extends Partial<CreateUsuarioInput> {
  id_usuario: number
  status?: UserStatus
}

export type UserStatus = 'online' | 'ausente' | 'nao_perturbe' | 'invisivel' | 'offline'