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

// CNPJ tem sempre 14 dígitos, mas o fast-xml-parser (parseTagValue: true)
// converte o conteúdo da tag pra número quando parece numérico — e
// Number("07302509000138") vira 7302509000138, perdendo o zero à esquerda
// de qualquer CNPJ cujos 2 primeiros dígitos comecem com 0. Sem repor esse
// zero, o CNPJ gravado no cache permanente (documentos_fiscais.emit_cnpj)
// nunca bate com o CNPJ do cliente (14 dígitos) usado pra consultar esse
// cache, e a busca sempre volta vazia mesmo com os documentos já baixados.
function normalizarCnpj(value) {
  const bruto = String(value ?? '').replace(/\D/g, '');
  return bruto ? bruto.padStart(14, '0') : '';
}

// Mesmo bug de zero à esquerda do CNPJ/NCM, mas em CST/CSOSN: "00" (CST
// tributação integral) e "01"/"02"/... viram os números 0/1/2 depois do
// parseTagValue, e sem repor o zero a comparação com uma tabela de regras
// (ex.: tax-engine/icms-engine) nunca bate, mesmo quando o XML está
// correto — CST "00" comparado como "0" contra o esperado "00" já falha.
function normalizarCodigoFiscal(value, digitos) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).padStart(digitos, '0');
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

    // NCM tem sempre 8 dígitos, mas o fast-xml-parser (parseTagValue: true)
    // converte o conteúdo da tag pra número quando parece numérico — e
    // Number("02044300") vira 2044300, perdendo o zero à esquerda dos
    // capítulos 01-09. Sem repor esse zero, tanto a exibição quanto o
    // Motor de Mercadorias (que compara prefixo de NCM dígito a dígito)
    // ficam com o código desalinhado.
    const ncmBruto = String(prod.NCM ?? '');
    const ncm = ncmBruto ? ncmBruto.padStart(8, '0') : '';

    // CEST tem sempre 7 dígitos (formato NN.NNN.NN) e é filho de <prod>, não
    // do grupo de imposto — mesmo risco de perda de zero à esquerda do
    // fast-xml-parser que já afeta NCM/CST.
    const cestBruto = String(prod.CEST ?? '');
    const cest = cestBruto ? cestBruto.padStart(7, '0') : null;

    return {
      numeroItem: Number(det['@_nItem']) || undefined,
      codigo: String(prod.cProd ?? ''),
      descricao: String(prod.xProd ?? ''),
      ncm,
      cest,
      cfop: String(prod.CFOP ?? ''),
      quantidade: toNumber(prod.qCom),
      valorUnitario: toNumber(prod.vUnCom),
      valorProduto: toNumber(prod.vProd),
      icms: {
        // CST (Regime Normal) tem 2 dígitos, CSOSN (Simples Nacional) tem
        // 3 — normaliza cada um no tamanho certo antes do fallback ??, pra
        // não std zero à esquerda perdido virar um código de tamanho errado.
        cst: normalizarCodigoFiscal(icms.CST, 2) ?? normalizarCodigoFiscal(icms.CSOSN, 3),
        aliquota: toNumber(icms.pICMS),
        valor: toNumber(icms.vICMS),
        baseCalculo: toNumber(icms.vBC),
        // cBenef pode estar em profundidades diferentes conforme a variante
        // do grupo ICMS (ICMS00/ICMS20/ICMS40/ICMSSN101 etc.) — mesma busca
        // recursiva já usada pro cBenef da Reforma Tributária (extrairReformaTributaria).
        cBenef: buscarValorRecursivo(imposto.ICMS, 'cBenef'),
      },
      pis: {
        cst: normalizarCodigoFiscal(pis.CST, 2),
        aliquota: toNumber(pis.pPIS),
        valor: toNumber(pis.vPIS),
        baseCalculo: toNumber(pis.vBC),
      },
      cofins: {
        cst: normalizarCodigoFiscal(cofins.CST, 2),
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
    // UF de emitente/destinatário — necessária pra conferência de ICMS/CFOP
    // (interno x interestadual). Não persistida no cache permanente ainda
    // (exigiria migração de schema no Supabase); disponível só em buscas ao
    // vivo desta sessão, não em documentos já cacheados antes desta mudança.
    emitente: { cnpj: normalizarCnpj(emit.CNPJ), nome: emit.xNome ?? '', uf: emit.enderEmit?.UF ?? null },
    destinatario: { cnpj: normalizarCnpj(dest.CNPJ), nome: dest.xNome ?? '', uf: dest.enderDest?.UF ?? null },
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
// NFS-e (nota fiscal de serviço eletrônica) é municipal, não federal — cada
// prefeitura pode ter seu próprio layout de XML (não existe um único
// "schema nacional" ainda consolidado). O mais adotado entre municípios é o
// padrão ABRASF (v1/v2.04) — é o único reconhecido aqui. SIEG pode devolver
// outros formatos para municípios não-ABRASF; esses simplesmente não batem
// em nenhum dos caminhos abaixo e o documento é ignorado (mesmo padrão de
// falha graciosa do parseNfeXml — nunca um dado inventado).
//
// IMPORTANTE: este parser ainda não foi validado contra nenhum XML de NFS-e
// real emitido por um cliente desta contabilidade — foi escrito a partir da
// documentação pública do padrão ABRASF. Ajustar os caminhos abaixo assim
// que o primeiro documento real aparecer nos logs/cache (mesmo processo já
// usado pra encontrar os bugs de CST/UF do motor de ICMS).
function localizarInfNfse(parsed) {
  return (
    parsed?.CompNfse?.Nfse?.InfNfse
    ?? parsed?.Nfse?.InfNfse
    ?? parsed?.ConsultarNfseResposta?.ListaNfse?.CompNfse?.Nfse?.InfNfse
    ?? null
  );
}

export function parseNfseXml(xmlString) {
  let parsed;
  try {
    parsed = parser.parse(xmlString);
  } catch {
    return null;
  }

  const infNfse = localizarInfNfse(parsed);
  if (!infNfse) return null;

  // Municípios ABRASF v2 aninham os dados de fato dentro de
  // DeclaracaoPrestacaoServico.InfDeclaracaoPrestacaoServico; v1 tem tudo
  // direto em InfNfse. Cai pro próprio infNfse quando esse nível não existe.
  const declaracao = infNfse.DeclaracaoPrestacaoServico?.InfDeclaracaoPrestacaoServico ?? infNfse;
  const servico = declaracao.Servico ?? {};
  const valores = servico.Valores ?? {};
  const prestador = declaracao.Prestador ?? infNfse.PrestadorServico ?? {};
  const identificacaoPrestador = prestador.IdentificacaoPrestador ?? infNfse.PrestadorServico?.IdentificacaoPrestador ?? {};
  const tomador = declaracao.Tomador ?? infNfse.TomadorServico ?? {};
  const identificacaoTomador = tomador.IdentificacaoTomador ?? infNfse.TomadorServico?.IdentificacaoTomador ?? {};
  const cpfCnpjTomador = identificacaoTomador.CpfCnpj ?? {};

  const numero = infNfse.Numero ?? declaracao.Numero ?? null;
  const codigoVerificacao = infNfse.CodigoVerificacao ?? null;
  // Cancelamento não segue um único campo entre municípios ABRASF — alguns
  // usam <Situacao>2 (cancelada) dentro de InfNfse, outros um nó
  // <NfseCancelamento> à parte no mesmo envelope.
  const situacao = infNfse.Situacao ?? infNfse.StatusNfse ?? null;
  const cancelada = String(situacao) === '2' || Boolean(infNfse.NfseCancelamento ?? parsed?.CompNfse?.NfseCancelamento);

  // ItemListaServico é o código da lista de serviços da LC 116/2003 (ex.:
  // "1.01") — mesmo formato numérico do catálogo NBS 2.0 fornecido pra
  // conferência (ver tax-engine/nbs-engine). CodigoTributacaoMunicipio é um
  // código próprio da prefeitura, usado só como fallback quando o primeiro
  // não vier preenchido.
  const codigoNbs = String(servico.ItemListaServico ?? servico.CodigoTributacaoMunicipio ?? '').trim() || null;
  const valorServicos = toNumber(valores.ValorServicos);
  const valorPis = toNumber(valores.ValorPis);
  const valorCofins = toNumber(valores.ValorCofins);

  return {
    tipoDocumento: 'NFSe',
    // Sem numeração por série (NFS-e não tem esse conceito) — a chave é
    // sintética (número + código de verificação), só pra deduplicar no
    // cache; documentos sem código de verificação ficam sem chave e não são
    // persistidos no cache permanente (mesmo comportamento de qualquer doc
    // sem chave — ver documentCache.js/registrarSincronizacao).
    chave: numero && codigoVerificacao ? `NFSE-${numero}-${codigoVerificacao}` : null,
    numero: toNumber(numero),
    serie: null,
    dataEmissao: infNfse.DataEmissao ?? declaracao.DataEmissao ?? null,
    naturezaOperacao: servico.Discriminacao ?? '',
    cancelada,
    emitente: {
      cnpj: normalizarCnpj(identificacaoPrestador.Cnpj),
      nome: prestador.RazaoSocial ?? infNfse.PrestadorServico?.RazaoSocial ?? '',
      uf: prestador.Endereco?.Uf ?? null,
    },
    destinatario: {
      cnpj: normalizarCnpj(cpfCnpjTomador.Cnpj ?? cpfCnpjTomador.Cpf),
      nome: tomador.RazaoSocial ?? infNfse.TomadorServico?.RazaoSocial ?? '',
      uf: tomador.Endereco?.Uf ?? null,
    },
    valorTotal: valorServicos,
    valorIcmsTotal: 0,
    valorProdutosTotal: 0,
    valorPisTotal: valorPis,
    valorCofinsTotal: valorCofins,
    itens: [
      {
        numeroItem: 1,
        // Campos abaixo replicam o formato de item de mercadoria (NCM/CFOP/
        // ICMS ficam null/zerados de propósito) só pra não quebrar os
        // agregadores genéricos que já assumem essa forma (taxAnalyzer.js,
        // resumo de PIS/COFINS do painelBuilder.js) — nenhum desses valores
        // é "inventado", são estruturalmente ausentes numa nota de serviço.
        codigo: codigoNbs ?? '',
        descricao: servico.Discriminacao ?? '',
        ncm: null,
        cest: null,
        cfop: null,
        quantidade: 1,
        valorUnitario: valorServicos,
        valorProduto: valorServicos,
        icms: { cst: null, aliquota: 0, valor: 0, baseCalculo: 0, cBenef: null },
        pis: { cst: null, aliquota: 0, valor: valorPis, baseCalculo: 0 },
        cofins: { cst: null, aliquota: 0, valor: valorCofins, baseCalculo: 0 },
        reformaTributaria: null,
        // Campos específicos de NFS-e — consumidos pela conferência de NBS
        // (tax-engine/nbs-engine); nada aqui tem regra de ISS ainda (ver
        // README desse motor).
        servico: {
          codigoNbs,
          aliquotaIss: toNumber(valores.Aliquota),
          valorIss: toNumber(valores.ValorIss),
          issRetido: String(servico.IssRetido ?? valores.IssRetido ?? '2') === '1',
        },
      },
    ],
  };
}

export function classificarOperacao(doc, clienteCnpj) {
  const cnpjLimpo = String(clienteCnpj || '').replace(/\D/g, '');
  // Compara sempre só dígitos dos dois lados — o CNPJ do emitente/
  // destinatário vem direto do XML (sem normalização) e formatação
  // divergente (espaços, pontuação) fazia a comparação falhar mesmo
  // quando o CNPJ era o mesmo, caindo indevidamente em "desconhecida".
  const emitCnpj = String(doc.emitente?.cnpj || '').replace(/\D/g, '');
  const destCnpj = String(doc.destinatario?.cnpj || '').replace(/\D/g, '');
  if (emitCnpj === cnpjLimpo) return 'saida';
  if (destCnpj === cnpjLimpo) return 'entrada';
  // NFCe é sempre emitida pelo próprio estabelecimento pra venda ao
  // consumidor final — nunca representa uma entrada de mercadoria pro
  // cliente do escritório. Mesmo se o CNPJ do emitente não bateu por
  // algum motivo, não faz sentido classificar como "desconhecida".
  if (doc.tipoDocumento === 'NFCe') return 'saida';
  return 'desconhecida';
}

export function parseNfeBatch(xmlStrings) {
  return xmlStrings.map((xml) => parseNfeXml(xml) ?? parseNfseXml(xml)).filter(Boolean);
}
