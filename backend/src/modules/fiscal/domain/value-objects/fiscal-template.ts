// Modelo fiscal: conjunto reutilizável de dados fiscais para um GRUPO de produtos
// (alcoólicos, bebidas industrializadas, comida, jogos de tabuleiro...). Puro, sem dependências externas.
//
// O modelo é "resolvido" para os mesmos campos do cadastro fiscal de um item (FiscalItemData) escolhendo
// um dos CFOPs do modelo. Só entram na resolução os campos que fazem sentido para o CST/CSOSN do CFOP —
// nenhum valor é inferido: o que o modelo não informa continua vazio e vira pendência no item.

import {
  FiscalIssue, FiscalItemData, normalizeAndValidate, ICMS_CSOSN_SIMPLES, ICMS_CST_NORMAL, CREDITO_PRESUMIDO_KEY,
} from '@/modules/fiscal/domain/value-objects/fiscal-item-fields';

export interface TemplateCfop {
  cfop: string;
  icmsSituacao: string;   // CST ou CSOSN
  pisSituacao: string;
  cofinsSituacao: string;
}

export interface FiscalTemplateData {
  ncm?: string | null;
  cest?: string | null;
  origem?: string | null;
  codigoBeneficio?: string | null;
  unidadeComercial?: string | null;
  /** true = produzido em escala relevante; false exige CNPJ do fabricante (só quando há CEST). */
  escalaRelevante?: boolean | null;
  cnpjFabricante?: string | null;
  creditoPresumido?: { codigo?: string | null; percentual?: string | null };
  icms?: {
    modalidadeBase?: string | null; reducaoBase?: string | null; aliquota?: string | null;
    fcp?: string | null; aliquotaCreditoSimples?: string | null;
  };
  icmsSt?: {
    modalidadeBase?: string | null; reducaoBase?: string | null; aliquota?: string | null;
    mva?: string | null; fcp?: string | null;
  };
  pis?: { aliquota?: string | null };
  cofins?: { aliquota?: string | null };
  ibsCbs?: {
    situacao?: string | null; classificacao?: string | null;
    ibsUfAliquota?: string | null; ibsMunAliquota?: string | null; cbsAliquota?: string | null;
  };
  cfops: TemplateCfop[];
  /** Outros campos Focus pelo nome exato (ex.: ICMS efetivo), repassados como estão. */
  extra?: Record<string, string | number | boolean> | null;
}

// Em quais situações cada grupo de campos é enviado (layout NF-e/NFC-e).
const ICMS_PROPRIO     = ['00', '10', '20', '51', '70', '90', '900'];
const ICMS_REDUCAO     = ['20', '51', '70', '90', '900'];
const ICMS_FCP         = ['00', '10', '20', '51', '70', '90'];
const ICMS_ST          = ['10', '30', '70', '90', '201', '202', '203', '900'];
const CREDITO_SIMPLES  = ['101', '201'];

const s = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const dec = (v: unknown) => s(v).replace(',', '.');
const opt = (v: unknown) => { const x = s(v); return x === '' ? null : x; };
const optDec = (v: unknown) => { const x = dec(v); return x === '' ? null : x; };

