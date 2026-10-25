import { Router, Request, Response, NextFunction } from "express";
import { promises as fs } from "node:fs";
import ImagemController from "../controllers/ImagemController.js";
import { uploadImagem } from "../config/multer-imagem.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = Router();

/** Executa o Multer e remove arquivo materializado antes de qualquer falha. */
function uploadImagemComLimpeza(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  uploadImagem(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const caminho = req.file?.path;
    if (!caminho) {
      next(error);
      return;
    }

    void fs.unlink(caminho).catch(() => undefined).finally(() => next(error));
  });
}

// A ordem importa: autenticar, receber o arquivo, e só então executar o handler.
router.post("/", isAuthenticated, uploadImagemComLimpeza, ImagemController.enviar);
router.put("/", isAuthenticated, uploadImagemComLimpeza, ImagemController.enviar);

export default router;
