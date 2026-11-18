// Regras puras (sem dependências externas) da classificação fiscal de um item do cardápio.
//
// Os nomes dos campos extras seguem o nome do campo de item da API Focus NFe
// (https://campos.focusnfe.com.br/nfe/ItemNotaFiscalXML.html). Os valores NÃO são inferidos:
// o que não for informado fica vazio e o item aparece como "pendência fiscal".
// A tributação precisa ser validada pelo contador responsável.

export type RegimeTributario = 'simples' | 'normal';
export type Severity = 'error' | 'warning';

export interface FiscalItemData {
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  unidadeComercial?: string | null;
  icmsOrigem?: string | null;
  icmsSituacao?: string | null;
  pisSituacao?: string | null;
  cofinsSituacao?: string | null;
  codigoBeneficio?: string | null;
  ibsCbsSituacao?: string | null;
  ibsCbsClassificacao?: string | null;
  extra?: Record<string, any> | null;
}

export interface FiscalIssue {
  field: string;
  message: string;
  severity: Severity;
}

export const ICMS_CST_NORMAL    = ['00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'] as const;
export const ICMS_CSOSN_SIMPLES = ['101', '102', '103', '201', '202', '203', '300', '400', '500', '900'] as const;
export const PIS_COFINS_CST = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '49',
  '50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66', '67',
  '70', '71', '72', '73', '74', '75', '98', '99',
] as const;
// A NFC-e só aceita estes CST de IBS/CBS (docs Focus: emitir NFC-e / IBS-CBS).
export const IBS_CBS_CST_NFCE = ['000', '200', '410', '620'] as const;

// CST/CSOSN que implicam ICMS-ST → CEST obrigatório ("Sim, se houver ICMS-ST").
const CEST_REQUIRED = ['10', '30', '70', '201', '202', '203'];
// ST já retido anteriormente: CEST costuma ser exigido, mas depende do produto → só alerta.
const CEST_RECOMMENDED = ['60', '500'];

// Campos do item que o mapper controla — não podem vir de `extra`.
export const RESERVED_ITEM_FIELDS = new Set([
  'numero_item', 'codigo_produto', 'descricao', 'codigo_ncm', 'cest', 'cfop', 'codigo_beneficio_fiscal',
  'unidade_comercial', 'unidade_tributavel', 'quantidade_comercial', 'quantidade_tributavel',
  'valor_unitario_comercial', 'valor_unitario_tributavel', 'valor_bruto', 'valor_desconto',
  'icms_origem', 'icms_situacao_tributaria', 'pis_situacao_tributaria', 'cofins_situacao_tributaria',
  'ibs_cbs_situacao_tributaria', 'ibs_cbs_classificacao_tributaria',
]);

type Kind = { t: 'dec'; int: number; frac: number } | { t: 'enum'; values: string[] } | { t: 'bool' } | { t: 'cnpj' };
const aliq: Kind = { t: 'dec', int: 3, frac: 4 };
const money: Kind = { t: 'dec', int: 13, frac: 2 };

// Formatos conhecidos (documentação Focus). Chaves fora daqui são aceitas (Reforma Tributária
// evolui), desde que sejam valores simples e não colidam com RESERVED_ITEM_FIELDS.
export const KNOWN_EXTRA_FIELDS: Record<string, Kind> = {
  icms_modalidade_base_calculo:   { t: 'enum', values: ['0', '1', '2', '3'] },
  icms_base_calculo:              money,
  icms_aliquota:                  aliq,
  icms_valor:                     money,
  icms_reducao_base_calculo:      aliq,
  icms_aliquota_credito_simples:  money,
  icms_valor_credito_simples:     money,
  icms_modalidade_base_calculo_st: { t: 'enum', values: ['0', '1', '2', '3', '4', '5', '6'] },
  icms_margem_valor_adicionado_st: aliq,
  icms_reducao_base_calculo_st:   aliq,
  icms_base_calculo_st:           money,
  icms_aliquota_st:               aliq,
  icms_valor_st:                  money,
  icms_aliquota_final:            aliq,
  icms_valor_substituto:          aliq,
  icms_base_calculo_retido_st:    money,
  icms_valor_retido_st:           money,
  icms_valor_desonerado:          money,
  icms_motivo_desoneracao:        { t: 'enum', values: ['1', '3', '4', '5', '6', '7', '9', '10', '11', '12', '16'] },
  fcp_percentual:                 { t: 'dec', int: 3, frac: 4 },
  fcp_base_calculo:               money,
  fcp_valor:                      money,
  fcp_percentual_st:              { t: 'dec', int: 3, frac: 4 },
  escala_relevante:               { t: 'bool' },
  cnpj_fabricante:                { t: 'cnpj' },
  pis_base_calculo:               money,
  pis_aliquota_porcentual:        aliq,
  pis_quantidade_vendida:         { t: 'dec', int: 12, frac: 4 },
  pis_aliquota_valor:             aliq,
  pis_valor:                      money,
  cofins_base_calculo:            money,
  cofins_aliquota_porcentual:     aliq,
  cofins_quantidade_vendida:      { t: 'dec', int: 12, frac: 4 },
  cofins_aliquota_valor:          aliq,
  cofins_valor:                   money,
  ibs_cbs_indicacao_doacao:       { t: 'enum', values: ['1'] },
  ibs_cbs_base_calculo:           money,
  ibs_uf_aliquota:                aliq,
  ibs_mun_aliquota:               aliq,
  cbs_aliquota:                   aliq,
};

