import { promises as fs } from "node:fs";
import path from "node:path";
import prisma from "../database/prisma.js";
import {
  CAMINHO_PUBLICO_AVATARES,
  PASTA_AVATARES,
} from "../config/multer-imagem.js";

/**
 * Apaga do disco um avatar a partir do caminho público (/uploads/avatars/x.png).
 * Só mexe em arquivos dentro da pasta de avatares: qualquer outro caminho é ignorado.
 */
export async function removerArquivoAvatar(
  caminhoPublico: string,
): Promise<void> {
  if (!caminhoPublico.startsWith(`${CAMINHO_PUBLICO_AVATARES}/`)) return;
  const arquivo = path.resolve(
    PASTA_AVATARES,
    path.basename(caminhoPublico),
  );
  if (path.dirname(arquivo) !== PASTA_AVATARES) return;
  await fs.unlink(arquivo).catch(() => undefined);
}

/**
 * Um avatar por usuário (id_usuario é @unique): cria no primeiro envio e
 * atualiza o caminho nos seguintes, apagando o arquivo antigo do disco.
 */
async function salvar(id_usuario: number, caminho: string) {
  const anterior = await prisma.imagemUsuario.findUnique({
    where: { id_usuario },
  });
  const imagem = await prisma.imagemUsuario.upsert({
    where: { id_usuario },
    create: { id_usuario, caminho },
    update: { caminho },
  });
  if (anterior && anterior.caminho !== caminho) {
    await removerArquivoAvatar(anterior.caminho);
  }
  return { imagem, criada: !anterior };
}

export default { salvar };
