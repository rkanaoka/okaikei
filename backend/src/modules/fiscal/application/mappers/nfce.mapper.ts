import { Injectable } from '@nestjs/common';
import { FiscalSettings } from '@/modules/fiscal/domain/entities/fiscal-settings';
import { FiscalIssue, findIssues, FiscalItemData } from '@/modules/fiscal/domain/value-objects/fiscal-item-fields';

export interface NfceBuildResult {
  payload: Record<string, any>;
  total: number;
  /** Bloqueantes (severity 'error') e avisos. Emitir só se não houver 'error'. */
  issues: Array<FiscalIssue & { itemId?: string; itemName?: string }>;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n: number) => round2(n);

/** Linha do menu_items → dados fiscais neutros. */
export function menuItemToFiscalData(mi: any): FiscalItemData {
  return {
    ncm: mi?.fiscalNcm, cest: mi?.fiscalCest, cfop: mi?.fiscalCfop,
    unidadeComercial: mi?.fiscalUnidadeComercial, icmsOrigem: mi?.fiscalIcmsOrigem,
    icmsSituacao: mi?.fiscalIcmsSituacao, pisSituacao: mi?.fiscalPisSituacao, cofinsSituacao: mi?.fiscalCofinsSituacao,
    codigoBeneficio: mi?.fiscalCodigoBeneficio, ibsCbsSituacao: mi?.fiscalIbsCbsSituacao,
    ibsCbsClassificacao: mi?.fiscalIbsCbsClassificacao, extra: mi?.fiscalExtra ?? null,
  };
}

