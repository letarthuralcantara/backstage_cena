import { afterEach, describe, expect, it, vi } from "vitest";
import { cifrarToken, decifrarToken } from "../../src/services/musica/crypto.js";
import {
  normalizarArtistaLastFm,
  normalizarArtistaSpotify,
  normalizarFaixaLastFm,
  normalizarFaixaSpotify,
} from "../../src/services/musica/types.js";

const KEY = Buffer.alloc(32, 7).toString("base64");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fundação de Música", () => {
  it("cifra refresh tokens com AES-256-GCM e autentica o conteúdo", () => {
    vi.stubEnv("MUSICA_TOKEN_KEY", KEY);
    const cifrado = cifrarToken("refresh-token-secreto");

    expect(cifrado).not.toContain("refresh-token-secreto");
    expect(cifrado.split(".")).toHaveLength(4);
    expect(decifrarToken(cifrado)).toBe("refresh-token-secreto");
    expect(() => decifrarToken(`${cifrado.slice(0, -1)}x`)).toThrow();
  });

  it("recusa chave ausente ou com tamanho inválido", () => {
    vi.stubEnv("MUSICA_TOKEN_KEY", "");
    expect(() => cifrarToken("token")).toThrow("MUSICA_TOKEN_KEY não configurada");
    vi.stubEnv("MUSICA_TOKEN_KEY", Buffer.alloc(16, 1).toString("base64"));
    expect(() => cifrarToken("token")).toThrow("32 bytes");
  });

  it("normaliza artista e faixa para o mesmo formato entre provedores", () => {
    const artistaSpotify = normalizarArtistaSpotify({
      id: "spotify-artist",
      name: "Artista",
      images: [{ url: "https://img.example/artist.jpg" }],
      external_urls: { spotify: "https://open.spotify.com/artist/1" },
    });
    const artistaLastFm = normalizarArtistaLastFm({
      name: "Artista",
      mbid: "lastfm-artist",
      image: [{ size: "extralarge", "#text": "https://img.example/artist.jpg" }],
      url: "https://last.fm/artist/1",
    });
    const faixaSpotify = normalizarFaixaSpotify({
      id: "spotify-track",
      name: "Faixa",
      artists: [{ name: "Artista" }],
      album: { name: "Álbum", images: [{ url: "https://img.example/album.jpg" }] },
      external_urls: { spotify: "https://open.spotify.com/track/1" },
      duration_ms: 180_000,
    }, 20_000, true);
    const faixaLastFm = normalizarFaixaLastFm({
      mbid: "lastfm-track",
      name: "Faixa",
      artist: { "#text": "Artista" },
      album: { "#text": "Álbum" },
      image: [{ size: "extralarge", "#text": "https://img.example/album.jpg" }],
      url: "https://last.fm/track/1",
    }, true);

    expect(Object.keys(artistaLastFm).sort()).toEqual(Object.keys(artistaSpotify).sort());
    expect(Object.keys(faixaLastFm).sort()).toEqual(Object.keys(faixaSpotify).sort());
    expect(faixaSpotify).toMatchObject({
      id: "spotify-track",
      tipo: "faixa",
      nome: "Faixa",
      artistas: ["Artista"],
      album: "Álbum",
      duracao_ms: 180_000,
      progresso_ms: 20_000,
      ouvindo_agora: true,
    });
    expect(faixaLastFm.ouvindo_agora).toBe(true);
  });
});
