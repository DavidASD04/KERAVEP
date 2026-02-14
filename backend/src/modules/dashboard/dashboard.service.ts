import { Injectable, Inject } from '@nestjs/common';
import { count, sum, sql, eq, gte, lte, and, desc, or } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import * as schema from '../../database/schema';

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      [{ totalProducts }],
      [{ totalCustomers }],
      [{ totalSalesToday, totalAmountToday }],
      [{ totalPendingDebt }],
      [{ totalSellersActive }],
    ] = await Promise.all([
      this.db.select({ totalProducts: count() }).from(schema.products).where(eq(schema.products.isActive, true)),
      this.db.select({ totalCustomers: count() }).from(schema.customers).where(eq(schema.customers.isActive, true)),
      this.db.select({
        totalSalesToday: count(),
        totalAmountToday: sql<string>`COALESCE(SUM(${schema.sales.total}::numeric), 0)`,
      }).from(schema.sales).where(
        and(
          gte(schema.sales.createdAt, today),
          lte(schema.sales.createdAt, endOfDay),
          eq(schema.sales.status, 'COMPLETADA'),
        ),
      ),
      this.db.select({
        totalPendingDebt: sql<string>`COALESCE(SUM(${schema.accountsReceivable.balance}::numeric), 0)`,
      }).from(schema.accountsReceivable).where(
        or(
          eq(schema.accountsReceivable.status, 'PENDIENTE'),
          eq(schema.accountsReceivable.status, 'PARCIAL'),
        ),
      ),
      this.db.select({ totalSellersActive: count() }).from(schema.users).where(
        and(eq(schema.users.role, 'VENDEDOR'), eq(schema.users.isActive, true)),
      ),
    ]);

    return {
      totalProducts,
      totalCustomers,
      totalSalesToday,
      totalAmountToday,
      totalPendingDebt,
      totalSellersActive,
    };
  }

  async getRecentSales(limit = 10) {
    return this.db
      .select({
        id: schema.sales.id,
        saleNumber: schema.sales.saleNumber,
        customerName: sql<string>`CONCAT(${schema.customers.firstName}, ' ', ${schema.customers.lastName})`,
        sellerName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
        type: schema.sales.type,
        total: schema.sales.total,
        createdAt: schema.sales.createdAt,
      })
      .from(schema.sales)
      .leftJoin(schema.customers, eq(schema.sales.customerId, schema.customers.id))
      .innerJoin(schema.users, eq(schema.sales.userId, schema.users.id))
      .where(eq(schema.sales.status, 'COMPLETADA'))
      .orderBy(desc(schema.sales.createdAt))
      .limit(limit);
  }

  async getLowStockAlerts() {
    return this.db
      .select({
        productName: schema.products.name,
        productSku: schema.products.sku,
        warehouseName: schema.warehouses.name,
        quantity: schema.warehouseStock.quantity,
        minStock: schema.products.minStock,
      })
      .from(schema.warehouseStock)
      .innerJoin(schema.products, eq(schema.warehouseStock.productId, schema.products.id))
      .innerJoin(schema.warehouses, eq(schema.warehouseStock.warehouseId, schema.warehouses.id))
      .where(sql`${schema.warehouseStock.quantity} <= ${schema.products.minStock}`)
      .orderBy(schema.warehouseStock.quantity)
      .limit(20);
  }

  async getSellerPerformance() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.db
      .select({
        userId: schema.users.id,
        sellerName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
        totalSales: count(schema.sales.id),
        totalRevenue: sql<string>`COALESCE(SUM(${schema.sales.total}::numeric), 0)`,
      })
      .from(schema.users)
      .leftJoin(
        schema.sales,
        and(
          eq(schema.sales.userId, schema.users.id),
          eq(schema.sales.status, 'COMPLETADA'),
          gte(schema.sales.createdAt, thirtyDaysAgo),
        ),
      )
      .where(eq(schema.users.role, 'VENDEDOR'))
      .groupBy(schema.users.id, schema.users.firstName, schema.users.lastName)
      .orderBy(desc(sql`COALESCE(SUM(${schema.sales.total}::numeric), 0)`));
  }
}
