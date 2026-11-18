import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FISCAL_REPOSITORY_PORT, FiscalRepositoryPort } from '@/modules/fiscal/domain/repositories/fiscal-repository.port';
import { FiscalSettingsService } from '@/modules/fiscal/application/use-cases/fiscal-settings.service';
import { FiscalAuditService } from '@/modules/fiscal/application/use-cases/fiscal-audit.service';
import { fiscalDataToColumns } from '@/modules/fiscal/application/use-cases/fiscal-items.service';
import {
  FiscalTemplateData, normalizeTemplate, resolveTemplate, validateTemplate,
} from '@/modules/fiscal/domain/value-objects/fiscal-template';
import { findIssues, normalizeAndValidate } from '@/modules/fiscal/domain/value-objects/fiscal-item-fields';

export interface TemplateInput { name: string; description?: string | null; active?: boolean; data: any }

/**
 * Modelos fiscais por grupo de produtos (alcoólicos, bebidas industrializadas, comida, jogos...).
 * Um item vinculado a um modelo tem os campos fiscal_* materializados a partir dele; ao editar o modelo,
 * todos os itens vinculados são atualizados. Aplicar/editar exige a permissão 'fiscal' (garantido no controller).
 */
@Injectable()
export class FiscalTemplatesService {
  constructor(
    @Inject(FISCAL_REPOSITORY_PORT) private readonly repo: FiscalRepositoryPort,
    private readonly settings: FiscalSettingsService,
    private readonly audit: FiscalAuditService,
  ) {}

  /** Pendências bloqueantes de cada CFOP do modelo (o que ainda falta para emitir com ele). */
  private async completeness(data: FiscalTemplateData) {
    const s = await this.settings.getSettings();
    return data.cfops.map((c) => {
      const issues = findIssues(resolveTemplate(data, c.cfop), { regime: s.regime, exigirIbsCbs: s.exigirIbsCbs });
      return { cfop: c.cfop, issues, complete: !issues.some((i) => i.severity === 'error') };
    });
  }

  private async view(row: any, count?: number) {
    const data: FiscalTemplateData = { ...normalizeTemplate(row.data), extra: row.data?.extra ?? null };
    const byCfop = await this.completeness(data);
    return {
      id: row.id, name: row.name, description: row.description, active: row.active, data,
      itemCount: count ?? 0, byCfop, complete: byCfop.length > 0 && byCfop.every((c) => c.complete),
      updatedAt: row.updatedAt,
    };
  }

  async list() {
    const [rows, counts] = await Promise.all([this.repo.listTemplates(), this.repo.countItemsByTemplate()]);
    return Promise.all(rows.map((r) => this.view(r, counts[r.id] ?? 0)));
  }

  async get(id: string) {
    const row = await this.repo.findTemplate(id);
    if (!row) throw new NotFoundException('Modelo fiscal não encontrado');
    const counts = await this.repo.countItemsByTemplate();
    return this.view(row, counts[id] ?? 0);
  }

  private prepare(input: TemplateInput) {
    const name = (input?.name ?? '').trim();
    if (!name) throw new BadRequestException('Informe o nome do modelo');
    if (name.length > 120) throw new BadRequestException('Nome com no máximo 120 caracteres');
    const data = normalizeTemplate(input.data);
    const errors = validateTemplate(data);
    if (errors.length) throw new BadRequestException({ message: 'Dados fiscais do modelo inválidos', errors });
    return { name, description: (input.description ?? '').trim().slice(0, 300) || null, data };
  }

  async create(input: TemplateInput, actor: string) {
    const { name, description, data } = this.prepare(input);
    const row = await this.repo.createTemplate({ name, description, active: input.active !== false, data });
    await this.audit.log({ action: 'TEMPLATE', actor, success: true, detail: { operacao: 'criado', templateId: row.id, nome: name } });
    return this.view(row, 0);
  }

  async update(id: string, input: TemplateInput, actor: string) {
    const existing = await this.repo.findTemplate(id);
    if (!existing) throw new NotFoundException('Modelo fiscal não encontrado');
    const { name, description, data } = this.prepare(input);
    const row = await this.repo.updateTemplate(id, { name, description, active: input.active ?? existing.active, data });
    const propagados = await this.rematerialize(row, actor);
    await this.audit.log({
      action: 'TEMPLATE', actor, success: true,
      detail: { operacao: 'atualizado', templateId: id, nome: name, itensAtualizados: propagados, antes: existing.data, depois: data },
    });
    return this.view(row, propagados);
  }

