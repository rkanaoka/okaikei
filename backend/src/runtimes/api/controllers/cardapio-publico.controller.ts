import {
  Controller, Get, Post, Param, Body, HttpCode, UseGuards,
} from '@nestjs/common';
import { CardapioDigitalService } from '@/modules/cardapio-digital/application/use-cases/cardapio-digital.service';
import { ApiKeyGuard }            from '@/modules/cardapio-digital/guards/api-key.guard';

@Controller('cardapio')
@UseGuards(ApiKeyGuard)
export class CardapioPublicoController {
  constructor(private readonly service: CardapioDigitalService) {}

  /** GET /cardapio/menu — cardápio completo para a VPS cachear */
  @Get('menu')
  getMenu() {
    return this.service.getMenu();
  }

  /** POST /cardapio/pedido — cria uma comanda recebida da VPS */
  @Post('pedido')
  @HttpCode(201)
  createPedido(
    @Body() body: {
      customerName: string;
      tableNumber: string;
      items: Array<{ menuItemId: string; qty: number; notes?: string }>;
    },
  ) {
    return this.service.createPedido(body);
  }

  /** GET /cardapio/comanda/:token — status da comanda pelo UUID */
  @Get('comanda/:token')
  getComanda(@Param('token') token: string) {
    return this.service.getComanda(token);
  }

  /** POST /cardapio/comanda/:token/items — adiciona itens à comanda existente */
  @Post('comanda/:token/items')
  @HttpCode(201)
  addItems(
    @Param('token') token: string,
    @Body() body: { items: Array<{ menuItemId: string; qty: number; notes?: string }> },
  ) {
    return this.service.addItems(token, body);
  }
}
