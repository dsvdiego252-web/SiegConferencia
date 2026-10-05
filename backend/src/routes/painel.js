import { Router } from 'express';
import {
  obterDocumentosClassificados,
  listarCombos,
  chaveCombo,
  buscarCombo,
  mesclarDocumentos,
  classificarDocumentos,
} from '../services/documentsService.js';
import { resolverPeriodo } from '../services/dateUtils.js';
import { resolverDataCorteReforma } from '../services/reformaTributariaAnalyzer.js';
import { XmlType } from '../services/siegClient.js';
import { obterCliente } from '../services/clientsStore.js';
import { cacheDisponivel, lerCache, reiniciarBusca, salvarProgresso, salvarResultado, salvarErro, estaExpirado } from '../services/painelCache.js';
import { registrarSincronizacao } from '../services/documentCache.js';
import { montarPainelDeClassificados } from '../services/painelBuilder.js';

export const painelRouter = Router();

// Margem de segurança abaixo do maxDuration (60s, o máximo do plano Hobby
// da Vercel) — reserva tempo pra montar a resposta depois do último combo.
const ORCAMENTO_MS = 45_000;

// "Todos" (sem filtro explícito) sempre busca NFe+NFCe+NFS-e — NFS-e de
// destinatário importa pra qualquer cliente (pode ter recebido nota de
// serviço de algum fornecedor, independente da própria atividade), só a de
// emissão é que só faz sentido pra quem presta serviço (ver
// incluirEmitNfse, calculado logo abaixo, em listarCombos). O filtro
// "NFS-e" na tela sempre busca as duas direções, independente do cadastro
// (ver botão/dropdown do frontend).
function resolverTipos(tipoParam) {
  if (tipoParam === 'nfe') return [XmlType.NFE];
  if (tipoParam === 'nfce') return [XmlType.NFCE];
  if (tipoParam === 'nfse') return [XmlType.NFSE];
  return [XmlType.NFE, XmlType.NFCE, XmlType.NFSE];
}

function normalizarTipo(tipoParam) {
  return ['nfe', 'nfce', 'nfse'].includes(tipoParam) ? tipoParam : 'todos';
}

// Maior data de emissão entre os documentos já baixados do combo em
// andamento — dá uma noção de até onde a busca já avançou dentro do
// período pedido (ex.: "já baixou até 10/09" de um período até 15/09).
// É uma estimativa: a SIEG não documenta a ordem de retorno das páginas.
function maiorDataEmissao(docs) {
  let maior = null;
  for (const doc of docs) {
    const data = String(doc.dataEmissao || '').slice(0, 10);
    if (data && (!maior || data > maior)) maior = data;
  }
  return maior;
}

