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

// Busca um campo em qualquer profundidade do objeto — usado para achar
// cBenef, cuja posição exata varia entre o layout antigo (nível do ICMS)
// e o novo grupo da reforma tributária (IBS/CBS), sem precisar mapear
// todas as variantes possíveis.
function buscarValorRecursivo(obj, chave) {
  if (!obj || typeof obj !== 'object') return null;
  if (chave in obj && obj[chave] !== undefined && obj[chave] !== '') return obj[chave];
  for (const valor of Object.values(obj)) {
    if (valor && typeof valor === 'object') {
      const encontrado = buscarValorRecursivo(valor, chave);
      if (encontrado !== null) return encontrado;
    }
  }
  return null;
}

// Mesma ideia de busca recursiva, mas devolve o objeto/subgrupo inteiro em
// vez de um valor escalar — usado para gIBSUF/gIBSMun/gCBS/gTribRegular,
// cuja profundidade exata dentro de <gIBSCBS> pode variar entre a
// especificação e o que cada emissor efetivamente grava.
function buscarGrupoRecursivo(obj, chave) {
  if (!obj || typeof obj !== 'object') return null;
  if (chave in obj && obj[chave] && typeof obj[chave] === 'object') return obj[chave];
  for (const valor of Object.values(obj)) {
    if (valor && typeof valor === 'object') {
      const encontrado = buscarGrupoRecursivo(valor, chave);
      if (encontrado !== null) return encontrado;
    }
  }
  return null;
}

// Extrai um grupo de redução (gRed: pRedAliq/pAliqEfet) ou diferimento
// (gDif: pDif/vDif) quando presente, devolvendo null se ausente — a
// ausência em si é informação relevante (indica que o item não usa
// redução/diferimento).
function extrairSubgrupoOpcional(grupo, chave, campos) {
  const sub = grupo && typeof grupo === 'object' ? grupo[chave] : null;
  if (!sub || typeof sub !== 'object') return null;
  const resultado = {};
  for (const campo of campos) resultado[campo] = toNumber(sub[campo]);
  return resultado;
}

// Extrai os campos criados pela Nota Técnica 2025.002 (Reforma
// Tributária — IBS/CBS/IS) quando presentes no item. O grupo <IBSCBS>
// tem duas variantes conforme o tipo de operação: <gIBSCBS> (regra
// geral, "ad valorem") ou <gIBSCBSMono> (monofásico, ex.: combustíveis).
// Documentos emitidos antes da adequação do emissor do cliente
// simplesmente não têm esse grupo — é exatamente isso que a análise de
// conformidade da reforma detecta.
function extrairReformaTributaria(imposto) {
  const grupo = imposto?.IBSCBS;
  if (!grupo) {
    return {
      presente: false, classTrib: null, cst: null, cBenef: null, valorIbs: 0, valorCbs: 0,
      ibsUf: null, ibsMunicipio: null, cbs: null, tributacaoRegularPresente: false, impostoSeletivo: null,
    };
  }

  const monofasico = Boolean(grupo.gIBSCBSMono);
  const gValores = grupo.gIBSCBS ?? grupo.gIBSCBSMono ?? {};

  // gIBSUF/gIBSMun/gCBS podem estar diretamente em gIBSCBS ou aninhados de
  // forma diferente conforme o emissor — busca recursiva evita presumir uma
  // única profundidade fixa (ver buscarGrupoRecursivo acima).
  const gIBSUF = buscarGrupoRecursivo(gValores, 'gIBSUF');
  const gIBSMun = buscarGrupoRecursivo(gValores, 'gIBSMun');
  const gCBS = buscarGrupoRecursivo(gValores, 'gCBS');
  const gTribRegular = buscarGrupoRecursivo(gValores, 'gTribRegular');
  const grupoIS = imposto?.IS ?? buscarGrupoRecursivo(imposto, 'IS');

  const ibsUf = gIBSUF
    ? {
        percentual: toNumber(gIBSUF.pIBSUF),
        valor: toNumber(gIBSUF.vIBSUF),
        reducao: extrairSubgrupoOpcional(gIBSUF, 'gRed', ['pRedAliq', 'pAliqEfet']),
        diferimento: extrairSubgrupoOpcional(gIBSUF, 'gDif', ['pDif', 'vDif']),
      }
    : null;

  const ibsMunicipio = gIBSMun
    ? {
        percentual: toNumber(gIBSMun.pIBSMun),
        valor: toNumber(gIBSMun.vIBSMun),
        reducao: extrairSubgrupoOpcional(gIBSMun, 'gRed', ['pRedAliq', 'pAliqEfet']),
        diferimento: extrairSubgrupoOpcional(gIBSMun, 'gDif', ['pDif', 'vDif']),
      }
    : null;

  const cbs = gCBS
    ? {
        percentual: toNumber(gCBS.pCBS),
        valor: toNumber(gCBS.vCBS),
        reducao: extrairSubgrupoOpcional(gCBS, 'gRed', ['pRedAliq', 'pAliqEfet']),
        diferimento: extrairSubgrupoOpcional(gCBS, 'gDif', ['pDif', 'vDif']),
      }
    : null;

  return {
    presente: true,
    monofasico,
    cst: grupo.CST ?? null,
    classTrib: grupo.cClassTrib ?? null,
    cBenef: buscarValorRecursivo(grupo, 'cBenef'),
    valorBaseCalculo: toNumber(gValores.vBC),
    valorIbs: toNumber(buscarGrupoRecursivo(gValores, 'gIBS')?.vIBS ?? gValores?.gIBS?.vIBS),
    valorCbs: toNumber(gCBS?.vCBS),
    ibsUf,
    ibsMunicipio,
    cbs,
    tributacaoRegularPresente: Boolean(gTribRegular),
    impostoSeletivo: grupoIS
      ? { cst: grupoIS.CSTIS ?? grupoIS.CST ?? null, classTrib: grupoIS.cClassTribIS ?? grupoIS.cClassTrib ?? null }
      : null,
  };
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
  const ibscbsTot = infNFe.total?.IBSCBSTot ?? null;
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
      icms: {
        cst: icms.CST ?? icms.CSOSN ?? null,
        aliquota: toNumber(icms.pICMS),
        valor: toNumber(icms.vICMS),
        baseCalculo: toNumber(icms.vBC),
      },
      pis: {
        cst: pis.CST ?? null,
        aliquota: toNumber(pis.pPIS),
        valor: toNumber(pis.vPIS),
        baseCalculo: toNumber(pis.vBC),
      },
      cofins: {
        cst: cofins.CST ?? null,
        aliquota: toNumber(cofins.pCOFINS),
        valor: toNumber(cofins.vCOFINS),
        baseCalculo: toNumber(cofins.vBC),
      },
      reformaTributaria: extrairReformaTributaria(imposto),
    };
  });

  const mod = Number(ide.mod);
  const tipoDocumento = mod === 65 ? 'NFCe' : 'NFe';

  return {
    tipoDocumento,
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
    valorPisTotal: toNumber(total.vPIS),
    valorCofinsTotal: toNumber(total.vCOFINS),
    reformaTributariaTotal: ibscbsTot
      ? {
          valorIbs: toNumber(buscarGrupoRecursivo(ibscbsTot, 'gIBS')?.vIBS ?? ibscbsTot.vIBS),
          valorCbs: toNumber(ibscbsTot.vCBS),
        }
      : null,
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
