require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');

const { parsePdfBuffer } = require('./pdfParser');
const { syncRowsToNotion } = require('./notionClient');
const { parseExtratoBuffer } = require('./extratoParser');
const { parseExtratoXlsxBuffer } = require('./extratoXlsxParser');
const { syncExtratoToNotion } = require('./extratoNotionClient');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    notionConfigured: Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID),
    extratoNotionConfigured: Boolean(process.env.NOTION_TOKEN && process.env.NOTION_EXTRATO_DATABASE_ID),
  });
});

// ── Faturamento diário (SAIPOS) ──────────────────────────────────────────────

// Recebe o PDF, extrai as linhas e devolve para o front-end revisar antes de enviar.
app.post('/api/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Envie um PDF no campo "file".' });
    }

    const { loja, rows } = await parsePdfBuffer(req.file.buffer);

    if (rows.length === 0) {
      return res.status(422).json({
        error: 'Nao foi possivel encontrar linhas de faturamento diario neste PDF. Verifique se o arquivo e um relatorio "Faturamento por dia" do SAIPOS.',
      });
    }

    res.json({ loja, fileName: req.file.originalname, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao ler o PDF.', details: err.message });
  }
});

// Recebe as linhas ja revisadas (vindas do /api/parse) e sincroniza com o Notion.
app.post('/api/sync', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Envie um array "rows" com pelo menos uma linha.' });
    }

    const { createdProperties, results } = await syncRowsToNotion(rows);
    res.json({ createdProperties, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao enviar para o Notion.', details: err.message });
  }
});

// ── Extrato bancário mensal (Itaú PDF / Santander XLSX) ──────────────────────

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Recebe o PDF do extrato Itaú, extrai a movimentação da conta corrente e
// devolve para o front-end revisar antes de enviar.
app.post('/api/extrato/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Envie um PDF no campo "file".' });
    }

    const { period, transactions } = await parseExtratoBuffer(req.file.buffer);

    if (transactions.length === 0) {
      return res.status(422).json({
        error: 'Não foi possível encontrar lançamentos em "Conta Corrente | Movimentação" neste PDF. Verifique se o arquivo é um extrato mensal Itaú.',
      });
    }

    const competenciaDefault = `${period.year}-${String(period.month).padStart(2, '0')}`;
    res.json({
      fileName: req.file.originalname,
      periodo: `${MONTH_NAMES_PT[period.month - 1]}/${period.year}`,
      competenciaDefault,
      contaFinanceiraDefault: 'Itaú',
      transactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao ler o PDF.', details: err.message });
  }
});

// Recebe a planilha do extrato Santander (.xlsx), extrai a movimentação e
// devolve para o front-end revisar antes de enviar.
app.post('/api/extrato/parse-xlsx', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Envie um .xlsx no campo "file".' });
    }

    const { period, transactions } = parseExtratoXlsxBuffer(req.file.buffer, req.file.originalname);

    if (transactions.length === 0) {
      return res.status(422).json({
        error: 'Não foi possível encontrar lançamentos na planilha. Verifique se o arquivo é um extrato mensal Santander (.xlsx).',
      });
    }

    const competenciaDefault = `${period.year}-${String(period.month).padStart(2, '0')}`;
    res.json({
      fileName: req.file.originalname,
      periodo: `${MONTH_NAMES_PT[period.month - 1]}/${period.year}`,
      competenciaDefault,
      contaFinanceiraDefault: 'Santander',
      transactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao ler a planilha.', details: err.message });
  }
});

// Recebe as linhas já revisadas (do /api/extrato/parse ou /api/extrato/parse-xlsx)
// e sincroniza com a database de Lançamentos Financeiros no Notion.
app.post('/api/extrato/sync', async (req, res) => {
  try {
    const { rows, contaFinanceira, competencia } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Envie um array "rows" com pelo menos uma linha.' });
    }
    if (!contaFinanceira || !competencia) {
      return res.status(400).json({ error: 'Informe "contaFinanceira" e "competencia" (ex: "2026-01").' });
    }

    const { results } = await syncExtratoToNotion(rows, { contaFinanceira, competencia });
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao enviar para o Notion.', details: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`notion-faturamento backend rodando em http://localhost:${PORT}`);
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.warn('Aviso: NOTION_TOKEN e/ou NOTION_DATABASE_ID nao configurados no .env (faturamento SAIPOS)');
  }
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_EXTRATO_DATABASE_ID) {
    console.warn('Aviso: NOTION_TOKEN e/ou NOTION_EXTRATO_DATABASE_ID nao configurados no .env (extrato bancário)');
  }
});