/** Normaliza o que veio do formulário (trim, vírgula→ponto, vazio→null). A validação de formato é em `validateTemplate`. */
export function normalizeTemplate(input: any): FiscalTemplateData {
  const i = input ?? {};
  return {
    ncm: opt(i.ncm)?.replace(/\D/g, '') ?? null,
    cest: opt(i.cest)?.replace(/\D/g, '') ?? null,
    origem: opt(i.origem),
    codigoBeneficio: opt(i.codigoBeneficio)?.toUpperCase() ?? null,
    unidadeComercial: opt(i.unidadeComercial)?.toUpperCase() ?? null,
    escalaRelevante: typeof i.escalaRelevante === 'boolean' ? i.escalaRelevante : null,
    cnpjFabricante: opt(i.cnpjFabricante)?.replace(/\D/g, '') ?? null,
    creditoPresumido: { codigo: opt(i.creditoPresumido?.codigo)?.toUpperCase() ?? null, percentual: optDec(i.creditoPresumido?.percentual) },
    icms: {
      modalidadeBase: opt(i.icms?.modalidadeBase), reducaoBase: optDec(i.icms?.reducaoBase), aliquota: optDec(i.icms?.aliquota),
      fcp: optDec(i.icms?.fcp), aliquotaCreditoSimples: optDec(i.icms?.aliquotaCreditoSimples),
    },
    icmsSt: {
      modalidadeBase: opt(i.icmsSt?.modalidadeBase), reducaoBase: optDec(i.icmsSt?.reducaoBase), aliquota: optDec(i.icmsSt?.aliquota),
      mva: optDec(i.icmsSt?.mva), fcp: optDec(i.icmsSt?.fcp),
    },
    pis: { aliquota: optDec(i.pis?.aliquota) },
    cofins: { aliquota: optDec(i.cofins?.aliquota) },
    ibsCbs: {
      situacao: opt(i.ibsCbs?.situacao), classificacao: opt(i.ibsCbs?.classificacao),
      ibsUfAliquota: optDec(i.ibsCbs?.ibsUfAliquota), ibsMunAliquota: optDec(i.ibsCbs?.ibsMunAliquota), cbsAliquota: optDec(i.ibsCbs?.cbsAliquota),
    },
    cfops: (Array.isArray(i.cfops) ? i.cfops : []).map((c: any) => ({
      cfop: s(c?.cfop).replace(/\D/g, ''), icmsSituacao: s(c?.icmsSituacao), pisSituacao: s(c?.pisSituacao), cofinsSituacao: s(c?.cofinsSituacao),
    })),
    extra: i.extra && typeof i.extra === 'object' ? i.extra : null,
  };
}

/** Converte o modelo + um CFOP escolhido nos campos fiscais de um item. */
export function resolveTemplate(t: FiscalTemplateData, cfop?: string | null): FiscalItemData & { cfopResolvido: string | null } {
  const row = t.cfops.find((c) => c.cfop === cfop) ?? t.cfops[0] ?? null;
  const st = row?.icmsSituacao ?? '';
  const extra: Record<string, any> = { ...(t.extra ?? {}) };
  const put = (k: string, v: unknown) => { if (v !== null && v !== undefined && s(v) !== '') extra[k] = v; };

  if (ICMS_PROPRIO.includes(st)) {
    put('icms_modalidade_base_calculo', t.icms?.modalidadeBase);
    put('icms_aliquota', t.icms?.aliquota);
    if (ICMS_REDUCAO.includes(st)) put('icms_reducao_base_calculo', t.icms?.reducaoBase);
    if (ICMS_FCP.includes(st)) put('fcp_percentual', t.icms?.fcp);
  }
  if (CREDITO_SIMPLES.includes(st)) put('icms_aliquota_credito_simples', t.icms?.aliquotaCreditoSimples);
  if (ICMS_ST.includes(st)) {
    put('icms_modalidade_base_calculo_st', t.icmsSt?.modalidadeBase);
    put('icms_reducao_base_calculo_st', t.icmsSt?.reducaoBase);
    put('icms_aliquota_st', t.icmsSt?.aliquota);
    put('icms_margem_valor_adicionado_st', t.icmsSt?.mva);
    put('fcp_percentual_st', t.icmsSt?.fcp);
  }
  if (row?.pisSituacao === '01' || row?.pisSituacao === '02') put('pis_aliquota_porcentual', t.pis?.aliquota);
  if (row?.cofinsSituacao === '01' || row?.cofinsSituacao === '02') put('cofins_aliquota_porcentual', t.cofins?.aliquota);

  if (t.cest) {
    if (typeof t.escalaRelevante === 'boolean') extra.escala_relevante = t.escalaRelevante;
    if (t.escalaRelevante === false) put('cnpj_fabricante', t.cnpjFabricante);
  }
  if (s(t.creditoPresumido?.codigo)) {
    extra[CREDITO_PRESUMIDO_KEY] = [{
      codigo_beneficio_fiscal: t.creditoPresumido!.codigo,
      ...(s(t.creditoPresumido?.percentual) ? { percentual: t.creditoPresumido!.percentual } : {}),
    }];
  }
  put('ibs_uf_aliquota', t.ibsCbs?.ibsUfAliquota);
  put('ibs_mun_aliquota', t.ibsCbs?.ibsMunAliquota);
  put('cbs_aliquota', t.ibsCbs?.cbsAliquota);

  return {
    ncm: t.ncm, cest: t.cest, cfop: row?.cfop ?? null, cfopResolvido: row?.cfop ?? null,
    unidadeComercial: t.unidadeComercial ?? 'UN', icmsOrigem: t.origem,
    icmsSituacao: row?.icmsSituacao || null, pisSituacao: row?.pisSituacao || null, cofinsSituacao: row?.cofinsSituacao || null,
    codigoBeneficio: t.codigoBeneficio, ibsCbsSituacao: t.ibsCbs?.situacao, ibsCbsClassificacao: t.ibsCbs?.classificacao,
    extra,
  };
}

