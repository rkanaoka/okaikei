import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Get()
  list() {
    return this.vouchers.list();
  }

  @Post()
  create(@Body() body: {
    customerName: string; customerCpf: string; customerBirthDate: string;
    customerAddress: string; customerPhone: string; customerEmail: string;
    amount: number; dueDate: string; status?: string;
  }) {
    return this.vouchers.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: {
    customerName?: string; customerCpf?: string; customerBirthDate?: string;
    customerAddress?: string; customerPhone?: string; customerEmail?: string;
    amount?: number; dueDate?: string; status?: string;
  }) {
    return this.vouchers.update(id, body);
  }
}