painelRouter.get('/', async (req, res) => {
  try {
    const { cnpj, forcar } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const cliente = await obterCliente(cnpj);
    const tipo = normalizarTipo(req.query.tipo);
    const tipos = resolverTipos(req.query.tipo);
    // Só busca NFS-e de emissão quando o filtro pede ela explicitamente, ou
    // quando o cliente presta serviço de verdade — ver resolverTipos acima.
    const incluirEmitNfse = tipo !== 'todos' || Boolean(cliente?.atividade?.includes('servico'));
    const dataCorteReforma = resolverDataCorteReforma();

    // Sem Supabase configurado (dev local), busca tudo direto — o modo mock
    // é instantâneo, sem risco de estourar o tempo de execução.
    if (!cacheDisponivel) {
      const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim, tipos });
      return res.json({
        status: 'pronto',
        periodo: { dataInicio, dataFim },
        cliente,
        ...montarPainelDeClassificados(classificados, dataCorteReforma, cliente?.regimeTributario, cliente?.atividade, cliente?.regimesEspeciais),
      });
    }

    let cache = await lerCache(cnpj, dataInicio, dataFim, tipo);

    const precisaReiniciar = !cache || forcar === '1' || (cache.status === 'pronto' && estaExpirado(cache.atualizado_em));
    if (precisaReiniciar) {
      cache = await reiniciarBusca(cnpj, dataInicio, dataFim, tipo, forcar === '1');
    }

    if (cache.status === 'pronto') {
      return res.json({
        status: 'pronto',
        periodo: { dataInicio, dataFim },
        atualizadoEm: cache.atualizado_em,
        desatualizado: false,
        cliente,
        ...cache.dados,
      });
    }

    if (cache.status === 'erro') {
      return res.json({ status: 'erro', periodo: { dataInicio, dataFim }, erro: cache.erro_mensagem });
    }

    // status === 'buscando': continua de onde parou. Cada combo (tipo x
    // direção) fica pausável no meio da paginação também — um combo
    // sozinho com bastante volume (várias páginas de 50 documentos) não
    // pode estourar o tempo de execução da função, então o `prazoFinal`
    // passado pra buscarCombo faz a busca parar antes de uma espera do
    // rate limit que não caberia no tempo restante desta requisição.
    const combos = listarCombos(tipos, { incluirEmitNfse });
    const combosConcluidos = new Set(cache.combos_concluidos || []);
    let docsAcumulados = cache.docs_parciais || [];
    let comboParcial = cache.combo_parcial || null;
    const prazoFinal = Date.now() + ORCAMENTO_MS;

    try {
      for (const combo of combos) {
        const chave = chaveCombo(combo);
        if (combosConcluidos.has(chave)) continue;
        if (Date.now() >= prazoFinal) break;

        const emAndamento = comboParcial && comboParcial.chave === chave;
        const skipInicial = emAndamento ? comboParcial.proximoSkip : 0;
        const docsJaDoCombo = emAndamento ? comboParcial.docs : [];
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
        const docsDoComboAtualizados = mesclarDocumentos(docsJaDoCombo, resultado.docs);

        if (resultado.completo) {
          docsAcumulados = mesclarDocumentos(docsAcumulados, docsDoComboAtualizados);
          combosConcluidos.add(chave);
          // Só grava no cache permanente o que realmente veio da SIEG agora
          // — reescrever o que acabou de vir do próprio cache é trabalho à
          // toa. Usa a faixa que realmente foi buscada ao vivo (gapInicio/
          // gapFim — pode ser menor que o período inteiro pedido, ver
          // buscarCombo), não o período inteiro: marcar como "sincronizado
          // agora" um dia que nem foi tocado nesta busca (porque já estava
          // cacheado) seria certificar uma frescura que não foi checada de
          // verdade. Falha ao gravar não pode derrubar a busca (os
          // documentos já buscados nesta requisição continuam válidos de
          // qualquer forma) — só registra e segue, tenta gravar de novo na
          // próxima vez que esse período for buscado.
          if (!resultado.doCache) {
            try {
              await registrarSincronizacao(cnpj, combo.xmlType, combo.direcao, resultado.gapInicio ?? dataInicio, resultado.gapFim ?? dataFim, docsDoComboAtualizados);
            } catch (erroCache) {
              console.error('Falha ao gravar cache permanente de documentos:', erroCache.message);
            }
          }
          comboParcial = null;
        } else {
          comboParcial = { chave, proximoSkip: resultado.proximoSkip, docs: docsDoComboAtualizados, gapInicio: resultado.gapInicio, gapFim: resultado.gapFim };
          break;
        }
      }
    } catch (err) {
      // Erros transitórios (429 da SIEG, 5xx, falha de rede) não encerram a
      // busca — o combo em andamento nesta tentativa simplesmente não
      // avançou, mas o progresso já salvo (combos concluídos + parcial
      // anterior) continua valendo, e a próxima chamada (poll) tenta de
      // novo sozinha. Sem isso, um 429 isolado marcava a busca inteira como
      // "erro" pra sempre, e clicar em "Buscar" de novo só repetia o mesmo
      // erro salvo (o botão não força reinício).
      if (err.transitorio) {
        await salvarProgresso(cnpj, dataInicio, dataFim, tipo, [...combosConcluidos], docsAcumulados, comboParcial);
        return res.json({
          status: 'buscando',
          periodo: { dataInicio, dataFim },
          progresso: `${combosConcluidos.size}/${combos.length}`,
          documentosNoComboAtual: comboParcial?.docs?.length || 0,
          avisoTransitorio: err.message,
        });
      }
      await salvarErro(cnpj, dataInicio, dataFim, tipo, err.message);
      return res.json({ status: 'erro', periodo: { dataInicio, dataFim }, erro: err.message });
    }

    if (combosConcluidos.size === combos.length) {
      const classificados = classificarDocumentos(docsAcumulados, cnpj, dataInicio, dataFim, tipos);
      const dados = montarPainelDeClassificados(classificados, dataCorteReforma, cliente?.regimeTributario, cliente?.atividade, cliente?.regimesEspeciais);
      // Uma falha ao gravar o cache de resultado (ex.: timeout pontual do
      // Supabase) não pode jogar fora uma busca que já terminou de verdade —
      // só loga e segue; o pior caso é essa mesma busca ser refeita do zero
      // na próxima vez (cache de 10min não vigorou), não perder o resultado
      // que o usuário está vendo agora. Mesmo espírito do try/catch em volta
      // de registrarSincronizacao logo acima.
      try {
        await salvarResultado(cnpj, dataInicio, dataFim, tipo, dados);
      } catch (erroCache) {
        console.error('Falha ao gravar cache de resultado do painel:', erroCache.message);
      }
      return res.json({ status: 'pronto', periodo: { dataInicio, dataFim }, desatualizado: false, cliente, ...dados });
    }

    try {
      await salvarProgresso(cnpj, dataInicio, dataFim, tipo, [...combosConcluidos], docsAcumulados, comboParcial);
    } catch (erroCache) {
      // Mesma lógica: um combo já concluído nesta chamada não pode se perder
      // por causa de uma falha pontual ao persistir o progresso — a próxima
      // chamada só reconsulta esse combo de novo (gasta uma cota extra da
      // SIEG, mas não trava a busca inteira).
      console.error('Falha ao gravar progresso do painel no Supabase:', erroCache.message);
    }
    const documentosNoComboAtual = comboParcial?.docs?.length || 0;
    return res.json({
      status: 'buscando',
      periodo: { dataInicio, dataFim },
      progresso: `${combosConcluidos.size}/${combos.length}`,
      // Um combo sozinho pode ter muitas páginas quando o cliente tem
      // bastante volume (ex.: muitas vendas NFCe) — sem isso, o contador de
      // combos concluídos fica parado em "0/2" por bastante tempo mesmo com
      // a busca avançando de verdade, página a página.
      documentosNoComboAtual,
      dataMaisRecenteBaixada: comboParcial ? maiorDataEmissao(comboParcial.docs) : null,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
