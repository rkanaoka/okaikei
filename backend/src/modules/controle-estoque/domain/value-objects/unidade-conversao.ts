// Conversão de unidades de medida do estoque de insumos.
// Regra de negócio: cada insumo tem uma unidade-base (massa em mg, volume em ml,
// ou contagem em un) e cada fornecedor pode vender o mesmo insumo em uma unidade
// de compra diferente (kg, L, caixa com N unidades, etc.) — o sistema converte
// automaticamente para a unidade-base ao dar entrada no estoque.
//
// Não importa nada externo (Prisma, NestJS) — ver regras de dependência em
// backend/src/modules/CLAUDE.md.

export type UnidadeBase = 'MG' | 'ML' | 'UN';

export type UnidadeMedida =
  | 'MG' | 'G' | 'KG'
  | 'ML' | 'L'
  | 'UN' | 'DUZIA' | 'CAIXA' | 'PACOTE' | 'FARDO' | 'OUTRO';

interface UnidadeInfo {
  base: UnidadeBase;
  /** Quantas unidades-base equivalem a 1 desta unidade. `null` = fator variável,
   *  informado manualmente por fornecedor (embalagens sem tamanho padronizado). */
  fatorFixo: number | null;
  label: string;
}

export const UNIDADES_MEDIDA: Record<UnidadeMedida, UnidadeInfo> = {
  MG:     { base: 'MG', fatorFixo: 1,         label: 'Miligrama (mg)' },
  G:      { base: 'MG', fatorFixo: 1_000,     label: 'Grama (g)' },
  KG:     { base: 'MG', fatorFixo: 1_000_000, label: 'Quilograma (kg)' },
  ML:     { base: 'ML', fatorFixo: 1,         label: 'Mililitro (ml)' },
  L:      { base: 'ML', fatorFixo: 1_000,     label: 'Litro (L)' },
  UN:     { base: 'UN', fatorFixo: 1,         label: 'Unidade' },
  DUZIA:  { base: 'UN', fatorFixo: 12,        label: 'Dúzia (12 un)' },
  CAIXA:  { base: 'UN', fatorFixo: null,      label: 'Caixa (informar qtd. por caixa)' },
  PACOTE: { base: 'UN', fatorFixo: null,      label: 'Pacote (informar qtd. por pacote)' },
  FARDO:  { base: 'UN', fatorFixo: null,      label: 'Fardo (informar qtd. por fardo)' },
  OUTRO:  { base: 'UN', fatorFixo: null,      label: 'Outra embalagem (informar qtd.)' },
};

export const UNIDADES_BASE_LABEL: Record<UnidadeBase, string> = {
  MG: 'mg', ML: 'ml', UN: 'un',
};

/** Unidades de medida compatíveis com uma dada unidade-base de insumo (para popular selects). */
export function unidadesParaBase(base: UnidadeBase): UnidadeMedida[] {
  return (Object.keys(UNIDADES_MEDIDA) as UnidadeMedida[]).filter((u) => UNIDADES_MEDIDA[u].base === base);
}

/** true quando a unidade não tem fator fixo — a tela precisa pedir "quantas unidades vêm na embalagem". */
export function exigeFatorManual(unidade: UnidadeMedida): boolean {
  const info = UNIDADES_MEDIDA[unidade];
  if (!info) throw new Error(`Unidade de medida desconhecida: ${unidade}`);
  return info.fatorFixo === null;
}

/**
 * Resolve o fator de conversão de 1 `unidade` (unidade de compra) para a unidade-base do insumo.
 * Lança erro se a unidade não for compatível com a base (ex: tentar usar "L" num insumo em UN),
 * ou se faltar informar o fator manual de uma embalagem (caixa/pacote/fardo/outro).
 */
export function resolverFatorConversao(
  unidade: UnidadeMedida,
  unidadeBase: UnidadeBase,
  fatorInformado?: number | null,
): number {
  const info = UNIDADES_MEDIDA[unidade];
  if (!info) throw new Error(`Unidade de medida desconhecida: ${unidade}`);
  if (info.base !== unidadeBase) {
    throw new Error(
      `A unidade "${info.label}" não é compatível com a unidade-base "${UNIDADES_BASE_LABEL[unidadeBase]}" deste insumo.`,
    );
  }
  if (info.fatorFixo !== null) return info.fatorFixo;
  if (!fatorInformado || fatorInformado <= 0) {
    throw new Error(`Informe quantas unidades equivalem a 1 "${info.label.toLowerCase()}" (ex: caixa com 24 unidades).`);
  }
  return fatorInformado;
}

/** Converte uma quantidade comprada (na unidade de compra) para a unidade-base do insumo. */
export function converterParaBase(quantidade: number, fatorConversao: number): number {
  return quantidade * fatorConversao;
}

/** Tenta inferir a UnidadeMedida a partir do texto livre de "unidade comercial" (uCom) de uma NF-e. */
export function inferirUnidadeMedida(uComRaw: string | undefined | null): UnidadeMedida | null {
  const u = (uComRaw || '').trim().toUpperCase();
  const MAP: Record<string, UnidadeMedida> = {
    MG: 'MG',
    G: 'G', GR: 'G', GRAMA: 'G', GRAMAS: 'G',
    KG: 'KG', QUILO: 'KG',
    ML: 'ML',
    L: 'L', LT: 'L', LITRO: 'L', LITROS: 'L',
    UN: 'UN', UND: 'UN', UNID: 'UN', PC: 'UN', 'PÇ': 'UN', PECA: 'UN',
    DZ: 'DUZIA', DUZIA: 'DUZIA',
    CX: 'CAIXA', CAIXA: 'CAIXA',
    PCT: 'PACOTE', PACOTE: 'PACOTE', PAC: 'PACOTE',
    FD: 'FARDO', FARDO: 'FARDO',
  };
  return MAP[u] ?? null;
}
