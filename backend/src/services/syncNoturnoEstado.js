import { createClient } from '@supabase/supabase-js';

// Estado (linha única, id=1) da sincronização noturna — permite retomar de
// onde parou entre execuções encadeadas (ver routes/cron.js) e entre
// diferentes noites, sem depender de nenhuma memória de processo.
export const estadoDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = estadoDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

export async function obterEstado() {
  const { data, error } = await supabase.from('sync_noturno_estado').select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(`Falha ao ler estado da sincronização noturna: ${error.message}`);
  return data;
}

export async function salvarEstado(estado) {
  const { error } = await supabase.from('sync_noturno_estado').upsert({ id: 1, ...estado, atualizado_em: new Date().toISOString() });
  if (error) throw new Error(`Falha ao gravar estado da sincronização noturna: ${error.message}`);
}
