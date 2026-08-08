const pdf = require('pdf-parse');

// ── Constantes de reconhecimento de linhas ──────────────────────────────────
const MONTHS = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

const NOISE_LINES = new Set([
  'A =agendamento',
  'B = ações movimentadas',
  'pelaBolsa de Valores',
  'C = crédito a compensar',
  'D = débito a compensar',
  'G = aplicação programada',
  'P = poupança automática',
  'Para demais siglas, consulte as Notas',
  'Explicativas nofinal doextrato',
]);

// Linhas que devem ser ignoradas mesmo tendo (ou não) valor associado.
const IGNORE_LABELS = new Set(['saldo anterior', 'saldo aplic aut mais']);

const MONEY = '\\d{1,3}(?:\\.\\d{3})*,\\d{2}';

// "Rede   MAST CD0094993025131,70" — o código da maquininha tem sempre 10 dígitos fixos.
const REDE_RE = new RegExp(`^(Rede\\s+(?:ELO|MAST|VISA|AMEX)\\s+(?:CD|DB)\\d{10})(${MONEY})(-)?$`);
// "RSCSS-DOCUCOPY CO-00101669,00-" — referências terminadas em "-NNNNNN" (6 dígitos).
const REF6_RE = new RegExp(`^(.+-\\d{6})(${MONEY})(-)?$`);
// "PIX QRS Rafael Tard30/0194,61" — descrição termina com uma referência DD/MM antes do valor.
const DATEREF_RE = new RegExp(`^(.+\\d{2}/\\d{2})(${MONEY})(-)?$`);
// Caso geral: descrição termina em texto, valor no final da linha.
const GENERAL_RE = new RegExp(`^(.+?)(${MONEY})(-)?$`);
// Linha contendo somente um valor (é o saldo da linha anterior).
const BARE_VALUE_RE = new RegExp(`^-?${MONEY}(-)?$`);
// Início de um novo grupo de dia: "02/01Sispag ...".
const DATE_START_RE = /^(\d{2}\/\d{2})(.*)$/;

function parseMoneyToken(token) {
  const isDebit = token.endsWith('-');
  const digits = token.replace(/-$/, '');
  const value = Number(digits.replace(/\./g, '').replace(',', '.'));
  return { value, isDebit };
}

function matchContent(content) {
  return (
    content.match(REDE_RE) ||
    content.match(REF6_RE) ||
    content.match(DATEREF_RE) ||
    content.match(GENERAL_RE)
  );
}

function isHeaderFooterNoise(line) {
  if (/^extratomensal$/i.test(line)) return true;
  if (/^ag\s+\d+\s+cc\s+[\d-]+$/i.test(line)) return true;
  if (/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+\d{4}$/i.test(line)) return true;
  if (/^\d{3}\|\d{3}$/.test(line)) return true;
  if (/^data\s*descri[cç][aã]o\s*entradas/i.test(line.replace(/\s+/g, ' '))) return true;
  if (/^\(cr[eé]ditos\)\s*\(d[eé]bitos\)$/i.test(line)) return true;
  if (/^\d{6}\s+[A-Z0-9]+\s+\d{2}\/\d{2}\/\d{4}\s+[A-Z0-9]+\s+[A-Z0-9]+\s+[A-Z0-9]+$/.test(line)) return true;
  if (/Este material está disponível/i.test(line)) return true;
  if (NOISE_LINES.has(line)) return true;
  return false;
}

/**
 * Extrai o mes/ano de referencia do extrato (ex: "jan 2026" -> {month:1, year:2026}).
 */
function parseStatementPeriod(text) {
  const match = text.match(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(\d{4})\b/i);
  if (!match) return null;
  return { month: MONTHS[match[1].toLowerCase()], year: Number(match[2]) };
}

/**
 * Converte "DD/MM" + periodo do extrato em data ISO (YYYY-MM-DD).
 * Lida com o caso do "Saldo anterior" (31/12 do mes anterior) mesmo que essa
 * linha especifica seja descartada depois.
 */
function toIsoDate(ddmm, period) {
  const [day, month] = ddmm.split('/').map(Number);
  let year = period.year;
  if (month !== period.month) {
    // dezembro do ano anterior aparecendo no "Saldo anterior"
    year = month === 12 && period.month === 1 ? period.year - 1 : period.year;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toBrDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Recebe o texto bruto extraido do PDF (extrato mensal Itau) e devolve as
 * linhas de "Conta Corrente | Movimentacao", ignorando "Saldo anterior" e
 * "SALDO APLIC AUT MAIS".
 */
function parseExtratoText(text) {
  const period = parseStatementPeriod(text);
  if (!period) {
    throw new Error('Não foi possível identificar o mês/ano do extrato no PDF.');
  }

  const startMarker = text.indexOf('datadescriçãoentradas');
  const endMarker = text.indexOf('Saldo em C/C');
  if (startMarker === -1) {
    throw new Error('Não foi encontrada a seção "Conta Corrente | Movimentação" no PDF.');
  }
  const section = endMarker === -1 ? text.slice(startMarker) : text.slice(startMarker, endMarker);

  const rawLines = section
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  let currentDate = null;
  let lastRow = null;

  function processContent(content) {
    content = content.trim();
    if (!content) return;

    if (BARE_VALUE_RE.test(content)) {
      // valor solto = saldo da linha anterior
      if (lastRow) {
        lastRow.saldo = parseMoneyToken(content).value;
      }
      return;
    }

    const m = matchContent(content);
    if (m) {
      const description = m[1].trim().replace(/\s+/g, ' ');
      const { value, isDebit } = parseMoneyToken(m[2] + (m[3] || ''));
      const row = { date: currentDate, description, value, isDebit, saldo: null };
      rows.push(row);
      lastRow = row;
      return;
    }

    // linha só com descrição, sem valor (ex: "Saldo anterior", "SALDO APLIC AUT MAIS")
    const row = { date: currentDate, description: content.replace(/\s+/g, ' '), value: null, isDebit: null, saldo: null };
    rows.push(row);
    lastRow = row;
  }

  for (const line of rawLines) {
    if (isHeaderFooterNoise(line)) continue;
    const dm = line.match(DATE_START_RE);
    if (dm) {
      currentDate = dm[1];
      processContent(dm[2]);
    } else {
      processContent(line);
    }
  }

  const seqByDate = {};
  const transactions = [];
  for (const row of rows) {
    if (row.value === null) continue; // sem valor, nada a lançar
    if (IGNORE_LABELS.has(row.description.trim().toLowerCase())) continue;
    if (!row.date) continue;

    const dataIso = toIsoDate(row.date, period);
    seqByDate[dataIso] = (seqByDate[dataIso] || 0) + 1;
    const seq = seqByDate[dataIso];

    transactions.push({
      data: toBrDate(dataIso),
      dataIso,
      descricao: row.description,
      entrada: row.isDebit ? null : row.value,
      saida: row.isDebit ? row.value : null,
      chave: `itau#${dataIso}#${seq}`,
    });
  }

  return { period, transactions };
}

async function parseExtratoBuffer(buffer) {
  const data = await pdf(buffer);
  return parseExtratoText(data.text);
}

module.exports = { parseExtratoBuffer, parseExtratoText, parseStatementPeriod, toIsoDate };