/** Valida o formato de todos os campos do modelo (cada CFOP é resolvido e passa pelas mesmas regras do item). */
export function validateTemplate(t: FiscalTemplateData): FiscalIssue[] {
  const errors: FiscalIssue[] = [];
  const err = (field: string, message: string) => errors.push({ field, message, severity: 'error' });

  if (!t.cfops.length) err('cfops', 'Cadastre ao menos um CFOP no modelo');
  const seen = new Set<string>();
  for (const c of t.cfops) {
    if (seen.has(c.cfop)) err('cfops', `CFOP ${c.cfop} repetido`);
    seen.add(c.cfop);
    if (!c.cfop) err('cfops', 'CFOP em branco');
    if (!c.icmsSituacao) err(`cfops.${c.cfop}`, `CFOP ${c.cfop}: informe o CSOSN/CST do ICMS`);
    if (!c.pisSituacao) err(`cfops.${c.cfop}`, `CFOP ${c.cfop}: informe o CST do PIS`);
    if (!c.cofinsSituacao) err(`cfops.${c.cfop}`, `CFOP ${c.cfop}: informe o CST da COFINS`);
  }
  const known = [...ICMS_CST_NORMAL, ...ICMS_CSOSN_SIMPLES] as readonly string[];
  for (const c of t.cfops) if (c.icmsSituacao && !known.includes(c.icmsSituacao)) err(`cfops.${c.cfop}`, `CFOP ${c.cfop}: CST/CSOSN de ICMS inválido`);

  // Formato dos campos — resolve cada CFOP e reaproveita as validações do item.
  const dedupe = new Set<string>();
  for (const c of t.cfops.length ? t.cfops : [undefined]) {
    const resolved = resolveTemplate(t, c?.cfop);
    const { errors: errs } = normalizeAndValidate(resolved);
    for (const e of errs) {
      const key = `${e.field}|${e.message}`;
      if (!dedupe.has(key)) { dedupe.add(key); errors.push(e); }
    }
  }
  const pct = /^\d{1,3}(\.\d{1,4})?$/;
  const checkPct = (field: string, v: unknown, label: string) => { if (s(v) && !pct.test(s(v))) err(field, `${label}: até 3 inteiros e 4 decimais`); };
  checkPct('icms.aliquota', t.icms?.aliquota, 'Alíquota ICMS');
  checkPct('icms.reducaoBase', t.icms?.reducaoBase, 'Redução da base ICMS');
  checkPct('icms.fcp', t.icms?.fcp, 'FCP');
  checkPct('icms.aliquotaCreditoSimples', t.icms?.aliquotaCreditoSimples, 'Alíquota de crédito do Simples');
  checkPct('icmsSt.aliquota', t.icmsSt?.aliquota, 'Alíquota ICMS ST');
  checkPct('icmsSt.reducaoBase', t.icmsSt?.reducaoBase, 'Redução da base ICMS ST');
  checkPct('icmsSt.mva', t.icmsSt?.mva, 'MVA');
  checkPct('icmsSt.fcp', t.icmsSt?.fcp, 'FCP ST');
  checkPct('pis.aliquota', t.pis?.aliquota, 'Alíquota PIS');
  checkPct('cofins.aliquota', t.cofins?.aliquota, 'Alíquota COFINS');
  checkPct('creditoPresumido.percentual', t.creditoPresumido?.percentual, 'Percentual de crédito presumido');
  if (s(t.icms?.modalidadeBase) && !['0', '1', '2', '3'].includes(s(t.icms?.modalidadeBase))) err('icms.modalidadeBase', 'Modalidade da base do ICMS: 0 a 3');
  if (s(t.icmsSt?.modalidadeBase) && !['0', '1', '2', '3', '4', '5', '6'].includes(s(t.icmsSt?.modalidadeBase))) err('icmsSt.modalidadeBase', 'Modalidade da base do ICMS ST: 0 a 6');
  if (s(t.creditoPresumido?.percentual) && !s(t.creditoPresumido?.codigo)) err('creditoPresumido.codigo', 'Informe o código do crédito presumido');
  return errors;
}
