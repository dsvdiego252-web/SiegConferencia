import {
  listarCombos,
  chaveCombo,
  buscarCombo,
  mesclarDocumentos,
  classificarDocumentos,
} from './documentsService.js';
import { resolverDataCorteReforma } from './reformaTributariaAnalyzer.js';
import { XmlType } from './siegClient.js';
import { obterCliente } from './clientsStore.js';
import { lerCache, salvarProgresso, salvarResultado, salvarErro } from './painelCache.js';
import { montarPainelDeClassificados } from './painelBuilder.js';

// Margem de segurança abaixo do maxDuration (60s, o máximo do plano Hobby
// da Vercel) — reserva tempo pra montar a resposta depois do último combo.
export const ORCAMENTO_MS = 45_000;

// "Todos" (sem filtro explícito) sempre busca NFe+NFCe+NFS-e — NFS-e de
// destinatário importa pra qualquer cliente (pode ter recebido nota de
// serviço de algum fornecedor, independente da própria atividade), só a de
// emissão é que só faz sentido pra quem presta serviço (ver
// incluirEmitNfse em processarUmPasso). O filtro "NFS-e" na tela sempre
// busca as duas direções, independente do cadastro.
export function resolverTipos(tipoParam) {
  if (tipoParam === 'nfe') return [XmlType.NFE];
  if (tipoParam === 'nfce') return [XmlType.NFCE];
  if (tipoParam === 'nfse') return [XmlType.NFSE];
  return [XmlType.NFE, XmlType.NFCE, XmlType.NFSE];
}

export function normalizarTipo(tipoParam) {
  return ['nfe', 'nfce', 'nfse'].includes(tipoParam) ? tipoParam : 'todos';
}

// Maior data de emissão entre os documentos já baixados do combo em
// andamento — dá uma noção de até onde a busca já avançou dentro do
// período pedido. É uma estimativa: a SIEG não documenta a ordem de
// retorno das páginas.
function maiorDataEmissao(docs) {
  let maior = null;
  for (const doc of docs) {
    const data = String(doc.dataEmissao || '').slice(0, 10);
    if (data && (!maior || data > maior)) maior = data;
  }
  return maior;
}

/**
 * Avança a busca de um cnpj/período/tipo em UM passo (até ORCAMENTO_MS, ou
 * até terminar todos os combos) e persiste o progresso — exatamente o
 * trabalho que antes vivia só dentro da rota GET /api/painel. Extraído pra
 * cá porque agora duas coisas diferentes precisam chamar o mesmo avanço:
 * a própria rota (resposta rápida pro navegador) e a continuação em
 * segundo plano (routes/cron.js:/continuar-painel), que se auto-encadeia
 * sozinha até a busca terminar, sem depender de ninguém com a aba aberta
 * (ver o comentário em cima da rota de continuação pro motivo disso ter
 * passado a existir: um cliente de alto volume pode precisar de mais de 1h
 * de busca contínua, e nenhum navegador aguenta ficar ativo tanto tempo
 * sem ser interrompido).
 *
 * Pressupõe que o cache já existe e está com status 'buscando' — quem
 * chama (a rota, ou a continuação) é responsável por reiniciar a busca
 * (reiniciarBusca) e tratar 'pronto'/'erro' antes de chegar aqui.
 *
 * `prazoFinal` (opcional): quando quem chama já gastou algum tempo antes
 * de chegar aqui (ex.: a continuação em segundo plano em cron.js lê o
 * cache e grava o heartbeat antes de chamar isto), deve calcular o próprio
 * prazo (Date.now() + ORCAMENTO_MS) ANTES desse trabalho e passá-lo pra cá
 * — senão esse tempo gasto antes vira tempo "de graça" somado por cima do
 * orçamento de 45s computado aqui, arriscando estourar os 60s reais da
 * Vercel (Task timed out) e derrubar a função no meio, sem nem chegar a
 * disparar a próxima chamada encadeada. Sem isso (uso direto da rota
 * GET /api/painel, onde o trabalho antes daqui é desprezível), calcula um
 * prazo novo.
 *
 * Retorna um de:
 * - { tipo: 'pronto', cliente, dados }
 * - { tipo: 'erro', erro }
 * - { tipo: 'buscando', progresso, documentosNoComboAtual, dataMaisRecenteBaixada?, avisoTransitorio? }
 */
