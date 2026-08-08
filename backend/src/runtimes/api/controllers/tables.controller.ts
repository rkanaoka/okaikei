import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { TablesService } from '@/modules/ponto-de-venda/application/use-cases/tables.service';

@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}
  @Get()          findAll()                                       { return this.tables.findAll(); }
  @Post()         create(@Body() b: any)                         { return this.tables.create(b); }
  @Put(':id')     update(@Param('id') id: string, @Body() b: any){ return this.tables.update(id, b); }
}
