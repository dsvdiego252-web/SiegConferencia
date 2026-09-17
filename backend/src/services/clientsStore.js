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

export const REGIMES_TRIBUTARIOS = ['simples_nacional', 'mei', 'lucro_presumido', 'lucro_real'];

function normalizarClienteSupabase(row) {
  if (!row) return null;
  return { cnpj: row.cnpj, nome: row.nome, regimeTributario: row.regime_tributario || null };
}

export async function listarClientes() {
  if (usarSupabase) {
    const { data, error } = await supabase.from('clientes').select('cnpj, nome, regime_tributario').order('nome');
    if (error) throw new Error(`Falha ao listar clientes no Supabase: ${error.message}`);
    return data.map(normalizarClienteSupabase);
  }
  const raw = await readFile(CLIENTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function obterCliente(cnpj) {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');

  if (usarSupabase) {
    const { data, error } = await supabase
      .from('clientes')
      .select('cnpj, nome, regime_tributario')
      .eq('cnpj', cnpjLimpo)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar cliente no Supabase: ${error.message}`);
    return normalizarClienteSupabase(data);
  }

  const clientes = await listarClientes();
  return clientes.find((c) => c.cnpj === cnpjLimpo) || null;
}

function validarRegime(regimeTributario) {
  if (!regimeTributario) return null;
  if (!REGIMES_TRIBUTARIOS.includes(regimeTributario)) {
    throw new Error(`Regime tributário inválido: ${regimeTributario}`);
  }
  return regimeTributario;
}

export async function adicionarCliente({ cnpj, nome, regimeTributario }) {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  if (!cnpjLimpo || cnpjLimpo.length !== 14) {
    throw new Error('CNPJ inválido: informe os 14 dígitos.');
  }
  const regime = validarRegime(regimeTributario);

  if (usarSupabase) {
    if (await obterCliente(cnpjLimpo)) {
      throw new Error('Já existe um cliente cadastrado com esse CNPJ.');
    }
    const { error } = await supabase
      .from('clientes')
      .insert({ cnpj: cnpjLimpo, nome: nome || cnpjLimpo, regime_tributario: regime });
    if (error) throw new Error(`Falha ao cadastrar cliente no Supabase: ${error.message}`);
    return listarClientes();
  }

  const clientes = await listarClientes();
  if (clientes.some((c) => c.cnpj === cnpjLimpo)) {
    throw new Error('Já existe um cliente cadastrado com esse CNPJ.');
  }
  clientes.push({ cnpj: cnpjLimpo, nome: nome || cnpjLimpo, regimeTributario: regime });
  await writeFile(CLIENTS_FILE, JSON.stringify(clientes, null, 2));
  return clientes;
}

export async function atualizarCliente(cnpj, { nome, regimeTributario }) {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  const atual = await obterCliente(cnpjLimpo);
  if (!atual) throw new Error('Cliente não encontrado.');
  const regime = regimeTributario === undefined ? atual.regimeTributario : validarRegime(regimeTributario);
  const novoNome = nome === undefined || nome === '' ? atual.nome : nome;

  if (usarSupabase) {
    const { error } = await supabase
      .from('clientes')
      .update({ nome: novoNome, regime_tributario: regime })
      .eq('cnpj', cnpjLimpo);
    if (error) throw new Error(`Falha ao atualizar cliente no Supabase: ${error.message}`);
    return listarClientes();
  }

  const clientes = await listarClientes();
  const indice = clientes.findIndex((c) => c.cnpj === cnpjLimpo);
  clientes[indice] = { ...clientes[indice], nome: novoNome, regimeTributario: regime };
  await writeFile(CLIENTS_FILE, JSON.stringify(clientes, null, 2));
  return clientes;
}
