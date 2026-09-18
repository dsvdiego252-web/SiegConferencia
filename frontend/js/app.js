const els = {
  clienteSelect: document.getElementById('clienteSelect'),
  tipoDocSelect: document.getElementById('tipoDocSelect'),
  dataInicioInput: document.getElementById('dataInicioInput'),
  dataFimInput: document.getElementById('dataFimInput'),
  btnAtualizar: document.getElementById('btnAtualizar'),
  btnAbrirCadastroCliente: document.getElementById('btnAbrirCadastroCliente'),
  btnEditarCliente: document.getElementById('btnEditarCliente'),
  btnExportarAvisos: document.getElementById('btnExportarAvisos'),
  clienteModalOverlay: document.getElementById('clienteModalOverlay'),
  clienteModalTitulo: document.getElementById('clienteModalTitulo'),
  btnFecharModalCliente: document.getElementById('btnFecharModalCliente'),
  novoClienteCnpj: document.getElementById('novoClienteCnpj'),
  novoClienteNome: document.getElementById('novoClienteNome'),
  novoClienteRegime: document.getElementById('novoClienteRegime'),
  novoClienteSegmento: document.getElementById('novoClienteSegmento'),
  btnAdicionarCliente: document.getElementById('btnAdicionarCliente'),
  clienteModalErro: document.getElementById('clienteModalErro'),
  statusBox: document.getElementById('statusBox'),
  statusSpinner: document.getElementById('statusSpinner'),
  statusText: document.getElementById('statusText'),
  summaryPanel: document.getElementById('summaryPanel'),
  summaryTotal: document.getElementById('summaryTotal'),
  summaryEntrada: document.getElementById('summaryEntrada'),
  summarySaida: document.getElementById('summarySaida'),
  summaryGaps: document.getElementById('summaryGaps'),
  summaryGapsCard: document.getElementById('summaryGapsCard'),
  summaryInconsistentes: document.getElementById('summaryInconsistentes'),
  summaryInconsistentesCard: document.getElementById('summaryInconsistentesCard'),
  summaryDivergenciaCalculo: document.getElementById('summaryDivergenciaCalculo'),
  summaryDivergenciaCalculoCard: document.getElementById('summaryDivergenciaCalculoCard'),
  valuesPanel: document.getElementById('valuesPanel'),
  valorEntrada: document.getElementById('valorEntrada'),
  valorSaida: document.getElementById('valorSaida'),
  valorSaldo: document.getElementById('valorSaldo'),
  valorSaldoCard: document.getElementById('valorSaldoCard'),
  valorIcmsEntrada: document.getElementById('valorIcmsEntrada'),
  valorIcmsSaida: document.getElementById('valorIcmsSaida'),
  valorPisCofinsEntrada: document.getElementById('valorPisCofinsEntrada'),
  valorPisCofinsSaida: document.getElementById('valorPisCofinsSaida'),
  sequencePanel: document.getElementById('sequencePanel'),
  sequenceTableBody: document.querySelector('#sequenceTable tbody'),
  documentsPanel: document.getElementById('documentsPanel'),
  documentsTableBody: document.querySelector('#documentsTable tbody'),
  documentsPagination: document.getElementById('documentsPagination'),
  situacaoFiltroSelect: document.getElementById('situacaoFiltroSelect'),
  taxPanel: document.getElementById('taxPanel'),
  taxTableBody: document.querySelector('#taxTable tbody'),
  taxPagination: document.getElementById('taxPagination'),
  reformaSummaryPanel: document.getElementById('reformaSummaryPanel'),
  reformaTotalAnalisados: document.getElementById('reformaTotalAnalisados'),
  reformaTotalAnalisadosCard: document.getElementById('reformaTotalAnalisadosCard'),
  reformaConformes: document.getElementById('reformaConformes'),
  reformaConformesCard: document.getElementById('reformaConformesCard'),
  reformaParciais: document.getElementById('reformaParciais'),
  reformaParciaisCard: document.getElementById('reformaParciaisCard'),
  reformaSemAdequacao: document.getElementById('reformaSemAdequacao'),
  reformaSemAdequacaoCard: document.getElementById('reformaSemAdequacaoCard'),
  filtroReformaIndicador: document.getElementById('filtroReformaIndicador'),
  filtroReformaIndicadorTexto: document.getElementById('filtroReformaIndicadorTexto'),
  btnLimparFiltroReforma: document.getElementById('btnLimparFiltroReforma'),
  reformaPanel: document.getElementById('reformaPanel'),
  reformaDataCorte: document.getElementById('reformaDataCorte'),
  reformaRegimeInfo: document.getElementById('reformaRegimeInfo'),
  reformaResumoTableBody: document.querySelector('#reformaResumoTable tbody'),
  dominioFileInput: document.getElementById('dominioFileInput'),
  btnConferirDominio: document.getElementById('btnConferirDominio'),
  reconciliationStatus: document.getElementById('reconciliationStatus'),
  reconciliationSummaryPanel: document.getElementById('reconciliationSummaryPanel'),
  reconTotalPareados: document.getElementById('reconTotalPareados'),
  reconTotalDivergentes: document.getElementById('reconTotalDivergentes'),
  reconDivergentesCard: document.getElementById('reconDivergentesCard'),
  reconTotalSomenteSieg: document.getElementById('reconTotalSomenteSieg'),
  reconSomenteSiegCard: document.getElementById('reconSomenteSiegCard'),
  reconTotalSomenteDominio: document.getElementById('reconTotalSomenteDominio'),
  reconSomenteDominioCard: document.getElementById('reconSomenteDominioCard'),
  reconciliationResumoPanel: document.getElementById('reconciliationResumoPanel'),
  reconResumoTableBody: document.querySelector('#reconResumoTable tbody'),
  reconciliationDetailPanel: document.getElementById('reconciliationDetailPanel'),
  reconDetailTableBody: document.querySelector('#reconDetailTable tbody'),
  docModalOverlay: document.getElementById('docModalOverlay'),
  docModalTitulo: document.getElementById('docModalTitulo'),
  docModalCorpo: document.getElementById('docModalCorpo'),
  btnFecharModal: document.getElementById('btnFecharModal'),
};

// O front-end é servido pelo mesmo backend (mesma origem), tanto em dev
// local quanto na Vercel — não precisa apontar pra outro endereço.
function apiBase() {
  return '';
}

function setStatus(message, isError = false, isLoading = false) {
  els.statusText.textContent = message;
  els.statusBox.classList.toggle('error', isError);
  els.statusSpinner.hidden = !isLoading;
}

async function apiGet(pathAndQuery) {
  const res = await fetch(`${apiBase()}${pathAndQuery}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status} ao chamar ${pathAndQuery}`);
  return data;
}

async function apiPost(pathAndQuery, body) {
  const res = await fetch(`${apiBase()}${pathAndQuery}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status} ao chamar ${pathAndQuery}`);
  return data;
}

async function apiPatch(pathAndQuery, body) {
  const res = await fetch(`${apiBase()}${pathAndQuery}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status} ao chamar ${pathAndQuery}`);
  return data;
}

