import { supabase, supabaseDisponivel } from './supabaseClient.js';

// Cache permanente de documentos por chave de acesso — ao contrário do
// painel_cache (resultado de uma busca específica, expira em 10min), este
// guarda o documento em si pra sempre, deduplicado por chave. Sem Supabase
// configurado (dev local), fica desligado e todo combo é buscado ao vivo,
// como sempre foi.
export const cacheDocumentosDisponivel = supabaseDisponivel;

// O cancelamento de NFe/NFCe tem prazo real de 24h a partir da emissão. Uma
// nota emitida às 23h59 de um dia só pode ser cancelada até 23h59 do dia
// seguinte — então um dia só fica garantidamente livre de qualquer
// cancelamento pendente a partir de 2 dias depois (1 dia de folga sobre o
// prazo real, cobrindo a diferença entre "dia civil" calculado em UTC aqui e
// o horário de Brasília). Hoje e ontem nunca são considerados estáveis.
const DIAS_ESTABILIDADE = 2;

// Enquanto um dia ainda não é "estável" (ver acima), ainda vale confiar por
// pouco tempo num resultado buscado há pouco — é o que permite a
// sincronização noturna (syncNoturno.js) deixar "ontem" pronto de véspera
// pra quem abrir o painel de manhã, sem esperar a janela de estabilidade
// inteira passar. A janela é maior que 24h só pra ter folga confortável
// entre uma execução noturna e a outra.
const JANELA_PROVISORIA_HORAS = 30;

function listarDias(dataInicio, dataFim) {
  const dias = [];
  const atual = new Date(`${dataInicio}T00:00:00Z`);
  const fim = new Date(`${dataFim}T00:00:00Z`);
  while (atual <= fim) {
    dias.push(atual.toISOString().slice(0, 10));
    atual.setUTCDate(atual.getUTCDate() + 1);
  }
  return dias;
}

function hojeStr() {
  return new Date().toISOString().slice(0, 10);
}

function diaEstavel(dia) {
  const limiar = new Date();
  limiar.setUTCDate(limiar.getUTCDate() - DIAS_ESTABILIDADE);
  return dia < limiar.toISOString().slice(0, 10);
}

/**
 * true se TODO o período pedido já está sincronizado (cache confiável) pra
 * este cliente+combo — nesse caso nem vale a pena chamar a SIEG, os
 * documentos já buscados antes servem. "Hoje" nunca é considerado cacheado
 * (ainda pode receber notas novas/canceladas a qualquer momento). Um dia
 * "recente" (ver DIAS_ESTABILIDADE) só conta como cacheado se foi
 * sincronizado há pouco tempo (JANELA_PROVISORIA_HORAS) — o suficiente pra
 * cobrir o intervalo até a próxima sincronização noturna, mas não pra
 * sempre.
 */
export async function periodoTotalmenteCacheado(cnpjCliente, xmlType, direcao, dataInicio, dataFim) {
  if (!cacheDocumentosDisponivel) return false;
  const dias = listarDias(dataInicio, dataFim);
  const hoje = hojeStr();
  if (dias.includes(hoje)) return false;

  const { data, error } = await supabase
    .from('sieg_sync_dias')
    .select('dia, sincronizado_em')
    .eq('cnpj_cliente', cnpjCliente)
    .eq('xml_type', xmlType)
    .eq('direcao', direcao)
    .gte('dia', dataInicio)
    .lte('dia', dataFim);
  if (error) throw new Error(`Falha ao ler cobertura de sincronização no Supabase: ${error.message}`);

  const sincronizadoEmPorDia = new Map((data || []).map((linha) => [linha.dia, linha.sincronizado_em]));
  const agora = Date.now();
  return dias.every((dia) => {
    const sincronizadoEm = sincronizadoEmPorDia.get(dia);
    if (!sincronizadoEm) return false;
    if (diaEstavel(dia)) return true;
    const idadeHoras = (agora - new Date(sincronizadoEm).getTime()) / 3_600_000;
    return idadeHoras < JANELA_PROVISORIA_HORAS;
  });
}

