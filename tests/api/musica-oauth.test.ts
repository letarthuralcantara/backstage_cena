import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/EmailService.js", () => ({
  default: { enviarBoasVindas: vi.fn().mockResolvedValue(undefined) },
}));

const { default: app } = await import("../../src/app.js");
const { default: prisma } = await import("../../src/database/prisma.js");
const {
  criarSpotifyAuthorization,
  finalizarSpotifyAuthorization,
} = await import("../../src/services/musica/spotifyOAuth.js");
const redirectUri = "http://127.0.0.1:3000/api/musica/spotify/callback";
const tokenKey = Buffer.alloc(32, 4).toString("base64");
let userId = 0;
let userToken = "";

const auth = () => ({ Authorization: `Bearer ${userToken}` });

beforeAll(async () => {
  vi.stubEnv("SPOTIFY_CLIENT_ID", "spotify-client-id");
  vi.stubEnv("SPOTIFY_REDIRECT_URI", redirectUri);
  vi.stubEnv("MUSICA_TOKEN_KEY", tokenKey);
  const user = await request(app).post("/api/usuarios").send({
    nome_completo: "Usuária Spotify OAuth",
    email: `spotify-oauth-${Date.now()}@example.com`,
    senha: "123456",
  });
  userId = user.body.usuario.id_usuario;
  userToken = user.body.token;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (userId && userToken) {
    await request(app).delete(`/api/usuarios/${userId}`).set(auth());
  }
});

describe("OAuth Spotify com PKCE", () => {
  it("gera URL de autorização com state assinado e PKCE S256", async () => {
    const response = await request(app)
      .post("/api/musica/spotify/conectar")
      .set(auth());
    expect(response.status).toBe(200);
    const authorize = new URL(response.body.url);
    const params = authorize.searchParams;

    expect(authorize.origin + authorize.pathname).toBe("https://accounts.spotify.com/authorize");
    expect(params.get("client_id")).toBe("spotify-client-id");
    expect(params.get("redirect_uri")).toBe(redirectUri);
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("scope")).toBe("user-read-currently-playing user-top-read");
    expect(params.get("code_challenge")).toMatch(/^[\w-]{43}$/);
    expect(params.get("state")).toContain(".");
    expect(params.has("code_verifier")).toBe(false);
    expect(response.text).not.toContain("access_token");
  });

  it("troca code com o verifier correspondente e cifra refresh token sem devolver credenciais", async () => {
    const iniciar = await request(app)
      .post("/api/musica/spotify/conectar")
      .set(auth());
    const authorize = new URL(iniciar.body.url);
    const state = authorize.searchParams.get("state");
    const challenge = authorize.searchParams.get("code_challenge");
    const fetchMock = vi.fn(async (input, init) => {
      if (String(input) === "https://accounts.spotify.com/api/token") {
        const form = new URLSearchParams(String(init?.body));
        expect(form.get("grant_type")).toBe("authorization_code");
        expect(form.get("redirect_uri")).toBe(redirectUri);
        expect(form.get("client_id")).toBe("spotify-client-id");
        expect(form.get("code")).toBe("authorization-code");
        const verifier = form.get("code_verifier") || "";
        expect(crypto.createHash("sha256").update(verifier).digest("base64url")).toBe(challenge);
        return new Response(JSON.stringify({
          access_token: "access-token-never-returned",
          refresh_token: "refresh-token-never-returned",
          expires_in: 3600,
        }), { status: 200 });
      }
      expect(String(input)).toBe("https://api.spotify.com/v1/me");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-token-never-returned");
      return new Response(JSON.stringify({ id: "spotify-user", display_name: "Artista Spotify" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const callback = await request(app)
      .get("/api/musica/spotify/callback")
      .query({ state, code: "authorization-code" });
    const conexao = await prisma.conexaoMusica.findUnique({ where: { id_usuario: userId } });

    expect(callback.status).toBe(303);
    expect(callback.headers.location).toBe("/pages/config.html?musica=ok");
    expect(callback.headers.location).not.toMatch(/^https?:\/\//);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(conexao).toMatchObject({
      provedor: "spotify",
      id_externo: "spotify-user",
      nome_exibicao: "Artista Spotify",
    });
    expect(conexao?.refresh_token_cifrado).toBeTruthy();
    expect(conexao?.refresh_token_cifrado).not.toContain("refresh-token-never-returned");
    expect(callback.headers.location).not.toContain("access-token");
    expect(callback.headers.location).not.toContain("refresh-token");
    const replay = await request(app)
      .get("/api/musica/spotify/callback")
      .query({ state, code: "authorization-code" });
    expect(replay.headers.location).toContain("motivo=state_invalido");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejeita state adulterado e redirect URI localhost", async () => {
    const iniciar = await request(app)
      .post("/api/musica/spotify/conectar")
      .set(auth());
    const authorize = new URL(iniciar.body.url);
    const state = authorize.searchParams.get("state") || "";
    const alterado = `${state.slice(0, -1)}${state.endsWith("a") ? "b" : "a"}`;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const callback = await request(app)
      .get("/api/musica/spotify/callback")
      .query({ state: alterado, code: "authorization-code" });

    expect(callback.status).toBe(303);
    expect(callback.headers.location).toBe("/pages/config.html?musica=erro&motivo=state_invalido");
    expect(fetchMock).not.toHaveBeenCalled();

    const acessoNegado = await request(app)
      .get("/api/musica/spotify/callback")
      .query({ error: "access_denied" });
    expect(acessoNegado.headers.location).toBe("/pages/config.html?musica=erro&motivo=acesso_negado");
    expect(acessoNegado.headers.location).not.toMatch(/^https?:\/\//);

    vi.stubEnv("SPOTIFY_REDIRECT_URI", "http://localhost:3000/api/musica/spotify/callback");
    const rejected = await request(app)
      .post("/api/musica/spotify/conectar")
      .set(auth());
    expect(rejected.status).toBe(500);
  });

  it("rejeita state expirado antes de fazer qualquer chamada externa", async () => {
    vi.stubEnv("SPOTIFY_REDIRECT_URI", redirectUri);
    const expiredUrl = new URL(criarSpotifyAuthorization(userId, Date.now() - 11 * 60 * 1000));
    const fetchMock = vi.fn();
    await expect(finalizarSpotifyAuthorization(
      expiredUrl.searchParams.get("state") || "",
      "authorization-code",
      fetchMock,
    )).rejects.toMatchObject({ code: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
