import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, and, count, sql, sum, or, gte, lte } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import { NotificationsService } from '../notifications/notifications.service';
import * as schema from '../../database/schema';

@Injectable()
export class AccountsReceivableService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(query?: { page?: number; limit?: number; status?: string; customerId?: string }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query?.status) conditions.push(eq(schema.accountsReceivable.status, query.status as any));
    if (query?.customerId) conditions.push(eq(schema.accountsReceivable.customerId, query.customerId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [accounts, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: schema.accountsReceivable.id,
          saleId: schema.accountsReceivable.saleId,
          saleNumber: schema.sales.saleNumber,
          customerName: sql<string>`CONCAT(${schema.customers.firstName}, ' ', ${schema.customers.lastName})`,
          customerId: schema.accountsReceivable.customerId,
          totalAmount: schema.accountsReceivable.totalAmount,
          paidAmount: schema.accountsReceivable.paidAmount,
          balance: schema.accountsReceivable.balance,
          status: schema.accountsReceivable.status,
          dueDate: schema.accountsReceivable.dueDate,
          createdAt: schema.accountsReceivable.createdAt,
        })
        .from(schema.accountsReceivable)
        .innerJoin(schema.sales, eq(schema.accountsReceivable.saleId, schema.sales.id))
        .innerJoin(schema.customers, eq(schema.accountsReceivable.customerId, schema.customers.id))
        .where(where)
        .orderBy(desc(schema.accountsReceivable.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.accountsReceivable).where(where),
    ]);

    return { data: accounts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const [account] = await this.db
      .select({
        id: schema.accountsReceivable.id,
        saleId: schema.accountsReceivable.saleId,
        saleNumber: schema.sales.saleNumber,
        customerName: sql<string>`CONCAT(${schema.customers.firstName}, ' ', ${schema.customers.lastName})`,
        customerId: schema.accountsReceivable.customerId,
        totalAmount: schema.accountsReceivable.totalAmount,
        paidAmount: schema.accountsReceivable.paidAmount,
        balance: schema.accountsReceivable.balance,
        status: schema.accountsReceivable.status,
        dueDate: schema.accountsReceivable.dueDate,
        createdAt: schema.accountsReceivable.createdAt,
      })
      .from(schema.accountsReceivable)
      .innerJoin(schema.sales, eq(schema.accountsReceivable.saleId, schema.sales.id))
      .innerJoin(schema.customers, eq(schema.accountsReceivable.customerId, schema.customers.id))
      .where(eq(schema.accountsReceivable.id, id))
      .limit(1);

    if (!account) throw new NotFoundException('Cuenta por cobrar no encontrada');

    // Get payments
    const payments = await this.db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        paymentMethod: schema.payments.paymentMethod,
        reference: schema.payments.reference,
        notes: schema.payments.notes,
        receivedByName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
        createdAt: schema.payments.createdAt,
      })
      .from(schema.payments)
      .innerJoin(schema.users, eq(schema.payments.receivedBy, schema.users.id))
      .where(eq(schema.payments.accountReceivableId, id))
      .orderBy(desc(schema.payments.createdAt));

    return { ...account, payments };
  }

  async registerPayment(
    accountId: string,
    data: { amount: string; paymentMethod?: string; reference?: string; notes?: string },
    userId: string,
  ) {
    const account = await this.findOne(accountId);
    const amount = parseFloat(data.amount);
    const currentBalance = parseFloat(account.balance);

    if (amount <= 0) throw new BadRequestException('El monto debe ser mayor a 0');
    if (amount > currentBalance) throw new BadRequestException(`El monto excede el balance pendiente: RD$${currentBalance.toFixed(2)}`);

    // Create payment
    const [payment] = await this.db
      .insert(schema.payments)
      .values({
        accountReceivableId: accountId,
        amount: data.amount,
        paymentMethod: data.paymentMethod || 'EFECTIVO',
        reference: data.reference,
        notes: data.notes,
        receivedBy: userId,
      })
      .returning();

    // Update account
    const newPaidAmount = parseFloat(account.paidAmount) + amount;
    const newBalance = currentBalance - amount;
    const newStatus = newBalance <= 0 ? 'PAGADA' : 'PARCIAL';

    await this.db
      .update(schema.accountsReceivable)
      .set({
        paidAmount: newPaidAmount.toFixed(2),
        balance: newBalance.toFixed(2),
        status: newStatus as any,
        updatedAt: new Date(),
      })
      .where(eq(schema.accountsReceivable.id, accountId));

    // Update customer debt
    await this.db
      .update(schema.customers)
      .set({
        currentDebt: sql`GREATEST(${schema.customers.currentDebt}::numeric - ${amount}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, account.customerId));

    // Notificar pago recibido
    await this.notificationsService.notifyAdmins(
      'PAGO_RECIBIDO',
      'Pago recibido',
      `Se recibió un pago de RD$${amount.toFixed(2)} para la cuenta de ${account.customerName} (Venta ${account.saleNumber})`,
      { accountId, amount: amount.toFixed(2), newBalance: newBalance.toFixed(2), newStatus },
    );

    return { payment, newBalance: newBalance.toFixed(2), newStatus };
  }

  async getAgingReport() {
    const now = new Date();

    const accounts = await this.db
      .select({
        id: schema.accountsReceivable.id,
        customerName: sql<string>`CONCAT(${schema.customers.firstName}, ' ', ${schema.customers.lastName})`,
        customerId: schema.accountsReceivable.customerId,
        saleNumber: schema.sales.saleNumber,
        totalAmount: schema.accountsReceivable.totalAmount,
        balance: schema.accountsReceivable.balance,
        dueDate: schema.accountsReceivable.dueDate,
        createdAt: schema.accountsReceivable.createdAt,
        daysOverdue: sql<number>`GREATEST(EXTRACT(DAY FROM NOW() - ${schema.accountsReceivable.dueDate}), 0)::int`,
      })
      .from(schema.accountsReceivable)
      .innerJoin(schema.sales, eq(schema.accountsReceivable.saleId, schema.sales.id))
      .innerJoin(schema.customers, eq(schema.accountsReceivable.customerId, schema.customers.id))
      .where(
        or(
          eq(schema.accountsReceivable.status, 'PENDIENTE'),
          eq(schema.accountsReceivable.status, 'PARCIAL'),
          eq(schema.accountsReceivable.status, 'VENCIDA'),
        ),
      )
      .orderBy(desc(sql`EXTRACT(DAY FROM NOW() - ${schema.accountsReceivable.dueDate})`));

    // Categorize
    const current = accounts.filter((a) => a.daysOverdue === 0);
    const days1to30 = accounts.filter((a) => a.daysOverdue > 0 && a.daysOverdue <= 30);
    const days31to60 = accounts.filter((a) => a.daysOverdue > 30 && a.daysOverdue <= 60);
    const days61to90 = accounts.filter((a) => a.daysOverdue > 60 && a.daysOverdue <= 90);
    const over90 = accounts.filter((a) => a.daysOverdue > 90);

    const sumBalance = (arr: typeof accounts) =>
      arr.reduce((acc, a) => acc + parseFloat(a.balance), 0);

    return {
      summary: {
        current: { count: current.length, total: sumBalance(current) },
        '1-30': { count: days1to30.length, total: sumBalance(days1to30) },
        '31-60': { count: days31to60.length, total: sumBalance(days31to60) },
        '61-90': { count: days61to90.length, total: sumBalance(days61to90) },
        '90+': { count: over90.length, total: sumBalance(over90) },
        totalPending: sumBalance(accounts),
      },
      accounts,
    };
  }

  async getCustomerStatement(customerId: string) {
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .limit(1);

    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const accounts = await this.db
      .select({
        id: schema.accountsReceivable.id,
        saleNumber: schema.sales.saleNumber,
        totalAmount: schema.accountsReceivable.totalAmount,
        paidAmount: schema.accountsReceivable.paidAmount,
        balance: schema.accountsReceivable.balance,
        status: schema.accountsReceivable.status,
        dueDate: schema.accountsReceivable.dueDate,
        createdAt: schema.accountsReceivable.createdAt,
      })
      .from(schema.accountsReceivable)
      .innerJoin(schema.sales, eq(schema.accountsReceivable.saleId, schema.sales.id))
      .where(eq(schema.accountsReceivable.customerId, customerId))
      .orderBy(desc(schema.accountsReceivable.createdAt));

    return {
      customer: {
        name: `${customer.firstName} ${customer.lastName}`,
        creditLimit: customer.creditLimit,
        currentDebt: customer.currentDebt,
      },
      accounts,
    };
  }
}
