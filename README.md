# Backstage Cena

Plataforma web para conectar músicos, com front-end estático, API Express, Prisma/SQLite, autenticação JWT, validação com Zod, upload de áudio e testes automatizados.

## Visão geral

O Backstage Cena é uma aplicação web desenvolvida para conectar músicos, produtores e artistas independentes. A plataforma permite:

- cadastro e login de usuários;
- criação e atualização de perfil;
- publicação de postagens de áudio;
- publicação de tweets;
- pesquisa de perfis e colaboração;
- envio de e-mails de boas-vindas e redefinição de senha.

A aplicação combina front-end estático em HTML/CSS/JavaScript com API REST em Node.js + Express e persistência com Prisma + SQLite.

## Stack principal

- Front-end: HTML, CSS, JavaScript ESM
- Back-end: Node.js, TypeScript, Express, Morgan
- Banco: Prisma + SQLite
- Autenticação: JWT + Argon2
- Validação: Zod
- Upload: Multer
- E-mail: Nodemailer
- Testes: Vitest, Supertest, Playwright, JSDOM

## Requisitos

- Node.js 20+
- npm
- SQLite local
- Um arquivo `.env` com variáveis de ambiente

## Configuração inicial

```bash
npm install
cp .env.example .env
npm run setup
npm run dev
```

O servidor será iniciado em:

```text
http://localhost:3000
```

## Variáveis de ambiente

Use o arquivo `.env.example` como referência. As variáveis essenciais são:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="seu_segredo_aqui"
RESET_CODE_SECRET="seu_segredo_opcional"
NODE_ENV=development
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@backstagecena.com
APP_PROFILE_URL=http://localhost:3000/pages/perfil.html
```

Observações:

- `.env` não deve ser versionado;
- em desenvolvimento, se `EMAIL_HOST` estiver vazio, o sistema usa uma conta Ethereal de testes e imprime no terminal a URL da pré-visualização do e-mail;
- `APP_PROFILE_URL` adiciona o botão de “Completar meu perfil” no e-mail de boas-vindas;
- os valores reais das credenciais de e-mail devem ficar somente no `.env` local.
- `RESET_CODE_SECRET` é opcional; sem ele, o HMAC do código usa `JWT_SECRET`.

## Integração musical

O perfil pode exibir a faixa atual e os artistas/faixas mais ouvidos usando Spotify ou Last.fm. A conexão e a visibilidade são gerenciadas em **Configurações → Música**.

### Spotify

1. Crie um app no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) e copie o Client ID para `SPOTIFY_CLIENT_ID`.
2. Adicione em Redirect URIs a URI exata configurada em `SPOTIFY_REDIRECT_URI`, incluindo caminho e porta. Em desenvolvimento, use `http://127.0.0.1:3000/api/musica/spotify/callback`; `localhost` não é aceito para HTTP. Fora de desenvolvimento, use HTTPS e mantenha o mesmo valor no Dashboard e no `.env`.
3. Configure `MUSICA_TOKEN_KEY` como uma chave Base64 de exatamente 32 bytes (por exemplo, `openssl rand -base64 32`). Ela protege os refresh tokens com AES-256-GCM e também assina o `state` temporário do OAuth.
4. No Spotify Development Mode, o proprietário do app precisa ter Premium e só pode autorizar até 5 usuários cadastrados como usuários de teste no Dashboard. Contas fora dessa lista recebem HTTP 403; a interface informa que a conta não está autorizada e não exibe uma falha técnica.

A autorização usa Authorization Code com PKCE (S256), `state` assinado com validade de 10 minutos e URI de redirecionamento validada exatamente. O app solicita somente `user-read-currently-playing` e `user-top-read`. As telas usam `GET /me/player/currently-playing` e `GET /me/top/{artists|tracks}`; os dados de top de curto prazo (`short_term`) representam aproximadamente quatro semanas e são rotulados **Últimas 4 semanas**. Respostas HTTP 429 preservam o `Retry-After`; o perfil aguarda esse intervalo antes da próxima consulta de faixa atual.

### Last.fm e privacidade

Configure `LASTFM_API_KEY`. A pessoa informa o próprio nome de usuário e a aplicação valida a conta com `user.getInfo`. Last.fm não é uma reprodução em tempo real universal: a interface informa que só mostra faixas/artistas scrobblados e que a atividade do perfil Last.fm precisa estar pública. Os tops usam `1month`, `6month` e `12month`.

