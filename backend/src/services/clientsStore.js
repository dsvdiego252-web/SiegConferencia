import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENTS_FILE = path.join(__dirname, '..', 'data', 'clients.json');

// Na Vercel, o sistema de arquivos é somente leitura (fora de /tmp) — usar
// um arquivo local não funciona para persistir clientes cadastrados pelo
// painel. Quando SUPABASE_URL/SUPABASE_SECRET_KEY estão definidos, guardamos
// a lista de clientes numa tabela do Supabase; sem isso (dev local), cai de
// volta pro arquivo JSON. A secret key é usada porque esse client roda só
// no backend (nunca chega ao navegador) e a tabela não tem RLS habilitado.
const usarSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = usarSupabase
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
  : null;

export const REGIMES_TRIBUTARIOS = ['simples_nacional', 'mei', 'lucro_presumido', 'lucro_real'];

// Categorias atômicas de atividade — um cliente pode ter mais de uma (ex.:
// comércio + serviço), então não existe uma opção "combinada" separada
// (como "Comércio + Serviço" ou "Misto"): selecionar duas categorias já
// representa isso, sem duplicar dado.
export const ATIVIDADES = ['comercio_varejo', 'atacado', 'industria', 'servico'];

// Regimes especiais de ICMS aderidos pelo cliente, além do regime tributário
// geral — cada um com condição própria de elegibilidade conferida no ponto
// de uso (ver tax-engine/icms-engine/pipeline/validarAliquotaIcms.js), não
// aqui (aqui só valida que o código existe na lista).
// - icms_carne_4_5_sem_credito: alíquota de 4,5% destacada como "Imposto
//   Debitado" em toda saída de carne (NCM capítulo 02), sem tomar crédito —
//   Decreto 62.647/2017, art. 2º-A (redação Decreto 67.524/2023), RC
//   16.711/2017. Só faz sentido pra cliente no lucro_real.
export const REGIMES_ESPECIAIS = ['icms_carne_4_5_sem_credito'];

function normalizarClienteSupabase(row) {
  if (!row) return null;
  return {
    cnpj: row.cnpj,
    nome: row.nome,
    regimeTributario: row.regime_tributario || null,
    atividade: row.atividade || [],
    segmento: row.segmento || null,
    regimesEspeciais: row.regimes_especiais || [],
    telefone: row.telefone || null,
    email: row.email || null,
  };
}

