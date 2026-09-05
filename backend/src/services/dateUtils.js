/**
 * Resolve os parâmetros de período de uma requisição. Aceita tanto um
 * atalho `mes=AAAA-MM` quanto `inicio`/`fim` explícitos (AAAA-MM-DD).
 * Retorna { dataInicio, dataFim } em AAAA-MM-DD, ou {} se nada foi informado
 * (nesse caso o chamador decide o comportamento padrão).
 */
export function resolverPeriodo(query) {
  if (query.mes) {
    const [ano, mes] = String(query.mes).split('-').map(Number);
    if (!ano || !mes) throw new Error('Parâmetro "mes" inválido, use o formato AAAA-MM.');
    const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    return {
      dataInicio: `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-01`,
      dataFim: `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`,
    };
  }
  return {
    dataInicio: query.inicio || undefined,
    dataFim: query.fim || undefined,
  };
}

/**
 * Verifica se uma data (AAAA-MM-DD, ou prefixo de um ISO datetime) cai
 * dentro do período informado. Sem dataInicio/dataFim, ou sem a própria
 * data, considera que está dentro (não filtra).
 */
export function estaDentroDoPeriodo(dataISO, dataInicio, dataFim) {
  if (!dataInicio && !dataFim) return true;
  const data = String(dataISO || '').slice(0, 10);
  if (!data) return true;
  if (dataInicio && data < dataInicio) return false;
  if (dataFim && data > dataFim) return false;
  return true;
}
