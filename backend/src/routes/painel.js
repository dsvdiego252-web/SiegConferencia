import { Router } from 'express';
import { waitUntil } from '@vercel/functions';
import { obterDocumentosClassificados } from '../services/documentsService.js';
import { resolverPeriodo } from '../services/dateUtils.js';
import { resolverDataCorteReforma } from '../services/reformaTributariaAnalyzer.js';
import { obterCliente } from '../services/clientsStore.js';
import { cacheDisponivel, lerCache, reiniciarBusca, estaExpirado, JANELA_PROCESSAMENTO_FUNDO_MS } from '../services/painelCache.js';
import { montarPainelDeClassificados } from '../services/painelBuilder.js';
import { processarUmPasso, resolverTipos, normalizarTipo } from '../services/painelSearchService.js';

export const painelRouter = Router();

// Dispara (sem esperar) uma continuação em segundo plano que segue
// avançando essa busca sozinha no servidor — ver routes/cron.js:
// /continuar-painel. Existe porque um cliente de alto volume (milhares de
// documentos) pode precisar de bem mais de uma hora de busca contínua (o
// rate limit real da SIEG é 2 requisições/minuto), e nenhum navegador
// aguenta ficar ativo tanto tempo sem aba trocar, perder foco ou a conexão
// cair — quando isso acontecia, o progresso ficava parado exatamente onde
// parou, sem ninguém pra continuar empurrando.
//
// Só dispara quando ainda não parece ter uma continuação ativa
// (processandoEm recente): sem essa checagem, cada poll do navegador (a
// cada 2s) dispararia a sua própria cadeia nova, multiplicando chamadas
// concorrentes à mesma cota da SIEG à toa. É uma checagem "melhor esforço"
// (não é um lock atômico) — o pior caso de uma corrida aqui é só uma
// cadeia a mais rodando por um tempinho, nunca perda de progresso
// (buscarCombo já é idempotente por chave de acesso).
function dispararContinuacaoEmSegundoPlano(req, cnpj, dataInicio, dataFim, tipo, processandoEm) {
  if (!process.env.CRON_SECRET) return; // sem isso, a rota de continuação fica inacessível de propósito
  const cadeiaProvavelmenteAtiva = processandoEm && Date.now() - new Date(processandoEm).getTime() < JANELA_PROCESSAMENTO_FUNDO_MS;
  if (cadeiaProvavelmenteAtiva) return;

  const url = `${req.protocol}://${req.get('host')}/api/cron/continuar-painel?cnpj=${encodeURIComponent(cnpj)}&inicio=${encodeURIComponent(dataInicio)}&fim=${encodeURIComponent(dataFim)}&tipo=${encodeURIComponent(tipo)}`;
  const headers = { Authorization: `Bearer ${process.env.CRON_SECRET}` };
  // Mesmo motivo do encadeamento da sincronização noturna (ver cron.js): a
  // Vercel Authentication (SSO) ligada pro domínio *.vercel.app barra
  // qualquer chamada de saída comum antes mesmo dela chegar no
  // CRON_SECRET — esse cabeçalho é o jeito oficial de liberar isso pra
  // automação do próprio projeto.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  waitUntil(
    fetch(url, { headers }).catch((err) => {
      console.error('Falha ao disparar continuação em segundo plano do painel:', err.message);
    })
  );
}

painelRouter.get('/', async (req, res) => {
  try {
    const { cnpj, forcar } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const cliente = await obterCliente(cnpj);
    const tipo = normalizarTipo(req.query.tipo);
    const dataCorteReforma = resolverDataCorteReforma();

    // Sem Supabase configurado (dev local), busca tudo direto — o modo mock
    // é instantâneo, sem risco de estourar o tempo de execução.
    if (!cacheDisponivel) {
      const tipos = resolverTipos(req.query.tipo);
      const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim, tipos });
      return res.json({
        status: 'pronto',
        periodo: { dataInicio, dataFim },
        cliente,
        ...montarPainelDeClassificados(classificados, dataCorteReforma, cliente?.regimeTributario, cliente?.atividade, cliente?.regimesEspeciais),
      });
    }

    let cache = await lerCache(cnpj, dataInicio, dataFim, tipo);

    // 'erro' entra aqui também: sem isso, um clique comum em "Buscar"
    // depois de uma falha (mesmo uma instabilidade passageira que já foi
    // corrigida ou resolvida sozinha) só repetia pra sempre a mesma
    // mensagem salva, até alguém descobrir que precisa clicar em "Forçar
    // atualização" especificamente pra tentar de novo. Reiniciar do zero
    // num erro é seguro (idempotente — nada se perde, combos já
    // confirmados no cache permanente não precisam ser rebaixados de
    // verdade, só reconferidos).
    const precisaReiniciar =
      !cache || forcar === '1' || cache.status === 'erro' || (cache.status === 'pronto' && estaExpirado(cache.atualizado_em));
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

    // status === 'buscando': avança um passo agora (resposta rápida pro
    // navegador, igual sempre foi) e garante que uma continuação em
    // segundo plano segue avançando sozinha depois disso, caso ainda não
    // tenha terminado — ver processarUmPasso em painelSearchService.js e
    // dispararContinuacaoEmSegundoPlano acima.
    const resultado = await processarUmPasso(cnpj, dataInicio, dataFim, tipo);

    if (resultado.tipo === 'pronto') {
      return res.json({ status: 'pronto', periodo: { dataInicio, dataFim }, desatualizado: false, cliente: resultado.cliente, ...resultado.dados });
    }

    if (resultado.tipo === 'erro') {
      return res.json({ status: 'erro', periodo: { dataInicio, dataFim }, erro: resultado.erro });
    }

    dispararContinuacaoEmSegundoPlano(req, cnpj, dataInicio, dataFim, tipo, cache.processando_em);

    return res.json({
      status: 'buscando',
      periodo: { dataInicio, dataFim },
      progresso: resultado.progresso,
      // Um combo sozinho pode ter muitas páginas quando o cliente tem
      // bastante volume (ex.: muitas vendas NFCe) — sem isso, o contador de
      // combos concluídos fica parado em "0/2" por bastante tempo mesmo com
      // a busca avançando de verdade, página a página.
      documentosNoComboAtual: resultado.documentosNoComboAtual,
      dataMaisRecenteBaixada: resultado.dataMaisRecenteBaixada,
      avisoTransitorio: resultado.avisoTransitorio,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
