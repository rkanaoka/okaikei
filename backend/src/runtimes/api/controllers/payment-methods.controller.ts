import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  PaymentMethodInput,
  PaymentMethodsService,
} from '@/modules/ponto-de-venda/application/use-cases/payment-methods.service';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '@/modules/auth/infrastructure/guards/permissions.guard';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethods: PaymentMethodsService) {}

  // Usado também pela tela de Caixa e pelos relatórios — sem guard de permissão de admin.
  @Get()
  list(@Query('active') active?: string) {
    return this.paymentMethods.list({ active: active === undefined ? undefined : active === 'true' });
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('financeiro')
  create(@Body() body: PaymentMethodInput) {
    return this.paymentMethods.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('financeiro')
  update(@Param('id') id: string, @Body() body: PaymentMethodInput) {
    return this.paymentMethods.update(id, body);
  }
}
