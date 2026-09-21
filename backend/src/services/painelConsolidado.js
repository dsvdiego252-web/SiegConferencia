import { createClient } from '@supabase/supabase-js';
import { listarClientes } from './clientsStore.js';
import { linhaParaDocumento, cacheDocumentosDisponivel } from './documentCache.js';
import { classificarOperacao } from './xmlParser.js';
import { analisarConformidadeReforma, resolverDataCorteReforma } from './reformaTributariaAnalyzer.js';

const supabase = cacheDocumentosDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

// Não é "os últimos 7 dias têm que estar 100% sincronizados" (like a
// primeira versão deste relatório tentava) — isso quase nunca acontece na
// prática (a sincronização noturna só garante ontem/anteontem; qualquer
// outro dia só está no cache se alguém já buscou aquele cliente naquele
// dia manualmente). Em vez de exigir cobertura completa da janela inteira
// antes de mostrar qualquer coisa, este relatório só mostra os dias que
// realmente já têm documento cacheado, o que for — um único dia buscado já
// aparece, sem esperar a janela toda ficar "completa".
const JANELA_DIAS = 30;

const TAMANHO_PAGINA = 1000;

function hojeStr() {
  return new Date().toISOString().slice(0, 10);
}

function diasAtras(quantidade) {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() - quantidade);
  return data.toISOString().slice(0, 10);
}

// Busca só o que já está cacheado (nunca dispara busca ao vivo na SIEG) —
// filtra por emit_cnpj OU dest_cnpj porque um documento do cliente pode
// estar de qualquer um dos dois lados (saída emitida por ele, entrada
// recebida por ele).
async function docsCacheadosDoCliente(cnpj, dataInicio, dataFim) {
  const todos = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('documentos_fiscais')
      .select('*')
      .or(`emit_cnpj.eq.${cnpj},dest_cnpj.eq.${cnpj}`)
      .gte('data_emissao_dia', dataInicio)
      .lte('data_emissao_dia', dataFim)
      .range(offset, offset + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`Falha ao ler documentos cacheados no painel consolidado: ${error.message}`);
    todos.push(...(data || []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    offset += TAMANHO_PAGINA;
  }
  const porChave = new Map(todos.map((linha) => [linha.chave, linha]));
  return [...porChave.values()].map(linhaParaDocumento);
}

/**
 * Cruza todos os clientes cadastrados de uma vez, mostrando — pra cada um
 * que já tem algum documento cacheado nos últimos 30 dias — quantos
 * documentos foram encontrados por dia, e quantos desses estão conformes,
 * parcialmente adequados ou sem nenhum campo da Reforma Tributária. Só lê
 * o cache permanente (nunca busca ao vivo na SIEG): 150+ clientes numa
 * chamada só não cabem no limite de 2 requisições/minuto da SIEG,
 * compartilhado por todo mundo.
 */
export async function gerarPainelConsolidado() {
  if (!cacheDocumentosDisponivel) {
    return { status: 'ignorado', motivo: 'Supabase não configurado — painel consolidado desligado.' };
  }

  const dataFim = hojeStr();
  const dataInicio = diasAtras(JANELA_DIAS);
  const clientes = await listarClientes();

  const linhasClientes = [];
  for (const cliente of clientes) {
    const docs = await docsCacheadosDoCliente(cliente.cnpj, dataInicio, dataFim);
    if (!docs.length) {
      linhasClientes.push({ cnpj: cliente.cnpj, nome: cliente.nome, temDados: false, dias: [] });
      continue;
    }

    const porDia = new Map();
    for (const doc of docs) {
      const dia = String(doc.dataEmissao || '').slice(0, 10);
      if (!dia) continue;
      if (!porDia.has(dia)) porDia.set(dia, { dia, totalDocumentos: 0, conformes: 0, parciais: 0, semAdequacao: 0 });
      porDia.get(dia).totalDocumentos += 1;
    }

    const classificados = docs.map((doc) => ({ doc, operacao: classificarOperacao(doc, cliente.cnpj) }));
    const dataCorteReforma = resolverDataCorteReforma(cliente.regimeTributario);
    const reforma = analisarConformidadeReforma(classificados, dataCorteReforma);
    for (const d of reforma.porDocumento) {
      const dia = String(d.dataEmissao || '').slice(0, 10);
      const linha = porDia.get(dia);
      if (!linha) continue;
      if (d.situacao === 'conforme') linha.conformes += 1;
      else if (d.situacao === 'parcial') linha.parciais += 1;
      else linha.semAdequacao += 1;
    }

    const dias = [...porDia.values()].sort((a, b) => b.dia.localeCompare(a.dia));
    const temPendencia = dias.some((d) => d.semAdequacao > 0 || d.parciais > 0);
    linhasClientes.push({
      cnpj: cliente.cnpj,
      nome: cliente.nome,
      temDados: true,
      totalDocumentos: docs.length,
      dataCorteReforma,
      temPendencia,
      dias,
    });
  }

  linhasClientes.sort((a, b) => Number(b.temPendencia === true) - Number(a.temPendencia === true) || Number(b.temDados) - Number(a.temDados));

  return {
    status: 'concluido',
    periodo: { dataInicio, dataFim },
    executadoEm: new Date().toISOString(),
    totalClientes: clientes.length,
    clientesComDados: linhasClientes.filter((l) => l.temDados).length,
    clientesComPendencia: linhasClientes.filter((l) => l.temPendencia).length,
    clientes: linhasClientes,
  };
}
