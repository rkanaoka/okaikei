export const NFE_XML_PARSER_PORT = Symbol('NfeXmlParserPort');

export interface NfeItemParseado {
  codigoFornecedor: string; // prod/cProd — código do produto no cadastro do fornecedor
  descricao: string;        // prod/xProd
  ncm?: string;
  unidadeComercial: string; // prod/uCom — texto livre da nota (KG, UN, CX, PC, L...)
  quantidade: number;       // prod/qCom
  valorUnitario: number;    // prod/vUnCom
  valorTotal: number;       // prod/vProd
}

export interface NfeParseada {
  chaveAcesso: string;
  numero: string | null;
  serie: string | null;
  dataEmissao: string | null; // ISO 8601, quando presente na nota
  valorTotal: number | null;
  fornecedor: { cnpj: string | null; nome: string | null };
  itens: NfeItemParseado[];
}

/** Porta para o adaptador que sabe ler o XML de uma NF-e (padrão nfeProc/NFe da SEFAZ). */
export interface NfeXmlParserPort {
  parse(xml: string): NfeParseada;
}