/** ISO-8601 com o offset de America/Sao_Paulo (ex.: 2026-11-16T13:54:31-03:00). */
export function isoSaoPaulo(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d).reduce<Record<string, string>>((a, p) => { a[p.type] = p.value; return a; }, {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offMin = Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  const sign = offMin < 0 ? '-' : '+';
  const abs = Math.abs(offMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${sign}${hh}:${mm}`;
}

/**
 * Converte a comanda fechada do PDV no JSON de emissão de NFC-e da Focus NFe (POST /nfce).
 * Função pura: não acessa banco nem rede. Não inventa nenhum dado fiscal — o que falta vira `issue`.
 */
@Injectable()
export class NfceMapper {
  build(comanda: any, settings: FiscalSettings, now = new Date()): NfceBuildResult {
    const issues: NfceBuildResult['issues'] = [];
    const items: any[] = comanda.items ?? [];
    const payments: any[] = comanda.payments ?? [];

    if (!items.length) issues.push({ field: 'items', message: 'Comanda sem itens', severity: 'error' });

    const lines = items.map((ci) => {
      const qty = Number(ci.quantity);
      const unit = Number(ci.unitPrice);
      return { ci, qty, unit, gross: round2(qty * unit) };
    });
    const subtotal = round2(lines.reduce((s, l) => s + l.gross, 0));
    const paid = round2(payments.reduce((s, p) => s + Number(p.amount), 0));
    if (paid <= 0) issues.push({ field: 'payments', message: 'Comanda sem valor pago — NFC-e exige total maior que zero', severity: 'error' });

    // Descontos (manual/voucher/parceria) e taxa de serviço já estão refletidos no total pago.
    // A diferença (pago − subtotal) é rateada proporcionalmente entre os itens: negativa vira
    // valor_desconto, positiva vira valor_outras_despesas. O último item absorve o centavo de arredondamento.
    const adjust = round2(paid - subtotal);
    let remaining = adjust;
    const shares = lines.map((l, idx) => {
      const share = idx === lines.length - 1 ? remaining : round2(subtotal > 0 ? (adjust * l.gross) / subtotal : 0);
      remaining = round2(remaining - share);
      return share;
    });

    const builtItems = lines.map((l, idx) => {
      const mi = l.ci.menuItem ?? {};
      const data = menuItemToFiscalData(mi);
      const share = shares[idx];
      const desconto = share < 0 ? round2(-share) : 0;
      const outras = share > 0 ? share : 0;
      const net = round2(l.gross - desconto + outras);

      for (const iss of findIssues(data, { regime: settings.regime, exigirIbsCbs: settings.exigirIbsCbs })) {
        issues.push({ ...iss, itemId: mi.id, itemName: mi.name });
      }
      if (desconto > l.gross) {
        issues.push({ field: 'valor_desconto', message: 'Desconto rateado maior que o valor do item', severity: 'error', itemId: mi.id, itemName: mi.name });
      }

      const extra = data.extra ?? {};
      const num = (k: string) => (extra[k] !== undefined ? Number(extra[k]) : undefined);
      const derived: Record<string, any> = {};

      // Valores derivados do próprio item (só quando a alíquota foi informada no cadastro e o campo não foi
      // informado manualmente). Qualquer divergência será apontada pela SEFAZ/Focus na validação.
      const st = data.icmsSituacao ?? '';
      let icmsProprio = 0;
      if (['00', '10', '20', '70'].includes(st)) {
        const aliqIcms = num('icms_aliquota');
        const red = ['20', '70'].includes(st) ? (num('icms_reducao_base_calculo') ?? 0) : 0;
        if (aliqIcms !== undefined) {
          const base = round2(net * (1 - red / 100));
          icmsProprio = money(base * aliqIcms / 100);
          derived.icms_base_calculo = money(base);
          derived.icms_valor = icmsProprio;
        }
      }
      // ICMS-ST com modalidade 4 (margem de valor agregado): BC ST = base × (1 + MVA) × (1 − redução ST);
      // ICMS ST = BC ST × alíquota ST − ICMS próprio. Demais modalidades: informar os valores nos campos extras.
      if (['10', '30', '70', '90', '201', '202', '203', '900'].includes(st) && String(extra.icms_modalidade_base_calculo_st) === '4') {
        const mva = num('icms_margem_valor_adicionado_st');
        const aliqSt = num('icms_aliquota_st');
        if (mva !== undefined && aliqSt !== undefined) {
          const redSt = num('icms_reducao_base_calculo_st') ?? 0;
          const bcSt = round2(net * (1 + mva / 100) * (1 - redSt / 100));
          derived.icms_base_calculo_st = money(bcSt);
          derived.icms_valor_st = money(Math.max(0, bcSt * aliqSt / 100 - icmsProprio));
        }
      }
      if (['101', '201'].includes(st) && num('icms_aliquota_credito_simples') !== undefined) {
        derived.icms_valor_credito_simples = money(net * (num('icms_aliquota_credito_simples') as number) / 100);
      }
      for (const [tag, cst] of [['pis', data.pisSituacao], ['cofins', data.cofinsSituacao]] as const) {
        const a = num(`${tag}_aliquota_porcentual`);
        if ((cst === '01' || cst === '02') && a !== undefined) {
          derived[`${tag}_base_calculo`] = money(net);
          derived[`${tag}_valor`] = money(net * a / 100);
        }
      }

      // Crédito presumido: vCredPresumido = base do item × percentual, quando só o percentual foi cadastrado.
      if (Array.isArray(extra.infos_credito_presumido)) {
        derived.infos_credito_presumido = extra.infos_credito_presumido.map((c: any) => ({
          ...c, ...(c.valor === undefined && c.percentual !== undefined ? { valor: money(net * Number(c.percentual) / 100) } : {}),
        }));
      }

      const core: Record<string, any> = {
        numero_item: String(idx + 1),
        codigo_produto: String(mi.id ?? l.ci.menuItemId).slice(0, 60),
        descricao: String(mi.name ?? 'Item').trim().slice(0, 120),
        codigo_ncm: data.ncm ?? undefined,
        cfop: data.cfop ?? undefined,
        unidade_comercial: data.unidadeComercial ?? undefined,
        unidade_tributavel: data.unidadeComercial ?? undefined,
        quantidade_comercial: l.qty,
        quantidade_tributavel: l.qty,
        valor_unitario_comercial: l.unit,
        valor_unitario_tributavel: l.unit,
        valor_bruto: l.gross,
        icms_origem: data.icmsOrigem ?? undefined,
        icms_situacao_tributaria: data.icmsSituacao ?? undefined,
        pis_situacao_tributaria: data.pisSituacao ?? undefined,
        cofins_situacao_tributaria: data.cofinsSituacao ?? undefined,
        ...(data.cest ? { cest: data.cest } : {}),
        ...(data.codigoBeneficio ? { codigo_beneficio_fiscal: data.codigoBeneficio } : {}),
        ...(data.ibsCbsSituacao ? { ibs_cbs_situacao_tributaria: data.ibsCbsSituacao } : {}),
        ...(data.ibsCbsClassificacao ? { ibs_cbs_classificacao_tributaria: data.ibsCbsClassificacao } : {}),
        ...(desconto > 0 ? { valor_desconto: desconto } : {}),
        ...(outras > 0 ? { valor_outras_despesas: outras } : {}),
      };
      // Ordem: derivados < extras do cadastro < campos controlados pelo mapper.
      return stripUndefined({ ...derived, ...extra, ...core });
    });

    const formas = payments.map((p) => {
      const tPag = settings.paymentMethodMap[p.method];
      if (!tPag) {
        issues.push({
          field: 'formas_pagamento',
          message: `Forma de pagamento "${p.method}" sem equivalente fiscal — configure em Admin › Fiscal`,
          severity: 'error',
        });
      }
      return {
        forma_pagamento: tPag,
        valor_pagamento: money(Number(p.amount)),
        // 03/04 = cartão: o PDV não integra com TEF/adquirente → pagamento "não integrado" (tpIntegra=2).
        ...(tPag === '03' || tPag === '04' ? { tipo_integracao: '2' } : {}),
      };
    });

    if (!/^\d{14}$/.test(settings.cnpjEmitente ?? '')) {
      issues.push({ field: 'cnpj_emitente', message: 'CNPJ do emitente não configurado', severity: 'error' });
    }

    const payload = stripUndefined({
      cnpj_emitente: settings.cnpjEmitente,
      data_emissao: isoSaoPaulo(now),
      natureza_operacao: settings.naturezaOperacao || 'VENDA AO CONSUMIDOR',
      presenca_comprador: '1',            // operação presencial (balcão/mesa)
      modalidade_frete: '9',              // sem frete
      local_destino: '1',                 // operação interna
      indicador_inscricao_estadual_destinatario: '9', // não contribuinte
      informacoes_adicionais_contribuinte: comanda.number ? `Comanda ${comanda.number}` : undefined,
      items: builtItems,
      formas_pagamento: formas,
    });

    return { payload, total: paid, issues };
  }
}

function stripUndefined<T extends Record<string, any>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
