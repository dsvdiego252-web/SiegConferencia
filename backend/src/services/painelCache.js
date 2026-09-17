import { createClient } from '@supabase/supabase-js';

// A busca completa na SIEG pode precisar de mais tempo do que uma função
// aguenta rodar de uma vez na Vercel (rate limit real de 2 req/min pra
// baixar XMLs). Em vez de depender de rodar em segundo plano (que não é
// confiável em toda configuração de servidor), o progresso da busca
// (combos já concluídos + documentos já baixados) fica salvo aqui entre
// requisições — cada nova chamada a /api/painel retoma de onde parou.
// Sem Supabase configurado (dev local), esse cache fica indisponível e o
// painel busca tudo de forma síncrona.
export const cacheDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = cacheDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

const TTL_MS = 10 * 60 * 1000; // considera um resultado "pronto" desatualizado depois disso

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

export async function reiniciarBusca(cnpj, dataInicio, dataFim, tipo) {
  const linha = {
    cnpj,
    data_inicio: dataInicio,
    data_fim: dataFim,
    tipo,
    status: 'buscando',
    dados: null,
    erro_mensagem: null,
    combos_concluidos: [],
    docs_parciais: [],
    atualizado_em: new Date().toISOString(),
  };
  const { error } = await supabase.from('painel_cache').upsert(linha);
  if (error) throw new Error(`Falha ao reiniciar busca no Supabase: ${error.message}`);
  return linha;
}

export async function salvarProgresso(cnpj, dataInicio, dataFim, tipo, combosConcluidos, docsParciais) {
  const { error } = await supabase
    .from('painel_cache')
    .update({
      combos_concluidos: combosConcluidos,
      docs_parciais: docsParciais,
      atualizado_em: new Date().toISOString(),
    })
    .eq('cnpj', cnpj)
    .eq('data_inicio', dataInicio)
    .eq('data_fim', dataFim)
    .eq('tipo', tipo);
  if (error) throw new Error(`Falha ao salvar progresso da busca no Supabase: ${error.message}`);
}

export async function salvarResultado(cnpj, dataInicio, dataFim, tipo, dados) {
  const { error } = await supabase
    .from('painel_cache')
    .update({
      status: 'pronto',
      dados,
      erro_mensagem: null,
      combos_concluidos: [],
      docs_parciais: [],
      atualizado_em: new Date().toISOString(),
    })
    .eq('cnpj', cnpj)
    .eq('data_inicio', dataInicio)
    .eq('data_fim', dataFim)
    .eq('tipo', tipo);
  if (error) throw new Error(`Falha ao salvar resultado no Supabase: ${error.message}`);
}

export async function salvarErro(cnpj, dataInicio, dataFim, tipo, mensagem) {
  const { error } = await supabase
    .from('painel_cache')
    .update({ status: 'erro', erro_mensagem: mensagem, atualizado_em: new Date().toISOString() })
    .eq('cnpj', cnpj)
    .eq('data_inicio', dataInicio)
    .eq('data_fim', dataFim)
    .eq('tipo', tipo);
  if (error) console.error('Falha ao salvar erro no cache do painel:', error.message);
}

export function estaExpirado(atualizadoEm) {
  return Date.now() - new Date(atualizadoEm).getTime() > TTL_MS;
}
