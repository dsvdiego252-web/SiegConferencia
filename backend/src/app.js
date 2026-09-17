import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { clientsRouter } from './routes/clients.js';
import { xmlsRouter } from './routes/xmls.js';
import { analysisRouter } from './routes/analysis.js';
import { reconciliationRouter } from './routes/reconciliation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

// Autenticação HTTP Basic simples: protege tanto a API quanto os arquivos
// estáticos do front. Só fica ativa se ADMIN_USER/ADMIN_PASSWORD estiverem
// definidos (em produção/Vercel); em dev local sem essas variáveis, o
// painel continua aberto como antes, sem exigir login.
function autenticacaoBasica(req, res, next) {
  const usuarioEsperado = process.env.ADMIN_USER;
  const senhaEsperada = process.env.ADMIN_PASSWORD;
  if (!usuarioEsperado || !senhaEsperada) return next();

  const cabecalho = req.headers.authorization || '';
  const [esquema, credenciais] = cabecalho.split(' ');
  if (esquema === 'Basic' && credenciais) {
    const decodificado = Buffer.from(credenciais, 'base64').toString('utf-8');
    const separador = decodificado.indexOf(':');
    const usuario = decodificado.slice(0, separador);
    const senha = decodificado.slice(separador + 1);
    if (usuario === usuarioEsperado && senha === senhaEsperada) return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="SIEG Conferencia Fiscal"');
  res.status(401).send('Autenticação necessária.');
}

export const app = express();

app.use(autenticacaoBasica);
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mockMode: config.mockMode });
});

app.use('/api/clients', clientsRouter);
app.use('/api/xmls', xmlsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/reconciliation', reconciliationRouter);

app.use(express.static(FRONTEND_DIR));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

export default app;
