import { Router } from "express";
import TweetController from "../controllers/TweetController.js";
import { uploadImagemTweet } from "../config/multer-tweet.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { removerUploadTemporario } from "../utils/upload.js";
import {
  tweetParamsSchema,
  tweetUsuarioSchema,
  criarTweetSchema,
  semEntradaSchema,
} from "../schema/conteudo.schema.js";

const router = Router();

router.get("/feed", validate(semEntradaSchema), TweetController.feed);
router.get(
  "/usuario/:id_usuario",
  validate(tweetUsuarioSchema),
  TweetController.porUsuario,
);
router.post(
  "/",
  isAuthenticated,
  uploadImagemTweet,
  validate(criarTweetSchema, {
    onInvalid: (req) => removerUploadTemporario(req.file),
  }),
  TweetController.criar,
);
// isOwner não se aplica aqui pelo mesmo motivo do postagem.routes.ts: `:id` é
// o id do TWEET, não do usuário. TweetModel.remover já valida o dono.
router.delete(
  "/:id",
  isAuthenticated,
  validate(tweetParamsSchema),
  TweetController.remover,
);

export default router;
