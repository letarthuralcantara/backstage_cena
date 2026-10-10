import crypto from "node:crypto";
import prisma from "../../database/prisma.js";
import { HttpError } from "../../errors/HttpError.js";
import { cifrarToken, decifrarToken } from "./crypto.js";

const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";
const STATE_TTL_MS = 10 * 60 * 1000;
const VERIFIER_TTL_MS = 10 * 60 * 1000;

type PendingAuthorization = {
  userId: number;
  verifier: string;
  expiresAt: number;
};

type AccessToken = {
  value: string;
  expiresAt: number;
};

export class SpotifyApiError extends Error {
  status: number;
  retryAfter?: string;
  code?: string;

  constructor(message: string, status: number, options: { retryAfter?: string; code?: string } = {}) {
    super(message);
    this.status = status;
    this.retryAfter = options.retryAfter;
    this.code = options.code;
  }
}

const pendingAuthorizations = new Map<string, PendingAuthorization>();
const accessTokens = new Map<number, AccessToken>();

function clientId(): string {
  const value = process.env.SPOTIFY_CLIENT_ID;
  if (!value) throw new Error("SPOTIFY_CLIENT_ID não configurado.");
  return value;
}

export function spotifyRedirectUri(): string {
  const configured = process.env.SPOTIFY_REDIRECT_URI;
  if (!configured) throw new Error("SPOTIFY_REDIRECT_URI não configurada.");
  const redirect = new URL(configured);
  const loopback = redirect.hostname === "127.0.0.1" || redirect.hostname === "[::1]";
  if (redirect.protocol !== "https:" && !(redirect.protocol === "http:" && loopback)) {
    throw new Error("SPOTIFY_REDIRECT_URI deve usar HTTPS ou loopback IP literal.");
  }
  return redirect.toString();
}

function stateKey(): Buffer {
  const key = process.env.MUSICA_TOKEN_KEY;
  if (!key) throw new Error("MUSICA_TOKEN_KEY não configurada.");
  const decoded = Buffer.from(key, "base64");
  if (decoded.length !== 32) throw new Error("MUSICA_TOKEN_KEY deve ser uma chave base64 de 32 bytes.");
  return decoded;
}

function assinar(payload: string): string {
  return crypto.createHmac("sha256", stateKey()).update(payload).digest("base64url");
}

function gerarCodeVerifier(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function criarSpotifyAuthorization(userId: number, now = Date.now()): string {
  const verifier = gerarCodeVerifier();
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const nonce = crypto.randomBytes(24).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ nonce, userId, exp: now + STATE_TTL_MS })).toString("base64url");
  const state = `${payload}.${assinar(payload)}`;
  pendingAuthorizations.set(nonce, {
    userId,
    verifier,
    expiresAt: now + VERIFIER_TTL_MS,
  });

  const authorize = new URL(AUTHORIZE_ENDPOINT);
  authorize.search = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    redirect_uri: spotifyRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: "user-read-currently-playing user-top-read",
    state,
  }).toString();
  return authorize.toString();
}

function consumirState(state: string, now = Date.now()): PendingAuthorization {
  const [payload, signature, ...rest] = state.split(".");
  if (!payload || !signature || rest.length) throw new HttpError(400, "A autorização do Spotify expirou ou é inválida.");
  const assinaturaEsperada = assinar(payload);
  const assinaturaRecebida = Buffer.from(signature, "base64url");
  const assinaturaEsperadaBuffer = Buffer.from(assinaturaEsperada, "base64url");
  if (
    assinaturaRecebida.length !== assinaturaEsperadaBuffer.length ||
    !crypto.timingSafeEqual(assinaturaRecebida, assinaturaEsperadaBuffer)
  ) {
    throw new HttpError(400, "A autorização do Spotify expirou ou é inválida.");
  }

  let dados: { nonce: string; userId: number; exp: number };
  try {
    dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(400, "A autorização do Spotify expirou ou é inválida.");
  }
  const pendente = pendingAuthorizations.get(dados.nonce);
  pendingAuthorizations.delete(dados.nonce);
  if (
    !pendente ||
    pendente.userId !== dados.userId ||
    pendente.expiresAt < now ||
    dados.exp < now
  ) {
    throw new HttpError(400, "A autorização do Spotify expirou ou é inválida.");
  }
  return pendente;
}