export function linhaParaDocumento(linha) {
  return {
    tipoDocumento: linha.tipo_documento,
    chave: linha.chave,
    numero: linha.numero,
    serie: linha.serie,
    dataEmissao: linha.data_emissao,
    naturezaOperacao: linha.natureza_operacao,
    tpNF: null,
    cancelada: linha.cancelada,
    emitente: { cnpj: linha.emit_cnpj, nome: linha.emit_nome || '' },
    destinatario: { cnpj: linha.dest_cnpj || '', nome: linha.dest_nome || '' },
    valorTotal: Number(linha.valor_total),
    valorIcmsTotal: Number(linha.valor_icms_total),
    valorProdutosTotal: Number(linha.valor_produtos_total),
    valorPisTotal: Number(linha.valor_pis_total || 0),
    valorCofinsTotal: Number(linha.valor_cofins_total || 0),
    // null = cacheado antes de existir esse controle (parser legado) — ver
    // xmlParser.js VERSAO_PARSER e validarCbenef.js pro caso real que
    // motivou isso (cBenef não capturado por documentos já cacheados).
    versaoParser: linha.versao_parser ?? null,
    itens: linha.itens || [],
  };
}

// O Supabase (PostgREST) limita cada resposta a 1000 linhas por padrão,
// mesmo sem pedir — sem paginar explicitamente com .range(), um cliente de
// alto volume (ex.: muitas vendas NFCe) tem seus documentos cacheados
// cortados silenciosamente em 1000, sem erro nenhum. Precisa buscar em
// páginas até vir menos que o tamanho pedido.
const TAMANHO_PAGINA_SUPABASE = 1000;

/**
 * Documentos já cacheados relevantes pro combo (cliente como emitente ou
 * destinatário, conforme a direção). Filtrar por `tipoDocumento` aqui (e não
 * só depois, em classificarDocumentos) importa pra não duplicar trabalho: um
 * cliente de alto volume (ex.: muitas vendas NFCe) tem o combo de NFe e o de
 * NFCe buscando essa mesma direção cada um por sua vez — sem o filtro, os
 * dois acabavam buscando o período inteiro (NFe + NFCe juntos) do zero,
 * dobrando a leitura do Supabase à toa e arriscando estourar o tempo de
 * execução da função mesmo com tudo cacheado, sem nenhuma chamada à SIEG.
 */
// Teto por página — uma página sozinha nunca deveria precisar de mais que
// isso num uso normal; existe só pra não deixar uma chamada travada (ex.:
// instabilidade de rede entre a função e o Supabase) presa sem retorno até
// o corte duro de 60s da Vercel, sem nenhuma chance de salvar o progresso já
// feito. Ver prazoFinal abaixo: o teto real de cada chamada é o menor entre
// este valor e o tempo que resta do orçamento da requisição.
const TIMEOUT_PAGINA_MS = 20_000;

