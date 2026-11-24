import {
  BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger,
  NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { FISCAL_REPOSITORY_PORT, FiscalRepositoryPort, FiscalDocumentRecord } from '@/modules/fiscal/domain/repositories/fiscal-repository.port';
import { FOCUS_NFE_PORT, FocusNfePort, FocusResponse } from '@/modules/fiscal/application/contracts/focus-nfe.port';
import { FiscalDocumentStatus } from '@/modules/fiscal/domain/entities/fiscal-settings';
import { FiscalSettingsService } from '@/modules/fiscal/application/use-cases/fiscal-settings.service';
import { FiscalAuditService } from '@/modules/fiscal/application/use-cases/fiscal-audit.service';
import { FiscalPrintService } from '@/modules/fiscal/application/use-cases/fiscal-print.service';
import { NfceMapper } from '@/modules/fiscal/application/mappers/nfce.mapper';

export interface EmitOptions { trigger: 'auto' | 'manual'; actor: string }

const FINAL_STATUSES: FiscalDocumentStatus[] = ['AUTORIZADO', 'CANCELADO'];

/** Regras de negócio e ciclo de vida da NFC-e. Orquestra mapper, cliente Focus, auditoria e impressão. */
@Injectable()
export class NfceService {
  private readonly logger = new Logger(NfceService.name);
  /** Impede duas emissões simultâneas da mesma comanda neste processo (clique duplo + evento NATS). */
  private readonly locks = new Set<string>();

  constructor(
    @Inject(FISCAL_REPOSITORY_PORT) private readonly repo: FiscalRepositoryPort,
    @Inject(FOCUS_NFE_PORT) private readonly focus: FocusNfePort,
    private readonly settings: FiscalSettingsService,
    private readonly mapper: NfceMapper,
    private readonly audit: FiscalAuditService,
    private readonly print: FiscalPrintService,
  ) {}

  private async assertEnabled() {
    if (!(await this.settings.isEnabled())) throw new ForbiddenException('Módulo fiscal desativado');
  }

  /** `ref` da Focus: só letras/dígitos, única por token. Inclui ambiente e tentativa (ref de nota autorizada não é reutilizável). */
  private refFor(comandaId: string, ambiente: string, attempt: number) {
    return `${comandaId.replace(/-/g, '')}${ambiente === 'producao' ? 'p' : 'h'}${attempt}`;
  }

  // ── Emissão ──────────────────────────────────────────────────────────────

  /** Disparado pelo evento de fechamento da comanda. Nunca lança (não pode afetar o PDV). */
  async emitAutomatic(comandaId: string) {
    try {
      if (!(await this.settings.isEnabled())) return;
      if (!(await this.settings.getSettings()).autoEmit) return;
      await this.emit(comandaId, { trigger: 'auto', actor: 'system' });
    } catch (err: any) {
      this.logger.warn(`Emissão automática da comanda ${comandaId} não concluída: ${err.message}`);
    }
  }

  /** Pré-visualização/alerta: o que impediria emitir esta comanda agora (sem chamar a Focus). */
  async preview(comandaId: string) {
    await this.assertEnabled();
    const comanda = await this.repo.findComanda(comandaId);
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    const settings = await this.settings.getSettings();
    const built = this.mapper.build(comanda, settings);
    const issues = [...built.issues, ...this.settings.readinessIssues(settings).map((m) => ({ field: 'config', message: m, severity: 'error' as const }))];
    return { canEmit: !issues.some((i) => i.severity === 'error'), issues, total: built.total };
  }

  async emit(comandaId: string, opts: EmitOptions) {
    await this.assertEnabled();
    if (this.locks.has(comandaId)) throw new ConflictException('Já existe uma emissão em andamento para esta comanda');
    this.locks.add(comandaId);
    try {
      return await this.doEmit(comandaId, opts);
    } finally {
      this.locks.delete(comandaId);
    }
  }

  private async doEmit(comandaId: string, opts: EmitOptions) {
    const settings = await this.settings.getSettings();
    const comanda = await this.repo.findComanda(comandaId);
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status !== 'CLOSED') throw new BadRequestException('A NFC-e só pode ser emitida para comanda fechada');

    const docs = await this.repo.findDocumentsByComanda(comandaId);
    const sameEnv = docs.filter((d) => d.ambiente === settings.ambiente);
    const latest = sameEnv[0] ?? null;
    let doc: FiscalDocumentRecord | null = null;

    if (latest) {
      if (latest.status === 'AUTORIZADO') return { document: latest, outcome: 'ja_autorizada' as const };
      if (latest.status === 'CANCELADO') {
        doc = null; // nova tentativa com novo ref
      } else if (['PROCESSANDO', 'ERRO_COMUNICACAO', 'PENDENTE'].includes(latest.status)) {
        // Resultado desconhecido: consultar antes de reenviar para nunca duplicar a nota.
        const synced = await this.syncFromFocus(latest, opts.actor);
        if (synced.document.status === 'AUTORIZADO') return { document: synced.document, outcome: 'ja_autorizada' as const };
        if (synced.document.status === 'PROCESSANDO') return { document: synced.document, outcome: 'processando' as const };
        doc = synced.document; // REJEITADO, ou não encontrada na Focus → reenviar com o mesmo ref
      } else {
        doc = latest; // REJEITADO / PENDENCIA_FISCAL → corrige e reenvia com o mesmo ref (permitido após rejeição)
      }
    }

    const built = this.mapper.build(comanda, settings);
    const cfgIssues = this.settings.readinessIssues(settings);
    const blocking = [
      ...built.issues.filter((i) => i.severity === 'error'),
      ...cfgIssues.map((message) => ({ field: 'config', message, severity: 'error' as const })),
    ];

    const baseData = {
      ambiente: settings.ambiente, trigger: opts.trigger, total: built.total,
      requestPayload: built.payload,
    };

    if (!doc) {
      const attempt = (docs[0]?.attempt ?? 0) + 1;
      doc = await this.repo.createDocument({
        comandaId, attempt, ref: this.refFor(comandaId, settings.ambiente, attempt),
        status: 'PENDENTE', ...baseData,
      });
    } else {
      doc = await this.repo.updateDocument(doc.id, { ...baseData, errorMessage: null });
    }

    if (blocking.length) {
      const msg = blocking.map((i: any) => (i.itemName ? `${i.itemName}: ${i.message}` : i.message)).join('; ');
      doc = await this.repo.updateDocument(doc.id, { status: 'PENDENCIA_FISCAL', errorMessage: msg.slice(0, 4000) });
      await this.audit.log({
        documentId: doc.id, comandaId, action: 'EMIT', actor: opts.actor, success: false,
        detail: { motivo: 'pendencia_fiscal', issues: blocking },
      });
      if (opts.trigger === 'manual') {
        throw new UnprocessableEntityException({ message: 'Pendências fiscais impedem a emissão', issues: blocking, document: doc });
      }
      return { document: doc, outcome: 'pendencia_fiscal' as const, issues: blocking };
    }

    doc = await this.repo.updateDocument(doc.id, { status: 'PROCESSANDO' });
    const res = await this.focus.emitir(doc.ref, built.payload);
    const document = await this.applyResponse(doc, res, 'EMIT', opts.actor);

    // already_processed (422): a Focus já tem a nota autorizada com este ref → sincroniza.
    if (!res.ok && res.codigo === 'already_processed') {
      return { document: (await this.syncFromFocus(document, opts.actor)).document, outcome: 'sincronizada' as const };
    }
    return { document, outcome: document.status === 'AUTORIZADO' ? ('autorizada' as const) : ('nao_autorizada' as const) };
  }

  // ── Consulta / sincronização ─────────────────────────────────────────────

  async consult(documentId: string, actor: string) {
    await this.assertEnabled();
    const doc = await this.repo.findDocumentById(documentId);
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    return (await this.syncFromFocus(doc, actor)).document;
  }

  /** GET /nfce/{ref} e atualiza o documento local. `notFound` = a Focus nunca recebeu esta referência. */
  private async syncFromFocus(doc: FiscalDocumentRecord, actor: string): Promise<{ document: FiscalDocumentRecord; notFound: boolean }> {
    const res = await this.focus.consultar(doc.ref, doc.status === 'AUTORIZADO' || doc.status === 'PROCESSANDO' || doc.status === 'ERRO_COMUNICACAO');
    if (!res.ok && res.kind === 'not_found') {
      await this.audit.log({ documentId: doc.id, comandaId: doc.comandaId, action: 'CONSULT', actor, success: true, httpStatus: 404, detail: { resultado: 'nao_encontrada_na_focus' } });
      return { document: doc, notFound: true };
    }
    const document = await this.applyResponse(doc, res, 'CONSULT', actor);
    return { document, notFound: false };
  }

  // ── Cancelamento / inutilização / e-mail ─────────────────────────────────

  async cancel(documentId: string, justificativa: string, actor: string) {
    await this.assertEnabled();
    const doc = await this.repo.findDocumentById(documentId);
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    if (doc.status !== 'AUTORIZADO') throw new BadRequestException('Só é possível cancelar uma NFC-e autorizada');
    const j = (justificativa ?? '').trim();
    if (j.length < 15 || j.length > 255) throw new BadRequestException('A justificativa deve ter entre 15 e 255 caracteres');

    const res = await this.focus.cancelar(doc.ref, j);
    const d = res.data ?? {};
    const ok = res.ok && d.status === 'cancelado';
    await this.audit.log({
      documentId: doc.id, comandaId: doc.comandaId, action: 'CANCEL', actor, success: ok, httpStatus: res.httpStatus,
      detail: { justificativa: j, status: d.status, status_sefaz: d.status_sefaz, mensagem: d.mensagem_sefaz ?? res.mensagem, codigo: res.codigo },
    });
    if (!ok) {
      throw new BadRequestException(this.describeFailure(res, 'Não foi possível cancelar a NFC-e (o prazo é de 30 minutos após a emissão)'));
    }
    return this.repo.updateDocument(doc.id, {
      status: 'CANCELADO', focusStatus: 'cancelado', cancelledAt: new Date(),
      statusSefaz: d.status_sefaz ?? null, mensagemSefaz: d.mensagem_sefaz ?? null,
      responsePayload: { ...(doc.responsePayload ?? {}), cancelamento: d },
    });
  }

  async inutilizar(input: { serie: string; numeroInicial: number; numeroFinal: number; justificativa: string }, actor: string) {
    await this.assertEnabled();
    const s = await this.settings.getSettings();
    const j = (input.justificativa ?? '').trim();
    if (!/^\d{14}$/.test(s.cnpjEmitente)) throw new BadRequestException('CNPJ do emitente não configurado');
    if (!/^\d{1,3}$/.test(String(input.serie))) throw new BadRequestException('Série inválida');
    const ini = Number(input.numeroInicial); const fim = Number(input.numeroFinal);
    if (!Number.isInteger(ini) || !Number.isInteger(fim) || ini < 1 || fim < ini) throw new BadRequestException('Faixa de numeração inválida');
    if (j.length < 15 || j.length > 255) throw new BadRequestException('A justificativa deve ter entre 15 e 255 caracteres');

    const res = await this.focus.inutilizar({
      cnpj: s.cnpjEmitente, serie: String(input.serie), numero_inicial: String(ini), numero_final: String(fim), justificativa: j,
    });
    const ok = res.ok && res.data?.status === 'autorizado';
    await this.audit.log({
      action: 'INUTILIZE', actor, success: ok, httpStatus: res.httpStatus,
      detail: { serie: input.serie, ini, fim, status: res.data?.status, status_sefaz: res.data?.status_sefaz, mensagem: res.data?.mensagem_sefaz ?? res.mensagem },
    });
    if (!ok) throw new BadRequestException(this.describeFailure(res, 'Inutilização não autorizada'));
    return res.data;
  }

  async sendEmail(documentId: string, emails: string[], actor: string) {
    await this.assertEnabled();
    const doc = await this.repo.findDocumentById(documentId);
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    if (doc.status !== 'AUTORIZADO') throw new BadRequestException('Só é possível enviar e-mail de NFC-e autorizada');
    const list = [...new Set((emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
    if (!list.length || list.length > 10) throw new BadRequestException('Informe de 1 a 10 e-mails');
    if (list.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) throw new BadRequestException('E-mail inválido');

    const res = await this.focus.enviarEmail(doc.ref, list);
    await this.audit.log({ documentId: doc.id, comandaId: doc.comandaId, action: 'EMAIL', actor, success: res.ok, httpStatus: res.httpStatus, detail: { destinatarios: list.length } });
    if (!res.ok) throw new BadRequestException(this.describeFailure(res, 'Não foi possível enviar o e-mail'));
    return { mensagem: res.data?.mensagem ?? 'Os emails serão enviados em breve.' };
  }

  // ── Consultas locais ─────────────────────────────────────────────────────

  async list(filter: { status?: string; comandaId?: string; from?: string; to?: string; numero?: string; destinatario?: string; limit?: number }) {
    const numero = filter.numero?.replace(/\D/g, '') || undefined;
    const destinatario = filter.destinatario?.replace(/\D/g, '') || undefined;
    if (destinatario && destinatario.length !== 11 && destinatario.length !== 14) {
      throw new BadRequestException('Informe o CPF (11 dígitos) ou CNPJ (14 dígitos) completo');
    }
    const docs = await this.repo.listDocuments({
      status: filter.status, comandaId: filter.comandaId, limit: filter.limit, numero, destinatario,
      from: parseDayBoundary(filter.from, 'start'), to: parseDayBoundary(filter.to, 'end'),
    });

    const comandas = await this.repo.findComandaSummaries([...new Set(docs.map((d) => d.comandaId))]);
    const byId = new Map(comandas.map((c) => [c.id, c]));
    return docs.map((d: any) => {
      const payload = (d.requestPayload ?? {}) as Record<string, any>;
      // Payloads ficam fora da listagem (pesados); o detalhe continua trazendo tudo
      const { requestPayload: _req, responsePayload: _res, ...rest } = d;
      return {
        ...rest,
        destinatario: payload.cpf_destinatario ?? payload.cnpj_destinatario ?? null,
        comanda: byId.get(d.comandaId) ?? null,
      };
    });
  }

  async get(documentId: string) {
    const doc = await this.repo.findDocumentById(documentId);
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    const [xmlUrl, danfeUrl] = await Promise.all([this.focus.absoluteUrl(doc.caminhoXml), this.focus.absoluteUrl(doc.caminhoDanfe)]);
    return { ...doc, xmlUrl, danfeUrl, historico: await this.audit.list({ documentId }) };
  }

  async byComanda(comandaId: string) {
    return this.repo.findDocumentsByComanda(comandaId);
  }

  printDocument(documentId: string, actor: string) {
    return this.print.printDocument(documentId, actor);
  }

  // ── Rotinas de fundo ─────────────────────────────────────────────────────

  /** Reconcilia notas em estado incerto (timeout/processando) consultando a Focus. */
  async reconcile() {
    if (!(await this.settings.isEnabled())) return;
    const s = await this.settings.getSettings();
    const docs = await this.repo.findUnsettledDocuments(new Date(Date.now() - 60_000), 20);
    for (const doc of docs) {
      if (doc.ambiente !== s.ambiente) continue;
      if (Date.now() - new Date(doc.createdAt).getTime() > 24 * 3600_000) continue;
      if (doc.status === 'ERRO_COMUNICACAO' && Date.now() - new Date(doc.updatedAt).getTime() < 5 * 60_000) continue;
      if (this.locks.has(doc.comandaId)) continue;
      try {
        const synced = await this.syncFromFocus(doc, 'system');
        // Focus nunca recebeu a requisição (queda antes do envio) → reenvio seguro, mesma ref.
        if (synced.notFound && doc.trigger === 'auto' && s.autoEmit) await this.emit(doc.comandaId, { trigger: 'auto', actor: 'system' });
      } catch (err: any) {
        this.logger.warn(`Reconciliação de ${doc.ref} falhou: ${err.message}`);
      }
    }
  }

  /** Rede de segurança do evento NATS: emite comandas fechadas após a ativação do módulo que ficaram sem documento. */
  async catchUp() {
    if (!(await this.settings.isEnabled())) return;
    const s = await this.settings.getSettings();
    if (!s.autoEmit) return;
    const enabledSince = await this.settings.enabledSince();
    if (!enabledSince) return;
    const since = new Date(Math.max(enabledSince.getTime(), Date.now() - 6 * 3600_000));
    const ids = await this.repo.findClosedComandaIdsWithoutDocument(since, 10);
    for (const id of ids) await this.emitAutomatic(id);
  }

  // ── Interno ──────────────────────────────────────────────────────────────

  private describeFailure(res: FocusResponse, fallback: string): string {
    const d = res.data ?? {};
    const extra = (res.erros ?? d.erros ?? []).map((e: any) => e.mensagem).filter(Boolean).join('; ');
    const base = d.mensagem_sefaz ?? res.mensagem ?? fallback;
    return extra ? `${base} (${extra})` : base;
  }

  /** Traduz a resposta da Focus (emitir/consultar) no estado local e grava histórico. */
  private async applyResponse(doc: FiscalDocumentRecord, res: FocusResponse, action: 'EMIT' | 'CONSULT', actor: string): Promise<FiscalDocumentRecord> {
    const d = res.data ?? {};
    let status: FiscalDocumentStatus = doc.status as FiscalDocumentStatus;
    let errorMessage: string | null = null;

    if (res.ok || (d && typeof d.status === 'string')) {
      switch (d.status) {
        case 'autorizado': status = 'AUTORIZADO'; break;
        case 'cancelado': status = 'CANCELADO'; break;
        case 'erro_autorizacao':
        case 'denegado': status = 'REJEITADO'; break;
        case 'processando_autorizacao': status = 'PROCESSANDO'; break;
        default: if (res.ok) status = 'PROCESSANDO';
      }
      if (status === 'REJEITADO') errorMessage = this.describeFailure(res, 'NFC-e rejeitada');
    } else {
      switch (res.kind) {
        case 'timeout': case 'network': case 'server': case 'auth': case 'config':
          status = 'ERRO_COMUNICACAO'; errorMessage = this.describeFailure(res, 'Falha de comunicação com a Focus NFe'); break;
        case 'unprocessable':
          if (res.codigo === 'pending_operation') { status = 'PROCESSANDO'; break; }
          if (res.codigo === 'already_processed') { errorMessage = 'Nota já autorizada na Focus — sincronizando'; break; }
          status = 'REJEITADO'; errorMessage = this.describeFailure(res, 'Requisição não processada'); break;
        default:
          status = 'REJEITADO'; errorMessage = this.describeFailure(res, 'Requisição recusada pela Focus NFe');
      }
    }

    // Uma consulta que falha por comunicação não pode "rebaixar" uma nota já autorizada/cancelada.
    if (action === 'CONSULT' && !res.ok && !d.status && FINAL_STATUSES.includes(doc.status as FiscalDocumentStatus)) {
      status = doc.status as FiscalDocumentStatus;
      errorMessage = null;
    }

    const wasAuthorized = doc.status === 'AUTORIZADO';
    const patch: Record<string, any> = {
      status, errorMessage,
      focusStatus: d.status ?? doc.focusStatus,
      statusSefaz: d.status_sefaz ?? doc.statusSefaz,
      mensagemSefaz: d.mensagem_sefaz ?? (res.ok ? doc.mensagemSefaz : (res.mensagem ?? doc.mensagemSefaz)),
      chaveNfe: d.chave_nfe ?? doc.chaveNfe,
      numero: d.numero != null ? String(d.numero) : doc.numero,
      serie: d.serie != null ? String(d.serie) : doc.serie,
      qrcodeUrl: d.qrcode_url ?? doc.qrcodeUrl,
      urlConsultaNf: d.url_consulta_nf ?? doc.urlConsultaNf,
      caminhoXml: d.caminho_xml_nota_fiscal ?? doc.caminhoXml,
      caminhoDanfe: d.caminho_danfe ?? doc.caminhoDanfe,
      protocolo: d.protocolo_nota_fiscal?.numero_protocolo ?? (status === 'AUTORIZADO' ? d.numero_protocolo : undefined) ?? doc.protocolo,
    };
    if (res.data) patch.responsePayload = res.data;
    const updated = await this.repo.updateDocument(doc.id, patch);

    await this.audit.log({
      documentId: doc.id, comandaId: doc.comandaId, action, actor,
      success: status === 'AUTORIZADO' || status === 'PROCESSANDO' || status === 'CANCELADO',
      httpStatus: res.httpStatus,
      detail: { status, focusStatus: d.status, status_sefaz: d.status_sefaz, mensagem: d.mensagem_sefaz ?? res.mensagem, codigo: res.codigo, kind: res.kind, erros: res.erros ?? d.erros },
    });

    if (status === 'AUTORIZADO' && !wasAuthorized) void this.onAuthorized(updated, actor);
    return updated;
  }

  /** Completa o protocolo (consulta completa) e imprime o DANFE-NFC-e, sem bloquear nem falhar a emissão. */
  private async onAuthorized(doc: FiscalDocumentRecord, actor: string) {
    try {
      let current = doc;
      if (!current.protocolo) {
        const res = await this.focus.consultar(doc.ref, true);
        if (res.ok && res.data) {
          current = await this.repo.updateDocument(doc.id, {
            protocolo: res.data.protocolo_nota_fiscal?.numero_protocolo ?? res.data.numero_protocolo ?? null,
            responsePayload: res.data,
          });
        }
      }
      const s = await this.settings.getSettings();
      if (s.printAfterAuthorize) await this.print.printDocument(current.id, actor);
    } catch (err: any) {
      this.logger.warn(`Pós-autorização de ${doc.ref}: ${err.message}`);
    }
  }
}

/**
 * "2026-11-18" (campo de data do admin) → início/fim do dia no fuso de São Paulo.
 * Sem isso, new Date("2026-11-18") seria meia-noite UTC (21h do dia anterior em SP).
 */
function parseDayBoundary(value: string | undefined, edge: 'start' | 'end'): Date | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}-03:00`);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Data inválida');
  return d;
}
