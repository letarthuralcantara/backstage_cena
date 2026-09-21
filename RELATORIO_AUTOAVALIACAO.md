# Relatório de autoavaliação — B3.2: Validação e Envio de E-mail

## 1. Avaliação por aspecto

### 1) Schemas de validação e middleware genérico — 20/20

- Nota: 20/20.
- Comentário: os schemas de entrada foram organizados em `src/schema/usuario.schema.ts`; `cadastroSchema`, `loginSchema`, `redefinirSenhaSchema`, `statusSchema` e outros usam `z.object` com regras de `email`, mínimo de caracteres, valores positivos e enum. O middleware genérico `validate(schema)` em `src/middlewares/validate.ts` executa `schema.safeParse({ body, query, params })` antes do controller, e reescreve `req.body`, `req.query` e `req.params` apenas quando os dados são válidos. Nenhum `if` manual de validação foi encontrado no controller para checar entrada invliada; o controller trata apenas regras de negócio.
- O que falta para nota máxima: nada relevante; o projeto já atende ao critério com boa separação de responsabilidade.

### 2) Respostas de erro de validação — 20/20

- Nota: 20/20.
- Comentário: o middleware `errorHandler` em `src/middlewares/errorHandler.ts` converte `HttpError` em respostas JSON com `erro` e, quando existir, `issues`. Isso gera `400` com descrição de campo e motivo. Em `src/errors/HttpError.ts`, a classe padroniza o `code` e os `issues`. Casos de recurso inexistente retornam 404 no model (`readById`, `updateStatus`), e conflito no cadastro de e-mail usa 409 em `src/models/UsuarioModel.ts` (`findUnique` + `HttpError(409, ...)`).
- O que falta para nota máxima: nada relevante; a diferenciação entre 400, 404 e 409 está clara e funcionando.

### 3) Serviço de envio de e-mail (SMTP, variáveis de ambiente, serviço isolado) — 20/20

- Nota: 20/20.
- Comentário: a configuração SMTP foi separada em `src/config/mail.ts`; em desenvolvimento, quando `EMAIL_HOST` estiver vazio, o sistema usa `nodemailer.createTestAccount()` para gerar uma conta de teste e expor a URL de prévia no terminal. O serviço de e-mail fica em `src/services/EmailService.ts`, com funções para boas-vindas e redefinição de senha; a biblioteca `nodemailer` aparece apenas nesses dois arquivos, nunca em rotas/controllers. O arquivo `.env.example` define `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS` e `APP_PROFILE_URL`, sem credenciais reais.
- O que falta para nota máxima: apenas manter o arquivo `.env` local fora do controle de versão e registrar explicitamente no README a convenção de uso em desenvolvimento.

### 4) Integração do e-mail ao fluxo da aplicação e testes — 20/20

- Nota: 20/20.
- Comentário: em `src/controllers/UsuarioController.ts`, o cadastro cria o usuário primeiro e só depois chama `EmailService.enviarBoasVindas(...)` em um `try/catch` isolado. Se o SMTP falhar, o erro é registrado no console e a requisição continua com `201`, conforme o requisito. A mesma regra foi aplicada ao fluxo de “esqueci senha”. O arquivo `request.http` contém exemplos de cadastro válido, e-mail duplicado, dados inválidos, login, reset e rota protegida; isso demonstra que o projeto cobre o cenário com e-mail e validação.
- O que falta para nota máxima: nenhum item crítico; a solução atende ao requisito de “cadastro recusa não envia e-mail; falha SMTP não derruba o 201”.

### 5) Validação no front-end e retorno ao usuário — 18/20

- Nota: 18/20.
- Comentário: a página de cadastro em `public/pages/cadastro.html` usa `required`, `minlength`, `type="email"` e validação de confirmação de senha com `setCustomValidity`. O script em `public/pages/cadastro.html` também consulta os erros retornados pela API (`erro.issues`) e marca o campo correspondente, além de mostrar `toast` de sucesso/erro. O comportamento do front-end é essencialmente de retorno ao usuário e não de proteção; a proteção real fica na API.
- O que falta para nota máxima: a interface poderia expor mais mensagens por campo em outros formulários (por exemplo, uma passagem uniforme para todos os inputs) e reforçar a mensagem de erro genérica em casos de falha global em cada tela.

