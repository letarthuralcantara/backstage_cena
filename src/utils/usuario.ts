function parseArea(raw: string | null | undefined): string[] {
  if (!raw) return []
  try { return raw.startsWith('[') ? JSON.parse(raw) : [raw] }
  catch { return [raw] }
}

export function cadastroCompleto(u: any): boolean {
  const areas = parseArea(u.area_atuacao)
  const bio = (u.biografia || '').trim()
  const insts = Array.isArray(u.instrumentos) ? u.instrumentos : []
  const gens = Array.isArray(u.generos) ? u.generos : []
  return !!(
    u.nome_completo &&
    insts.length > 0 &&
    gens.length > 0 &&
    u.estado &&
    bio.length >= 5 &&
    areas.length > 0
  )
}

export function sanitizeUsuario<T extends { senha?: string; codigo_reset_senha?: string | null; codigo_reset_expira_em?: Date | null }>(
  u: T,
): Omit<T, 'senha' | 'codigo_reset_senha' | 'codigo_reset_expira_em'> {
  const { senha, codigo_reset_senha, codigo_reset_expira_em, ...resto } = u
  return resto
}
