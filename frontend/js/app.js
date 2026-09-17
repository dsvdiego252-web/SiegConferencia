const els = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  clienteSelect: document.getElementById('clienteSelect'),
  mesInput: document.getElementById('mesInput'),
  btnAtualizar: document.getElementById('btnAtualizar'),
  novoClienteCnpj: document.getElementById('novoClienteCnpj'),
  novoClienteNome: document.getElementById('novoClienteNome'),
  btnAdicionarCliente: document.getElementById('btnAdicionarCliente'),
  statusBox: document.getElementById('statusBox'),
  statusSpinner: document.getElementById('statusSpinner'),
  statusText: document.getElementById('statusText'),
  summaryPanel: document.getElementById('summaryPanel'),
  summaryTotal: document.getElementById('summaryTotal'),
  summaryEntrada: document.getElementById('summaryEntrada'),
  summarySaida: document.getElementById('summarySaida'),
  summaryGaps: document.getElementById('summaryGaps'),
  summaryGapsCard: document.getElementById('summaryGapsCard'),
  sequencePanel: document.getElementById('sequencePanel'),
  sequenceTableBody: document.querySelector('#sequenceTable tbody'),
  documentsPanel: document.getElementById('documentsPanel'),
  documentsTableBody: document.querySelector('#documentsTable tbody'),
  taxPanel: document.getElementById('taxPanel'),
  taxTableBody: document.querySelector('#taxTable tbody'),
  reformaSummaryPanel: document.getElementById('reformaSummaryPanel'),
  reformaTotalAnalisados: document.getElementById('reformaTotalAnalisados'),
  reformaConformes: document.getElementById('reformaConformes'),
  reformaParciais: document.getElementById('reformaParciais'),
  reformaParciaisCard: document.getElementById('reformaParciaisCard'),
  reformaSemAdequacao: document.getElementById('reformaSemAdequacao'),
  reformaSemAdequacaoCard: document.getElementById('reformaSemAdequacaoCard'),
  reformaPanel: document.getElementById('reformaPanel'),
  reformaDataCorte: document.getElementById('reformaDataCorte'),
  reformaResumoTableBody: document.querySelector('#reformaResumoTable tbody'),
  reformaDetalheTableBody: document.querySelector('#reformaDetalheTable tbody'),
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
};

