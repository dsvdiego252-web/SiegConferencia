import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENTS_FILE = path.join(__dirname, '..', 'data', 'clients.json');

// Na Vercel, o sistema de arquivos é somente leitura (fora de /tmp) — usar
// um arquivo local não funciona para persistir clientes cadastrados pelo
// painel. Quando há uma store do Vercel Blob conectada ao projeto (token
// injetado automaticamente como BLOB_READ_WRITE_TOKEN), guardamos a lista
// de clientes lá; sem isso (dev local), cai de volta pro arquivo JSON.
const BLOB_PATHNAME = 'sieg-conferencia/clients.json';
const usarBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function lerClientesDoBlob() {
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: BLOB_PATHNAME });
  const existente = blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!existente) return [];
  const resposta = await fetch(existente.url, { cache: 'no-store' });
  return resposta.json();
}

async function salvarClientesNoBlob(clientes) {
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATHNAME, JSON.stringify(clientes, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function listarClientes() {
  if (usarBlob) return lerClientesDoBlob();
  const raw = await readFile(CLIENTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function obterCliente(cnpj) {
  const clientes = await listarClientes();
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  return clientes.find((c) => c.cnpj === cnpjLimpo) || null;
}

export async function adicionarCliente({ cnpj, nome }) {
  const clientes = await listarClientes();
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  if (!cnpjLimpo || cnpjLimpo.length !== 14) {
    throw new Error('CNPJ inválido: informe os 14 dígitos.');
  }
  if (clientes.some((c) => c.cnpj === cnpjLimpo)) {
    throw new Error('Já existe um cliente cadastrado com esse CNPJ.');
  }
  clientes.push({ cnpj: cnpjLimpo, nome: nome || cnpjLimpo });

  if (usarBlob) await salvarClientesNoBlob(clientes);
  else await writeFile(CLIENTS_FILE, JSON.stringify(clientes, null, 2));

  return clientes;
}
