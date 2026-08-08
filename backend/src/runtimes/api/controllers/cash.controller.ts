import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { CashService } from '@/modules/ponto-de-venda/application/use-cases/cash.service';
import { CashMovementType } from '@prisma/client';

@Controller('cash')
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.cash.list({ from, to });
  }

  @Get('current')
  current() {
    return this.cash.getCurrent();
  }

  @Post('open')
  open(@Body() body: { openingAmount: number; notes?: string }) {
    return this.cash.open(body);
  }

  @Post(':id/movements')
  addMovement(
    @Param('id') id: string,
    @Body() body: { type: CashMovementType; amount: number; notes?: string },
  ) {
    return this.cash.addMovement(id, body);
  }

  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.cash.getSummary(id);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Body() body: { closingCounts: Record<string, number>; notes?: string },
  ) {
    return this.cash.close(id, body);
  }
}
