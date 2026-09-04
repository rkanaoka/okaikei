import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { VouchersService } from '@/modules/ponto-de-venda/application/use-cases/vouchers.service';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Get()
  list() {
    return this.vouchers.list();
  }

  @Get('by-code/:code')
  findByCode(@Param('code') code: string) {
    return this.vouchers.findByCode(code);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() body: { password: string }) {
    return this.vouchers.confirmForUse(id, body.password);
  }

  @Post(':id/use-recurring')
  useRecurring(@Param('id') id: string) {
    return this.vouchers.useRecurring(id);
  }

  @Get('usage-history')
  usageHistory() {
    return this.vouchers.usageHistory();
  }

  @Post()
  create(@Body() body: {
    customerName?: string; customerCpf?: string; customerBirthDate?: string;
    customerAddress?: string; customerPhone?: string; customerEmail?: string;
    discountType?: string; amount: number;
    menuItemIds?: string[]; minOrderValue?: number; validDaysOfWeek?: number[];
    dueDate?: string; status?: string; code?: string;
  }) {
    return this.vouchers.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: {
    customerName?: string; customerCpf?: string; customerBirthDate?: string;
    customerAddress?: string; customerPhone?: string; customerEmail?: string;
    discountType?: string; amount?: number;
    menuItemIds?: string[]; minOrderValue?: number; validDaysOfWeek?: number[];
    dueDate?: string; status?: string;
  }) {
    return this.vouchers.update(id, body);
  }
}
