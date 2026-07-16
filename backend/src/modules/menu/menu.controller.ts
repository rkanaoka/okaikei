import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  // ── Categorias (declaradas antes de ':id' para não colidir na rota) ────────

  @Get('categories')
  findAllCategories() {
    return this.menu.findAllCategories();
  }

  @Post('categories')
  createCategory(@Body() body: { name: string; sortOrder?: number }) {
    return this.menu.createCategory(body);
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: { name?: string; sortOrder?: number }) {
    return this.menu.updateCategory(id, body);
  }

  // ── Itens ────────────────────────────────────────────────────────────────

  @Get()
  findAll(@Query('all') all?: string) {
    return this.menu.findAll(all === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menu.findOne(id);
  }

  @Post()
  create(@Body() body: {
    name: string; description?: string; price: number;
    category: string; subcategory?: string; sortOrder?: number;
    categoryId?: string; printCategories?: string[];
    imageUrl?: string; chargeServiceFee?: boolean; availabilitySchedule?: any;
    optionGroupIds?: string[];
  }) {
    return this.menu.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.menu.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menu.remove(id);
  }
}
