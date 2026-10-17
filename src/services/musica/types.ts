export type ProvedorMusicaId = "spotify" | "lastfm";
export type VisibilidadeMusica = "publico" | "clubes" | "oculto";
export type TipoItemMusica = "artista" | "faixa";

export interface ItemMusica {
  id: string;
  tipo: TipoItemMusica;
  nome: string;
  artistas: string[];
  album: string | null;
  imagem: string | null;
  url: string | null;
  duracao_ms: number | null;
  progresso_ms: number | null;
  ouvindo_agora: boolean;
}

export interface MusicaAgora {
  tocando: boolean;
  item: ItemMusica | null;
  consultado_em: string;
}

export interface MusicaTop {
  tipo: TipoItemMusica;
  periodo: "curto" | "medio" | "longo";
  itens: ItemMusica[];
  consultado_em: string;
}

export interface ConexaoProvedorMusica {
  usuarioId: number;
  provedor: ProvedorMusicaId;
  idExterno: string;
  nomeExibicao: string;
  refreshTokenCifrado?: string | null;
}

export interface ProvedorMusica {
  readonly id: ProvedorMusicaId;
  agora(conexao: ConexaoProvedorMusica): Promise<MusicaAgora>;
  top(
    conexao: ConexaoProvedorMusica,
    tipo: TipoItemMusica,
    periodo: MusicaTop["periodo"],
    limite: number,
  ): Promise<MusicaTop>;
}

export function normalizarArtistaSpotify(artista: any): ItemMusica {
  return {
    id: String(artista.id),
    tipo: "artista",
    nome: String(artista.name ?? ""),
    artistas: [],
    album: null,
    imagem: artista.images?.[0]?.url ?? null,
    url: artista.external_urls?.spotify ?? null,
    duracao_ms: null,
    progresso_ms: null,
    ouvindo_agora: false,
  };
}

export function normalizarFaixaSpotify(
  faixa: any,
  progressoMs: number | null = null,
  ouvindoAgora = false,
): ItemMusica {
  return {
    id: String(faixa.id),
    tipo: "faixa",
    nome: String(faixa.name ?? ""),
    artistas: (faixa.artists ?? []).map((artista: any) => String(artista.name ?? "")),
    album: faixa.album?.name ?? null,
    imagem: faixa.album?.images?.[0]?.url ?? null,
    url: faixa.external_urls?.spotify ?? null,
    duracao_ms: Number.isFinite(faixa.duration_ms) ? faixa.duration_ms : null,
    progresso_ms: progressoMs,
    ouvindo_agora: ouvindoAgora,
  };
}

function imagemLastFm(imagens: any): string | null {
  if (!Array.isArray(imagens)) return null;
  for (const tamanho of ["extralarge", "mega", "large", "medium", "small"]) {
    const url = imagens.find((imagem: any) => imagem?.size === tamanho)?.["#text"];
    if (typeof url !== "string" || !url.trim()) continue;
    const candidata = url.trim();
    const caminho = new URL(candidata, "https://last.fm").pathname.toLowerCase();
    if (caminho.endsWith("/2a96cbd8b46e442fc41c2b86b821562f.png")) continue;
    return candidata;
  }
  return null;
}

export function normalizarArtistaLastFm(artista: any): ItemMusica {
  return {
    id: String(artista.mbid || artista.url || artista.name || ""),
    tipo: "artista",
    nome: String(artista.name ?? ""),
    artistas: [],
    album: null,
    imagem: imagemLastFm(artista.image),
    url: artista.url ?? null,
    duracao_ms: null,
    progresso_ms: null,
    ouvindo_agora: false,
  };
}

export function normalizarFaixaLastFm(faixa: any, ouvindoAgora = false): ItemMusica {
  return {
    id: String(faixa.mbid || faixa.url || `${faixa.artist?.["#text"] || ""}:${faixa.name || ""}`),
    tipo: "faixa",
    nome: String(faixa.name ?? ""),
    artistas: [String(faixa.artist?.["#text"] ?? "")].filter(Boolean),
    album: faixa.album?.["#text"] || null,
    imagem: imagemLastFm(faixa.image),
    url: faixa.url ?? null,
    duracao_ms: null,
    progresso_ms: null,
    ouvindo_agora: ouvindoAgora,
  };
}
