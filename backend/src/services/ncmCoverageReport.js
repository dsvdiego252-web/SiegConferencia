import { createClient } from '@supabase/supabase-js';
import { classificarMercadoria } from '../tax-engine/goods-engine/classificarMercadoria.js';

const relatorioDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = relatorioDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

// Mesmos "origem" de baixa confiança usados no frontend (app.js,
// tagConfiancaClassificacao) — aqui servem pra decidir quais NCMs entram no
// relatório: os que caem num desses caminhos são, por definição, NCMs sem
// regra específica mapeada na base RTC (Motor Modular v4.34).
const ORIGENS_BAIXA_CONFIANCA = new Set(['regra_residual', 'regra_generica_sem_evidencia_suficiente', 'conflito_multiplos_candidatos']);

const TAMANHO_PAGINA = 1000;

async function itensDeTodosDocumentos() {
  const todosItens = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('documentos_fiscais')
      .select('itens')
      .not('itens', 'is', null)
      .range(offset, offset + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`Falha ao ler itens para relatório de NCM: ${error.message}`);
    for (const linha of data || []) todosItens.push(...(linha.itens || []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    offset += TAMANHO_PAGINA;
  }
  return todosItens;
}

/**
 * Agrega, a partir dos itens já cacheados de clientes reais (não da base de
 * regras em si), quais NCMs mais aparecem caindo em classificação de baixa
 * confiança (sem regra específica mapeada) — prioriza onde expandir a base
 * de regras RTC pelo volume real de uso, em vez de tentar cobrir a tabela
 * NCM inteira de uma vez.
 */
export async function relatorioNcmSemRegra({ limite = 30 } = {}) {
  if (!relatorioDisponivel) {
    return { status: 'ignorado', motivo: 'Supabase não configurado — relatório desligado.' };
  }

  const itens = await itensDeTodosDocumentos();
  const porNcm = new Map();
  for (const item of itens) {
    const ncm = String(item?.ncm || '');
    if (!ncm) continue;
    const info = porNcm.get(ncm) || { ocorrencias: 0, descricaoExemplo: item.descricao || '' };
    info.ocorrencias += 1;
    porNcm.set(ncm, info);
  }

  const semRegra = [];
  for (const [ncm, info] of porNcm) {
    const classificacao = classificarMercadoria({ ncm, descricao: info.descricaoExemplo });
    if (!classificacao.origem || ORIGENS_BAIXA_CONFIANCA.has(classificacao.origem)) {
      semRegra.push({
        ncm,
        ocorrencias: info.ocorrencias,
        descricaoExemplo: info.descricaoExemplo,
        origem: classificacao.origem,
        status: classificacao.status,
      });
    }
  }
  semRegra.sort((a, b) => b.ocorrencias - a.ocorrencias);

  return {
    status: 'concluido',
    executadoEm: new Date().toISOString(),
    totalNcmsDistintos: porNcm.size,
    totalNcmsSemRegra: semRegra.length,
    top: semRegra.slice(0, limite),
  };
}
