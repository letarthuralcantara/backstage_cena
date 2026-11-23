const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const host = new URL(BASE).hostname;
if (!["localhost", "127.0.0.1"].includes(host) && process.env.ALLOW_REMOTE !== "1") {
  console.error(`Recusado: ${host} não é local. Este script CRIA e APAGA dados.\nSe for mesmo um ambiente de teste, rode com ALLOW_REMOTE=1.`);
  process.exit(2);
}

const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const resultados = [];
const criados = { usuarios: [], clubes: [], workons: [] };

async function req(metodo, caminho, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await resposta.json(); } catch { /* sem corpo */ }
  return { status: resposta.status, json };
}

function checar(descricao, resposta, aceitos, nota = "") {
  const ok = aceitos.includes(resposta.status);
  resultados.push({ ok, descricao, nota });
  console.log(`${ok ? "PASS " : "FALHA"}  ${descricao}  (esperado ${aceitos.join(" ou ")}, veio ${resposta.status})`);
  if (!ok && nota) console.log(`       -> ${nota}`);
}

function checarCondicao(descricao, ok, nota = "") {
  resultados.push({ ok, descricao, nota });
  console.log(`${ok ? "PASS " : "FALHA"}  ${descricao}`);
  if (!ok && nota) console.log(`       -> ${nota}`);
}

async function cadastrar(nome) {
  const r = await req("POST", "/api/usuarios", {
    body: { nome_completo: `Teste ${nome}`, email: `auth-${nome}-${sufixo}@example.com`, senha: "123456" },
  });
  if (r.status !== 201) throw new Error(`Não consegui criar o usuário ${nome}: status ${r.status} ${JSON.stringify(r.json)}`);
  const conta = { id: r.json.usuario.id_usuario, token: r.json.token, email: `auth-${nome}-${sufixo}@example.com` };
  criados.usuarios.push(conta);
  return conta;
}

async function limpar(A) {
  const tentar = async (metodo, caminho, token) => { try { await req(metodo, caminho, { token }); } catch { /* ignora: é só limpeza */ } };
  for (const id of criados.workons) await tentar("DELETE", `/api/workons/${id}`, A.token);
  for (const id of criados.clubes) await tentar("DELETE", `/api/clubes/${id}`, A.token);
  for (const conta of criados.usuarios) await tentar("DELETE", `/api/usuarios/${conta.id}`, conta.token);
}

