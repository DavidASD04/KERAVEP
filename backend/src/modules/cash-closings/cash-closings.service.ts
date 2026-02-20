import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, and, count, sql, sum, gte, lte } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import { NotificationsService } from '../notifications/notifications.service';
import * as schema from '../../database/schema';

@Injectable()
export class CashClosingsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    private notificationsService: NotificationsService,
  ) {}

  async create(data: { warehouseId: string; date: string; notes?: string }, userId: string) {
    const targetDate = new Date(data.date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if closing already exists for this date/warehouse/user
    const [existing] = await this.db
      .select()
      .from(schema.cashClosings)
      .where(
        and(
          eq(schema.cashClosings.warehouseId, data.warehouseId),
          eq(schema.cashClosings.userId, userId),
          gte(schema.cashClosings.date, startOfDay),
          lte(schema.cashClosings.date, endOfDay),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('Ya existe un cierre de caja para esta fecha, almacén y usuario');
    }

    // Calculate totals from sales of that day
    const conditions = [
      eq(schema.sales.warehouseId, data.warehouseId),
      eq(schema.sales.userId, userId),
      eq(schema.sales.status, 'COMPLETADA'),
      gte(schema.sales.createdAt, startOfDay),
      lte(schema.sales.createdAt, endOfDay),
    ];

    const [saleSummary] = await this.db
      .select({
        totalCash: sql<string>`COALESCE(SUM(CASE WHEN ${schema.sales.type} = 'CONTADO' THEN ${schema.sales.total}::numeric ELSE 0 END), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CASE WHEN ${schema.sales.type} = 'CREDITO' THEN ${schema.sales.total}::numeric ELSE 0 END), 0)`,
        totalSales: sql<string>`COALESCE(SUM(${schema.sales.total}::numeric), 0)`,
      })
      .from(schema.sales)
      .where(and(...conditions));

    // Calculate collections (payments received that day)
    const [collectionSummary] = await this.db
      .select({
        totalCollections: sql<string>`COALESCE(SUM(${schema.payments.amount}::numeric), 0)`,
      })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.receivedBy, userId),
          gte(schema.payments.createdAt, startOfDay),
          lte(schema.payments.createdAt, endOfDay),
        ),
      );

    const [closing] = await this.db
      .insert(schema.cashClosings)
      .values({
        warehouseId: data.warehouseId,
        userId,
        date: targetDate,
        totalCash: saleSummary.totalCash,
        totalCredit: saleSummary.totalCredit,
        totalSales: saleSummary.totalSales,
        totalCollections: collectionSummary.totalCollections,
        notes: data.notes,
      })
      .returning();

    // Notificar cierre de caja a admins
    await this.notificationsService.notifyAdmins(
      'CIERRE_CAJA',
      'Cierre de caja realizado',
      `Cierre de caja por RD$${saleSummary.totalSales} (Efectivo: RD$${saleSummary.totalCash}, Crédito: RD$${saleSummary.totalCredit})`,
      {
        closingId: closing.id,
        totalSales: saleSummary.totalSales,
        totalCash: saleSummary.totalCash,
        totalCredit: saleSummary.totalCredit,
      },
    );

    return closing;
  }

  async findAll(query?: { page?: number; limit?: number; warehouseId?: string; userId?: string; from?: string; to?: string }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query?.warehouseId) conditions.push(eq(schema.cashClosings.warehouseId, query.warehouseId));
    if (query?.userId) conditions.push(eq(schema.cashClosings.userId, query.userId));
    if (query?.from) conditions.push(gte(schema.cashClosings.date, new Date(query.from)));
    if (query?.to) conditions.push(lte(schema.cashClosings.date, new Date(query.to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [closings, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: schema.cashClosings.id,
          warehouseId: schema.cashClosings.warehouseId,
          warehouseName: schema.warehouses.name,
          userId: schema.cashClosings.userId,
          userName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
          date: schema.cashClosings.date,
          totalCash: schema.cashClosings.totalCash,
          totalCredit: schema.cashClosings.totalCredit,
          totalSales: schema.cashClosings.totalSales,
          totalCollections: schema.cashClosings.totalCollections,
          notes: schema.cashClosings.notes,
          createdAt: schema.cashClosings.createdAt,
        })
        .from(schema.cashClosings)
        .innerJoin(schema.warehouses, eq(schema.cashClosings.warehouseId, schema.warehouses.id))
        .innerJoin(schema.users, eq(schema.cashClosings.userId, schema.users.id))
        .where(where)
        .orderBy(desc(schema.cashClosings.date))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.cashClosings).where(where),
    ]);

    return { data: closings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const [closing] = await this.db
      .select({
        id: schema.cashClosings.id,
        warehouseId: schema.cashClosings.warehouseId,
        warehouseName: schema.warehouses.name,
        userId: schema.cashClosings.userId,
        userName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
        date: schema.cashClosings.date,
        totalCash: schema.cashClosings.totalCash,
        totalCredit: schema.cashClosings.totalCredit,
        totalSales: schema.cashClosings.totalSales,
        totalCollections: schema.cashClosings.totalCollections,
        notes: schema.cashClosings.notes,
        createdAt: schema.cashClosings.createdAt,
      })
      .from(schema.cashClosings)
      .innerJoin(schema.warehouses, eq(schema.cashClosings.warehouseId, schema.warehouses.id))
      .innerJoin(schema.users, eq(schema.cashClosings.userId, schema.users.id))
      .where(eq(schema.cashClosings.id, id))
      .limit(1);

    if (!closing) throw new NotFoundException('Cierre de caja no encontrado');

    // Get sales detail for that closing
    const startOfDay = new Date(closing.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(closing.date);
    endOfDay.setHours(23, 59, 59, 999);

    const salesDetail = await this.db
      .select({
        id: schema.sales.id,
        saleNumber: schema.sales.saleNumber,
        type: schema.sales.type,
        total: schema.sales.total,
        customerName: sql<string>`CONCAT(${schema.customers.firstName}, ' ', ${schema.customers.lastName})`,
        createdAt: schema.sales.createdAt,
      })
      .from(schema.sales)
      .leftJoin(schema.customers, eq(schema.sales.customerId, schema.customers.id))
      .where(
        and(
          eq(schema.sales.warehouseId, closing.warehouseId),
          eq(schema.sales.userId, closing.userId),
          eq(schema.sales.status, 'COMPLETADA'),
          gte(schema.sales.createdAt, startOfDay),
          lte(schema.sales.createdAt, endOfDay),
        ),
      )
      .orderBy(schema.sales.createdAt);

    return { ...closing, sales: salesDetail };
  }
}
