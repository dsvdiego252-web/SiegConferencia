const DATA_CORTE_PADRAO = '2026-01-01'; // início da obrigatoriedade dos campos de IBS/CBS (Regime Normal)

function preenchido(valor) {
  return valor !== null && valor !== undefined && valor !== '';
}

function itemEstaConforme(item) {
  const r = item.reformaTributaria;
  return Boolean(r?.presente) && preenchido(r.classTrib) && preenchido(r.cst);
}

/**
 * Analisa se os documentos (NFe/NFCe) emitidos a partir da vigência da
 * Reforma Tributária trazem os campos de IBS/CBS (grupo IBSCBS,
 * cClassTrib, CST) preenchidos — sinal de que o emissor do cliente já foi
 * adequado. Não valida se os VALORES calculados estão corretos (isso já é
 * responsabilidade da validação de schema da SEFAZ na emissão); o foco
 * aqui é apontar quem ainda está emitindo sem nenhuma informação da
 * reforma, o que indica ERP/emissor desatualizado.
 */
export function analisarConformidadeReforma(docsClassificados, dataCorte = DATA_CORTE_PADRAO) {
  const relevantes = docsClassificados.filter(
    ({ doc, operacao }) =>
      (operacao === 'entrada' || operacao === 'saida') &&
      !doc.cancelada &&
      String(doc.dataEmissao || '').slice(0, 10) >= dataCorte &&
      doc.itens.length > 0
  );

  const porDocumento = relevantes.map(({ doc, operacao }) => {
    const itensConformes = doc.itens.filter(itemEstaConforme).length;
    const situacao = itensConformes === 0 ? 'sem_adequacao' : itensConformes === doc.itens.length ? 'conforme' : 'parcial';

    return {
      chave: doc.chave,
      tipoDocumento: doc.tipoDocumento,
      numero: doc.numero,
      serie: doc.serie,
      operacao,
      dataEmissao: doc.dataEmissao,
      emitCnpj: doc.emitente.cnpj,
      emitNome: doc.emitente.nome,
      totalItens: doc.itens.length,
      itensConformes,
      situacao,
    };
  });

  const resumoPorEmitenteMap = new Map();
  for (const d of porDocumento) {
    if (!resumoPorEmitenteMap.has(d.emitCnpj)) {
      resumoPorEmitenteMap.set(d.emitCnpj, {
        emitCnpj: d.emitCnpj,
        emitNome: d.emitNome,
        totalDocumentos: 0,
        conformes: 0,
        parciais: 0,
        semAdequacao: 0,
      });
    }
    const resumo = resumoPorEmitenteMap.get(d.emitCnpj);
    resumo.totalDocumentos += 1;
    if (d.situacao === 'conforme') resumo.conformes += 1;
    else if (d.situacao === 'parcial') resumo.parciais += 1;
    else resumo.semAdequacao += 1;
  }

  const totais = porDocumento.reduce(
    (acc, d) => {
      acc.totalDocumentosAnalisados += 1;
      if (d.situacao === 'conforme') acc.conformes += 1;
      else if (d.situacao === 'parcial') acc.parciais += 1;
      else acc.semAdequacao += 1;
      return acc;
    },
    { totalDocumentosAnalisados: 0, conformes: 0, parciais: 0, semAdequacao: 0 }
  );

  return {
    dataCorte,
    totais,
    resumoPorEmitente: [...resumoPorEmitenteMap.values()].sort((a, b) => b.semAdequacao - a.semAdequacao),
    porDocumento: porDocumento.sort((a, b) => String(a.dataEmissao).localeCompare(String(b.dataEmissao))),
  };
}
