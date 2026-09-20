import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { FornecedoresService } from '@/modules/controle-estoque/application/use-cases/fornecedores.service';

@Controller('estoque/fornecedores')
export class FornecedoresController {
  constructor(private readonly fornecedores: FornecedoresService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.fornecedores.list(all === 'true');
  }

  @Post('nfe-emitente')
  parseNfeEmitente(@Body() body: { xml: string }) {
    return this.fornecedores.parseNfeEmitente(body.xml);
  }

  @Post()
  create(@Body() body: any) {
    return this.fornecedores.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.fornecedores.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fornecedores.remove(id);
  }
}
