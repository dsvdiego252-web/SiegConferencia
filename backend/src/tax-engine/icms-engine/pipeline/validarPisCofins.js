// Estágio de PIS/COFINS — confere CST e alíquota informados no XML contra
// as tabelas SPED 4.3.10 (monofásico/pauta, CST 02/04) e 4.3.13 (alíquota
// zero, CST 06), pela NCM detectada em cada linha oficial. Só usa linhas
// com NCM explícita na fonte (várias linhas de 4.3.10 são só título de
// grupo, sem NCM própria — essas nunca entram no índice, pra não virar
// match genérico demais). Respeita a vigência de cada regra na data de
// emissão do documento — a mesma NCM pode ter tido tratamento diferente em
// outro período.

import { getPisCofins4310, getPisCofins4313 } from '../repository.js';
import { canonicalizarNcm } from './util.js';

let indice = null;

function indexarTabela(tabela, porNcm) {
  for (const regra of tabela.regras) {
    for (const ncmBruto of regra.ncm_referencias_detectadas || []) {
      const codigo = canonicalizarNcm(ncmBruto);
      if (!codigo) continue;
      if (!porNcm.has(codigo)) porNcm.set(codigo, []);
      porNcm.get(codigo).push(regra);
    }
  }
}

function obterIndice() {
  if (indice) return indice;
  const porNcm = new Map();
  indexarTabela(getPisCofins4310(), porNcm);
  indexarTabela(getPisCofins4313(), porNcm);
  indice = porNcm;
  return indice;
}

function regraVigenteNaData(regra, dataEmissao) {
  if (!dataEmissao) return true; // sem data pra comparar, considera candidata
  const { inicio, fim } = regra.vigencia;
  if (inicio && dataEmissao < inicio) return false;
  if (fim && dataEmissao > fim) return false;
  return true;
}

export function validarPisCofinsItem(item, contexto) {
  const codigo = canonicalizarNcm(item.ncm);
  const divergencias = [];
  const pendencias = [];

  if (!codigo) return { status: 'REVISAO_MANUAL', divergencias, pendencias: ['NCM ausente — não é possível conferir tratamento de PIS/COFINS.'] };

  const candidatas = (obterIndice().get(codigo) || []).filter((r) => regraVigenteNaData(r, contexto.dataEmissao));
  if (!candidatas.length) {
    // NCM não mapeada nas tabelas 4.3.10/4.3.13 vigentes na data — é o caso
    // normal da grande maioria dos produtos (tributação não-cumulativa
    // padrão, sem monofásico/pauta/alíquota zero). Sinalizar isso pra todo
    // item sem exceção afogaria os resultados reais dos outros estágios com
    // uma nota repetida sem nenhum sinal novo — fica em silêncio.
    return { status: 'CORRETO', divergencias, pendencias: [] };
  }
  if (candidatas.length > 1) {
    pendencias.push(`NCM ${item.ncm} corresponde a mais de uma regra vigente de PIS/COFINS na data de emissão — revisar manualmente (${candidatas.map((c) => c.id_regra).join(', ')}).`);
    return { status: 'REVISAO_MANUAL', divergencias, pendencias };
  }

  const [regra] = candidatas;
  const { cst_pis, cst_cofins, aliquota_pis_percentual, aliquota_cofins_percentual } = regra.resultado;

  const cstPisXml = item.pis?.cst;
  const cstCofinsXml = item.cofins?.cst;
  if (cstPisXml && cst_pis && cstPisXml !== cst_pis) {
    divergencias.push(`CST PIS informado (${cstPisXml}) diverge do esperado pela tabela ${regra.tabela_sped} (${cst_pis} — ${regra.descricao}).`);
  }
  if (cstCofinsXml && cst_cofins && cstCofinsXml !== cst_cofins) {
    divergencias.push(`CST COFINS informado (${cstCofinsXml}) diverge do esperado pela tabela ${regra.tabela_sped} (${cst_cofins} — ${regra.descricao}).`);
  }
  if (Number.isFinite(item.pis?.aliquota) && Number.isFinite(aliquota_pis_percentual) && Math.abs(item.pis.aliquota - aliquota_pis_percentual) > 0.01) {
    divergencias.push(`Alíquota de PIS informada (${item.pis.aliquota}%) diverge da esperada pela tabela ${regra.tabela_sped} (${aliquota_pis_percentual}%).`);
  }
  if (Number.isFinite(item.cofins?.aliquota) && Number.isFinite(aliquota_cofins_percentual) && Math.abs(item.cofins.aliquota - aliquota_cofins_percentual) > 0.01) {
    divergencias.push(`Alíquota de COFINS informada (${item.cofins.aliquota}%) diverge da esperada pela tabela ${regra.tabela_sped} (${aliquota_cofins_percentual}%).`);
  }

  return {
    status: divergencias.length ? 'DIVERGENTE' : 'CORRETO',
    regraAplicada: regra.id_regra,
    cstPisEsperado: cst_pis,
    cstCofinsEsperado: cst_cofins,
    divergencias,
    pendencias,
  };
}
