import Database from '../database/database.js';

async function read(field, value) {
  const db = await Database.connect();
  let sql = 'SELECT * FROM usuario';
  if (field && value) {
    sql += ` WHERE ${field} = ?`;
  }
  const usuarios = await db.all(sql, value ? [value] : []);
  
  for (const u of usuarios) {
    const insts = await db.all('SELECT i.nome FROM instrumento i JOIN usuario_instrumento ui ON i.id_instrumento = ui.id_instrumento WHERE ui.id_usuario = ?', [u.id_usuario]);
    u.instrumentos = insts.map(i => i.nome);
    
    const gens = await db.all('SELECT g.nome FROM genero g JOIN usuario_genero ug ON g.id_genero = ug.id_genero WHERE ug.id_usuario = ?', [u.id_usuario]);
    u.generos = gens.map(g => g.nome);

    const disps = await db.all('SELECT d.descricao FROM disponibilidade d JOIN usuario_disponibilidade ud ON d.id_disponibilidade = ud.id_disponibilidade WHERE ud.id_usuario = ?', [u.id_usuario]);
    u.disponibilidades = disps.map(d => d.descricao);

    const daws = await db.all('SELECT dw.nome FROM daw dw JOIN usuario_daw udw ON dw.id_daw = udw.id_daw WHERE udw.id_usuario = ?', [u.id_usuario]);
    u.daws = daws.map(dw => dw.nome);

    // Parse redes_sociais JSON
    try {
      u.redes_sociais = u.redes_sociais ? JSON.parse(u.redes_sociais) : {};
    } catch {
      u.redes_sociais = {};
    }

    // Parse area_atuacao — suporta múltiplas áreas (array JSON) ou string única
    try {
      if (u.area_atuacao && u.area_atuacao.startsWith('[')) {
        u.area_atuacao = JSON.parse(u.area_atuacao);
      } else if (u.area_atuacao) {
        u.area_atuacao = [u.area_atuacao];
      } else {
        u.area_atuacao = [];
      }
    } catch {
      u.area_atuacao = u.area_atuacao ? [u.area_atuacao] : [];
    }

    // Verificar se cadastro está completo
    u.cadastro_completo = calcularCadastroCompleto(u);
  }

  await db.close();
  return usuarios;
}

// Cadastro completo = tem área, pelo menos 1 instrumento, pelo menos 1 gênero e cidade
function calcularCadastroCompleto(u) {
  const temArea = u.area_atuacao && u.area_atuacao.length > 0;
  const temInstrumento = u.instrumentos && u.instrumentos.length > 0;
  const temGenero = u.generos && u.generos.length > 0;
  const temCidade = !!u.cidade;
  return (temArea && temInstrumento && temGenero && temCidade) ? 1 : 0;
}

async function readById(id) {
  const usuarios = await read('id_usuario', id);
  if (usuarios.length === 0) throw new Error(`Usuário com id ${id} não encontrado.`);
  return usuarios[0];
}

