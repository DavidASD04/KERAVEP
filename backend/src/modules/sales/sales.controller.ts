import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class SaleItemDto {
  @ApiProperty() @IsNotEmpty() @IsString() productId: string;
  @ApiProperty() @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @ApiProperty() @IsNotEmpty() @IsString() unitPrice: string;
}

class CreateSaleDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() customerId?: string;
  @ApiProperty() @IsNotEmpty() @IsString() warehouseId: string;
  @ApiProperty({ enum: ['CONTADO', 'CREDITO'] }) @IsNotEmpty() @IsString() type: 'CONTADO' | 'CREDITO';
  @ApiProperty({ type: [SaleItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => SaleItemDto) items: SaleItemDto[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() discount?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private service: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear venta' })
  create(@Body() dto: CreateSaleDto, @Request() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ventas' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      type, status, userId, customerId, from, to,
    });
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Resumen diario de ventas' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'userId', required: false })
  getDailySummary(@Query('date') date?: string, @Query('userId') userId?: string) {
    return this.service.getDailySummary(date, userId);
  }

  @Get('seller-report/:userId')
  @ApiOperation({ summary: 'Reporte de vendedor' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getSellerReport(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getSellerReport(userId, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener venta' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancelar venta' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancel(id, req.user.sub);
  }
}
