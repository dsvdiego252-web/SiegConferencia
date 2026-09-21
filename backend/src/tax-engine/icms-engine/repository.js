// Loader ES module para as bases de ICMS/CFOP/CST/PIS-COFINS de São Paulo,
// todas fornecidas pelo usuário (fontes-sp/, cada arquivo rastreável até a
// fonte oficial declarada no seu próprio `meta`). Não contém nenhuma regra
// tributária: só lê, valida e faz cache dos JSONs — igual em espírito a
// legal-rules/repository.js (Reforma Tributária).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'fontes-sp');

const cache = new Map();

function carregar(caminhoRelativo) {
  if (cache.has(caminhoRelativo)) return cache.get(caminhoRelativo);
  const caminhoCompleto = path.join(DATA_DIR, caminhoRelativo);
  const valor = JSON.parse(readFileSync(caminhoCompleto, 'utf8'));
  cache.set(caminhoRelativo, valor);
  return valor;
}

export function getCbenefSp() {
  return carregar('cbenef_sp_v20260626.json');
}

export function getTipiNcmIpi() {
  return carregar('tipi_ncm_ipi_2026.json');
}

export function getCfop() {
  return carregar('cfop_it_2023_002_v2_10.json');
}

export function getIcmsSegmentosSt() {
  return carregar('icms_st_sp_cat68_segmentos_v20260706.json');
}

export function getIcmsAliquotaGeral() {
  return carregar('icms_sp_art52_56c.json');
}

export function getIcmsAnexosCatalogo() {
  return carregar('icms_sp_anexos_catalogo_265_v20260921.json');
}

export function getIcmsAnexosValidados() {
  return carregar('icms_sp_anexos_regras_validadas_v20260921.json');
}

export function getPisCofins4310() {
  return carregar('pis_cofins_tabela_4_3_10_v1_25.json');
}

export function getPisCofins4313() {
  return carregar('pis_cofins_tabela_4_3_13_v1_36.json');
}

export function getMvaIvaSt() {
  return carregar('mva_iva_sp_por_segmento_v20260921.json');
}

export function getNbs() {
  return carregar('nbs_2_0.json');
}
