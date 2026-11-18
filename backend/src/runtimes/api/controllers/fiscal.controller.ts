import { applyDecorators, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '@/modules/auth/infrastructure/guards/permissions.guard';
import { FiscalSettingsService } from '@/modules/fiscal/application/use-cases/fiscal-settings.service';
import { FiscalItemsService } from '@/modules/fiscal/application/use-cases/fiscal-items.service';
import { FiscalAuditService } from '@/modules/fiscal/application/use-cases/fiscal-audit.service';
import { FiscalTemplatesService } from '@/modules/fiscal/application/use-cases/fiscal-templates.service';
import { NfceService } from '@/modules/fiscal/application/use-cases/nfce.service';

// Quem fez a ação, para a auditoria. As rotas do Caixa (LAN, sem login — como o restante do Caixa) aparecem como 'caixa'.
const actorOf = (req: any) => (req?.user?.sub ? `user:${req.user.sub}` : 'caixa');

/** Configuração/cadastro/cancelamento: exige login com a permissão 'fiscal' (ADMIN sempre passa). */
const FiscalAdmin = () => applyDecorators(UseGuards(JwtAuthGuard, PermissionsGuard), RequirePermission('fiscal'));

/**
 * API fiscal (/api/fiscal).
 *  - Configuração, classificação de itens, cancelamento, inutilização, listagem e auditoria → @FiscalAdmin (permissão 'fiscal').
 *  - Emitir/consultar/imprimir/reenviar por e-mail a nota de uma comanda → rotas do Caixa, sem login (mesmo modelo do
 *    restante do Caixa na LAN). São idempotentes e só valem para comanda já fechada.
 * Toda a regra (inclusive `fiscal_enabled`) está nos services do módulo.
 */
@Controller('fiscal')
export class FiscalController {
  constructor(
    private readonly settings: FiscalSettingsService,
    private readonly items: FiscalItemsService,
    private readonly templates: FiscalTemplatesService,
    private readonly audit: FiscalAuditService,
    private readonly nfce: NfceService,
  ) {}

  // ── Estado (o frontend decide se mostra os botões fiscais) ──
  @Get('status')
  async status() {
    return { enabled: await this.settings.isEnabled() };
  }

  // ── Configuração ─────────────────────────────────────────────────────────
  @Get('settings')
  @FiscalAdmin()
  overview() {
    return this.settings.overview();
  }

  @Put('settings')
  @FiscalAdmin()
  async updateSettings(@Body() body: any, @Req() req: any) {
    await this.settings.updateSettings(body?.settings ?? body, actorOf(req));
    return this.settings.overview();
  }

  @Put('enabled')
  @FiscalAdmin()
  setEnabled(@Body() body: { enabled: boolean }, @Req() req: any) {
    return this.settings.setEnabled(body?.enabled === true, actorOf(req));
  }

  // ── Classificação fiscal dos itens do cardápio ───────────────────────────
  @Get('items')
  @FiscalAdmin()
  listItems(@Query('pending') pending?: string) {
    return this.items.list({ onlyPending: pending === 'true' });
  }

  @Get('items/:id')
  @FiscalAdmin()
  getItem(@Param('id') id: string) {
    return this.items.get(id);
  }

  @Put('items/:id')
  @FiscalAdmin()
  updateItem(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.items.update(id, body, actorOf(req));
  }

  // ── Modelos fiscais (grupos de produtos) ─────────────────────────────────
  @Get('templates')
  @FiscalAdmin()
  listTemplates() {
    return this.templates.list();
  }

  @Get('templates/:id')
  @FiscalAdmin()
  getTemplate(@Param('id') id: string) {
    return this.templates.get(id);
  }

  @Post('templates')
  @FiscalAdmin()
  createTemplate(@Body() body: any, @Req() req: any) {
    return this.templates.create(body, actorOf(req));
  }

  @Put('templates/:id')
  @FiscalAdmin()
  updateTemplate(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.templates.update(id, body, actorOf(req));
  }

  @Put('templates/:id/active')
  @FiscalAdmin()
  setTemplateActive(@Param('id') id: string, @Body() body: { active: boolean }, @Req() req: any) {
    return this.templates.setActive(id, body?.active === true, actorOf(req));
  }

  @Delete('templates/:id')
  @FiscalAdmin()
  deleteTemplate(@Param('id') id: string, @Req() req: any) {
    return this.templates.remove(id, actorOf(req));
  }

  /** Aplica (ou, com templateId null, desvincula) um modelo a um ou vários produtos. */
  @Post('items/apply-template')
  @FiscalAdmin()
  applyTemplate(@Body() body: { templateId: string | null; itemIds: string[]; cfop?: string | null }, @Req() req: any) {
    return this.templates.applyToItems(body, actorOf(req));
  }

  // ── Documentos (NFC-e) ───────────────────────────────────────────────────
  @Get('documents')
  @FiscalAdmin()
  list(@Query() q: { status?: string; comandaId?: string; from?: string; to?: string; limit?: string }) {
    return this.nfce.list({ ...q, limit: q.limit ? Number(q.limit) : undefined });
  }

  @Get('documents/:id')
  @FiscalAdmin()
  get(@Param('id') id: string) {
    return this.nfce.get(id);
  }

  @Get('audit')
  @FiscalAdmin()
  auditLog(@Query() q: { documentId?: string; comandaId?: string; limit?: string }) {
    return this.audit.list({ ...q, limit: q.limit ? Number(q.limit) : undefined });
  }

  @Post('documents/:id/cancel')
  @FiscalAdmin()
  cancel(@Param('id') id: string, @Body() body: { justificativa: string }, @Req() req: any) {
    return this.nfce.cancel(id, body?.justificativa, actorOf(req));
  }

  @Post('inutilizacao')
  @FiscalAdmin()
  inutilizar(
    @Body() body: { serie: string; numeroInicial: number; numeroFinal: number; justificativa: string },
    @Req() req: any,
  ) {
    return this.nfce.inutilizar(body, actorOf(req));
  }

  // ── Por comanda (Caixa) ──────────────────────────────────────────────────
  @Get('comandas/:comandaId')
  byComanda(@Param('comandaId') comandaId: string) {
    return this.nfce.byComanda(comandaId);
  }

  @Get('comandas/:comandaId/preview')
  preview(@Param('comandaId') comandaId: string) {
    return this.nfce.preview(comandaId);
  }

  @Post('comandas/:comandaId/emit')
  emit(@Param('comandaId') comandaId: string, @Req() req: any) {
    return this.nfce.emit(comandaId, { trigger: 'manual', actor: actorOf(req) });
  }

  @Post('documents/:id/consult')
  consult(@Param('id') id: string, @Req() req: any) {
    return this.nfce.consult(id, actorOf(req));
  }

  @Post('documents/:id/print')
  print(@Param('id') id: string, @Req() req: any) {
    return this.nfce.printDocument(id, actorOf(req));
  }

  @Post('documents/:id/email')
  email(@Param('id') id: string, @Body() body: { emails: string[] }, @Req() req: any) {
    return this.nfce.sendEmail(id, body?.emails, actorOf(req));
  }
}
