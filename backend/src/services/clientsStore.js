import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENTS_FILE = path.join(__dirname, '..', 'data', 'clients.json');

// Na Vercel, o sistema de arquivos é somente leitura (fora de /tmp) — usar
// um arquivo local não funciona para persistir clientes cadastrados pelo
// painel. Quando SUPABASE_URL/SUPABASE_SECRET_KEY estão definidos, guardamos
// a lista de clientes numa tabela do Supabase; sem isso (dev local), cai de
// volta pro arquivo JSON. A secret key é usada porque esse client roda só
// no backend (nunca chega ao navegador) e a tabela não tem RLS habilitado.
const usarSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = usarSupabase
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
  : null;

export async function listarClientes() {
  if (usarSupabase) {
    const { data, error } = await supabase.from('clientes').select('cnpj, nome').order('nome');
    if (error) throw new Error(`Falha ao listar clientes no Supabase: ${error.message}`);
    return data;
  }
  const raw = await readFile(CLIENTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function obterCliente(cnpj) {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');

  if (usarSupabase) {
    const { data, error } = await supabase.from('clientes').select('cnpj, nome').eq('cnpj', cnpjLimpo).maybeSingle();
    if (error) throw new Error(`Falha ao buscar cliente no Supabase: ${error.message}`);
    return data;
  }

  const clientes = await listarClientes();
  return clientes.find((c) => c.cnpj === cnpjLimpo) || null;
}

export async function adicionarCliente({ cnpj, nome }) {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  if (!cnpjLimpo || cnpjLimpo.length !== 14) {
    throw new Error('CNPJ inválido: informe os 14 dígitos.');
  }

  if (usarSupabase) {
    if (await obterCliente(cnpjLimpo)) {
      throw new Error('Já existe um cliente cadastrado com esse CNPJ.');
    }
    const { error } = await supabase.from('clientes').insert({ cnpj: cnpjLimpo, nome: nome || cnpjLimpo });
    if (error) throw new Error(`Falha ao cadastrar cliente no Supabase: ${error.message}`);
    return listarClientes();
  }

  const clientes = await listarClientes();
  if (clientes.some((c) => c.cnpj === cnpjLimpo)) {
    throw new Error('Já existe um cliente cadastrado com esse CNPJ.');
  }
  clientes.push({ cnpj: cnpjLimpo, nome: nome || cnpjLimpo });
  await writeFile(CLIENTS_FILE, JSON.stringify(clientes, null, 2));
  return clientes;
}
