import prisma from "../../database/prisma.js";
import { HttpError } from "../../errors/HttpError.js";
import {
  ConexaoProvedorMusica,
  MusicaAgora,
  MusicaTop,
  TipoItemMusica,
} from "./types.js";
import { LastFmProvider, musicaTopVazia, SpotifyProvider } from "./providers.js";
import { limparTokensSpotifyEmMemoria } from "./spotifyOAuth.js";

type CacheEntry<T> = { expiresAt: number; value: T };
const agoraCache = new Map<string, CacheEntry<MusicaAgora>>();
const topCache = new Map<string, CacheEntry<MusicaTop>>();
const inFlight = new Map<string, Promise<unknown>>();
const CACHE_AGORA_MS = 10_000;
const CACHE_TOP_MS = 6 * 60 * 60 * 1000;

const fetchAtual: typeof fetch = (...args) => globalThis.fetch(...args);
const spotify = new SpotifyProvider(fetchAtual);
const lastfm = new LastFmProvider(process.env.LASTFM_API_KEY, fetchAtual);

function provedor(conexao: { provedor: string }) {
  if (conexao.provedor === "spotify") return spotify;
  if (conexao.provedor === "lastfm") return lastfm;
  throw new HttpError(500, "Provedor musical inválido.");
}

async function conexaoVisivel(idUsuario: number, viewerId?: number) {
  const conexao = await prisma.conexaoMusica.findUnique({ where: { id_usuario: idUsuario } });
  if (!conexao) return null;
  if (viewerId === idUsuario) return conexao;
  if (conexao.visibilidade === "oculto") return null;
  if (conexao.visibilidade === "clubes") {
    if (!viewerId) return null;
    const clubesUsuario = await prisma.clubeMembro.findMany({
      where: { id_usuario: idUsuario },
      select: { id_clube: true },
    });
    if (clubesUsuario.length === 0) return null;
    const compartilhado = await prisma.clubeMembro.findFirst({
      where: {
        id_usuario: viewerId,
        id_clube: { in: clubesUsuario.map(({ id_clube }) => id_clube) },
      },
      select: { id_clube: true },
    });
    if (!compartilhado) return null;
  }
  return conexao;
}

function serializarConexao(conexao: NonNullable<Awaited<ReturnType<typeof conexaoVisivel>>>): ConexaoProvedorMusica {
  return {
    usuarioId: conexao.id_usuario,
    provedor: conexao.provedor as ConexaoProvedorMusica["provedor"],
    idExterno: conexao.id_externo,
    nomeExibicao: conexao.nome_exibicao,
    refreshTokenCifrado: conexao.refresh_token_cifrado,
  };
}

function cached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

async function executarUmaVez<T>(
  key: string,
  operation: () => Promise<T>,
  cache: Map<string, CacheEntry<T>>,
  ttl: number,
): Promise<T> {
  const existente = cached(cache, key);
  if (existente) return existente;
  const pendente = inFlight.get(key) as Promise<T> | undefined;
  if (pendente) return pendente;
  const requisicao = operation().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, requisicao);
  return requisicao;
}

export async function obterAgora(idUsuario: number, viewerId?: number) {
  const conexao = await conexaoVisivel(idUsuario, viewerId);
  if (!conexao) {
    const existe = await prisma.conexaoMusica.findUnique({
      where: { id_usuario: idUsuario },
      select: { id_usuario: true },
    });
    return existe
      ? { conectado: false, estado: "oculto" as const }
      : { conectado: false as const };
  }
  const providerConnection = serializarConexao(conexao);
  const value = await executarUmaVez(
    `agora:${idUsuario}:${conexao.provedor}:${conexao.id_conexao}`,
    () => provedor(conexao).agora(providerConnection),
    agoraCache,
    CACHE_AGORA_MS,
  );
  return { conectado: true as const, provedor: conexao.provedor, nome_exibicao: conexao.nome_exibicao, ...value };
}

export async function obterTop(
  idUsuario: number,
  viewerId: number | undefined,
  tipo: TipoItemMusica,
  periodo: MusicaTop["periodo"],
  limite: number,
) {
  const conexao = await conexaoVisivel(idUsuario, viewerId);
  if (!conexao) {
    const existe = await prisma.conexaoMusica.findUnique({
      where: { id_usuario: idUsuario },
      select: { id_usuario: true },
    });
    return existe
      ? { conectado: false, estado: "oculto" as const, ...musicaTopVazia(tipo, periodo) }
      : { conectado: false as const };
  }
  const providerConnection = serializarConexao(conexao);
  const key = `top:${idUsuario}:${conexao.provedor}:${conexao.id_conexao}:${tipo}:${periodo}:${limite}`;
  const value = await executarUmaVez(
    key,
    () => provedor(conexao).top(providerConnection, tipo, periodo, limite),
    topCache,
    CACHE_TOP_MS,
  );
  return { conectado: true as const, provedor: conexao.provedor, nome_exibicao: conexao.nome_exibicao, ...value };
}

export function limparCacheMusica(): void {
  agoraCache.clear();
  topCache.clear();
  inFlight.clear();
}

export async function obterMinhaConexao(idUsuario: number) {
  const conexao = await prisma.conexaoMusica.findUnique({
    where: { id_usuario: idUsuario },
    select: {
      provedor: true,
      id_externo: true,
      nome_exibicao: true,
      visibilidade: true,
    },
  });
  return conexao ? { conectado: true as const, ...conexao } : { conectado: false as const };
}

export async function atualizarVisibilidade(idUsuario: number, visibilidade: string) {
  const conexao = await prisma.conexaoMusica.updateMany({
    where: { id_usuario: idUsuario },
    data: { visibilidade },
  });
  if (conexao.count === 0) throw new HttpError(404, "Nenhuma conexão musical encontrada.");
  limparCacheMusica();
  return obterMinhaConexao(idUsuario);
}

export async function desconectarMusica(idUsuario: number) {
  const conexao = await prisma.conexaoMusica.findUnique({
    where: { id_usuario: idUsuario },
    select: { provedor: true },
  });
  await prisma.conexaoMusica.deleteMany({ where: { id_usuario: idUsuario } });
  limparTokensSpotifyEmMemoria(idUsuario);
  limparCacheMusica();
  return { desconectado: Boolean(conexao) };
}

export async function salvarConexaoLastFm(
  idUsuario: number,
  externoId: string,
  nomeExibicao: string,
) {
  const conexao = await prisma.conexaoMusica.upsert({
    where: { id_usuario: idUsuario },
    create: {
      id_usuario: idUsuario,
      provedor: "lastfm",
      id_externo: externoId,
      nome_exibicao: nomeExibicao,
      refresh_token_cifrado: null,
    },
    update: {
      provedor: "lastfm",
      id_externo: externoId,
      nome_exibicao: nomeExibicao,
      refresh_token_cifrado: null,
    },
    select: {
      provedor: true,
      id_externo: true,
      nome_exibicao: true,
      visibilidade: true,
    },
  });
  limparTokensSpotifyEmMemoria(idUsuario);
  limparCacheMusica();
  return { conectado: true as const, ...conexao };
}
