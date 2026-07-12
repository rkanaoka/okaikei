import { Module }           from '@nestjs/common';
import { PrintingService }  from './printing.service';
import { PrintingController } from './printing.controller';

@Module({
  controllers: [PrintingController],
  providers:   [PrintingService],
  exports:     [PrintingService],
})
export class PrintingModule {}
