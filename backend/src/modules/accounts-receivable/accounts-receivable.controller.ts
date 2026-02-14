import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AccountsReceivableService } from './accounts-receivable.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class RegisterPaymentDto {
  @ApiProperty() @IsNotEmpty() @IsString() amount: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() paymentMethod?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reference?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

@ApiTags('Accounts Receivable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(private service: AccountsReceivableService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cuentas por cobrar' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status, customerId,
    });
  }

  @Get('aging-report')
  @ApiOperation({ summary: 'Reporte de antigüedad de deuda' })
  getAgingReport() {
    return this.service.getAgingReport();
  }

  @Get('customer/:customerId/statement')
  @ApiOperation({ summary: 'Estado de cuenta del cliente' })
  getCustomerStatement(@Param('customerId') customerId: string) {
    return this.service.getCustomerStatement(customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cuenta por cobrar' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/payment')
  @ApiOperation({ summary: 'Registrar pago' })
  registerPayment(@Param('id') id: string, @Body() dto: RegisterPaymentDto, @Request() req: any) {
    return this.service.registerPayment(id, dto, req.user.sub);
  }
}
