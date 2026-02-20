import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, ilike, or, and, count, sql } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import { NotificationsService } from '../notifications/notifications.service';
import * as schema from '../../database/schema';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(query?: { search?: string; page?: number; limit?: number; active?: string }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query?.search) {
      conditions.push(
        or(
          ilike(schema.customers.firstName, `%${query.search}%`),
          ilike(schema.customers.lastName, `%${query.search}%`),
          ilike(schema.customers.phone, `%${query.search}%`),
          ilike(schema.customers.email, `%${query.search}%`),
        ),
      );
    }
    if (query?.active !== undefined) {
      conditions.push(eq(schema.customers.isActive, query.active === 'true'));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [customers, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.customers)
        .where(where)
        .orderBy(desc(schema.customers.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.customers).where(where),
    ]);

    return { data: customers, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .limit(1);

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async create(data: any) {
    const [customer] = await this.db.insert(schema.customers).values(data).returning();

    // Notificar nuevo cliente
    await this.notificationsService.notifyAdmins(
      'NUEVO_CLIENTE',
      'Nuevo cliente registrado',
      `Se registró el cliente ${customer.firstName} ${customer.lastName}`,
      { customerId: customer.id, name: `${customer.firstName} ${customer.lastName}` },
    );

    return customer;
  }

  async update(id: string, data: any) {
    const [customer] = await this.db
      .update(schema.customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.customers.id, id))
      .returning();

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async remove(id: string) {
    return this.update(id, { isActive: false });
  }

  async getPurchaseHistory(customerId: string) {
    return this.db
      .select({
        id: schema.sales.id,
        saleNumber: schema.sales.saleNumber,
        type: schema.sales.type,
        status: schema.sales.status,
        total: schema.sales.total,
        createdAt: schema.sales.createdAt,
        sellerName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
      })
      .from(schema.sales)
      .innerJoin(schema.users, eq(schema.sales.userId, schema.users.id))
      .where(eq(schema.sales.customerId, customerId))
      .orderBy(desc(schema.sales.createdAt));
  }

  async getCreditStatus(customerId: string) {
    const customer = await this.findOne(customerId);

    const pendingAccounts = await this.db
      .select({
        id: schema.accountsReceivable.id,
        totalAmount: schema.accountsReceivable.totalAmount,
        paidAmount: schema.accountsReceivable.paidAmount,
        balance: schema.accountsReceivable.balance,
        status: schema.accountsReceivable.status,
        dueDate: schema.accountsReceivable.dueDate,
        saleNumber: schema.sales.saleNumber,
      })
      .from(schema.accountsReceivable)
      .innerJoin(schema.sales, eq(schema.accountsReceivable.saleId, schema.sales.id))
      .where(
        and(
          eq(schema.accountsReceivable.customerId, customerId),
          or(
            eq(schema.accountsReceivable.status, 'PENDIENTE'),
            eq(schema.accountsReceivable.status, 'PARCIAL'),
          ),
        ),
      )
      .orderBy(schema.accountsReceivable.dueDate);

    return {
      creditLimit: customer.creditLimit,
      currentDebt: customer.currentDebt,
      availableCredit: parseFloat(customer.creditLimit) - parseFloat(customer.currentDebt),
      pendingAccounts,
    };
  }
}