const KEY_RE = /^[a-z][a-z0-9_]{2,60}$/;

/** Campo estruturado (coleção 0-4) aceito em `extra` além dos valores simples. */
export const CREDITO_PRESUMIDO_KEY = 'infos_credito_presumido';
export type CreditoPresumido = { codigo_beneficio_fiscal: string; percentual?: string | number; valor?: string | number };

function validateCreditoPresumido(raw: unknown): { value?: CreditoPresumido[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(raw) || raw.length > 4) return { errors: ['Crédito presumido: lista de até 4 itens'] };
  const out: CreditoPresumido[] = [];
  for (const r of raw as any[]) {
    const codigo = clean(r?.codigo_beneficio_fiscal).toUpperCase();
    if (!/^[A-Z0-9]{8,10}$/.test(codigo)) { errors.push('Crédito presumido: código com 8 a 10 caracteres alfanuméricos'); continue; }
    const item: CreditoPresumido = { codigo_beneficio_fiscal: codigo };
    for (const [k, int, frac] of [['percentual', 3, 4], ['valor', 13, 2]] as const) {
      const v = clean(r?.[k]);
      if (!v) continue;
      if (!decRe(int, frac).test(v)) errors.push(`Crédito presumido: ${k} em formato inválido`);
      else (item as any)[k] = v;
    }
    out.push(item);
  }
  return { value: out, errors };
}

function decRe(int: number, frac: number) {
  return new RegExp(`^\\d{1,${int}}(\\.\\d{1,${frac}})?$`);
}

const clean = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());

