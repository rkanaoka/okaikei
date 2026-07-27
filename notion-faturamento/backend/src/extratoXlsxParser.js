const XLSX = require('xlsx');

// ── Datas por extenso em português: "Sexta, 30 de janeiro de 2026" ─────────
const MONTHS_PT = {
  janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function parseLongDate(str) {
  const m = String(str).match(/,\s*(\d{1,2})\s+de\s+([^\s,]+)\s+de\s+(\d{4})/i);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS_PT[stripAccents(m[2].toLowerCase())];
  const year = Number(m[3]);
  if (!month) return null;
  return { day, month, year };
}

// "30/06/2026" -> {day:30, month:6, year:2026}
function parseSlashDate(str) {
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
}

function toIso(d) {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function toBr(d) {
  return `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}`;
}

function isRowEmpty(row) {
  if (!row) return true;
  return row.every((c) => c === null || c === undefined || String(c).trim() === '');
}

function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

/**
 * Procura o período do extrato em alguma célula do tipo
 * "Extrato de 01/01/2026 a 31/01/2026" (formato "simples").
 */
function findPeriodFromText(rows) {
  for (const row of rows) {
    for (const cell of row || []) {
      if (typeof cell !== 'string') continue;
      const m = cell.match(/Extrato de (\d{2})\/(\d{2})\/(\d{4}) a (\d{2})\/(\d{2})\/(\d{4})/i);
      if (m) {
        return { month: Number(m[2]), year: Number(m[3]) };
      }
    }
  }
  return null;
}

/**
 * Nome de arquivo no formato "yyyyMM_*.xlsx" (ex: "202607_extrato.xlsx").
 */
function findPeriodFromFileName(fileName) {
  const m = String(fileName || '').match(/^(\d{4})(\d{2})_/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

/**
 * Último recurso: mês/ano mais frequente entre as datas dos lançamentos já
 * extraídos (a imensa maioria dos extratos cobre um único mês; isso cobre
 * com folga o caso raro de alguma linha isolada de outro mês).
 */
function findPeriodFromTransactions(transactions) {
  const monthCounts = new Map();
  for (const t of transactions) {
    const [year, month] = t.dataIso.split('-').map(Number);
    const key = `${year}-${month}`;
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
  }
  let bestKey = null;
  let bestCount = -1;
  for (const [key, count] of monthCounts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  if (!bestKey) return null;
  const [year, month] = bestKey.split('-').map(Number);
  return { month, year };
}

/**
 * Identifica qual dos dois layouts conhecidos de extrato Santander a
 * planilha usa, e em que linha fica o cabeçalho.
 *
 * - "simples": colunas Data | Descrição | Crédito (R$) | Débito (R$), com
 *   uma célula "Extrato de DD/MM/AAAA a DD/MM/AAAA" indicando o período.
 * - "detalhado": colunas Data | Histórico | Documento | Valor (R$) | Saldo (R$),
 *   sem célula de período — a competência é inferida a partir das datas.
 */
function findHeader(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const a = String(row[0] || '').trim().toLowerCase();
    const b = String(row[1] || '').trim().toLowerCase();
    const c = String(row[2] || '').trim().toLowerCase();
    if (a !== 'data') continue;
    if (b.startsWith('descri')) return { index: i, format: 'simples' };
    if (b.startsWith('hist') && c.startsWith('documento')) return { index: i, format: 'detalhado' };
  }
  return null;
}

/**
 * Layout "simples": Data | Descrição | Crédito (R$) | Débito (R$).
 *
 * O período é resolvido em ordem de preferência: texto "Extrato de ... a
 * ..." na planilha (quando existe) > nome do arquivo "yyyyMM_*.xlsx" > mês/ano
 * mais frequente entre as datas dos lançamentos.
 */
function parseSimpleFormat(rows, headerIdx, fileName) {
  const seqByDate = {};
  const transactions = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isRowEmpty(row)) continue;

    const [dataCell, descCell, creditoCell, debitoCell] = row;
    const descTrim = normalizeSpaces(descCell);
    if (!dataCell || descTrim.toUpperCase() === 'TOTAL') continue; // linha de total/rodapé

    const parsedDate = parseLongDate(dataCell);
    if (!parsedDate) continue; // linha inesperada, ignora

    const credito = Number(creditoCell) || 0;
    const debito = Number(debitoCell) || 0;
    if (credito === 0 && debito === 0) continue; // sem valor, nada a lançar

    const dataIso = toIso(parsedDate);
    seqByDate[dataIso] = (seqByDate[dataIso] || 0) + 1;
    const seq = seqByDate[dataIso];

    transactions.push({
      data: toBr(parsedDate),
      dataIso,
      descricao: descTrim,
      entrada: credito > 0 ? credito : null,
      saida: debito > 0 ? debito : null,
      chave: `${dataIso}#${seq}`,
    });
  }

  const period = findPeriodFromText(rows) || findPeriodFromFileName(fileName) || findPeriodFromTransactions(transactions);
  if (!period) {
    throw new Error(
      'Não foi possível identificar o período do extrato (nem pelo texto, nem pelo nome do arquivo "yyyyMM_*.xlsx", nem pelas datas dos lançamentos).',
    );
  }

  return { period, transactions };
}

/**
 * Layout "detalhado": Data | Histórico | Documento | Valor (R$) | Saldo (R$).
 * A descrição é a concatenação de Histórico + Documento. O Valor já vem
 * assinado (positivo = crédito, negativo = débito). Não há célula de
 * período — a competência é a moda dos meses/anos encontrados nas datas.
 */
function parseDetalhadoFormat(rows, headerIdx) {
  const seqByDate = {};
  const transactions = [];
  const monthCounts = new Map();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isRowEmpty(row)) continue;

    const [dataCell, historicoCell, documentoCell, valorCell] = row;
    if (!dataCell) continue;

    const parsedDate = parseSlashDate(dataCell);
    if (!parsedDate) continue; // linha inesperada (ex: rodapé), ignora

    const valor = Number(valorCell);
    if (!valor) continue; // sem valor, nada a lançar

    const historico = normalizeSpaces(historicoCell);
    const documento = normalizeSpaces(documentoCell);
    const descricao = documento ? `${historico} ${documento}` : historico;

    const dataIso = toIso(parsedDate);
    seqByDate[dataIso] = (seqByDate[dataIso] || 0) + 1;
    const seq = seqByDate[dataIso];

    const monthKey = `${parsedDate.year}-${parsedDate.month}`;
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);

    transactions.push({
      data: toBr(parsedDate),
      dataIso,
      descricao,
      entrada: valor > 0 ? valor : null,
      saida: valor < 0 ? -valor : null,
      chave: `${dataIso}#${seq}`,
    });
  }

  if (transactions.length === 0) {
    throw new Error('Nenhum lançamento válido encontrado na planilha.');
  }

  // competência = mês/ano mais frequente entre os lançamentos (a imensa
  // maioria dos extratos cobre um único mês; isso cobre com folga o caso
  // raro de alguma linha isolada de outro mês).
  let bestKey = null;
  let bestCount = -1;
  for (const [key, count] of monthCounts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  const [year, month] = bestKey.split('-').map(Number);

  return { period: { month, year }, transactions };
}

/**
 * Recebe o buffer de um extrato mensal Santander (.xlsx), detecta qual dos
 * dois layouts conhecidos está sendo usado e devolve as linhas de
 * movimentação no mesmo formato usado pelo parser do extrato Itaú
 * (data/dataIso/descricao/entrada/saida/chave), para reaproveitar a mesma
 * sincronização com o Notion.
 */
function parseExtratoXlsxBuffer(buffer, fileName) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  const header = findHeader(rows);
  if (!header) {
    throw new Error(
      'Não foi encontrado um cabeçalho reconhecido na planilha. Esperado "Data | Descrição | Crédito | Débito" ou "Data | Histórico | Documento | Valor | Saldo".',
    );
  }

  if (header.format === 'simples') {
    return parseSimpleFormat(rows, header.index, fileName);
  }
  return parseDetalhadoFormat(rows, header.index);
}

module.exports = { parseExtratoXlsxBuffer };