Cada conexão permite `publico` (todos), `clubes` (somente membros que compartilham ao menos um clube) ou `oculto` (somente o próprio usuário). Essa regra é aplicada pela API, não apenas escondida no navegador. Consultas de faixa atual são armazenadas em cache por 10 segundos, tops por 6 horas e chamadas simultâneas idênticas são agrupadas; não há polling no servidor.

Rotas principais, sob `/api/musica`:

- `POST /spotify/conectar` inicia o OAuth; `GET /spotify/callback` é o callback público.
- `POST /lastfm/conectar` valida e conecta `{ "username": "..." }`.
- `GET /minha`, `PATCH /minha` com `{ "visibilidade": "publico|clubes|oculto" }` e `DELETE /minha` gerenciam a conexão autenticada.
- `GET /usuario/:id/agora` e `GET /usuario/:id/top?tipo=artistas|faixas&periodo=curto|medio|longo&limite=10` leem o perfil respeitando a visibilidade.

## Scripts disponíveis

```bash
npm run dev
npm start
npm run build
npm test
npm run front:test
npm run e2e
npm run coverage
npm run prisma:generate
npm run prisma:push
npm run seed
npm run setup
npm run reset
```

## Banco de dados e Prisma

O projeto usa Prisma para modelagem, migrações e acesso ao banco:

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run seed
```

Estrutura relevante:

- `prisma/schema.prisma` — modelo do banco
- `prisma/migrations/` — migrations versionadas
- `prisma/seed.ts` — dados iniciais para desenvolvimento
- `src/models/` — camada de acesso ao banco via Prisma Client

## Validação, autenticação e e-mail

A aplicação aplica regras de validação antes dos controllers usando Zod:

- `src/schema/usuario.schema.ts`
- `src/schema/conteudo.schema.ts`
- `src/middlewares/validate.ts`

A autenticação usa JWT e proteção de rotas por middleware:

- `src/middlewares/auth.ts`
- `src/controllers/UsuarioController.ts`

O envio de e-mail foi centralizado em serviço isolado:

- `src/config/mail.ts`
- `src/services/EmailService.ts`

O cadastro envia e-mail de boas-vindas após criação bem-sucedida. Falha no SMTP não bloqueia a criação e apenas registra o erro no log.

Os limites de login e redefinição usam armazenamento em memória por padrão. Em implantações com mais de uma instância, configure um store compartilhado (por exemplo, Redis com `rate-limit-redis`).

## Testes

Os testes estão organizados por escala e responsabilidade:

- `npm test`: testes unitários e de API
- `npm run front:test`: testes de front-end com JSDOM
- `npm run e2e`: testes end-to-end com Playwright
- `npm run coverage`: relatório de cobertura de código

## Estrutura do projeto

```text
.
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── uploads/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── errors/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── schema/
│   ├── services/
│   └── utils/
├── tests/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── request.http
├── README.md
└── LICENSE
```

## Diagrama ERD

```mermaid
erDiagram
  USUARIO ||--o| CONFIGURACAO_USUARIO : possui
  USUARIO ||--o{ POSTAGEM : publica
  USUARIO ||--o{ TWEET : escreve
  USUARIO ||--o{ USUARIO_INSTRUMENTO : relaciona
  INSTRUMENTO ||--o{ USUARIO_INSTRUMENTO : possui
  USUARIO ||--o{ USUARIO_GENERO : relaciona
  GENERO ||--o{ USUARIO_GENERO : possui
  USUARIO ||--o{ USUARIO_DAW : relaciona
  DAW ||--o{ USUARIO_DAW : possui
  USUARIO ||--o{ USUARIO_DISPONIBILIDADE : informa
  DISPONIBILIDADE ||--o{ USUARIO_DISPONIBILIDADE : possui

  USUARIO {
    int id_usuario PK
    string email UK
    string senha
    string codigo_reset_senha
    datetime codigo_reset_expira_em
    string status
  }

  CONFIGURACAO_USUARIO {
    int id_config PK
    int id_usuario FK
    int mostrar_email
    int mostrar_telefone
    int mostrar_redes_sociais
    int perfil_publico
  }

  POSTAGEM {
    int id_postagem PK
    int id_usuario FK
    string audio_url
  }

  TWEET {
    int id_tweet PK
    int id_usuario FK
    string texto
  }
```

## Observações importantes

- O projeto usa `localStorage` para armazenar token do usuário no front-end; isso é adequado para a entrega didática, mas em produção uma opção mais segura seria usar cookies HttpOnly.
- A validação do front-end é de experiência/UX; a proteção real está no back-end.
- As regras de negócio e de integridade permanecem no servidor, no schema e no banco.

## Autor

Desenvolvido por Arthur Alcântara e equipe do projeto Backstage Cena.
