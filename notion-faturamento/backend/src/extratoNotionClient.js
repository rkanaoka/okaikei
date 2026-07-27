const { Client } = require('@notionhq/client');
const { ensureExtratoSchema } = require('./extratoNotionSchema');

function createNotionClient() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN nao configurado no .env');
  }
  return new Client({ auth: token });
}

function buildProperties(row, titlePropertyName, contaFinanceiraValue, competenciaValue) {
  const valor = row.entrada != null ? row.entrada : row.saida != null ? -row.saida : null;
  const properties = {
    [titlePropertyName]: {
      title: [{ text: { content: row.descricao.slice(0, 200) } }],
    },
    Data: { date: { start: row.dataIso } },
    Valor: { number: valor },
    'Conta Financeira': contaFinanceiraValue,
    'Competência de Exercício': competenciaValue,
    'Chave de Importação': { rich_text: [{ text: { content: row.chave } }] },
  };
  // "Descrição" só existe como campo próprio (rich_text) quando não é a
  // própria propriedade título da database — senão a chave acima já cobre.
  if (titlePropertyName !== 'Descrição') {
    properties['Descrição'] = { rich_text: [{ text: { content: row.descricao } }] };
  }
  return properties;
}

/**
 * Resolve o valor a gravar numa propriedade que pode ser tanto um select
 * simples quanto uma relation pra uma database separada (caso real em
 * produção, tanto pra "Conta Financeira" quanto pra "Competência de
 * Exercício"): busca a página cujo campo indicado (`matchPropertyName`, por
 * nome — pode ser a propriedade título ou não) bate com o valor procurado, e
 * devolve `{ relation: [{ id }] }`. Lança erro claro se não encontrar — não
 * cria automaticamente, pois não sabemos que outras propriedades a página
 * relacionada deveria ter lá.
 */
async function resolveRelationValue(notion, property, propertyLabel, value, matchPropertyName) {
  if (!property || property.type !== 'relation') {
    return { select: { name: value } };
  }

  const relatedDatabaseId = property.relation.database_id;
  const response = await notion.databases.query({
    database_id: relatedDatabaseId,
    page_size: 100,
  });
  const match = response.results.find((page) => {
    const prop = matchPropertyName
      ? page.properties[matchPropertyName]
      : Object.values(page.properties).find((p) => p.type === 'title');
    if (!prop) return false;
    const text =
      prop.type === 'title'
        ? prop.title.map((t) => t.plain_text).join('')
        : prop.type === 'rich_text'
          ? prop.rich_text.map((t) => t.plain_text).join('')
          : prop.type === 'select'
            ? prop.select?.name || ''
            : '';
    return text.trim().toLowerCase() === value.trim().toLowerCase();
  });

  if (!match) {
    throw new Error(
      `${propertyLabel} "${value}" não encontrada na database relacionada. Cadastre-a lá antes de sincronizar.`,
    );
  }
  return { relation: [{ id: match.id }] };
}

/**
 * Procura uma pagina existente na database cuja "Chave de Importação" seja
 * igual a chave da linha (data + posição no dia), usada para evitar duplicar
 * lançamentos ao reenviar o mesmo extrato.
 */
async function findExistingPage(notion, databaseId, chave) {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Chave de Importação',
      rich_text: { equals: chave },
    },
    page_size: 1,
  });
  return response.results[0] || null;
}

/**
 * Envia todas as linhas do extrato para o Notion, uma a uma, fazendo upsert
 * por "Chave de Importação". Retorna o resultado de cada linha.
 */
async function syncExtratoToNotion(rows, { contaFinanceira, competencia }, onProgress) {
  const databaseId = process.env.NOTION_EXTRATO_DATABASE_ID;
  if (!databaseId) {
    throw new Error('NOTION_EXTRATO_DATABASE_ID nao configurado no .env');
  }

  const notion = createNotionClient();
  const { titlePropertyName, contaFinanceiraProperty, competenciaProperty } = await ensureExtratoSchema(
    notion,
    databaseId,
  );
  const contaFinanceiraValue = await resolveRelationValue(
    notion,
    contaFinanceiraProperty,
    'Conta Financeira',
    contaFinanceira,
    null, // busca pela propriedade título da database de contas
  );
  const competenciaValue = await resolveRelationValue(
    notion,
    competenciaProperty,
    'Competência de Exercício',
    competencia,
    'Competência',
  );

  const results = [];
  for (const row of rows) {
    try {
      const properties = buildProperties(row, titlePropertyName, contaFinanceiraValue, competenciaValue);
      const existingPage = await findExistingPage(notion, databaseId, row.chave);

      if (existingPage) {
        await notion.pages.update({ page_id: existingPage.id, properties });
        results.push({ chave: row.chave, data: row.data, descricao: row.descricao, status: 'atualizado' });
      } else {
        await notion.pages.create({ parent: { database_id: databaseId }, properties });
        results.push({ chave: row.chave, data: row.data, descricao: row.descricao, status: 'criado' });
      }
    } catch (err) {
      results.push({ chave: row.chave, data: row.data, descricao: row.descricao, status: 'erro', message: err.message });
    }
    if (onProgress) onProgress(results.length, rows.length);
  }

  return { results };
}

module.exports = { syncExtratoToNotion };