export async function processarUmPasso(cnpj, dataInicio, dataFim, tipo, prazoFinal = Date.now() + ORCAMENTO_MS) {
  const cliente = await obterCliente(cnpj);
  const tipos = resolverTipos(tipo);
  const incluirEmitNfse = tipo !== 'todos' || Boolean(cliente?.atividade?.includes('servico'));
  const dataCorteReforma = resolverDataCorteReforma();

  const cache = await lerCache(cnpj, dataInicio, dataFim, tipo);
  if (!cache || cache.status !== 'buscando') {
    return { tipo: cache?.status === 'pronto' ? 'pronto_ja_salvo' : cache?.status || 'sem_cache' };
  }

  const combos = listarCombos(tipos, { incluirEmitNfse });
  const combosConcluidos = new Set(cache.combos_concluidos || []);
  let docsAcumulados = cache.docs_parciais || [];
  let comboParcial = cache.combo_parcial || null;
  // Só a página mais recente buscada ao vivo (não acumula entre chamadas)
  // — usada apenas pra feedback de progresso, nunca persistida.
  let docsUltimaPagina = [];

  try {
    for (const combo of combos) {
      const chave = chaveCombo(combo);
      if (combosConcluidos.has(chave)) continue;
      if (Date.now() >= prazoFinal) break;

      const emAndamento = comboParcial && comboParcial.chave === chave;
      const skipInicial = emAndamento ? comboParcial.proximoSkip : 0;
      const gapInicio = emAndamento ? comboParcial.gapInicio : undefined;
      const gapFim = emAndamento ? comboParcial.gapFim : undefined;

      const resultado = await buscarCombo(combo, {
        clienteCnpj: cnpj,
        dataInicio,
        dataFim,
        skipInicial,
        prazoFinal,
        gapInicio,
        gapFim,
        ignorarCache: Boolean(cache.ignorar_cache_permanente),
      });

      if (resultado.completo) {
        docsAcumulados = mesclarDocumentos(docsAcumulados, resultado.docs);
        combosConcluidos.add(chave);
        comboParcial = null;
      } else {
        comboParcial = { chave, proximoSkip: resultado.proximoSkip, gapInicio: resultado.gapInicio, gapFim: resultado.gapFim };
        docsUltimaPagina = resultado.docs;
        break;
      }
    }
  } catch (err) {
    // Erros transitórios (429 da SIEG, 5xx, falha de rede) não encerram a
    // busca — o progresso já salvo continua valendo, e a próxima chamada
    // (poll do navegador ou passo da continuação em segundo plano) tenta
    // de novo sozinha.
    if (err.transitorio) {
      await salvarProgresso(cnpj, dataInicio, dataFim, tipo, [...combosConcluidos], docsAcumulados, comboParcial);
      return {
        tipo: 'buscando',
        progresso: `${combosConcluidos.size}/${combos.length}`,
        documentosNoComboAtual: comboParcial?.proximoSkip || 0,
        avisoTransitorio: err.message,
      };
    }
    await salvarErro(cnpj, dataInicio, dataFim, tipo, err.message);
    return { tipo: 'erro', erro: err.message };
  }

  if (combosConcluidos.size === combos.length) {
    const classificados = classificarDocumentos(docsAcumulados, cnpj, dataInicio, dataFim, tipos);
    const dados = montarPainelDeClassificados(classificados, dataCorteReforma, cliente?.regimeTributario, cliente?.atividade, cliente?.regimesEspeciais);
    try {
      await salvarResultado(cnpj, dataInicio, dataFim, tipo, dados);
    } catch (erroCache) {
      console.error('Falha ao gravar cache de resultado do painel:', erroCache.message);
    }
    return { tipo: 'pronto', cliente, dados };
  }

  try {
    await salvarProgresso(cnpj, dataInicio, dataFim, tipo, [...combosConcluidos], docsAcumulados, comboParcial);
  } catch (erroCache) {
    console.error('Falha ao gravar progresso do painel no Supabase:', erroCache.message);
  }
  return {
    tipo: 'buscando',
    progresso: `${combosConcluidos.size}/${combos.length}`,
    documentosNoComboAtual: comboParcial?.proximoSkip || 0,
    dataMaisRecenteBaixada: maiorDataEmissao(docsUltimaPagina),
  };
}
