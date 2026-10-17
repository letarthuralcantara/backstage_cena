import { afterEach, describe, expect, it, vi } from "vitest";
import { SpotifyArtistImageProvider } from "../../src/services/musica/spotifyArtistImage.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("imagens de artistas do Spotify", () => {
  it("busca por nome com credenciais de aplicação e aceita variações de acento e caixa", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "client-id");
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "client-secret");
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "app-token", expires_in: 3600 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        artists: {
          items: [
            { name: "Outro Artista", images: [{ url: "https://img.example/other.jpg" }] },
            { name: "Beyonce", images: [{ url: "https://img.example/beyonce.jpg" }] },
          ],
        },
      })));

    const image = await new SpotifyArtistImageProvider(fetchMock).imagem("Beyoncé");

    expect(image).toBe("https://img.example/beyonce.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [tokenUrl, tokenOptions] = fetchMock.mock.calls[0];
    expect(String(tokenUrl)).toBe("https://accounts.spotify.com/api/token");
    expect(tokenOptions?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(tokenOptions?.body).toEqual(new URLSearchParams({ grant_type: "client_credentials" }));
    const searchUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(searchUrl.searchParams.get("q")).toBe("Beyoncé");
    expect(searchUrl.searchParams.get("type")).toBe("artist");
  });

  it("retorna imagem nula sem correspondência exata no Spotify", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "client-id");
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "client-secret");
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "app-token", expires_in: 3600 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        artists: { items: [{ name: "Artista Parecido", images: [{ url: "https://img.example/near.jpg" }] }] },
      })));

    const image = await new SpotifyArtistImageProvider(fetchMock).imagem("Artista Original");

    expect(image).toBeNull();
  });
});
