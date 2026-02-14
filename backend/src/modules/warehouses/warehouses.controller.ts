import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class CreateWarehouseDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() type?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() assignedUserId?: string;
}

class StockAdjustDto {
  @ApiProperty() @IsNotEmpty() @IsString() productId: string;
  @ApiProperty() @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}

@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private service: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar almacenes' })
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener almacén' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear almacén' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar almacén' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateWarehouseDto>) {
    return this.service.update(id, dto);
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Stock del almacén' })
  getStock(@Param('id') id: string, @Query('search') search?: string) {
    return this.service.getStock(id, search);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Resumen del almacén' })
  getSummary(@Param('id') id: string) {
    return this.service.getStockSummary(id);
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'Movimientos de stock' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getMovements(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMovements(id, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post(':id/stock/entry')
  @Roles('ADMIN', 'ALMACENERO')
  @ApiOperation({ summary: 'Entrada de stock' })
  addEntry(@Param('id') id: string, @Body() dto: StockAdjustDto, @Request() req: any) {
    return this.service.addStockEntry(id, dto, req.user.sub);
  }

  @Post(':id/stock/exit')
  @Roles('ADMIN', 'ALMACENERO')
  @ApiOperation({ summary: 'Salida de stock' })
  removeStock(@Param('id') id: string, @Body() dto: StockAdjustDto, @Request() req: any) {
    return this.service.removeStock(id, dto, req.user.sub);
  }
}
