import { createClient } from '@supabase/supabase-js';

// Cache permanente de documentos por chave de acesso — ao contrário do
// painel_cache (resultado de uma busca específica, expira em 10min), este
// guarda o documento em si pra sempre, deduplicado por chave. Sem Supabase
// configurado (dev local), fica desligado e todo combo é buscado ao vivo,
// como sempre foi.
export const cacheDocumentosDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = cacheDocumentosDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

// Só passamos a confiar (e nunca mais rebuscar) num dia depois que a janela
// de cancelamento/eventos da SEFAZ já certamente fechou — um documento
// emitido há poucos dias ainda pode ser cancelado depois, e um cache
// permanente marcado cedo demais serviria pra sempre uma situação
// desatualizada. Dias mais recentes que isso são sempre buscados de novo na
// SIEG, exatamente como antes desta mudança.
const DIAS_ESTABILIDADE = 32;

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

function diaEstavel(dia) {
  const limiar = new Date();
  limiar.setUTCDate(limiar.getUTCDate() - DIAS_ESTABILIDADE);
  return dia < limiar.toISOString().slice(0, 10);
}

/**
 * true se TODO o período pedido já está sincronizado (cache confiável) pra
 * este cliente+combo — nesse caso nem vale a pena chamar a SIEG, os
 * documentos já buscados antes servem. Um período com algum dia "recente
 * demais" nunca é considerado totalmente cacheado (ver DIAS_ESTABILIDADE).
 */
export async function periodoTotalmenteCacheado(cnpjCliente, xmlType, direcao, dataInicio, dataFim) {
  if (!cacheDocumentosDisponivel) return false;
  const dias = listarDias(dataInicio, dataFim);
  if (dias.some((dia) => !diaEstavel(dia))) return false;

  const { data, error } = await supabase
    .from('sieg_sync_dias')
    .select('dia')
    .eq('cnpj_cliente', cnpjCliente)
    .eq('xml_type', xmlType)
    .eq('direcao', direcao)
    .gte('dia', dataInicio)
    .lte('dia', dataFim);
  if (error) throw new Error(`Falha ao ler cobertura de sincronização no Supabase: ${error.message}`);
  return (data?.length || 0) >= dias.length;
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

  const diasEstaveis = listarDias(dataInicio, dataFim).filter(diaEstavel);
  if (diasEstaveis.length) {
    const linhasDias = diasEstaveis.map((dia) => ({ cnpj_cliente: cnpjCliente, xml_type: xmlType, direcao, dia }));
    const { error } = await supabase.from('sieg_sync_dias').upsert(linhasDias);
    if (error) throw new Error(`Falha ao gravar cobertura de sincronização no Supabase: ${error.message}`);
  }
}
