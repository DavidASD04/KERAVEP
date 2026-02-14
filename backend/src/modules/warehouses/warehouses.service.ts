import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, count, sum, ilike, or } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import * as schema from '../../database/schema';

@Injectable()
export class WarehousesService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findAll(search?: string) {
    const conditions = search
      ? or(ilike(schema.warehouses.name, `%${search}%`), ilike(schema.warehouses.address, `%${search}%`))
      : undefined;

    return this.db
      .select({
        id: schema.warehouses.id,
        name: schema.warehouses.name,
        type: schema.warehouses.type,
        address: schema.warehouses.address,
        assignedUserId: schema.warehouses.assignedUserId,
        isActive: schema.warehouses.isActive,
        createdAt: schema.warehouses.createdAt,
        assignedUserName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
      })
      .from(schema.warehouses)
      .leftJoin(schema.users, eq(schema.warehouses.assignedUserId, schema.users.id))
      .where(conditions)
      .orderBy(schema.warehouses.name);
  }

  async findOne(id: string) {
    const [warehouse] = await this.db
      .select()
      .from(schema.warehouses)
      .where(eq(schema.warehouses.id, id))
      .limit(1);

    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    return warehouse;
  }

  async create(data: any) {
    const [warehouse] = await this.db.insert(schema.warehouses).values(data).returning();
    return warehouse;
  }

  async update(id: string, data: any) {
    const [warehouse] = await this.db
      .update(schema.warehouses)
      .set(data)
      .where(eq(schema.warehouses.id, id))
      .returning();

    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    return warehouse;
  }

  // Stock management
  async getStock(warehouseId: string, search?: string) {
    const conditions: any[] = [eq(schema.warehouseStock.warehouseId, warehouseId)];
    if (search) {
      conditions.push(
        or(
          ilike(schema.products.name, `%${search}%`),
          ilike(schema.products.sku, `%${search}%`),
        ),
      );
    }

    return this.db
      .select({
        id: schema.warehouseStock.id,
        productId: schema.warehouseStock.productId,
        productName: schema.products.name,
        productSku: schema.products.sku,
        productUnit: schema.products.unit,
        productPrice: schema.products.price,
        minStock: schema.products.minStock,
        quantity: schema.warehouseStock.quantity,
        updatedAt: schema.warehouseStock.updatedAt,
      })
      .from(schema.warehouseStock)
      .innerJoin(schema.products, eq(schema.warehouseStock.productId, schema.products.id))
      .where(and(...conditions))
      .orderBy(schema.products.name);
  }

  async adjustStock(warehouseId: string, productId: string, quantity: number, type: string, userId: string, reason?: string, referenceId?: string) {
    // Get or create stock record
    let [stock] = await this.db
      .select()
      .from(schema.warehouseStock)
      .where(
        and(
          eq(schema.warehouseStock.warehouseId, warehouseId),
          eq(schema.warehouseStock.productId, productId),
        ),
      )
      .limit(1);

    const previousStock = stock?.quantity ?? 0;
    const newStock = previousStock + quantity;

    if (newStock < 0) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${previousStock}`);
    }

    if (stock) {
      await this.db
        .update(schema.warehouseStock)
        .set({ quantity: newStock, updatedAt: new Date() })
        .where(eq(schema.warehouseStock.id, stock.id));
    } else {
      await this.db.insert(schema.warehouseStock).values({
        warehouseId,
        productId,
        quantity: newStock,
      });
    }

    // Record movement
    await this.db.insert(schema.stockMovements).values({
      warehouseId,
      productId,
      type: type as any,
      quantity,
      previousStock,
      newStock,
      reason,
      referenceId,
      userId,
    });

    return { productId, previousStock, newStock, quantity };
  }

  async getMovements(warehouseId: string, query?: { page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const offset = (page - 1) * limit;

    const movements = await this.db
      .select({
        id: schema.stockMovements.id,
        productId: schema.stockMovements.productId,
        productName: schema.products.name,
        productSku: schema.products.sku,
        type: schema.stockMovements.type,
        quantity: schema.stockMovements.quantity,
        previousStock: schema.stockMovements.previousStock,
        newStock: schema.stockMovements.newStock,
        reason: schema.stockMovements.reason,
        userName: sql<string>`CONCAT(${schema.users.firstName}, ' ', ${schema.users.lastName})`,
        createdAt: schema.stockMovements.createdAt,
      })
      .from(schema.stockMovements)
      .innerJoin(schema.products, eq(schema.stockMovements.productId, schema.products.id))
      .innerJoin(schema.users, eq(schema.stockMovements.userId, schema.users.id))
      .where(eq(schema.stockMovements.warehouseId, warehouseId))
      .orderBy(desc(schema.stockMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return { data: movements, page, limit };
  }

  async getStockSummary(warehouseId: string) {
    const [summary] = await this.db
      .select({
        totalProducts: count(schema.warehouseStock.id),
        totalUnits: sum(schema.warehouseStock.quantity),
      })
      .from(schema.warehouseStock)
      .where(eq(schema.warehouseStock.warehouseId, warehouseId));

    // Low stock items
    const lowStock = await this.db
      .select({
        productName: schema.products.name,
        productSku: schema.products.sku,
        quantity: schema.warehouseStock.quantity,
        minStock: schema.products.minStock,
      })
      .from(schema.warehouseStock)
      .innerJoin(schema.products, eq(schema.warehouseStock.productId, schema.products.id))
      .where(
        and(
          eq(schema.warehouseStock.warehouseId, warehouseId),
          sql`${schema.warehouseStock.quantity} <= ${schema.products.minStock}`,
        ),
      );

    return { ...summary, lowStockItems: lowStock };
  }

  async addStockEntry(warehouseId: string, data: { productId: string; quantity: number; reason?: string }, userId: string) {
    return this.adjustStock(warehouseId, data.productId, Math.abs(data.quantity), 'ENTRADA', userId, data.reason);
  }

  async removeStock(warehouseId: string, data: { productId: string; quantity: number; reason?: string }, userId: string) {
    return this.adjustStock(warehouseId, data.productId, -Math.abs(data.quantity), 'SALIDA', userId, data.reason);
  }
}