/** Normaliza (trim/maiúsculas/vazio→null) e valida formato. Lança lista de erros. */
export function normalizeAndValidate(input: FiscalItemData): { data: FiscalItemData; errors: FiscalIssue[] } {
  const errors: FiscalIssue[] = [];
  const err = (field: string, message: string) => errors.push({ field, message, severity: 'error' });
  const opt = (v: unknown) => { const s = clean(v); return s === '' ? null : s; };

  const data: FiscalItemData = {
    ncm: opt(input.ncm)?.replace(/\D/g, '') ?? null,
    cest: opt(input.cest)?.replace(/\D/g, '') ?? null,
    cfop: opt(input.cfop)?.replace(/\D/g, '') ?? null,
    unidadeComercial: opt(input.unidadeComercial)?.toUpperCase() ?? null,
    icmsOrigem: opt(input.icmsOrigem),
    icmsSituacao: opt(input.icmsSituacao),
    pisSituacao: opt(input.pisSituacao),
    cofinsSituacao: opt(input.cofinsSituacao),
    codigoBeneficio: opt(input.codigoBeneficio)?.toUpperCase() ?? null,
    ibsCbsSituacao: opt(input.ibsCbsSituacao),
    ibsCbsClassificacao: opt(input.ibsCbsClassificacao),
    extra: null,
  };

  if (data.ncm && !/^\d{8}$/.test(data.ncm)) err('ncm', 'NCM deve ter 8 dígitos');
  if (data.cest && !/^\d{7}$/.test(data.cest)) err('cest', 'CEST deve ter 7 dígitos');
  if (data.cfop && !/^[1-7]\d{3}$/.test(data.cfop)) err('cfop', 'CFOP deve ter 4 dígitos (iniciando em 1 a 7)');
  if (data.unidadeComercial && !/^[A-Z0-9]{1,6}$/.test(data.unidadeComercial)) err('unidadeComercial', 'Unidade comercial: 1 a 6 caracteres alfanuméricos');
  if (data.icmsOrigem && !/^[0-8]$/.test(data.icmsOrigem)) err('icmsOrigem', 'Origem da mercadoria deve ser de 0 a 8');
  if (data.icmsSituacao && ![...ICMS_CST_NORMAL, ...ICMS_CSOSN_SIMPLES].includes(data.icmsSituacao as any)) {
    err('icmsSituacao', 'CST (2 dígitos) ou CSOSN (3 dígitos) de ICMS inválido');
  }
  if (data.pisSituacao && !PIS_COFINS_CST.includes(data.pisSituacao as any)) err('pisSituacao', 'CST do PIS inválido');
  if (data.cofinsSituacao && !PIS_COFINS_CST.includes(data.cofinsSituacao as any)) err('cofinsSituacao', 'CST da COFINS inválido');
  if (data.codigoBeneficio && !/^[A-Z0-9]{8,10}$/.test(data.codigoBeneficio)) err('codigoBeneficio', 'Código de benefício fiscal: 8 a 10 caracteres alfanuméricos');
  if (data.ibsCbsSituacao && !(IBS_CBS_CST_NFCE as readonly string[]).includes(data.ibsCbsSituacao)) {
    err('ibsCbsSituacao', `CST de IBS/CBS aceito na NFC-e: ${IBS_CBS_CST_NFCE.join(', ')}`);
  }
  if (data.ibsCbsClassificacao && !/^\d{6}$/.test(data.ibsCbsClassificacao)) err('ibsCbsClassificacao', 'Classificação tributária (cClassTrib) deve ter 6 dígitos');
  if (!!data.ibsCbsSituacao !== !!data.ibsCbsClassificacao) {
    err('ibsCbsClassificacao', 'IBS/CBS: informe CST e classificação tributária juntos');
  }

  // extras
  const extra: Record<string, any> = {};
  for (const [k, raw] of Object.entries(input.extra ?? {})) {
    const v = typeof raw === 'string' ? raw.trim() : raw;
    if (v === '' || v === null || v === undefined) continue;
    if (!KEY_RE.test(k)) { err(`extra.${k}`, 'Nome de campo inválido'); continue; }
    if (RESERVED_ITEM_FIELDS.has(k)) { err(`extra.${k}`, 'Campo controlado pelo sistema — use o campo dedicado'); continue; }
    if (k === CREDITO_PRESUMIDO_KEY) {
      const r = validateCreditoPresumido(v);
      r.errors.forEach((m) => err(`extra.${k}`, m));
      if (r.value?.length && !r.errors.length) (extra as any)[k] = r.value;
      continue;
    }
    if (!['string', 'number', 'boolean'].includes(typeof v)) { err(`extra.${k}`, 'Valor deve ser texto, número ou booleano'); continue; }
    const kind = KNOWN_EXTRA_FIELDS[k];
    if (kind?.t === 'bool') {
      if (!['true', 'false'].includes(String(v))) { err(`extra.${k}`, 'Valor deve ser true ou false'); continue; }
      extra[k] = String(v) === 'true';
      continue;
    }
    if (kind?.t === 'cnpj') {
      const d = String(v).replace(/\D/g, '');
      if (!/^\d{14}$/.test(d)) { err(`extra.${k}`, 'CNPJ deve ter 14 dígitos'); continue; }
      extra[k] = d;
      continue;
    }
    if (kind?.t === 'dec' && !decRe(kind.int, kind.frac).test(String(v))) {
      err(`extra.${k}`, `Formato inválido (até ${kind.int} inteiros e ${kind.frac} decimais, ponto como separador)`);
      continue;
    }
    if (kind?.t === 'enum' && !kind.values.includes(String(v))) {
      err(`extra.${k}`, `Valor inválido (aceitos: ${kind.values.join(', ')})`);
      continue;
    }
    extra[k] = v as any;
  }
  data.extra = Object.keys(extra).length ? extra : null;
  return { data, errors };
}

/**
 * Pendências para emitir. 'error' bloqueia a emissão; 'warning' só alerta (confirmar com o contador).
 * Nunca preenche nada — apenas aponta o que falta.
 */
