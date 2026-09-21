// Estágio de ICMS-ST (Substituição Tributária) — Portaria CAT 68/2019 +
// MVA/IVA-ST por segmento. A CAT 68 real (22 anexos, com vigência por
// anexo) e a base de MVA/IVA (296 regras) já estão carregadas, mas o
// vínculo item a item (qual CEST/NCM pertence a qual anexo/item da CAT 68)
// nunca foi fornecido — só o nível de segmento chegou. Sem essa peça, é
// impossível confirmar se um item específico está sujeito a ST sem
// arriscar exatamente o que toda a documentação da CAT 68 pede pra nunca
// fazer: "NCM, CEST ou segmento isoladamente não confirmam ST." Por isso
// este estágio sempre devolve REVISAO_MANUAL — nunca ST_CONFIRMADA nem
// NAO_SUJEITO_ST — até que essa tabela item a item seja carregada (ver
// tax-engine/icms-engine/fontes-sp/cat68_sp_motor_coletor_v1.json pro
// schema esperado, arquivo de saída icms_st_sp_cat68_itens.json).

export function verificarStItem(item) {
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
