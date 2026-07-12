import {
  Controller, Get, Post, Put, Param, Body, Query, HttpCode,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ComandaStatus, PaymentMethod } from '@prisma/client';

@Controller('comandas')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query('status') status?: ComandaStatus) {
    return this.orders.listComandas(status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.getComanda(id);
  }

  @Post()
  open(@Body() body: {
    tableId?: string;
    customerName?: string;
    userId?: string;
    notes?: string;
  }) {
    return this.orders.openComanda(body);
  }

  @Post(':id/items')
  @HttpCode(201)
  addItems(
    @Param('id') id: string,
    @Body() body: {
      items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
      print?: boolean;
    },
  ) {
    return this.orders.addItems(id, body);
  }

  @Post(':id/pay')
  @HttpCode(200)
  close(
    @Param('id') id: string,
    @Body() body: {
      surchargeType?:  string;
      surchargeValue?: number;
      discountType?:   string;
      discountValue?:  number;
      payments: Array<{ method: PaymentMethod; amount: number; notes?: string }>;
      printReceipt?: boolean;
    },
  ) {
    return this.orders.closeComanda(id, body);
  }
}
