const els = {
  clienteSelect: document.getElementById('clienteSelect'),
  tipoDocSelect: document.getElementById('tipoDocSelect'),
  dataInicioInput: document.getElementById('dataInicioInput'),
  dataFimInput: document.getElementById('dataFimInput'),
  btnAtualizar: document.getElementById('btnAtualizar'),
  btnForcarAtualizacao: document.getElementById('btnForcarAtualizacao'),
  btnAbrirCadastroCliente: document.getElementById('btnAbrirCadastroCliente'),
  clientsTableBody: document.getElementById('clientsTableBody'),
  btnExportarAvisos: document.getElementById('btnExportarAvisos'),
  btnExportarExcel: document.getElementById('btnExportarExcel'),
  btnAuditoriaDados: document.getElementById('btnAuditoriaDados'),
  btnRelatorioNcm: document.getElementById('btnRelatorioNcm'),
  btnAuditoriaMotor: document.getElementById('btnAuditoriaMotor'),
  emptyStateBanner: document.getElementById('emptyStateBanner'),
  emptyStateDetalhe: document.getElementById('emptyStateDetalhe'),
  statusProgress: document.getElementById('statusProgress'),
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
  reformaDataCorte: document.getElementById('reformaDataCorte'),
  reformaRegimeInfo: document.getElementById('reformaRegimeInfo'),
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
  btnAtualizarConsolidado: document.getElementById('btnAtualizarConsolidado'),
  consolidadoResultado: document.getElementById('consolidadoResultado'),
  consolidadoFiltroCliente: document.getElementById('consolidadoFiltroCliente'),
  consolidadoFiltroDe: document.getElementById('consolidadoFiltroDe'),
  consolidadoFiltroAte: document.getElementById('consolidadoFiltroAte'),
  consolidadoClienteModalOverlay: document.getElementById('consolidadoClienteModalOverlay'),
  consolidadoClienteModalTitulo: document.getElementById('consolidadoClienteModalTitulo'),
  consolidadoClienteModalCorpo: document.getElementById('consolidadoClienteModalCorpo'),
  btnFecharModalConsolidadoCliente: document.getElementById('btnFecharModalConsolidadoCliente'),
  consolidadoDocsModalOverlay: document.getElementById('consolidadoDocsModalOverlay'),
  consolidadoDocsModalTitulo: document.getElementById('consolidadoDocsModalTitulo'),
  consolidadoDocsModalCorpo: document.getElementById('consolidadoDocsModalCorpo'),
  btnFecharModalConsolidadoDocs: document.getElementById('btnFecharModalConsolidadoDocs'),
  auditoriaResultado: document.getElementById('auditoriaResultado'),
  ncmResultado: document.getElementById('ncmResultado'),
  auditoriaMotorResultado: document.getElementById('auditoriaMotorResultado'),
  motorClienteModalOverlay: document.getElementById('motorClienteModalOverlay'),
  motorClienteModalTitulo: document.getElementById('motorClienteModalTitulo'),
  motorClienteModalCorpo: document.getElementById('motorClienteModalCorpo'),
  btnFecharModalMotorCliente: document.getElementById('btnFecharModalMotorCliente'),
  pageTitle: document.getElementById('pageTitle'),
  pageSubtitle: document.getElementById('pageSubtitle'),
  sharedToolbar: document.getElementById('sharedToolbar'),
};

// O front-end é servido pelo mesmo backend (mesma origem), tanto em dev
// local quanto na Vercel — não precisa apontar pra outro endereço.
function apiBase() {
  return '';
}

function setStatus(message, isError = false, isLoading = false, progressoPercentual = null) {
  els.statusText.textContent = message;
  els.statusBox.classList.toggle('error', isError);
  els.statusSpinner.hidden = !isLoading;
  els.statusProgress.hidden = progressoPercentual === null;
  if (progressoPercentual !== null) els.statusProgress.value = progressoPercentual;
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
  renderClientsTable();
}

function renderClientsTable() {
  if (!clientesCarregados.length) {
    els.clientsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum cliente cadastrado ainda.</td></tr>';
    return;
  }
  els.clientsTableBody.innerHTML = clientesCarregados
    .map((c) => {
      const regime = ROTULO_REGIME[c.regimeTributario] || '—';
      const atividade = (c.atividade || []).map((a) => ROTULO_ATIVIDADE[a] || a).join(', ') || '—';
      return `
        <tr>
          <td>${c.nome}</td>
          <td>${c.cnpj}</td>
          <td>${regime}</td>
          <td>${atividade}</td>
          <td>${c.segmento || '—'}</td>
          <td><button type="button" class="link-button" data-editar-cnpj="${c.cnpj}">✎ Editar</button></td>
        </tr>
      `;
    })
    .join('');
  els.clientsTableBody.querySelectorAll('[data-editar-cnpj]').forEach((botao) => {
    botao.addEventListener('click', () => abrirModalEdicaoCliente(botao.dataset.editarCnpj));
  });
}

function renderResumo({ totalDocumentos, totalEntrada, totalSaida, totalInconsistentes, totalDivergenciaCalculo }, totalFaltando) {
  els.summaryPanel.hidden = false;
  els.summaryTotal.textContent = totalDocumentos;
  els.summaryEntrada.textContent = totalEntrada;
  els.summarySaida.textContent = totalSaida;
  els.summaryGaps.textContent = totalFaltando;
  els.summaryGapsCard.classList.toggle('has-gaps', totalFaltando > 0);
  els.summaryGapsCard.classList.toggle('no-gaps', totalFaltando === 0);
  els.summaryInconsistentes.textContent = totalInconsistentes;
  // Mesmo tom (âmbar) do badge/linha "Inconsistente" na tabela de
  // documentos (badge-situacao-inconsistente/row-inconsistente) — antes
  // este card usava vermelho (mesma cor de "erro"/divergência real),
  // sugerindo uma gravidade maior do que a mesma situação recebe em
  // qualquer outro lugar da tela.
  els.summaryInconsistentesCard.classList.toggle('alerta-leve', totalInconsistentes > 0);
  els.summaryDivergenciaCalculo.textContent = totalDivergenciaCalculo;
  els.summaryDivergenciaCalculoCard.classList.toggle('alerta-leve', totalDivergenciaCalculo > 0);
}

