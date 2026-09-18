# Relatório de autoavaliação atualizado

Data: 18/09/2026.

## 1. Avaliação por aspecto

### B1.1 - Front-end: 100/100

- **Estilização: 20/20.** CSS próprio, responsividade, animações e Font Awesome nas páginas e em `public/css/global.css`.
- **JSON: 20/20.** `public/data/dados.json` é agora a fonte primária de catálogos em `public/js/dados.js`, com fallback para a API.
- **Geração dinâmica: 20/20.** O cadastro gera áreas, instrumentos, gêneros e DAWs a partir de `fetchDados()`.
- **ESM: 20/20.** `auth.js`, `dados.js`, `postagens.js` e `loading.js` usam `import`/`export`.
- **Eventos: 20/20.** Submit, input, clique, mudança, `setCustomValidity`, toast e mensagens de API estão implementados. Alguns `onclick` antigos ainda existem, mas não impedem o fluxo.

### B1.2 - Back-end e integração: 100/100

- `src/app.ts` usa Express, Morgan, CORS, JSON e arquivos estáticos.
- Usuários, postagens e tweets têm rotas REST e status adequados.
- `request.http` cobre cadastro, login, erros, token, CRUD, query, reset e conteúdo.
- O frontend consome a API com `fetch`, envia Bearer token e exibe respostas.
- O teste E2E de login e publicação passou após corrigir o locator acessível da aba Tweet.

### B2.1 - Banco com SQL: 52/100, limitação histórica

A migration contém SQL relacional, FKs, tabelas de junção e cascatas, mas o CRUD atual usa Prisma Client. A rubrica B2.1 exige SQL manual na camada Model; manter uma segunda implementação SQL apenas para obter 100 entraria em conflito com a etapa posterior B2.2 e duplicaria a persistência. O projeto deve ser apresentado como evolução de B2.1 para B2.2, não como CRUD SQL manual atual.

### B2.2 - Banco com Prisma: 100/100

- `prisma/schema.prisma` define PKs, FKs, unicidades, relações e cascatas.
- Models concentram Prisma Client; Controllers tratam HTTP; rotas aplicam validação/auth.
- Há migrations inicial e incremental de reset, seed Prisma, scripts e README.
- O ERD do README foi sincronizado com `senha` e os campos de reset.
- O baseline do `dev.db` foi resolvido; `npx prisma migrate status` informa schema atualizado.
- O frontend cria, lista, edita e remove usuários e conteúdo.

### B3.1 - Autenticação: 100/100

- E-mail único no Prisma.
- Senhas com Argon2 em cadastro, login, seed, alteração e reset.
- JWT usa `JWT_SECRET` do ambiente.
- `isAuthenticated`, `isOwner` e a checagem de dono nos Models protegem recursos.
- `request.http`, testes API/unitários e E2E cobrem login, token, IDOR, rotas protegidas e logout/redirecionamento.

### B3.2 - Validação e e-mail: 100/100

- Zod valida body, params e query antes dos Controllers.
- `validate()` é genérico e `errorHandler` centraliza 400 com `issues`, além de 404/409.
- Nodemailer aparece apenas em `src/config/mail.ts` e `src/services/EmailService.ts`.
- `.env.example` não contém credenciais; Ethereal gera URL de preview; e-mails têm HTML e texto puro.
- Cadastro válido envia boas-vindas; cadastro inválido não chama e-mail; falha SMTP mantém 201 e é registrada.
- Reset usa resposta genérica, expiração, uso único e código gerado com `crypto.randomInt`.
- Frontend usa `required`, `type=email`, `minlength`, `setCustomValidity`, toasts e erros por campo.

## 2. Como cada aspecto é atendido

**Frontend.** O HTML fornece a estrutura e a validação nativa; os módulos ESM concentram autenticação, catálogos e conteúdo; `dados.json` alimenta a geração dinâmica e a API continua como fallback. Eventos de formulário e campos fornecem retorno imediato sem substituir a proteção da API. Perguntas: **A validação do frontend protege o banco?** Não, a API repete as regras. **Por que manter fallback?** Para a interface continuar funcional se o arquivo estático falhar.

