import { createClient } from '@supabase/supabase-js';
import { listarClientes, obterCliente } from './clientsStore.js';
import { linhaParaDocumento, cacheDocumentosDisponivel } from './documentCache.js';
import { classificarOperacao } from './xmlParser.js';
import { analisarConformidadeReforma, resolverDataCorteReforma } from './reformaTributariaAnalyzer.js';
import { montarPainelDeClassificados } from './painelBuilder.js';

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

function direcaoVazia() {
  return { totalDocumentos: 0, temPendencia: false, dias: [] };
}

// Fecha o Map por dia numa lista ordenada (mais recente primeiro) e resume
// o total de documentos e se há pendência — usado uma vez pra saída e outra
// pra entrada, já que os dois lados são calculados em paralelo a partir do
// mesmo conjunto de documentos do cliente.
function finalizarDirecao(porDiaMap) {
  const dias = [...porDiaMap.values()].sort((a, b) => b.dia.localeCompare(a.dia));
  return {
    totalDocumentos: dias.reduce((soma, d) => soma + d.totalDocumentos, 0),
    temPendencia: dias.some((d) => d.semAdequacao > 0 || d.parciais > 0),
    dias,
  };
}

/**
 * Cruza todos os clientes cadastrados de uma vez, mostrando — pra cada um
 * que já tem algum documento cacheado nos últimos 30 dias — quantos
 * documentos foram encontrados por dia, e quantos desses estão conformes,
 * parcialmente adequados ou sem nenhum campo da Reforma Tributária. Separa
 * saída (o que o cliente emitiu) de entrada (o que ele recebeu) porque são
 * conferências com finalidade diferente: saída é sobre o próprio emissor do
 * cliente estar adequado; entrada é sobre os fornecedores dele. Só lê o
 * cache permanente (nunca busca ao vivo na SIEG): 150+ clientes numa
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
      linhasClientes.push({ cnpj: cliente.cnpj, nome: cliente.nome, temDados: false, saida: direcaoVazia(), entrada: direcaoVazia() });
      continue;
    }

    const classificados = docs.map((doc) => ({ doc, operacao: classificarOperacao(doc, cliente.cnpj) }));
    const porDiaSaida = new Map();
    const porDiaEntrada = new Map();
    for (const { doc, operacao } of classificados) {
      if (operacao !== 'saida' && operacao !== 'entrada') continue;
      const dia = String(doc.dataEmissao || '').slice(0, 10);
      if (!dia) continue;
      const mapa = operacao === 'saida' ? porDiaSaida : porDiaEntrada;
      if (!mapa.has(dia)) mapa.set(dia, { dia, totalDocumentos: 0, conformes: 0, parciais: 0, semAdequacao: 0 });
      mapa.get(dia).totalDocumentos += 1;
    }

    const dataCorteReforma = resolverDataCorteReforma(cliente.regimeTributario);
    const reforma = analisarConformidadeReforma(classificados, dataCorteReforma);
    for (const d of reforma.porDocumento) {
      const dia = String(d.dataEmissao || '').slice(0, 10);
      const mapa = d.operacao === 'saida' ? porDiaSaida : porDiaEntrada;
      const linha = mapa.get(dia);
      if (!linha) continue;
      if (d.situacao === 'conforme') linha.conformes += 1;
      else if (d.situacao === 'parcial') linha.parciais += 1;
      else linha.semAdequacao += 1;
    }

    const saida = finalizarDirecao(porDiaSaida);
    const entrada = finalizarDirecao(porDiaEntrada);
    linhasClientes.push({
      cnpj: cliente.cnpj,
      nome: cliente.nome,
      temDados: true,
      dataCorteReforma,
      saida,
      entrada,
    });
  }

  const temPendenciaCombinada = (l) => l.temDados && (l.saida.temPendencia || l.entrada.temPendencia);
  linhasClientes.sort((a, b) => Number(temPendenciaCombinada(b)) - Number(temPendenciaCombinada(a)) || Number(b.temDados) - Number(a.temDados));

  return {
    status: 'concluido',
    periodo: { dataInicio, dataFim },
    executadoEm: new Date().toISOString(),
    totalClientes: clientes.length,
    clientesComDados: linhasClientes.filter((l) => l.temDados).length,
    clientesComPendencia: linhasClientes.filter(temPendenciaCombinada).length,
    clientes: linhasClientes,
  };
}

/**
 * Monta o mesmo formato de resposta de /api/painel (xmls, sequence, tax,
 * reforma, valores) pra um cliente/dia específico, mas só a partir do
 * cache permanente — nunca busca ao vivo na SIEG. Usada quando alguém
 * clica num dia do painel consolidado pra ver os documentos de verdade,
 * sem gastar cota da SIEG numa busca que os dados já cacheados respondem.
 */
export async function buscarDocumentosConsolidado(cnpj, dia) {
  if (!cacheDocumentosDisponivel) {
    return { status: 'ignorado', motivo: 'Supabase não configurado — painel consolidado desligado.' };
  }

  const docs = await docsCacheadosDoCliente(cnpj, dia, dia);
  const cliente = await obterCliente(cnpj);
  const dataCorteReforma = resolverDataCorteReforma(cliente?.regimeTributario);
  const classificados = docs.map((doc) => ({ doc, operacao: classificarOperacao(doc, cnpj) }));

  return {
    status: 'concluido',
    periodo: { dataInicio: dia, dataFim: dia },
    cliente,
    ...montarPainelDeClassificados(classificados, dataCorteReforma, cliente?.regimeTributario, cliente?.atividade, cliente?.regimesEspeciais),
  };
}
