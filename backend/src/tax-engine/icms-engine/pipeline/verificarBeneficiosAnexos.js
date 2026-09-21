// Estágio de benefícios dos Anexos I (isenções) e II (reduções de base) do
// RICMS/SP. Só 13 dos 265 artigos catalogados têm o texto oficial validado
// (os outros 252 são só título de índice — nunca usados aqui pra não
// confirmar benefício "pelo título", exatamente como a fonte pede). Dos 13
// validados, a maioria tem condições só textuais (remetente/destinatário
// específico, dependência externa, produto descrito sem NCM) que este
// motor não tem como verificar contra o XML — por isso só os dois artigos
// com critério de NCM verificável entram como candidato automático, e
// mesmo assim como aviso pra revisão manual, nunca como confirmação: as
// demais condições de cada artigo (operação, destinatário, finalidade)
// ficam por conta de quem revisa.
//
// Exceção ao "sempre revisão manual": o Anexo II, art. 39 (redução de base
// de PRODUTOS ALIMENTÍCIOS) tem, na fonte oficial, `condicao.remetente:
// [FABRICANTE, ATACADISTA]` e `nao_aplica_se: [..., "consumidor final"]`.
// Cliente cadastrado como comércio varejista (atividade) vendendo (saída) —
// não é fabricante nem atacadista, e pelo cadastro presume-se consumidor
// final na ponta — então o benefício estruturalmente não bate nessa saída,
// e não vale nem como candidato de revisão. Continua REVISAO_MANUAL nos
// demais casos (entrada, ou saída de cliente atacadista/industrial), onde
// as condições de destinação/regularidade fiscal ainda dependem de revisão
// humana.

import { canonicalizarNcm } from './util.js';

function candidatosPorNcm() {
  return [
    {
      artigo: 'Anexo I, art. 36',
      titulo: 'HORTIFRUTIGRANJEIROS',
      ncms: Object.values({
        'açafrão': ['09102000'], 'açafrão-da-terra': ['09103000'], alecrim: ['09109900'],
        erva_doce_folhas_sene: ['12119090'], folhas_louro: ['09109900'], hortelã: ['12119090'],
        manjerona_manjericao: ['12119090'], oregano: ['12119010'], salvia: ['09109900'],
        anis: ['09091010'], badiana: ['09091020'], coentro_semente: ['09092000'],
        cominho_semente: ['09093000'], funcho_semente: ['09095000'], tomilho: ['09109900'],
      }).flat(),
    },
    {
      artigo: 'Anexo II, art. 39',
      titulo: 'PRODUTOS ALIMENTÍCIOS (redução de base — carga efetiva 12%)',
      ncmPrefixos: ['03', '04', '07', '08', '0902', '0903', '0904', '0905', '0906', '0907', '0908', '0909', '0910', '11', '12', '15', '16', '17', '18', '19', '20', '21', '220900', '220299'],
      naoAplicaSeVarejoAoConsumidorFinal: true,
    },
  ];
}

function remetenteEhVarejoConsumidorFinal(contexto) {
  const atividades = Array.isArray(contexto?.atividade) ? contexto.atividade : [];
  return contexto?.operacao === 'saida'
    && (atividades.includes('comercio_varejo') || contexto.consumidorFinal === true);
}

export function verificarBeneficiosAnexosItem(item, contexto = {}) {
  const ncmCanonico = canonicalizarNcm(item.ncm);
  const pendencias = [];
  if (!ncmCanonico) return { status: 'REVISAO_MANUAL', divergencias: [], pendencias: [] };

  for (const candidato of candidatosPorNcm()) {
    const bateExato = candidato.ncms?.includes(ncmCanonico);
    const bateP = candidato.ncmPrefixos?.some((p) => ncmCanonico.startsWith(p));
    if (!bateExato && !bateP) continue;
    if (candidato.naoAplicaSeVarejoAoConsumidorFinal && remetenteEhVarejoConsumidorFinal(contexto)) continue;
    pendencias.push(`NCM ${item.ncm} pode se enquadrar no ${candidato.artigo} do RICMS/SP (${candidato.titulo}) — confirmar as demais condições do artigo (operação, destinatário, finalidade) e comparar com o que o XML declarou.`);
  }

  return { status: pendencias.length ? 'REVISAO_MANUAL' : 'CORRETO', divergencias: [], pendencias };
}
