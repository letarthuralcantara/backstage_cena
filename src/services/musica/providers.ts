import { HttpError } from "../../errors/HttpError.js";
import {
  ConexaoProvedorMusica,
  MusicaAgora,
  MusicaTop,
  ProvedorMusica,
  TipoItemMusica,
  normalizarArtistaLastFm,
  normalizarArtistaSpotify,
  normalizarFaixaLastFm,
  normalizarFaixaSpotify,
} from "./types.js";
import { getSpotifyAccessToken, SpotifyApiError } from "./spotifyOAuth.js";

const SPOTIFY_API = "https://api.spotify.com/v1";
const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";

export class LastFmApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: string,
  ) {
    super(message);
  }
}

function agoraVazio(): MusicaAgora {
  return { tocando: false, item: null, consultado_em: new Date().toISOString() };
}

function topVazio(tipo: TipoItemMusica, periodo: MusicaTop["periodo"]): MusicaTop {
  return { tipo, periodo, itens: [], consultado_em: new Date().toISOString() };
}

async function spotifyGet(
  conexao: ConexaoProvedorMusica,
  path: string,
  fetchImpl: typeof fetch | undefined,
): Promise<Response> {
  const request = fetchImpl ?? fetch;
  const chamar = async (forcarRefresh: boolean) => {
    const token = await getSpotifyAccessToken(
      conexao.usuarioId,
      conexao.refreshTokenCifrado,
      forcarRefresh,
      request,
    );
    return request(`${SPOTIFY_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };
  let response = await chamar(false);
  if (response.status === 401) response = await chamar(true);
  if (!response.ok && response.status !== 204) {
    throw new SpotifyApiError("Não foi possível consultar o Spotify.", response.status, {
      retryAfter: response.headers.get("retry-after") ?? undefined,
    });
  }
  return response;
}

export class SpotifyProvider implements ProvedorMusica {
  readonly id = "spotify" as const;

  constructor(private readonly fetchImpl?: typeof fetch) {}

  async agora(conexao: ConexaoProvedorMusica): Promise<MusicaAgora> {
    const response = await spotifyGet(conexao, "/me/player/currently-playing", this.fetchImpl);
    if (response.status === 204) return agoraVazio();
    const body = await response.json();
    if (!body.is_playing || !body.item) return agoraVazio();
    return {
      tocando: true,
      item: normalizarFaixaSpotify(body.item, Number.isFinite(body.progress_ms) ? body.progress_ms : null, true),
      consultado_em: new Date().toISOString(),
    };
  }

  async top(
    conexao: ConexaoProvedorMusica,
    tipo: TipoItemMusica,
    periodo: MusicaTop["periodo"],
    limite: number,
  ): Promise<MusicaTop> {
    const spotifyType = tipo === "artista" ? "artists" : "tracks";
    const timeRange = { curto: "short_term", medio: "medium_term", longo: "long_term" }[periodo];
    const response = await spotifyGet(
      conexao,
      `/me/top/${spotifyType}?time_range=${timeRange}&limit=${limite}`,
      this.fetchImpl,
    );
    const body = await response.json();
    const itens = Array.isArray(body.items) ? body.items : [];
    return {
      tipo,
      periodo,
      itens: itens.map(tipo === "artista" ? normalizarArtistaSpotify : normalizarFaixaSpotify),
      consultado_em: new Date().toISOString(),
    };
  }
}

function lastFmPeriod(periodo: MusicaTop["periodo"]): string {
  return { curto: "1month", medio: "6month", longo: "12month" }[periodo];
}

export class LastFmProvider implements ProvedorMusica {
  readonly id = "lastfm" as const;

  constructor(
    private readonly apiKey = process.env.LASTFM_API_KEY,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async validarUsuario(username: string): Promise<{ id: string; nome: string }> {
    const body = await this.api({ method: "user.getInfo", user: username });
    const user = body.user;
    if (typeof user?.name !== "string" || !user.name.trim()) {
      throw new HttpError(400, "O Last.fm não encontrou esse usuário.");
    }
    return { id: user.name, nome: user.realname || user.name };
  }

  private async api(params: Record<string, string>): Promise<Record<string, any>> {
    if (!this.apiKey) throw new Error("LASTFM_API_KEY não configurada.");
    const url = new URL(LASTFM_API);
    url.search = new URLSearchParams({ ...params, api_key: this.apiKey, format: "json" }).toString();
    const response = await (this.fetchImpl ?? fetch)(url);
    if (!response.ok) {
      if (response.status === 429 || response.status === 403) {
        throw new LastFmApiError(
          "Não foi possível consultar o Last.fm.",
          response.status,
          response.headers.get("retry-after") ?? undefined,
        );
      }
      throw new HttpError(502, "Não foi possível consultar o Last.fm.");
    }
    const body = await response.json();
    if (body.error) {
      if (params.method === "user.getInfo") throw new HttpError(400, "O Last.fm não encontrou esse usuário.");
      const code = Number(body.error);
      if (code === 17 || code === 29) {
        throw new LastFmApiError(
          code === 17 ? "A atividade do perfil Last.fm não está pública." : "O Last.fm limitou as consultas.",
          code === 17 ? 403 : 429,
        );
      }
      throw new HttpError(502, "Não foi possível consultar o Last.fm.");
    }
    return body;
  }

  async agora(conexao: ConexaoProvedorMusica): Promise<MusicaAgora> {
    const body = await this.api({
      method: "user.getRecentTracks",
      user: conexao.idExterno,
      limit: "1",
    });
    const track = body.recenttracks?.track?.[0];
    if (track?.["@attr"]?.nowplaying !== "true") return agoraVazio();
    return {
      tocando: true,
      item: normalizarFaixaLastFm(track, true),
      consultado_em: new Date().toISOString(),
    };
  }

  async top(
    conexao: ConexaoProvedorMusica,
    tipo: TipoItemMusica,
    periodo: MusicaTop["periodo"],
    limite: number,
  ): Promise<MusicaTop> {
    const method = tipo === "artista" ? "user.getTopArtists" : "user.getTopTracks";
    const key = tipo === "artista" ? "topartists" : "toptracks";
    const body = await this.api({
      method,
      user: conexao.idExterno,
      period: lastFmPeriod(periodo),
      limit: String(limite),
    });
    const itens = body[key]?.[tipo === "artista" ? "artist" : "track"];
    return {
      tipo,
      periodo,
      itens: Array.isArray(itens)
        ? itens.map((item: Record<string, any>) =>
            tipo === "artista" ? normalizarArtistaLastFm(item) : normalizarFaixaLastFm(item),
          )
        : [],
      consultado_em: new Date().toISOString(),
    };
  }
}

export function musicaTopVazia(tipo: TipoItemMusica, periodo: MusicaTop["periodo"]): MusicaTop {
  return topVazio(tipo, periodo);
}
