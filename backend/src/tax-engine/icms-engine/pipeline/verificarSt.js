// Estágio de ICMS-ST (Substituição Tributária) — Portaria CAT 68/2019 +
// MVA/IVA-ST por segmento. A CAT 68 real (22 anexos, com vigência por
// anexo) e a base de MVA/IVA (296 regras) já estão carregadas, mas o
// vínculo item a item (qual CEST/NCM pertence a qual anexo/item da CAT 68)
// nunca foi fornecido — só o nível de segmento chegou. Sem essa peça, não
// dá pra confirmar ST de um item qualquer com segurança ("NCM, CEST ou
// segmento isoladamente não confirmam ST", como toda a documentação da
// CAT 68 já avisa).
//
// Uma exceção estreita e segura: quando o segmento é identificável sem
// ambiguidade só pelo capítulo da NCM (nenhum outro segmento da CAT 68
// disputa esse capítulo) E esse segmento já está REVOGADO na data de
// emissão, dá pra afirmar com confiança que CST/CFOP de ST não deveriam
// mais estar em uso — não é preciso confirmar o item específico pra saber
// que a Substituição Tributária *daquele segmento inteiro* acabou. É o caso
// de Medicamentos (Anexo IX, capítulo 30 da NCM, revogado a partir de
// 01/01/2026): farmácias que não atualizaram o cadastro de produtos no ERP
// continuam emitindo com CST 060/CFOP X405 (venda com ICMS já retido por
// ST) meses depois da revogação.

import { getIcmsSegmentosSt } from '../repository.js';
import { canonicalizarNcm } from './util.js';

// CST de ICMS que indicam "already substituído" (ICMS cobrado
// anteriormente por Substituição Tributária) — Tabela B do Convênio
// s/nº de 1970 (CST), não específico de nenhum produto.
const CST_ST_SUBSTITUIDO = new Set(['60']);

// Pares CFOP com/sem cláusula de Substituição Tributária pra "venda/compra
// de mercadoria adquirida ou recebida de terceiros" — mesmo movimento e
// âmbito, confirmado item a item na própria tabela oficial (IT 2023.002):
// a claúsula ST muda só o 3º dígito (4 → 1).
const CFOP_ST_PARA_SEM_ST = {
  1403: '1102', 2403: '2102',
  5403: '5102', 5405: '5102',
  6403: '6102', 6405: '6102',
};

// Segmentos da CAT 68 cujo capítulo/prefixo de NCM é identificável sem
// ambiguidade a partir do próprio título oficial do segmento — só entram
// aqui os que não disputam capítulo com nenhum outro dos 22 segmentos.
// Lista propositalmente curta: mais confiável ter poucos itens certos do
// que muitos itens especulativos.
const SEGMENTOS_NCM_CONHECIDO = [{ segmento: 'MEDICAMENTOS', ncmPrefixos: ['30'] }];

let indiceSegmentos = null;

function obterSegmentosRevogados() {
  if (indiceSegmentos) return indiceSegmentos;
  const { segmentos } = getIcmsSegmentosSt();
  const porSegmento = new Map(segmentos.map((s) => [s.segmento, s]));
  indiceSegmentos = SEGMENTOS_NCM_CONHECIDO.map(({ segmento, ncmPrefixos }) => ({ ncmPrefixos, dados: porSegmento.get(segmento) })).filter(
    (s) => s.dados?.nao_st_a_partir_de
  );
  return indiceSegmentos;
}

function checarStRevogadaAindaUsada(item, contexto) {
  const ncmCanonico = canonicalizarNcm(item.ncm);
  if (!ncmCanonico || !contexto.dataEmissao) return null;

  const cstXml = item.icms?.cst ? String(item.icms.cst) : null;
  if (!cstXml || !CST_ST_SUBSTITUIDO.has(cstXml)) return null;

  for (const { ncmPrefixos, dados } of obterSegmentosRevogados()) {
    if (!ncmPrefixos.some((p) => ncmCanonico.startsWith(p))) continue;
    if (contexto.dataEmissao < dados.nao_st_a_partir_de) continue; // documento emitido antes da revogação — ST ainda valia

    const divergencias = [
      {
        campo: 'CST',
        informado: cstXml,
        esperado: '00',
        mensagem: `CST ${cstXml} (ICMS cobrado anteriormente por Substituição Tributária) informado, mas o segmento "${dados.titulo}" (${dados.segmento}, Anexo ${dados.anexo} da CAT 68/2019) não está mais sujeito a ST desde ${dados.nao_st_a_partir_de} (${dados.ato_revogador || 'ato revogador não identificado'}).`,
        baseLegal: dados.ato_revogador || `CAT 68/2019, Anexo ${dados.anexo}`,
      },
    ];

    const cfopXml = String(item.cfop || '');
    const cfopSemSt = CFOP_ST_PARA_SEM_ST[Number(cfopXml)];
    if (cfopSemSt) {
      divergencias.push({
        campo: 'CFOP',
        informado: cfopXml,
        esperado: cfopSemSt,
        mensagem: `CFOP ${cfopXml} (operação com mercadoria sujeita a ST) não é mais coerente pra este segmento desde ${dados.nao_st_a_partir_de} — o equivalente sem ST seria ${cfopSemSt}.`,
        baseLegal: dados.ato_revogador || `CAT 68/2019, Anexo ${dados.anexo}`,
      });
    }

    return { status: 'DIVERGENTE', divergencias, pendencias: [] };
  }
  return null;
}

export function verificarStItem(item, contexto) {
  const revogada = checarStRevogadaAindaUsada(item, contexto);
  if (revogada) return revogada;

  // Sem sinal nenhum de ST no item (nenhum CEST informado), fica em
  // silêncio — sinalizar "ST pendente" pra todo item sem exceção afogaria
  // os resultados reais dos outros estágios (CFOP/NCM/PIS-COFINS/cBenef/
  // alíquota, que já têm dado de verdade) numa nota repetida sem nenhum
  // sinal novo. Só levanta REVISAO_MANUAL quando o próprio XML já indica
  // que o emissor considerou o item sujeito a ST (CEST preenchido).
  if (!item.cest) return { status: 'CORRETO', divergencias: [], pendencias: [] };

  return {
    status: 'REVISAO_MANUAL',
    divergencias: [],
    pendencias: [
      `Item tem CEST ${item.cest} informado no XML (indício de Substituição Tributária) — confirmar manualmente contra o anexo/item da CAT 68/2019 e a base de MVA/IVA por segmento, já carregadas mas ainda sem o vínculo item a item.`,
    ],
  };
}