async function apiPostForm(pathAndQuery, formData) {
  const res = await fetch(`${apiBase()}${pathAndQuery}`, { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status} ao chamar ${pathAndQuery}`);
  return data;
}

function formatMoney(n) {
  return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function primeiroDiaMesAtual() {
  const now = new Date();
  return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

function ultimoDiaMesAtual() {
  const now = new Date();
  return formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

let clientesCarregados = [];

async function carregarClientes(selecionarCnpj) {
  clientesCarregados = await apiGet('/api/clients');
  els.clienteSelect.innerHTML = '';
  for (const c of clientesCarregados) {
    const opt = document.createElement('option');
    opt.value = c.cnpj;
    opt.textContent = `${c.nome} (${c.cnpj})`;
    els.clienteSelect.appendChild(opt);
  }
  if (selecionarCnpj) els.clienteSelect.value = selecionarCnpj;
}

function renderResumo({ totalDocumentos, totalEntrada, totalSaida, totalInconsistentes, totalDivergenciaCalculo }, temQuebra) {
  els.summaryPanel.hidden = false;
  els.summaryTotal.textContent = totalDocumentos;
  els.summaryEntrada.textContent = totalEntrada;
  els.summarySaida.textContent = totalSaida;
  els.summaryGaps.textContent = temQuebra ? 'Sim' : 'Não';
  els.summaryGapsCard.classList.toggle('has-gaps', temQuebra);
  els.summaryGapsCard.classList.toggle('no-gaps', !temQuebra);
  els.summaryInconsistentes.textContent = totalInconsistentes;
  els.summaryInconsistentesCard.classList.toggle('alerta', totalInconsistentes > 0);
  els.summaryDivergenciaCalculo.textContent = totalDivergenciaCalculo;
  els.summaryDivergenciaCalculoCard.classList.toggle('alerta-leve', totalDivergenciaCalculo > 0);
}

function renderValores(valores) {
  els.valuesPanel.hidden = false;
  els.valorEntrada.textContent = formatMoney(valores.entrada.valor);
  els.valorSaida.textContent = formatMoney(valores.saida.valor);
  els.valorSaldo.textContent = formatMoney(valores.saldo);
  els.valorSaldoCard.classList.toggle('alerta', valores.saldo < 0);
  els.valorIcmsEntrada.textContent = formatMoney(valores.entrada.icms);
  els.valorIcmsSaida.textContent = formatMoney(valores.saida.icms);
  els.valorPisCofinsEntrada.textContent = formatMoney(valores.entrada.pisCofins);
  els.valorPisCofinsSaida.textContent = formatMoney(valores.saida.pisCofins);
}

const ROTULO_SITUACAO = { ok: 'OK', inconsistente: 'Inconsistente', cancelada: 'Cancelada' };
const DOCUMENTS_PAGE_SIZE = 20;

let documentosCarregados = [];
let paginaDocumentosAtual = 1;
// Filtros disparados pelos cards de resumo (não confundir com o dropdown
// "Situação" acima da tabela — são dimensões diferentes, por isso só uma
// fica ativa por vez pra não combinar e sumir com a lista sem explicação):
// filtroReformaAtivo — null, 'qualquer' (todos analisados pela reforma), ou
// o valor de situacaoReforma ('conforme'/'parcial'/'sem_adequacao').
// filtroCalculoAtivo — true mostra só documentos com divergência do Motor
// de Validação Matemática.
let filtroReformaAtivo = null;
let filtroCalculoAtivo = false;

function documentosFiltrados() {
  let lista = documentosCarregados;
  const filtroSituacao = els.situacaoFiltroSelect.value;
  if (filtroSituacao !== 'todos') lista = lista.filter((d) => d.situacao === filtroSituacao);
  if (filtroReformaAtivo === 'qualquer') lista = lista.filter((d) => d.situacaoReforma !== null);
  else if (filtroReformaAtivo) lista = lista.filter((d) => d.situacaoReforma === filtroReformaAtivo);
  if (filtroCalculoAtivo) lista = lista.filter((d) => d.validacaoMatematica && d.validacaoMatematica.status !== 'CORRETO');
  return lista;
}

const ROTULO_FILTRO_REFORMA = {
  qualquer: 'Documentos desde a vigência',
  conforme: 'Conformes (IBS/CBS ok)',
  parcial: 'Parcialmente adequados',
  sem_adequacao: 'Sem campos da reforma',
};

function atualizarCardsReformaAtivos() {
  const mapa = {
    qualquer: els.reformaTotalAnalisadosCard,
    conforme: els.reformaConformesCard,
    parcial: els.reformaParciaisCard,
    sem_adequacao: els.reformaSemAdequacaoCard,
  };
  for (const [valor, card] of Object.entries(mapa)) {
    card?.classList.toggle('card-filtro-ativo', filtroReformaAtivo === valor);
  }
  els.summaryDivergenciaCalculoCard.classList.toggle('card-filtro-ativo', filtroCalculoAtivo);

  if (filtroReformaAtivo) {
    els.filtroReformaIndicador.hidden = false;
    els.filtroReformaIndicadorTexto.textContent = `Filtro por card da Reforma Tributária ativo: "${ROTULO_FILTRO_REFORMA[filtroReformaAtivo]}" —`;
  } else if (filtroCalculoAtivo) {
    els.filtroReformaIndicador.hidden = false;
    els.filtroReformaIndicadorTexto.textContent = 'Filtro ativo: documentos com divergência de cálculo —';
  } else {
    els.filtroReformaIndicador.hidden = true;
  }
}

function aplicarFiltroReforma(valor) {
  filtroReformaAtivo = filtroReformaAtivo === valor ? null : valor;
  filtroCalculoAtivo = false;
  els.situacaoFiltroSelect.value = 'todos';
  paginaDocumentosAtual = 1;
  atualizarCardsReformaAtivos();
  renderPaginaDocumentos();
  els.documentsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function aplicarFiltroCalculo() {
  filtroCalculoAtivo = !filtroCalculoAtivo;
  filtroReformaAtivo = null;
  els.situacaoFiltroSelect.value = 'todos';
  paginaDocumentosAtual = 1;
  atualizarCardsReformaAtivos();
  renderPaginaDocumentos();
  els.documentsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limparFiltroReforma() {
  filtroReformaAtivo = null;
  filtroCalculoAtivo = false;
  paginaDocumentosAtual = 1;
  atualizarCardsReformaAtivos();
  renderPaginaDocumentos();
}

function renderDocumentos(documentos) {
  documentosCarregados = documentos;
  paginaDocumentosAtual = 1;
  filtroReformaAtivo = null;
  filtroCalculoAtivo = false;
  atualizarCardsReformaAtivos();
  els.documentsPanel.hidden = false;
  renderPaginaDocumentos();
}

function renderPaginaDocumentos() {
  const filtrados = documentosFiltrados();
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / DOCUMENTS_PAGE_SIZE));
  if (paginaDocumentosAtual > totalPaginas) paginaDocumentosAtual = totalPaginas;

  els.documentsTableBody.innerHTML = '';
  if (!filtrados.length) {
    els.documentsTableBody.innerHTML = '<tr class="empty-row"><td colspan="9">Nenhum documento encontrado com esse filtro.</td></tr>';
    els.documentsPagination.innerHTML = '';
    return;
  }

  const inicio = (paginaDocumentosAtual - 1) * DOCUMENTS_PAGE_SIZE;
  const pagina = filtrados.slice(inicio, inicio + DOCUMENTS_PAGE_SIZE);

  for (const d of pagina) {
    const tr = document.createElement('tr');
    tr.className = `row-clickable row-${d.situacao}`;
    tr.innerHTML = `
      <td><span class="badge badge-situacao-${d.situacao}">${ROTULO_SITUACAO[d.situacao]}</span></td>
      <td><span class="badge badge-${d.operacao}">${d.operacao}</span></td>
      <td>${d.tipoDocumento}</td>
      <td>${d.numero}</td>
      <td>${d.serie}</td>
      <td>${formatDate(d.dataEmissao)}</td>
      <td>${d.emitente.nome || d.emitente.cnpj}</td>
      <td>${d.destinatario.nome || d.destinatario.cnpj}</td>
      <td>${formatMoney(d.valorTotal)}</td>
    `;
    tr.addEventListener('click', () => abrirModalDocumento(d));
    els.documentsTableBody.appendChild(tr);
  }

  renderPaginacao(els.documentsPagination, paginaDocumentosAtual, filtrados.length, DOCUMENTS_PAGE_SIZE, (novaPagina) => {
    paginaDocumentosAtual = novaPagina;
    renderPaginaDocumentos();
  });
}

// CSTs do IBS/CBS que tipicamente representam algum benefício/desoneração
// (alíquota reduzida, isenção, imunidade, diferimento, suspensão,
// monofásico) — quando o cClassTrib complementa isso mas o cBenef também
// está vazio, vale conferir se deveria estar preenchido. Isso é um alerta
// brando, não uma regra fechada: no modelo novo o cClassTrib já cumpre boa
// parte do papel do cBenef antigo do ICMS, e a exigência exata de cBenef
// ainda não está 100% pacificada nas fontes públicas disponíveis.
const CST_COM_POSSIVEL_BENEFICIO = [200, 400, 410, 510, 550, 620];

// O fast-xml-parser converte valores numéricos como "000" ou "000001" para
// number (0, 1), perdendo os zeros à esquerda — CST tem 3 dígitos e
// cClassTrib tem 6, então recompletamos na exibição.
function preenchido(valor) {
  return valor !== null && valor !== undefined && valor !== '';
}

function formatarCodigoReforma(valor, digitos) {
  if (!preenchido(valor)) return null;
  return String(valor).padStart(digitos, '0');
}

function textoReformaItem(reforma) {
  if (!reforma?.presente) {
    return `
      <div class="reforma-info">
        <div><span class="destaque-erro">Sem o grupo IBS/CBS no XML</span></div>
        <div class="hint">(CST e Classificação Tributária ausentes)</div>
      </div>
    `;
  }

  const cstFormatado = formatarCodigoReforma(reforma.cst, 3);
  const classTribFormatado = formatarCodigoReforma(reforma.classTrib, 6);
  const linhaCst = cstFormatado
    ? `<div><strong>CST:</strong> ${cstFormatado}</div>`
    : '<div><span class="destaque-erro">CST: faltando</span></div>';
  const linhaClassTrib = classTribFormatado
    ? `<div><strong>ClassTrib:</strong> ${classTribFormatado}</div>`
    : '<div><span class="destaque-erro">Classificação Tributária (cClassTrib): faltando</span></div>';
  const linhaCbenef = `<div><strong>cBenef:</strong> ${preenchido(reforma.cBenef) ? reforma.cBenef : 'não informado'}</div>`;
  const linhaBaseCalculo = `<div><strong>BC IBS/CBS:</strong> ${formatMoney(reforma.valorBaseCalculo)}</div>`;
  const linhaIbs = `<div><strong>IBS:</strong> ${formatMoney(reforma.valorIbs)}</div>`;
  const linhaCbs = `<div><strong>CBS:</strong> ${formatMoney(reforma.valorCbs)}</div>`;

  let aviso = '';
  if (cstFormatado && CST_COM_POSSIVEL_BENEFICIO.includes(Number(reforma.cst)) && !preenchido(reforma.cBenef)) {
    aviso = '<div class="hint reforma-aviso">CST indica alíquota reduzida/isenção/diferimento — confira se o cBenef deveria estar preenchido.</div>';
  }

  return `<div class="reforma-info">${linhaCst}${linhaClassTrib}${linhaCbenef}${linhaBaseCalculo}${linhaIbs}${linhaCbs}${aviso}</div>`;
}

const ROTULO_STATUS_CALCULO = {
  CORRETO: 'correto',
  DIVERGENCIA_ARREDONDAMENTO: 'diferença de arredondamento',
  DIVERGENCIA_CALCULO: 'divergência de cálculo',
};

// Linha de um campo recalculado pelo Motor de Validação Matemática (produto,
// ICMS, PIS ou COFINS) — mostra o valor do XML e, quando diverge do que foi
// recalculado a partir de quantidade/base/alíquota, o valor esperado ao lado.
function linhaValidacaoCalculo(rotulo, campo) {
  if (!campo) return '';
  const classe = campo.status === 'CORRETO' ? '' : campo.status === 'DIVERGENCIA_ARREDONDAMENTO' ? 'reforma-aviso' : 'destaque-erro';
  const detalhe = campo.status === 'CORRETO' ? '' : ` <span class="hint">(esperado ${formatMoney(campo.esperado)})</span>`;
  return `<div><strong>${rotulo}:</strong> <span class="${classe}">${formatMoney(campo.xml)}</span>${detalhe}</div>`;
}

function textoValidacaoCalculoItem(validacao) {
  if (!validacao) return '<span class="hint">Não avaliado (documento cancelado)</span>';
  const linhas =
    linhaValidacaoCalculo('Produto', validacao.produto) +
    linhaValidacaoCalculo('ICMS', validacao.icms) +
    linhaValidacaoCalculo('PIS', validacao.pis) +
    linhaValidacaoCalculo('COFINS', validacao.cofins);
  return `<div class="reforma-info">${linhas}</div>`;
}

function badgeValidacaoCalculo(validacaoMatematica) {
  if (!validacaoMatematica) return '<span class="hint">Não avaliado (documento cancelado)</span>';
  const classe =
    validacaoMatematica.status === 'CORRETO'
      ? 'badge-situacao-ok'
      : validacaoMatematica.status === 'DIVERGENCIA_ARREDONDAMENTO'
        ? 'badge-situacao-inconsistente'
        : 'badge-erro';
  return `<span class="badge ${classe}">${ROTULO_STATUS_CALCULO[validacaoMatematica.status]}</span>`;
}

const ROTULO_CAMPO_CALCULO = { produto: 'Produto', icms: 'ICMS', pis: 'PIS', cofins: 'COFINS' };
const ROTULO_TOTAL_CALCULO = { produtos: 'Total de produtos', icms: 'Total de ICMS', pis: 'Total de PIS', cofins: 'Total de COFINS' };

// Explica EM QUE o cálculo diverge — a badge sozinha só diz que há
// divergência, sem dizer qual item/campo/valor. Lista cada campo cujo
// valor recalculado (quantidade×valorUnitário ou base×alíquota) não bate
// com o que o XML informou, item por item, e depois os totais do
// documento — a mesma comparação que dá o status, só que legível.
function detalheDivergenciasCalculo(validacaoMatematica, itensDoc) {
  if (!validacaoMatematica || validacaoMatematica.status === 'CORRETO') return '';
  const linhas = [];

  validacaoMatematica.itens.forEach((itemCalc, indice) => {
    for (const campo of ['produto', 'icms', 'pis', 'cofins']) {
      const c = itemCalc[campo];
      if (c && c.status !== 'CORRETO') {
        const nomeItem = itensDoc?.[indice]?.descricao || `item ${itemCalc.numeroItem}`;
        linhas.push(`<strong>${nomeItem}</strong> — ${ROTULO_CAMPO_CALCULO[campo]}: informado ${formatMoney(c.xml)}, esperado ${formatMoney(c.esperado)}`);
      }
    }
  });

  for (const [campo, rotulo] of Object.entries(ROTULO_TOTAL_CALCULO)) {
    const t = validacaoMatematica.totais[campo];
    if (t && t.status !== 'CORRETO') {
      linhas.push(`${rotulo} do documento: soma dos itens ${formatMoney(t.somaItens)}, total informado ${formatMoney(t.totalDocumento)}`);
    }
  }

  if (!linhas.length) return '';
  return `<ul class="detalhe-divergencias">${linhas.map((l) => `<li>${l}</li>`).join('')}</ul>`;
}

const ROTULO_STATUS_RTC = {
  CORRETO: 'coerente com a tabela oficial',
  REVISAO_MANUAL: 'revisão manual',
  CST_CCLASSTRIB_INCOMPATIVEL: 'CST incompatível com o cClassTrib',
  BENEFICIO_NAO_APLICADO: 'benefício não aplicado',
  BENEFICIO_APLICADO_INDEVIDAMENTE: 'benefício aplicado indevidamente',
  REDUCAO_INCORRETA: 'percentual de redução incorreto',
  CALCULO_IBS_INCORRETO: 'cálculo do IBS incorreto',
  CALCULO_CBS_INCORRETO: 'cálculo do CBS incorreto',
};

// Conferência do XML_REFORMA_VALIDATOR (tax-engine/rtc-xml-validator): ao
// contrário de textoReformaItem (que só mostra o que o XML declara), aqui
// mostra o RESULTADO da comparação com a tabela oficial de tratamentos —
// só existe quando o grupo IBSCBS está presente no item.
function textoValidacaoReformaItem(validacao) {
  if (!validacao) return '<span class="hint">Sem grupo IBS/CBS no item — nada a conferir aqui.</span>';
  const classeBadge = validacao.status === 'CORRETO' ? 'badge-situacao-ok' : validacao.status === 'REVISAO_MANUAL' ? 'badge-situacao-inconsistente' : 'badge-erro';
  const badge = `<span class="badge ${classeBadge}">${ROTULO_STATUS_RTC[validacao.status] || validacao.status}</span>`;
  const divergencias = (validacao.divergencias || []).map((d) => `<div class="destaque-erro">${d}</div>`).join('');
  const notas = (validacao.notas || []).map((n) => `<div class="hint">${n}</div>`).join('');
  return `<div class="reforma-info">${badge}${divergencias}${notas}</div>`;
}

const ROTULO_STATUS_RTC_DOCUMENTO = {
  CORRETO: 'coerente',
  REVISAO_MANUAL: 'revisão manual',
  DIVERGENTE: 'divergências encontradas',
  TOTAL_REFORMA_DIVERGENTE: 'total do documento diverge',
};

function badgeValidacaoReformaDocumento(validacaoReforma) {
  if (!validacaoReforma || validacaoReforma.status === null) {
    return '<span class="hint">Sem itens com grupo IBS/CBS neste documento.</span>';
  }
  const classe =
    validacaoReforma.status === 'CORRETO'
      ? 'badge-situacao-ok'
      : validacaoReforma.status === 'REVISAO_MANUAL'
        ? 'badge-situacao-inconsistente'
        : 'badge-erro';
  return `<span class="badge ${classe}">${ROTULO_STATUS_RTC_DOCUMENTO[validacaoReforma.status] || validacaoReforma.status}</span>`;
}

// Aba "Itens" — dados centrais do item, sem as colunas de conferência (que
// foram pra suas próprias abas) pra não precisar rolar a tabela pros lados
// só pra ver produto/NCM/valor.
function construirAbaItens(doc) {
  const linhas = doc.itens
    .map(
      (item) => `
        <tr>
          <td>${item.codigo}<br><span class="hint">${item.descricao}</span></td>
          <td>${item.ncm || '-'}</td>
          <td>${item.cfop || '-'}</td>
          <td>${item.quantidade}</td>
          <td>${formatMoney(item.valorProduto)}</td>
          <td>${formatMoney(item.icms.valor)} <span class="hint">(CST ${item.icms.cst ?? '-'} · BC ${formatMoney(item.icms.baseCalculo)})</span></td>
          <td>${formatMoney(item.pis.valor + item.cofins.valor)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>NCM</th>
            <th>CFOP</th>
            <th>Qtd.</th>
            <th>Valor</th>
            <th>ICMS</th>
            <th>PIS+COFINS</th>
          </tr>
        </thead>
        <tbody>${linhas || '<tr class="empty-row"><td colspan="7">Documento sem itens.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// Aba "Divergências" — junta num só lugar o que o Motor de Validação
// Matemática e o XML_REFORMA_VALIDATOR encontraram de errado, item a item
// e depois os totais do documento. Itens sem nenhum problema não aparecem
// aqui — só o que precisa de atenção.
function construirAbaDivergencias(doc) {
  const blocos = [];

  doc.itens.forEach((item, indice) => {
    const linhasItem = [];
    const calc = doc.validacaoMatematica?.itens?.[indice];
    if (calc) {
      for (const campo of ['produto', 'icms', 'pis', 'cofins']) {
        const c = calc[campo];
        if (c && c.status !== 'CORRETO') {
          const rotuloArredondamento = c.status === 'DIVERGENCIA_ARREDONDAMENTO' ? ' <span class="hint">(diferença de arredondamento)</span>' : '';
          linhasItem.push(`<li><strong>${ROTULO_CAMPO_CALCULO[campo]}</strong>: informado ${formatMoney(c.xml)}, esperado ${formatMoney(c.esperado)}${rotuloArredondamento}</li>`);
        }
      }
    }
    const rtc = doc.validacaoReforma?.itens?.[indice]?.validacao;
    if (rtc?.divergencias?.length) {
      for (const d of rtc.divergencias) linhasItem.push(`<li>${d}</li>`);
    }
    if (linhasItem.length) {
      blocos.push(`
        <div class="divergencia-bloco">
          <h4>${item.codigo} — ${item.descricao}</h4>
          <ul>${linhasItem.join('')}</ul>
        </div>
      `);
    }
  });

  const linhasTotais = [];
  const totais = doc.validacaoMatematica?.totais;
  if (totais) {
    for (const [campo, rotulo] of Object.entries(ROTULO_TOTAL_CALCULO)) {
      const t = totais[campo];
      if (t && t.status !== 'CORRETO') {
        linhasTotais.push(`<li><strong>${rotulo}</strong>: soma dos itens ${formatMoney(t.somaItens)}, total informado ${formatMoney(t.totalDocumento)}</li>`);
      }
    }
  }
  if (doc.validacaoReforma?.divergenciasTotais?.length) {
    for (const d of doc.validacaoReforma.divergenciasTotais) linhasTotais.push(`<li>${d}</li>`);
  }
  if (linhasTotais.length) {
    blocos.push(`
      <div class="divergencia-bloco">
        <h4>Totais do documento</h4>
        <ul>${linhasTotais.join('')}</ul>
      </div>
    `);
  }

  if (!blocos.length) {
    return '<p class="hint">Nenhuma divergência encontrada neste documento — cálculos batem e, onde há grupo IBS/CBS, está coerente com a tabela oficial.</p>';
  }
  return blocos.join('');
}

// Aba "Reforma Tributária" — os campos que o XML declara (CST, cClassTrib,
// cBenef, BC, IBS, CBS) lado a lado com o resultado da conferência contra a
// tabela oficial (XML_REFORMA_VALIDATOR), item a item.
function construirAbaReforma(doc) {
  const linhas = doc.itens
    .map((item, indice) => {
      const reformaTexto = textoReformaItem(item.reformaTributaria);
      const validacaoRtcTexto = textoValidacaoReformaItem(doc.validacaoReforma?.itens?.[indice]?.validacao || null);
      return `
        <tr>
          <td>${item.codigo}<br><span class="hint">${item.descricao}</span></td>
          <td class="reforma-col">${reformaTexto}</td>
          <td class="reforma-col">${validacaoRtcTexto}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Campos da Reforma (XML)</th>
            <th>Conferência RTC (CST × cClassTrib)</th>
          </tr>
        </thead>
        <tbody>${linhas || '<tr class="empty-row"><td colspan="3">Documento sem itens.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function ativarAbaModal(nomeAba) {
  els.docModalCorpo.querySelectorAll('.tab-button').forEach((botao) => {
    botao.classList.toggle('tab-button-ativo', botao.dataset.tab === nomeAba);
  });
  els.docModalCorpo.querySelectorAll('.tab-panel').forEach((painel) => {
    painel.hidden = painel.dataset.tabPanel !== nomeAba;
  });
}

// Conta quantos itens (+ os totais do documento, como um "item" a mais)
// têm alguma divergência — usado só pro número entre parênteses na aba,
// pra dar uma ideia do tamanho do problema antes de clicar.
function contarItensComDivergencia(doc) {
  const itensComProblema = doc.itens.filter((_, indice) => {
    const calc = doc.validacaoMatematica?.itens?.[indice];
    const temCalc = calc && ['produto', 'icms', 'pis', 'cofins'].some((c) => calc[c] && calc[c].status !== 'CORRETO');
    const temRtc = (doc.validacaoReforma?.itens?.[indice]?.validacao?.divergencias?.length || 0) > 0;
    return temCalc || temRtc;
  }).length;

  const totaisComProblema =
    Object.values(doc.validacaoMatematica?.totais || {}).some((t) => t.status !== 'CORRETO') ||
    (doc.validacaoReforma?.divergenciasTotais?.length || 0) > 0;

  return itensComProblema + (totaisComProblema ? 1 : 0);
}

function abrirModalDocumento(doc) {
  els.docModalTitulo.textContent = `${doc.tipoDocumento} nº ${doc.numero} — série ${doc.serie}`;
  const totalDivergencias = contarItensComDivergencia(doc);

  els.docModalCorpo.innerHTML = `
    <dl>
      <dt>Situação</dt><dd><span class="badge badge-situacao-${doc.situacao}">${ROTULO_SITUACAO[doc.situacao]}</span></dd>
      <dt>Validação matemática</dt><dd>${badgeValidacaoCalculo(doc.validacaoMatematica)}</dd>
      <dt>Conferência RTC (IBS/CBS)</dt><dd>${badgeValidacaoReformaDocumento(doc.validacaoReforma)}</dd>
      <dt>Chave de acesso</dt><dd>${doc.chave || '-'}</dd>
      <dt>Emissão</dt><dd>${formatDate(doc.dataEmissao)}</dd>
      <dt>Natureza da operação</dt><dd>${doc.naturezaOperacao || '-'}</dd>
      <dt>Emitente</dt><dd>${doc.emitente.nome || '-'} (${doc.emitente.cnpj || '-'})</dd>
      <dt>Destinatário</dt><dd>${doc.destinatario.nome || '-'} (${doc.destinatario.cnpj || '-'})</dd>
      <dt>Valor total</dt><dd>${formatMoney(doc.valorTotal)}</dd>
      <dt>ICMS total</dt><dd>${formatMoney(doc.valorIcmsTotal)}</dd>
    </dl>

    <div class="tabs">
      <button type="button" class="tab-button tab-button-ativo" data-tab="itens">Itens (${doc.itens.length})</button>
      <button type="button" class="tab-button" data-tab="divergencias">Divergências${totalDivergencias ? ` (${totalDivergencias})` : ''}</button>
      <button type="button" class="tab-button" data-tab="reforma">Reforma Tributária</button>
    </div>

    <div class="tab-panel" data-tab-panel="itens">${construirAbaItens(doc)}</div>
    <div class="tab-panel" data-tab-panel="divergencias" hidden>${construirAbaDivergencias(doc)}</div>
    <div class="tab-panel" data-tab-panel="reforma" hidden>${construirAbaReforma(doc)}</div>

    <p class="hint" style="margin-top: 16px;">Esta é a informação já processada a partir do XML — o arquivo XML original não fica guardado, só os dados extraídos dele.</p>
  `;

  els.docModalCorpo.querySelectorAll('.tab-button').forEach((botao) => {
    botao.addEventListener('click', () => ativarAbaModal(botao.dataset.tab));
  });

  els.docModalOverlay.hidden = false;
}

function fecharModal() {
  els.docModalOverlay.hidden = true;
}

function renderSequencia(grupos) {
  els.sequencePanel.hidden = false;
  els.sequenceTableBody.innerHTML = '';
  if (!grupos.length) {
    els.sequenceTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum documento de saída no período.</td></tr>';
    return false;
  }
  let temQuebra = false;
  for (const g of grupos) {
    if (g.temQuebra) temQuebra = true;
    const faltando = g.faixasFaltantes.map((f) => (f.inicio === f.fim ? f.inicio : `${f.inicio}-${f.fim}`)).join(', ') || '—';
    const tr = document.createElement('tr');
    tr.className = g.temQuebra ? 'row-gap' : 'row-ok';
    tr.innerHTML = `
      <td>${g.emitNome}</td>
      <td>${g.tipoDocumento}</td>
      <td>${g.serie}</td>
      <td>${g.menorNumero} - ${g.maiorNumero}</td>
      <td>${g.totalEncontrado} / ${g.totalEsperado}</td>
      <td>${g.totalCanceladas}</td>
      <td>${faltando}</td>
    `;
    els.sequenceTableBody.appendChild(tr);
  }
  return temQuebra;
}

const TAX_PAGE_SIZE = 20;
let produtosCarregados = [];
let paginaTaxAtual = 1;

function renderPaginacao(container, paginaAtual, totalItens, tamanhoPagina, aoMudar) {
  container.innerHTML = '';
  const totalPaginas = Math.max(1, Math.ceil(totalItens / tamanhoPagina));
  if (totalPaginas <= 1) return;

  const btnAnterior = document.createElement('button');
  btnAnterior.type = 'button';
  btnAnterior.textContent = '← Anterior';
  btnAnterior.disabled = paginaAtual === 1;
  btnAnterior.addEventListener('click', () => aoMudar(paginaAtual - 1));

  const btnProxima = document.createElement('button');
  btnProxima.type = 'button';
  btnProxima.textContent = 'Próxima →';
  btnProxima.disabled = paginaAtual === totalPaginas;
  btnProxima.addEventListener('click', () => aoMudar(paginaAtual + 1));

  const info = document.createElement('span');
  info.textContent = `Página ${paginaAtual} de ${totalPaginas} (${totalItens} itens)`;

  container.append(btnAnterior, info, btnProxima);
}

function renderTributos(meses) {
  produtosCarregados = meses.flatMap((m) => m.produtos);
  paginaTaxAtual = 1;
  els.taxPanel.hidden = false;
  renderPaginaTax();
}

function renderPaginaTax() {
  els.taxTableBody.innerHTML = '';
  if (!produtosCarregados.length) {
    els.taxTableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Sem itens no período para cruzar.</td></tr>';
    els.taxPagination.innerHTML = '';
    return;
  }

  const inicio = (paginaTaxAtual - 1) * TAX_PAGE_SIZE;
  const pagina = produtosCarregados.slice(inicio, inicio + TAX_PAGE_SIZE);
  for (const p of pagina) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.descricaoExemplo}<br><span class="hint">${p.ncm || 'sem NCM'}</span></td>
      <td>${p.entrada.quantidade}</td>
      <td>${p.saida.quantidade}</td>
      <td>${p.saldoQuantidade}</td>
      <td>${formatMoney(p.entrada.valorIcms)}</td>
      <td>${formatMoney(p.saida.valorIcms)}</td>
      <td>${formatMoney(p.entrada.valorPis + p.entrada.valorCofins)}</td>
      <td>${formatMoney(p.saida.valorPis + p.saida.valorCofins)}</td>
    `;
    els.taxTableBody.appendChild(tr);
  }

  renderPaginacao(els.taxPagination, paginaTaxAtual, produtosCarregados.length, TAX_PAGE_SIZE, (novaPagina) => {
    paginaTaxAtual = novaPagina;
    renderPaginaTax();
  });
}

const ROTULO_REGIME = {
  simples_nacional: 'Simples Nacional',
  mei: 'MEI',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
};

function renderReforma(reforma, cliente) {
  els.reformaSummaryPanel.hidden = false;
  els.reformaPanel.hidden = false;
  els.reformaDataCorte.textContent = formatDate(reforma.dataCorte);

  const regime = cliente?.regimeTributario;
  if (regime) {
    els.reformaRegimeInfo.textContent = `Regime tributário deste cliente: ${ROTULO_REGIME[regime] || regime} — prazo usado: ${formatDate(reforma.dataCorte)}.`;
  } else {
    els.reformaRegimeInfo.innerHTML =
      '<strong>Regime tributário não informado</strong> pra esse cliente — usando o prazo padrão (01/2026). Se ele for optante do Simples Nacional ou MEI, o prazo real é 01/2027; edite o cadastro do cliente (botão "✎ Editar cliente") pra informar o regime e corrigir essa checagem.';
  }

  els.reformaTotalAnalisados.textContent = reforma.totais.totalDocumentosAnalisados;
  els.reformaConformes.textContent = reforma.totais.conformes;
  els.reformaParciais.textContent = reforma.totais.parciais;
  els.reformaSemAdequacao.textContent = reforma.totais.semAdequacao;

  els.reformaParciaisCard.classList.toggle('alerta-leve', reforma.totais.parciais > 0);
  els.reformaSemAdequacaoCard.classList.toggle('alerta', reforma.totais.semAdequacao > 0);

  els.reformaResumoTableBody.innerHTML = '';
  if (!reforma.resumoPorEmitente.length) {
    els.reformaResumoTableBody.innerHTML =
      '<tr class="empty-row"><td colspan="5">Nenhum documento emitido desde a vigência da reforma no período.</td></tr>';
  }
  for (const r of reforma.resumoPorEmitente) {
    const tr = document.createElement('tr');
    if (r.semAdequacao > 0) tr.className = 'row-gap';
    else if (r.parciais > 0) tr.className = 'row-pendente';
    else tr.className = 'row-ok';
    tr.innerHTML = `
      <td>${r.emitNome || r.emitCnpj}</td>
      <td>${r.totalDocumentos}</td>
      <td>${r.conformes}</td>
      <td>${r.parciais}</td>
      <td>${r.semAdequacao}</td>
    `;
    els.reformaResumoTableBody.appendChild(tr);
  }
}

function csvEscape(valor) {
  const texto = String(valor ?? '');
  if (/["\n;]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

function linhaCsv(campos) {
  return campos.map(csvEscape).join(';');
}

function baixarArquivo(nomeArquivo, conteudo) {
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Resume, por item, quais campos da reforma tributária estão faltando num
// documento "inconsistente" — mesma lógica de textoReformaItem, mas em
// texto simples pra caber numa célula de planilha.
function motivoInconsistencia(doc) {
  if (doc.situacao === 'cancelada') return 'Documento cancelado';
  let semGrupo = 0;
  let semCst = 0;
  let semClassTrib = 0;
  const total = doc.itens.length;
  for (const item of doc.itens) {
    const r = item.reformaTributaria;
    if (!r?.presente) {
      semGrupo += 1;
      continue;
    }
    if (!preenchido(r.cst)) semCst += 1;
    if (!preenchido(r.classTrib)) semClassTrib += 1;
  }
  const partes = [];
  if (semGrupo) partes.push(`${semGrupo}/${total} item(ns) sem grupo IBS/CBS`);
  if (semCst) partes.push(`${semCst}/${total} sem CST`);
  if (semClassTrib) partes.push(`${semClassTrib}/${total} sem Classificação Tributária`);
  return partes.join('; ') || 'Ver detalhe no documento';
}

function exportarAvisos() {
  if (!ultimoPainel) {
    setStatus('Busque os dados de um cliente antes de exportar os avisos.', true);
    return;
  }

  const cliente = ultimoPainel.cliente;
  const { dataInicio, dataFim } = ultimoPainel.periodo;
  const linhas = [];
  linhas.push(linhaCsv([`Avisos - ${cliente?.nome || cliente?.cnpj || ''}`]));
  linhas.push(linhaCsv([`Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`]));
  linhas.push('');

  const gruposComQuebra = (ultimoPainel.sequence?.grupos || []).filter((g) => g.temQuebra);
  linhas.push(linhaCsv(['QUEBRAS DE SEQUÊNCIA']));
  linhas.push(
    linhaCsv(['Emitente', 'Tipo', 'Série', 'Menor Número', 'Maior Número', 'Total Esperado', 'Total Encontrado', 'Canceladas', 'Faixas Faltantes'])
  );
  if (!gruposComQuebra.length) {
    linhas.push(linhaCsv(['Nenhuma quebra de sequência encontrada no período.']));
  } else {
    for (const g of gruposComQuebra) {
      const faltando = g.faixasFaltantes.map((f) => (f.inicio === f.fim ? f.inicio : `${f.inicio}-${f.fim}`)).join(', ');
      linhas.push(
        linhaCsv([g.emitNome, g.tipoDocumento, g.serie, g.menorNumero, g.maiorNumero, g.totalEsperado, g.totalEncontrado, g.totalCanceladas, faltando])
      );
    }
  }
  linhas.push('');

  const documentosInconsistentes = documentosCarregados.filter((d) => d.situacao === 'inconsistente');
  linhas.push(linhaCsv(['DOCUMENTOS INCONSISTENTES (REFORMA TRIBUTÁRIA - IBS/CBS)']));
  linhas.push(linhaCsv(['Tipo', 'Número', 'Série', 'Data Emissão', 'Direção', 'Emitente', 'Destinatário', 'Valor Total', 'Motivo']));
  if (!documentosInconsistentes.length) {
    linhas.push(linhaCsv(['Nenhum documento inconsistente encontrado no período.']));
  } else {
    for (const d of documentosInconsistentes) {
      linhas.push(
        linhaCsv([
          d.tipoDocumento,
          d.numero,
          d.serie,
          formatDate(d.dataEmissao),
          d.operacao,
          d.emitente.nome || d.emitente.cnpj,
          d.destinatario.nome || d.destinatario.cnpj,
          formatMoney(d.valorTotal),
          motivoInconsistencia(d),
        ])
      );
    }
  }

  const nomeArquivo = `avisos_${cliente?.cnpj || 'cliente'}_${dataInicio}_a_${dataFim}.csv`;
  baixarArquivo(nomeArquivo, linhas.join('\n'));
  setStatus(`Avisos exportados: ${gruposComQuebra.length} quebra(s) de sequência, ${documentosInconsistentes.length} documento(s) inconsistente(s).`);
}

const POLL_INTERVALO_MS = 2000;
// Cada tentativa já busca um pedaço de verdade, mas o rate limit real da
// SIEG (2 requisições/minuto pra baixar XMLs) faz cada uma poder levar até
// ~45s — clientes com bastante volume (ex.: muitas vendas NFCe em 15 dias)
// podem precisar de dezenas de páginas só pra um tipo/direção. 60 tentativas
// (~2-8min) se mostrou insuficiente num caso real; 150 dá mais margem sem
// prender a aba por horas.
const POLL_MAX_TENTATIVAS = 150;

// Cada chamada a /api/painel avança um pedaço de verdade da busca (um tipo
// de documento x direção por vez) e guarda o progresso no Supabase — este
// loop repete a chamada até o backend responder "pronto", sem depender de
// nenhum mecanismo de "segundo plano" pra terminar o que não coube dentro
// do tempo de execução de uma única requisição.
async function buscarPainelComEspera(query) {
  for (let tentativa = 0; tentativa < POLL_MAX_TENTATIVAS; tentativa += 1) {
    // "_" garante uma URL diferente a cada tentativa, pra nenhum cache
    // (navegador, CDN etc.) devolver uma resposta antiga em vez de deixar a
    // busca avançar de verdade no servidor.
    const painel = await apiGet(`/api/painel?${query}&_=${Date.now()}`);
    if (painel.status === 'pronto') return painel;
    if (painel.status === 'erro') throw new Error(painel.erro || 'Falha ao buscar dados na SIEG.');
    const progresso = painel.progresso ? ` (${painel.progresso} concluído` : '';
    const detalhe = painel.documentosNoComboAtual ? `, ${painel.documentosNoComboAtual} documentos já baixados no tipo atual` : '';
    const ateData = painel.dataMaisRecenteBaixada ? `, já chegou até ${formatDate(painel.dataMaisRecenteBaixada)}` : '';
    const fechaParenteses = progresso ? ')' : '';
    // Erros transitórios (ex.: 429 da SIEG) não interrompem o polling — só
    // avisam, já que a próxima tentativa já tenta de novo sozinha.
    const aviso = painel.avisoTransitorio ? ' Aguardando a SIEG liberar (limite temporário atingido), tentando de novo automaticamente.' : '';
    setStatus(
      `Buscando na SIEG...${progresso}${detalhe}${ateData}${fechaParenteses} — isso pode levar alguns minutos dependendo do volume.${aviso}`,
      false,
      true
    );
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVALO_MS));
  }
  throw new Error(
    'A busca ainda não terminou, mas o progresso já foi salvo — clique em "Buscar" de novo pra continuar de onde parou (não recomeça do zero). Pra clientes com bastante volume, tente também um período mais curto (poucos dias por vez).'
  );
}

function periodoValido() {
  return Boolean(els.dataInicioInput.value && els.dataFimInput.value);
}

function montarQueryPeriodo() {
  return `inicio=${encodeURIComponent(els.dataInicioInput.value)}&fim=${encodeURIComponent(els.dataFimInput.value)}`;
}

let ultimoPainel = null;

async function atualizar() {
  const cnpj = els.clienteSelect.value;
  const tipo = els.tipoDocSelect.value;
  if (!cnpj) {
    setStatus('Cadastre ou selecione um cliente primeiro.', true);
    return;
  }
  if (!periodoValido()) {
    setStatus('Preencha as datas "De" e "Até" para filtrar.', true);
    return;
  }

  els.btnAtualizar.disabled = true;
  setStatus('Buscando na SIEG...', false, true);
  try {
    const query = `cnpj=${encodeURIComponent(cnpj)}&${montarQueryPeriodo()}&tipo=${encodeURIComponent(tipo)}`;
    const painel = await buscarPainelComEspera(query);
    ultimoPainel = painel;

    renderDocumentos(painel.xmls.documentos);
    const temQuebra = renderSequencia(painel.sequence.grupos);
    renderTributos(painel.tax.meses);
    renderReforma(painel.reforma, painel.cliente);
    renderResumo(painel.xmls, temQuebra);
    renderValores(painel.valores);

    setStatus(`Atualizado às ${new Date().toLocaleTimeString('pt-BR')}.`);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    els.btnAtualizar.disabled = false;
  }
}

let modoModalCliente = 'adicionar';

function checkboxesAtividade() {
  return [...document.querySelectorAll('.novo-cliente-atividade')];
}

function lerAtividadeSelecionada() {
  return checkboxesAtividade()
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

function marcarAtividade(atividade) {
  const selecionadas = new Set(atividade || []);
  for (const cb of checkboxesAtividade()) cb.checked = selecionadas.has(cb.value);
}

function abrirModalCliente() {
  modoModalCliente = 'adicionar';
  els.clienteModalTitulo.textContent = 'Cadastrar cliente';
  els.btnAdicionarCliente.textContent = 'Adicionar';
  els.clienteModalErro.hidden = true;
  els.novoClienteCnpj.value = '';
  els.novoClienteCnpj.disabled = false;
  els.novoClienteNome.value = '';
  els.novoClienteRegime.value = '';
  marcarAtividade([]);
  els.novoClienteSegmento.value = '';
  els.clienteModalOverlay.hidden = false;
}

function abrirModalEdicaoCliente() {
  const cnpj = els.clienteSelect.value;
  if (!cnpj) {
    setStatus('Selecione um cliente pra editar primeiro.', true);
    return;
  }
  const cliente = clientesCarregados.find((c) => c.cnpj === cnpj);
  if (!cliente) return;

  modoModalCliente = 'editar';
  els.clienteModalTitulo.textContent = 'Editar cliente';
  els.btnAdicionarCliente.textContent = 'Salvar';
  els.clienteModalErro.hidden = true;
  els.novoClienteCnpj.value = cliente.cnpj;
  els.novoClienteCnpj.disabled = true;
  els.novoClienteNome.value = cliente.nome || '';
  els.novoClienteRegime.value = cliente.regimeTributario || '';
  marcarAtividade(cliente.atividade);
  els.novoClienteSegmento.value = cliente.segmento || '';
  els.clienteModalOverlay.hidden = false;
}

function fecharModalCliente() {
  els.clienteModalOverlay.hidden = true;
  els.novoClienteCnpj.disabled = false;
}

async function adicionarCliente() {
  const cnpj = els.novoClienteCnpj.value.replace(/\D/g, '');
  const nome = els.novoClienteNome.value.trim();
  const regimeTributario = els.novoClienteRegime.value || null;
  const atividade = lerAtividadeSelecionada();
  const segmento = els.novoClienteSegmento.value.trim() || null;
  els.clienteModalErro.hidden = true;
  if (cnpj.length !== 14) {
    els.clienteModalErro.textContent = 'Informe um CNPJ com 14 dígitos para cadastrar o cliente.';
    els.clienteModalErro.hidden = false;
    return;
  }
  try {
    if (modoModalCliente === 'editar') {
      await apiPatch(`/api/clients/${cnpj}`, { nome, regimeTributario, atividade, segmento });
      await carregarClientes(cnpj);
      fecharModalCliente();
      setStatus('Cliente atualizado.');
    } else {
      await apiPost('/api/clients', { cnpj, nome, regimeTributario, atividade, segmento });
      await carregarClientes(cnpj);
      fecharModalCliente();
      setStatus('Cliente adicionado.');
    }
  } catch (err) {
    els.clienteModalErro.textContent = err.message;
    els.clienteModalErro.hidden = false;
  }
}

function renderReconciliation(resultado) {
  els.reconciliationSummaryPanel.hidden = false;
  els.reconciliationResumoPanel.hidden = false;
  els.reconciliationDetailPanel.hidden = false;

  els.reconTotalPareados.textContent = resultado.totalPareados - resultado.totalDivergentes;
  els.reconTotalDivergentes.textContent = resultado.totalDivergentes;
  els.reconTotalSomenteSieg.textContent = resultado.somenteSieg.length;
  els.reconTotalSomenteDominio.textContent = resultado.somenteDominio.length;

  els.reconDivergentesCard.classList.toggle('alerta', resultado.totalDivergentes > 0);
  els.reconSomenteSiegCard.classList.toggle('alerta-leve', resultado.somenteSieg.length > 0);
  els.reconSomenteDominioCard.classList.toggle('alerta-leve', resultado.somenteDominio.length > 0);

  els.reconResumoTableBody.innerHTML = '';
  for (const m of resultado.resumoPorMes) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.mes}</td>
      <td>${formatMoney(m.sieg.entrada)}</td>
      <td>${formatMoney(m.dominio.entrada)}</td>
      <td>${formatMoney(m.diferenca.entrada)}</td>
      <td>${formatMoney(m.sieg.saida)}</td>
      <td>${formatMoney(m.dominio.saida)}</td>
      <td>${formatMoney(m.diferenca.saida)}</td>
    `;
    els.reconResumoTableBody.appendChild(tr);
  }

  const linhas = [
    ...resultado.pareados
      .filter((p) => p.divergente)
      .map((p) => ({ situacao: 'divergente', rowClass: 'row-divergente', badge: 'Valor diferente', ...p })),
    ...resultado.somenteSieg.map((d) => ({
      situacao: 'pendente',
      rowClass: 'row-pendente',
      badge: 'Pendente no Domínio',
      numero: d.numero,
      serie: d.serie,
      operacao: d.operacao,
      dataEmissao: d.dataEmissao,
      sieg: { valorTotal: d.valorTotal },
      dominio: null,
    })),
    ...resultado.somenteDominio.map((d) => ({
      situacao: 'somente-dominio',
      rowClass: 'row-somente-dominio',
      badge: 'Sem XML na SIEG',
      numero: d.numero,
      serie: d.serie,
      operacao: d.operacao,
      dataEmissao: d.dataEmissao,
      sieg: null,
      dominio: { valorTotal: d.valorTotal },
    })),
  ].sort((a, b) => (a.dataEmissao || '').localeCompare(b.dataEmissao || ''));

  els.reconDetailTableBody.innerHTML = '';
  if (!linhas.length) {
    els.reconDetailTableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Nenhuma divergência ou pendência encontrada — tudo bateu.</td></tr>';
    return;
  }
  for (const l of linhas) {
    const tr = document.createElement('tr');
    tr.className = l.rowClass;
    const valorSieg = l.sieg ? formatMoney(l.sieg.valorTotal) : '—';
    const valorDominio = l.dominio ? formatMoney(l.dominio.valorTotal) : '—';
    const diferenca = l.sieg && l.dominio ? formatMoney(l.diffValorTotal) : '—';
    tr.innerHTML = `
      <td><span class="badge badge-${l.situacao === 'divergente' ? 'divergente' : l.situacao === 'pendente' ? 'pendente' : 'somente-dominio'}">${l.badge}</span></td>
      <td>${l.numero}</td>
      <td>${l.serie}</td>
      <td><span class="badge badge-${l.operacao}">${l.operacao}</span></td>
      <td>${formatDate(l.dataEmissao)}</td>
      <td>${valorSieg}</td>
      <td>${valorDominio}</td>
      <td>${diferenca}</td>
    `;
    els.reconDetailTableBody.appendChild(tr);
  }
}

async function conferirDominio() {
  const cnpj = els.clienteSelect.value;
  const arquivo = els.dominioFileInput.files[0];

  els.reconciliationStatus.classList.remove('error');

  if (!cnpj) {
    els.reconciliationStatus.textContent = 'Selecione um cliente primeiro.';
    return;
  }
  if (!periodoValido()) {
    els.reconciliationStatus.textContent = 'Preencha as datas "De" e "Até" no filtro acima primeiro.';
    return;
  }
  if (!arquivo) {
    els.reconciliationStatus.textContent = 'Escolha o arquivo exportado do Domínio (XLSX ou CSV).';
    return;
  }

  els.btnConferirDominio.disabled = true;
  els.reconciliationStatus.textContent = 'Buscando na SIEG... pode levar até 1 minuto por causa do limite de requisições da API.';
  try {
    const formData = new FormData();
    formData.append('cnpj', cnpj);
    formData.append('inicio', els.dataInicioInput.value);
    formData.append('fim', els.dataFimInput.value);
    formData.append('dominioFile', arquivo);

    const resultado = await apiPostForm('/api/reconciliation', formData);
    renderReconciliation(resultado);
    els.reconciliationStatus.textContent = `Conferido às ${new Date().toLocaleTimeString('pt-BR')} — ${resultado.totalSieg} docs na SIEG, ${resultado.totalDominio} no Domínio.`;
  } catch (err) {
    els.reconciliationStatus.classList.add('error');
    els.reconciliationStatus.textContent = err.message;
  } finally {
    els.btnConferirDominio.disabled = false;
  }
}

async function init() {
  els.dataInicioInput.value = primeiroDiaMesAtual();
  els.dataFimInput.value = ultimoDiaMesAtual();

  els.btnAtualizar.addEventListener('click', atualizar);
  els.btnAbrirCadastroCliente.addEventListener('click', abrirModalCliente);
  els.btnEditarCliente.addEventListener('click', abrirModalEdicaoCliente);
  els.btnExportarAvisos.addEventListener('click', exportarAvisos);
  els.btnAdicionarCliente.addEventListener('click', adicionarCliente);
  els.btnFecharModalCliente.addEventListener('click', fecharModalCliente);
  els.clienteModalOverlay.addEventListener('click', (evento) => {
    if (evento.target === els.clienteModalOverlay) fecharModalCliente();
  });
  els.btnConferirDominio.addEventListener('click', conferirDominio);
  els.situacaoFiltroSelect.addEventListener('change', () => {
    // Muda de dimensão de filtro (Situação em vez de um card) — limpa os
    // filtros de card pra não combinar e sumir com a lista sem explicação.
    filtroReformaAtivo = null;
    filtroCalculoAtivo = false;
    atualizarCardsReformaAtivos();
    paginaDocumentosAtual = 1;
    renderPaginaDocumentos();
  });
  els.reformaTotalAnalisadosCard.addEventListener('click', () => aplicarFiltroReforma('qualquer'));
  els.reformaConformesCard.addEventListener('click', () => aplicarFiltroReforma('conforme'));
  els.reformaParciaisCard.addEventListener('click', () => aplicarFiltroReforma('parcial'));
  els.reformaSemAdequacaoCard.addEventListener('click', () => aplicarFiltroReforma('sem_adequacao'));
  els.summaryDivergenciaCalculoCard.addEventListener('click', aplicarFiltroCalculo);
  els.btnLimparFiltroReforma.addEventListener('click', limparFiltroReforma);
  els.btnFecharModal.addEventListener('click', fecharModal);
  els.docModalOverlay.addEventListener('click', (evento) => {
    if (evento.target === els.docModalOverlay) fecharModal();
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      fecharModal();
      fecharModalCliente();
    }
  });

  try {
    await carregarClientes();
    if (!els.clienteSelect.value) setStatus('Nenhum cliente cadastrado ainda — clique em "+ Cadastrar cliente" acima.');
    // Não busca automaticamente ao carregar a página — cada busca na SIEG
    // consome a cota real de requisições, então só busca quando a pessoa
    // clicar em "Buscar" de propósito.
  } catch (err) {
    setStatus(`Não foi possível conectar ao backend: ${err.message}`, true);
  }
}

init();
