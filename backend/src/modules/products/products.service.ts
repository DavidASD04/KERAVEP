import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, desc, ilike, or, and, count, sql } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import * as schema from '../../database/schema';

@Injectable()
export class ProductsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findAll(query?: { search?: string; categoryId?: string; type?: string; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query?.search) {
      conditions.push(
        or(
          ilike(schema.products.name, `%${query.search}%`),
          ilike(schema.products.sku, `%${query.search}%`),
        ),
      );
    }
    if (query?.categoryId) conditions.push(eq(schema.products.categoryId, query.categoryId));
    if (query?.type) conditions.push(eq(schema.products.type, query.type as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [products, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          sku: schema.products.sku,
          description: schema.products.description,
          categoryId: schema.products.categoryId,
          type: schema.products.type,
          price: schema.products.price,
          cost: schema.products.cost,
          minStock: schema.products.minStock,
          unit: schema.products.unit,
          isActive: schema.products.isActive,
          createdAt: schema.products.createdAt,
          categoryName: schema.categories.name,
        })
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(where)
        .orderBy(desc(schema.products.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.products).where(where),
    ]);

    return { data: products, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const [product] = await this.db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        sku: schema.products.sku,
        description: schema.products.description,
        categoryId: schema.products.categoryId,
        type: schema.products.type,
        price: schema.products.price,
        cost: schema.products.cost,
        minStock: schema.products.minStock,
        unit: schema.products.unit,
        isActive: schema.products.isActive,
        createdAt: schema.products.createdAt,
        categoryName: schema.categories.name,
      })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(eq(schema.products.id, id))
      .limit(1);

    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(data: any) {
    try {
      const [product] = await this.db.insert(schema.products).values(data).returning();
      return product;
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('El SKU ya existe');
      throw e;
    }
  }

  async update(id: string, data: any) {
    const [product] = await this.db
      .update(schema.products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();

    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async remove(id: string) {
    const [product] = await this.db.delete(schema.products).where(eq(schema.products.id, id)).returning();
    if (!product) throw new NotFoundException('Producto no encontrado');
    return { message: 'Producto eliminado' };
  }
}
