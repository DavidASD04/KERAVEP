import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, ilike, or, and, count, sql, sum, gte } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import { NotificationsService } from '../notifications/notifications.service';
import * as schema from '../../database/schema';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(query?: { search?: string; role?: string; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query?.search) {
      conditions.push(
        or(
          ilike(schema.users.firstName, `%${query.search}%`),
          ilike(schema.users.lastName, `%${query.search}%`),
          ilike(schema.users.email, `%${query.search}%`),
        ),
      );
    }
    if (query?.role) {
      conditions.push(eq(schema.users.role, query.role as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [users, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          role: schema.users.role,
          phone: schema.users.phone,
          zone: schema.users.zone,
          isActive: schema.users.isActive,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .where(where)
        .orderBy(desc(schema.users.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.users).where(where),
    ]);

    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.users.role,
        phone: schema.users.phone,
        zone: schema.users.zone,
        isActive: schema.users.isActive,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, data: any) {
    const [user] = await this.db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();

    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { password: _, ...result } = user;
    return result;
  }

  async toggleActive(id: string) {
    const existing = await this.findOne(id);
    const result = await this.update(id, { isActive: !existing.isActive });

    if (!existing.isActive === false) {
      // Se está desactivando
      await this.notificationsService.notifyAdmins(
        'USUARIO_DESACTIVADO',
        'Usuario desactivado',
        `El usuario ${existing.firstName} ${existing.lastName} ha sido desactivado`,
        { userId: id },
      );
    }

    return result;
  }

  // === Seller Zone/Route Management ===
  async updateSellerZone(id: string, zone: string) {
    return this.update(id, { zone });
  }

  // Get sellers with their zones and assigned warehouses
  async getSellersWithAssignments() {
    const sellers = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        zone: schema.users.zone,
        isActive: schema.users.isActive,
      })
      .from(schema.users)
      .where(eq(schema.users.role, 'VENDEDOR'))
      .orderBy(schema.users.firstName);

    // For each seller, get their assigned mobile warehouse
    const result: any[] = [];
    for (const seller of sellers) {
      const [mobileWarehouse] = await this.db
        .select({
          id: schema.warehouses.id,
          name: schema.warehouses.name,
          type: schema.warehouses.type,
        })
        .from(schema.warehouses)
        .where(
          and(
            eq(schema.warehouses.assignedUserId, seller.id),
            eq(schema.warehouses.type, 'MOVIL'),
          ),
        )
        .limit(1);

      result.push({
        ...seller,
        mobileWarehouse: mobileWarehouse || null,
      });
    }

    return result;
  }

  // Get a seller's mobile inventory
  async getSellerMobileInventory(sellerId: string) {
    // Find the seller's mobile warehouse
    const [mobileWarehouse] = await this.db
      .select()
      .from(schema.warehouses)
      .where(
        and(
          eq(schema.warehouses.assignedUserId, sellerId),
          eq(schema.warehouses.type, 'MOVIL'),
        ),
      )
      .limit(1);

    if (!mobileWarehouse) {
      return { warehouse: null, stock: [], message: 'Este vendedor no tiene almacén móvil asignado' };
    }

    const stock = await this.db
      .select({
        productId: schema.warehouseStock.productId,
        productName: schema.products.name,
        productSku: schema.products.sku,
        productUnit: schema.products.unit,
        productPrice: schema.products.price,
        quantity: schema.warehouseStock.quantity,
        minStock: schema.products.minStock,
      })
      .from(schema.warehouseStock)
      .innerJoin(schema.products, eq(schema.warehouseStock.productId, schema.products.id))
      .where(eq(schema.warehouseStock.warehouseId, mobileWarehouse.id))
      .orderBy(schema.products.name);

    return { warehouse: mobileWarehouse, stock };
  }

  // Get a seller's product sales summary (products "assigned" = sold by this seller)
  async getSellerProductsSummary(sellerId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await this.db
      .select({
        productId: schema.products.id,
        productName: schema.products.name,
        productSku: schema.products.sku,
        totalQuantitySold: sum(schema.saleItems.quantity),
        totalRevenue: sum(schema.saleItems.subtotal),
        lastSaleDate: sql<string>`MAX(${schema.sales.createdAt})`,
      })
      .from(schema.saleItems)
      .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
      .innerJoin(schema.products, eq(schema.saleItems.productId, schema.products.id))
      .where(
        and(
          eq(schema.sales.userId, sellerId),
          eq(schema.sales.status, 'COMPLETADA'),
          gte(schema.sales.createdAt, thirtyDaysAgo),
        ),
      )
      .groupBy(schema.products.id, schema.products.name, schema.products.sku)
      .orderBy(desc(sum(schema.saleItems.subtotal)));

    return products;
  }
}
