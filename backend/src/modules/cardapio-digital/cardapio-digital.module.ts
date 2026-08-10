import { Module } from '@nestjs/common';
import { CardapioDigitalService }    from './application/use-cases/cardapio-digital.service';
import { CardapioPublicoController } from '@/runtimes/api/controllers/cardapio-publico.controller';

@Module({
  controllers: [CardapioPublicoController],
  providers: [CardapioDigitalService],
})
export class CardapioDigitalModule {}