export async function listarClientes() {
  if (usarSupabase) {
    const { data, error } = await supabase
      .from('clientes')
      .select('cnpj, nome, regime_tributario, atividade, segmento, regimes_especiais, telefone, email')
      .order('nome');
    if (error) throw new Error(`Falha ao listar clientes no Supabase: ${error.message}`);
    return data.map(normalizarClienteSupabase);
  }
  const raw = await readFile(CLIENTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function obterCliente(cnpj) {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');

  if (usarSupabase) {
    const { data, error } = await supabase
      .from('clientes')
      .select('cnpj, nome, regime_tributario, atividade, segmento, regimes_especiais, telefone, email')
      .eq('cnpj', cnpjLimpo)
      .maybeSingle();
    if (error) throw new Error(`Falha ao buscar cliente no Supabase: ${error.message}`);
    return normalizarClienteSupabase(data);
  }

  const clientes = await listarClientes();
  return clientes.find((c) => c.cnpj === cnpjLimpo) || null;
}

function validarRegime(regimeTributario) {
  if (!regimeTributario) return null;
  if (!REGIMES_TRIBUTARIOS.includes(regimeTributario)) {
    throw new Error(`Regime tributário inválido: ${regimeTributario}`);
  }
  return regimeTributario;
}

// O segmento (ex.: "Farmácia", "Supermercado") é só um auxiliar de
// classificação, não a base da tributação — por isso é texto livre em vez
// de uma lista fechada: a lista de exemplos do cadastro é uma sugestão
// (via datalist no front-end), não uma restrição.
function validarSegmento(segmento) {
  const limpo = String(segmento || '').trim();
  return limpo || null;
}

// Telefone/e-mail são só texto livre (mesmo espírito de segmento) — a
// aba Notificações monta o link wa.me/mailto com o que estiver aqui, sem
// exigir um formato específico, pra não travar o cadastro por causa de
// formatação de número de telefone.
function validarTelefone(telefone) {
  const limpo = String(telefone || '').trim();
  return limpo || null;
}

function validarEmail(email) {
  const limpo = String(email || '').trim();
  return limpo || null;
}

function validarAtividade(atividade) {
  if (atividade === undefined || atividade === null) return [];
  const lista = Array.isArray(atividade) ? atividade : [atividade];
  const invalida = lista.find((a) => !ATIVIDADES.includes(a));
  if (invalida) throw new Error(`Atividade inválida: ${invalida}`);
  return [...new Set(lista)];
}

function validarRegimesEspeciais(regimesEspeciais) {
  if (regimesEspeciais === undefined || regimesEspeciais === null) return [];
  const lista = Array.isArray(regimesEspeciais) ? regimesEspeciais : [regimesEspeciais];
  const invalido = lista.find((r) => !REGIMES_ESPECIAIS.includes(r));
  if (invalido) throw new Error(`Regime especial inválido: ${invalido}`);
  return [...new Set(lista)];
}

export async function adicionarCliente({ cnpj, nome, regimeTributario, atividade, segmento, regimesEspeciais, telefone, email }) {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  if (!cnpjLimpo || cnpjLimpo.length !== 14) {
    throw new Error('CNPJ inválido: informe os 14 dígitos.');
  }
  const regime = validarRegime(regimeTributario);
  const atividadeValidada = validarAtividade(atividade);
  const segmentoValidado = validarSegmento(segmento);
  const regimesEspeciaisValidados = validarRegimesEspeciais(regimesEspeciais);
  const telefoneValidado = validarTelefone(telefone);
  const emailValidado = validarEmail(email);

  if (usarSupabase) {
    if (await obterCliente(cnpjLimpo)) {
      throw new Error('Já existe um cliente cadastrado com esse CNPJ.');
    }
    const { error } = await supabase.from('clientes').insert({
      cnpj: cnpjLimpo,
      nome: nome || cnpjLimpo,
      regime_tributario: regime,
      atividade: atividadeValidada,
      segmento: segmentoValidado,
      regimes_especiais: regimesEspeciaisValidados,
      telefone: telefoneValidado,
      email: emailValidado,
    });
    if (error) throw new Error(`Falha ao cadastrar cliente no Supabase: ${error.message}`);
    return listarClientes();
  }

  const clientes = await listarClientes();
  if (clientes.some((c) => c.cnpj === cnpjLimpo)) {
    throw new Error('Já existe um cliente cadastrado com esse CNPJ.');
  }
  clientes.push({
    cnpj: cnpjLimpo,
    nome: nome || cnpjLimpo,
    regimeTributario: regime,
    atividade: atividadeValidada,
    segmento: segmentoValidado,
    regimesEspeciais: regimesEspeciaisValidados,
    telefone: telefoneValidado,
    email: emailValidado,
  });
  await writeFile(CLIENTS_FILE, JSON.stringify(clientes, null, 2));
  return clientes;
}

export async function atualizarCliente(cnpj, { nome, regimeTributario, atividade, segmento, regimesEspeciais, telefone, email }) {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  const atual = await obterCliente(cnpjLimpo);
  if (!atual) throw new Error('Cliente não encontrado.');
  const regime = regimeTributario === undefined ? atual.regimeTributario : validarRegime(regimeTributario);
  const novoNome = nome === undefined || nome === '' ? atual.nome : nome;
  const novaAtividade = atividade === undefined ? atual.atividade : validarAtividade(atividade);
  const novoSegmento = segmento === undefined ? atual.segmento : validarSegmento(segmento);
  const novosRegimesEspeciais = regimesEspeciais === undefined ? atual.regimesEspeciais : validarRegimesEspeciais(regimesEspeciais);
  const novoTelefone = telefone === undefined ? atual.telefone : validarTelefone(telefone);
  const novoEmail = email === undefined ? atual.email : validarEmail(email);

  if (usarSupabase) {
    const { error } = await supabase
      .from('clientes')
      .update({
        nome: novoNome,
        regime_tributario: regime,
        atividade: novaAtividade,
        segmento: novoSegmento,
        regimes_especiais: novosRegimesEspeciais,
        telefone: novoTelefone,
        email: novoEmail,
      })
      .eq('cnpj', cnpjLimpo);
    if (error) throw new Error(`Falha ao atualizar cliente no Supabase: ${error.message}`);
    return listarClientes();
  }

  const clientes = await listarClientes();
  const indice = clientes.findIndex((c) => c.cnpj === cnpjLimpo);
  clientes[indice] = {
    ...clientes[indice],
    nome: novoNome,
    regimeTributario: regime,
    atividade: novaAtividade,
    segmento: novoSegmento,
    regimesEspeciais: novosRegimesEspeciais,
    telefone: novoTelefone,
    email: novoEmail,
  };
  await writeFile(CLIENTS_FILE, JSON.stringify(clientes, null, 2));
  return clientes;
}
