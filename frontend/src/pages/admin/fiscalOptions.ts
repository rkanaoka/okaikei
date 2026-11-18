// Listas de códigos fiscais usadas nas telas Fiscal › Dados fiscais (modelos) e Classificação dos produtos.
// Mantidas em sincronia manual com backend/src/modules/fiscal/domain/value-objects/fiscal-item-fields.ts.

export const ICMS_CST   = ['00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'];
export const ICMS_CSOSN = ['101', '102', '103', '201', '202', '203', '300', '400', '500', '900'];
export const PIS_COFINS = ['01','02','03','04','05','06','07','08','09','49','50','51','52','53','54','55','56','60','61','62','63','64','65','66','67','70','71','72','73','74','75','98','99'];
export const IBS_CBS_CST = ['000', '200', '410', '620']; // únicos aceitos na NFC-e

export const ORIGENS: Record<string, string> = {
  '0': 'Nacional', '1': 'Estrangeira — importação direta', '2': 'Estrangeira — adquirida no mercado interno',
  '3': 'Nacional — conteúdo de importação > 40% e ≤ 70%', '4': 'Nacional — processos produtivos básicos',
  '5': 'Nacional — conteúdo de importação ≤ 40%', '6': 'Estrangeira — importação direta, sem similar nacional',
  '7': 'Estrangeira — mercado interno, sem similar nacional', '8': 'Nacional — conteúdo de importação > 70%',
};

// Modalidade de determinação da base de cálculo (modBC / modBCST).
export const MOD_BC: Record<string, string> = {
  '0': 'Margem Valor Agregado (%)', '1': 'Pauta (valor)', '2': 'Preço Tabelado Máx. (valor)', '3': 'Valor da operação',
};
export const MOD_BC_ST: Record<string, string> = {
  '0': 'Preço tabelado ou máximo sugerido', '1': 'Lista negativa (valor)', '2': 'Lista positiva (valor)',
  '3': 'Lista neutra (valor)', '4': 'Margem Valor Agregado (%)', '5': 'Pauta (valor)', '6': 'Valor da operação',
};
