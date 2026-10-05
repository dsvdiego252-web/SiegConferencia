import { supabase, supabaseDisponivel } from './supabaseClient.js';

// A busca completa na SIEG pode precisar de mais tempo do que uma função
// aguenta rodar de uma vez na Vercel (rate limit real de 2 req/min pra
// baixar XMLs). Em vez de depender de rodar em segundo plano (que não é
// confiável em toda configuração de servidor), o progresso da busca
// (combos já concluídos + documentos já baixados) fica salvo aqui entre
// requisições — cada nova chamada a /api/painel retoma de onde parou.
// Sem Supabase configurado (dev local), esse cache fica indisponível e o
// painel busca tudo de forma síncrona.
export const cacheDisponivel = supabaseDisponivel;

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

// ignorarCachePermanente: true quando veio de "Forçar atualização" — fica
// salvo na linha (não só nesta chamada) porque uma busca de alto volume
// avança aos poucos em várias chamadas (ver painel.js); sem persistir isso,
// só a primeira combo da primeira chamada ignorava o cache permanente de
// documentos (documentCache.js) e as combos seguintes, nas chamadas
// seguintes, voltavam a usar o cache normalmente — nem toda a busca forçada
// realmente ia buscar tudo de novo na SIEG.
export async function reiniciarBusca(cnpj, dataInicio, dataFim, tipo, ignorarCachePermanente = false) {
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
    combo_parcial: null,
    ignorar_cache_permanente: ignorarCachePermanente,
    atualizado_em: new Date().toISOString(),
  };
  const { error } = await supabase.from('painel_cache').upsert(linha);
  if (error) throw new Error(`Falha ao reiniciar busca no Supabase: ${error.message}`);
  return linha;
}

// combosConcluidos: combos totalmente baixados até agora.
// docsParciais: documentos já mesclados dos combos concluídos.
// comboParcial: { chave, proximoSkip, docs } do combo em andamento cuja
// paginação não coube inteira no tempo desta requisição — ou null se
// nenhum combo ficou pela metade.
export async function salvarProgresso(cnpj, dataInicio, dataFim, tipo, combosConcluidos, docsParciais, comboParcial) {
  const { error } = await supabase
    .from('painel_cache')
    .update({
      combos_concluidos: combosConcluidos,
      docs_parciais: docsParciais,
      combo_parcial: comboParcial,
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
      combo_parcial: null,
      ignorar_cache_permanente: false,
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
