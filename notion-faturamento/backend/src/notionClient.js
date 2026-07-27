const { Client } = require('@notionhq/client');
const { ensureSchema } = require('./notionSchema');

function createNotionClient() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN nao configurado no .env');
  }
  return new Client({ auth: token });
}

function buildProperties(row, titlePropertyName) {
  return {
    [titlePropertyName]: {
      title: [{ text: { content: row.data } }],
    },
    Data: { date: { start: row.dataIso } },
    'Dia da Semana': {
      rich_text: [{ text: { content: row.diaSemana } }],
    },
    Vendas: { number: row.vendas },
    'Valor de Vendas': { number: row.valorDeVendas },
    'Valor Acumulado': { number: row.valorAcumulado },
    'Ticket Médio': { number: row.ticketMedio },
    'Total dos Itens': { number: row.totalDosItens },
    'Taxa de Entrega': { number: row.taxaDeEntrega },
    'Taxa de Serviço': { number: row.taxaDeServico },
    Acréscimos: { number: row.acrescimos },
    Descontos: { number: row.descontos },
    'Vendas Canceladas': { number: row.vendasCanceladas },
    'Valor de Vendas Canceladas': { number: row.valorDeVendasCanceladas },
  };
}

/**
 * Procura uma pagina existente na database cuja propriedade "Data" seja igual
 * a dataIso da linha (formato YYYY-MM-DD).
 */
async function findExistingPage(notion, databaseId, dataIso) {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Data',
      date: { equals: dataIso },
    },
    page_size: 1,
  });
  return response.results[0] || null;
}

/**
 * Envia todas as linhas para o Notion, uma a uma, fazendo upsert por data.
 * Retorna um array com o resultado de cada linha (para exibir na UI).
 */
async function syncRowsToNotion(rows, onProgress) {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error('NOTION_DATABASE_ID nao configurado no .env');
  }

  const notion = createNotionClient();
  const { titlePropertyName, createdProperties } = await ensureSchema(notion, databaseId);

  const results = [];
  for (const row of rows) {
    try {
      const properties = buildProperties(row, titlePropertyName);
      const existingPage = await findExistingPage(notion, databaseId, row.dataIso);

      if (existingPage) {
        await notion.pages.update({ page_id: existingPage.id, properties });
        results.push({ data: row.data, status: 'atualizado' });
      } else {
        await notion.pages.create({
          parent: { database_id: databaseId },
          properties,
        });
        results.push({ data: row.data, status: 'criado' });
      }
    } catch (err) {
      results.push({ data: row.data, status: 'erro', message: err.message });
    }
    if (onProgress) onProgress(results.length, rows.length);
  }

  return { createdProperties, results };
}

module.exports = { syncRowsToNotion, createNotionClient };