export function findIssues(
  d: FiscalItemData,
  opts: { regime: RegimeTributario; exigirIbsCbs: boolean },
): FiscalIssue[] {
  const out: FiscalIssue[] = [];
  const need = (field: string, v: unknown, label: string) => {
    if (!clean(v)) out.push({ field, message: `${label} não informado`, severity: 'error' });
  };
  need('ncm', d.ncm, 'NCM');
  need('cfop', d.cfop, 'CFOP');
  need('unidadeComercial', d.unidadeComercial, 'Unidade comercial');
  need('icmsOrigem', d.icmsOrigem, 'Origem da mercadoria');
  need('icmsSituacao', d.icmsSituacao, opts.regime === 'simples' ? 'CSOSN do ICMS' : 'CST do ICMS');
  need('pisSituacao', d.pisSituacao, 'CST do PIS');
  need('cofinsSituacao', d.cofinsSituacao, 'CST da COFINS');

  const st = clean(d.icmsSituacao);
  if (st) {
    const isSimples = (ICMS_CSOSN_SIMPLES as readonly string[]).includes(st);
    const isNormal  = (ICMS_CST_NORMAL as readonly string[]).includes(st);
    if (opts.regime === 'simples' && !isSimples) {
      out.push({ field: 'icmsSituacao', message: 'Emitente no Simples Nacional exige CSOSN (3 dígitos), não CST', severity: 'error' });
    }
    if (opts.regime === 'normal' && !isNormal) {
      out.push({ field: 'icmsSituacao', message: 'Emitente no regime normal exige CST (2 dígitos), não CSOSN', severity: 'error' });
    }
    if (CEST_REQUIRED.includes(st) && !clean(d.cest)) {
      out.push({ field: 'cest', message: 'CEST obrigatório para ICMS-ST', severity: 'error' });
    } else if (CEST_RECOMMENDED.includes(st) && !clean(d.cest)) {
      out.push({ field: 'cest', message: 'Confirme com o contador se este item exige CEST (ST anterior)', severity: 'warning' });
    }
    const missing = (keys: string[]) => keys.filter((k) => d.extra?.[k] === undefined || d.extra[k] === '');
    const ST = ['icms_modalidade_base_calculo_st', 'icms_aliquota_st'];
    const req: Record<string, string[]> = {
      '00': ['icms_modalidade_base_calculo', 'icms_aliquota'],
      '10': ['icms_modalidade_base_calculo', 'icms_aliquota', ...ST],
      '20': ['icms_modalidade_base_calculo', 'icms_reducao_base_calculo', 'icms_aliquota'],
      '30': ST,
      '70': ['icms_modalidade_base_calculo', 'icms_reducao_base_calculo', 'icms_aliquota', ...ST],
      '101': ['icms_aliquota_credito_simples'],
      '201': ['icms_aliquota_credito_simples', ...ST],
      '202': ST,
      '203': ST,
    };
    // ST com margem de valor agregado (modalidade 4) exige o MVA.
    if (String(d.extra?.icms_modalidade_base_calculo_st) === '4') req[st] = [...(req[st] ?? []), 'icms_margem_valor_adicionado_st'];
    for (const k of missing(req[st] ?? [])) {
      out.push({ field: `extra.${k}`, message: `Campo ${k} obrigatório para a situação ${st}`, severity: 'error' });
    }
    if (!req[st] && !['40', '41', '50', '102', '103', '300', '400', '500', '60'].includes(st)) {
      out.push({ field: 'icmsSituacao', message: `Situação ${st} exige campos adicionais (ST/diferimento): confira com o contador e informe em "campos extras"`, severity: 'warning' });
    }
  }

  if (clean(d.cest)) {
    if (d.extra?.escala_relevante === undefined) {
      out.push({ field: 'extra.escala_relevante', message: 'Item com CEST: informe se é produzido em escala relevante (escala_relevante)', severity: 'warning' });
    } else if (d.extra.escala_relevante === false && !clean(d.extra.cnpj_fabricante)) {
      out.push({ field: 'extra.cnpj_fabricante', message: 'Produção em escala NÃO relevante exige o CNPJ do fabricante (cnpj_fabricante)', severity: 'error' });
    }
  }

  for (const [tag, cst] of [['pis', d.pisSituacao], ['cofins', d.cofinsSituacao]] as const) {
    if (cst === '01' || cst === '02') {
      if (d.extra?.[`${tag}_aliquota_porcentual`] === undefined) {
        out.push({ field: `extra.${tag}_aliquota_porcentual`, message: `${tag}_aliquota_porcentual obrigatório para CST ${cst}`, severity: 'error' });
      }
    } else if (cst === '03') {
      for (const k of [`${tag}_quantidade_vendida`, `${tag}_aliquota_valor`]) {
        if (d.extra?.[k] === undefined) out.push({ field: `extra.${k}`, message: `${k} obrigatório para CST 03`, severity: 'error' });
      }
    }
  }

  if (opts.exigirIbsCbs) {
    need('ibsCbsSituacao', d.ibsCbsSituacao, 'CST de IBS/CBS');
    need('ibsCbsClassificacao', d.ibsCbsClassificacao, 'Classificação tributária de IBS/CBS');
  }
  return out;
}
