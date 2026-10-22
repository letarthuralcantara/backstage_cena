import "dotenv/config";
import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import usuarioRouter from "./routes/usuario.routes.js";
import postagemRouter from "./routes/postagem.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import imagemRouter from "./routes/imagem.routes.js";
import clubeRouter from "./routes/clube.routes.js";
import workonRouter from "./routes/workon.routes.js";
import musicaRouter from "./routes/musica.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requireJson } from "./middlewares/requireJson.js";
import helmet from "helmet";

const app = express();

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,   // quebraria as fontes e imagens externas
    frameguard: { action: "deny" },     // anti-clickjacking
    contentSecurityPolicy: {
      useDefaults: false,
      reportOnly: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://avatars.githubusercontent.com",
          "https://i.scdn.co",
          "https://lastfm.freetls.fastly.net",
          "https://lastfm-img2.akamaized.net",
        ],
        mediaSrc: ["'self'", "blob:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);

app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// Respostas da API têm dados de usuário: não podem ficar em cache de proxy
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(morgan("dev", {
  skip: (req) => req.originalUrl.startsWith("/api/musica/spotify/callback"),
}));
app.use(express.json());
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ??
      "http://localhost:3000",
  }),
);
app.use(express.static("public"));

// O upload de avatar é multipart/form-data, por isso fica ANTES de /api/usuarios:
// o requireJson daquele prefixo devolveria 415 para qualquer corpo que não seja JSON.
app.use("/api/usuarios/imagem", imagemRouter);
app.use("/api/usuarios", requireJson, usuarioRouter);
app.use("/api/postagens", postagemRouter);
app.use("/api/tweets", tweetRouter);
app.use("/api/clubes", clubeRouter);
app.use("/api/workons", workonRouter);
app.use("/api/musica", musicaRouter);

app.get("/", (_req: Request, res: Response) => {
  res.json({ mensagem: "API Backstage Cena rodando" });
});

app.use((req: Request, res: Response, next) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ erro: "Rota não encontrada." });
    return;
  }
  res.status(404).sendFile("404.html", { root: "public" }, (err) => {
    if (err) next(err);
  });
});

app.use(errorHandler);

export default app;
