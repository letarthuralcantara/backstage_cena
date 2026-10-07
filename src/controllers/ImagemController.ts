import { Request, Response, NextFunction } from "express";
import { promises as fsPromises } from "node:fs";
import imagemService from "../models/ImagemModel.js";
import { HttpError } from "../errors/HttpError.js";
import { CAMINHO_PUBLICO_AVATARES } from "../config/multer-imagem.js";
import { imagemTemAssinaturaValida } from "../utils/imagem.js";

function erroImagem(mensagem: string): HttpError {
  return new HttpError(400, mensagem, [
    { code: "custom", path: ["body", "image"], message: mensagem },
  ]);
}

const ImagemController = {
  // POST e PUT /api/usuarios/imagem: mesma regra (um avatar por usuário).
  // 201 quando é o primeiro avatar, 200 quando substitui o anterior.
  async enviar(req: Request, res: Response, next: NextFunction): Promise<void> {
    const arquivo = req.file;
    try {
      if (!arquivo) throw erroImagem("Envie uma imagem no campo \"image\".");

      const id_usuario = req.userId;
      if (!id_usuario) throw new HttpError(401, "Usuário não autenticado.");

      const inicio = await fsPromises
        .open(arquivo.path, "r")
        .then(async (handle) => {
          try {
            const buffer = Buffer.alloc(12);
            await handle.read(buffer, 0, 12, 0);
            return buffer;
          } finally {
            await handle.close();
          }
        });
      if (!imagemTemAssinaturaValida(inicio, arquivo.mimetype))
        throw erroImagem("O conteúdo do arquivo não é uma imagem válida.");

      const caminho = `${CAMINHO_PUBLICO_AVATARES}/${arquivo.filename}`;
      const { imagem, criada } = await imagemService.salvar(id_usuario, caminho);
      res.status(criada ? 201 : 200).json({ imagem });
    } catch (error) {
      if (arquivo) await fsPromises.unlink(arquivo.path).catch(() => undefined);
      next(error);
    }
  },
};

export default ImagemController;
