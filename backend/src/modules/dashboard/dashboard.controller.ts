import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas generales' })
  getStats() {
    return this.service.getStats();
  }

  @Get('recent-sales')
  @ApiOperation({ summary: 'Ventas recientes' })
  getRecentSales() {
    return this.service.getRecentSales();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Alertas de stock bajo' })
  getLowStockAlerts() {
    return this.service.getLowStockAlerts();
  }

  @Get('seller-performance')
  @ApiOperation({ summary: 'Rendimiento de vendedores' })
  getSellerPerformance() {
    return this.service.getSellerPerformance();
  }
}