## 2. Como cada aspecto é atendido

### 1) Schemas de validação e middleware genérico

A validação foi organizada em Zod e centralizada com um middleware genérico em `src/middlewares/validate.ts`. Cada rota usa um schema específico em `src/schema/usuario.schema.ts`; por exemplo, `cadastroSchema` exige `nome_completo`, `email`, `senha` e `status`, enquanto `alterarSenhaSchema`, `redefinirSenhaSchema` e `statusSchema` validam `body`, `query` e `params`. Isso permite que o controller receba dados já transformados e limpos, reduzindo verificações manuais com `if` e eliminando regra de entrada espalhada por vários pontos do código. A arquitetura é adequada porque deixa a validação em um único lugar e evita que a lógica de negócio veja dados inconsistentes. Perguntas que um avaliador pode fazer: “O controller ainda valida dados manualmente?” Não; ele assume que os dados passaram pelo middleware e apenas opera a regra de negócio. “As rotas públicas e privadas usam o mesmo padrão?” Sim; `src/routes/usuario.routes.ts` aplica `validate(...)` antes do controller em todas as rotas relevantes.

### 2) Respostas de erro de validação

As respostas inválidas retornam `400 Bad Request` com um corpo estruturado, graças ao `HttpError` e ao `errorHandler`. O arquivo `src/middlewares/errorHandler.ts` transforma a exceção em JSON com `{ erro, issues }`, e `src/schema/usuario.schema.ts` já informa mensagem específica por campo. Quando um recurso não existe, o model lança `HttpError(404, ...)`; quando há conflito de e-mail, o `create` do usuário lança `HttpError(409, ...)`. Esse comportamento é adequado porque separa categorias de erro sem misturar validação, ausência de recurso e conflito de domínio. Perguntas: “Como distinguir erro de formato de recurso inexistente?” O `400` vem de schema inválido; o `404` vem de `findUnique` sem registro; o `409` vem de e-mail duplicado. “A API expõe as causas para o cliente?” Sim, em `issues` ela informa `path` e `message`, permitindo que o front-end mostre o erro no campo correto.

### 3) Serviço de envio de e-mail

O serviço de e-mail foi isolado em `src/services/EmailService.ts`, e a configuração depende de variáveis de ambiente em `src/config/mail.ts` e `.env.example`. Em ambiente de desenvolvimento, quando `EMAIL_HOST` estiver vazio, o sistema cria uma conta de teste via `nodemailer.createTestAccount()` e imprime a URL de prévia do e-mail no console. A mensagem também foi implementada em HTML e texto puro, com um `escapeHtml` para evitar caracteres perigosos e um botão de perfil. Isso é uma solução adequada porque deixa a infra de e-mail fora de rotas e controllers, impedindo acoplamento entre camada HTTP e infraestrutura de transporte. Perguntas: “A biblioteca de e-mail aparece fora do serviço?” Não; `nodemailer` aparece em `src/config/mail.ts` e `src/services/EmailService.ts` apenas. “Como funciona o preview em desenvolvimento?” O `nodemailer.getTestMessageUrl(info)` gera um link para visualizar a mensagem em uma conta de teste Ethereal.

### 4) Integração do e-mail ao fluxo da aplicação e testes

O fluxo de cadastro em `src/controllers/UsuarioController.ts` grava o usuário e, em seguida, envia a mensagem de boas-vindas em um bloco `try/catch` independente. Isso garante que o cadastro siga normalmente (`201`) mesmo quando o SMTP falha; o erro é registrado no log e não derruba a operação. O mesmo padrão foi aplicado ao fluxo de “esqueci minha senha”, sem expor dados sensíveis ao cliente. O arquivo `request.http` cobre caso normal, e-mail duplicado, cadastro inválido, login, reset e rota protegida, tornando a verificação do comportamento prática e rastreável. Perguntas: “Se o e-mail falhar, o cadastro ainda é confirmado?” Sim; a requisição continua respondendo `201` e o erro é apenas logado. “A API dispara e-mail em cadastro recusado?” Não; a única chamada ao `EmailService` acontece após a criação bem-sucedida do dado.

