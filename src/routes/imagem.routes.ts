import { Router } from "express";
import ImagemController from "../controllers/ImagemController.js";
import { uploadImagem } from "../config/multer-imagem.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = Router();

// A ordem importa: autenticar, receber o arquivo, e só então executar o handler.
// Sem token, o 401 sai antes de o Multer gravar qualquer coisa.
router.post("/", isAuthenticated, uploadImagem, ImagemController.enviar);
router.put("/", isAuthenticated, uploadImagem, ImagemController.enviar);

export default router;
