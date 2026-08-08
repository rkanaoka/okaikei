import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { PrintTemplatesService } from '@/modules/ponto-de-venda/application/use-cases/print-templates.service';
import { PrintingService } from '@/modules/ponto-de-venda/application/use-cases/printing.service';

@Controller('print-templates')
export class PrintTemplatesController {
  constructor(
    private readonly templates: PrintTemplatesService,
    private readonly printing:  PrintingService,
  ) {}

  @Get()
  list() {
    return this.templates.list();
  }

  @Get(':type')
  get(@Param('type') type: string) {
    return this.templates.get(type);
  }

  @Put(':type')
  update(@Param('type') type: string, @Body() body: { enabled?: boolean; config?: Record<string, any> }) {
    return this.templates.update(type, body);
  }

  @Post(':type/reset')
  reset(@Param('type') type: string) {
    return this.templates.reset(type);
  }

  // Imprime um ticket de exemplo com o modelo em edição (antes de salvar)
  @Post(':type/test')
  async test(@Param('type') type: string, @Body() body: { enabled?: boolean; config?: Record<string, any> }) {
    try {
      await this.printing.printTemplateSample(type, body);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
}
