import { Module } from '@nestjs/common';
import { LABEL_PRINTER_PORT }              from './domain/repositories/label-printer.port';
import { GerarEtiquetasValidadeService }   from './application/use-cases/gerar-etiquetas-validade.service';
import { ZplLabelPrinterAdapter }          from './infrastructure/printers/zpl-label-printer.adapter';
import { EtiquetasController }             from '@/runtimes/api/controllers/etiquetas.controller';

@Module({
  controllers: [EtiquetasController],
  providers: [
    GerarEtiquetasValidadeService,
    { provide: LABEL_PRINTER_PORT, useClass: ZplLabelPrinterAdapter },
  ],
  exports: [GerarEtiquetasValidadeService],
})
export class ControleEstoqueModule {}
