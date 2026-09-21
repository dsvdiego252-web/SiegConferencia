import { createClient } from '@supabase/supabase-js';
import { listarClientes } from './clientsStore.js';
import { linhaParaDocumento, cacheDocumentosDisponivel } from './documentCache.js';
import { resolverDataCorteReforma } from './reformaTributariaAnalyzer.js';
import { classificarOperacao } from './xmlParser.js';
import { validarDocumento } from '../tax-engine/math-validation/mathValidator.js';
import { validarReformaDocumento } from '../tax-engine/rtc-xml-validator/validarReformaXml.js';
import { conferirIcmsDocumento } from '../tax-engine/icms-engine/conferirIcms.js';

const supabase = cacheDocumentosDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

const TAMANHO_PAGINA = 1000;

// Quantos exemplos de documento com divergência guardar por cliente — o
// suficiente pra apontar por onde começar a investigar, sem devolver a
// lista inteira de documentos divergentes (que pode ser grande) na resposta.
const LIMITE_EXEMPLOS_POR_CLIENTE = 8;

// Todo o histórico já cacheado desse cliente (sem recorte de período) —
// diferente do painel consolidado (que olha só os últimos 30 dias pra "quem
// tem pendência hoje"), esta auditoria é sobre a qualidade do próprio motor
// tributário nos dados que já temos, então quanto mais cache examinado,
// melhor. Nunca busca ao vivo na SIEG.
async function todosDocumentosCacheadosDoCliente(cnpj) {
  const todos = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('documentos_fiscais')
      .select('*')
      .or(`emit_cnpj.eq.${cnpj},dest_cnpj.eq.${cnpj}`)
      .range(offset, offset + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`Falha ao ler documentos cacheados na auditoria do motor tributário: ${error.message}`);
    todos.push(...(data || []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    offset += TAMANHO_PAGINA;
  }
  const porChave = new Map(todos.map((linha) => [linha.chave, linha]));
  return [...porChave.values()].map(linhaParaDocumento);
}

function primeiraDivergencia(resultadoReforma) {
  for (const item of resultadoReforma.itens) {
    if (item.validacao?.divergencias?.length) return item.validacao.divergencias[0];
  }
  return resultadoReforma.divergenciasTotais[0] || null;
}

function primeiraDivergenciaIcms(resultadoIcms) {
  for (const item of resultadoIcms.itens) {
    if (item.conferencia.divergencias.length) return item.conferencia.divergencias[0];
  }
  return null;
}

/**
 * Roda o motor tributário (Validação Matemática + XML_REFORMA_VALIDATOR +
 * conferência de ICMS/CFOP/CST) sobre todo o cache permanente de
 * documentos, cliente a cliente, e agrega quantos documentos vieram
 * corretos, com divergência de cálculo, de Reforma Tributária ou de
 * ICMS/CFOP/CST — mesma lógica já usada em cada documento individual
 * (painelBuilder.js), só que somada pra dar uma visão de conferência do
 * motor em cima dos dados fiscais reais já coletados, sem precisar abrir
 * cliente por cliente. A conferência de ICMS/CFOP/CST fica em "semBase" até
 * a base de regras ser cadastrada (ver tax-engine/icms-engine/README.md) —
 * não é um bug, é o motor recusando confirmar sem dado.
 */
export async function auditarMotorTributario() {
  if (!cacheDocumentosDisponivel) {
    return { status: 'ignorado', motivo: 'Supabase não configurado — auditoria do motor tributário desligada.' };
  }

  const clientes = await listarClientes();
  const linhasClientes = [];

  const totais = {
    documentosAnalisados: 0,
    matematica: { correto: 0, divergenciaArredondamento: 0, divergenciaCalculo: 0 },
    reforma: { correto: 0, divergente: 0, totalDivergente: 0, revisaoManual: 0, semDados: 0 },
    icms: { correto: 0, divergente: 0, revisaoManual: 0, semBase: 0 },
  };

  for (const cliente of clientes) {
    const docs = await todosDocumentosCacheadosDoCliente(cliente.cnpj);
    const docsAtivos = docs.filter((doc) => !doc.cancelada && doc.itens.length);
    if (!docsAtivos.length) {
      linhasClientes.push({ cnpj: cliente.cnpj, nome: cliente.nome, temDados: false, totalDocumentos: 0 });
      continue;
    }

    const dataCorteReforma = resolverDataCorteReforma(cliente.regimeTributario);
    const matematica = { correto: 0, divergenciaArredondamento: 0, divergenciaCalculo: 0 };
    const reforma = { correto: 0, divergente: 0, totalDivergente: 0, revisaoManual: 0, semDados: 0 };
    const icms = { correto: 0, divergente: 0, revisaoManual: 0, semBase: 0 };
    const exemplos = [];

    for (const doc of docsAtivos) {
      const mat = validarDocumento(doc);
      if (mat.status === 'CORRETO') matematica.correto += 1;
      else if (mat.status === 'DIVERGENCIA_ARREDONDAMENTO') matematica.divergenciaArredondamento += 1;
      else matematica.divergenciaCalculo += 1;

      const rtc = validarReformaDocumento(doc, dataCorteReforma);
      if (rtc.status === null) reforma.semDados += 1;
      else if (rtc.status === 'CORRETO') reforma.correto += 1;
      else if (rtc.status === 'DIVERGENTE') reforma.divergente += 1;
      else if (rtc.status === 'TOTAL_REFORMA_DIVERGENTE') reforma.totalDivergente += 1;
      else reforma.revisaoManual += 1;

      const operacao = classificarOperacao(doc, cliente.cnpj);
      const icmsDoc = conferirIcmsDocumento(doc, operacao, cliente.regimeTributario);
      if (icmsDoc.status === 'SEM_BASE_CARREGADA') icms.semBase += 1;
      else if (icmsDoc.status === 'CORRETO') icms.correto += 1;
      else if (icmsDoc.status === 'DIVERGENTE') icms.divergente += 1;
      else icms.revisaoManual += 1;

      if (exemplos.length < LIMITE_EXEMPLOS_POR_CLIENTE) {
        if (mat.status === 'DIVERGENCIA_CALCULO') {
          const totalDivergente = Object.entries(mat.totais).find(([, t]) => t.status === 'DIVERGENCIA_CALCULO');
          exemplos.push({
            chave: doc.chave,
            tipoDocumento: doc.tipoDocumento,
            numero: doc.numero,
            dataEmissao: doc.dataEmissao,
            motor: 'matematica',
            motivo: totalDivergente
              ? `Total de ${totalDivergente[0]} (${totalDivergente[1].totalDocumento}) diverge da soma dos itens (${totalDivergente[1].somaItens}).`
              : 'Divergência de cálculo num item.',
          });
        } else if (rtc.status === 'DIVERGENTE' || rtc.status === 'TOTAL_REFORMA_DIVERGENTE') {
          exemplos.push({
            chave: doc.chave,
            tipoDocumento: doc.tipoDocumento,
            numero: doc.numero,
            dataEmissao: doc.dataEmissao,
            motor: 'reforma',
            motivo: primeiraDivergencia(rtc) || 'Divergência na conferência de IBS/CBS.',
          });
        } else if (icmsDoc.status === 'DIVERGENTE') {
          exemplos.push({
            chave: doc.chave,
            tipoDocumento: doc.tipoDocumento,
            numero: doc.numero,
            dataEmissao: doc.dataEmissao,
            motor: 'icms',
            motivo: primeiraDivergenciaIcms(icmsDoc) || 'Divergência na conferência de ICMS/CFOP/CST.',
          });
        }
      }
    }

    totais.documentosAnalisados += docsAtivos.length;
    totais.matematica.correto += matematica.correto;
    totais.matematica.divergenciaArredondamento += matematica.divergenciaArredondamento;
    totais.matematica.divergenciaCalculo += matematica.divergenciaCalculo;
    totais.reforma.correto += reforma.correto;
    totais.reforma.divergente += reforma.divergente;
    totais.reforma.totalDivergente += reforma.totalDivergente;
    totais.reforma.revisaoManual += reforma.revisaoManual;
    totais.reforma.semDados += reforma.semDados;
    totais.icms.correto += icms.correto;
    totais.icms.divergente += icms.divergente;
    totais.icms.revisaoManual += icms.revisaoManual;
    totais.icms.semBase += icms.semBase;

    const temDivergencia = matematica.divergenciaCalculo > 0 || reforma.divergente > 0 || reforma.totalDivergente > 0 || icms.divergente > 0;
    linhasClientes.push({
      cnpj: cliente.cnpj,
      nome: cliente.nome,
      temDados: true,
      totalDocumentos: docsAtivos.length,
      matematica,
      reforma,
      icms,
      temDivergencia,
      exemplos,
    });
  }

  linhasClientes.sort((a, b) => Number(b.temDivergencia === true) - Number(a.temDivergencia === true) || Number(b.temDados) - Number(a.temDados));

  return {
    status: 'concluido',
    executadoEm: new Date().toISOString(),
    totalClientes: clientes.length,
    clientesComDados: linhasClientes.filter((l) => l.temDados).length,
    clientesComDivergencia: linhasClientes.filter((l) => l.temDivergencia).length,
    totais,
    clientes: linhasClientes,
  };
}
