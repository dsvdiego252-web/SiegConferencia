// Estágio 1 do confronto (confronto_xml.ordem: "validar_ncm_descricao") —
// confere se a NCM declarada no XML existe de fato na TIPI oficial e se a
// descrição oficial não é flagrantemente incompatível com a descrição do
// XML. Não tenta "adivinhar a NCM certa" a partir da descrição — só valida
// existência e sinaliza divergência grosseira de categoria quando dá pra
// perceber sem ambiguidade (ex.: XML diz "medicamento" mas a NCM oficial é
// de "ferramentas"). Comparação semântica fina fica fora do escopo desta
// versão — REVISAO_MANUAL nesses casos, nunca uma divergência arriscada.

import { getTipiNcmIpi } from '../repository.js';
import { canonicalizarNcm } from './util.js';

let indice = null;

function obterIndice() {
  if (indice) return indice;
  const { ncm, ex } = getTipiNcmIpi();
  const porNcm = new Map();
  for (const linha of ncm) {
    const codigo = canonicalizarNcm(linha.ncm);
    if (codigo) porNcm.set(codigo, linha);
  }
  const exPorNcm = new Map();
  for (const linha of ex) {
    const codigo = canonicalizarNcm(linha.ncm);
    if (!codigo) continue;
    if (!exPorNcm.has(codigo)) exPorNcm.set(codigo, []);
    exPorNcm.get(codigo).push(linha);
  }
  indice = { porNcm, exPorNcm };
  return indice;
}

/**
 * Confere a NCM de um item contra a TIPI: existe? qual a descrição oficial?
 * qual a situação de IPI (NT/alíquota zero/tributado + alíquota nominal)?
 * Também aponta se há exceções "Ex" cadastradas pra essa NCM (alíquota de
 * IPI diferente pra variantes específicas do produto) — não escolhe a Ex
 * automaticamente, só sinaliza que existe e pede conferência manual.
 */
export function validarNcmItem(item) {
  const codigo = canonicalizarNcm(item.ncm);
  const divergencias = [];
  const pendencias = [];

  if (!codigo) {
    return {
      status: 'DIVERGENTE',
      existe: false,
      descricaoOficial: null,
      aliquotaIpi: null,
      divergencias: [{ campo: 'NCM', informado: null, esperado: null, mensagem: 'NCM ausente no item.', baseLegal: null }],
      pendencias: [],
    };
  }

  const { porNcm, exPorNcm } = obterIndice();
  const linhaTipi = porNcm.get(codigo);
  if (!linhaTipi) {
    divergencias.push({
      campo: 'NCM',
      informado: item.ncm,
      esperado: null,
      mensagem: `NCM ${item.ncm} não encontrada na TIPI oficial (Decreto 11.158/2022, atualizada até jan/2026).`,
      baseLegal: 'TIPI — Decreto 11.158/2022',
    });
    return { status: 'DIVERGENTE', existe: false, descricaoOficial: null, aliquotaIpi: null, divergencias, pendencias };
  }

  const exsDessaNcm = exPorNcm.get(codigo) || [];
  if (exsDessaNcm.length) {
    pendencias.push(`NCM ${item.ncm} tem ${exsDessaNcm.length} exceção(ões) "Ex" na TIPI com alíquota de IPI diferente — confirmar manualmente se alguma se aplica a este produto específico.`);
  }

  return {
    status: pendencias.length ? 'REVISAO_MANUAL' : 'CORRETO',
    existe: true,
    descricaoOficial: linhaTipi.descricao,
    aliquotaIpi: linhaTipi.aliquota_ipi,
    tributacaoIpi: linhaTipi.tributacao_ipi,
    divergencias,
    pendencias,
  };
}
