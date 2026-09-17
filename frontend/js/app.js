const els = {
  clienteSelect: document.getElementById('clienteSelect'),
  tipoDocSelect: document.getElementById('tipoDocSelect'),
  dataInicioInput: document.getElementById('dataInicioInput'),
  dataFimInput: document.getElementById('dataFimInput'),
  btnAtualizar: document.getElementById('btnAtualizar'),
  btnAbrirCadastroCliente: document.getElementById('btnAbrirCadastroCliente'),
  btnEditarCliente: document.getElementById('btnEditarCliente'),
  clienteModalOverlay: document.getElementById('clienteModalOverlay'),
  clienteModalTitulo: document.getElementById('clienteModalTitulo'),
  btnFecharModalCliente: document.getElementById('btnFecharModalCliente'),
  novoClienteCnpj: document.getElementById('novoClienteCnpj'),
  novoClienteNome: document.getElementById('novoClienteNome'),
  novoClienteRegime: document.getElementById('novoClienteRegime'),
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
  reformaConformes: document.getElementById('reformaConformes'),
  reformaParciais: document.getElementById('reformaParciais'),
  reformaParciaisCard: document.getElementById('reformaParciaisCard'),
  reformaSemAdequacao: document.getElementById('reformaSemAdequacao'),
  reformaSemAdequacaoCard: document.getElementById('reformaSemAdequacaoCard'),
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

function renderResumo({ totalDocumentos, totalEntrada, totalSaida, totalInconsistentes }, temQuebra) {
  els.summaryPanel.hidden = false;
  els.summaryTotal.textContent = totalDocumentos;
  els.summaryEntrada.textContent = totalEntrada;
  els.summarySaida.textContent = totalSaida;
  els.summaryGaps.textContent = temQuebra ? 'Sim' : 'Não';
  els.summaryGapsCard.classList.toggle('has-gaps', temQuebra);
  els.summaryGapsCard.classList.toggle('no-gaps', !temQuebra);
  els.summaryInconsistentes.textContent = totalInconsistentes;
  els.summaryInconsistentesCard.classList.toggle('alerta', totalInconsistentes > 0);
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

function documentosFiltrados() {
  const filtro = els.situacaoFiltroSelect.value;
  if (filtro === 'todos') return documentosCarregados;
  return documentosCarregados.filter((d) => d.situacao === filtro);
}

function renderDocumentos(documentos) {
  documentosCarregados = documentos;
  paginaDocumentosAtual = 1;
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
    return '<span class="destaque-erro">Sem o grupo IBS/CBS no XML</span> (CST e Classificação Tributária ausentes)';
  }

  const cstFormatado = formatarCodigoReforma(reforma.cst, 3);
  const classTribFormatado = formatarCodigoReforma(reforma.classTrib, 6);
  const linhaCst = cstFormatado ? `CST: ${cstFormatado}` : '<span class="destaque-erro">CST: faltando</span>';
  const linhaClassTrib = classTribFormatado
    ? `ClassTrib: ${classTribFormatado}`
    : '<span class="destaque-erro">Classificação Tributária (cClassTrib): faltando</span>';
  const linhaCbenef = preenchido(reforma.cBenef) ? `cBenef: ${reforma.cBenef}` : 'cBenef: não informado';
  const linhaBaseCalculo = `BC IBS/CBS: ${formatMoney(reforma.valorBaseCalculo)}`;
  const linhaIbs = `IBS: ${formatMoney(reforma.valorIbs)}`;
  const linhaCbs = `CBS: ${formatMoney(reforma.valorCbs)}`;

  let aviso = '';
  if (cstFormatado && CST_COM_POSSIVEL_BENEFICIO.includes(Number(reforma.cst)) && !preenchido(reforma.cBenef)) {
    aviso = '<div class="hint" style="color:#b25c00;">CST indica alíquota reduzida/isenção/diferimento — confira se o cBenef deveria estar preenchido.</div>';
  }

  return `<div>${linhaCst}</div><div>${linhaClassTrib}</div><div>${linhaCbenef}</div><div>${linhaBaseCalculo}</div><div>${linhaIbs}</div><div>${linhaCbs}</div>${aviso}`;
}

function abrirModalDocumento(doc) {
  els.docModalTitulo.textContent = `${doc.tipoDocumento} nº ${doc.numero} — série ${doc.serie}`;

  const linhasItens = doc.itens
    .map((item) => {
      const reformaTexto = textoReformaItem(item.reformaTributaria);
      return `
        <tr>
          <td>${item.codigo}<br><span class="hint">${item.descricao}</span></td>
          <td>${item.ncm || '-'}</td>
          <td>${item.cfop || '-'}</td>
          <td>${item.quantidade}</td>
          <td>${formatMoney(item.valorProduto)}</td>
          <td>${formatMoney(item.icms.valor)} <span class="hint">(CST ${item.icms.cst ?? '-'} · BC ${formatMoney(item.icms.baseCalculo)})</span></td>
          <td>${formatMoney(item.pis.valor + item.cofins.valor)}</td>
          <td style="font-size: 0.82rem;">${reformaTexto}</td>
        </tr>
      `;
    })
    .join('');

  els.docModalCorpo.innerHTML = `
    <dl>
      <dt>Situação</dt><dd><span class="badge badge-situacao-${doc.situacao}">${ROTULO_SITUACAO[doc.situacao]}</span></dd>
      <dt>Chave de acesso</dt><dd>${doc.chave || '-'}</dd>
      <dt>Emissão</dt><dd>${formatDate(doc.dataEmissao)}</dd>
      <dt>Natureza da operação</dt><dd>${doc.naturezaOperacao || '-'}</dd>
      <dt>Emitente</dt><dd>${doc.emitente.nome || '-'} (${doc.emitente.cnpj || '-'})</dd>
      <dt>Destinatário</dt><dd>${doc.destinatario.nome || '-'} (${doc.destinatario.cnpj || '-'})</dd>
      <dt>Valor total</dt><dd>${formatMoney(doc.valorTotal)}</dd>
      <dt>ICMS total</dt><dd>${formatMoney(doc.valorIcmsTotal)}</dd>
    </dl>
    <h3>Itens (${doc.itens.length})</h3>
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
            <th>Reforma Tributária</th>
          </tr>
        </thead>
        <tbody>${linhasItens}</tbody>
      </table>
    </div>
    <p class="hint" style="margin-top: 16px;">Esta é a informação já processada a partir do XML — o arquivo XML original não fica guardado, só os dados extraídos dele.</p>
  `;

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

const POLL_INTERVALO_MS = 2000;
const POLL_MAX_TENTATIVAS = 60; // cada tentativa já busca um pedaço de verdade; isso cobre clientes com bastante volume

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
    const progresso = painel.progresso ? ` (${painel.progresso} concluído)` : '';
    setStatus(`Buscando na SIEG...${progresso} isso pode levar alguns minutos dependendo do volume.`, false, true);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVALO_MS));
  }
  throw new Error('A busca está demorando mais que o esperado. Tente novamente em instantes.');
}

