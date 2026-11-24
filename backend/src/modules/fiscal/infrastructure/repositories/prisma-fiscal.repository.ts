import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { FiscalRepositoryPort } from '@/modules/fiscal/domain/repositories/fiscal-repository.port';

// `as any` no acesso aos modelos novos (FiscalDocument etc.) — mesmo padrão do módulo de estoque —
// para não depender de `prisma generate` ter rodado antes da compilação.
@Injectable()
export class PrismaFiscalRepository implements FiscalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): any { return this.prisma as any; }

  // ── Configuração ─────────────────────────────────────────────────────────
  async getConfig(key: string) {
    const row = await this.db.systemConfig.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async saveConfig(key: string, value: any) {
    await this.db.systemConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // ── PDV (leitura) ────────────────────────────────────────────────────────
  findComanda(comandaId: string) {
    return this.db.comanda.findUnique({
      where: { id: comandaId },
      include: { table: true, items: { include: { menuItem: true }, orderBy: { createdAt: 'asc' } }, payments: true },
    });
  }

  listPaymentMethods() {
    return this.db.paymentMethodConfig.findMany({
      select: { code: true, label: true, active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async findClosedComandaIdsWithoutDocument(since: Date, limit: number) {
    const closed: Array<{ id: string }> = await this.db.comanda.findMany({
      where: { status: 'CLOSED', closedAt: { gte: since } },
      select: { id: true },
      orderBy: { closedAt: 'asc' },
      take: limit * 3,
    });
    if (!closed.length) return [];
    const withDoc: Array<{ comandaId: string }> = await this.db.fiscalDocument.findMany({
      where: { comandaId: { in: closed.map((c) => c.id) } },
      select: { comandaId: true },
    });
    const has = new Set(withDoc.map((d) => d.comandaId));
    return closed.map((c) => c.id).filter((id) => !has.has(id)).slice(0, limit);
  }

  // ── Itens ────────────────────────────────────────────────────────────────
  private static readonly ITEM_SELECT = {
    id: true, name: true, price: true, category: true, available: true,
    menuCategory: { select: { id: true, name: true } },
    fiscalNcm: true, fiscalCest: true, fiscalCfop: true, fiscalUnidadeComercial: true,
    fiscalIcmsOrigem: true, fiscalIcmsSituacao: true, fiscalPisSituacao: true, fiscalCofinsSituacao: true,
    fiscalCodigoBeneficio: true, fiscalIbsCbsSituacao: true, fiscalIbsCbsClassificacao: true, fiscalExtra: true,
    fiscalTemplateId: true, fiscalTemplateCfop: true,
    fiscalTemplate: { select: { id: true, name: true, active: true } },
  };

  listMenuItemsFiscal() {
    return this.db.menuItem.findMany({
      select: PrismaFiscalRepository.ITEM_SELECT,
      orderBy: [{ menuCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findMenuItemFiscal(id: string) {
    return this.db.menuItem.findUnique({ where: { id }, select: PrismaFiscalRepository.ITEM_SELECT });
  }

  updateMenuItemFiscal(id: string, data: Record<string, any>) {
    // Coluna Json: `null` precisa ser Prisma.DbNull para limpar o valor.
    const patch = { ...data, ...(data.fiscalExtra === null ? { fiscalExtra: Prisma.DbNull } : {}) };
    return this.db.menuItem.update({ where: { id }, data: patch, select: PrismaFiscalRepository.ITEM_SELECT });
  }

  // ── Modelos fiscais ──────────────────────────────────────────────────────
  listTemplates() { return this.db.fiscalTemplate.findMany({ orderBy: { name: 'asc' } }); }
  findTemplate(id: string) { return this.db.fiscalTemplate.findUnique({ where: { id } }); }
  createTemplate(data: any) { return this.db.fiscalTemplate.create({ data }); }
  updateTemplate(id: string, data: any) { return this.db.fiscalTemplate.update({ where: { id }, data }); }
  async deleteTemplate(id: string) { await this.db.fiscalTemplate.delete({ where: { id } }); }

  findItemsByTemplate(templateId: string) {
    return this.db.menuItem.findMany({ where: { fiscalTemplateId: templateId }, select: PrismaFiscalRepository.ITEM_SELECT });
  }

  async countItemsByTemplate() {
    const rows: Array<{ fiscalTemplateId: string; _count: { _all: number } }> = await this.db.menuItem.groupBy({
      by: ['fiscalTemplateId'], where: { fiscalTemplateId: { not: null } }, _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.fiscalTemplateId, r._count._all]));
  }

  // ── Documentos ───────────────────────────────────────────────────────────
  createDocument(data: Record<string, any>) { return this.db.fiscalDocument.create({ data }); }
  updateDocument(id: string, data: Record<string, any>) { return this.db.fiscalDocument.update({ where: { id }, data }); }
  findDocumentById(id: string) { return this.db.fiscalDocument.findUnique({ where: { id } }); }
  findDocumentByRef(ref: string) { return this.db.fiscalDocument.findUnique({ where: { ref } }); }

  findDocumentsByComanda(comandaId: string) {
    return this.db.fiscalDocument.findMany({ where: { comandaId }, orderBy: { attempt: 'desc' } });
  }

  findUnsettledDocuments(before: Date, limit: number) {
    return this.db.fiscalDocument.findMany({
      where: { status: { in: ['PENDENTE', 'PROCESSANDO', 'ERRO_COMUNICACAO'] }, updatedAt: { lt: before } },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  listDocuments(filter: { status?: string; comandaId?: string; from?: Date; to?: Date; numero?: string; destinatario?: string; limit?: number }) {
    return this.db.fiscalDocument.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.comandaId ? { comandaId: filter.comandaId } : {}),
        // Número como texto na Focus: aceita "123" e "000123"
        ...(filter.numero ? { numero: { in: [filter.numero, filter.numero.replace(/^0+(?=\d)/, '')] } } : {}),
        // Destinatário fica no payload enviado à Focus (cpf_destinatario / cnpj_destinatario)
        ...(filter.destinatario
          ? { OR: [
              { requestPayload: { path: ['cpf_destinatario'], equals: filter.destinatario } },
              { requestPayload: { path: ['cnpj_destinatario'], equals: filter.destinatario } },
            ] }
          : {}),
        ...(filter.from || filter.to
          ? { createdAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filter.limit ?? 100, 500),
    });
  }

  async findComandaSummaries(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.db.comanda.findMany({
      where:  { id: { in: ids } },
      select: { id: true, number: true, customerName: true, openedAt: true, closedAt: true, table: { select: { label: true } } },
    });
    return rows.map((r: any) => ({
      id: r.id, number: r.number, tableLabel: r.table?.label ?? null,
      customerName: r.customerName ?? null, openedAt: r.openedAt, closedAt: r.closedAt,
    }));
  }

  // ── Auditoria ────────────────────────────────────────────────────────────
  async addAudit(data: {
    documentId?: string | null; comandaId?: string | null; action: string; actor: string;
    success: boolean; httpStatus?: number | null; detail?: any;
  }) {
    await this.db.fiscalAuditLog.create({
      data: {
        documentId: data.documentId ?? null, comandaId: data.comandaId ?? null,
        action: data.action, actor: data.actor, success: data.success,
        httpStatus: data.httpStatus ?? null, detail: data.detail ?? undefined,
      },
    });
  }

  listAudit(filter: { documentId?: string; comandaId?: string; limit?: number }) {
    return this.db.fiscalAuditLog.findMany({
      where: {
        ...(filter.documentId ? { documentId: filter.documentId } : {}),
        ...(filter.comandaId ? { comandaId: filter.comandaId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filter.limit ?? 100, 500),
    });
  }
}
