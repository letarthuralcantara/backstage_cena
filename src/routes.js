import { Router } from 'express';
import Musico from './models/Musico.js';

const router = Router();

router.get('/', async (req, res) => {
  const { disponibilidade } = req.query;
  const resultado = await Musico.read('disponibilidade', disponibilidade);
  res.status(200).json(resultado);
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