  async setActive(id: string, active: boolean, actor: string) {
    const existing = await this.repo.findTemplate(id);
    if (!existing) throw new NotFoundException('Modelo fiscal não encontrado');
    const row = await this.repo.updateTemplate(id, { active });
    await this.audit.log({ action: 'TEMPLATE', actor, success: true, detail: { operacao: active ? 'ativado' : 'desativado', templateId: id } });
    return this.view(row, (await this.repo.countItemsByTemplate())[id] ?? 0);
  }

  async remove(id: string, actor: string) {
    const existing = await this.repo.findTemplate(id);
    if (!existing) throw new NotFoundException('Modelo fiscal não encontrado');
    const n = (await this.repo.countItemsByTemplate())[id] ?? 0;
    if (n > 0) throw new ConflictException(`${n} produto(s) usam este modelo. Troque o modelo deles ou desative este modelo em vez de excluir.`);
    await this.repo.deleteTemplate(id);
    await this.audit.log({ action: 'TEMPLATE', actor, success: true, detail: { operacao: 'excluido', templateId: id, nome: existing.name } });
    return { deleted: true };
  }

  // ── Aplicação aos produtos ───────────────────────────────────────────────

  /** Vincula `itemIds` ao modelo (ou desvincula com templateId = null, mantendo os valores atuais). */
  async applyToItems(input: { templateId: string | null; itemIds: string[]; cfop?: string | null }, actor: string) {
    const ids = [...new Set(input.itemIds ?? [])];
    if (!ids.length) throw new BadRequestException('Selecione ao menos um produto');

    if (!input.templateId) {
      for (const id of ids) await this.repo.updateMenuItemFiscal(id, { fiscalTemplateId: null, fiscalTemplateCfop: null });
      await this.audit.log({ action: 'TEMPLATE', actor, success: true, detail: { operacao: 'desvinculado', itens: ids.length } });
      return { applied: ids.length };
    }

    const tpl = await this.repo.findTemplate(input.templateId);
    if (!tpl) throw new NotFoundException('Modelo fiscal não encontrado');
    if (!tpl.active) throw new BadRequestException('Modelo desativado');
    const data = normalizeTemplate(tpl.data);
    data.extra = tpl.data?.extra ?? null;
    if (input.cfop && !data.cfops.some((c) => c.cfop === input.cfop)) throw new BadRequestException(`CFOP ${input.cfop} não existe neste modelo`);

    for (const id of ids) {
      if (!(await this.repo.findMenuItemFiscal(id))) throw new NotFoundException(`Produto ${id} não encontrado`);
    }
    for (const id of ids) await this.writeItem(id, tpl.id, data, input.cfop ?? null);
    await this.audit.log({
      action: 'TEMPLATE', actor, success: true,
      detail: { operacao: 'aplicado', templateId: tpl.id, nome: tpl.name, cfop: input.cfop ?? data.cfops[0]?.cfop ?? null, itens: ids },
    });
    return { applied: ids.length };
  }

  /** Reaplica o modelo editado a todos os itens vinculados (mantendo o CFOP de cada item quando ainda existir). */
  private async rematerialize(tpl: any, actor: string): Promise<number> {
    const items = await this.repo.findItemsByTemplate(tpl.id);
    const data = normalizeTemplate(tpl.data);
    data.extra = tpl.data?.extra ?? null;
    for (const it of items) {
      const keep = data.cfops.some((c) => c.cfop === it.fiscalTemplateCfop) ? it.fiscalTemplateCfop : null;
      if (!keep && it.fiscalTemplateCfop) {
        await this.audit.log({
          action: 'TEMPLATE', actor, success: true,
          detail: { operacao: 'cfop_substituido', menuItemId: it.id, nome: it.name, de: it.fiscalTemplateCfop, para: data.cfops[0]?.cfop ?? null },
        });
      }
      await this.writeItem(it.id, tpl.id, data, keep);
    }
    return items.length;
  }

  private async writeItem(itemId: string, templateId: string, data: FiscalTemplateData, cfop: string | null) {
    const resolved = resolveTemplate(data, cfop);
    const { data: clean, errors } = normalizeAndValidate(resolved);
    if (errors.length) throw new BadRequestException({ message: 'O modelo gera dados fiscais inválidos', errors });
    await this.repo.updateMenuItemFiscal(itemId, {
      ...fiscalDataToColumns(clean), fiscalTemplateId: templateId, fiscalTemplateCfop: resolved.cfopResolvido,
    });
  }
}
