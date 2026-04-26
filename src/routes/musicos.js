import { Router } from 'express';

const router = Router();


//array dos musicos
let musicos = [
  {
    id: 1,
    nome: "Lucas Vieira",
    nomeArtistico: "LV Bass",
    cidade: "João Pessoa",
    estado: "PB",
    bio: "Baixista com 8 anos de experiência em rock e MPB.",
    instrumentos: ["Baixo", "Contrabaixo"],
    generos: ["Rock", "MPB"],
    area: "Instrumentista",
    disponibilidade: ["tarde", "noite"],
    iniciais: "LV"
  },
  {
    id: 2,
    nome: "Mariana Costa",
    nomeArtistico: "Mari Voz",
    cidade: "Recife",
    estado: "PE",
    bio: "Vocalista e compositora. Já gravei com produtores independentes do nordeste.",
    instrumentos: ["Vocal"],
    generos: ["Pop", "Forró"],
    area: "Vocalista",
    disponibilidade: ["manha", "tarde"],
    iniciais: "MV"
  },
  {
    id: 3,
    nome: "Felipe Drummond",
    nomeArtistico: "DrumFX",
    cidade: "Natal",
    estado: "RN",
    bio: "Baterista e beatmaker. Produzo beats trap e funk.",
    instrumentos: ["Bateria"],
    generos: ["Funk", "Hip-Hop", "Trap"],
    area: "Beatmaker",
    disponibilidade: ["noite"],
    iniciais: "FD"
  },
  {
    id: 4,
    nome: "Ana Luz",
    nomeArtistico: "",
    cidade: "João Pessoa",
    estado: "PB",
    bio: "Pianista clássica com formação no conservatório.",
    instrumentos: ["Piano", "Teclado"],
    generos: ["Jazz", "MPB", "Clássica"],
    area: "Instrumentista",
    disponibilidade: ["manha"],
    iniciais: "AL"
  },
  {
    id: 5,
    nome: "Rafael Santos",
    nomeArtistico: "RafaBeats",
    cidade: "Fortaleza",
    estado: "CE",
    bio: "Produtor musical com home studio equipado.",
    instrumentos: [],
    generos: ["Hip-Hop", "Trap", "Pop"],
    area: "Produtor",
    disponibilidade: ["tarde", "noite"],
    iniciais: "RB"
  },
  {
    id: 6,
    nome: "Isabela Melo",
    nomeArtistico: "Bela Guitar",
    cidade: "São Paulo",
    estado: "SP",
    bio: "Guitarrista de metal e rock. Faço covers, aulas e participações em bandas.",
    instrumentos: ["Guitarra"],
    generos: ["Metal", "Rock"],
    area: "Instrumentista",
    disponibilidade: ["noite"],
    iniciais: "IG"
  },
  {
    id: 7,
    nome: "Carlos Menezes",
    nomeArtistico: "DJ Menezes",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    bio: "DJ com mais de 10 anos em festas e eventos.",
    instrumentos: [],
    generos: ["Funk", "Eletrônica"],
    area: "DJ",
    disponibilidade: ["noite"],
    iniciais: "CM"
  },
  {
    id: 8,
    nome: "Thaís Oliveira",
    nomeArtistico: "Tha Compositor",
    cidade: "João Pessoa",
    estado: "PB",
    bio: "Compositora e multi-instrumentista.",
    instrumentos: ["Violão", "Vocal"],
    generos: ["MPB", "Samba", "Pop"],
    area: "Compositor",
    disponibilidade: ["manha", "tarde"],
    iniciais: "TO"
  },
];

let proximoId = 9; //id do proximo musico criado

function validarMusico(dados) {
  const erros = [];

  if (!dados.nome || dados.nome.trim() === '')
    erros.push('O campo nome é obrigatório.');

  if (!dados.cidade || dados.cidade.trim() === '')
    erros.push('O campo cidade é obrigatório.');

  if (!dados.area || dados.area.trim() === '')
    erros.push('O campo area é obrigatório.');

  return erros;
}

router.get('/', (req, res) => {

    const  { disponibilidade } = req.query; 
    if (disponibilidade !== undefined) {
    const resultado = musicos.filter(m => m.disponibilidade.includes(disponibilidade));
    return res.status(200).json(resultado);
}
    
    res.status(200).json(musicos); //retorna todos os musicos
});

// GET por ID
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const musico = musicos.find(m => m.id === id);

  if (!musico) {
    return res.status(404).json({ erro: `Músico com id ${id} não encontrado.` });
  }

  res.status(200).json(musico);
});

// POST — cadastrar novo músico
router.post('/', (req, res) => {
  const dados = req.body;
  const erros = validarMusico(dados);

  if (erros.length > 0) {
    return res.status(400).json({ erros });
  }

  const novoMusico = {
    id: proximoId++,
    nome: dados.nome,
    nomeArtistico: dados.nomeArtistico || '',
    cidade: dados.cidade,
    estado: dados.estado || '',
    bio: dados.bio || '',
    instrumentos: dados.instrumentos || [],
    generos: dados.generos || [],
    area: dados.area,
    disponibilidade: dados.disponibilidade || [],
    iniciais: dados.nome.substring(0, 2).toUpperCase(),
  };

  musicos.push(novoMusico);
  res.status(201).json(novoMusico);
});

// PUT — atualizar músico
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const indice = musicos.findIndex(m => m.id === id);

  if (indice === -1) {
    return res.status(404).json({ erro: `Músico com id ${id} não encontrado.` });
  }

  const dados = req.body;
  const erros = validarMusico(dados);

  if (erros.length > 0) {
    return res.status(400).json({ erros });
  }

  musicos[indice] = { ...musicos[indice], ...dados, id };
  res.status(200).json(musicos[indice]);
});

// DELETE — remover músico
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const indice = musicos.findIndex(m => m.id === id);

  if (indice === -1) {
    return res.status(404).json({ erro: `Músico com id ${id} não encontrado.` });
  }

  musicos.splice(indice, 1);
  res.status(200).json({ mensagem: `Músico ${id} removido com sucesso.` });
});






export default router;
