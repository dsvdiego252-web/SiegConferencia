import { Router } from 'express';
import { listarClientes, adicionarCliente, atualizarCliente } from '../services/clientsStore.js';

export const clientsRouter = Router();

clientsRouter.get('/', async (req, res) => {
  try {
    res.json(await listarClientes());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

clientsRouter.post('/', async (req, res) => {
  try {
    const { cnpj, nome, regimeTributario, atividade, segmento, regimesEspeciais } = req.body || {};
    const clientes = await adicionarCliente({ cnpj, nome, regimeTributario, atividade, segmento, regimesEspeciais });
    res.status(201).json(clientes);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

clientsRouter.patch('/:cnpj', async (req, res) => {
  try {
    const { nome, regimeTributario, atividade, segmento, regimesEspeciais } = req.body || {};
    const clientes = await atualizarCliente(req.params.cnpj, { nome, regimeTributario, atividade, segmento, regimesEspeciais });
    res.json(clientes);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
