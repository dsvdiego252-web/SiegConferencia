import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENTS_FILE = path.join(__dirname, '..', 'data', 'clients.json');

export async function listarClientes() {
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
  await writeFile(CLIENTS_FILE, JSON.stringify(clientes, null, 2));
  return clientes;
}
