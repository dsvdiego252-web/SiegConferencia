import * as XLSX from 'xlsx';

// Leitura genérica de planilha (XLSX ou CSV) em linhas de objeto, sem nenhum
// conhecimento do domínio (notas, produtos etc.) — compartilhado por todo
// serviço que precisa importar um arquivo exportado de outro sistema (ver
// dominioImportService.js e dominioProdutosImportService.js).

export function normalizarCabecalho(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Casa os cabeçalhos reais da planilha com os nomes de campo esperados, por
 * sinônimo — necessário porque o layout exportado varia de escritório pra
 * escritório. Quando mais de um cabeçalho bate com sinônimos do mesmo campo,
 * vence o sinônimo que aparece primeiro na lista (não o que aparece primeiro
 * na planilha).
 */
export function construirMapaDeColunas(headers, sinonimosPorCampo) {
  const normalizados = headers.map((h) => ({ original: h, normalizado: normalizarCabecalho(h) }));
  const mapa = {};
  for (const [campo, sinonimos] of Object.entries(sinonimosPorCampo)) {
    for (const sinonimo of sinonimos) {
      const encontrado = normalizados.find((h) => h.normalizado === sinonimo);
      if (encontrado) {
        mapa[campo] = encontrado.original;
        break;
      }
    }
  }
  return mapa;
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

export function lerPlanilhaComoLinhas(buffer) {
  return ehArquivoXlsx(buffer) ? parseXlsxComoLinhas(buffer) : parseCsvComoLinhas(buffer);
}
