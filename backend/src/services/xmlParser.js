import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true,
});

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// O grupo ICMS/PIS/COFINS tem dezenas de variantes de acordo com o CST/CSOSN
// (ICMS00, ICMS10, ICMS60, ICMSSN101, PISAliq, PISNT, PISOutr, ...). O valor
// do imposto sempre fica dentro da primeira (e única) chave filha do grupo.
function firstChildValues(group) {
  if (!group || typeof group !== 'object') return {};
  const key = Object.keys(group)[0];
  return key ? group[key] || {} : {};
}

/**
 * Recebe uma string XML de NFe (padrão nfeProc ou NFe "solto") e retorna um
 * documento fiscal normalizado, ou null se o XML não for uma NFe reconhecível
 * (ex.: CTe/NFSe, que têm outro layout e podem ser tratados separadamente).
 */
export function parseNfeXml(xmlString) {
  let parsed;
  try {
    parsed = parser.parse(xmlString);
  } catch {
    return null;
  }

  const nfe = parsed?.nfeProc?.NFe ?? parsed?.NFe;
  const infNFe = nfe?.infNFe;
  if (!infNFe) return null;

  const ide = infNFe.ide ?? {};
  const emit = infNFe.emit ?? {};
  const dest = infNFe.dest ?? {};
  const total = infNFe.total?.ICMSTot ?? {};
  const chave = (infNFe['@_Id'] || '').replace(/^NFe/, '');
  const cStat = parsed?.nfeProc?.protNFe?.infProt?.cStat;

  const itens = toArray(infNFe.det).map((det) => {
    const prod = det.prod ?? {};
    const imposto = det.imposto ?? {};
    const icms = firstChildValues(imposto.ICMS);
    const pis = firstChildValues(imposto.PIS);
    const cofins = firstChildValues(imposto.COFINS);

    return {
      numeroItem: Number(det['@_nItem']) || undefined,
      codigo: String(prod.cProd ?? ''),
      descricao: String(prod.xProd ?? ''),
      ncm: String(prod.NCM ?? ''),
      cfop: String(prod.CFOP ?? ''),
      quantidade: toNumber(prod.qCom),
      valorUnitario: toNumber(prod.vUnCom),
      valorProduto: toNumber(prod.vProd),
      icms: { cst: icms.CST ?? icms.CSOSN ?? null, aliquota: toNumber(icms.pICMS), valor: toNumber(icms.vICMS) },
      pis: { cst: pis.CST ?? null, aliquota: toNumber(pis.pPIS), valor: toNumber(pis.vPIS) },
      cofins: { cst: cofins.CST ?? null, aliquota: toNumber(cofins.pCOFINS), valor: toNumber(cofins.vCOFINS) },
    };
  });

  return {
    tipoDocumento: 'NFe',
    chave,
    numero: toNumber(ide.nNF),
    serie: toNumber(ide.serie),
    dataEmissao: ide.dhEmi ?? ide.dEmi ?? null,
    naturezaOperacao: ide.natOp ?? '',
    tpNF: ide.tpNF !== undefined ? Number(ide.tpNF) : null, // 0=entrada, 1=saída (segundo o próprio emitente)
    cancelada: String(cStat) === '101' || String(cStat) === '151',
    emitente: { cnpj: String(emit.CNPJ ?? ''), nome: emit.xNome ?? '' },
    destinatario: { cnpj: String(dest.CNPJ ?? ''), nome: dest.xNome ?? '' },
    valorTotal: toNumber(total.vNF),
    valorIcmsTotal: toNumber(total.vICMS),
    valorProdutosTotal: toNumber(total.vProd),
    itens,
  };
}

/**
 * Classifica o documento como entrada ou saída do ponto de vista do
 * cliente do escritório (não do CFOP), comparando o CNPJ do cliente com
 * emitente/destinatário. É a forma mais robusta de decidir a direção
 * quando quem está olhando é o escritório de contabilidade, com vários
 * clientes diferentes.
 */
export function classificarOperacao(doc, clienteCnpj) {
  const cnpjLimpo = String(clienteCnpj || '').replace(/\D/g, '');
  if (doc.emitente.cnpj === cnpjLimpo) return 'saida';
  if (doc.destinatario.cnpj === cnpjLimpo) return 'entrada';
  return 'desconhecida';
}

export function parseNfeBatch(xmlStrings) {
  return xmlStrings.map(parseNfeXml).filter(Boolean);
}
