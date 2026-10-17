import { HttpError } from "../../errors/HttpError.js";
import { SpotifyApiError } from "./SpotifyApiError.js";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SEARCH_ENDPOINT = "https://api.spotify.com/v1/search";
const IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CachedImage = { image: string | null; expiresAt: number };
type CachedToken = { value: string; expiresAt: number };

function normalizeArtistName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export class SpotifyArtistImageProvider {
  private readonly images = new Map<string, CachedImage>();
  private readonly inFlight = new Map<string, Promise<string | null>>();
  private token: CachedToken | null = null;
  private tokenRequest: Promise<string> | null = null;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async imagem(nome: string): Promise<string | null> {
    const normalizedName = normalizeArtistName(nome);
    if (!normalizedName) return null;
    const cached = this.images.get(normalizedName);
    if (cached && cached.expiresAt > Date.now()) return cached.image;

    const pending = this.inFlight.get(normalizedName);
    if (pending) return pending;

    const lookup = this.buscarImagem(nome, normalizedName).then((image) => {
      this.images.set(normalizedName, { image, expiresAt: Date.now() + IMAGE_CACHE_TTL_MS });
      return image;
    }).finally(() => this.inFlight.delete(normalizedName));
    this.inFlight.set(normalizedName, lookup);
    return lookup;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    if (this.tokenRequest) return this.tokenRequest;

    this.tokenRequest = this.requestAccessToken().finally(() => {
      this.tokenRequest = null;
    });
    return this.tokenRequest;
  }

  private async requestAccessToken(): Promise<string> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET são necessários para buscar imagens de artistas.");
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await this.fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    const body = await response.json();
    if (!response.ok) {
      if (response.status === 429) {
        throw new SpotifyApiError("O Spotify limitou a busca de imagens de artistas.", response.status, {
          retryAfter: response.headers.get("retry-after") ?? undefined,
        });
      }
      throw new HttpError(502, "Não foi possível autenticar a busca de artistas no Spotify.");
    }
    if (typeof body.access_token !== "string" || !Number.isFinite(body.expires_in)) {
      throw new SpotifyApiError("Resposta de token do Spotify inválida.", 502);
    }

    this.token = {
      value: body.access_token,
      expiresAt: Date.now() + Math.max(0, body.expires_in - 60) * 1000,
    };
    return this.token.value;
  }

  private async buscarImagem(nome: string, normalizedName: string): Promise<string | null> {
    const query = new URL(SEARCH_ENDPOINT);
    query.search = new URLSearchParams({ q: nome, type: "artist", limit: "5" }).toString();

    let token = await this.accessToken();
    let response = await this.fetchImpl(query, {
      headers: { Authorization: "Bearer " + token },
    });
    if (response.status === 401) {
      this.token = null;
      token = await this.accessToken();
      response = await this.fetchImpl(query, {
        headers: { Authorization: "Bearer " + token },
      });
    }
    if (!response.ok) {
      if (response.status === 429) {
        throw new SpotifyApiError("O Spotify limitou a busca de imagens de artistas.", response.status, {
          retryAfter: response.headers.get("retry-after") ?? undefined,
        });
      }
      throw new HttpError(502, "Não foi possível buscar a imagem do artista no Spotify.");
    }

    const body = await response.json();
    const artists: unknown = body.artists?.items;
    if (!Array.isArray(artists)) return null;
    const match = artists.find((artist): artist is { name?: string; images?: { url?: string }[] } => (
      typeof artist?.name === "string" && normalizeArtistName(artist.name) === normalizedName
    ));
    const image = match?.images?.find((item) => typeof item.url === "string" && item.url.trim())?.url;
    return image?.trim() || null;
  }
}
