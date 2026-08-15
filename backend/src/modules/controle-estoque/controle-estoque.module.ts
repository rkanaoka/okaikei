import { Module } from '@nestjs/common';
import { LABEL_PRINTER_PORT }              from './domain/repositories/label-printer.port';
import { ETIQUETA_LAYOUT_REPOSITORY_PORT } from './domain/repositories/etiqueta-layout-repository.port';
import { GerarEtiquetasValidadeService }   from './application/use-cases/gerar-etiquetas-validade.service';
import { ZplLabelPrinterAdapter }          from './infrastructure/printers/zpl-label-printer.adapter';
import { PrismaEtiquetaLayoutRepository }  from './infrastructure/repositories/prisma-etiqueta-layout.repository';
import { EtiquetasController }             from '@/runtimes/api/controllers/etiquetas.controller';

@Module({
  controllers: [EtiquetasController],
  providers: [
    GerarEtiquetasValidadeService,
    { provide: LABEL_PRINTER_PORT, useClass: ZplLabelPrinterAdapter },
    { provide: ETIQUETA_LAYOUT_REPOSITORY_PORT, useClass: PrismaEtiquetaLayoutRepository },
  ],
  exports: [GerarEtiquetasValidadeService],
})
export class ControleEstoqueModule {}
