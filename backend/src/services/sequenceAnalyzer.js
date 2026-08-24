function groupKey(doc) {
  return `${doc.emitente.cnpj}::${doc.serie}`;
}

// Compacta uma lista de números ausentes em faixas, ex: [5,6,7,10] -> "5-7, 10"
function toRanges(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const ranges = [];
  for (const n of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && n === last.fim + 1) {
      last.fim = n;
    } else {
      ranges.push({ inicio: n, fim: n });
    }
  }
  return ranges;
}

/**
 * Recebe documentos NFe já normalizados e classificados como 'saida' e
 * procura buracos na numeração dentro de cada (emitente, série).
 *
 * Notas canceladas ocupam o número normalmente (não geram alerta de
 * quebra), mas são reportadas à parte para visibilidade.
 */
export function detectarQuebrasDeSequencia(docsSaida) {
  const grupos = new Map();

  for (const doc of docsSaida) {
    if (!doc.numero || !doc.emitente.cnpj) continue;
    const key = groupKey(doc);
    if (!grupos.has(key)) {
      grupos.set(key, {
        emitCnpj: doc.emitente.cnpj,
        emitNome: doc.emitente.nome,
        serie: doc.serie,
        numeros: new Set(),
        canceladas: new Set(),
      });
    }
    const grupo = grupos.get(key);
    grupo.numeros.add(doc.numero);
    if (doc.cancelada) grupo.canceladas.add(doc.numero);
  }

  const resultado = [];
  for (const grupo of grupos.values()) {
    const numeros = [...grupo.numeros];
    const min = Math.min(...numeros);
    const max = Math.max(...numeros);
    const presentes = new Set(numeros);

    const faltantes = [];
    for (let n = min; n <= max; n += 1) {
      if (!presentes.has(n)) faltantes.push(n);
    }

    resultado.push({
      emitCnpj: grupo.emitCnpj,
      emitNome: grupo.emitNome,
      serie: grupo.serie,
      menorNumero: min,
      maiorNumero: max,
      totalEncontrado: numeros.length,
      totalCanceladas: grupo.canceladas.size,
      totalEsperado: max - min + 1,
      temQuebra: faltantes.length > 0,
      faixasFaltantes: toRanges(faltantes),
      numerosCancelados: [...grupo.canceladas].sort((a, b) => a - b),
    });
  }

  return resultado.sort((a, b) => a.emitNome.localeCompare(b.emitNome) || a.serie - b.serie);
}
