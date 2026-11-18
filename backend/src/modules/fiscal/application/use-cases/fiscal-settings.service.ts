import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FISCAL_REPOSITORY_PORT, FiscalRepositoryPort } from '@/modules/fiscal/domain/repositories/fiscal-repository.port';
import {
  DEFAULT_FISCAL_SETTINGS, FORMAS_PAGAMENTO_FOCUS, FiscalAmbiente, FiscalSettings,
} from '@/modules/fiscal/domain/entities/fiscal-settings';
import { FiscalAuditService } from '@/modules/fiscal/application/use-cases/fiscal-audit.service';

const KEY_ENABLED  = 'fiscal_enabled';
const KEY_SETTINGS = 'fiscal_settings';

export function validCnpj(raw: string): boolean {
  const c = (raw ?? '').replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0; let pos = len - 7;
    for (let i = len; i >= 1; i--) { sum += Number(c[len - i]) * pos--; if (pos < 2) pos = 9; }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

/**
 * Única fonte da flag `fiscal_enabled` e das configurações fiscais. Nenhum outro módulo lê estas chaves:
 * o PDV não sabe que o fiscal existe — desligar (ou nem ter) o módulo não altera fechamento/pagamentos.
 */
@Injectable()
export class FiscalSettingsService {
  constructor(
    @Inject(FISCAL_REPOSITORY_PORT) private readonly repo: FiscalRepositoryPort,
    private readonly audit: FiscalAuditService,
  ) {}

  async isEnabled(): Promise<boolean> {
    const v = await this.repo.getConfig(KEY_ENABLED);
    return v === true || v?.enabled === true;
  }

  /**
   * Instante em que o módulo foi ligado pela última vez. A emissão automática de "recuperação"
   * (evento perdido/NATS fora) só considera comandas fechadas depois disso — ligar o fiscal nunca
   * emite vendas antigas.
   */
  async enabledSince(): Promise<Date | null> {
    const v = await this.repo.getConfig(KEY_ENABLED);
    return v?.enabled === true && v.since ? new Date(v.since) : null;
  }

  /** Desativar não apaga configurações, documentos nem histórico; reativar recupera tudo. */
  async setEnabled(enabled: boolean, actor: string) {
    const previous = await this.repo.getConfig(KEY_ENABLED);
    const since = enabled ? (previous?.enabled === true && previous.since ? previous.since : new Date().toISOString()) : undefined;
    await this.repo.saveConfig(KEY_ENABLED, enabled ? { enabled, since } : { enabled });
    await this.audit.log({ action: 'TOGGLE', actor, success: true, detail: { enabled } });
    return { enabled };
  }

  async getSettings(): Promise<FiscalSettings> {
    const stored = (await this.repo.getConfig(KEY_SETTINGS)) ?? {};
    return { ...DEFAULT_FISCAL_SETTINGS, ...stored, paymentMethodMap: { ...(stored.paymentMethodMap ?? {}) } };
  }

  /** Token só vem do ambiente do servidor (.env) — nunca é gravado em banco nem devolvido ao frontend. */
  getToken(ambiente: FiscalAmbiente): string | null {
    const raw = ambiente === 'producao' ? process.env.FOCUS_NFE_TOKEN_PRODUCAO : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;
    return raw?.trim() || null;
  }

  baseUrl(ambiente: FiscalAmbiente): string {
    const override = process.env.FOCUS_NFE_BASE_URL?.trim();
    if (override) return override.replace(/\/+$/, '');
    return ambiente === 'producao' ? 'https://api.focusnfe.com.br/v2' : 'https://homologacao.focusnfe.com.br/v2';
  }

  async updateSettings(patch: Partial<FiscalSettings>, actor: string): Promise<FiscalSettings> {
    const current = await this.getSettings();
    const next: FiscalSettings = { ...current };
    const errors: string[] = [];

    if (patch.ambiente !== undefined) {
      if (!['homologacao', 'producao'].includes(patch.ambiente)) errors.push('Ambiente inválido');
      else next.ambiente = patch.ambiente;
    }
    if (patch.cnpjEmitente !== undefined) {
      const c = String(patch.cnpjEmitente).replace(/\D/g, '');
      if (c && !validCnpj(c)) errors.push('CNPJ do emitente inválido');
      else next.cnpjEmitente = c;
    }
    for (const k of ['razaoSocial', 'nomeFantasia', 'endereco', 'naturezaOperacao'] as const) {
      if (patch[k] !== undefined) next[k] = String(patch[k]).trim().slice(0, 200);
    }
    if (patch.inscricaoEstadual !== undefined) next.inscricaoEstadual = String(patch.inscricaoEstadual).replace(/[^\dA-Za-z]/g, '').slice(0, 20);
    if (patch.regime !== undefined) {
      if (!['simples', 'normal'].includes(patch.regime)) errors.push('Regime tributário inválido');
      else next.regime = patch.regime;
    }
    for (const k of ['autoEmit', 'printAfterAuthorize', 'exigirIbsCbs'] as const) {
      if (patch[k] !== undefined) next[k] = !!patch[k];
    }
    if (patch.timeoutMs !== undefined) {
      const t = Number(patch.timeoutMs);
      if (!Number.isFinite(t) || t < 5000 || t > 120000) errors.push('Timeout deve estar entre 5000 e 120000 ms');
      else next.timeoutMs = Math.round(t);
    }
    if (patch.paymentMethodMap !== undefined) {
      const map: Record<string, string> = {};
      for (const [code, tPag] of Object.entries(patch.paymentMethodMap ?? {})) {
        if (!tPag) continue;
        if (!FORMAS_PAGAMENTO_FOCUS[tPag]) errors.push(`Forma de pagamento fiscal inválida para ${code}: ${tPag}`);
        else map[code] = tPag;
      }
      next.paymentMethodMap = map;
    }

    if (errors.length) throw new BadRequestException(errors);
    await this.repo.saveConfig(KEY_SETTINGS, next);
    await this.audit.log({
      action: 'SETTINGS', actor, success: true,
      detail: { changed: Object.keys(patch) }, // sem valores: nada sensível vai para o log
    });
    return next;
  }

  /** Visão para a tela de Admin — nunca inclui o token, só se está configurado. */
  async overview() {
    const settings = await this.getSettings();
    const methods = await this.repo.listPaymentMethods();
    return {
      enabled: await this.isEnabled(),
      settings,
      token: {
        homologacao: !!this.getToken('homologacao'),
        producao: !!this.getToken('producao'),
        ambienteAtivoConfigurado: !!this.getToken(settings.ambiente),
      },
      baseUrl: this.baseUrl(settings.ambiente),
      pendencias: this.readinessIssues(settings),
      paymentMethods: methods.map((m) => ({ ...m, formaPagamentoFiscal: settings.paymentMethodMap[m.code] ?? null })),
      formasPagamentoFiscais: FORMAS_PAGAMENTO_FOCUS,
    };
  }

  readinessIssues(s: FiscalSettings): string[] {
    const out: string[] = [];
    if (!validCnpj(s.cnpjEmitente)) out.push('CNPJ do emitente não configurado');
    if (!this.getToken(s.ambiente)) {
      out.push(`Token da Focus NFe (${s.ambiente}) não configurado no servidor (.env)`);
    }
    if (!s.razaoSocial) out.push('Razão social não informada (necessária no DANFE-NFC-e impresso)');
    return out;
  }
}
