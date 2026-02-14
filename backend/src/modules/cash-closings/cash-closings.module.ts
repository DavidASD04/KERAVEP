import { Module } from '@nestjs/common';
import { CashClosingsService } from './cash-closings.service';
import { CashClosingsController } from './cash-closings.controller';

@Module({
  controllers: [CashClosingsController],
  providers: [CashClosingsService],
  exports: [CashClosingsService],
})
export class CashClosingsModule {}
