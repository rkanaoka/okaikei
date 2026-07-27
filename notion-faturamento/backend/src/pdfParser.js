const pdf = require('pdf-parse');

// Padrao de valor monetario brasileiro, ex: "R$ 17.202,49" ou "R$ 0,00"
const MONEY = 'R\\$\\s?-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}';
const MONEY_TOKEN_RE = new RegExp(MONEY, 'g');

// Cada linha de dado no PDF do SAIPOS (apos extracao de texto) fica assim,
// sem espacos entre colunas:
// 01/02/2025Sábado154R$ 17.202,49R$ 17.202,49R$ 111,70R$ 15.894,41R$ 49,96R$ 1.486,11R$ 20,00R$ 247,9916R$ 38,50
// DATA | DIA DA SEMANA | VENDAS | (8 valores em R$) | VENDAS CANCELADAS | VALOR DE VENDAS CANCELADAS
const ROW_RE = new RegExp(
  `^(\\d{2}/\\d{2}/\\d{4})(\\D+?)(\\d+)((?:${MONEY}){8})(\\d+)(${MONEY})\\s*$`
);

function parseMoney(token) {
  const digits = token.replace('R$', '').trim();
  return Number(digits.replace(/\./g, '').replace(',', '.'));
}

function toIsoDate(brDate) {
  const [day, month, year] = brDate.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Recebe o texto bruto extraido do PDF e devolve as linhas diarias de faturamento.
 * Ignora cabecalho, filtros e a linha de "Total".
 */
function parseFaturamentoText(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];

  for (const line of lines) {
    const match = line.match(ROW_RE);
    if (!match) continue;

    const [, data, diaSemana, vendas, moneyBlock, vendasCanceladas, valorVendasCanceladas] = match;
    const money = [...moneyBlock.matchAll(MONEY_TOKEN_RE)].map((m) => parseMoney(m[0]));
    if (money.length !== 8) continue;

    rows.push({
      data,
      dataIso: toIsoDate(data),
      diaSemana: diaSemana.trim(),
      vendas: Number(vendas),
      valorDeVendas: money[0],
      valorAcumulado: money[1],
      ticketMedio: money[2],
      totalDosItens: money[3],
      taxaDeEntrega: money[4],
      taxaDeServico: money[5],
      acrescimos: money[6],
      descontos: money[7],
      vendasCanceladas: Number(vendasCanceladas),
      valorDeVendasCanceladas: parseMoney(valorVendasCanceladas),
    });
  }

  return rows;
}

/**
 * Tenta extrair o nome da loja a partir do cabecalho "Loja: X CNPJ: Y".
 */
function parseLoja(text) {
  const match = text.match(/Loja:\s*(.+?)\s*CNPJ:/);
  return match ? match[1].trim() : null;
}

async function parsePdfBuffer(buffer) {
  const data = await pdf(buffer);
  const rows = parseFaturamentoText(data.text);
  const loja = parseLoja(data.text);
  return { loja, rows };
}

module.exports = { parsePdfBuffer, parseFaturamentoText, parseLoja, toIsoDate };
