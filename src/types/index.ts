
declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}
// ── Entidades retornadas pela API ──────────────────────────────────────────
export type UserStatus = 'disponivel' | 'ocupado' | 'nao_perturbe' | 'invisivel'

export interface ConfiguracaoUsuario {
  id_config: number
  id_usuario: number
  mostrar_email: number
  mostrar_telefone: number
  mostrar_redes_sociais: number
  perfil_publico: number
}

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
  instrumentos?: string[]
  generos?: string[]
  daws?: string[]
  disponibilidades?: string[]
  configuracoes?: ConfiguracaoUsuario | null
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
  daws?: string[]
  disponibilidades?: string[]
  status?: UserStatus
}

export interface UpdateUsuarioInput extends Partial<CreateUsuarioInput> {
  id_usuario: number
}