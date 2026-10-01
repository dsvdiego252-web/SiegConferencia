import { Router } from 'express';
import { waitUntil } from '@vercel/functions';
import { listarClientes } from '../services/clientsStore.js';
import { listarCombos, chaveCombo, buscarCombo, mesclarDocumentos } from '../services/documentsService.js';
import { registrarSincronizacao, cacheDocumentosDisponivel } from '../services/documentCache.js';
import { obterEstado, salvarEstado, estadoDisponivel } from '../services/syncNoturnoEstado.js';
import { auditarDocumentosFiscais } from '../services/dataAudit.js';
import { relatorioNcmSemRegra } from '../services/ncmCoverageReport.js';
import { gerarPainelConsolidado, buscarDocumentosConsolidado } from '../services/painelConsolidado.js';
import { auditarMotorTributario } from '../services/motorTributarioAudit.js';
import { gerarCadastroProdutos } from '../services/productCatalogService.js';

export const cronRouter = Router();

// Mesma margem de segurança usada em painel.js — reserva tempo pra montar a
// resposta e (se precisar) disparar a próxima chamada encadeada antes do
// teto de execução da função (60s no plano Hobby da Vercel).
const ORCAMENTO_MS = 45_000;

// Salvaguarda contra um loop indefinido (ex.: bug que impede o progresso de
// avançar) — nesse número de execuções encadeadas a rodada é abortada e
// marcada com erro, em vez de ficar chamando a si mesma pra sempre.
const MAX_INVOCACOES_ENCADEADAS = 300;

// Uma trava "rodando" que nunca terminou (ex.: a função caiu no meio) fica
// abandonada depois desse tempo, liberando uma nova rodada em vez de travar
// pra sempre.
const TRAVA_ABANDONADA_MS = 6 * 60 * 60 * 1000;

function diaOffset(offsetDias) {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() - offsetDias);
  return data.toISOString().slice(0, 10);
}

// Ontem e anteontem: a janela que a sincronização noturna mantém sempre em
// dia, até cada um desses dias passar da janela de estabilidade (ver
// documentCache.js) e virar cache permanente sozinho.
function diasAlvo() {
  return [diaOffset(1), diaOffset(2)];
}

// A SIEG é compartilhada por todos os clientes (mesma API Key, mesmo limite
// de 2 requisições/minuto) — rodar a sincronização noturna o dia inteiro
// competiria pela mesma cota das buscas ao vivo de quem está usando o
// painel. Por isso ela só avança fora do horário comercial (22h–6h,
// horário de Brasília, fixo — o Brasil não observa mais horário de verão
// desde 2019); fora dessa janela, ela simplesmente pausa e retoma na
// próxima noite de onde parou.
function dentroDaJanelaNoturna() {
  const horaBRT = (new Date().getUTCHours() + 21) % 24; // UTC-3, sem horário de verão
  return horaBRT >= 22 || horaBRT < 6;
}

// Com ~150+ clientes x 2 dias x 4 combos, uma única janela noturna (~8h)
// pode não dar conta de todo mundo, dependendo do volume (o limite de
// 2 req/min da SIEG é o mesmo de sempre, compartilhado). Pra não deixar
// sempre os mesmos clientes "no final da fila" sem cobertura em noites que
// não terminam, o ponto de partida gira um pouco a cada dia.
function offsetRotativo(totalUnidades) {
  if (!totalUnidades) return 0;
  const diasDesdeEpoch = Math.floor(Date.now() / 86_400_000);
  return diasDesdeEpoch % totalUnidades;
}

