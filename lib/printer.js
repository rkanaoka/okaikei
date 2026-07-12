/**
 * Bodogami — lib/printer.js
 * Serviço de impressão ESC/POS via TCP socket (porta 9100).
 *
 * Cada categoria de item tem um IP de impressora configurado na tabela `printers`.
 * O módulo abre um socket TCP efêmero, envia os bytes ESC/POS e fecha.
 */
import net from 'net';
import { query } from 'lib/db.js';

// ─── Constantes ESC/POS ──────────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;

const CMD = {
  INIT:          Buffer.from([ESC, 0x40]),
  ALIGN_LEFT:    Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER:  Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT:   Buffer.from([ESC, 0x61, 0x02]),
  BOLD_ON:       Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF:      Buffer.from([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT: Buffer.from([ESC, 0x21, 0x10]),
  NORMAL_SIZE:   Buffer.from([ESC, 0x21, 0x00]),
  LINE_FEED:     Buffer.from([0x0a]),
  CUT_PARTIAL:   Buffer.from([GS,  0x56, 0x01]),
  CUT_FULL:      Buffer.from([GS,  0x56, 0x00]),
};

function txt(str) {
  return Buffer.from(str, 'latin1');
}

function line(char = '-', len = 32) {
  return txt(char.repeat(len) + '\n');
}

/**
 * Abre socket TCP, envia buffer, fecha.
 */
function sendToSocket(ip, port, data, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        if (err) { socket.destroy(); return reject(err); }
        socket.end();
        resolve();
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Timeout ao conectar em ${ip}:${port}`));
    });

    socket.on('error', (err) => { socket.destroy(); reject(err); });
  });
}

/**
 * Busca config da impressora pelo category no banco.
 */
async function getPrinter(category) {
  const { rows } = await query(
    'SELECT * FROM printers WHERE category = $1 AND enabled = true',
    [category]
  );
  if (!rows.length) throw new Error(`Impressora não configurada para: ${category}`);
  return rows[0];
}

// ─── Builders de tickets ─────────────────────────────────────────────────────

function buildOrderTicket(comanda, items, category) {
  const area = category.toUpperCase();
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const parts = [
    CMD.INIT,
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
    txt(`BODOGAMI\n`),
    CMD.NORMAL_SIZE, CMD.BOLD_OFF,
    txt(`${area}\n`),
    line('='),
    CMD.ALIGN_LEFT,
    CMD.BOLD_ON, txt(`Mesa: ${comanda.table_name}\n`), CMD.BOLD_OFF,
    comanda.customer_name ? txt(`Cliente: ${comanda.customer_name}\n`) : Buffer.alloc(0),
    txt(`Comanda: #${comanda.id}\n`),
    txt(`${now}\n`),
    line('-'),
  ];

  for (const item of items) {
    parts.push(CMD.BOLD_ON, txt(`${item.quantity}x  ${item.name}\n`), CMD.BOLD_OFF);
    if (item.notes) parts.push(txt(`    >> ${item.notes}\n`));
  }

  parts.push(line('='), CMD.LINE_FEED, CMD.LINE_FEED, CMD.CUT_PARTIAL);
  return Buffer.concat(parts);
}

function buildReceiptTicket(comanda, items, payments, total) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const subtotal = items.reduce((s, i) => s + i.quantity * parseFloat(i.unit_price), 0);
  const fmtBRL = (v) => `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}`;

  const parts = [
    CMD.INIT,
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON, CMD.DOUBLE_HEIGHT, txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
    txt(`Restaurante Japones\n`),
    txt(`RECIBO\n`),
    line('='),
    CMD.ALIGN_LEFT,
    txt(`Mesa: ${comanda.table_name}\n`),
    comanda.customer_name ? txt(`Cliente: ${comanda.customer_name}\n`) : Buffer.alloc(0),
    txt(`Comanda: #${comanda.id}   ${now}\n`),
    line('-'),
  ];

  for (const item of items) {
    const lineTotal = item.quantity * parseFloat(item.unit_price);
    const nameTrunc = item.name.slice(0, 20).padEnd(20);
    const qtyStr    = `${item.quantity}x`.padStart(3);
    const priceStr  = fmtBRL(lineTotal).padStart(9);
    parts.push(txt(`${qtyStr} ${nameTrunc} ${priceStr}\n`));
  }

  parts.push(line('-'));
  parts.push(txt(`${'Subtotal'.padEnd(23)}${fmtBRL(subtotal).padStart(9)}\n`));

  if (comanda.surcharge_value && parseFloat(comanda.surcharge_value) > 0) {
    const label = comanda.surcharge_type === 'percent'
      ? `Adicional (${comanda.surcharge_value}%)`
      : 'Adicional (fixo)';
    const amt = comanda.surcharge_type === 'percent'
      ? subtotal * parseFloat(comanda.surcharge_value) / 100
      : parseFloat(comanda.surcharge_value);
    parts.push(txt(`${label.padEnd(23)}${fmtBRL(amt).padStart(9)}\n`));
  }

  if (comanda.discount_value && parseFloat(comanda.discount_value) > 0) {
    const label = comanda.discount_type === 'percent'
      ? `Desconto (${comanda.discount_value}%)`
      : 'Desconto (fixo)';
    const amt = comanda.discount_type === 'percent'
      ? subtotal * parseFloat(comanda.discount_value) / 100
      : parseFloat(comanda.discount_value);
    parts.push(txt(`${label.padEnd(23)}-${fmtBRL(amt).padStart(8)}\n`));
  }

  parts.push(line('='));
  parts.push(CMD.BOLD_ON, txt(`${'TOTAL'.padEnd(23)}${fmtBRL(total).padStart(9)}\n`), CMD.BOLD_OFF);
  parts.push(line('-'));

  for (const p of payments) {
    parts.push(txt(`${p.method.toUpperCase().padEnd(23)}${fmtBRL(p.amount).padStart(9)}\n`));
  }

  parts.push(
    line('='),
    CMD.ALIGN_CENTER,
    txt(`Obrigado pela visita!\n`),
    txt(`www.bodogami.com.br\n`),
    CMD.LINE_FEED, CMD.LINE_FEED,
    CMD.CUT_FULL
  );

  return Buffer.concat(parts);
}

// ─── Exports públicos ─────────────────────────────────────────────────────────

export async function printOrder(comanda, items, category) {
  const printer = await getPrinter(category);
  await sendToSocket(printer.ip, printer.port, buildOrderTicket(comanda, items, category));
}

export async function printReceipt(comanda, items, payments, total) {
  const printer = await getPrinter('caixa');
  await sendToSocket(printer.ip, printer.port, buildReceiptTicket(comanda, items, payments, total));
}
