import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export interface StorageService {
  salvar(buffer: Buffer, subpasta: string, nomeArquivo?: string): Promise<string>;
  remover(caminhoRelativo: string): Promise<void>;
  caminhoAbsoluto(caminhoRelativo: string): string;
}

export class LocalStorageService implements StorageService {
  readonly rootDir: string;

  constructor(rootDir = path.resolve(process.cwd(), "storage")) {
    this.rootDir = rootDir;
  }

  async salvar(buffer: Buffer, subpasta: string, nomeArquivo?: string): Promise<string> {
    const pasta = path.resolve(this.rootDir, subpasta);
    await fs.mkdir(pasta, { recursive: true });
    const nome = nomeArquivo ?? `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const destino = path.join(pasta, nome);
    await fs.writeFile(destino, buffer);
    return path.posix.join("/storage", subpasta, nome).replace(/\\/g, "/");
  }

  async remover(caminhoRelativo: string): Promise<void> {
    const alvo = this.caminhoAbsoluto(caminhoRelativo);
    await fs.rm(alvo, { force: true });
  }

  caminhoAbsoluto(caminhoRelativo: string): string {
    if (caminhoRelativo.startsWith("/")) {
      return path.resolve(this.rootDir, path.relative("/storage", caminhoRelativo));
    }
    return path.resolve(this.rootDir, caminhoRelativo);
  }
}

export const storageService = new LocalStorageService();
