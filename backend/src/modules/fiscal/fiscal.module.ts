import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PontoDeVendaModule } from '@/modules/ponto-de-venda/ponto-de-venda.module';

import { FISCAL_REPOSITORY_PORT } from './domain/repositories/fiscal-repository.port';
import { FOCUS_NFE_PORT }         from './application/contracts/focus-nfe.port';

import { FiscalSettingsService } from './application/use-cases/fiscal-settings.service';
import { FiscalAuditService }    from './application/use-cases/fiscal-audit.service';
import { FiscalItemsService }    from './application/use-cases/fiscal-items.service';
import { FiscalTemplatesService } from './application/use-cases/fiscal-templates.service';
import { FiscalPrintService }    from './application/use-cases/fiscal-print.service';
import { NfceService }           from './application/use-cases/nfce.service';
import { NfceMapper }            from './application/mappers/nfce.mapper';

import { PrismaFiscalRepository } from './infrastructure/repositories/prisma-fiscal.repository';
import { FocusNfeClient }         from './infrastructure/api-clients/focus-nfe.client';
import { ComandaClosedListener }  from './infrastructure/listeners/comanda-closed.listener';
import { FiscalJobs }             from './infrastructure/jobs/fiscal.jobs';

import { FiscalController } from '@/runtimes/api/controllers/fiscal.controller';

/**
 * Módulo fiscal (NFC-e / Focus NFe). Independente: depende do PDV apenas para imprimir (PrintingService)
 * e do evento `comanda.closed` — o PDV não conhece o fiscal. Remover este módulo do AppModule não afeta
 * pedidos, comandas nem pagamentos.
 */
@Module({
  imports: [AuthModule, PontoDeVendaModule],
  controllers: [FiscalController],
  providers: [
    FiscalSettingsService, FiscalAuditService, FiscalItemsService, FiscalTemplatesService, FiscalPrintService, NfceService, NfceMapper,
    ComandaClosedListener, FiscalJobs,
    { provide: FISCAL_REPOSITORY_PORT, useClass: PrismaFiscalRepository },
    FocusNfeClient,
    { provide: FOCUS_NFE_PORT, useExisting: FocusNfeClient },
  ],
  exports: [FiscalSettingsService, NfceService],
})
export class FiscalModule {}
