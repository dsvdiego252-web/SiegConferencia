// Loader ES module para a base de regras de ICMS/CFOP/CST (sistema atual,
// pré-Reforma) — ver README.md deste diretório pro schema esperado de cada
// arquivo. Igual em espírito a legal-rules/repository.js: não contém
// nenhuma regra tributária, só lê e faz cache dos JSONs. Diferente daquela
// pasta (cujo conteúdo já veio pronto do "RTC Motor Modular v4.34"), os
// arquivos aqui começam vazios (`[]`) até serem preenchidos.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

const cache = new Map();

function carregar(caminhoRelativo) {
  if (cache.has(caminhoRelativo)) return cache.get(caminhoRelativo);
  const caminhoCompleto = path.join(DATA_DIR, caminhoRelativo);
  const valor = JSON.parse(readFileSync(caminhoCompleto, 'utf8'));
  cache.set(caminhoRelativo, valor);
  return valor;
}

export function getIcmsRules() {
  return {
    cfopRules: carregar('cfop_rules.json'),
    cstRules: carregar('cst_icms_rules.json'),
    aliquotaRules: carregar('icms_aliquota_por_ncm.json'),
  };
}
