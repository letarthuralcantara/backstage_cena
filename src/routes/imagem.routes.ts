import { Router, Request, Response, NextFunction } from "express";
import ImagemController from "../controllers/ImagemController.js";
import { uploadImagem } from "../config/multer-imagem.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = Router();

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
    next(error);
  });
}

// A ordem importa: autenticar, receber o arquivo, e só então executar o handler.
router.post("/", isAuthenticated, uploadImagemComLimpeza, ImagemController.enviar);
router.put("/", isAuthenticated, uploadImagemComLimpeza, ImagemController.enviar);

export default router;
