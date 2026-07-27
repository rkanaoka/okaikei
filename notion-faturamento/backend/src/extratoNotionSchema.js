// Propriedades esperadas na database de Lançamentos Financeiros (extrato bancário).
// A propriedade "titulo" (type: title) ja existe em toda database do Notion e e
// detectada dinamicamente, nao entra nesta lista.
//
// "Conta Financeira" e "Competência de Exercício" tambem sao obrigatorias mas
// nao entram nesta lista porque sao relations pra databases separadas
// ("Contas Financeiras" e "Competências de Exercício") — ver
// resolveRelationValue em extratoNotionClient.js.
const REQUIRED_PROPERTY_NAMES = ['Data', 'Descrição', 'Valor', 'Chave de Importação'];

/**
 * Verifica se a database no Notion tem todas as propriedades esperadas.
 * Nunca cria, altera ou remove propriedades — se alguma esperada nao existir,
 * falha com um erro claro listando o que falta, pra ser corrigido manualmente
 * no Notion antes de sincronizar.
 */
async function ensureExtratoSchema(notion, databaseId) {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const existing = database.properties;

  const titleEntry = Object.entries(existing).find(([, def]) => def.type === 'title');
  if (!titleEntry) {
    throw new Error('A database do Notion nao possui uma propriedade do tipo "Title".');
  }
  const titlePropertyName = titleEntry[0];

  const missing = REQUIRED_PROPERTY_NAMES.filter((name) => name !== titlePropertyName && !existing[name]);
  if (!existing['Conta Financeira']) missing.push('Conta Financeira');
  if (!existing['Competência de Exercício']) missing.push('Competência de Exercício');

  if (missing.length > 0) {
    throw new Error(
      `A database do Notion não tem as propriedades: ${missing.join(', ')}. Crie-as manualmente antes de sincronizar.`,
    );
  }

  return {
    titlePropertyName,
    contaFinanceiraProperty: existing['Conta Financeira'],
    competenciaProperty: existing['Competência de Exercício'],
  };
}

module.exports = { ensureExtratoSchema, REQUIRED_PROPERTY_NAMES };
