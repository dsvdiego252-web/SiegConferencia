import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { clientsRouter } from './routes/clients.js';
import { xmlsRouter } from './routes/xmls.js';
import { analysisRouter } from './routes/analysis.js';
import { reconciliationRouter } from './routes/reconciliation.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mockMode: config.mockMode });
});

app.use('/api/clients', clientsRouter);
app.use('/api/xmls', xmlsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/reconciliation', reconciliationRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

app.listen(config.port, () => {
  console.log(`SIEG Conferência backend rodando em http://localhost:${config.port} (mockMode=${config.mockMode})`);
});
