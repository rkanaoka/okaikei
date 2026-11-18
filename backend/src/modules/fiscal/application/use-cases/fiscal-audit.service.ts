import { Inject, Injectable, Logger } from '@nestjs/common';
import { FISCAL_REPOSITORY_PORT, FiscalRepositoryPort } from '@/modules/fiscal/domain/repositories/fiscal-repository.port';

/** Histórico/auditoria fiscal. Nunca lança: falha de auditoria não pode derrubar uma emissão. */
@Injectable()
export class FiscalAuditService {
  private readonly logger = new Logger(FiscalAuditService.name);

  constructor(@Inject(FISCAL_REPOSITORY_PORT) private readonly repo: FiscalRepositoryPort) {}

  async log(entry: {
    documentId?: string | null; comandaId?: string | null; action: string; actor: string;
    success: boolean; httpStatus?: number | null; detail?: any;
  }) {
    try {
      await this.repo.addAudit(entry);
    } catch (err: any) {
      this.logger.warn(`Falha ao gravar auditoria fiscal (${entry.action}): ${err.message}`);
    }
  }

  list(filter: { documentId?: string; comandaId?: string; limit?: number }) {
    return this.repo.listAudit(filter);
  }
}