export async function buscarDocumentosCacheados(cnpjCliente, direcao, dataInicio, dataFim, tipoDocumento, prazoFinal) {
  const coluna = direcao === 'emit' ? 'emit_cnpj' : 'dest_cnpj';
  const todos = [];
  let offset = 0;
  for (;;) {
    // Cliente de altíssimo volume (muitas páginas) nunca deveria arriscar
    // estourar o tempo de execução da função só lendo o próprio cache —
    // melhor desistir cedo e deixar quem chamou tratar como instabilidade
    // passageira (salva o progresso já feito, tenta de novo no próximo poll)
    // do que um 504 sem nada salvo.
    const agora = Date.now();
    if (prazoFinal && agora >= prazoFinal) {
      const erro = new Error('Tempo esgotado lendo documentos cacheados no Supabase.');
      erro.transitorio = true;
      throw erro;
    }

    // Sem isso, uma página sozinha que travasse (a chamada ao Supabase nunca
    // resolve nem rejeita) não seria interrompida por nada — a checagem
    // acima só vale ENTRE páginas, não durante uma chamada já em andamento.
    // Foi exatamente isso que causou um 504 sem nenhum progresso salvo: a
    // própria chamada ficou pendurada, sem nunca devolver o controle pro
    // loop verificar o prazo de novo.
    const timeoutMs = prazoFinal ? Math.max(1, Math.min(TIMEOUT_PAGINA_MS, prazoFinal - agora - 1000)) : TIMEOUT_PAGINA_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let data, error;
    try {
      ({ data, error } = await supabase
        .from('documentos_fiscais')
        .select('*')
        .eq(coluna, cnpjCliente)
        .eq('tipo_documento', tipoDocumento)
        .gte('data_emissao_dia', dataInicio)
        .lte('data_emissao_dia', dataFim)
        .range(offset, offset + TAMANHO_PAGINA_SUPABASE - 1)
        .abortSignal(controller.signal));
    } catch (err) {
      if (err.name === 'AbortError') {
        const erro = new Error(`Tempo esgotado lendo página de documentos cacheados no Supabase (${timeoutMs / 1000}s).`);
        erro.transitorio = true;
        throw erro;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    if (error) throw new Error(`Falha ao ler documentos cacheados no Supabase: ${error.message}`);
    todos.push(...(data || []));
    if (!data || data.length < TAMANHO_PAGINA_SUPABASE) break;
    offset += TAMANHO_PAGINA_SUPABASE;
  }
  return todos.map(linhaParaDocumento);
}

/**
 * Grava os documentos de um combo recém-concluído no cache permanente e
 * marca como sincronizados os dias do período que já passaram da janela de
 * estabilidade. Chamar só quando o combo terminou de verdade (todas as
 * páginas), com a lista completa de documentos do combo (não só a última
 * página) — quem chama (painel.js) já mescla isso antes.
 */
export async function registrarSincronizacao(cnpjCliente, xmlType, direcao, dataInicio, dataFim, docs) {
  if (!cacheDocumentosDisponivel) return;

  const comChave = docs.filter((doc) => doc.chave);
  if (comChave.length) {
    const linhas = comChave.map((doc) => ({
      chave: doc.chave,
      tipo_documento: doc.tipoDocumento,
      numero: doc.numero,
      serie: doc.serie,
      data_emissao: doc.dataEmissao,
      data_emissao_dia: String(doc.dataEmissao || '').slice(0, 10),
      natureza_operacao: doc.naturezaOperacao,
      cancelada: doc.cancelada,
      emit_cnpj: doc.emitente.cnpj,
      emit_nome: doc.emitente.nome,
      dest_cnpj: doc.destinatario.cnpj || null,
      dest_nome: doc.destinatario.nome || null,
      valor_total: doc.valorTotal,
      valor_icms_total: doc.valorIcmsTotal,
      valor_produtos_total: doc.valorProdutosTotal,
      valor_pis_total: doc.valorPisTotal || 0,
      valor_cofins_total: doc.valorCofinsTotal || 0,
      versao_parser: doc.versaoParser ?? null,
      itens: doc.itens,
      atualizado_em: new Date().toISOString(),
    }));
    const { error } = await supabase.from('documentos_fiscais').upsert(linhas);
    if (error) throw new Error(`Falha ao gravar documentos no cache do Supabase: ${error.message}`);
  }

  // Marca todo dia do período (menos "hoje", que nunca deve ser
  // considerado cacheado) com o horário desta sincronização — dias já
  // estáveis ficam cacheados pra sempre (diaEstavel cobre isso sozinho,
  // independente da idade do registro); dias recentes ficam cacheados só
  // durante a janela provisória, e são resincronizados de novo depois disso
  // (pela sincronização noturna, ou pelo próprio uso do painel).
  const hoje = hojeStr();
  const dias = listarDias(dataInicio, dataFim).filter((dia) => dia !== hoje);
  if (dias.length) {
    const agora = new Date().toISOString();
    const linhasDias = dias.map((dia) => ({ cnpj_cliente: cnpjCliente, xml_type: xmlType, direcao, dia, sincronizado_em: agora }));
    const { error } = await supabase.from('sieg_sync_dias').upsert(linhasDias);
    if (error) throw new Error(`Falha ao gravar cobertura de sincronização no Supabase: ${error.message}`);
  }
}
