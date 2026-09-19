import { createClient } from '@supabase/supabase-js';

// Canário contra a classe de bug que já pegou NCM (commit 82cd50c) e CNPJ
// (commit a605a66): o fast-xml-parser converte o conteúdo de uma tag pra
// número quando parece numérico, perdendo o zero à esquerda — CNPJ sempre
// tem 14 dígitos e NCM sempre tem 8. Qualquer linha com tamanho diferente
// desses é, por definição, um valor corrompido (nunca um CNPJ/NCM válido
// mais curto por natureza), então dá pra detectar sem falso positivo.
const auditoriaDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = auditoriaDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

// O Supabase (PostgREST) limita cada resposta a 1000 linhas por padrão —
// mesmo bug que já cortou documentos cacheados silenciosamente em outro
// lugar (documentCache.js). Uma auditoria que existe pra pegar corrupção de
// dado não pode ela mesma enxergar só uma fatia da tabela.
const TAMANHO_PAGINA = 1000;

async function selecionarTudo(colunas) {
  const todos = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('documentos_fiscais')
      .select(colunas)
      .range(offset, offset + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`Falha ao ler documentos_fiscais para auditoria: ${error.message}`);
    todos.push(...(data || []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    offset += TAMANHO_PAGINA;
  }
  return todos;
}

function auditarColuna(linhas, coluna, tamanhoEsperado) {
  const corrompidos = linhas.filter((linha) => {
    const valor = String(linha[coluna] || '');
    return valor.length > 0 && valor.length !== tamanhoEsperado;
  });
  return {
    coluna,
    tamanhoEsperado,
    totalCorrompidos: corrompidos.length,
    exemplos: corrompidos.slice(0, 5).map((l) => ({ chave: l.chave, valor: l[coluna] })),
  };
}

/**
 * Varre documentos_fiscais atrás de CNPJ (emit/dest) e NCM gravados com
 * tamanho errado. Não corrige nada sozinha (o backfill é uma decisão
 * deliberada, feita manualmente — ver histórico do commit a605a66) — só
 * reporta, pra pegar a próxima ocorrência desse bug antes que vire "painel
 * zerado" de novo pra algum cliente.
 */
export async function auditarDocumentosFiscais() {
  if (!auditoriaDisponivel) {
    return { status: 'ignorado', motivo: 'Supabase não configurado — auditoria desligada.' };
  }

  const linhas = await selecionarTudo('chave, emit_cnpj, dest_cnpj, itens');

  const ncmsCorrompidos = [];
  for (const linha of linhas) {
    for (const item of linha.itens || []) {
      const ncm = String(item?.ncm || '');
      if (ncm && ncm.length !== 8) ncmsCorrompidos.push({ chave: linha.chave, valor: ncm });
    }
  }

  const achados = [
    auditarColuna(linhas, 'emit_cnpj', 14),
    auditarColuna(linhas, 'dest_cnpj', 14),
    {
      coluna: 'itens[].ncm',
      tamanhoEsperado: 8,
      totalCorrompidos: ncmsCorrompidos.length,
      exemplos: ncmsCorrompidos.slice(0, 5),
    },
  ];

  return {
    status: 'concluido',
    executadoEm: new Date().toISOString(),
    totalDocumentosVerificados: linhas.length,
    limpo: achados.every((a) => a.totalCorrompidos === 0),
    achados,
  };
}
