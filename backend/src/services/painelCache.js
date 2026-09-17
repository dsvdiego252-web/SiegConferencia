import { createClient } from '@supabase/supabase-js';

// A busca completa na SIEG pode levar mais que o limite de execução da
// Vercel (por causa do rate limit real de 2 req/min pra baixar XMLs), então
// o painel não busca mais de forma síncrona: guarda o resultado numa tabela
// do Supabase e atualiza em segundo plano (ver painel.js). Sem Supabase
// configurado (dev local), esse cache fica indisponível e o painel volta a
// buscar direto, sem cache.
export const cacheDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = cacheDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

const TTL_MS = 10 * 60 * 1000; // considera o resultado "pronto" desatualizado depois disso
const BUSCANDO_TRAVADO_MS = 90 * 1000; // "buscando" há mais que isso = provavelmente a função anterior morreu no meio

export async function lerCache(cnpj, dataInicio, dataFim, tipo) {
  const { data, error } = await supabase
    .from('painel_cache')
    .select('*')
    .eq('cnpj', cnpj)
    .eq('data_inicio', dataInicio)
    .eq('data_fim', dataFim)
    .eq('tipo', tipo)
    .maybeSingle();
  if (error) throw new Error(`Falha ao ler cache do painel no Supabase: ${error.message}`);
  return data;
}

export async function marcarBuscando(cnpj, dataInicio, dataFim, tipo) {
  const { error } = await supabase.from('painel_cache').upsert({
    cnpj,
    data_inicio: dataInicio,
    data_fim: dataFim,
    tipo,
    status: 'buscando',
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error(`Falha ao marcar busca em andamento no Supabase: ${error.message}`);
}

export async function salvarResultado(cnpj, dataInicio, dataFim, tipo, dados) {
  const { error } = await supabase.from('painel_cache').upsert({
    cnpj,
    data_inicio: dataInicio,
    data_fim: dataFim,
    tipo,
    status: 'pronto',
    dados,
    erro_mensagem: null,
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error(`Falha ao salvar resultado no Supabase: ${error.message}`);
}

export async function salvarErro(cnpj, dataInicio, dataFim, tipo, mensagem) {
  const { error } = await supabase.from('painel_cache').upsert({
    cnpj,
    data_inicio: dataInicio,
    data_fim: dataFim,
    tipo,
    status: 'erro',
    erro_mensagem: mensagem,
    atualizado_em: new Date().toISOString(),
  });
  if (error) console.error('Falha ao salvar erro no cache do painel:', error.message);
}

export function estaExpirado(atualizadoEm) {
  return Date.now() - new Date(atualizadoEm).getTime() > TTL_MS;
}

export function estaTravado(atualizadoEm) {
  return Date.now() - new Date(atualizadoEm).getTime() > BUSCANDO_TRAVADO_MS;
}
