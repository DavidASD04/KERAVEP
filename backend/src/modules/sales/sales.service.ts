import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, and, count, sql, sum, gte, lte, between } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import { WarehousesService } from '../warehouses/warehouses.service';
import * as schema from '../../database/schema';

interface CreateSaleDto {
  customerId?: string;
  warehouseId: string;
  type: 'CONTADO' | 'CREDITO';
  items: { productId: string; quantity: number; unitPrice: string }[];
  discount?: string;
  notes?: string;
}

@Injectable()
export class SalesService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    private warehousesService: WarehousesService,
  ) {}

  private async generateSaleNumber(): Promise<string> {
    const today = new Date();
    const prefix = `V${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const [result] = await this.db
      .select({ count: count() })
      .from(schema.sales)
      .where(gte(schema.sales.createdAt, new Date(today.setHours(0, 0, 0, 0))));

    return `${prefix}-${String((result?.count || 0) + 1).padStart(4, '0')}`;
  }

  async create(data: CreateSaleDto, userId: string) {
    // Validate credit sale requires customer
    if (data.type === 'CREDITO' && !data.customerId) {
      throw new BadRequestException('Las ventas a crédito requieren un cliente');
    }

    // Check credit limit for credit sales
    if (data.type === 'CREDITO' && data.customerId) {
      const [customer] = await this.db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, data.customerId))
        .limit(1);

      if (!customer) throw new NotFoundException('Cliente no encontrado');

      const subtotal = data.items.reduce(
        (acc, item) => acc + parseFloat(item.unitPrice) * item.quantity,
        0,
      );
      const total = subtotal - parseFloat(data.discount || '0');
      const availableCredit = parseFloat(customer.creditLimit) - parseFloat(customer.currentDebt);

      if (total > availableCredit) {
        throw new BadRequestException(
          `Crédito insuficiente. Disponible: RD$${availableCredit.toFixed(2)}, Requerido: RD$${total.toFixed(2)}`,
        );
      }
    }

    // Calculate totals
    const subtotal = data.items.reduce(
      (acc, item) => acc + parseFloat(item.unitPrice) * item.quantity,
      0,
    );
    const discount = parseFloat(data.discount || '0');
    const total = subtotal - discount;

    const saleNumber = await this.generateSaleNumber();

    // Create sale
    const [sale] = await this.db
      .insert(schema.sales)
      .values({
        saleNumber,
        customerId: data.customerId || null,
        userId,
        warehouseId: data.warehouseId,
        type: data.type,
        status: 'COMPLETADA',
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        notes: data.notes,
      })
      .returning();

    // Create sale items
    const saleItemsData = data.items.map((item) => ({
      saleId: sale.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
    }));

    await this.db.insert(schema.saleItems).values(saleItemsData);

    // Deduct stock
    for (const item of data.items) {
      await this.warehousesService.adjustStock(
        data.warehouseId,
        item.productId,
        -item.quantity,
        'VENTA',
        userId,
        `Venta ${saleNumber}`,
        sale.id,
      );
    }

    // For credit sales, create account receivable and update customer debt
    if (data.type === 'CREDITO' && data.customerId) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await this.db.insert(schema.accountsReceivable).values({
        saleId: sale.id,
        customerId: data.customerId,
        totalAmount: total.toFixed(2),
        balance: total.toFixed(2),
        dueDate,
      });

      // Update customer debt
      await this.db
        .update(schema.customers)
        .set({
          currentDebt: sql`${schema.customers.currentDebt} + ${total}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.id, data.customerId));
    }

    return { ...sale, items: saleItemsData };
  }

  async findAll(query?: { page?: number; limit?: number; type?: string; status?: string; userId?: string; from?: string; to?: string }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query?.type) conditions.push(eq(schema.sales.type, query.type as any));
    if (query?.status) conditions.push(eq(schema.sales.status, query.status as any));
    if (query?.userId) conditions.push(eq(schema.sales.userId, query.userId));
    if (query?.from) conditions.push(gte(schema.sales.createdAt, new Date(query.from)));
    if (query?.to) conditions.push(lte(schema.sales.createdAt, new Date(query.to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [sales, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: schema.sales.id,
          saleNumber: schema.sales.saleNumber,
          customerName: sql<string>`CONCAT(${schema.customers.firstName}, ' ', ${schema.customers.lastName})`,
          sellerName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
          warehouseName: schema.warehouses.name,
          type: schema.sales.type,
          status: schema.sales.status,
          subtotal: schema.sales.subtotal,
          discount: schema.sales.discount,
          total: schema.sales.total,
          createdAt: schema.sales.createdAt,
        })
        .from(schema.sales)
        .leftJoin(schema.customers, eq(schema.sales.customerId, schema.customers.id))
        .innerJoin(schema.users, eq(schema.sales.userId, schema.users.id))
        .innerJoin(schema.warehouses, eq(schema.sales.warehouseId, schema.warehouses.id))
        .where(where)
        .orderBy(desc(schema.sales.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.sales).where(where),
    ]);

    return { data: sales, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const [sale] = await this.db
      .select({
        id: schema.sales.id,
        saleNumber: schema.sales.saleNumber,
        customerId: schema.sales.customerId,
        customerName: sql<string>`CONCAT(${schema.customers.firstName}, ' ', ${schema.customers.lastName})`,
        sellerName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
        warehouseName: schema.warehouses.name,
        type: schema.sales.type,
        status: schema.sales.status,
        subtotal: schema.sales.subtotal,
        discount: schema.sales.discount,
        total: schema.sales.total,
        notes: schema.sales.notes,
        createdAt: schema.sales.createdAt,
      })
      .from(schema.sales)
      .leftJoin(schema.customers, eq(schema.sales.customerId, schema.customers.id))
      .innerJoin(schema.users, eq(schema.sales.userId, schema.users.id))
      .innerJoin(schema.warehouses, eq(schema.sales.warehouseId, schema.warehouses.id))
      .where(eq(schema.sales.id, id))
      .limit(1);

    if (!sale) throw new NotFoundException('Venta no encontrada');

    const items = await this.db
      .select({
        id: schema.saleItems.id,
        productId: schema.saleItems.productId,
        productName: schema.products.name,
        productSku: schema.products.sku,
        quantity: schema.saleItems.quantity,
        unitPrice: schema.saleItems.unitPrice,
        subtotal: schema.saleItems.subtotal,
      })
      .from(schema.saleItems)
      .innerJoin(schema.products, eq(schema.saleItems.productId, schema.products.id))
      .where(eq(schema.saleItems.saleId, id));

    return { ...sale, items };
  }

  async cancel(id: string, userId: string) {
    const sale = await this.findOne(id);

    if (sale.status === 'CANCELADA') {
      throw new BadRequestException('La venta ya está cancelada');
    }

    // Restore stock
    for (const item of sale.items) {
      await this.warehousesService.adjustStock(
        (await this.db.select().from(schema.sales).where(eq(schema.sales.id, id)).limit(1))[0].warehouseId,
        item.productId,
        item.quantity,
        'AJUSTE',
        userId,
        `Cancelación de venta ${sale.saleNumber}`,
        id,
      );
    }

    // Update sale status
    await this.db
      .update(schema.sales)
      .set({ status: 'CANCELADA' })
      .where(eq(schema.sales.id, id));

    // If credit sale, reverse account receivable
    if (sale.type === 'CREDITO' && sale.customerId) {
      await this.db
        .update(schema.accountsReceivable)
        .set({ status: 'PAGADA', balance: '0', updatedAt: new Date() })
        .where(eq(schema.accountsReceivable.saleId, id));

      await this.db
        .update(schema.customers)
        .set({
          currentDebt: sql`GREATEST(${schema.customers.currentDebt} - ${parseFloat(sale.total)}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.id, sale.customerId));
    }

    return { message: 'Venta cancelada exitosamente' };
  }

  async getDailySummary(date?: string, userId?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conditions: any[] = [
      gte(schema.sales.createdAt, startOfDay),
      lte(schema.sales.createdAt, endOfDay),
      eq(schema.sales.status, 'COMPLETADA'),
    ];
    if (userId) conditions.push(eq(schema.sales.userId, userId));

    const [summary] = await this.db
      .select({
        totalSales: count(),
        totalAmount: sum(schema.sales.total),
        totalCash: sql<string>`COALESCE(SUM(CASE WHEN ${schema.sales.type} = 'CONTADO' THEN ${schema.sales.total}::numeric ELSE 0 END), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CASE WHEN ${schema.sales.type} = 'CREDITO' THEN ${schema.sales.total}::numeric ELSE 0 END), 0)`,
      })
      .from(schema.sales)
      .where(and(...conditions));

    return {
      date: targetDate.toISOString().split('T')[0],
      ...summary,
    };
  }

  async getSellerReport(userId: string, from?: string, to?: string) {
    const conditions: any[] = [eq(schema.sales.userId, userId), eq(schema.sales.status, 'COMPLETADA')];
    if (from) conditions.push(gte(schema.sales.createdAt, new Date(from)));
    if (to) conditions.push(lte(schema.sales.createdAt, new Date(to)));

    const [summary] = await this.db
      .select({
        totalSales: count(),
        totalAmount: sum(schema.sales.total),
        totalCash: sql<string>`COALESCE(SUM(CASE WHEN ${schema.sales.type} = 'CONTADO' THEN ${schema.sales.total}::numeric ELSE 0 END), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CASE WHEN ${schema.sales.type} = 'CREDITO' THEN ${schema.sales.total}::numeric ELSE 0 END), 0)`,
      })
      .from(schema.sales)
      .where(and(...conditions));

    // Top products sold by this seller
    const topProducts = await this.db
      .select({
        productName: schema.products.name,
        productSku: schema.products.sku,
        totalQuantity: sum(schema.saleItems.quantity),
        totalRevenue: sum(schema.saleItems.subtotal),
      })
      .from(schema.saleItems)
      .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
      .innerJoin(schema.products, eq(schema.saleItems.productId, schema.products.id))
      .where(and(...conditions))
      .groupBy(schema.products.name, schema.products.sku)
      .orderBy(desc(sum(schema.saleItems.subtotal)))
      .limit(10);

    return { ...summary, topProducts };
  }
}
