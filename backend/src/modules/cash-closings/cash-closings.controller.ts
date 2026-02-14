import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CashClosingsService } from './cash-closings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateCashClosingDto {
  @ApiProperty() @IsNotEmpty() @IsString() warehouseId: string;
  @ApiProperty() @IsNotEmpty() @IsString() date: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

@ApiTags('Cash Closings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-closings')
export class CashClosingsController {
  constructor(private service: CashClosingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear cierre de caja' })
  create(@Body() dto: CreateCashClosingDto, @Request() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cierres de caja' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      warehouseId, userId, from, to,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cierre de caja' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
