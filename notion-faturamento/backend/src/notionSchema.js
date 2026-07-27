// Propriedades que este app espera encontrar na database do Notion.
// A propriedade "titulo" (type: title) ja existe em toda database do Notion,
// entao ela nao entra nesta lista - ela e detectada dinamicamente.
const DESIRED_PROPERTIES = {
  Data: { date: {} },
  'Dia da Semana': { rich_text: {} },
  Vendas: { number: { format: 'number' } },
  'Valor de Vendas': { number: { format: 'real' } },
  'Valor Acumulado': { number: { format: 'real' } },
  'Ticket Médio': { number: { format: 'real' } },
  'Total dos Itens': { number: { format: 'real' } },
  'Taxa de Entrega': { number: { format: 'real' } },
  'Taxa de Serviço': { number: { format: 'real' } },
  Acréscimos: { number: { format: 'real' } },
  Descontos: { number: { format: 'real' } },
  'Vendas Canceladas': { number: { format: 'number' } },
  'Valor de Vendas Canceladas': { number: { format: 'real' } },
};

/**
 * Verifica a database no Notion e cria (via databases.update) qualquer
 * propriedade esperada que ainda nao exista. Nunca remove ou altera
 * propriedades ja existentes.
 * Retorna o nome da propriedade do tipo "title" da database.
 */
async function ensureSchema(notion, databaseId) {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const existing = database.properties;

  const titleEntry = Object.entries(existing).find(([, def]) => def.type === 'title');
  if (!titleEntry) {
    throw new Error('A database do Notion nao possui uma propriedade do tipo "Title".');
  }
  const titlePropertyName = titleEntry[0];

  const missing = {};
  for (const [name, def] of Object.entries(DESIRED_PROPERTIES)) {
    if (!existing[name]) {
      missing[name] = def;
    }
  }

  if (Object.keys(missing).length > 0) {
    await notion.databases.update({
      database_id: databaseId,
      properties: missing,
    });
  }

  return { titlePropertyName, createdProperties: Object.keys(missing) };
}

module.exports = { ensureSchema, DESIRED_PROPERTIES };