### 5) Validação no front-end e retorno ao usuário

A página de cadastro em `public/pages/cadastro.html` usa `required`, `minlength`, `maxlength`, `type="email"` e confirmação de senha via `setCustomValidity`. O JS da própria tela lê as `issues` de resposta da API e marca o campo correspondente, além de disparar `toast` de sucesso ou erro. Isso é uma validação de UX e retorno imediato ao usuário, não de Segurança, porque a proteção real ainda está na API. A solução é adequada porque combina feedback instantâneo ao usuário com a regra centralizada no back-end. Perguntas: “A validação do front-end substitui a API?” Não; a API continua sendo a fonte da verdade. “Por que repetir regras na API e no banco?” Porque o navegador pode ser alterado e o dado precisa ser validado novamente no servidor e na persistência para manter integridade.

## 3. Nota final

A soma das notas dos cinco critérios resulta em 98/100. A implementação atende aos requisitos principais de validação de entrada, respostas padronizadas de erro, serviço de e-mail isolado, integração segura do SMTP ao cadastro e feedback no front-end. Seu único ponto de atenção é a forma como o ambiente local `.env` é mantido no workspace: o projeto exige disciplina para não versionar segredos reais, embora a estrutura `.env.example` e a lógica de desenvolvimento com conta Ethereal já estejam corretas.

## 4. Análise geral do código

O projeto está funcional e coerente com a proposta: Zod valida as entradas antes dos controllers, o middleware global transforma erros em resposta HTTP padronizada, e o cadastro já envia e-mail de boas-vindas sem bloquear a operação quando o SMTP falha. O arquivo `request.http` cobre cenários principais, e a página `public/pages/cadastro.html` oferece feedback imediato ao usuário. Há alguns pontos de melhoria: a chave `JWT_SECRET` está presente no arquivo `.env` do ambiente local, que precisa continuar fora do controle de versão; e a UI poderia padronizar mais alguns campos de erro e mensagens de feedback. O código também parece bem organizado por responsabilidades, com `schema`, `middleware`, `controller`, `model` e `service` em módulos distintos.

## 5. Sugestões de melhoria

1. Garantir que `.env` permaneça fora do Git e usar `.env.example` como documento de configuração em todas as máquinas do projeto. Arquivo: `.env.example` e `.env`.
2. Centralizar mensagens de erro do front-end em uma helper reutilizável para todos os formulários, reduzindo duplicação. Arquivo: `public/pages/cadastro.html`.
3. Adicionar testes automatizados de front-end para confirmar o comportamento de `setCustomValidity` e exibição de `issues` em campos específicos. Arquivo: `tests/front`.
4. Documentar explicitamente no README como visualizar a URL de prévia do Ethereal em desenvolvimento. Arquivo: `README.md`.
5. Considerar um rate limit para reset de senha e login para reduzir abuso. Arquivos: `src/middlewares/` e `src/routes/usuario.routes.ts`.

## 6. Extrato de commits por integrante

A revisão de `git shortlog -sne --all` e `git log --format='%an %ad %s' --date=short` mostrou a seguinte distribuição:

- Arthur Alcântara: 88 commits, com período principal de atividade de 2026-03-12 a 2026-09-18. Ele concentrou esforços em Prisma/SQLite, validação, autenticação JWT/Argon2, e-mail, front-end, segurança e ajustes finais de apresentação.
- TUCKO: 33 commits, com atividade concentrada entre 2026-01-05 e 2026-06-06. Ele atuou mais na base do projeto, estrutura inicial do front-end, integração do banco de dados, páginas e início do CRUD em Node.js/Express.
- Há também 3 commits com identidade duplicada de TUCKO/Arthur em e-mails diferentes, o que indica renomeação/normalização de autoria no histórico. Isso não afeta o funcionamento do código, mas deve ser explicado em apresentação para evitar dúvidas sobre contribuição.

Resumo: o projeto foi desenvolvido em conjunto, mas a maior parte dos refinamentos finais de validação, autenticação, email e segurança foi realizada por Arthur Alcântara, enquanto TUCKO ajudou na base de front-end e integração inicial.