cronRouter.get('/sincronizar-noturno', async (req, res) => {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ erro: 'Não autorizado.' });
    }
  }

  if (!estadoDisponivel || !cacheDocumentosDisponivel) {
    return res.json({ status: 'ignorado', motivo: 'Supabase não configurado — cache permanente desligado.' });
  }

  const dias = diasAlvo();
  const clientes = await listarClientes();
  const combos = listarCombos();
  const totalUnidades = clientes.length * dias.length;

  if (!totalUnidades) {
    return res.json({ status: 'concluido', motivo: 'Nenhum cliente cadastrado.' });
  }

  let estado = await obterEstado();
  const agoraISO = new Date().toISOString();

  const rodadaAntigaAbandonada =
    estado?.status === 'rodando' && estado.iniciado_em && Date.now() - new Date(estado.iniciado_em).getTime() > TRAVA_ABANDONADA_MS;

  const precisaComecarDeNovo = !estado || estado.status !== 'rodando' || estado.data_alvo !== dias[0] || rodadaAntigaAbandonada;

  if (precisaComecarDeNovo) {
    estado = {
      data_alvo: dias[0],
      offset_inicial: offsetRotativo(totalUnidades),
      visitados: 0,
      combos_concluidos: [],
      combo_parcial: null,
      status: 'rodando',
      iniciado_em: agoraISO,
      invocacoes: 0,
    };
  }

  if ((estado.invocacoes || 0) >= MAX_INVOCACOES_ENCADEADAS) {
    await salvarEstado({ ...estado, status: 'erro' });
    return res.json({ status: 'erro', motivo: 'Excedeu o limite de execuções encadeadas nesta rodada.' });
  }

  const prazoFinal = Date.now() + ORCAMENTO_MS;
  let visitados = estado.visitados;
  let combosConcluidos = new Set(estado.combos_concluidos || []);
  let comboParcial = estado.combo_parcial || null;
  let processados = 0;

  while (visitados < totalUnidades && Date.now() < prazoFinal) {
    const posicao = (estado.offset_inicial + visitados) % totalUnidades;
    const cliente = clientes[Math.floor(posicao / dias.length)];
    const dia = dias[posicao % dias.length];

    // Mesma lógica de retomada de painel.js: um combo (tipo x direção) com
    // bastante volume (ex.: NFCe de venda de uma farmácia) pode precisar de
    // várias páginas — mais do que cabe no orçamento de uma única invocação,
    // já que o rate limit real da SIEG (2/min, ~31s entre chamadas) permite
    // pouco mais de 1 página por chamada. Sem guardar `proximoSkip` entre
    // invocações, cada tentativa reiniciava esse combo do zero e ele nunca
    // terminava — era por isso que clientes de alto volume paravam de
    // aparecer atualizados um dia e nunca mais avançavam.
    for (const combo of combos) {
      const chave = chaveCombo(combo);
      if (combosConcluidos.has(chave)) continue;
      if (Date.now() >= prazoFinal) break;

      const emAndamento = comboParcial && comboParcial.chave === chave;
      const skipInicial = emAndamento ? comboParcial.proximoSkip : 0;
      const docsJaDoCombo = emAndamento ? comboParcial.docs : [];

      try {
        const resultado = await buscarCombo(combo, {
          clienteCnpj: cliente.cnpj,
          dataInicio: dia,
          dataFim: dia,
          skipInicial,
          prazoFinal,
        });
        const docsAtualizados = mesclarDocumentos(docsJaDoCombo, resultado.docs);
        if (!resultado.completo) {
          comboParcial = { chave, proximoSkip: resultado.proximoSkip, docs: docsAtualizados };
          break;
        }
        combosConcluidos.add(chave);
        comboParcial = null;
        if (!resultado.doCache && docsAtualizados.length) {
          await registrarSincronizacao(cliente.cnpj, combo.xmlType, combo.direcao, dia, dia, docsAtualizados);
        }
      } catch (err) {
        // Uma falha num cliente/combo não pode travar a rodada inteira dos
        // outros — só loga e segue pro próximo (desiste desse combo por
        // agora, tenta de novo quando esse cliente+dia voltar na rotação).
        console.error(`Sincronização noturna: falha em ${cliente.cnpj} ${chave} ${dia}: ${err.message}`);
        combosConcluidos.add(chave);
        comboParcial = null;
      }
    }

    // Nem todos os combos desse cliente+dia terminaram dentro do orçamento
    // desta invocação — para aqui (sem avançar `visitados`) pra retomar
    // exatamente esse cliente+dia, do combo em que parou, na próxima chamada.
    if (combosConcluidos.size < combos.length) break;

    visitados += 1;
    combosConcluidos = new Set();
    comboParcial = null;
    processados += 1;
  }

  const concluiu = visitados >= totalUnidades;
  const novoEstado = {
    data_alvo: dias[0],
    offset_inicial: estado.offset_inicial,
    visitados: concluiu ? 0 : visitados,
    combos_concluidos: concluiu ? [] : [...combosConcluidos],
    combo_parcial: concluiu ? null : comboParcial,
    status: concluiu ? 'concluido' : 'rodando',
    iniciado_em: estado.iniciado_em,
    invocacoes: (estado.invocacoes || 0) + 1,
  };
  await salvarEstado(novoEstado);

  // Aproveita o fim de cada rodada noturna (já dentro do orçamento de tempo
  // de uma invocação de cron, sem custo de uma chamada extra à SIEG) pra
  // rodar o canário de corrupção de CNPJ/NCM — loga no console (visível nos
  // logs da função na Vercel) em vez de travar a resposta por causa disso.
  if (concluiu) {
    auditarDocumentosFiscais()
      .then((resultado) => {
        if (resultado.status === 'concluido' && !resultado.limpo) {
          console.error('Auditoria de dados encontrou corrupção de CNPJ/NCM:', JSON.stringify(resultado.achados));
        }
      })
      .catch((err) => console.error('Falha ao rodar auditoria de dados pós sincronização noturna:', err.message));
  }

  const aindaDentroDaJanela = dentroDaJanelaNoturna();
  if (!concluiu && aindaDentroDaJanela) {
    // Continua sozinha: chama a si mesma pra processar o restante, sem
    // esperar o próximo disparo do Cron (que na Vercel só roda 1x/dia no
    // plano Hobby — não daria conta de mais de cem clientes numa execução
    // só de 45s). waitUntil mantém a função viva até essa chamada
    // terminar de ser enviada, sem atrasar a resposta desta.
    //
    // O projeto tem a Vercel Authentication (SSO) ligada pros domínios
    // *.vercel.app (não tem domínio próprio) — o disparo real do Cron da
    // Vercel passa direto por isso (é reconhecido como infraestrutura da
    // própria Vercel), mas esse fetch daqui é só uma chamada de saída
    // comum: pro muro de autenticação, é indistinguível de qualquer
    // visitante anônimo, e era barrado ali mesmo, antes de chegar no
    // CRON_SECRET (era esse o motivo real da sincronização nunca passar
    // de uma única invocação, mesmo com o waitUntil). O cabeçalho
    // x-vercel-protection-bypass com o "Protection Bypass for Automation"
    // do projeto (exposto automaticamente como
    // VERCEL_AUTOMATION_BYPASS_SECRET) é o jeito oficial da Vercel de
    // liberar esse tipo de chamada automatizada.
    const proximaUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    const headers = process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {};
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    }
    waitUntil(
      fetch(proximaUrl, { headers }).catch((err) => {
        console.error('Falha ao encadear a próxima execução da sincronização noturna:', err.message);
      })
    );
  }

  res.json({
    status: concluiu ? 'concluido' : aindaDentroDaJanela ? 'continuando' : 'pausado_fora_da_janela',
    processadosNestaChamada: processados,
    visitados,
    totalUnidades,
  });
});

