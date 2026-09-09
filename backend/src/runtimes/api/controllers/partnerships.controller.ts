import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PartnershipsService } from '@/modules/ponto-de-venda/application/use-cases/partnerships.service';
import { PartnershipCouponInput } from '@/modules/ponto-de-venda/domain/repositories/partnership-repository.port';

interface PartnershipBody {
  name: string;
  description?: string;
  responsible?: string;
  contact?: string;
  cnpj?: string;
  code: string;
  startDate?: string;
  endDate?: string;
  validDaysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  active?: boolean;
  coupons: PartnershipCouponInput[];
}

@Controller('partnerships')
export class PartnershipsController {
  constructor(private readonly partnerships: PartnershipsService) {}

  @Get()
  list() {
    return this.partnerships.list();
  }

  @Get('by-code/:code')
  findByCode(@Param('code') code: string) {
    return this.partnerships.findUsableByCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnerships.findOne(id);
  }

  @Post()
  create(@Body() body: PartnershipBody) {
    return this.partnerships.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<PartnershipBody>) {
    return this.partnerships.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partnerships.remove(id);
  }
}