let A; let B;
try {
  console.log(`Alvo: ${BASE}\n`);
  A = await cadastrar("A");
  B = await cadastrar("B");
  const idA = A.id;

  console.log("--- 1. Perfil: B tentando mexer na conta de A");
  checar("B altera o perfil de A (PUT /usuarios/:id)", await req("PUT", `/api/usuarios/${idA}`, { token: B.token, body: { nome_completo: "Invadido" } }), [403]);
  checar("B muda o status de A", await req("PATCH", `/api/usuarios/${idA}/status`, { token: B.token, body: { status: "ocupado" } }), [403]);
  checar("B lê as configurações de A", await req("GET", `/api/usuarios/${idA}/configuracoes`, { token: B.token }), [403]);
  checar("B altera as configurações de A", await req("PUT", `/api/usuarios/${idA}/configuracoes`, { token: B.token, body: { mostrar_email: 0 } }), [403]);

  console.log("\n--- 2. Autenticação");
  checar("Sem token altera o perfil de A", await req("PUT", `/api/usuarios/${idA}`, { body: { nome_completo: "Invadido" } }), [401]);
  const ultimo = A.token.at(-1);
  const forjado = `${A.token.slice(0, -1)}${ultimo === "A" ? "B" : "A"}`;
  checar("Token com assinatura adulterada", await req("PUT", `/api/usuarios/${idA}`, { token: forjado, body: { nome_completo: "Invadido" } }), [401]);

  console.log("\n--- 3. Clubes: B não é membro do clube de A");
  const clube = await req("POST", "/api/clubes", { token: A.token, body: { nome: `Clube Auth ${sufixo}`, tipo: "geral" } });
  if (clube.status !== 201) throw new Error(`Não consegui criar o clube: ${clube.status} ${JSON.stringify(clube.json)}`);
  const idClube = clube.json.id_clube; criados.clubes.push(idClube);
  checar("B lê o chat do clube", await req("GET", `/api/clubes/${idClube}/mensagens`, { token: B.token }), [403]);
  checar("B escreve no chat do clube", await req("POST", `/api/clubes/${idClube}/mensagens`, { token: B.token, body: { texto: "oi" } }), [403]);
  checar("B busca mensagens no clube", await req("GET", `/api/clubes/${idClube}/busca?q=oi`, { token: B.token }), [403]);
  checar("B exclui o clube de A", await req("DELETE", `/api/clubes/${idClube}`, { token: B.token }), [403]);
  checar("Sem token lê o chat do clube", await req("GET", `/api/clubes/${idClube}/mensagens`), [401]);

  console.log("\n--- 4. Work On: projeto de A com visibilidade por link");
  const projeto = await req("POST", "/api/workons", { token: A.token, body: { titulo: `Projeto Auth ${sufixo}`, tipo: "album" } });
  if (projeto.status !== 201) throw new Error(`Não consegui criar o Work On: ${projeto.status} ${JSON.stringify(projeto.json)}`);
  const idWorkOn = projeto.json.id_workon; criados.workons.push(idWorkOn);
  await req("PATCH", `/api/workons/${idWorkOn}`, { token: A.token, body: { visibilidade: "link" } });
  checar("B abre o projeto privado de A", await req("GET", `/api/workons/${idWorkOn}`, { token: B.token }), [403, 404]);
  checar("B edita o projeto de A", await req("PATCH", `/api/workons/${idWorkOn}`, { token: B.token, body: { titulo: "Invadido" } }), [403, 404]);
  checar("B cria faixa no projeto de A", await req("POST", `/api/workons/${idWorkOn}/faixas`, { token: B.token, body: { titulo: "Invadida" } }), [403, 404]);
  checar("B gera convite do projeto de A", await req("POST", `/api/workons/${idWorkOn}/convite`, { token: B.token }), [403, 404]);
  checar("B exclui o projeto de A", await req("DELETE", `/api/workons/${idWorkOn}`, { token: B.token }), [403, 404]);
  const falsa = "0".repeat(64);
  checar("URL assinada de áudio com assinatura falsa", await req("GET", `/api/workons/arquivos/${falsa}?nome=x.mp3&exp=9999999999`), [400, 403, 404]);

  console.log("\n--- 5. Privacidade do perfil público (sem login)");
  const publico = await req("GET", `/api/usuarios/${idA}`);
  const texto = JSON.stringify(publico.json || {});
  checarCondicao("Perfil público não expõe senha nem código de reset", !/"senha"|codigo_reset/.test(texto), "O perfil público devolveu um campo secreto.");
  const desligar = await req("PUT", `/api/usuarios/${idA}/configuracoes`, { token: A.token, body: { mostrar_email: 0 } });
  const depois = await req("GET", `/api/usuarios/${idA}`);
  checarCondicao(
    "Com 'mostrar e-mail' DESLIGADO, o perfil público esconde o e-mail",
    desligar.status === 200 && !JSON.stringify(depois.json || {}).includes(A.email),
    "O e-mail continua na resposta da API mesmo com a opção desligada: o interruptor só vale na tela.",
  );

  console.log("\n--- 6. Ataques destrutivos (por último, para não atrapalhar o resto)");
  checar("B troca a senha de A", await req("PUT", `/api/usuarios/${idA}/senha`, { token: B.token, body: { senha_atual: "123456", nova_senha: "654321", confirmar_senha: "654321" } }), [400, 403]);
  checar("B exclui a conta de A", await req("DELETE", `/api/usuarios/${idA}`, { token: B.token }), [403]);
} catch (erro) {
  console.error(`\nERRO NO TESTE: ${erro.message}`);
  process.exitCode = 2;
} finally {
  if (A) await limpar(A);
}

const falhas = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} verificações passaram, ${falhas} falharam.`);
if (!process.exitCode) process.exitCode = falhas ? 1 : 0;
