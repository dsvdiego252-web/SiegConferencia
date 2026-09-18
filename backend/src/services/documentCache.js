import { createClient } from '@supabase/supabase-js';

// Cache permanente de documentos por chave de acesso — ao contrário do
// painel_cache (resultado de uma busca específica, expira em 10min), este
// guarda o documento em si pra sempre, deduplicado por chave. Sem Supabase
// configurado (dev local), fica desligado e todo combo é buscado ao vivo,
// como sempre foi.
export const cacheDocumentosDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = cacheDocumentosDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

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

function linhaParaDocumento(linha) {
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
    itens: linha.itens || [],
  };
}

/** Documentos já cacheados relevantes pro combo (cliente como emitente ou destinatário, conforme a direção). */
export async function buscarDocumentosCacheados(cnpjCliente, direcao, dataInicio, dataFim) {
  const coluna = direcao === 'emit' ? 'emit_cnpj' : 'dest_cnpj';
  const { data, error } = await supabase
    .from('documentos_fiscais')
    .select('*')
    .eq(coluna, cnpjCliente)
    .gte('data_emissao_dia', dataInicio)
    .lte('data_emissao_dia', dataFim);
  if (error) throw new Error(`Falha ao ler documentos cacheados no Supabase: ${error.message}`);
  return (data || []).map(linhaParaDocumento);
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
