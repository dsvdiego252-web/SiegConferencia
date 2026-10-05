import { createClient } from '@supabase/supabase-js';

export const supabaseDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

// Teto pra qualquer chamada ao Supabase feita pelo backend inteiro. Sem
// isso, uma chamada que trave (ex.: uma conexão que nunca fecha o
// handshake, instabilidade pontual de rede entre a função e o Supabase)
// fica pendurada até o corte duro de 60s da Vercel (504) — sem nenhuma
// chance de tratar como instabilidade passageira e salvar o progresso já
// feito. Isso já aconteceu de verdade mesmo depois de proteger só a
// chamada que parecia ser a mais pesada (busca de documentos cacheados):
// qualquer outra chamada ao Supabase espalhada pelos vários serviços tinha
// o mesmo risco. Proteger aqui, uma vez só, no cliente compartilhado por
// todos eles, cobre todas de uma vez — presente e futura.
const TIMEOUT_SUPABASE_MS = 20_000;

function fetchComTimeout(input, init) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_SUPABASE_MS);
  // Quando quem chamou já passou seu próprio AbortSignal (ex.: .abortSignal()
  // do query builder, usado pra respeitar o orçamento de uma requisição em
  // andamento), os dois valem — o que abortar primeiro vence.
  const sinalExterno = init?.signal;
  if (sinalExterno) {
    if (sinalExterno.aborted) controller.abort();
    else sinalExterno.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

// Cliente único, reaproveitado por todos os serviços que falam com o
// Supabase (em vez de cada um criar o seu) — garante que o timeout acima
// vale sempre, sem depender de lembrar de configurá-lo em cada lugar novo.
export const supabase = supabaseDisponivel
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { global: { fetch: fetchComTimeout } })
  : null;
