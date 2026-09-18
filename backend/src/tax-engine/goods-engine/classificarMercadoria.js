// Motor de Mercadorias — determina qual tratamento da Reforma Tributária
// (IBS/CBS) um item de mercadoria (NFe/NFCe) provavelmente deveria ter, a
// partir de NCM + descrição, cruzando com a base "RTC Motor Modular v4.34"
// (tax-engine/legal-rules/data). Este é o motor que decide "como deveria
// estar tributado" — o XML_REFORMA_VALIDATOR (rtc-xml-validator/) já
// existente compara isso com o que o XML realmente informou.
//
// PRINCÍPIO GERAL: nunca confirmar um benefício sem evidência suficiente.
// Quando a base de dados não permite ter certeza (código não coberto,
// termo de descrição ausente, exige registro externo que não temos como
// verificar), o resultado fica em CANDIDATO_A_BENEFICIO ou REVISAO_MANUAL
// — nunca CONFIRMADO_AUTOMATICO por suposição.
//
// LIMITAÇÕES CONHECIDAS DESTA VERSÃO (documentadas, não escondidas):
//
// 1. A tabela term_rows.json (termos de descrição com peso) só cobre
//    Anexo I, Anexo VII, Anexo VIII e Art. 147 — os outros anexos não têm
//    dicionário de termos carregado. Por isso o "caminho genérico" completo
//    (NCM + confirmação por termos fortes) só roda pra esses quatro; os
//    demais anexos (IV, V, VI, IX, XII, XIII, XV) usam um caminho mais
//    simples baseado no código NCM específico já embutido em
//    classification/legal_rows.json, sempre como CANDIDATO_A_BENEFICIO
//    (nunca confirmado), porque de qualquer forma todos esses anexos
//    exigem registro externo (Anvisa, adquirente público etc.) que este
//    sistema não verifica.
//
// 2. legal_rows.json e rule_rows.json não têm um layout de colunas 100%
//    uniforme entre anexos (foram exportados de planilhas diferentes) —
//    por exemplo, o campo "requer confirmação por descrição" (SIM/NÃO)
//    aparece em formatos diferentes conforme o anexo, e o código NCM
//    embutido em legal_rows aparece ora no índice 5, ora no índice 7.
//    Em vez de presumir um único layout fixo, as funções abaixo procuram
//    o valor num pequeno intervalo de colunas e, quando não conseguem
//    interpretar uma linha com confiança, IGNORAM essa linha (ela
//    simplesmente não vira candidato) em vez de arriscar um valor errado.
//
// 3. Não cobre Simples Nacional, serviços (NBS) nem Imposto Seletivo —
//    escopo é mercadorias (NCM) na Reforma Tributária (IBS/CBS) apenas.

import {
  getClassification,
} from '../legal-rules/repository.js';

function algumTermoNaDescricao(descNormalizada, termos) {
  return (termos || []).some((termo) => descNormalizada.includes(normalizarDescricao(termo)));
}

// Anexos cujo item, na prática, exige uma verificação externa que este
// sistema não tem como fazer (registro/notificação Anvisa, CMED, condição
// do adquirente) — por isso nunca viram CONFIRMADO_AUTOMATICO, mesmo
// quando o NCM bate exatamente. Ver precedence.json, regra 8 ("REGISTRO
// EXTERNO... MANTER PENDENTE").
const ANEXOS_REGISTRO_EXTERNO = new Set([
  'Anexo IV', 'Anexo V', 'Anexo VI', 'Anexo XII', 'Anexo XIII', 'Art. 147', 'Medicamentos',
]);

// Anexos cobertos pelo dicionário de termos (term_rows.json) — únicos onde
// o caminho "genérico completo" (NCM via rule_rows + confirmação por
// descrição via term_rows) roda de ponta a ponta.
const ANEXOS_COM_TERMOS = new Set(['Anexo I', 'Anexo VII', 'Anexo VIII', 'Art. 147']);

