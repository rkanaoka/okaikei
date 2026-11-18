import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FISCAL_REPOSITORY_PORT, FiscalRepositoryPort } from '@/modules/fiscal/domain/repositories/fiscal-repository.port';
import { FiscalSettingsService } from '@/modules/fiscal/application/use-cases/fiscal-settings.service';
import { FiscalAuditService } from '@/modules/fiscal/application/use-cases/fiscal-audit.service';
import { FiscalItemData, findIssues, normalizeAndValidate } from '@/modules/fiscal/domain/value-objects/fiscal-item-fields';
import { menuItemToFiscalData } from '@/modules/fiscal/application/mappers/nfce.mapper';

export interface FiscalItemInput extends FiscalItemData {}

/**
 * Classificação fiscal dos itens do cardápio (colunas fiscal_* de menu_items — não há cadastro paralelo).
 * Nada é preenchido automaticamente; a edição exige a permissão 'fiscal' (garantido no controller).
 */
@Injectable()
export class FiscalItemsService {
  constructor(
    @Inject(FISCAL_REPOSITORY_PORT) private readonly repo: FiscalRepositoryPort,
    private readonly settings: FiscalSettingsService,
    private readonly audit: FiscalAuditService,
  ) {}

  private view(mi: any, regime: 'simples' | 'normal', exigirIbsCbs: boolean) {
    const fiscal = menuItemToFiscalData(mi);
    const issues = findIssues(fiscal, { regime, exigirIbsCbs });
    const status = issues.some((i) => i.severity === 'error') ? 'pendente' : issues.length ? 'atencao' : 'ok';
    return {
      id: mi.id, name: mi.name, price: Number(mi.price), available: mi.available,
      category: mi.menuCategory?.name ?? mi.category,
      fiscal, issues, status,
      template: mi.fiscalTemplate ? { id: mi.fiscalTemplate.id, name: mi.fiscalTemplate.name, cfop: mi.fiscalTemplateCfop ?? null } : null,
    };
  }

  /** Todos os itens com suas pendências — base do alerta "produtos sem classificação fiscal". */
  async list(opts: { onlyPending?: boolean } = {}) {
    const s = await this.settings.getSettings();
    const rows = await this.repo.listMenuItemsFiscal();
    const items = rows.map((r) => this.view(r, s.regime, s.exigirIbsCbs));
    const filtered = opts.onlyPending ? items.filter((i) => i.status !== 'ok') : items;
    return {
      total: items.length,
      pendentes: items.filter((i) => i.status === 'pendente').length,
      atencao: items.filter((i) => i.status === 'atencao').length,
      items: filtered,
    };
  }

  async get(id: string) {
    const s = await this.settings.getSettings();
    const mi = await this.repo.findMenuItemFiscal(id);
    if (!mi) throw new NotFoundException('Item do cardápio não encontrado');
    return this.view(mi, s.regime, s.exigirIbsCbs);
  }

  async update(id: string, input: FiscalItemInput, actor: string) {
    const existing = await this.repo.findMenuItemFiscal(id);
    if (!existing) throw new NotFoundException('Item do cardápio não encontrado');

    const { data, errors } = normalizeAndValidate(input ?? {});
    if (errors.length) throw new BadRequestException({ message: 'Dados fiscais inválidos', errors });

    // Edição manual desfaz o vínculo com o modelo (os valores passam a ser do próprio item).
    await this.repo.updateMenuItemFiscal(id, { ...fiscalDataToColumns(data), fiscalTemplateId: null, fiscalTemplateCfop: null });

    await this.audit.log({
      action: 'ITEM_FISCAL', actor, success: true,
      detail: { menuItemId: id, nome: existing.name, antes: pickFiscal(existing), depois: data },
    });
    return this.get(id);
  }
}

/** Campos fiscais neutros → colunas fiscal_* de menu_items. */
export function fiscalDataToColumns(data: FiscalItemData): Record<string, any> {
  return {
    fiscalNcm: data.ncm ?? null,
    fiscalCest: data.cest ?? null,
    fiscalCfop: data.cfop ?? null,
    fiscalUnidadeComercial: data.unidadeComercial ?? 'UN', // coluna obrigatória; "UN" é só o padrão de unidade, não tributação
    fiscalIcmsOrigem: data.icmsOrigem ?? null,
    fiscalIcmsSituacao: data.icmsSituacao ?? null,
    fiscalPisSituacao: data.pisSituacao ?? null,
    fiscalCofinsSituacao: data.cofinsSituacao ?? null,
    fiscalCodigoBeneficio: data.codigoBeneficio ?? null,
    fiscalIbsCbsSituacao: data.ibsCbsSituacao ?? null,
    fiscalIbsCbsClassificacao: data.ibsCbsClassificacao ?? null,
    fiscalExtra: data.extra ?? null,
  };
}

function pickFiscal(mi: any) {
  return menuItemToFiscalData(mi);
}
