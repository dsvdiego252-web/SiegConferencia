// Estágio de cBenef × CST — confere se o código de benefício informado no
// XML (ou a ausência dele) é compatível com o CST informado, segundo a
// Tabela CST x cBenef oficial da SEFAZ-SP. Não decide "qual seria o
// cBenef correto" (isso depende de qual benefício específico se aplica ao
// produto — Anexo I/II/CAT68, estágios anteriores do pipeline); só valida
// a compatibilidade cBenef↔CST que a própria tabela declara.

import { getCbenefSp } from '../repository.js';

let indice = null;

function obterIndice() {
  if (indice) return indice;
  const { regras } = getCbenefSp();
  const porCodigo = new Map();
  let semPreenchimento = null;
  for (const regra of regras) {
    if (regra.codigo_cbenef === null) semPreenchimento = regra;
    else porCodigo.set(regra.codigo_cbenef.toUpperCase(), regra);
  }
  indice = { porCodigo, semPreenchimento };
  return indice;
}

function checarVigencia(regra, dataEmissao) {
  if (!regra.nao_permitido_a_partir_de || !dataEmissao) return null;
  if (dataEmissao >= regra.nao_permitido_a_partir_de) {
    return `Uso de "${regra.codigo_cbenef}" não é mais permitido a partir de ${regra.nao_permitido_a_partir_de} (${regra.observacao || ''}).`.trim();
  }
  return null;
}

export function validarCbenefItem(item, contexto) {
  const { porCodigo, semPreenchimento } = obterIndice();
  const cstXml = item.icms?.cst ? String(item.icms.cst) : null;
  const cBenefXml = item.icms?.cBenef ? String(item.icms.cBenef).trim().toUpperCase() : null;
  const divergencias = [];
  const pendencias = [];

  if (!cstXml) {
    return { status: 'REVISAO_MANUAL', divergencias, pendencias: ['CST/CSOSN de ICMS ausente — não é possível conferir compatibilidade com cBenef.'] };
  }

  if (!cBenefXml) {
    if (!semPreenchimento) return { status: 'REVISAO_MANUAL', divergencias, pendencias: ['Regra "sem preenchimento de cBenef" não encontrada na base.'] };
    if (!semPreenchimento.cst_permitidos.includes(cstXml)) {
      divergencias.push({
        campo: 'cBenef',
        informado: '(não informado)',
        esperado: 'preenchido',
        mensagem: `Item sem cBenef informado, mas o CST ${cstXml} exige preenchimento do campo segundo a Tabela CST x cBenef de SP.`,
        baseLegal: 'Tabela CST x cBenef — SEFAZ-SP',
      });
    }
    return { status: divergencias.length ? 'DIVERGENTE' : 'CORRETO', divergencias, pendencias };
  }

  const regra = porCodigo.get(cBenefXml);
  if (!regra) {
    return {
      status: 'DIVERGENTE',
      divergencias: [{ campo: 'cBenef', informado: cBenefXml, esperado: null, mensagem: `cBenef "${cBenefXml}" informado no XML não consta na Tabela CST x cBenef de SP.`, baseLegal: 'Tabela CST x cBenef — SEFAZ-SP' }],
      pendencias,
    };
  }

  const avisoVigencia = checarVigencia(regra, contexto.dataEmissao);
  if (avisoVigencia) {
    divergencias.push({ campo: 'cBenef', informado: cBenefXml, esperado: null, mensagem: avisoVigencia, baseLegal: regra.fundamento_legal || 'Tabela CST x cBenef — SEFAZ-SP' });
  }

  if (!regra.cst_permitidos.includes(cstXml)) {
    divergencias.push({
      campo: 'CST',
      informado: cstXml,
      esperado: regra.cst_permitidos.join(' ou '),
      mensagem: `CST/CSOSN ${cstXml} não está entre os permitidos pela SEFAZ-SP para o cBenef "${cBenefXml}" (${regra.objeto_descricao || regra.categoria_textual || ''}).`.trim(),
      baseLegal: regra.fundamento_legal || 'Tabela CST x cBenef — SEFAZ-SP',
    });
  }

  return { status: divergencias.length ? 'DIVERGENTE' : 'CORRETO', regraAplicada: regra.id_regra, divergencias, pendencias };
}
