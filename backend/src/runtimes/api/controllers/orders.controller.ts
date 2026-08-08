import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode,
} from '@nestjs/common';
import { OrdersService } from '@/modules/ponto-de-venda/application/use-cases/orders.service';
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

  @Delete(':id/items/:itemId')
  @HttpCode(200)
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { reasonId: string; password: string },
  ) {
    return this.orders.removeItem(id, itemId, body);
  }

  @Post(':id/transfer-items')
  @HttpCode(200)
  transferItems(
    @Param('id') id: string,
    @Body() body: { itemIds: string[]; targetComandaId: string },
  ) {
    return this.orders.transferItems(id, body);
  }

  @Put(':id/table')
  changeTable(@Param('id') id: string, @Body() body: { tableId: string }) {
    return this.orders.changeTable(id, body);
  }

  @Post(':id/print-summary')
  @HttpCode(200)
  printSummary(@Param('id') id: string) {
    return this.orders.printSummary(id);
  }

  @Post('merge-table')
  @HttpCode(200)
  mergeTable(@Body() body: { tableId: string }) {
    return this.orders.mergeTableComandas(body.tableId);
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
      voucherId?:      string;
      payments: Array<{ method: PaymentMethod; amount: number; notes?: string }>;
      printReceipt?: boolean;
    },
  ) {
    return this.orders.closeComanda(id, body);
  }
}
