import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ImportarNfeService, ItemConfirmacao } from '@/modules/controle-estoque/application/use-cases/importar-nfe.service';

@Controller('estoque/insumos/nfe')
export class NfeImportController {
  constructor(private readonly importarNfe: ImportarNfeService) {}

  /** Recebe o XML (texto) da NF-e e devolve a prévia dos itens para conferência/vinculação. */
  @Post('preview')
  preview(@Body() body: { xml: string }) {
    if (!body?.xml?.trim()) throw new BadRequestException('Envie o conteúdo do XML da NF-e.');
    return this.importarNfe.preview(body.xml);
  }

  /** Confirma a importação após o usuário revisar/vincular os itens na prévia. */
  @Post('confirmar')
  confirmar(@Body() body: { xml: string; itens: ItemConfirmacao[] }) {
    if (!body?.xml?.trim()) throw new BadRequestException('Envie o conteúdo do XML da NF-e.');
    if (!Array.isArray(body.itens) || !body.itens.length) throw new BadRequestException('Nenhum item para confirmar.');
    return this.importarNfe.confirmar(body.xml, body.itens);
  }
}