function periodoValido() {
  return Boolean(els.dataInicioInput.value && els.dataFimInput.value);
}

function montarQueryPeriodo() {
  return `inicio=${encodeURIComponent(els.dataInicioInput.value)}&fim=${encodeURIComponent(els.dataFimInput.value)}`;
}

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

function abrirModalCliente() {
  modoModalCliente = 'adicionar';
  els.clienteModalTitulo.textContent = 'Cadastrar cliente';
  els.btnAdicionarCliente.textContent = 'Adicionar';
  els.clienteModalErro.hidden = true;
  els.novoClienteCnpj.value = '';
  els.novoClienteCnpj.disabled = false;
  els.novoClienteNome.value = '';
  els.novoClienteRegime.value = '';
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
  els.clienteModalErro.hidden = true;
  if (cnpj.length !== 14) {
    els.clienteModalErro.textContent = 'Informe um CNPJ com 14 dígitos para cadastrar o cliente.';
    els.clienteModalErro.hidden = false;
    return;
  }
  try {
    if (modoModalCliente === 'editar') {
      await apiPatch(`/api/clients/${cnpj}`, { nome, regimeTributario });
      await carregarClientes(cnpj);
      fecharModalCliente();
      setStatus('Cliente atualizado.');
    } else {
      await apiPost('/api/clients', { cnpj, nome, regimeTributario });
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
  els.btnAdicionarCliente.addEventListener('click', adicionarCliente);
  els.btnFecharModalCliente.addEventListener('click', fecharModalCliente);
  els.clienteModalOverlay.addEventListener('click', (evento) => {
    if (evento.target === els.clienteModalOverlay) fecharModalCliente();
  });
  els.btnConferirDominio.addEventListener('click', conferirDominio);
  els.situacaoFiltroSelect.addEventListener('change', () => {
    paginaDocumentosAtual = 1;
    renderPaginaDocumentos();
  });
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
