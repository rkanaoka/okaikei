import { Module } from '@nestjs/common';
import { PrintTemplatesController }   from '@/runtimes/api/controllers/print-templates.controller';
import { PrintTemplatesService }      from './application/use-cases/print-templates.service';
import { PRINT_TEMPLATE_REPOSITORY_PORT } from './domain/repositories/print-template-repository.port';
import { PrismaPrintTemplateRepository }  from './infrastructure/repositories/prisma-print-template.repository';

@Module({
  controllers: [PrintTemplatesController],
  providers: [
    PrintTemplatesService,
    { provide: PRINT_TEMPLATE_REPOSITORY_PORT, useClass: PrismaPrintTemplateRepository },
  ],
  exports: [PrintTemplatesService],
})
export class PrintTemplatesModule {}
