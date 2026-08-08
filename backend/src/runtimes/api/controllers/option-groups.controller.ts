import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { OptionGroupsService } from '@/modules/option-groups/application/use-cases/option-groups.service';

@Controller('option-groups')
export class OptionGroupsController {
  constructor(private readonly groups: OptionGroupsService) {}

  @Get()
  findAll() {
    return this.groups.findAll();
  }

  @Post()
  create(@Body() body: { name: string; minSelect?: number; maxSelect?: number; options?: any[] }) {
    return this.groups.create(body);
  }

  @Put('options/:optionId')
  updateOption(@Param('optionId') optionId: string, @Body() body: { name?: string; price?: number; active?: boolean }) {
    return this.groups.updateOption(optionId, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groups.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.groups.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groups.remove(id);
  }

  @Put(':id/items')
  setItems(@Param('id') id: string, @Body() body: { menuItemIds: string[] }) {
    return this.groups.setItems(id, body.menuItemIds ?? []);
  }
}
