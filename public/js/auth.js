export async function salvarCadastro(dados) {
  const body = {
    nome_completo: dados.nome_completo,
    nome_artistico: dados.nome_artistico || dados.nome_completo,
    email: dados.email,
    senha: dados.senha,
    telefone: dados.telefone || null,
    cidade: dados.cidade,
    estado: dados.estado,
    bairro: dados.bairro || null,
    area_atuacao: dados.areas_atuacao?.[0] || null,
    anos_experiencia: Number(dados.anos_experiencia) || 0,
    biografia: dados.biografia || null,
    
    // Enviando as listas para o backend
    instrumentos: dados.instrumentos || [],
    generos: dados.generos || [],
    disponibilidades: dados.disponibilidade || [],
    daws: dados.daws || [],
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

export function verificarAutenticacao() {
  const usuario = localStorage.getItem('usuarioLogado');
  if (!usuario) {
    window.location.href = 'login.html';
    return null;
  }
  return JSON.parse(usuario);
}
