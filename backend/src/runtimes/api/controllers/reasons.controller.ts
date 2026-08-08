import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReasonsService } from '@/modules/reasons/application/use-cases/reasons.service';

@Controller('reasons')
export class ReasonsController {
  constructor(private readonly reasons: ReasonsService) {}

  @Get('cancellation')
  listCancellation() {
    return this.reasons.listCancellationReasons();
  }

  @Post('cancellation')
  createCancellation(@Body() body: { label: string }) {
    return this.reasons.createCancellationReason(body);
  }

  @Get('cancellation/history')
  cancellationHistory() {
    return this.reasons.listCancellationHistory();
  }

  @Get('discount')
  listDiscount() {
    return this.reasons.listDiscountReasons();
  }

  @Post('discount')
  createDiscount(@Body() body: { label: string; type: 'percent'|'fixed'; value: number }) {
    return this.reasons.createDiscountReason(body);
  }
}