// Diferencia "não tem nota emitida nesse período" (normal) de "algo deu
// errado" (que já teria caído no catch de atualizar() com uma mensagem de
// erro) — sem isso, os dois casos pareciam idênticos: todos os cards
// zerados, sem nenhuma explicação de qual dos dois é.
function renderEmptyState(totalDocumentos, cnpj, tipo, dataInicio, dataFim) {
  if (totalDocumentos > 0) {
    els.emptyStateBanner.hidden = true;
    return;
  }
  const cliente = clientesCarregados.find((c) => c.cnpj === cnpj);
  const rotuloTipo = els.tipoDocSelect.selectedOptions[0]?.textContent || 'documentos';
  els.emptyStateDetalhe.textContent =
    `${cliente?.nome || cnpj} · ${rotuloTipo} · ${formatDate(dataInicio)} a ${formatDate(dataFim)}. ` +
    'Confira se o tipo de documento e o período estão corretos, ou se o cliente realmente não emitiu/recebeu nada nessa janela.';
  els.emptyStateBanner.hidden = false;
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
function textoValidacaoReformaItem(validacao, situacaoReforma) {
  if (!validacao) {
    if (situacaoReforma === 'sem_adequacao' || situacaoReforma === 'parcial') {
      return '<span class="destaque-erro">Sem grupo IBS/CBS no item — documento emitido dentro da vigência da reforma.</span>';
    }
    return '<span class="hint">Sem grupo IBS/CBS no item — nada a conferir aqui.</span>';
  }
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

const ROTULO_STATUS_ICMS_DOCUMENTO = {
  CORRETO: 'coerente com NCM/CFOP/PIS-COFINS/cBenef',
  REVISAO_MANUAL: 'revisão manual',
  DIVERGENTE: 'divergências encontradas',
  SEM_BASE_CARREGADA: 'base de regras não carregada',
};

// Selo de status da conferência de ICMS/CFOP/CST (tax-engine/icms-engine) —
// sem isso, um documento sem nenhuma divergência real fica com a aba
// Divergências idêntica a antes desse motor existir, sem indicar que a
// conferência rodou. Mesmo padrão visual de badgeValidacaoCalculo/
// badgeValidacaoReformaDocumento, pra não parecer que só essa conferência
// "sumiu" quando está tudo certo.
function badgeConferenciaIcms(conferenciaIcms) {
  if (!conferenciaIcms) return '<span class="hint">Não avaliado (documento cancelado).</span>';
  const classe =
    conferenciaIcms.status === 'CORRETO'
      ? 'badge-situacao-ok'
      : conferenciaIcms.status === 'REVISAO_MANUAL'
        ? 'badge-situacao-inconsistente'
        : conferenciaIcms.status === 'SEM_BASE_CARREGADA'
          ? 'badge-desconhecida'
          : 'badge-erro';
  return `<span class="badge ${classe}">${ROTULO_STATUS_ICMS_DOCUMENTO[conferenciaIcms.status] || conferenciaIcms.status}</span>`;
}

// situacaoReforma vem de reformaTributariaAnalyzer.js: 'sem_adequacao'/
// 'parcial' significam que o documento já está sob a vigência da reforma
// e deveria ter os campos IBS/CBS, mas não tem — isso é uma inconsistência
// de verdade, não só "informação ausente", e precisa aparecer em vermelho
// igual ao resto do sistema (mesmo padrão da coluna "Situação").
function badgeValidacaoReformaDocumento(validacaoReforma, situacaoReforma) {
  if (!validacaoReforma || validacaoReforma.status === null) {
    if (situacaoReforma === 'sem_adequacao' || situacaoReforma === 'parcial') {
      return '<span class="destaque-erro">Sem itens com grupo IBS/CBS neste documento — emitido dentro da vigência da reforma.</span>';
    }
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
          <td>${formatMoney(item.icms.valor)} <span class="hint">(CST ${item.icms.cst ?? '-'} · ${item.icms.aliquota}%)</span></td>
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
// Agrupa as divergências estruturadas do tax-engine/icms-engine
// (campo/informado/esperado/mensagem/baseLegal) por assunto — tudo que veio
// de ICMS/CFOP/NCM/cBenef/ST num cartão, PIS/COFINS em outro — e monta uma
// "ficha de inconsistência fiscal" por cartão: uma linha por campo
// divergente (informado → esperado quando dá pra apontar um valor esperado
// específico, senão a frase completa) e uma linha de base legal ao final
// juntando as fontes citadas, sem repetir a mesma referência várias vezes.
const TITULO_GRUPO_DIVERGENCIA = { icms: 'Inconsistência Fiscal — ICMS/CFOP', pis_cofins: 'Inconsistência Fiscal — PIS/COFINS' };
const MOTOR_PARA_GRUPO = { ncm: 'icms', cfop: 'icms', icms_aliquota: 'icms', icms_cbenef: 'icms', icms_st: 'icms', icms_anexos: 'icms', pis_cofins: 'pis_cofins' };

function construirFichasInconsistenciaFiscal(divergenciasIcms) {
  if (!divergenciasIcms.length) return '';

  const porGrupo = new Map();
  for (const d of divergenciasIcms) {
    const grupo = MOTOR_PARA_GRUPO[d.motor] || 'icms';
    if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
    porGrupo.get(grupo).push(d);
  }

  const fichas = [];
  for (const [grupo, itens] of porGrupo) {
    const linhas = itens.map((d) => {
      const valor = d.esperado ? `<strong>${d.campo}</strong>: ${d.informado ?? '-'} → esperado ${d.esperado}` : `<strong>${d.campo}</strong>: ${d.mensagem}`;
      return `<div class="ficha-fiscal-linha ficha-fiscal-alerta">⚠ ${valor}</div>`;
    });
    const basesLegais = [...new Set(itens.map((d) => d.baseLegal).filter(Boolean))];
    if (basesLegais.length) {
      linhas.push(`<div class="ficha-fiscal-linha ficha-fiscal-info">ℹ Base legal: ${basesLegais.join('; ')}</div>`);
    }
    fichas.push(`
      <div class="ficha-fiscal">
        <div class="ficha-fiscal-titulo">⚠ ${TITULO_GRUPO_DIVERGENCIA[grupo] || 'Inconsistência Fiscal'}</div>
        ${linhas.join('')}
      </div>
    `);
  }
  return fichas.join('');
}

function construirAbaDivergencias(doc) {
  const blocos = [];
  let icmsSemBase = false;

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
    const divergenciaFiscal = doc.classificacaoMercadorias?.[indice]?.classificacao?.divergenciaFiscal;
    if (divergenciaFiscal) linhasItem.push(`<li>${divergenciaFiscal}</li>`);
    // Conferência de ICMS/CFOP/CST/PIS-COFINS (tax-engine/icms-engine):
    // compara o que o XML informou com o que a base de regras diz que
    // deveria ser — vira uma "ficha de inconsistência fiscal" por
    // assunto (ICMS/CFOP de um lado, PIS/COFINS de outro), campo a campo,
    // em vez de uma frase corrida só.
    const icmsItem = doc.conferenciaIcms?.itens?.[indice]?.conferencia;
    let fichasFiscais = '';
    if (icmsItem) {
      if (icmsItem.status === 'SEM_BASE_CARREGADA') icmsSemBase = true;
      fichasFiscais = construirFichasInconsistenciaFiscal(icmsItem.divergencias || []);
      // Pendências (ex.: "UF não disponível pra conferir alíquota") não são
      // divergência confirmada, mas também não devem ficar invisíveis — sem
      // isso, um item "revisão manual" parece idêntico a um item sem
      // nenhuma conferência rodando.
      for (const p of icmsItem.pendencias || []) linhasItem.push(`<li class="hint">${p}</li>`);
    }
    if (linhasItem.length || fichasFiscais) {
      blocos.push(`
        <div class="divergencia-bloco">
          <h4>${item.codigo} — ${item.descricao}</h4>
          ${linhasItem.length ? `<ul>${linhasItem.join('')}</ul>` : ''}
          ${fichasFiscais}
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

  const notaIcmsSemBase = icmsSemBase
    ? 'Conferência de ICMS/CFOP/CST ainda não disponível — a base de regras (CFOP/CST/alíquota por NCM) ainda não foi cadastrada.'
    : '';

  if (!blocos.length) {
    return `<p class="hint">Nenhuma divergência encontrada neste documento — cálculos batem e, onde há grupo IBS/CBS, está coerente com a tabela oficial.${notaIcmsSemBase ? ` ${notaIcmsSemBase}` : ''}</p>`;
  }
  if (notaIcmsSemBase) blocos.push(`<p class="hint">${notaIcmsSemBase}</p>`);
  return blocos.join('');
}

const ROTULO_STATUS_MERCADORIA = {
  CONFIRMADO_AUTOMATICO: 'confirmado',
  CANDIDATO_A_BENEFICIO: 'candidato a benefício',
  REVISAO_MANUAL: 'revisão manual',
  PROVAVEL_TRIBUTACAO_INTEGRAL: 'provável tributação integral',
};

// "origem" (goods-engine/classificarMercadoria.js) tem muito mais nuance de
// confiança do que os 4 valores de "status" sozinhos deixam ver — duas
// classificações com o mesmo status (ex.: CANDIDATO_A_BENEFICIO) podem vir
// de uma regra específica com fundamento legal citado, ou de um "chute" por
// falta de regra mapeada. Sem distinguir isso, as duas pareciam igualmente
// confiáveis na tela.
const ORIGENS_BAIXA_CONFIANCA = new Set(['regra_residual', 'regra_generica_sem_evidencia_suficiente', 'conflito_multiplos_candidatos']);

function tagConfiancaClassificacao(classificacao) {
  if (classificacao.fundamentoLegal) {
    return `<div class="tag-confianca tag-confianca-alta">✓ Regra com fundamento legal: ${classificacao.fundamentoLegal}</div>`;
  }
  if (ORIGENS_BAIXA_CONFIANCA.has(classificacao.origem) || !classificacao.origem) {
    return '<div class="tag-confianca tag-confianca-baixa">⚠ Sugestão automática sem regra específica mapeada — confira manualmente antes de aplicar.</div>';
  }
  return '';
}

// Sugestão do Motor de Mercadorias (tax-engine/goods-engine): o que o
// sistema determina que o item DEVERIA ter, a partir de NCM + descrição —
// antes e independente do que o XML realmente informou (isso é o próprio
// "Campos da Reforma (XML)", na coluna ao lado).
function textoClassificacaoMercadoria(classificacao) {
  if (!classificacao) return '<span class="hint">Não avaliado.</span>';
  const classeBadge =
    classificacao.status === 'CONFIRMADO_AUTOMATICO'
      ? 'badge-situacao-ok'
      : classificacao.status === 'PROVAVEL_TRIBUTACAO_INTEGRAL'
        ? 'badge-desconhecida'
        : 'badge-situacao-inconsistente';
  const badge = `<span class="badge ${classeBadge}">${ROTULO_STATUS_MERCADORIA[classificacao.status] || classificacao.status}</span>`;
  const confianca = tagConfiancaClassificacao(classificacao);
  const modulo = classificacao.modulo
    ? `<div><strong>Módulo:</strong> ${classificacao.modulo} ${classificacao.item ? `(item ${classificacao.item})` : ''}</div>`
    : '';
  const tratamento = classificacao.tratamentoSugerido ? `<div><strong>Tratamento sugerido:</strong> ${classificacao.tratamentoSugerido}</div>` : '';
  const codigos =
    preenchido(classificacao.cstSugerido) || preenchido(classificacao.cClassTribSugerido)
      ? `<div><strong>CST/ClassTrib sugeridos:</strong> ${formatarCodigoReforma(classificacao.cstSugerido, 3) || '-'} / ${formatarCodigoReforma(classificacao.cClassTribSugerido, 6) || '-'}</div>`
      : '';
  const pendencias = (classificacao.pendencias || []).map((p) => `<div class="reforma-aviso">${p}</div>`).join('');
  const notas = (classificacao.notas || []).map((n) => `<div class="hint">${n}</div>`).join('');
  return `<div class="reforma-info">${badge}${confianca}${modulo}${tratamento}${codigos}${pendencias}${notas}</div>`;
}

// Aba "Reforma Tributária" — três colunas lado a lado, na mesma ordem do
// princípio do motor tributário ("primeiro descobrir como deveria estar
// tributado, depois comparar com o documento"): o que o Motor de
// Mercadorias determina que DEVERIA ser, o que o XML realmente declara, e o
// resultado da conferência entre o XML e a tabela oficial.
function construirAbaReforma(doc) {
  const linhas = doc.itens
    .map((item, indice) => {
      const classificacaoTexto = textoClassificacaoMercadoria(doc.classificacaoMercadorias?.[indice]?.classificacao || null);
      const reformaTexto = textoReformaItem(item.reformaTributaria);
      const validacaoRtcTexto = textoValidacaoReformaItem(doc.validacaoReforma?.itens?.[indice]?.validacao || null, doc.situacaoReforma);
      return `
        <tr>
          <td>${item.codigo}<br><span class="hint">${item.descricao}</span></td>
          <td class="reforma-col">${classificacaoTexto}</td>
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
            <th>Sugestão do Motor de Mercadorias</th>
            <th>Campos da Reforma (XML)</th>
            <th>Conferência RTC (CST × cClassTrib)</th>
          </tr>
        </thead>
        <tbody>${linhas || '<tr class="empty-row"><td colspan="4">Documento sem itens.</td></tr>'}</tbody>
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
    const temFiscal = Boolean(doc.classificacaoMercadorias?.[indice]?.classificacao?.divergenciaFiscal);
    const temIcms = (doc.conferenciaIcms?.itens?.[indice]?.conferencia?.divergencias?.length || 0) > 0;
    return temCalc || temRtc || temFiscal || temIcms;
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
      <dt>Conferência RTC (IBS/CBS)</dt><dd>${badgeValidacaoReformaDocumento(doc.validacaoReforma, doc.situacaoReforma)}</dd>
      <dt>Conferência ICMS/CFOP/CST</dt><dd>${badgeConferenciaIcms(doc.conferenciaIcms)}</dd>
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

let consolidadoCarregado = false;
let ultimoConsolidado = null;
let consolidadoDirecaoAtiva = 'saida';

// Só lê o que já está cacheado (nunca busca ao vivo na SIEG) — cruza todos
// os clientes cadastrados de uma vez. A tabela é agrupada por cliente (não
// por cliente+dia); o filtro de cliente/período de cima aplica em cima do
// que já veio nessa chamada só, sem precisar buscar de novo.
async function carregarConsolidado() {
  consolidadoCarregado = true;
  els.consolidadoResultado.innerHTML = '<p class="hint">Carregando...</p>';
  try {
    const resultado = await apiGet('/api/cron/painel-consolidado');
    ultimoConsolidado = resultado;
    if (resultado.status === 'ignorado') {
      els.consolidadoResultado.innerHTML = `<p class="hint">${resultado.motivo}</p>`;
      return;
    }
    preencherFiltroClienteConsolidado(resultado.clientes);
    if (!els.consolidadoFiltroDe.value) els.consolidadoFiltroDe.value = resultado.periodo.dataInicio;
    if (!els.consolidadoFiltroAte.value) els.consolidadoFiltroAte.value = resultado.periodo.dataFim;
    renderConsolidadoTabela();
  } catch (err) {
    els.consolidadoResultado.innerHTML = `<p class="status error">${err.message}</p>`;
  }
}

function preencherFiltroClienteConsolidado(clientes) {
  const atual = els.consolidadoFiltroCliente.value;
  els.consolidadoFiltroCliente.innerHTML =
    '<option value="">Todos os clientes</option>' + clientes.map((c) => `<option value="${c.cnpj}">${c.nome}</option>`).join('');
  els.consolidadoFiltroCliente.value = atual;
}

function somarDias(dias) {
  return dias.reduce(
    (acc, d) => ({
      totalDocumentos: acc.totalDocumentos + d.totalDocumentos,
      conformes: acc.conformes + d.conformes,
      parciais: acc.parciais + d.parciais,
      semAdequacao: acc.semAdequacao + d.semAdequacao,
    }),
    { totalDocumentos: 0, conformes: 0, parciais: 0, semAdequacao: 0 }
  );
}

// Aplica o filtro de cliente/período por cima do que já foi buscado — o
// relatório já cobre os últimos 30 dias numa chamada só, então filtrar não
// precisa de nova ida ao servidor. Se nada bater, mostra que não achou.
// A aba ativa (Saídas/Entradas) decide qual lado do cliente ler — cada
// documento só conta de um lado (saída = ele emitiu, entrada = ele recebeu).
function renderConsolidadoTabela() {
  if (!ultimoConsolidado || ultimoConsolidado.status !== 'concluido') return;
  const cnpjFiltro = els.consolidadoFiltroCliente.value;
  const de = els.consolidadoFiltroDe.value;
  const ate = els.consolidadoFiltroAte.value;

  const clientesFiltrados = ultimoConsolidado.clientes
    .filter((c) => !cnpjFiltro || c.cnpj === cnpjFiltro)
    .map((c) => ({
      ...c,
      diasFiltrados: (c[consolidadoDirecaoAtiva]?.dias || []).filter((d) => (!de || d.dia >= de) && (!ate || d.dia <= ate)),
    }))
    .filter((c) => c.diasFiltrados.length > 0);

  if (!clientesFiltrados.length) {
    const rotulo = consolidadoDirecaoAtiva === 'saida' ? 'saídas' : 'entradas';
    els.consolidadoResultado.innerHTML = `<p class="hint">Nenhum documento de ${rotulo} encontrado no cache para esse cliente/período. Busque na aba "Conferência Fiscal" primeiro, ou tente outro período.</p>`;
    return;
  }

  const linhas = clientesFiltrados
    .map((c) => {
      const totais = somarDias(c.diasFiltrados);
      const pendente = totais.semAdequacao > 0 || totais.parciais > 0;
      return `
        <tr class="${pendente ? 'row-inconsistente' : 'row-ok'} row-clickable" data-cnpj="${c.cnpj}">
          <td>${c.nome}</td>
          <td>${c.diasFiltrados.length} dia(s)</td>
          <td>${totais.totalDocumentos}</td>
          <td>${totais.conformes}</td>
          <td>${totais.parciais}</td>
          <td>${totais.semAdequacao}</td>
        </tr>
      `;
    })
    .join('');

  els.consolidadoResultado.innerHTML = `
    <p class="hint">${clientesFiltrados.length} cliente(s) encontrado(s) no período. Clique numa linha pra ver os dias.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Cliente</th><th>Dias com dado</th><th>Documentos</th><th>Conformes</th><th>Parciais</th><th>Sem campos</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
  els.consolidadoResultado.querySelectorAll('tr[data-cnpj]').forEach((tr) => {
    tr.addEventListener('click', () => abrirConsolidadoCliente(tr.dataset.cnpj));
  });
}

function fecharModalConsolidadoCliente() {
  els.consolidadoClienteModalOverlay.hidden = true;
}

// Nível 2 do drill-down: dias encontrados daquele cliente (já em memória,
// sem nova chamada) — clicar num dia abre os documentos de verdade.
function abrirConsolidadoCliente(cnpj) {
  const cliente = ultimoConsolidado.clientes.find((c) => c.cnpj === cnpj);
  if (!cliente) return;
  const de = els.consolidadoFiltroDe.value;
  const ate = els.consolidadoFiltroAte.value;
  const dias = (cliente[consolidadoDirecaoAtiva]?.dias || []).filter((d) => (!de || d.dia >= de) && (!ate || d.dia <= ate));

  const rotuloDirecao = consolidadoDirecaoAtiva === 'saida' ? 'Saídas' : 'Entradas';
  els.consolidadoClienteModalTitulo.textContent = `${cliente.nome} — ${rotuloDirecao}`;
  const linhas = dias
    .map((d) => {
      const pendente = d.semAdequacao > 0 || d.parciais > 0;
      return `
        <tr class="${pendente ? 'row-inconsistente' : 'row-ok'} row-clickable" data-dia="${d.dia}">
          <td>${formatDate(d.dia)}</td>
          <td>${d.totalDocumentos}</td>
          <td>${d.conformes}</td>
          <td>${d.parciais}</td>
          <td>${d.semAdequacao}</td>
        </tr>
      `;
    })
    .join('');
  els.consolidadoClienteModalCorpo.innerHTML = `
    <p class="hint">Clique num dia pra ver os documentos encontrados naquele dia.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Dia</th><th>Documentos</th><th>Conformes</th><th>Parciais</th><th>Sem campos</th></tr></thead>
        <tbody>${linhas || '<tr class="empty-row"><td colspan="5">Nenhum dia no período filtrado.</td></tr>'}</tbody>
      </table>
    </div>
  `;
  els.consolidadoClienteModalCorpo.querySelectorAll('tr[data-dia]').forEach((tr) => {
    tr.addEventListener('click', () => abrirConsolidadoDocumentos(cnpj, tr.dataset.dia, cliente.nome));
  });
  els.consolidadoClienteModalOverlay.hidden = false;
}

function fecharModalConsolidadoDocs() {
  els.consolidadoDocsModalOverlay.hidden = true;
}

// Nível 3 do drill-down: os documentos de verdade daquele cliente/dia, só
// do cache (1 chamada leve) — clicar num documento abre o mesmo modal de
// detalhe completo (itens/divergências/reforma) usado na Conferência Fiscal.
async function abrirConsolidadoDocumentos(cnpj, dia, nomeCliente) {
  els.consolidadoDocsModalTitulo.textContent = `${nomeCliente} — ${formatDate(dia)}`;
  els.consolidadoDocsModalCorpo.innerHTML = '<p class="hint">Carregando...</p>';
  els.consolidadoDocsModalOverlay.hidden = false;
  try {
    const painel = await apiGet(`/api/cron/painel-consolidado/documentos?cnpj=${encodeURIComponent(cnpj)}&dia=${encodeURIComponent(dia)}`);
    if (painel.status === 'ignorado') {
      els.consolidadoDocsModalCorpo.innerHTML = `<p class="hint">${painel.motivo}</p>`;
      return;
    }
    const documentos = painel.xmls.documentos;
    if (!documentos.length) {
      els.consolidadoDocsModalCorpo.innerHTML = '<p class="hint">Nenhum documento encontrado.</p>';
      return;
    }
    const linhas = documentos
      .map(
        (d, indice) => `
          <tr class="row-${d.situacao} row-clickable" data-indice="${indice}">
            <td><span class="badge badge-situacao-${d.situacao}">${ROTULO_SITUACAO[d.situacao]}</span></td>
            <td><span class="badge badge-${d.operacao}">${d.operacao}</span></td>
            <td>${d.tipoDocumento}</td>
            <td>${d.numero}</td>
            <td>${formatDate(d.dataEmissao)}</td>
            <td>${formatMoney(d.valorTotal)}</td>
          </tr>
        `
      )
      .join('');
    els.consolidadoDocsModalCorpo.innerHTML = `
      <p class="hint">${documentos.length} documento(s). Clique numa linha pra ver o detalhe completo.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Situação</th><th>Operação</th><th>Tipo</th><th>Nº</th><th>Emissão</th><th>Valor</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
    els.consolidadoDocsModalCorpo.querySelectorAll('tr[data-indice]').forEach((tr) => {
      tr.addEventListener('click', () => {
        fecharModalConsolidadoDocs();
        abrirModalDocumento(documentos[Number(tr.dataset.indice)]);
      });
    });
  } catch (err) {
    els.consolidadoDocsModalCorpo.innerHTML = `<p class="status error">${err.message}</p>`;
  }
}

// Retorna quantos números de documento estão faltando no total (soma das
// faixas faltantes de todos os grupos) — é isso que o card "Quebra de
// Sequência" no resumo mostra, em vez de só "Sim/Não" como antes.
function renderSequencia(grupos) {
  els.sequencePanel.hidden = false;
  els.sequenceTableBody.innerHTML = '';
  if (!grupos.length) {
    els.sequenceTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum documento de saída no período.</td></tr>';
    return 0;
  }
  let totalFaltando = 0;
  for (const g of grupos) {
    const faltando = g.faixasFaltantes.map((f) => (f.inicio === f.fim ? f.inicio : `${f.inicio}-${f.fim}`)).join(', ') || '—';
    totalFaltando += g.faixasFaltantes.reduce((soma, f) => soma + (f.fim - f.inicio + 1), 0);
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
  return totalFaltando;
}

function irParaQuebrasDeSequencia() {
  els.sequencePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

const ROTULO_ATIVIDADE = {
  comercio_varejo: 'Comércio/Varejo',
  atacado: 'Atacado',
  industria: 'Indústria',
  servico: 'Serviço',
};

function renderReforma(reforma, cliente) {
  els.reformaSummaryPanel.hidden = false;
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

// "Exportar avisos" (CSV) só lista o que já dá alerta — útil pra agir rápido,
// mas não serve pra levar a conferência inteira pra fora do sistema (ex.:
// anexar num fechamento, cruzar numa outra planilha). Esta exportação cobre
// todos os documentos do período, não só os problemáticos.
function exportarExcelCompleto() {
  if (!ultimoPainel) {
    setStatus('Busque os dados de um cliente antes de exportar.', true);
    return;
  }
  const cliente = ultimoPainel.cliente;
  const { dataInicio, dataFim } = ultimoPainel.periodo;

  const linhasDocumentos = documentosCarregados.map((d) => ({
    Tipo: d.tipoDocumento,
    Número: d.numero,
    Série: d.serie,
    'Data Emissão': formatDate(d.dataEmissao),
    Direção: d.operacao,
    Emitente: d.emitente.nome || d.emitente.cnpj,
    Destinatário: d.destinatario.nome || d.destinatario.cnpj || '',
    'Valor Total': d.valorTotal,
    Situação: ROTULO_SITUACAO[d.situacao] || d.situacao,
    'Validação Matemática': d.validacaoMatematica?.status || '-',
    'Qtd. Divergências': contarItensComDivergencia(d),
    Chave: d.chave || '',
  }));

  const gruposComQuebra = (ultimoPainel.sequence?.grupos || []).filter((g) => g.temQuebra);
  const linhasQuebras = gruposComQuebra.map((g) => ({
    Emitente: g.emitNome,
    Tipo: g.tipoDocumento,
    Série: g.serie,
    'Menor Número': g.menorNumero,
    'Maior Número': g.maiorNumero,
    'Total Esperado': g.totalEsperado,
    'Total Encontrado': g.totalEncontrado,
    Canceladas: g.totalCanceladas,
    'Faixas Faltantes': g.faixasFaltantes.map((f) => (f.inicio === f.fim ? f.inicio : `${f.inicio}-${f.fim}`)).join(', '),
  }));

  const linhasDivergencias = documentosCarregados
    .filter((d) => d.situacao === 'inconsistente' || (d.validacaoMatematica && d.validacaoMatematica.status !== 'CORRETO'))
    .map((d) => ({
      Tipo: d.tipoDocumento,
      Número: d.numero,
      Série: d.serie,
      'Data Emissão': formatDate(d.dataEmissao),
      Emitente: d.emitente.nome || d.emitente.cnpj,
      'Valor Total': d.valorTotal,
      Motivo: motivoInconsistencia(d),
      'Status Validação Matemática': d.validacaoMatematica?.status || '-',
    }));

  const planilha = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(planilha, XLSX.utils.json_to_sheet(linhasDocumentos), 'Documentos');
  XLSX.utils.book_append_sheet(
    planilha,
    XLSX.utils.json_to_sheet(linhasQuebras.length ? linhasQuebras : [{ Aviso: 'Nenhuma quebra de sequência encontrada no período.' }]),
    'Quebras de Sequência'
  );
  XLSX.utils.book_append_sheet(
    planilha,
    XLSX.utils.json_to_sheet(linhasDivergencias.length ? linhasDivergencias : [{ Aviso: 'Nenhuma divergência encontrada no período.' }]),
    'Divergências'
  );

  const nomeArquivo = `conferencia_${cliente?.cnpj || 'cliente'}_${dataInicio}_a_${dataFim}.xlsx`;
  XLSX.writeFile(planilha, nomeArquivo);
  setStatus(`Excel exportado: ${linhasDocumentos.length} documento(s), ${gruposComQuebra.length} quebra(s), ${linhasDivergencias.length} divergência(s).`);
}

let ultimaAuditoriaMotor = null;

const ROTULO_MOTOR = { matematica: 'Validação matemática', reforma: 'Reforma Tributária (IBS/CBS)', icms: 'ICMS/CFOP/CST' };

// Roda a Validação Matemática e o XML_REFORMA_VALIDATOR sobre todo o cache
// permanente de documentos, cliente a cliente — é a conferência de verdade
// do motor tributário em cima dos dados fiscais já coletados, sem precisar
// abrir cliente por cliente na Conferência Fiscal pra achar divergência.
async function rodarAuditoriaMotorTributario() {
  els.btnAuditoriaMotor.disabled = true;
  els.auditoriaMotorResultado.innerHTML = '<p class="hint">Rodando conferência do motor tributário sobre o cache...</p>';
  try {
    const resultado = await apiGet('/api/cron/auditoria-motor-tributario');
    ultimaAuditoriaMotor = resultado;
    if (resultado.status === 'ignorado') {
      els.auditoriaMotorResultado.innerHTML = `<p class="hint">${resultado.motivo}</p>`;
      return;
    }
    const clientesComDados = resultado.clientes.filter((c) => c.temDados);
    if (!clientesComDados.length) {
      els.auditoriaMotorResultado.innerHTML = '<p class="hint">Nenhum documento cacheado ainda — busque algum cliente na Conferência Fiscal primeiro.</p>';
      return;
    }

    const t = resultado.totais;
    const resumo = `
      <div class="summary" style="margin-bottom: 16px;">
        <div class="summary-card"><span class="summary-value">${t.documentosAnalisados}</span><span class="summary-label">Documentos analisados</span></div>
        <div class="summary-card ${t.matematica.divergenciaCalculo ? 'alerta' : ''}"><span class="summary-value">${t.matematica.divergenciaCalculo}</span><span class="summary-label">Divergência de cálculo</span></div>
        <div class="summary-card ${t.reforma.divergente + t.reforma.totalDivergente ? 'alerta' : ''}"><span class="summary-value">${t.reforma.divergente + t.reforma.totalDivergente}</span><span class="summary-label">Divergência Reforma (IBS/CBS)</span></div>
        <div class="summary-card ${t.icms.divergente ? 'alerta' : ''}"><span class="summary-value">${t.icms.divergente}</span><span class="summary-label">Divergência ICMS/CFOP/CST</span></div>
      </div>
      ${
        t.icms.semBase
          ? `<p class="hint">Conferência de ICMS/CFOP/CST ainda pendente em ${t.icms.semBase} documento(s) — falta cadastrar a base de regras (ver tax-engine/icms-engine/README.md).</p>`
          : ''
      }
    `;

    const linhas = clientesComDados
      .map((c) => {
        const divergenciaMat = c.matematica.divergenciaCalculo;
        const divergenciaReforma = c.reforma.divergente + c.reforma.totalDivergente;
        return `
          <tr class="${c.temDivergencia ? 'row-inconsistente' : 'row-ok'} row-clickable" data-cnpj="${c.cnpj}">
            <td>${c.nome}</td>
            <td>${c.totalDocumentos}</td>
            <td>${c.matematica.correto}</td>
            <td>${divergenciaMat}</td>
            <td>${c.reforma.correto}</td>
            <td>${divergenciaReforma}</td>
            <td>${c.icms.divergente}</td>
          </tr>
        `;
      })
      .join('');

    els.auditoriaMotorResultado.innerHTML = `
      ${resumo}
      <p class="hint">${resultado.clientesComDivergencia} de ${clientesComDados.length} cliente(s) com dado cacheado têm alguma divergência. Clique numa linha pra ver exemplos.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th><th>Documentos</th>
              <th>Matemática OK</th><th>Matemática divergente</th>
              <th>Reforma OK</th><th>Reforma divergente</th><th>ICMS/CFOP/CST divergente</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
    els.auditoriaMotorResultado.querySelectorAll('tr[data-cnpj]').forEach((tr) => {
      tr.addEventListener('click', () => abrirModalMotorCliente(tr.dataset.cnpj));
    });
  } catch (err) {
    els.auditoriaMotorResultado.innerHTML = `<p class="status error">Falha ao rodar conferência do motor tributário: ${err.message}</p>`;
  } finally {
    els.btnAuditoriaMotor.disabled = false;
  }
}

function fecharModalMotorCliente() {
  els.motorClienteModalOverlay.hidden = true;
}

function abrirModalMotorCliente(cnpj) {
  const cliente = ultimaAuditoriaMotor?.clientes.find((c) => c.cnpj === cnpj);
  if (!cliente) return;
  els.motorClienteModalTitulo.textContent = cliente.nome;

  const linhasExemplos = (cliente.exemplos || [])
    .map(
      (ex) => `
        <tr>
          <td>${ROTULO_MOTOR[ex.motor] || ex.motor}</td>
          <td>${ex.tipoDocumento} nº ${ex.numero}</td>
          <td>${formatDate(ex.dataEmissao)}</td>
          <td class="chave-col">${ex.chave || '—'}</td>
          <td>${ex.motivo}</td>
        </tr>
      `
    )
    .join('');

  els.motorClienteModalCorpo.innerHTML = `
    <div class="summary" style="margin-bottom: 16px;">
      <div class="summary-card"><span class="summary-value">${cliente.totalDocumentos}</span><span class="summary-label">Documentos analisados</span></div>
      <div class="summary-card ${cliente.matematica.divergenciaCalculo ? 'alerta' : ''}"><span class="summary-value">${cliente.matematica.divergenciaCalculo}</span><span class="summary-label">Matemática divergente</span></div>
      <div class="summary-card ${cliente.reforma.divergente + cliente.reforma.totalDivergente ? 'alerta' : ''}"><span class="summary-value">${cliente.reforma.divergente + cliente.reforma.totalDivergente}</span><span class="summary-label">Reforma divergente</span></div>
      <div class="summary-card ${cliente.icms.divergente ? 'alerta' : ''}"><span class="summary-value">${cliente.icms.divergente}</span><span class="summary-label">ICMS/CFOP/CST divergente</span></div>
    </div>
    ${
      cliente.icms.semBase
        ? `<p class="hint">Conferência de ICMS/CFOP/CST ainda pendente em ${cliente.icms.semBase} documento(s) deste cliente — falta cadastrar a base de regras.</p>`
        : ''
    }
    ${
      linhasExemplos
        ? `
          <p class="hint">Exemplos de documentos com divergência (até ${cliente.exemplos.length}):</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Motor</th><th>Documento</th><th>Emissão</th><th>Chave</th><th>Motivo</th></tr></thead>
              <tbody>${linhasExemplos}</tbody>
            </table>
          </div>
        `
        : '<p class="hint">✓ Nenhuma divergência encontrada para este cliente.</p>'
    }
  `;
  els.motorClienteModalOverlay.hidden = false;
}

// Canário manual contra a classe de bug que já corrompeu NCM e CNPJ no
// cache permanente (fast-xml-parser perdendo zero à esquerda) — chama a
// mesma auditoria que roda sozinha no fim da sincronização noturna, mas sob
// demanda, sem precisar esperar a próxima madrugada pra saber se está limpo.
async function rodarAuditoriaDados() {
  els.btnAuditoriaDados.disabled = true;
  els.auditoriaResultado.innerHTML = '<p class="hint">Rodando auditoria...</p>';
  try {
    const resultado = await apiGet('/api/cron/auditoria-dados');
    if (resultado.status === 'ignorado') {
      els.auditoriaResultado.innerHTML = `<p class="hint">${resultado.motivo}</p>`;
      return;
    }
    if (resultado.limpo) {
      els.auditoriaResultado.innerHTML = `<p class="hint">✓ ${resultado.totalDocumentosVerificados} documento(s) verificado(s) — nenhuma corrupção de CNPJ/NCM encontrada.</p>`;
      return;
    }
    const linhas = resultado.achados
      .filter((a) => a.totalCorrompidos > 0)
      .flatMap((a) =>
        a.exemplos.map(
          (ex) => `
            <tr class="row-inconsistente">
              <td>${a.coluna}</td>
              <td>${a.tamanhoEsperado} dígitos esperados</td>
              <td>${ex.valor}</td>
              <td class="chave-col">${ex.chave || '—'}</td>
            </tr>
          `
        )
      )
      .join('');
    const totalCorrompidos = resultado.achados.reduce((soma, a) => soma + a.totalCorrompidos, 0);
    els.auditoriaResultado.innerHTML = `
      <p class="status error">${totalCorrompidos} registro(s) corrompido(s) — exemplos abaixo (até 5 por coluna, veja os logs do servidor para a lista completa).</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Coluna</th><th>Tamanho esperado</th><th>Valor encontrado</th><th>Chave do documento</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    els.auditoriaResultado.innerHTML = `<p class="status error">Falha ao rodar auditoria de dados: ${err.message}</p>`;
  } finally {
    els.btnAuditoriaDados.disabled = false;
  }
}

// Prioriza onde expandir a base de regras RTC: quais NCMs realmente usados
// pelos clientes caem em classificação de baixa confiança (sem regra
// específica mapeada), em vez de tentar cobrir a tabela NCM inteira às cegas.
async function rodarRelatorioNcm() {
  els.btnRelatorioNcm.disabled = true;
  els.ncmResultado.innerHTML = '<p class="hint">Levantando NCMs sem regra mapeada...</p>';
  try {
    const resultado = await apiGet('/api/cron/relatorio-ncm-sem-regra');
    if (resultado.status === 'ignorado') {
      els.ncmResultado.innerHTML = `<p class="hint">${resultado.motivo}</p>`;
      return;
    }
    if (!resultado.totalNcmsSemRegra) {
      els.ncmResultado.innerHTML = `<p class="hint">Nenhum NCM sem regra mapeada entre os ${resultado.totalNcmsDistintos} NCM(s) distintos já cacheados.</p>`;
      return;
    }
    const linhas = resultado.top
      .map(
        (n) => `
          <tr>
            <td>${n.ncm}</td>
            <td>${n.ocorrencias}x</td>
            <td>${n.descricaoExemplo}</td>
            <td>${n.status}</td>
            <td>${n.origem || '—'}</td>
          </tr>
        `
      )
      .join('');
    els.ncmResultado.innerHTML = `
      <p class="hint">${resultado.totalNcmsSemRegra} de ${resultado.totalNcmsDistintos} NCM(s) distintos sem regra mapeada, ordenados por frequência real de uso.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>NCM</th><th>Ocorrências</th><th>Descrição exemplo</th><th>Status</th><th>Origem</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    els.ncmResultado.innerHTML = `<p class="status error">Falha ao levantar relatório de NCM: ${err.message}</p>`;
  } finally {
    els.btnRelatorioNcm.disabled = false;
  }
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
//
// "query" pode incluir forcar=1 pra ignorar o cache e recomeçar do zero —
// mas isso só pode acontecer na PRIMEIRA chamada. Se `forcar=1` fosse
// mandado em toda tentativa do loop (como chegou a ser antes desse
// comentário), cada nova tentativa reiniciava a busca de novo, apagando o
// progresso (combos concluídos, documentos já baixados) da tentativa
// anterior — pra qualquer cliente cujo volume não coubesse inteiro numa
// única requisição (o normal, dado o limite de 2 req/min da SIEG), a busca
// nunca conseguia terminar: ficava se resetando a cada 2 segundos pra
// sempre, e o resultado que aparecia dependia só de quanto essa tentativa
// isolada tinha conseguido buscar antes do próximo reset.
async function buscarPainelComEspera(query) {
  for (let tentativa = 0; tentativa < POLL_MAX_TENTATIVAS; tentativa += 1) {
    // "_" garante uma URL diferente a cada tentativa, pra nenhum cache
    // (navegador, CDN etc.) devolver uma resposta antiga em vez de deixar a
    // busca avançar de verdade no servidor.
    const queryDaTentativa = tentativa === 0 ? query : query.replace(/&forcar=1\b/, '');
    const painel = await apiGet(`/api/painel?${queryDaTentativa}&_=${Date.now()}`);
    if (painel.status === 'pronto') return painel;
    if (painel.status === 'erro') throw new Error(painel.erro || 'Falha ao buscar dados na SIEG.');
    const progresso = painel.progresso ? ` (${painel.progresso} concluído` : '';
    const detalhe = painel.documentosNoComboAtual ? `, ${painel.documentosNoComboAtual} documentos já baixados no tipo atual` : '';
    const ateData = painel.dataMaisRecenteBaixada ? `, já chegou até ${formatDate(painel.dataMaisRecenteBaixada)}` : '';
    const fechaParenteses = progresso ? ')' : '';
    // Erros transitórios (ex.: 429 da SIEG) não interrompem o polling — só
    // avisam, já que a próxima tentativa já tenta de novo sozinha.
    const aviso = painel.avisoTransitorio ? ' Aguardando a SIEG liberar (limite temporário atingido), tentando de novo automaticamente.' : '';
    // painel.progresso vem como "combosConcluidos/totalCombos" (ex.: "2/4")
    // — dá pra virar uma barra visual em vez de só texto, que é mais rápido
    // de bater o olho a cada tentativa do polling do que ler a frase de novo.
    let percentual = null;
    if (painel.progresso) {
      const [concluidos, total] = painel.progresso.split('/').map(Number);
      if (total > 0) percentual = Math.round((concluidos / total) * 100);
    }
    setStatus(
      `Buscando na SIEG...${progresso}${detalhe}${ateData}${fechaParenteses} — isso pode levar alguns minutos dependendo do volume.${aviso}`,
      false,
      true,
      percentual
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

// forcarAtualizacao ignora o cache do painel (válido por 10 minutos no
// Supabase) e busca/reclassifica tudo de novo — necessário depois de uma
// atualização do sistema (ex.: correção de bug de classificação), já que
// senão o resultado em cache continua mostrando o comportamento antigo até
// o cache expirar sozinho.
async function atualizar(forcarAtualizacao = false) {
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

  // Uma busca pode levar até 1 minuto (rate limit da SIEG) — sem travar os
  // campos, dava pra trocar cliente/período enquanto a busca anterior ainda
  // estava voltando, e quando ela finalmente chegava, mostrava o resultado
  // do período antigo (correto) enquanto a tela já exibia as datas novas
  // (ainda não buscadas), parecendo que a busca nova tinha vindo vazia.
  const camposBusca = [els.btnAtualizar, els.btnForcarAtualizacao, els.clienteSelect, els.dataInicioInput, els.dataFimInput, els.tipoDocSelect];
  camposBusca.forEach((campo) => { if (campo) campo.disabled = true; });
  setStatus(forcarAtualizacao ? 'Ignorando o cache e buscando tudo de novo...' : 'Buscando na SIEG...', false, true);
  try {
    let query = `cnpj=${encodeURIComponent(cnpj)}&${montarQueryPeriodo()}&tipo=${encodeURIComponent(tipo)}`;
    if (forcarAtualizacao) query += '&forcar=1';
    const painel = await buscarPainelComEspera(query);
    ultimoPainel = painel;

    // Garante que a tela nunca mostre um período diferente do que os dados
    // exibidos realmente cobrem, mesmo que algo tenha mexido nos campos
    // entre o disparo da busca e a resposta chegar.
    els.dataInicioInput.value = painel.periodo.dataInicio;
    els.dataFimInput.value = painel.periodo.dataFim;

    renderDocumentos(painel.xmls.documentos);
    const totalFaltando = renderSequencia(painel.sequence.grupos);
    renderTributos(painel.tax.meses);
    renderReforma(painel.reforma, painel.cliente);
    renderResumo(painel.xmls, totalFaltando);
    renderValores(painel.valores);
    renderEmptyState(painel.xmls.totalDocumentos, cnpj, tipo, painel.periodo.dataInicio, painel.periodo.dataFim);

    setStatus(`Atualizado às ${new Date().toLocaleTimeString('pt-BR')}.`);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    camposBusca.forEach((campo) => { if (campo) campo.disabled = false; });
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

function abrirModalEdicaoCliente(cnpj) {
  if (!cnpj) return;
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
      chave: d.chave,
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
    // Documentos pareados/pendentes carregam a chave de acesso — se o
    // documento completo já foi buscado no painel principal (mesmo cliente
    // e período), dá pra abrir o mesmo modal de conferência fiscal usado lá
    // em vez de deixar a divergência do Domínio como uma tabela isolada,
    // sem ligação nenhuma com a conferência SIEG do lado de cá.
    const docCompleto = l.chave ? documentosCarregados.find((d) => d.chave === l.chave) : null;
    tr.className = docCompleto ? `${l.rowClass} row-clickable` : l.rowClass;
    if (docCompleto) tr.title = 'Clique para ver a conferência fiscal completa deste documento.';
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
    if (docCompleto) tr.addEventListener('click', () => abrirModalDocumento(docCompleto));
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

const PAGINAS = {
  cadastros: { titulo: 'Cadastros', subtitulo: 'Clientes cadastrados no sistema', toolbar: false },
  conformidade: {
    titulo: 'Conformidade com a Reforma Tributária',
    subtitulo: 'Visão de todos os clientes — sempre a partir do cache, sem gastar cota da SIEG',
    toolbar: false,
  },
  conferencia: { titulo: 'Conferência Fiscal', subtitulo: 'Documentos integrados, quebras de sequência e cruzamento tributário', toolbar: true },
  auditoria: { titulo: 'Auditoria Fiscal', subtitulo: 'Saúde dos dados cacheados e cobertura da base de regras da Reforma', toolbar: false },
  dominio: { titulo: 'Domínio x SIEG', subtitulo: 'Cruzamento entre a planilha do Domínio e os documentos da SIEG', toolbar: true },
};

function ativarPagina(nome) {
  const config = PAGINAS[nome] || PAGINAS.cadastros;
  document.querySelectorAll('.nav-item').forEach((botao) => botao.classList.toggle('nav-item-ativo', botao.dataset.page === nome));
  document.querySelectorAll('.page-panel').forEach((painel) => {
    painel.hidden = painel.dataset.page !== nome;
  });
  els.pageTitle.textContent = config.titulo;
  els.pageSubtitle.textContent = config.subtitulo;
  els.sharedToolbar.hidden = !config.toolbar;
  els.statusBox.hidden = !config.toolbar;
  // "Tipo de documento" e os botões de exportação só fazem sentido na
  // Conferência Fiscal (a busca de Domínio/Conformidade usa os mesmos
  // dados, mas não filtra por tipo nem exporta a partir daqui).
  const ehConferencia = nome === 'conferencia';
  document.getElementById('tipoDocField').hidden = !ehConferencia;
  document.getElementById('exportButtonsField').hidden = !ehConferencia;
  document.getElementById('exportExcelField').hidden = !ehConferencia;

  if (nome === 'conformidade' && !consolidadoCarregado) carregarConsolidado();

  try {
    localStorage.setItem('vitalConferenciaPaginaAtiva', nome);
  } catch {
    // localStorage indisponível (aba privada, storage bloqueado) — sem
    // problema, só perde a lembrança da última aba entre sessões.
  }
}

async function init() {
  els.dataInicioInput.value = primeiroDiaMesAtual();
  els.dataFimInput.value = ultimoDiaMesAtual();

  // Nunca passar o listener direto (atualizar) pro addEventListener aqui —
  // o clique manda o MouseEvent como primeiro argumento, e um objeto é
  // sempre "truthy", faria o botão normal também forçar o cache sempre.
  els.btnAtualizar.addEventListener('click', () => atualizar(false));
  els.btnForcarAtualizacao.addEventListener('click', () => atualizar(true));
  els.btnAbrirCadastroCliente.addEventListener('click', abrirModalCliente);
  els.btnExportarAvisos.addEventListener('click', exportarAvisos);
  els.btnExportarExcel.addEventListener('click', exportarExcelCompleto);
  els.btnAuditoriaDados.addEventListener('click', rodarAuditoriaDados);
  els.btnRelatorioNcm.addEventListener('click', rodarRelatorioNcm);
  els.btnAuditoriaMotor.addEventListener('click', rodarAuditoriaMotorTributario);
  els.btnFecharModalMotorCliente.addEventListener('click', fecharModalMotorCliente);
  els.motorClienteModalOverlay.addEventListener('click', (evento) => {
    if (evento.target === els.motorClienteModalOverlay) fecharModalMotorCliente();
  });
  els.btnAtualizarConsolidado.addEventListener('click', carregarConsolidado);
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
  els.summaryGapsCard.addEventListener('click', irParaQuebrasDeSequencia);
  els.btnLimparFiltroReforma.addEventListener('click', limparFiltroReforma);
  els.btnFecharModal.addEventListener('click', fecharModal);
  els.docModalOverlay.addEventListener('click', (evento) => {
    if (evento.target === els.docModalOverlay) fecharModal();
  });
  els.consolidadoFiltroCliente.addEventListener('change', renderConsolidadoTabela);
  els.consolidadoFiltroDe.addEventListener('change', renderConsolidadoTabela);
  els.consolidadoFiltroAte.addEventListener('change', renderConsolidadoTabela);
  document.querySelectorAll('[data-consolidado-direcao]').forEach((botao) => {
    botao.addEventListener('click', () => {
      consolidadoDirecaoAtiva = botao.dataset.consolidadoDirecao;
      document
        .querySelectorAll('[data-consolidado-direcao]')
        .forEach((b) => b.classList.toggle('tab-button-ativo', b === botao));
      renderConsolidadoTabela();
    });
  });
  els.btnFecharModalConsolidadoCliente.addEventListener('click', fecharModalConsolidadoCliente);
  els.consolidadoClienteModalOverlay.addEventListener('click', (evento) => {
    if (evento.target === els.consolidadoClienteModalOverlay) fecharModalConsolidadoCliente();
  });
  els.btnFecharModalConsolidadoDocs.addEventListener('click', fecharModalConsolidadoDocs);
  els.consolidadoDocsModalOverlay.addEventListener('click', (evento) => {
    if (evento.target === els.consolidadoDocsModalOverlay) fecharModalConsolidadoDocs();
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      fecharModal();
      fecharModalCliente();
      fecharModalConsolidadoCliente();
      fecharModalConsolidadoDocs();
      fecharModalMotorCliente();
    }
  });

  document.querySelectorAll('.nav-item').forEach((botao) => {
    botao.addEventListener('click', () => ativarPagina(botao.dataset.page));
  });
  let paginaInicial = 'cadastros';
  try {
    paginaInicial = localStorage.getItem('vitalConferenciaPaginaAtiva') || 'cadastros';
  } catch {
    // segue com o padrão
  }
  ativarPagina(PAGINAS[paginaInicial] ? paginaInicial : 'cadastros');

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
