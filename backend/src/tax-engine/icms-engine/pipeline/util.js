// Helpers compartilhados entre os estágios do pipeline de confronto de
// ICMS/CFOP/CST/PIS-COFINS — nenhuma regra tributária aqui, só normalização
// de código (mesma cautela de zero à esquerda já documentada em
// xmlParser.js e no goods-engine).

export function apenasDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

export function canonicalizarNcm(valor) {
  return apenasDigitos(valor);
}

export function canonicalizarCest(valor) {
  const digitos = apenasDigitos(valor);
  return digitos ? digitos.padStart(7, '0') : '';
}

// Mapa UF -> região, usado pelas regras de alíquota interestadual do art. 52
// do RICMS/SP (7% para Norte/Nordeste/Centro-Oeste/ES, 12% para
// Sul/Sudeste exceto ES).
export const REGIAO_POR_UF = {
  AC: 'NORTE', AP: 'NORTE', AM: 'NORTE', PA: 'NORTE', RO: 'NORTE', RR: 'NORTE', TO: 'NORTE',
  AL: 'NORDESTE', BA: 'NORDESTE', CE: 'NORDESTE', MA: 'NORDESTE', PB: 'NORDESTE', PE: 'NORDESTE',
  PI: 'NORDESTE', RN: 'NORDESTE', SE: 'NORDESTE',
  DF: 'CENTRO_OESTE', GO: 'CENTRO_OESTE', MT: 'CENTRO_OESTE', MS: 'CENTRO_OESTE',
  PR: 'SUL', RS: 'SUL', SC: 'SUL',
  ES: 'SUDESTE', MG: 'SUDESTE', RJ: 'SUDESTE', SP: 'SUDESTE',
};

export function regiaoDaUf(uf) {
  return REGIAO_POR_UF[String(uf || '').toUpperCase()] || null;
}