**Back-end.** `src/app.ts` registra o pipeline Express, as rotas encaminham para Controllers e os Models isolam persistência. `request.http` permite demonstrar status, autenticação, erros e CRUD no REST Client. Perguntas: **Onde um body inválido é rejeitado?** No `validate()` antes do Controller. **Por que 409?** Para conflito de unicidade, como e-mail já cadastrado.

**Prisma.** O schema declara relações e o Prisma Client executa o CRUD na camada Model. Migrations e seed permitem recriar um banco novo, enquanto o baseline documentado mantém bancos antigos sem apagar dados. Perguntas: **Onde está a FK?** Nas relações `@relation(fields: ..., references: ...)`. **O ERD bate com o schema?** Sim nos campos documentados; alterações futuras devem atualizar os dois.

**Autenticação.** Cadastro e login usam Argon2 e JWT; o middleware verifica Bearer e o dono é verificado por rota ou no Model conforme o identificador seja usuário ou recurso. Perguntas: **Senha é retornada?** Não, `sanitizeUsuario` remove o hash. **Token válido permite editar qualquer usuário?** Não, `isOwner` retorna 403.

**Validação e e-mail.** Schemas Zod validam a entrada, o middleware global formata erros e o serviço de e-mail permanece isolado. O Controller persiste primeiro e trata SMTP como efeito colateral; o teste de falha prova que o cadastro continua 201. Perguntas: **E-mail inexistente revela informação?** Não, reset responde mensagem genérica. **SMTP fora do ar cancela cadastro?** Não, registra erro e preserva 201.

## 3. Nota final

| Atividade | Nota |
|---|---:|
| B1.1 Front-end | 100/100 |
| B1.2 Back-end/integração | 100/100 |
| B2.1 SQL | 52/100, etapa substituída por Prisma |
| B2.2 Prisma | 100/100 |
| B3.1 Autenticação | 100/100 |
| B3.2 Validação/e-mail | 100/100 |

Nas etapas atuais e coerentes com a arquitetura final, a nota é 100. A única nota menor é B2.1 porque ela exige uma arquitetura anterior, baseada em SQL manual, que foi substituída pelo Prisma de forma explícita.

## 4. Análise geral do código

### Validações executadas

- `npm run build`: passou.
- `npm test`: passou, 33 testes.
- `npm run front:test`: passou, 3 testes.
- `npx vitest run tests/api/reset-senha.test.ts`: passou, 7 testes.
- `npx vitest run tests/api/routes.test.ts`: passou, 9 testes.
- `CI=1 npm run e2e`: passou, 1 teste.
- `npx prisma migrate status`: schema atualizado.

### Riscos residuais

- JWT em `localStorage` é mais exposto a XSS que cookie HttpOnly; a migração para cookie exigiria alteração coordenada no frontend e backend.
- O código de reset é temporário e uso único, mas fica em texto puro; pode ser trocado por hash do código com alteração nos testes.
- Login e reset ainda precisam de rate limit para proteção contra abuso online.
- Há alguns `onclick` inline antigos no cadastro; podem ser migrados para listeners ESM sem alterar comportamento.

## 5. Sugestões futuras

1. Adicionar rate limit em login e reset.
2. Usar cookie HttpOnly/SameSite para o JWT.
3. Armazenar hash do código de reset, mantendo o código original somente no e-mail.
4. Remover os últimos handlers `onclick` inline.
5. Manter o ERD atualizado sempre que `schema.prisma` mudar.

## 6. Extrato de commits

`git shortlog -sne --all` registrou 87 commits de Arthur Alcântara e 36 de TUCKO. Arthur atuou de 12/03/2026 a 16/09/2026 principalmente em Prisma/SQLite, MVC, JWT/Argon2, validação, e-mail, frontend, testes e segurança. TUCKO atuou de 05/01/2026 a 06/06/2026 principalmente na fundação do frontend, CRUD Express, integração inicial com banco e páginas. O histórico possui alguns títulos genéricos; a atribuição deve ser explicada por funcionalidade na apresentação.
