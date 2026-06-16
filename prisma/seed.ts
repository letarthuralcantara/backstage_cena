import prisma from '../src/database/prisma.js'

async function main() {
  const instrumentos = [
    'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado', 'Piano',
    'Violino', 'Saxofone', 'Trompete', 'Flauta', 'Cavaquinho', 'Ukulele',
    'Contrabaixo', 'Percussão', 'Voz'
  ]
  const generos = [
    'Rock', 'Pop', 'MPB', 'Samba', 'Forró', 'Funk', 'Jazz', 'Blues',
    'Metal', 'Eletrônico', 'Hip-Hop', 'Reggae', 'Bossa Nova', 'Sertanejo',
    'Gospel', 'Clássico', 'R&B', 'Soul', 'Pagode', 'Axé'
  ]
  const daws = [
    'FL Studio', 'Ableton Live', 'Logic Pro', 'Pro Tools', 'GarageBand',
    'Reaper', 'Cubase', 'Studio One', 'Reason', 'Bitwig'
  ]

  for (const nome of instrumentos) {
    await prisma.instrumento.upsert({ where: { nome }, update: {}, create: { nome } })
  }
  for (const nome of generos) {
    await prisma.genero.upsert({ where: { nome }, update: {}, create: { nome } })
  }
  for (const nome of daws) {
    await prisma.daw.upsert({ where: { nome }, update: {}, create: { nome } })
  }

  const usuarios = [
    { nome_completo: 'Lucas Ferreira', nome_artistico: 'LukasBass', email: 'lucas@backstage.com', senha: 'senha123', cidade: 'São Paulo', estado: 'SP', biografia: 'Baixista com 8 anos de experiência em rock e metal.', area_atuacao: '["Instrumentista"]', status: 'online', instrumentos: ['Baixo', 'Contrabaixo'], generos: ['Rock', 'Metal'], daws: ['Logic Pro'] },
    { nome_completo: 'Mariana Costa', nome_artistico: 'Mari Voz', email: 'mariana@backstage.com', senha: 'senha123', cidade: 'Rio de Janeiro', estado: 'RJ', biografia: 'Vocalista de MPB e jazz. Formada em música pela UFRJ.', area_atuacao: '["Vocalista"]', status: 'online', instrumentos: ['Voz', 'Piano'], generos: ['MPB', 'Jazz', 'Bossa Nova'], daws: ['Logic Pro'] },
    { nome_completo: 'Diego Santos', nome_artistico: 'DJ Diegão', email: 'diego@backstage.com', senha: 'senha123', cidade: 'Recife', estado: 'PE', biografia: 'DJ e produtor eletrônico com mais de 10 anos de carreira.', area_atuacao: '["DJ","Produtor"]', status: 'ocupado', instrumentos: ['Teclado', 'Percussão'], generos: ['Eletrônico', 'Funk'], daws: ['Ableton Live', 'FL Studio'] },
    { nome_completo: 'Ana Lima', nome_artistico: 'AnaViolin', email: 'ana@backstage.com', senha: 'senha123', cidade: 'Belo Horizonte', estado: 'MG', biografia: 'Violinista clássica explorando fusões com MPB e jazz.', area_atuacao: '["Instrumentista","Compositor"]', status: 'online', instrumentos: ['Violino', 'Piano'], generos: ['Clássico', 'MPB', 'Jazz'], daws: ['Cubase'] },
    { nome_completo: 'Rafael Souza', nome_artistico: 'RafaBeats', email: 'rafa@backstage.com', senha: 'senha123', cidade: 'Salvador', estado: 'BA', biografia: 'Beatmaker e produtor de hip-hop e trap.', area_atuacao: '["Beatmaker","Produtor"]', status: 'nao_perturbe', instrumentos: ['Bateria', 'Teclado'], generos: ['Hip-Hop', 'Funk', 'R&B'], daws: ['FL Studio', 'Pro Tools'] },
    { nome_completo: 'Carla Mendes', nome_artistico: 'Carla M', email: 'carla@backstage.com', senha: 'senha123', cidade: 'Fortaleza', estado: 'CE', biografia: 'Guitarrista e compositora de rock alternativo.', area_atuacao: '["Instrumentista","Compositor"]', status: 'online', instrumentos: ['Guitarra', 'Violão'], generos: ['Rock', 'Pop', 'Blues'], daws: ['Reaper'] },
    { nome_completo: 'Pedro Alves', nome_artistico: 'PedroPagode', email: 'pedro@backstage.com', senha: 'senha123', cidade: 'João Pessoa', estado: 'PB', biografia: 'Percussionista e cavaquinista de pagode e samba.', area_atuacao: '["Instrumentista"]', status: 'ausente', instrumentos: ['Cavaquinho', 'Percussão', 'Bateria'], generos: ['Pagode', 'Samba', 'Axé'], daws: [] },
    { nome_completo: 'Fernanda Rocha', nome_artistico: 'Fer Gospel', email: 'fernanda@backstage.com', senha: 'senha123', cidade: 'Brasília', estado: 'DF', biografia: 'Cantora e tecladista gospel com experiência em coral.', area_atuacao: '["Vocalista","Instrumentista"]', status: 'online', instrumentos: ['Voz', 'Teclado', 'Piano'], generos: ['Gospel', 'Soul', 'R&B'], daws: ['Studio One'] },
    { nome_completo: 'Thiago Nunes', nome_artistico: 'ThiForró', email: 'thiago@backstage.com', senha: 'senha123', cidade: 'Campina Grande', estado: 'PB', biografia: 'Compositor de forró pé de serra. Faço shows pelo nordeste.', area_atuacao: '["Instrumentista","Compositor"]', status: 'online', instrumentos: ['Percussão', 'Violão'], generos: ['Forró', 'Sertanejo', 'MPB'], daws: ['Reaper'] },
    { nome_completo: 'Isabela Teixeira', nome_artistico: 'Isa Jazz', email: 'isabela@backstage.com', senha: 'senha123', cidade: 'Porto Alegre', estado: 'RS', biografia: 'Saxofonista e flautista de jazz e bossa nova.', area_atuacao: '["Instrumentista"]', status: 'ocupado', instrumentos: ['Saxofone', 'Flauta'], generos: ['Jazz', 'Bossa Nova', 'Blues'], daws: ['Logic Pro'] },
  ]

  for (const u of usuarios) {
    const criado = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: {
        nome_completo: u.nome_completo,
        nome_artistico: u.nome_artistico,
        email: u.email,
        senha: u.senha,
        cidade: u.cidade,
        estado: u.estado,
        biografia: u.biografia,
        area_atuacao: u.area_atuacao,
        cadastro_completo: 1,
        status: u.status,
      }
    })

    for (const nome of u.instrumentos) {
      const inst = await prisma.instrumento.findUnique({ where: { nome } })
      if (inst) await prisma.usuarioInstrumento.upsert({
        where: { id_usuario_id_instrumento: { id_usuario: criado.id_usuario, id_instrumento: inst.id_instrumento } },
        update: {}, create: { id_usuario: criado.id_usuario, id_instrumento: inst.id_instrumento }
      })
    }
    for (const nome of u.generos) {
      const gen = await prisma.genero.findUnique({ where: { nome } })
      if (gen) await prisma.usuarioGenero.upsert({
        where: { id_usuario_id_genero: { id_usuario: criado.id_usuario, id_genero: gen.id_genero } },
        update: {}, create: { id_usuario: criado.id_usuario, id_genero: gen.id_genero }
      })
    }
    for (const nome of u.daws) {
      const daw = await prisma.daw.findUnique({ where: { nome } })
      if (daw) await prisma.usuarioDaw.upsert({
        where: { id_usuario_id_daw: { id_usuario: criado.id_usuario, id_daw: daw.id_daw } },
        update: {}, create: { id_usuario: criado.id_usuario, id_daw: daw.id_daw }
      })
    }
  }

  console.log('Seed concluído! 10 usuários criados.')
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
