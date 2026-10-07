export function getToken() {
  return localStorage.getItem("token");
}

export function authHeaders(extra = {}, json = true) {
  const token = getToken();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export function aplicarErroApiNoCampo(error, aliases = {}) {
  let primeiroCampo = null;
  for (const issue of error.issues ?? []) {
    const nome =
      issue.path?.[0] === "body" ? issue.path[1] : issue.path?.at(-1);
    const id = aliases[nome] || nome;
    const campo = id ? document.getElementById(id) : null;
    if (!campo || !issue.message) continue;

    campo.setCustomValidity(issue.message);
    campo.setAttribute("aria-invalid", "true");
    if (!campo.dataset.apiValidationAttached) {
      campo.addEventListener("input", () => {
        campo.setCustomValidity("");
        campo.removeAttribute("aria-invalid");
      });
      campo.dataset.apiValidationAttached = "true";
    }
    primeiroCampo ??= campo;
  }
  primeiroCampo?.reportValidity();
  return Boolean(primeiroCampo);
}

async function respostaComErro(res, fallback) {
  let erro;
  try {
    erro = await res.json();
  } catch {
    erro = {};
  }
  const error = new Error(erro.erro || fallback);
  error.status = res.status;
  error.issues = Array.isArray(erro.issues) ? erro.issues : [];
  throw error;
}

export async function salvarCadastro(dados) {
  const body = {
    nome_completo: dados.nome_completo,
    nome_artistico: dados.nome_artistico || dados.nome_completo,
    email: dados.email.toLowerCase().trim(),
    senha: dados.senha,
    telefone: dados.telefone || null,
    cidade: dados.cidade || null,
    estado: dados.estado || null,
    bairro: dados.bairro || null,
    area_atuacao: dados.area_atuacao || [],
    anos_experiencia: Number(dados.anos_experiencia) || 0,
    biografia: dados.biografia || null,
    instrumentos: dados.instrumentos || [],
    generos: dados.generos || [],
    daws: dados.daws || [],
  };

  const res = await fetch("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await respostaComErro(res, "Erro ao cadastrar");
  }

  // POST /api/usuarios devolve { usuario, token }
  const { usuario, token } = await res.json();
  localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
  if (token) localStorage.setItem("token", token);
  return usuario;
}

export async function completarCadastro(dados) {
  const usuarioLocal = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (!usuarioLocal || !getToken()) throw new Error("Usuário não autenticado.");

  const id = Number(usuarioLocal.id_usuario);

  const areaAtual = Array.isArray(usuarioLocal.area_atuacao)
    ? usuarioLocal.area_atuacao
    : usuarioLocal.area_atuacao
      ? [usuarioLocal.area_atuacao]
      : [];

  const body = {
    nome_completo: usuarioLocal.nome_completo,
    nome_artistico:
      dados.nome_artistico ||
      usuarioLocal.nome_artistico ||
      usuarioLocal.nome_completo,
    email: usuarioLocal.email.toLowerCase().trim(),
    // "senha" propositalmente omitida: a API não devolve mais o hash, e este
    // endpoint não deve alterar a senha do usuário. Se "senha" não vier no
    // corpo, o back-end mantém a senha atual (ver UsuarioModel.update).
    telefone: dados.telefone || usuarioLocal.telefone || null,
    cidade: dados.cidade || usuarioLocal.cidade || null,
    estado: dados.estado || usuarioLocal.estado || null,
    bairro: dados.bairro || usuarioLocal.bairro || null,
    area_atuacao: dados.area_atuacao?.length ? dados.area_atuacao : areaAtual,
    biografia: dados.biografia || usuarioLocal.biografia || null,
    instrumentos: dados.instrumentos || [],
    generos: dados.generos || [],
    daws: dados.daws || [],
    status: dados.status || usuarioLocal.status || "disponivel",
  };

  const res = await fetch(`/api/usuarios/${id}`, {
    method: "PUT",
    headers: authHeaders(), // precisa do token: rota protegida por isAuthenticated + isOwner
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await respostaComErro(res, "Erro ao atualizar cadastro");
  }

  // PUT /api/usuarios/:id devolve o usuário puro (sem token novo)
  const usuario = await res.json();
  localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
  return usuario;
}

export async function fazerLogin(email, senha) {
  const res = await fetch("/api/usuarios/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.toLowerCase().trim(), senha }),
  });

  if (!res.ok) {
    await respostaComErro(res, "E-mail ou senha incorretos");
  }

  // POST /api/usuarios/login devolve { usuario, token }
  const { usuario, token } = await res.json();
  localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
  if (token) localStorage.setItem("token", token);
  return usuario;
}

export async function pedirCodigoRedefinicao(email) {
  const res = await fetch("/api/usuarios/esqueci-senha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.toLowerCase().trim() }),
  });

  if (!res.ok) {
    await respostaComErro(res, "Erro ao solicitar código de redefinição");
  }

  // Sempre 200 com mensagem genérica, exista ou não o e-mail (ver back-end).
  return res.json();
}

