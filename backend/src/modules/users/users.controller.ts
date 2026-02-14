import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll({
      search,
      role,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('sellers/assignments')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Vendedores con zonas y almacenes asignados' })
  getSellersWithAssignments() {
    return this.usersService.getSellersWithAssignments();
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Patch(':id/toggle-active')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activar/Desactivar usuario' })
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }

  @Patch(':id/zone')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Asignar zona/ruta al vendedor' })
  updateZone(@Param('id') id: string, @Body('zone') zone: string) {
    return this.usersService.updateSellerZone(id, zone);
  }

  @Get(':id/mobile-inventory')
  @ApiOperation({ summary: 'Inventario móvil del vendedor' })
  getMobileInventory(@Param('id') id: string) {
    return this.usersService.getSellerMobileInventory(id);
  }

  @Get(':id/products-summary')
  @ApiOperation({ summary: 'Productos vendidos por el vendedor (últimos 30 días)' })
  getProductsSummary(@Param('id') id: string) {
    return this.usersService.getSellerProductsSummary(id);
  }
}