function normalizarDescricao(descricao) {
  return String(descricao || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function apenasDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

// Canonicaliza um código/prefixo de NCM pra comparação: só remove o que não
// é dígito, preservando qualquer zero à esquerda literal (ex.: "0407.2" →
// "04072", "3926.90.30" → "39269030"). NUNCA passar por Number(), porque
// isso descarta um zero à esquerda isolado — e para os capítulos 01-09 do
// NCM/SH esse zero faz parte do código (ver o bug real encontrado: "NCM
// começa com 07" tinha ficado gravado como número 7 em rule_rows.json, e
// sem preservar o zero um parafuso de aço da posição 73 batia por engano
// no prefixo "7" pensado pra frutas/hortícolas da posição 07).
function canonicalizarNcm(valor) {
  return apenasDigitos(valor);
}

// Extrai o prefixo/código com o zero à esquerda preservado a partir da
// descrição textual da regra ("NCM começa com 0901" / "NCM = 96190000") —
// texto não perde zero à esquerda como uma célula numérica de planilha
// perde. Usado só pra rule_rows dos 4 anexos com dicionário de termos, onde
// esse padrão de texto está presente em 161 das 164 linhas relevantes; nos
// 3 casos sem esse padrão, o valor já é um código completo de 8 dígitos
// sem zero à esquerda (NCM 96190000), então cai no fallback com segurança.
function extrairNcmDoTextoRegra(textoDescricaoRegra) {
  const m = /^NCM (?:começa com|=) ([\d.]+)/.exec(String(textoDescricaoRegra || ''));
  return m ? apenasDigitos(m[1]) : null;
}

let indicesCache = null;

function obterIndices() {
  if (indicesCache) return indicesCache;
  const { legalRows, ruleRows, termRows } = getClassification();

  // legalRowsPorAnexoItem: dados do tratamento (tratamento/percentuais/
  // cst/cClassTrib/fundamento), a flag "precisa confirmar por descrição"
  // (default: true — precisa — quando não dá pra ler com confiança) e,
  // quando existir, o NCM específico embutido diretamente na linha.
  const legalRowsPorAnexoItem = new Map();
  for (const linha of legalRows) {
    const [anexo, , item] = linha;
    if (anexo === 'Medicamentos') continue; // catálogo próprio (medication_classification.json)
    const nomeCurto = linha[3];
    const tratamento = linha[8];
    const percReducaoIbs = Number(linha[9]);
    const percReducaoCbs = Number(linha[10]);
    const cst = Number(linha[11]);
    const cClassTrib = Number(linha[12]);
    const fundamento = linha[15];

    const flagBruta = String(linha[14] ?? '');
    let requerConfirmacaoDescricao = true; // default conservador: exige descrição
    if (flagBruta === 'NÃO' || flagBruta.endsWith('| NÃO')) requerConfirmacaoDescricao = false;
    else if (flagBruta === 'SIM' || flagBruta.endsWith('| SIM')) requerConfirmacaoDescricao = true;

    let ncmDireto = null;
    for (const idx of [5, 7, 4]) {
      const bruto = linha[idx];
      if (bruto === '' || bruto === undefined || bruto === null) continue;
      const str = String(bruto);
      if (/^\d{1,4}(\.\d{1,4}){0,4}$/.test(str)) { ncmDireto = str; break; }
    }

    legalRowsPorAnexoItem.set(`${anexo}|${item}`, {
      anexo, item, nomeCurto, tratamento,
      percReducaoIbs: Number.isFinite(percReducaoIbs) ? percReducaoIbs : null,
      percReducaoCbs: Number.isFinite(percReducaoCbs) ? percReducaoCbs : null,
      cst: Number.isFinite(cst) ? cst : null,
      cClassTrib: Number.isFinite(cClassTrib) ? cClassTrib : null,
      fundamento,
      requerConfirmacaoDescricao,
      ncmDireto,
    });
  }

  // ruleRowsPorAnexo: só interessa pros 4 anexos com dicionário de termos
  // — os demais usam o NCM embutido em legalRowsPorAnexoItem diretamente.
  const ruleRowsPorAnexo = new Map();
  for (const linha of ruleRows) {
    const anexo = linha[0];
    if (!ANEXOS_COM_TERMOS.has(anexo)) continue;
    const item = linha[1];
    const tipo = linha[2];
    if (tipo !== 'NCM') continue; // motor de mercadorias não lida com NBS

    // Prioriza o prefixo/código extraído do texto da própria regra (índice
    // 9, ex.: "NCM começa com 0901") — texto preserva o zero à esquerda,
    // a célula numérica (índice 3 ou 4, dependendo da planilha de origem)
    // não. Só cai pro valor numérico bruto quando o texto não segue esse
    // padrão (caso raro, ver extrairNcmDoTextoRegra).
    let ncmValor = linha[3];
    if (ncmValor === '' || ncmValor === undefined || ncmValor === null) ncmValor = linha[4];
    const ncmCanonico = extrairNcmDoTextoRegra(linha[9]) || canonicalizarNcm(ncmValor);
    if (!ncmCanonico) continue;

    const matchTypeBruto = String(linha[5] || '').toUpperCase();
    let matchType = null;
    if (matchTypeBruto.startsWith('PREFIX')) matchType = 'PREFIXO';
    else if (matchTypeBruto.startsWith('EXAT')) matchType = 'EXATO';
    else if (ncmCanonico.length >= 8) matchType = 'EXATO'; // fallback: código já é um NCM completo
    if (!matchType) continue; // não dá pra confirmar o tipo de correspondência — ignora a linha

    const acaoBruta = String(linha[6] || '').toUpperCase();
    if (acaoBruta !== 'INCLUIR' && acaoBruta !== 'EXCLUIR') continue; // TRIAGEM/BLOQUEAR são do catálogo de Medicamentos

    if (!ruleRowsPorAnexo.has(anexo)) ruleRowsPorAnexo.set(anexo, []);
    ruleRowsPorAnexo.get(anexo).push({ item, ncmCanonico, matchType, acao: acaoBruta });
  }

  // termRowsPorAnexoItem: termos normalizados por peso semântico (não
  // pontuação numérica — ver README da base de regras e a conversa que
  // definiu esse critério: sem um limiar numérico documentado, usa-se a
  // própria classificação FORTE/AUXILIAR/BLOQUEADOR do termo).
  const termRowsPorAnexoItem = new Map();
  for (const linha of termRows) {
    const anexo = linha[0];
    if (!ANEXOS_COM_TERMOS.has(anexo)) continue;
    const item = linha[1];
    const tipoTermoBruto = String(linha[4] || '').toUpperCase();
    const termoNormalizado = normalizarDescricao(linha[6] || linha[5] || '');
    if (!termoNormalizado) continue;

    let tipoTermo;
    if (tipoTermoBruto === 'INCLUIR_FORTE') tipoTermo = 'FORTE';
    else if (['INCLUIR_AUXILIAR', 'INDICATIVO', 'CONFIRMADOR'].includes(tipoTermoBruto)) tipoTermo = 'AUXILIAR';
    else if (['BLOQUEAR', 'BLOQUEAR/REVISAR', 'BLOQUEADOR', 'EXCLUSÃO_NCM'].includes(tipoTermoBruto)) tipoTermo = 'BLOQUEADOR';
    else continue; // ESPÉCIE_OBRIGATÓRIA/REDIRECIONAR_ZERO/outros: fora do escopo desta versão

    const chave = `${anexo}|${item}`;
    if (!termRowsPorAnexoItem.has(chave)) termRowsPorAnexoItem.set(chave, []);
    termRowsPorAnexoItem.get(chave).push({ tipo: tipoTermo, termo: termoNormalizado });
  }

  indicesCache = { legalRowsPorAnexoItem, ruleRowsPorAnexo, termRowsPorAnexoItem };
  return indicesCache;
}

// Confere se `descNormalizada` contém o termo — vírgulas separam
// alternativas (OU); dentro de cada alternativa, todas as palavras
// precisam aparecer na descrição (aproximação de "prefixo em qualquer
// posição", ver classification/precedence.json / engine_config.json).
function descricaoContemTermo(descNormalizada, termo) {
  const alternativas = termo.split(',').map((t) => t.trim()).filter(Boolean);
  return alternativas.some((alternativa) => {
    const palavras = alternativa.split(' ').filter(Boolean);
    return palavras.every((palavra) => descNormalizada.includes(palavra));
  });
}

function avaliarTermos(anexo, item, descNormalizada) {
  const { termRowsPorAnexoItem } = obterIndices();
  const termos = termRowsPorAnexoItem.get(`${anexo}|${item}`);
  if (!termos || !termos.length) return 'SEM_DADOS';

  const bloqueado = termos.some((t) => t.tipo === 'BLOQUEADOR' && descricaoContemTermo(descNormalizada, t.termo));
  if (bloqueado) return 'BLOQUEADO';

  const forte = termos.some((t) => t.tipo === 'FORTE' && descricaoContemTermo(descNormalizada, t.termo));
  if (forte) return 'FORTE';

  return 'INSUFICIENTE';
}

function ncmCorresponde(ncmCanonicoItem, regra) {
  if (regra.matchType === 'EXATO') return ncmCanonicoItem === regra.ncmCanonico;
  return ncmCanonicoItem.startsWith(regra.ncmCanonico);
}

function buscarCandidatosGenericos(ncmCanonicoItem) {
  const { ruleRowsPorAnexo } = obterIndices();
  const candidatos = [];
  for (const [anexo, regras] of ruleRowsPorAnexo) {
    const porItem = new Map();
    for (const regra of regras) {
      if (!ncmCorresponde(ncmCanonicoItem, regra)) continue;
      if (!porItem.has(regra.item)) porItem.set(regra.item, { incluir: false, excluir: false });
      const estado = porItem.get(regra.item);
      if (regra.acao === 'INCLUIR') estado.incluir = true;
      else estado.excluir = true;
    }
    for (const [item, estado] of porItem) {
      if (estado.incluir && !estado.excluir) candidatos.push({ anexo, item });
    }
  }
  return candidatos;
}

function buscarCandidatoNcmDireto(ncmCanonicoItem) {
  const { legalRowsPorAnexoItem } = obterIndices();
  const candidatos = [];
  for (const registro of legalRowsPorAnexoItem.values()) {
    if (ANEXOS_COM_TERMOS.has(registro.anexo)) continue; // esses já passaram pelo caminho genérico
    if (!registro.ncmDireto) continue;
    const ncmRegraCanonico = canonicalizarNcm(registro.ncmDireto);
    if (!ncmRegraCanonico) continue;
    const corresponde =
      ncmRegraCanonico.length >= 8 ? ncmCanonicoItem === ncmRegraCanonico : ncmCanonicoItem.startsWith(ncmRegraCanonico);
    if (corresponde) candidatos.push({ anexo: registro.anexo, item: registro.item });
  }
  return candidatos;
}

function montarResultado(status, extra = {}) {
  return {
    status,
    modulo: null,
    item: null,
    tratamentoSugerido: null,
    cstSugerido: null,
    cClassTribSugerido: null,
    fundamentoLegal: null,
    pendencias: [],
    notas: [],
    origem: null,
    ...extra,
  };
}

function avaliarCandidatoUnico(candidato, descNormalizada) {
  const { legalRowsPorAnexoItem } = obterIndices();
  const registro = legalRowsPorAnexoItem.get(`${candidato.anexo}|${candidato.item}`);
  if (!registro) {
    return montarResultado('REVISAO_MANUAL', {
      notas: [`NCM indica ${candidato.anexo} item ${candidato.item}, mas não há dados de tratamento carregados para esse item.`],
    });
  }

  const exigeRegistroExterno = ANEXOS_REGISTRO_EXTERNO.has(registro.anexo);
  const pendencias = exigeRegistroExterno
    ? ['Exige verificação de registro/notificação externa (Anvisa, CMED ou condição do adquirente) não automatizada neste sistema.']
    : [];

  const base = {
    modulo: registro.anexo,
    item: registro.item,
    tratamentoSugerido: registro.tratamento,
    cstSugerido: registro.cst,
    cClassTribSugerido: registro.cClassTrib,
    fundamentoLegal: registro.fundamento,
    pendencias,
    // Usado só internamente pra desempatar candidatos concorrentes (ver
    // resolverConflitoPorPercentual) — não é uma garantia de percentual
    // real aplicado, só o percentual do tratamento sugerido.
    percentualReducaoIbs: registro.percReducaoIbs,
  };

  if (!registro.requerConfirmacaoDescricao) {
    const status = exigeRegistroExterno ? 'CANDIDATO_A_BENEFICIO' : 'CONFIRMADO_AUTOMATICO';
    return montarResultado(status, { ...base, origem: 'regra_generica_ncm', notas: ['NCM específica o bastante para confirmar sem depender da descrição, segundo a base de regras.'] });
  }

  const avaliacaoTermos = avaliarTermos(registro.anexo, registro.item, descNormalizada);
  if (avaliacaoTermos === 'BLOQUEADO') return null; // termo bloqueador bateu — não é candidato válido
  if (avaliacaoTermos === 'FORTE') {
    return montarResultado('CANDIDATO_A_BENEFICIO', { ...base, origem: 'regra_generica_termo_forte', notas: ['Termo forte da descrição confirma o candidato; benefício não é confirmado automaticamente sem termo de pontuação documentado — revisar antes de aplicar.'] });
  }
  return montarResultado('REVISAO_MANUAL', {
    ...base,
    origem: 'regra_generica_sem_evidencia_suficiente',
    notas: [avaliacaoTermos === 'SEM_DADOS'
      ? 'NCM indica este item, mas não há termos de descrição carregados para confirmar — revisão manual necessária.'
      : 'NCM indica este item, mas a descrição não trouxe nenhum termo forte de confirmação.'],
  });
}

// Desempate entre candidatos concorrentes pro mesmo NCM: o tratamento com
// maior percentual de redução prevalece. Não é uma suposição — vem de
// precedence.json (regra 3, "ALÍQUOTA ZERO ESPECÍFICA... não manter a
// redução de 60%") e é confirmado explicitamente no próprio texto de itens
// como Anexo VII item 15 ("produtos do Anexo I permanecem com alíquota
// zero"): um cereal como arroz bate tanto no item específico do Anexo I
// (alíquota zero) quanto na regra ampla "NCM começa com 10" do Anexo VII
// (redução 60%) — Anexo I vence porque é mais específico E mais benéfico.
// Só decide quando há um vencedor único e sem ambiguidade; empate real ou
// candidato sem percentual conhecido continua em REVISAO_MANUAL.
// Alguns catálogos (ex.: Anexo IV, "Mapa NCM Expandido") listam produtos
// diferentes sob a mesma NCM ampla — ex.: itens 1 ("Bolsa para drenagem")
// e 55 ("Bolsas para uso em medicina — hemodiálise") ambos na NCM
// 3926.90.30, com CST/cClassTrib/tratamento idênticos. Isso não é uma
// ambiguidade real pra fins tributários, só duplicidade de catalogação —
// junta num resultado só em vez de mandar pra revisão manual à toa.
function resolverConflitoPorTratamentoIdentico(avaliados) {
  if (avaliados.length < 2) return avaliados[0] || null;
  const [primeiro, ...resto] = avaliados;
  const todosIguais = resto.every(
    (a) => a.cstSugerido === primeiro.cstSugerido && a.cClassTribSugerido === primeiro.cClassTribSugerido && a.tratamentoSugerido === primeiro.tratamentoSugerido
  );
  if (!todosIguais) return null;
  const itens = avaliados.map((a) => a.item).join(', ');
  return { ...primeiro, item: itens, notas: [...primeiro.notas, `NCM corresponde a mais de um item do catálogo (${primeiro.modulo}: ${itens}), todos com o mesmo tratamento.`] };
}

function resolverConflitoPorPercentual(avaliados) {
  if (avaliados.length < 2) return avaliados[0] || null;
  if (avaliados.some((a) => a.percentualReducaoIbs === null || a.percentualReducaoIbs === undefined)) return null;
  const maiorPercentual = Math.max(...avaliados.map((a) => a.percentualReducaoIbs));
  const vencedores = avaliados.filter((a) => a.percentualReducaoIbs === maiorPercentual);
  if (vencedores.length !== 1) return null;
  const [vencedor] = vencedores;
  const outros = avaliados.filter((a) => a !== vencedor).map((a) => `${a.modulo} item ${a.item} (${a.tratamentoSugerido})`);
  return { ...vencedor, notas: [...vencedor.notas, `NCM também corresponderia a ${outros.join('; ')}, mas prevalece o tratamento com maior percentual de redução.`] };
}

function classificarPorNcmEDescricaoGenerico(item, descNormalizada) {
  const ncmCanonicoItem = canonicalizarNcm(item.ncm);
  if (!ncmCanonicoItem) {
    return montarResultado('REVISAO_MANUAL', { notas: ['NCM ausente ou inválida no XML — não é possível classificar.'] });
  }

  const candidatosComTermos = buscarCandidatosGenericos(ncmCanonicoItem);
  const avaliados = candidatosComTermos.map((c) => avaliarCandidatoUnico(c, descNormalizada)).filter(Boolean);
  if (avaliados.length === 1) return avaliados[0];
  if (avaliados.length > 1) {
    const resolvido = resolverConflitoPorTratamentoIdentico(avaliados) || resolverConflitoPorPercentual(avaliados);
    if (resolvido) return resolvido;
    const modulos = avaliados.map((a) => `${a.modulo} item ${a.item}`).join('; ');
    return montarResultado('REVISAO_MANUAL', {
      origem: 'conflito_multiplos_candidatos',
      notas: [`NCM corresponde a mais de um tratamento possível sem regra de precedência conhecida entre eles: ${modulos}.`],
    });
  }

  const candidatosNcmDireto = buscarCandidatoNcmDireto(ncmCanonicoItem);
  if (candidatosNcmDireto.length === 1) return avaliarCandidatoUnico(candidatosNcmDireto[0], descNormalizada);
  if (candidatosNcmDireto.length > 1) {
    const avaliadosDireto = candidatosNcmDireto.map((c) => avaliarCandidatoUnico(c, descNormalizada)).filter(Boolean);
    const resolvidoDireto = resolverConflitoPorTratamentoIdentico(avaliadosDireto) || resolverConflitoPorPercentual(avaliadosDireto);
    if (resolvidoDireto) return resolvidoDireto;
    const modulos = candidatosNcmDireto.map((c) => `${c.anexo} item ${c.item}`).join('; ');
    return montarResultado('REVISAO_MANUAL', {
      origem: 'conflito_multiplos_candidatos',
      notas: [`NCM corresponde a mais de um item cadastrado sem regra de precedência conhecida entre eles: ${modulos}.`],
    });
  }

  return montarResultado('PROVAVEL_TRIBUTACAO_INTEGRAL', {
    tratamentoSugerido: 'TRIBUTAÇÃO INTEGRAL',
    cstSugerido: 0,
    cClassTribSugerido: 1,
    origem: 'regra_residual',
    notas: ['NCM não corresponde a nenhum tratamento especial carregado na base — provável regra geral, mas não há confirmação de que a NCM/descrição estejam corretas.'],
  });
}

// Disambiguação fralda × produto de saúde menstrual pra NCM 9619 — regra
// própria (ncm_9619_semantic.json) porque a mesma NCM ampla cobre os dois
// casos, com tratamentos bem diferentes (Anexo VIII x Art. 147). Sempre
// como CANDIDATO_A_BENEFICIO, nunca confirmado automaticamente — mesmo com
// evidência forte, é uma classificação semântica ainda não validada em
// produção, e Art. 147 de qualquer forma exige regularização Anvisa.
function verificarNcm9619(ncmCanonicoItem, descNormalizada) {
  if (!ncmCanonicoItem.startsWith('9619')) return null;
  const dados = getClassification().ncm9619Semantic;

  const ehMenstrualForte = algumTermoNaDescricao(descNormalizada, dados.menstrual_strong_terms);
  const ehFralda = algumTermoNaDescricao(descNormalizada, dados.diaper_terms) || algumTermoNaDescricao(descNormalizada, dados.diaper_brands);
  const temContextoMenstrual = algumTermoNaDescricao(descNormalizada, dados.menstrual_brands) || algumTermoNaDescricao(descNormalizada, dados.menstrual_context_terms);
  const temContextoNaoMenstrual = algumTermoNaDescricao(descNormalizada, dados.non_menstrual_context_terms);
  const temAbsorvente = descNormalizada.includes('ABSORVENTE') || /\bABS\b/.test(descNormalizada);

  function candidatoMenstrual(nota) {
    return montarResultado('CANDIDATO_A_BENEFICIO', {
      modulo: dados.menstrual_result.module,
      item: dados.menstrual_result.items,
      tratamentoSugerido: dados.menstrual_result.treatment,
      cstSugerido: Number(dados.menstrual_result.cst),
      cClassTribSugerido: Number(dados.menstrual_result.cclass),
      pendencias: ['Exige regularização/comunicação prévia na Anvisa compatível com o rótulo (art. 147).'],
      origem: 'semantico_ncm_9619',
      notas: [nota],
    });
  }

  function candidatoFralda(nota) {
    return montarResultado('CANDIDATO_A_BENEFICIO', {
      modulo: dados.diaper_result.module,
      item: dados.diaper_result.item,
      tratamentoSugerido: dados.diaper_result.treatment,
      cstSugerido: Number(dados.diaper_result.cst),
      cClassTribSugerido: Number(dados.diaper_result.cclass),
      pendencias: [],
      origem: 'semantico_ncm_9619',
      notas: [nota],
    });
  }

  if (ehMenstrualForte) return candidatoMenstrual('Termo forte de saúde menstrual encontrado na descrição.');
  if (ehFralda && !temContextoMenstrual) return candidatoFralda('Termo ou marca de fralda/incontinência encontrado na descrição.');
  if (temAbsorvente) {
    if (temContextoNaoMenstrual) return candidatoFralda('"Absorvente"/"ABS" com contexto geriátrico/incontinência — tratado como Anexo VIII.');
    if (temContextoMenstrual) return candidatoMenstrual('"Absorvente"/"ABS" com contexto de saúde menstrual.');
    return montarResultado('REVISAO_MANUAL', {
      origem: 'semantico_ncm_9619',
      notas: ['NCM 9619 com "absorvente"/"ABS" na descrição, sem contexto suficiente pra distinguir produto menstrual de artigo geriátrico/incontinência — revisar manualmente.'],
    });
  }
  return null; // NCM 9619 mas nada bateu — segue pro caminho genérico/residual
}

// Casos específicos documentados em ncm_semantic_overrides.json — cada um
// tem sua própria condição de confirmação/alerta já definida pela base de
// regras. `direct_confirmation: true` é a única situação em que este motor
// chega a CONFIRMADO_AUTOMATICO fora do caminho genérico (NCM sem exigir
// descrição) — porque a própria base declara isso explicitamente.
function verificarOverrideEspecifico(ncmCanonicoItem, descNormalizada) {
  const dados = getClassification().ncmSemanticOverrides;
  for (const chave of Object.keys(dados)) {
    const regra = dados[chave];
    if (!regra.module || !regra.treatment || !regra.cclass) continue; // ex.: prepared_peanuts etc. são só auditoria semântica, não benefício

    const ncmsRegra = [regra.ncm, regra.ncm_bread, ...(regra.ncm_mix || [])].filter(Boolean).flat();
    const ncmBate = ncmsRegra.some((n) => canonicalizarNcm(n) === ncmCanonicoItem);
    if (!ncmBate) continue;

    const base = {
      modulo: regra.module,
      item: regra.item,
      tratamentoSugerido: regra.treatment,
      cstSugerido: Number(regra.cst),
      cClassTribSugerido: Number(regra.cclass),
      fundamentoLegal: regra.legal_basis,
      origem: `override_${chave}`,
    };

    if (regra.direct_confirmation) {
      if (algumTermoNaDescricao(descNormalizada, regra.description_alert_terms)) {
        return montarResultado('REVISAO_MANUAL', { ...base, notas: ['NCM confirmaria automaticamente, mas a descrição contém termo de apresentação incompatível — revisar.'] });
      }
      return montarResultado('CONFIRMADO_AUTOMATICO', { ...base, notas: [regra.rule].filter(Boolean) });
    }

    // Casos de pão francês (ncm_bread/ncm_mix) têm termos de confirmação
    // e exclusão separados por variante.
    const termosExcluir = regra.bread_exclude_examples;
    const termosRevisar = regra.bread_review_terms;
    const termosConfirmar = regra.confirm_terms || (ncmCanonicoItem === canonicalizarNcm(regra.ncm_bread) ? regra.bread_confirm_terms : regra.mix_confirm_terms);

    if (algumTermoNaDescricao(descNormalizada, termosExcluir)) continue; // não é este benefício — segue procurando/cai no genérico
    if (algumTermoNaDescricao(descNormalizada, termosRevisar)) {
      return montarResultado('REVISAO_MANUAL', { ...base, notas: ['Descrição contém termo que exige revisão manual antes de confirmar este tratamento.'] });
    }
    if (algumTermoNaDescricao(descNormalizada, termosConfirmar)) {
      return montarResultado('CANDIDATO_A_BENEFICIO', { ...base, notas: [regra.rule, regra.collision_safety].filter(Boolean) });
    }
    return montarResultado('REVISAO_MANUAL', { ...base, notas: ['NCM corresponde a este item, mas a descrição não confirma — a base de regras exige confirmação por descrição para este código.'] });
  }
  return null;
}

// Medicamentos (NCM 3003/3004) usam catálogo próprio (medication_classification.json)
// em vez do caminho genérico de legal_rows/rule_rows/term_rows — sempre
// CANDIDATO_A_BENEFICIO (nunca confirmado): Medicamentos exige registro
// Anvisa/CMED que este sistema não verifica.
function verificarMedicamento(ncmCanonicoItem, descNormalizada) {
  const dados = getClassification().medicationClassification;
  if (!dados.ordinary_rule.ncm_prefixes.some((p) => ncmCanonicoItem.startsWith(p))) return null;

  const ativoEncontrado = dados.active_ingredient_reference.find(
    (a) => algumTermoNaDescricao(descNormalizada, [a.active_ingredient, ...(a.aliases || [])])
  );
  if (ativoEncontrado) {
    return montarResultado('CANDIDATO_A_BENEFICIO', {
      modulo: 'Medicamentos',
      item: dados.zero_rate_rule.article,
      tratamentoSugerido: 'ALÍQUOTA ZERO (candidato — pendente de confirmação)',
      cClassTribSugerido: Number(dados.zero_rate_rule.candidate_cclass_trib),
      fundamentoLegal: ativoEncontrado.legal_basis,
      pendencias: [dados.zero_rate_rule.requires, 'Se não confirmado, tratamento padrão é ' + dados.zero_rate_rule.default_fallback + '.'],
      origem: 'medicamento_principio_ativo',
      notas: [`Princípio ativo "${ativoEncontrado.active_ingredient}" identificado na descrição — candidato à alíquota zero do art. 146, mas exige lista oficial vigente.`],
    });
  }

  const evidenciaForte =
    algumTermoNaDescricao(descNormalizada, dados.medicine_form_terms) ||
    algumTermoNaDescricao(descNormalizada, dados.medicine_brand_reference) ||
    algumTermoNaDescricao(descNormalizada, dados.medicine_identity_reference);

  return montarResultado('CANDIDATO_A_BENEFICIO', {
    modulo: dados.ordinary_rule.module,
    item: dados.ordinary_rule.item,
    tratamentoSugerido: dados.ordinary_rule.treatment,
    cstSugerido: Number(dados.ordinary_rule.cst),
    cClassTribSugerido: Number(dados.ordinary_rule.cclass_trib),
    pendencias: ['Exige registro ativo na Anvisa e conformidade com a sistemática da CMED.'],
    origem: 'medicamento_regra_geral',
    notas: [
      evidenciaForte
        ? 'Descrição traz evidência de medicamento (forma farmacêutica, marca ou princípio ativo conhecido).'
        : 'NCM 3003/3004 indica medicamento, mas a descrição não trouxe evidência forte — confirmar manualmente.',
    ],
  });
}

/**
 * Classifica um item (produto de NFe/NFCe) determinando qual tratamento da
 * Reforma Tributária ele provavelmente deveria ter, a partir de NCM +
 * descrição. Não usa nenhum campo do próprio grupo IBSCBS do XML — isso é
 * trabalho do XML_REFORMA_VALIDATOR (rtc-xml-validator/), que compara o
 * resultado deste motor com o que o XML informou.
 */
export function classificarMercadoria(item) {
  const descNormalizada = normalizarDescricao(item.descricao);
  const ncmCanonicoItem = canonicalizarNcm(item.ncm);

  if (ncmCanonicoItem) {
    const resultadoEspecifico =
      verificarNcm9619(ncmCanonicoItem, descNormalizada) ||
      verificarOverrideEspecifico(ncmCanonicoItem, descNormalizada) ||
      verificarMedicamento(ncmCanonicoItem, descNormalizada);
    if (resultadoEspecifico) return resultadoEspecifico;
  }

  return classificarPorNcmEDescricaoGenerico(item, descNormalizada);
}

export function classificarMercadoriasDocumento(doc) {
  return doc.itens.map((item, indice) => ({
    numeroItem: item.numeroItem ?? indice + 1,
    classificacao: classificarMercadoria(item),
  }));
}