function apiBase() {
  return els.apiBaseUrl.value.trim().replace(/\/$/, '');
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

function currentMonthDefault() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function carregarClientes(selecionarCnpj) {
  const clientes = await apiGet('/api/clients');
  els.clienteSelect.innerHTML = '';
  for (const c of clientes) {
    const opt = document.createElement('option');
    opt.value = c.cnpj;
    opt.textContent = `${c.nome} (${c.cnpj})`;
    els.clienteSelect.appendChild(opt);
  }
  if (selecionarCnpj) els.clienteSelect.value = selecionarCnpj;
}

function renderResumo({ totalDocumentos, totalEntrada, totalSaida }, temQuebra) {
  els.summaryPanel.hidden = false;
  els.summaryTotal.textContent = totalDocumentos;
  els.summaryEntrada.textContent = totalEntrada;
  els.summarySaida.textContent = totalSaida;
  els.summaryGaps.textContent = temQuebra ? 'Sim' : 'Não';
  els.summaryGapsCard.classList.toggle('has-gaps', temQuebra);
  els.summaryGapsCard.classList.toggle('no-gaps', !temQuebra);
}

function renderDocumentos(documentos) {
  els.documentsPanel.hidden = false;
  els.documentsTableBody.innerHTML = '';
  if (!documentos.length) {
    els.documentsTableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Nenhum documento integrado no período.</td></tr>';
    return;
  }
  for (const d of documentos) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge badge-${d.operacao}">${d.operacao}</span></td>
      <td>${d.tipoDocumento}</td>
      <td>${d.numero}</td>
      <td>${d.serie}</td>
      <td>${formatDate(d.dataEmissao)}</td>
      <td>${d.emitente.nome || d.emitente.cnpj}</td>
      <td>${d.destinatario.nome || d.destinatario.cnpj}</td>
      <td>${formatMoney(d.valorTotal)}</td>
    `;
    els.documentsTableBody.appendChild(tr);
  }
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

function renderTributos(meses) {
  els.taxPanel.hidden = false;
  els.taxTableBody.innerHTML = '';
  const produtos = meses.flatMap((m) => m.produtos);
  if (!produtos.length) {
    els.taxTableBody.innerHTML = '<tr class="empty-row"><td colspan="8">Sem itens no período para cruzar.</td></tr>';
    return;
  }
  for (const p of produtos) {
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
}

function renderReforma(reforma) {
  els.reformaSummaryPanel.hidden = false;
  els.reformaPanel.hidden = false;
  els.reformaDataCorte.textContent = formatDate(reforma.dataCorte);

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

  els.reformaDetalheTableBody.innerHTML = '';
  if (!reforma.porDocumento.length) {
    els.reformaDetalheTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Nada a detalhar.</td></tr>';
    return;
  }
  const rotuloSituacao = { conforme: 'Conforme', parcial: 'Parcial', sem_adequacao: 'Sem adequação' };
  const classeSituacao = { conforme: 'row-ok', parcial: 'row-pendente', sem_adequacao: 'row-gap' };
  for (const d of reforma.porDocumento) {
    const tr = document.createElement('tr');
    tr.className = classeSituacao[d.situacao];
    tr.innerHTML = `
      <td>${d.tipoDocumento}</td>
      <td>${d.numero}</td>
      <td>${d.serie}</td>
      <td>${formatDate(d.dataEmissao)}</td>
      <td>${d.emitNome || d.emitCnpj}</td>
      <td>${d.itensConformes} / ${d.totalItens}</td>
      <td>${rotuloSituacao[d.situacao]}</td>
    `;
    els.reformaDetalheTableBody.appendChild(tr);
  }
}

async function atualizar() {
  const cnpj = els.clienteSelect.value;
  const mes = els.mesInput.value;
  if (!cnpj) {
    setStatus('Cadastre ou selecione um cliente primeiro.', true);
    return;
  }
  if (!mes) {
    setStatus('Selecione um mês para filtrar.', true);
    return;
  }

  els.btnAtualizar.disabled = true;
  setStatus('Buscando na SIEG... pode levar até 1 minuto por causa do limite de requisições da API.', false, true);
  try {
    const query = `cnpj=${encodeURIComponent(cnpj)}&mes=${encodeURIComponent(mes)}`;
    // Uma única chamada que busca os XMLs da SIEG uma vez só e monta todas as
    // análises a partir do mesmo resultado — evita repetir a busca completa
    // 4x (documentos, sequência, tributos, reforma) e estourar o limite real
    // de 2 requisições/minuto da SIEG numa única atualização de tela.
    const painel = await apiGet(`/api/painel?${query}`);

    renderDocumentos(painel.xmls.documentos);
    const temQuebra = renderSequencia(painel.sequence.grupos);
    renderTributos(painel.tax.meses);
    renderReforma(painel.reforma);
    renderResumo(painel.xmls, temQuebra);

    setStatus(`Atualizado às ${new Date().toLocaleTimeString('pt-BR')}.`);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    els.btnAtualizar.disabled = false;
  }
}

async function adicionarCliente() {
  const cnpj = els.novoClienteCnpj.value.replace(/\D/g, '');
  const nome = els.novoClienteNome.value.trim();
  if (cnpj.length !== 14) {
    setStatus('Informe um CNPJ com 14 dígitos para cadastrar o cliente.', true);
    return;
  }
  try {
    await apiPost('/api/clients', { cnpj, nome });
    els.novoClienteCnpj.value = '';
    els.novoClienteNome.value = '';
    await carregarClientes(cnpj);
    setStatus('Cliente adicionado.');
  } catch (err) {
    setStatus(err.message, true);
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
  const mes = els.mesInput.value;
  const arquivo = els.dominioFileInput.files[0];

  els.reconciliationStatus.classList.remove('error');

  if (!cnpj) {
    els.reconciliationStatus.textContent = 'Selecione um cliente primeiro.';
    return;
  }
  if (!mes) {
    els.reconciliationStatus.textContent = 'Selecione um mês no filtro acima primeiro.';
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
    formData.append('mes', mes);
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
  els.mesInput.value = currentMonthDefault();
  els.btnAtualizar.addEventListener('click', atualizar);
  els.btnAdicionarCliente.addEventListener('click', adicionarCliente);
  els.btnConferirDominio.addEventListener('click', conferirDominio);

  try {
    await carregarClientes();
    if (els.clienteSelect.value) await atualizar();
    else setStatus('Nenhum cliente cadastrado ainda — use "cadastrar cliente" acima.');
  } catch (err) {
    setStatus(`Não foi possível conectar ao backend${apiBase() ? ` em ${apiBase()}` : ''}: ${err.message}`, true);
  }
}

init();
