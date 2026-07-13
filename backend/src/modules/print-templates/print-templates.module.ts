import { Module } from '@nestjs/common';
import { PrintTemplatesController } from './print-templates.controller';
import { PrintTemplatesService } from './print-templates.service';
import { PrintingModule } from '@/modules/printing/printing.module';

@Module({
  imports:     [PrintingModule],
  controllers: [PrintTemplatesController],
  providers:   [PrintTemplatesService],
  exports:     [PrintTemplatesService],
})
export class PrintTemplatesModule {}
