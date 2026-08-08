import { Module }             from '@nestjs/common';
import { PrintingService }    from './application/use-cases/printing.service';
import { PrintingController } from '@/runtimes/api/controllers/printing.controller';
import { PrintTemplatesModule }     from '@/modules/print-templates/print-templates.module';
import { PRINTER_REPOSITORY_PORT }  from './domain/repositories/printer-repository.port';
import { PrismaPrinterRepository }  from './infrastructure/repositories/prisma-printer.repository';
import { ESC_POS_CLIENT_PORT }      from './application/contracts/esc-pos-client.port';
import { TcpEscPosClient }          from './infrastructure/api-clients/tcp-esc-pos.client';

@Module({
  imports:     [PrintTemplatesModule],
  controllers: [PrintingController],
  providers: [
    PrintingService,
    { provide: PRINTER_REPOSITORY_PORT, useClass: PrismaPrinterRepository },
    { provide: ESC_POS_CLIENT_PORT,     useClass: TcpEscPosClient },
  ],
  exports: [PrintingService],
})
export class PrintingModule {}