async function create(dados) {
  const db = await Database.connect();

  if (!dados.nome_completo || !dados.email || !dados.senha) {
    throw new Error('Nome completo, email e senha são obrigatórios.');
  }

  const existente = await db.get('SELECT id_usuario FROM usuario WHERE email = ?', [dados.email]);
  if (existente) {
    await db.close();
    throw new Error('Email já cadastrado.');
  }

  // area_atuacao salva como JSON se for array
  const areaParaSalvar = Array.isArray(dados.area_atuacao)
    ? JSON.stringify(dados.area_atuacao)
    : dados.area_atuacao || null;

  const sql = `
    INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia, cadastro_completo, redes_sociais)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const { lastID } = await db.run(sql, [
    dados.nome_completo,
    dados.nome_artistico || dados.nome_completo,
    dados.email,
    dados.senha,
    dados.telefone || null,
    dados.cidade || null,
    dados.estado || null,
    dados.bairro || null,
    areaParaSalvar,
    dados.anos_experiencia || 0,
    dados.biografia || null,
    0, // cadastro_completo calculado automaticamente
    dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null,
  ]);

  const categorias = [
    { lista: dados.instrumentos, tabela: 'usuario_instrumento', ref: 'id_instrumento', busca: 'instrumento' },
    { lista: dados.generos, tabela: 'usuario_genero', ref: 'id_genero', busca: 'genero' },
    { lista: dados.disponibilidades, tabela: 'usuario_disponibilidade', ref: 'id_disponibilidade', busca: 'disponibilidade', campoBusca: 'descricao' },
    { lista: dados.daws, tabela: 'usuario_daw', ref: 'id_daw', busca: 'daw' }
  ];

  for (const cat of categorias) {
    if (cat.lista && Array.isArray(cat.lista)) {
      for (const nomeItem of cat.lista) {
        const campo = cat.campoBusca || 'nome';
        const item = await db.get(`SELECT ${cat.ref} FROM ${cat.busca} WHERE ${campo} = ?`, [nomeItem]);
        if (item) {
          await db.run(`INSERT OR IGNORE INTO ${cat.tabela} (id_usuario, ${cat.ref}) VALUES (?, ?)`, [lastID, item[cat.ref]]);
        }
      }
    }
  }

  await db.close();
  return readById(lastID);
}

async function update({ id_usuario, ...dados }) {
  const db = await Database.connect();
  const existe = await db.get('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id_usuario]);
  if (!existe) {
    await db.close();
    throw new Error(`Usuário com id ${id_usuario} não encontrado.`);
  }

  // area_atuacao salva como JSON se for array
  const areaParaSalvar = Array.isArray(dados.area_atuacao)
    ? JSON.stringify(dados.area_atuacao)
    : dados.area_atuacao || null;

  const sql = `
    UPDATE usuario SET
      nome_completo = ?, nome_artistico = ?, email = ?, telefone = ?,
      cidade = ?, estado = ?, bairro = ?, area_atuacao = ?,
      anos_experiencia = ?, biografia = ?,
      redes_sociais = ?
    WHERE id_usuario = ?
  `;

  await db.run(sql, [
    dados.nome_completo, dados.nome_artistico, dados.email, dados.telefone,
    dados.cidade, dados.estado, dados.bairro, areaParaSalvar,
    dados.anos_experiencia || 0, dados.biografia,
    dados.redes_sociais ? JSON.stringify(dados.redes_sociais) : null,
    id_usuario
  ]);

  const categorias = [
    { lista: dados.instrumentos, tabela: 'usuario_instrumento', ref: 'id_instrumento', busca: 'instrumento' },
    { lista: dados.generos, tabela: 'usuario_genero', ref: 'id_genero', busca: 'genero' },
    { lista: dados.disponibilidades, tabela: 'usuario_disponibilidade', ref: 'id_disponibilidade', busca: 'disponibilidade', campoBusca: 'descricao' },
    { lista: dados.daws, tabela: 'usuario_daw', ref: 'id_daw', busca: 'daw' }
  ];

  for (const cat of categorias) {
    if (cat.lista !== undefined) {
      await db.run(`DELETE FROM ${cat.tabela} WHERE id_usuario = ?`, [id_usuario]);
      if (Array.isArray(cat.lista)) {
        for (const nomeItem of cat.lista) {
          const campo = cat.campoBusca || 'nome';
          const item = await db.get(`SELECT ${cat.ref} FROM ${cat.busca} WHERE ${campo} = ?`, [nomeItem]);
          if (item) {
            await db.run(`INSERT OR IGNORE INTO ${cat.tabela} (id_usuario, ${cat.ref}) VALUES (?, ?)`, [id_usuario, item[cat.ref]]);
          }
        }
      }
    }
  }

  await db.close();
  return readById(id_usuario);
}

async function remove(id) {
  const db = await Database.connect();
  const usuario = await db.get('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [id]);
  if (!usuario) {
    await db.close();
    throw new Error(`Usuário com id ${id} não encontrado.`);
  }
  await db.run('DELETE FROM usuario WHERE id_usuario = ?', [id]);
  await db.close();
  return true;
}

async function listarInstrumentos() {
  const db = await Database.connect();
  const res = await db.all('SELECT nome FROM instrumento ORDER BY nome');
  await db.close();
  return res.map(r => r.nome);
}

async function listarGeneros() {
  const db = await Database.connect();
  const res = await db.all('SELECT nome FROM genero ORDER BY nome');
  await db.close();
  return res.map(r => r.nome);
}

async function listarDaws() {
  const db = await Database.connect();
  const res = await db.all('SELECT nome FROM daw ORDER BY nome');
  await db.close();
  return res.map(r => r.nome);
}

async function listarDisponibilidades() {
  const db = await Database.connect();
  const res = await db.all('SELECT descricao FROM disponibilidade');
  await db.close();
  return res.map(r => r.descricao);
}

export default { read, readById, create, update, remove, listarInstrumentos, listarGeneros, listarDaws, listarDisponibilidades };