export async function redefinirSenhaComCodigo(
  email,
  codigo,
  novaSenha,
  confirmarSenha,
) {
  const res = await fetch("/api/usuarios/redefinir-senha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.toLowerCase().trim(),
      codigo,
      nova_senha: novaSenha,
      confirmar_senha: confirmarSenha,
    }),
  });

  if (!res.ok) {
    await respostaComErro(res, "Erro ao redefinir senha");
  }

  return res.json();
}

export function fazerLogout() {
  localStorage.removeItem("usuarioLogado");
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

export function verificarAutenticacao(redirecionar = true) {
  const usuario = localStorage.getItem("usuarioLogado");
  const token = getToken();
  if (!usuario || !token) {
    if (redirecionar) window.location.href = "login.html";
    return null;
  }
  return JSON.parse(usuario);
}

// ── Foto de perfil ────────────────────────────────────────────────────────────
export const FOTO_TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/gif"];
export const FOTO_TAMANHO_MAX_BYTES = 2 * 1024 * 1024;

/** Troca o conteúdo do elemento (iniciais) por <img>; sem caminho, mantém o texto. */
export function aplicarFotoNoElemento(elemento, caminho, alt = "Foto de perfil") {
  if (!elemento || !caminho) return;
  const img = document.createElement("img");
  img.src = caminho;
  img.alt = alt;
  elemento.textContent = "";
  elemento.appendChild(img);
}

export async function aplicarAvatarNaNavbar(elemento, usuario) {
  if (!elemento || !usuario?.id_usuario) return;

  let imagem = usuario.imagem;
  if (!imagem?.caminho) {
    try {
      const res = await fetch(`/api/usuarios/${usuario.id_usuario}`);
      if (!res.ok) return;
      const usuarioAtualizado = await res.json();
      imagem = usuarioAtualizado.imagem;

      const usuarioSalvo = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
      if (usuarioSalvo?.id_usuario === usuario.id_usuario) {
        localStorage.setItem(
          "usuarioLogado",
          JSON.stringify({ ...usuarioSalvo, imagem }),
        );
      }
    } catch {
      return;
    }
  }

  aplicarFotoNoElemento(
    elemento,
    imagem?.caminho,
    usuario.nome_artistico || usuario.nome_completo || "Foto de perfil",
  );
}

/**
 * Envia a foto como multipart/form-data. Sem Content-Type manual: só o navegador
 * conhece o boundary. POST no primeiro envio, PUT para substituir.
 */
export async function enviarFotoPerfil(arquivo, jaTemFoto) {
  const form = new FormData();
  form.append("image", arquivo);
  const res = await fetch("/api/usuarios/imagem", {
    method: jaTemFoto ? "PUT" : "POST",
    headers: authHeaders({}, false),
    body: form,
  });
  if (!res.ok) await respostaComErro(res, "Não foi possível enviar a foto.");
  const dados = await res.json();
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");
  if (usuario) {
    localStorage.setItem(
      "usuarioLogado",
      JSON.stringify({ ...usuario, imagem: dados.imagem }),
    );
  }
  return dados.imagem;
}
