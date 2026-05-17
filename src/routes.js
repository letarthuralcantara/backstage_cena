import { Router } from 'express';
import Musico from './models/musico.js';

const router = Router();

router.get('/', async (req, res) => {
  const { disponibilidade } = req.query;
  const resultado = await Musico.read('disponibilidade', disponibilidade);
  res.status(200).json(resultado);
});

router.get('/estados', async (req, res) => {
  try {
    const usuarios = await Musico.read();
    const estados = [...new Set(usuarios.map(u => u.estado).filter(Boolean))].sort();
    res.status(200).json(estados);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.get('/instrumentos', async (req, res) => {
  try {
    const instrumentos = await Musico.listarInstrumentos();
    res.status(200).json(instrumentos);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.get('/generos', async (req, res) => {
  try {
    const generos = await Musico.listarGeneros();
    res.status(200).json(generos);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.get('/areas', async (req, res) => {
  try {
    const usuarios = await Musico.read();
    const areas = [...new Set(usuarios.map(u => u.area_atuacao).filter(Boolean))].sort();
    res.status(200).json(areas);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});
router.get('/daws', async (req, res) => {
  try {
    const daws = await Musico.listarDaws();
    res.status(200).json(daws);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const musico = await Musico.readById(id);
    res.status(200).json(musico);
  } catch (error) {
    res.status(404).json({ erro: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const novoMusico = await Musico.create(req.body);
    res.status(201).json(novoMusico);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const atualizado = await Musico.update({ ...req.body, id });
    res.status(200).json(atualizado);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await Musico.remove(id);
    res.status(200).json({ mensagem: `Músico ${id} removido com sucesso.` });
  } catch (error) {
    res.status(404).json({ erro: error.message });
  }
});


export default router;