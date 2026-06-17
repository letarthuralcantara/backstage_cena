export async function salvarCadastro(dados) {
  const body = {
    nome_completo:    dados.nome_completo,
    nome_artistico:   dados.nome_artistico || dados.nome_completo,
    email:            dados.email,
    senha:            dados.senha,
    telefone:         dados.telefone || null,
    cidade:           dados.cidade || null,
    estado:           dados.estado || null,
    bairro:           dados.bairro || null,
    area_atuacao:     dados.area_atuacao || [],
    anos_experiencia: Number(dados.anos_experiencia) || 0,
    biografia:        dados.biografia || null,
    instrumentos:     dados.instrumentos || [],
    generos:          dados.generos || [],
    daws:             dados.daws || [],
    cadastro_completo: dados.cadastro_completo ?? 0,
  };

  const res = await fetch('/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.erro || 'Erro ao cadastrar');
  }

  const usuario = await res.json();
  localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
  return usuario;
}

export async function completarCadastro(dados) {
  const usuarioLocal = JSON.parse(localStorage.getItem('usuarioLogado'));
  if (!usuarioLocal) throw new Error('Usuário não autenticado.');

  const id = Number(usuarioLocal.id_usuario);

  // area_atuacao: aceita tanto array direto quanto o campo antigo
  const areaAtual = Array.isArray(usuarioLocal.area_atuacao)
    ? usuarioLocal.area_atuacao
    : (usuarioLocal.area_atuacao ? [usuarioLocal.area_atuacao] : []);

  const body = {
    id_usuario:       id,
    nome_completo:    usuarioLocal.nome_completo,
    nome_artistico:   dados.nome_artistico || usuarioLocal.nome_artistico || usuarioLocal.nome_completo,
    email:            usuarioLocal.email,
    senha:            usuarioLocal.senha,
    telefone:         dados.telefone  || usuarioLocal.telefone || null,
    cidade:           dados.cidade    || usuarioLocal.cidade   || null,
    estado:           dados.estado    || usuarioLocal.estado   || null,
    bairro:           dados.bairro    || usuarioLocal.bairro   || null,
    area_atuacao:     dados.area_atuacao?.length
                        ? dados.area_atuacao
                        : areaAtual,
    biografia:        dados.biografia || usuarioLocal.biografia || null,
    instrumentos:     dados.instrumentos  || [],
    generos:          dados.generos       || [],
    daws:             dados.daws          || [],
    status:           dados.status        || usuarioLocal.status || 'disponivel',
    cadastro_completo: dados.cadastro_completo ?? 1,
  };

  const res = await fetch(`/api/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.erro || 'Erro ao atualizar cadastro');
  }

  const usuario = await res.json();
  localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
  return usuario;
}

export async function fazerLogin(email, senha) {
  const res = await fetch('/api/usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.erro || 'Email ou senha incorretos');
  }

  const usuario = await res.json();
  localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
  return usuario;
}

export function fazerLogout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = 'login.html';
}

export function verificarAutenticacao(redirecionar = true) {
  const usuario = localStorage.getItem('usuarioLogado');
  if (!usuario) {
    if (redirecionar) window.location.href = 'login.html';
    return null;
  }
  return JSON.parse(usuario);
}