// Sob demanda (botão "Auditoria de dados" no painel, autenticado pela
// própria sessão de login — exigirSessao em app.js já cobre isso) — não
// depende da sincronização noturna ter rodado.
cronRouter.get('/auditoria-dados', async (req, res) => {
  try {
    const resultado = await auditarDocumentosFiscais();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ status: 'erro', erro: err.message });
  }
});

// Sob demanda (botão "NCMs sem regra" no painel) — pra priorizar onde
// expandir a base de regras RTC pelos NCMs que os clientes reais de fato
// usam, em vez de tentar cobrir a tabela NCM inteira de uma vez.
cronRouter.get('/relatorio-ncm-sem-regra', async (req, res) => {
  try {
    const resultado = await relatorioNcmSemRegra();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ status: 'erro', erro: err.message });
  }
});

// Cruza todos os clientes cadastrados de uma vez (só lê o cache permanente,
// nunca busca ao vivo na SIEG) — "quem tem pendência" sem precisar abrir
// cliente por cliente. Ver painelConsolidado.js para os detalhes da janela
// de 30 dias e do porquê de nunca disparar busca ao vivo aqui.
cronRouter.get('/painel-consolidado', async (req, res) => {
  try {
    const resultado = await gerarPainelConsolidado();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ status: 'erro', erro: err.message });
  }
});

// Documentos de um cliente/dia específico do painel consolidado — clicar
// num dia na tela abre isso em vez de repetir a busca inteira na SIEG,
// já que o cache permanente já tem esses documentos.
cronRouter.get('/painel-consolidado/documentos', async (req, res) => {
  try {
    const { cnpj, dia } = req.query;
    if (!cnpj || !dia) return res.status(400).json({ erro: 'Informe "cnpj" e "dia".' });
    const resultado = await buscarDocumentosConsolidado(cnpj, dia);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ status: 'erro', erro: err.message });
  }
});

// Sob demanda (botão "Conferência do motor tributário" na aba Auditoria
// Fiscal) — roda a Validação Matemática e o XML_REFORMA_VALIDATOR sobre
// todo o cache permanente, cliente a cliente, só lendo dados já coletados.
cronRouter.get('/auditoria-motor-tributario', async (req, res) => {
  try {
    const resultado = await auditarMotorTributario();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ status: 'erro', erro: err.message });
  }
});

// Botão "Exportar Cadastros" na Conferência Fiscal — um produto por linha
// (não uma venda/compra por linha), saída e entrada separadas, a partir de
// todo o histórico já cacheado do cliente, nunca busca ao vivo na SIEG.
cronRouter.get('/cadastro-produtos', async (req, res) => {
  try {
    const { cnpj } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });
    const resultado = await gerarCadastroProdutos(cnpj);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ status: 'erro', erro: err.message });
  }
});
