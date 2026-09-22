// Confere o código de serviço declarado no NFS-e contra a Nomenclatura
// Brasileira de Serviços (NBS 2.0). ATENÇÃO — limitação real, não teórica:
// o campo que o XML de NFS-e (padrão ABRASF) realmente carrega,
// ItemListaServico, é o código da "lista de serviços" da LC 116/2003 (ex.
// "17.19"), um sistema BEM diferente e muito mais grosseiro (~40 itens,
// ~230 subitens) do que a NBS (1237 registros, hierarquia até 9 dígitos,
// ex. "1.1302.21.00" = Serviços de contabilidade). Os dois só coincidem
// visualmente no nível mais alto ("1.01" existe nos dois) — não dá pra
// tratar "não encontrado na NBS" como confirmação de erro real, porque a
// causa mais provável é só estar comparando sistemas de código diferentes.
// Por isso "não encontrado" aqui é sempre REVISAO_MANUAL, nunca DIVERGENTE
// — mesmo princípio de "nunca confirmar sem evidência" do resto do motor.
// Ver README.md deste motor.

import { getNbs } from '../icms-engine/repository.js';

let indice = null;

function obterIndice() {
  if (indice) return indice;
  const { registros } = getNbs();
  const porCodigo = new Map();
  for (const registro of registros) {
    if (registro.nbs) porCodigo.set(registro.nbs, registro);
    if (registro.codigo_sem_pontos) porCodigo.set(registro.codigo_sem_pontos, registro);
  }
  indice = porCodigo;
  return indice;
}

export function validarNbsItem(item) {
  const codigo = String(item.servico?.codigoNbs ?? '').trim();
  const divergencias = [];
  const pendencias = [];

  if (!codigo) {
    return {
      status: 'REVISAO_MANUAL',
      existe: null,
      descricaoOficial: null,
      divergencias,
      pendencias: ['Código de serviço ausente no XML — não dá pra conferir.'],
    };
  }

  const porCodigo = obterIndice();
  const registro = porCodigo.get(codigo) || porCodigo.get(codigo.replace(/\D/g, ''));
  if (!registro) {
    return {
      status: 'REVISAO_MANUAL',
      existe: false,
      descricaoOficial: null,
      divergencias,
      pendencias: [
        `Código de serviço "${codigo}" não encontrado na NBS 2.0 — o XML carrega o código da lista de serviços da LC 116/2003, que é um sistema diferente da NBS (só coincide no nível mais alto); não dá pra confirmar isso como erro real, só como "não bateu contra este catálogo".`,
      ],
    };
  }

  return { status: 'CORRETO', existe: true, descricaoOficial: registro.descricao, divergencias, pendencias };
}
