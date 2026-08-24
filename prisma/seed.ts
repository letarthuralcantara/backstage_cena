import { PrismaClient } from '../src/generated/prisma/index.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const adapter = new PrismaLibSql({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpa tudo na ordem certa
  await prisma.usuarioDisponibilidade.deleteMany()
  await prisma.usuarioInstrumento.deleteMany()
  await prisma.usuarioGenero.deleteMany()
  await prisma.usuarioDaw.deleteMany()
  await prisma.configuracaoUsuario.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.disponibilidade.deleteMany()
  await prisma.instrumento.deleteMany()
  await prisma.genero.deleteMany()
  await prisma.daw.deleteMany()

  // Instrumentos
  const instrumentos = await Promise.all([
    'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado',
    'Piano', 'Voz', 'Saxofone', 'Trompete', 'Violino',
    'Ukulele', 'Contrabaixo', 'Flauta', 'DJ/Produção'
  ].map(nome => prisma.instrumento.create({ data: { nome } })))

  // Gêneros
  const generos = await Promise.all([
    'Rock', 'MPB', 'Samba', 'Jazz', 'Pop', 'Funk',
    'Eletrônica', 'Hip-Hop', 'Forró', 'Reggae',
    'Metal', 'Blues', 'Bossa Nova', 'Indie'
  ].map(nome => prisma.genero.create({ data: { nome } })))

  // DAWs
  const daws = await Promise.all([
    'Ableton Live', 'FL Studio', 'Logic Pro', 'Pro Tools',
    'GarageBand', 'Reaper', 'Studio One', 'Cubase'
  ].map(nome => prisma.daw.create({ data: { nome } })))

  // Disponibilidades
  const disps = await Promise.all([
    'Manhã', 'Tarde', 'Noite', 'Fins de semana'
  ].map(descricao => prisma.disponibilidade.create({ data: { descricao } })))

  const senha = await bcrypt.hash('123456', 10)

  const usuarios = [
    {
      nome_completo: 'Lucas Mendonça',
      nome_artistico: 'LucasBeat',
      email: 'lucas@email.com',
      estado: 'SP', cidade: 'São Paulo',
      area_atuacao: 'Produtor Musical',
      biografia: 'Produtor musical com 8 anos de experiência em beats e trilhas autorais para artistas independentes.',
      anos_experiencia: 8,
      status: 'disponivel',
      instrumentos: [0, 4], generos: [6, 5], daws: [0, 1], disps: [2, 3]
    },
    {
      nome_completo: 'Fernanda Rocha',
      nome_artistico: 'Fe Rocha',
      email: 'fernanda@email.com',
      estado: 'RJ', cidade: 'Rio de Janeiro',
      area_atuacao: 'Vocalista',
      biografia: 'Cantora e compositora carioca apaixonada por MPB e Bossa Nova. Busco projetos autorais.',
      anos_experiencia: 5,
      status: 'disponivel',
      instrumentos: [6, 0], generos: [1, 12], daws: [2], disps: [0, 1]
    },
    {
      nome_completo: 'Rafael Teixeira',
      nome_artistico: 'Rafa Guitar',
      email: 'rafael@email.com',
      estado: 'MG', cidade: 'Belo Horizonte',
      area_atuacao: 'Instrumentista',
      biografia: 'Guitarrista com foco em rock e blues. Toco em bandas locais e gravo sessões remotas.',
      anos_experiencia: 10,
      status: 'ocupado',
      instrumentos: [1, 0], generos: [0, 11], daws: [3], disps: [2, 3]
    },
    {
      nome_completo: 'Ana Beatriz Lima',
      nome_artistico: 'AnaB',
      email: 'anab@email.com',
      estado: 'BA', cidade: 'Salvador',
      area_atuacao: 'Compositora',
      biografia: 'Compositora baiana com raízes no samba e no funk. Já colaborei com mais de 20 artistas regionais.',
      anos_experiencia: 6,
      status: 'disponivel',
      instrumentos: [6, 4], generos: [2, 5], daws: [4], disps: [1, 2]
    },
    {
      nome_completo: 'Diego Sampaio',
      nome_artistico: 'DJ Sampai',
      email: 'diego@email.com',
      estado: 'PR', cidade: 'Curitiba',
      area_atuacao: 'DJ / Produtor',
      biografia: 'DJ e produtor de música eletrônica atuando em festas e eventos desde 2015. Especialista em house e techno.',
      anos_experiencia: 9,
      status: 'nao_perturbe',
      instrumentos: [13], generos: [6], daws: [0, 5], disps: [2, 3]
    },
    {
      nome_completo: 'Mariana Costa',
      nome_artistico: 'Mari Viola',
      email: 'mariana@email.com',
      estado: 'CE', cidade: 'Fortaleza',
      area_atuacao: 'Instrumentista',
      biografia: 'Violinista clássica migrando para o universo do forró e da música nordestina contemporânea.',
      anos_experiencia: 12,
      status: 'disponivel',
      instrumentos: [9, 12], generos: [8, 1], daws: [6], disps: [0, 1]
    },
    {
      nome_completo: 'Bruno Alves',
      nome_artistico: 'BrunoLow',
      email: 'bruno@email.com',
      estado: 'RS', cidade: 'Porto Alegre',
      area_atuacao: 'Instrumentista',
      biografia: 'Baixista versátil com experiência em jazz, rock e pop. Disponível para gravações e shows ao vivo.',
      anos_experiencia: 7,
      status: 'disponivel',
      instrumentos: [2, 10], generos: [3, 0], daws: [3, 7], disps: [2, 3]
    },
    {
      nome_completo: 'Juliana Ferreira',
      nome_artistico: 'JuPop',
      email: 'juliana@email.com',
      estado: 'SP', cidade: 'Campinas',
      area_atuacao: 'Vocalista',
      biografia: 'Cantora pop com passagem por programas de TV e experiência em estúdio. Busco colaborações autorais.',
      anos_experiencia: 4,
      status: 'disponivel',
      instrumentos: [6, 4], generos: [4, 13], daws: [2, 4], disps: [0, 1, 2]
    },
    {
      nome_completo: 'Thiago Drummond',
      nome_artistico: 'Thiago Drums',
      email: 'thiago@email.com',
      estado: 'GO', cidade: 'Goiânia',
      area_atuacao: 'Instrumentista',
      biografia: 'Baterista com 15 anos de estrada, já toquei em festivais pelo Brasil inteiro. Aceito sessões remotas.',
      anos_experiencia: 15,
      status: 'disponivel',
      instrumentos: [3], generos: [0, 10, 5], daws: [5], disps: [3]
    },
    {
      nome_completo: 'Camila Souza',
      nome_artistico: 'Cami Jazz',
      email: 'camila@email.com',
      estado: 'RJ', cidade: 'Niterói',
      area_atuacao: 'Compositora',
      biografia: 'Pianista e compositora jazzista formada pela UFRJ. Trabalho com arranjos e composições autorais.',
      anos_experiencia: 8,
      status: 'disponivel',
      instrumentos: [5, 4], generos: [3, 12], daws: [2, 3], disps: [0, 1]
    },
  ]

  for (const u of usuarios) {
    const usuario = await prisma.usuario.create({
      data: {
        nome_completo: u.nome_completo,
        nome_artistico: u.nome_artistico,
        email: u.email,
        senha,
        estado: u.estado,
        cidade: u.cidade,
        area_atuacao: u.area_atuacao,
        biografia: u.biografia,
        anos_experiencia: u.anos_experiencia,
        status: u.status,
        cadastro_completo: 1,
      }
    })

    await prisma.configuracaoUsuario.create({
      data: { id_usuario: usuario.id_usuario }
    })

    for (const i of u.instrumentos) {
      await prisma.usuarioInstrumento.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_instrumento: instrumentos[i].id_instrumento,
          principal: u.instrumentos.indexOf(i) === 0 ? 1 : 0
        }
      })
    }

    for (const g of u.generos) {
      await prisma.usuarioGenero.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_genero: generos[g].id_genero,
        }
      })
    }

    for (const d of u.daws) {
      await prisma.usuarioDaw.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_daw: daws[d].id_daw,
        }
      })
    }

    for (const disp of u.disps) {
      await prisma.usuarioDisponibilidade.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_disponibilidade: disps[disp].id_disponibilidade,
        }
      })
    }

    console.log(`✅ ${u.nome_artistico} criado`)
  }

  console.log('\n🎸 Seed concluído! 10 músicos criados.')
  console.log('📧 Todos com senha: 123456')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())