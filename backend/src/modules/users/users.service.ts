import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, ilike, or, and, count, sql } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import * as schema from '../../database/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

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
    return this.update(id, { isActive: !existing.isActive });
  }
}