async function requisitarToken(
  campos: URLSearchParams,
  fetchImpl: typeof fetch,
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: campos,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new SpotifyApiError("Não foi possível autorizar a conta do Spotify.", response.status, {
      code: body.error,
      retryAfter: response.headers.get("retry-after") ?? undefined,
    });
  }
  if (typeof body.access_token !== "string" || !Number.isFinite(body.expires_in)) {
    throw new SpotifyApiError("Resposta de token do Spotify inválida.", 502);
  }
  return body;
}

export async function finalizarSpotifyAuthorization(
  state: string,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const pending = consumirState(state);
  const campos = new URLSearchParams({
    client_id: clientId(),
    grant_type: "authorization_code",
    code,
    redirect_uri: spotifyRedirectUri(),
    code_verifier: pending.verifier,
  });
  const token = await requisitarToken(campos, fetchImpl);
  const perfilResponse = await fetchImpl(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!perfilResponse.ok) {
    throw new SpotifyApiError("Não foi possível carregar o perfil do Spotify.", perfilResponse.status, {
      retryAfter: perfilResponse.headers.get("retry-after") ?? undefined,
    });
  }
  const perfil = await perfilResponse.json();
  if (typeof perfil.id !== "string") throw new SpotifyApiError("Perfil do Spotify inválido.", 502);
  if (!token.refresh_token) throw new SpotifyApiError("O Spotify não retornou um refresh token.", 502);

  await prisma.conexaoMusica.upsert({
    where: { id_usuario: pending.userId },
    create: {
      id_usuario: pending.userId,
      provedor: "spotify",
      id_externo: perfil.id,
      nome_exibicao: perfil.display_name || perfil.id,
      refresh_token_cifrado: cifrarToken(token.refresh_token),
    },
    update: {
      provedor: "spotify",
      id_externo: perfil.id,
      nome_exibicao: perfil.display_name || perfil.id,
      refresh_token_cifrado: cifrarToken(token.refresh_token),
    },
  });
  accessTokens.set(pending.userId, {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  });
  return pending.userId;
}

export async function getSpotifyAccessToken(
  userId: number,
  refreshTokenCifrado: string | null | undefined,
  forceRefresh = false,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const cached = accessTokens.get(userId);
  if (!forceRefresh && cached && cached.expiresAt - Date.now() > 60_000) return cached.value;
  if (!refreshTokenCifrado) throw new SpotifyApiError("Reconecte sua conta do Spotify.", 401);

  const refreshToken = decifrarToken(refreshTokenCifrado);
  const campos = new URLSearchParams({
    client_id: clientId(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  let token: Awaited<ReturnType<typeof requisitarToken>>;
  try {
    token = await requisitarToken(campos, fetchImpl);
  } catch (error) {
    if (error instanceof SpotifyApiError && error.code === "invalid_grant") {
      accessTokens.delete(userId);
      await prisma.conexaoMusica.deleteMany({ where: { id_usuario: userId, provedor: "spotify" } });
    }
    throw error;
  }
  if (token.refresh_token) {
    await prisma.conexaoMusica.update({
      where: { id_usuario: userId },
      data: { refresh_token_cifrado: cifrarToken(token.refresh_token) },
    });
  }
  accessTokens.set(userId, {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  });
  return token.access_token;
}

export function limparTokensSpotifyEmMemoria(userId: number): void {
  accessTokens.delete(userId);
}

export function limparEstadoSpotifyEmMemoria(): void {
  pendingAuthorizations.clear();
  accessTokens.clear();
}
