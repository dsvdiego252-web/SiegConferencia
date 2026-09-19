import { listarClientes } from './clientsStore.js';
import { periodoTotalmenteCacheado, buscarDocumentosCacheados, cacheDocumentosDisponivel } from './documentCache.js';
import { XmlType } from './siegClient.js';
import { classificarOperacao } from './xmlParser.js';
import { detectarQuebrasDeSequencia } from './sequenceAnalyzer.js';
import { analisarConformidadeReforma, resolverDataCorteReforma } from './reformaTributariaAnalyzer.js';
import { validarDocumento } from '../tax-engine/math-validation/mathValidator.js';

// Últimos 7 dias já sincronizados (nightly sync mantém "ontem"/"anteontem"
// sempre em dia — dias mais velhos ficam permanentemente cacheados por
// qualquer uso anterior do painel). Uma janela maior que 1 dia é necessária
// pra detecção de quebra de sequência fazer sentido: comparar só o dia de
// ontem contra ele mesmo nunca detecta uma quebra que atravessa dias.
const JANELA_DIAS = 7;

const TIPO_DOCUMENTO_POR_XMLTYPE = { [XmlType.NFE]: 'NFe', [XmlType.NFCE]: 'NFCe' };

const COMBOS = [
  { xmlType: XmlType.NFE, direcao: 'emit' },
  { xmlType: XmlType.NFE, direcao: 'dest' },
  { xmlType: XmlType.NFCE, direcao: 'emit' },
  { xmlType: XmlType.NFCE, direcao: 'dest' },
];

function listarDiasJanela() {
  const dias = [];
  for (let offset = 1; offset <= JANELA_DIAS; offset += 1) {
    const data = new Date();
    data.setUTCDate(data.getUTCDate() - offset);
    dias.push(data.toISOString().slice(0, 10));
  }
  return dias;
}

// Roda uma etapa protegida contra exceção — um bug num módulo não pode
// derrubar o relatório inteiro de todos os clientes por causa de um só.
function comProtecao(rotulo, cnpj, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`Painel consolidado: falha em "${rotulo}" para ${cnpj}:`, err.message);
    return null;
  }
}

// Só lê o que já está no cache permanente — nunca dispara busca ao vivo na
// SIEG. Um relatório que cruza 150+ clientes numa chamada só não pode
// competir pelo limite de 2 requisições/minuto da SIEG (compartilhado por
// todo mundo); combos ainda não sincronizados nesse período ficam de fora,
// marcados como cobertura parcial/nenhuma em vez de travar a resposta.
async function docsCacheadosDoCliente(cnpj, dataInicio, dataFim) {
  const docs = [];
  let combosComCache = 0;
  for (const combo of COMBOS) {
    const cacheado = await periodoTotalmenteCacheado(cnpj, combo.xmlType, combo.direcao, dataInicio, dataFim);
    if (!cacheado) continue;
    combosComCache += 1;
    // buscarDocumentosCacheados não filtra por tipo (só por CNPJ/direção/
    // período) — sem esse filtro aqui, um combo marcado como "cacheado"
    // (ex.: NFCe/emit) traria de carona qualquer NFe já cacheada pro mesmo
    // CNPJ/direção/período, mesmo que o combo NFe/emit não tenha sido
    // confirmado como totalmente sincronizado nessa janela.
    const tipoEsperado = TIPO_DOCUMENTO_POR_XMLTYPE[combo.xmlType];
    const docsCombo = await buscarDocumentosCacheados(cnpj, combo.direcao, dataInicio, dataFim);
    docs.push(...docsCombo.filter((d) => d.tipoDocumento === tipoEsperado));
  }
  const porChave = new Map(docs.map((d) => [d.chave || `${d.emitente.cnpj}-${d.serie}-${d.numero}`, d]));
  const cobertura = combosComCache === COMBOS.length ? 'completa' : combosComCache > 0 ? 'parcial' : 'nenhuma';
  return { docs: [...porChave.values()], cobertura };
}

/**
 * Cruza todos os clientes cadastrados de uma vez, procurando quem tem
 * pendência (quebra de sequência, documento inconsistente com a Reforma
 * Tributária, ou divergência de cálculo) nos últimos 7 dias já
 * sincronizados — pra não precisar abrir cliente por cliente pra descobrir
 * quem precisa de atenção.
 */
export async function gerarPainelConsolidado() {
  if (!cacheDocumentosDisponivel) {
    return { status: 'ignorado', motivo: 'Supabase não configurado — painel consolidado desligado.' };
  }

  const dias = listarDiasJanela();
  const dataInicio = dias[dias.length - 1];
  const dataFim = dias[0];
  const clientes = await listarClientes();

  const linhas = [];
  for (const cliente of clientes) {
    const { docs, cobertura } = await docsCacheadosDoCliente(cliente.cnpj, dataInicio, dataFim);
    if (cobertura === 'nenhuma') {
      linhas.push({ cnpj: cliente.cnpj, nome: cliente.nome, cobertura, temPendencia: null });
      continue;
    }

    const classificados = docs.map((doc) => ({ doc, operacao: classificarOperacao(doc, cliente.cnpj) }));
    const docsSaida = classificados.filter((c) => c.operacao === 'saida').map((c) => c.doc);
    const quebras = (comProtecao('sequencia', cliente.cnpj, () => detectarQuebrasDeSequencia(docsSaida)) || []).filter((g) => g.temQuebra);

    const dataCorteReforma = resolverDataCorteReforma(cliente.regimeTributario);
    const reforma = comProtecao('reforma', cliente.cnpj, () => analisarConformidadeReforma(classificados, dataCorteReforma));
    const inconsistentes = reforma ? reforma.porDocumento.filter((d) => d.situacao === 'parcial' || d.situacao === 'sem_adequacao').length : 0;

    let divergenciasCalculo = 0;
    for (const doc of docs) {
      if (doc.cancelada) continue;
      const validacao = comProtecao('validacaoMatematica', cliente.cnpj, () => validarDocumento(doc));
      if (validacao && validacao.status !== 'CORRETO') divergenciasCalculo += 1;
    }

    const temPendencia = quebras.length > 0 || inconsistentes > 0 || divergenciasCalculo > 0;
    linhas.push({
      cnpj: cliente.cnpj,
      nome: cliente.nome,
      cobertura,
      totalDocumentos: docs.length,
      quebrasDeSequencia: quebras.length,
      documentosInconsistentes: inconsistentes,
      divergenciasCalculo,
      temPendencia,
    });
  }

  // Quem tem pendência primeiro, depois quem não tem cobertura nenhuma
  // ainda (precisa ser buscado pelo menos uma vez), por último quem já foi
  // conferido e está limpo.
  linhas.sort((a, b) => Number(b.temPendencia === true) - Number(a.temPendencia === true) || Number(a.temPendencia === null) - Number(b.temPendencia === null));

  return {
    status: 'concluido',
    periodo: { dataInicio, dataFim },
    executadoEm: new Date().toISOString(),
    totalClientes: clientes.length,
    clientesComPendencia: linhas.filter((l) => l.temPendencia === true).length,
    clientesSemCobertura: linhas.filter((l) => l.cobertura === 'nenhuma').length,
    clientes: linhas,
  };
}
