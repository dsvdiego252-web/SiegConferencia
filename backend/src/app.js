import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { clientsRouter } from './routes/clients.js';
import { xmlsRouter } from './routes/xmls.js';
import { analysisRouter } from './routes/analysis.js';
import { reconciliationRouter } from './routes/reconciliation.js';
import { painelRouter } from './routes/painel.js';
import { cronRouter } from './routes/cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

// Login por sessão (cookie assinado), no lugar do HTTP Basic Auth padrão do
// navegador — permite uma tela de login com a cara do painel em vez do
// prompt nativo feio do browser. Continua usando as mesmas ADMIN_USER/
// ADMIN_PASSWORD; sem essas variáveis (dev local), o painel fica aberto.
const authEnabled = Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);
const SESSION_COOKIE = 'sieg_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function segredoSessao() {
  return crypto.createHash('sha256').update(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`).digest();
}

function criarTokenSessao() {
  const exp = String(Date.now() + SESSION_TTL_MS);
  const assinatura = crypto.createHmac('sha256', segredoSessao()).update(exp).digest('hex');
  return `${exp}.${assinatura}`;
}

function tokenValido(token) {
  if (!token) return false;
  const [exp, assinatura] = token.split('.');
  if (!exp || !assinatura || !Number.isFinite(Number(exp)) || Number(exp) < Date.now()) return false;
  const esperado = crypto.createHmac('sha256', segredoSessao()).update(exp).digest('hex');
  const bufA = Buffer.from(assinatura, 'hex');
  const bufB = Buffer.from(esperado, 'hex');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function lerCookie(req, nome) {
  const cabecalho = req.headers.cookie || '';
  for (const parte of cabecalho.split(';')) {
    const trimmed = parte.trim();
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    if (trimmed.slice(0, idx) === nome) return decodeURIComponent(trimmed.slice(idx + 1));
  }
  return null;
}

function paginaLogin({ erro } = {}) {
  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Entrar — SIEG Conferência Fiscal</title>
<style>
  :root { --bg: #f5f6f8; --panel: #ffffff; --border: #e0e3e8; --text: #1f2430; --text-muted: #6b7280; --primary: #2f5aff; --danger: #d64545; --danger-bg: #fdecec; --radius: 12px; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    background: linear-gradient(160deg, #eef1ff 0%, var(--bg) 55%);
    color: var(--text);
    padding: 16px;
  }
  .card {
    width: 100%;
    max-width: 380px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 36px 32px;
    box-shadow: 0 20px 50px -25px rgba(31, 36, 48, 0.35);
  }
  .logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 18px;
  }
  h1 { font-size: 1.3rem; margin: 0 0 4px; }
  p.subtitle { margin: 0 0 24px; color: var(--text-muted); font-size: 0.9rem; }
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; font-size: 0.85rem; }
  .field label { color: var(--text-muted); font-weight: 600; }
  .field input {
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.95rem;
  }
  .field input:focus { outline: 2px solid var(--primary); outline-offset: 1px; border-color: var(--primary); }
  button {
    width: 100%;
    padding: 11px;
    border: none;
    border-radius: 8px;
    background: var(--primary);
    color: white;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    margin-top: 6px;
  }
  button:hover { opacity: 0.92; }
  .erro {
    background: var(--danger-bg);
    color: var(--danger);
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    margin-bottom: 16px;
  }
</style>
</head>
<body>
  <form class="card" method="POST" action="/login">
    <div class="logo">SC</div>
    <h1>SIEG Conferência Fiscal</h1>
    <p class="subtitle">Entre com suas credenciais para acessar o painel.</p>
    ${erro ? '<div class="erro">Usuário ou senha incorretos.</div>' : ''}
    <div class="field">
      <label for="usuario">Usuário</label>
      <input id="usuario" name="usuario" type="text" autocomplete="username" required autofocus />
    </div>
    <div class="field">
      <label for="senha">Senha</label>
      <input id="senha" name="senha" type="password" autocomplete="current-password" required />
    </div>
    <button type="submit">Entrar</button>
  </form>
</body>
</html>`;
}

function ehChamadaDeCronValida(req) {
  // O Cron da Vercel (e o encadeamento entre execuções em routes/cron.js)
  // não tem como mandar o cookie de sessão de um login humano — se autentica
  // sozinho via CRON_SECRET, verificado de novo dentro da própria rota.
  // Aqui só libera do gate de sessão; sem CRON_SECRET configurado, esse
  // caminho nunca libera nada (a rota fica inacessível de propósito).
  if (!req.path.startsWith('/api/cron/') || !process.env.CRON_SECRET) return false;
  return req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
}

function exigirSessao(req, res, next) {
  if (!authEnabled) return next();
  if (tokenValido(lerCookie(req, SESSION_COOKIE))) return next();
  if (ehChamadaDeCronValida(req)) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }
  return res.redirect('/login');
}

export const app = express();
app.set('trust proxy', true);
app.set('etag', false);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/login', (req, res) => {
  if (!authEnabled || tokenValido(lerCookie(req, SESSION_COOKIE))) return res.redirect('/');
  res.type('html').send(paginaLogin({ erro: req.query.erro === '1' }));
});

app.post('/login', (req, res) => {
  if (!authEnabled) return res.redirect('/');
  const { usuario, senha } = req.body || {};
  if (usuario === process.env.ADMIN_USER && senha === process.env.ADMIN_PASSWORD) {
    res.cookie(SESSION_COOKIE, criarTokenSessao(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.protocol === 'https',
      maxAge: SESSION_TTL_MS,
    });
    return res.redirect('/');
  }
  return res.redirect('/login?erro=1');
});

app.get('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.redirect('/login');
});

app.use(exigirSessao);

// As chamadas a /api/* (principalmente o polling de /api/painel, sempre com
// a mesma URL enquanto a busca está em andamento) nunca podem ser
// cacheadas — nem pelo navegador, nem pela CDN da Vercel. Sem isso, o
// polling ficava recebendo de volta (via 304) a mesma resposta antiga em
// cache pra sempre, travado no mesmo progresso, mesmo com a busca real já
// tendo avançado no servidor.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mockMode: config.mockMode });
});

app.use('/api/clients', clientsRouter);
app.use('/api/xmls', xmlsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api/painel', painelRouter);
app.use('/api/cron', cronRouter);

app.use(express.static(FRONTEND_DIR));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

export default app;
