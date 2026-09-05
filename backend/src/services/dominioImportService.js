import * as XLSX from 'xlsx';

// Sinônimos de cabeçalho aceitos (já normalizados: sem acento, minúsculo,
// só letras/números/espaço). O relatório exportado do Domínio varia de
// escritório para escritório, então cobrimos as variações mais comuns em
// vez de exigir um layout fixo.
const SINONIMOS = {
  chave: ['chave', 'chave de acesso', 'chave nfe', 'chave acesso', 'chave do documento'],
  numero: ['numero', 'numero nota', 'nº nota', 'num nota', 'numero documento', 'nro nota', 'nf', 'numero nf', 'numero da nota'],
  serie: ['serie', 'serie nota', 'serie da nota'],
  cnpjEmit: ['cnpj emitente', 'cnpj do emitente', 'cnpj emit', 'cnpj fornecedor', 'cnpj remetente'],
  cnpjDest: ['cnpj destinatario', 'cnpj do destinatario', 'cnpj dest', 'cnpj cliente', 'cnpj tomador'],
  dataEmissao: ['data emissao', 'dt emissao', 'data de emissao', 'emissao', 'data'],
  cfop: ['cfop'],
  operacao: ['operacao', 'tipo', 'tipo operacao', 'tipo de operacao', 'entrada saida', 'e s', 'natureza', 'natureza da operacao'],
  valorTotal: ['valor total', 'valor nota', 'valor da nota', 'vl total', 'valor produtos', 'valor mercadoria', 'valor'],
  valorIcms: ['valor icms', 'vl icms', 'icms'],
  valorPis: ['valor pis', 'vl pis', 'pis'],
  valorCofins: ['valor cofins', 'vl cofins', 'cofins'],
};

const CAMPOS_OBRIGATORIOS = ['numero', 'valorTotal'];

function normalizarCabecalho(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function construirMapaDeColunas(headers) {
  const normalizados = headers.map((h) => ({ original: h, normalizado: normalizarCabecalho(h) }));
  const mapa = {};
  for (const [campo, sinonimos] of Object.entries(SINONIMOS)) {
    const encontrado = normalizados.find((h) => sinonimos.includes(h.normalizado));
    if (encontrado) mapa[campo] = encontrado.original;
  }
  return mapa;
}

function paraNumero(valor) {
  if (valor === undefined || valor === null || valor === '') return 0;
  if (typeof valor === 'number') return valor;
  // Aceita tanto "1234.56" quanto o formato brasileiro "1.234,56".
  const texto = String(valor).trim();
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

function paraDataISO(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  const texto = String(valor).trim();
  const brMatch = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const isoMatch = texto.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  return null;
}

function inferirOperacao(valorColuna, cfop) {
  if (valorColuna) {
    const v = normalizarCabecalho(valorColuna);
    if (['entrada', 'e', 'compra', 'compras'].includes(v)) return 'entrada';
    if (['saida', 's', 'venda', 'vendas'].includes(v)) return 'saida';
  }
  const primeiroDigito = String(cfop ?? '').trim()[0];
  if (['1', '2', '3'].includes(primeiroDigito)) return 'entrada';
  if (['5', '6', '7'].includes(primeiroDigito)) return 'saida';
  return 'desconhecida';
}

function limparCnpj(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function ehArquivoXlsx(buffer) {
  // Arquivos .xlsx são um ZIP (assinatura "PK"); CSV é texto puro. Detectamos
  // pelo conteúdo (não pelo nome) para não depender da extensão do upload.
  return buffer.length > 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function dividirLinhaCsv(linha, delimitador) {
  const campos = [];
  let atual = '';
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (c === delimitador && !dentroDeAspas) {
      campos.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

// CSV é lido manualmente, mantendo todo valor como texto puro. Deixar o
// SheetJS "adivinhar" tipos a partir de texto CSV corrompe números no
// formato brasileiro (ex.: "250,00" vira 25000, tratando a vírgula como
// separador de milhar) e datas "dd/mm/aaaa".
function parseCsvComoLinhas(buffer) {
  const texto = buffer.toString('utf-8').replace(/^﻿/, '');
  const linhasTexto = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!linhasTexto.length) return [];

  const qtdPontoVirgula = (linhasTexto[0].match(/;/g) || []).length;
  const qtdVirgula = (linhasTexto[0].match(/,/g) || []).length;
  const delimitador = qtdPontoVirgula >= qtdVirgula ? ';' : ',';

  const headers = dividirLinhaCsv(linhasTexto[0], delimitador);
  return linhasTexto.slice(1).map((linhaTexto) => {
    const valores = dividirLinhaCsv(linhaTexto, delimitador);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = valores[i] ?? '';
    });
    return obj;
  });
}

function parseXlsxComoLinhas(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const primeiraAba = workbook.SheetNames[0];
  const planilha = workbook.Sheets[primeiraAba];
  return XLSX.utils.sheet_to_json(planilha, { defval: '' });
}

/**
 * Lê um arquivo exportado do Domínio (XLSX ou CSV) e devolve documentos
 * normalizados no mesmo "formato de saída" usado para os XMLs da SIEG,
 * para permitir cruzamento direto entre as duas fontes.
 */
export function parseDominioFile(buffer) {
  const linhas = ehArquivoXlsx(buffer) ? parseXlsxComoLinhas(buffer) : parseCsvComoLinhas(buffer);

  if (!linhas.length) {
    throw new Error('A planilha do Domínio está vazia ou não foi possível ler nenhuma linha.');
  }

  const headers = Object.keys(linhas[0]);
  const mapa = construirMapaDeColunas(headers);

  const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !mapa[campo]);
  if (faltando.length) {
    throw new Error(
      `Não encontrei as colunas obrigatórias (${faltando.join(', ')}) na planilha do Domínio. ` +
        `Colunas encontradas: ${headers.join(', ')}. Renomeie o cabeçalho para algo reconhecível ` +
        `(ex.: "Número", "Valor Total") e exporte novamente.`
    );
  }

  const docs = linhas.map((linha, indice) => {
    const cfop = mapa.cfop ? linha[mapa.cfop] : '';
    return {
      linhaOrigem: indice + 2, // +2: cabeçalho ocupa a linha 1 da planilha
      chave: mapa.chave ? String(linha[mapa.chave] ?? '').trim() : '',
      numero: Number(String(linha[mapa.numero] ?? '').replace(/\D/g, '')) || 0,
      serie: mapa.serie ? Number(String(linha[mapa.serie] ?? '').replace(/\D/g, '')) || 0 : 0,
      cnpjEmit: mapa.cnpjEmit ? limparCnpj(linha[mapa.cnpjEmit]) : '',
      cnpjDest: mapa.cnpjDest ? limparCnpj(linha[mapa.cnpjDest]) : '',
      dataEmissao: mapa.dataEmissao ? paraDataISO(linha[mapa.dataEmissao]) : null,
      cfop: String(cfop ?? '').trim(),
      operacao: inferirOperacao(mapa.operacao ? linha[mapa.operacao] : null, cfop),
      valorTotal: paraNumero(linha[mapa.valorTotal]),
      valorIcms: mapa.valorIcms ? paraNumero(linha[mapa.valorIcms]) : 0,
      valorPis: mapa.valorPis ? paraNumero(linha[mapa.valorPis]) : 0,
      valorCofins: mapa.valorCofins ? paraNumero(linha[mapa.valorCofins]) : 0,
    };
  });

  return { docs, colunasMapeadas: mapa, colunasEncontradas: headers };
}
