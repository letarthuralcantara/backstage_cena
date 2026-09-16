# Backstage Cena

Plataforma web para conectar musicos, com front-end estatico, API Express,
Prisma/SQLite, autenticacao JWT, validacao Zod, upload de audio e testes
automatizados.

## Desenvolvimento local

Requisitos: Node.js 20+, npm e um banco SQLite configurado em `DATABASE_URL`.

```bash
npm install
cp .env.example .env
npm run setup
npm run dev
```

Para validar o projeto antes da apresentacao:

```bash
npm run build
npm test
npm run front:test
npm run coverage
npm run e2e
```

`npm run dev` e `npm start` iniciam o mesmo entrypoint, e os testes de API
importam `src/app.ts` sem abrir uma porta.

O servidor fica em `http://localhost:3000`. Em `NODE_ENV=development`, se o
SMTP não estiver configurado, o cadastro tenta usar uma conta Ethereal e
registra no console a URL de prévia da mensagem. Em produção, preencha
`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS` e
`EMAIL_FROM` no `.env`.

O endpoint de cadastro responde `201` mesmo quando o SMTP falha, pois o e-mail
é um efeito colateral. Dados inválidos respondem `400`, recursos inexistentes
respondem `404` e conflitos de unicidade respondem `409`.

Variáveis opcionais de e-mail: `APP_PROFILE_URL` adiciona o botão de perfil,
e `EMAIL_REPLY_TO` define o endereço de resposta.

## Banco, migration e seed

O Prisma Client fica isolado na camada Model (`src/models`). Controllers
coordenam regras HTTP e as rotas aplicam autenticação e validação antes deles.
Para recriar o banco e os dados de demonstração:

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run seed
```

A migration inicial versionada está em
`prisma/migrations/20260914143000_init/migration.sql`. Em um banco novo, use
`npx prisma migrate deploy` para aplicá-la e depois `npm run seed`.

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
		string senha_hash
		string status
	}
	CONFIGURACAO_USUARIO {
		int id_config PK
		int id_usuario FK UK
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
	INSTRUMENTO { int id_instrumento PK string nome UK }
	GENERO { int id_genero PK string nome UK }
	DAW { int id_daw PK string nome UK }
	DISPONIBILIDADE { int id_disponibilidade PK string descricao UK }
	USUARIO_INSTRUMENTO { int id_usuario PK,FK int id_instrumento PK,FK }
	USUARIO_GENERO { int id_usuario PK,FK int id_genero PK,FK }
	USUARIO_DAW { int id_usuario PK,FK int id_daw PK,FK }
	USUARIO_DISPONIBILIDADE { int id_usuario PK,FK int id_disponibilidade PK,FK }
```

access the web page: https://letarthuralcantara.github.io/backstage_cena/public/pages/index.html

Backstage Cena is a web application created to connect musicians through a centralized platform. Users can register, complete a profile, publish audio previews and tweets, and search for collaborators.

This project was developed as part of my learning process in web development and database integration.

---

## Project overview
Musicians often rely on multiple social networks to promote their work and find collaborators. Backstage Cena was designed as a focused platform where musicians can create profiles and centralize information related to their work, reducing fragmentation and improving accessibility.

The project goes beyond a static website by implementing data persistence using a relational database.

---

## Objetivos
- Conectar musicos e produtores independentes
- Permitir cadastro, autenticacao e perfis persistentes
- Integrar front-end, API, banco relacional e uploads

---

## Arquitetura
O front-end estatico consome uma API Express. Controllers coordenam as
requisicoes, Models concentram o Prisma Client e os schemas Zod validam as
entradas antes da camada de negocio.

O banco SQLite e recriado por migration e seed; senhas sao armazenadas com
Argon2 e rotas privadas usam JWT.

---

## Features
- User registration  
- Persistent storage using a SQL database  
- Structured user data management  
- Integration between front-end, back-end, and database  

---

## Technologies used
- HTML, CSS and JavaScript ESM
- TypeScript, Node.js, Express and Morgan
- Prisma with SQLite, migrations and seed
- Argon2, JWT, Zod, Multer and Nodemailer
- Vitest, Supertest, JSDOM and Playwright

---

## Data Base

[![Diagrama do Banco de Dados](/public/images/mermaid-diagram-2026-05-21-083052.png.png)](https://mermaid.live/embed?theme=default&look=classic&mode=light#pako:eNqtVs1...)
## Testes
Os testes rapidos sao separados por responsabilidade:

- `npm test`: unidade e rotas com Supertest, sem abrir porta
- `npm run front:test`: Vitest com JSDOM e mocks de `fetch`/`localStorage`
- `npm run e2e`: fluxo de navegador com Playwright
- `npm run coverage`: relatorio V8 com piso configurado

O E2E requer as dependencias nativas do Chromium no sistema operacional.

---

## Learning outcomes
Through this project, I was able to:
- Design and use relational databases  
- Write SQL queries for data manipulation  
- Understand data persistence in web applications  
- Integrate front-end interfaces with a database  
- Organize a web project structure  

---

## Limitations and future improvements
- Improved user authentication and access control  
- Enhanced security for database operations  
- Better interface design and responsiveness  
- Additional features for collaboration between users  

---

## Academic context
This project was developed during my technical education as a practical exercise in web development and relational database integration.

---

## Author
Developed by Arthur

