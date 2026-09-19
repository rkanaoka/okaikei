import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { FornecedoresService } from '@/modules/controle-estoque/application/use-cases/fornecedores.service';

@Controller('estoque/fornecedores')
export class FornecedoresController {
  constructor(private readonly fornecedores: FornecedoresService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.fornecedores.list(all === 'true');
  }

  @Post()
  create(@Body() body: { nome: string; cnpj?: string; telefone?: string; email?: string }) {
    return this.fornecedores.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.fornecedores.update(id, body);
  }
}
