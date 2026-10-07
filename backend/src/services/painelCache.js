import { supabase, supabaseDisponivel, supabaseEscritaGrande } from './supabaseClient.js';

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
    processando_em: null,
    tentativas_fundo: 0,
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

// Grava com o cliente de timeout maior (ver supabaseClient.js) — o `dados`
// aqui inclui os itens de cada documento do período inteiro, podendo passar
// de 1-2MB de JSON pra um cliente de alto volume, e os 20s do timeout
// padrão nem sempre bastam (confirmado em produção: a busca de um cliente
// de ~3100 documentos terminava de verdade mas falhava só nesta gravação,
// nunca deixando o cache ficar 'pronto' — cada tentativa seguinte refazia
// tudo de novo do zero achando que ainda faltava).
//
// `prazoFinal`, quando informado, limita esse timeout maior ao que
// realmente resta até o corte dos 60s da Vercel (e não aos 40s cheios
// sempre) — sem isso, um `prazoFinal` já quase esgotado (ex.: os combos
// levaram quase o orçamento inteiro pra terminar) deixaria essa gravação
// livre pra passar dos 60s reais e matar a função no meio, sem nem chance
// do catch de quem chamou rodar.
export async function salvarResultado(cnpj, dataInicio, dataFim, tipo, dados, prazoFinal) {
  const cliente = supabaseEscritaGrande || supabase;
  let query = cliente
    .from('painel_cache')
    .update({
      status: 'pronto',
      dados,
      erro_mensagem: null,
      combos_concluidos: [],
      docs_parciais: [],
      combo_parcial: null,
      ignorar_cache_permanente: false,
      processando_em: null,
      tentativas_fundo: 0,
      atualizado_em: new Date().toISOString(),
    })
    .eq('cnpj', cnpj)
    .eq('data_inicio', dataInicio)
    .eq('data_fim', dataFim)
    .eq('tipo', tipo);

  let timeoutId;
  if (prazoFinal) {
    // prazoFinal = início real da invocação + ORCAMENTO_MS (45s, ver
    // painelSearchService.js) — o corte duro real da Vercel é 60s desde
    // esse mesmo início, então os 15s de diferença são o que realmente
    // ainda sobra além do prazoFinal.
    const restanteAteCorteReal = prazoFinal + 15_000 - Date.now() - 2_000;
    const timeoutMs = Math.max(1, Math.min(40_000, restanteAteCorteReal));
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    query = query.abortSignal(controller.signal);
  }

  try {
    const { error } = await query;
    if (error) throw new Error(`Falha ao salvar resultado no Supabase: ${error.message}`);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
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

// Janela em que um "processando_em" recente é considerado prova de que a
// continuação em segundo plano (routes/cron.js:/continuar-painel) já está
// ativa pra este cnpj/período/tipo — maior que ORCAMENTO_MS (45s, o teto de
// um passo) pra dar folga, mas curta o bastante pra, se a cadeia realmente
// morreu no meio (ex.: a função caiu), o próximo poll do navegador perceba
// e dispare uma nova sem ficar esperando pra sempre.
export const JANELA_PROCESSAMENTO_FUNDO_MS = 90_000;

// Travessa de segurança contra um loop sem fim (ex.: bug que nunca deixa o
// combo concluir) — nesse número de passos encadeados a continuação em
// segundo plano desiste e marca erro, em vez de chamar a si mesma pra
// sempre. Cada passo é até ORCAMENTO_MS (45s), então isso cobre até várias
// horas de busca contínua — bem mais que qualquer cliente real precisa,
// mesmo de altíssimo volume.
export const MAX_TENTATIVAS_FUNDO = 500;

// Marca que um passo da busca em segundo plano está prestes a rodar
// (heartbeat) e devolve o número da tentativa — usado tanto pra alimentar
// a checagem de "já tem uma continuação ativa" (ver painel.js) quanto pra
// aplicar o teto acima.
export async function marcarProcessamentoEmFundo(cnpj, dataInicio, dataFim, tipo, tentativas) {
  const { error } = await supabase
    .from('painel_cache')
    .update({ processando_em: new Date().toISOString(), tentativas_fundo: tentativas })
    .eq('cnpj', cnpj)
    .eq('data_inicio', dataInicio)
    .eq('data_fim', dataFim)
    .eq('tipo', tipo);
  if (error) throw new Error(`Falha ao marcar processamento em segundo plano no Supabase: ${error.message}`);
}
