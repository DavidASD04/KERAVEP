import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, ilike, count } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import * as schema from '../../database/schema';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findAll(search?: string) {
    const conditions = search ? ilike(schema.categories.name, `%${search}%`) : undefined;
    return this.db.select().from(schema.categories).where(conditions).orderBy(schema.categories.name);
  }

  async findOne(id: string) {
    const [cat] = await this.db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1);
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  async create(data: { name: string; description?: string }) {
    try {
      const [cat] = await this.db.insert(schema.categories).values(data).returning();
      return cat;
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('La categoría ya existe');
      throw e;
    }
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    const [cat] = await this.db.update(schema.categories).set(data).where(eq(schema.categories.id, id)).returning();
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  async remove(id: string) {
    const [cat] = await this.db.delete(schema.categories).where(eq(schema.categories.id, id)).returning();
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return { message: 'Categoría eliminada' };
  }
}
