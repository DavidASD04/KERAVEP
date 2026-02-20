import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, or, isNull, count, sql } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import * as schema from '../../database/schema';

export type NotificationType =
  | 'STOCK_BAJO'
  | 'STOCK_AGOTADO'
  | 'NUEVA_VENTA'
  | 'VENTA_CANCELADA'
  | 'NUEVO_CLIENTE'
  | 'PAGO_RECIBIDO'
  | 'CUENTA_VENCIDA'
  | 'CIERRE_CAJA'
  | 'SESION_CERRADA'
  | 'USUARIO_DESACTIVADO'
  | 'TRANSFERENCIA'
  | 'SISTEMA';

interface CreateNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  targetRole?: 'ADMIN' | 'VENDEDOR' | 'ALMACENERO';
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async create(data: CreateNotificationDto) {
    const [notification] = await this.db
      .insert(schema.notifications)
      .values({
        type: data.type,
        title: data.title,
        message: data.message,
        userId: data.userId || null,
        targetRole: data.targetRole || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })
      .returning();

    return notification;
  }

  /**
   * Notifica a todos los administradores
   */
  async notifyAdmins(type: NotificationType, title: string, message: string, metadata?: Record<string, any>) {
    return this.create({ type, title, message, targetRole: 'ADMIN', metadata });
  }

  /**
   * Notifica a un usuario específico
   */
  async notifyUser(userId: string, type: NotificationType, title: string, message: string, metadata?: Record<string, any>) {
    return this.create({ type, title, message, userId, metadata });
  }

  /**
   * Obtiene las notificaciones para un usuario dado su ID y rol
   */
  async findForUser(userId: string, userRole: string, query?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = query?.page || 1;
    const limit = query?.limit || 30;
    const offset = (page - 1) * limit;

    // Las notificaciones visibles para este usuario son:
    // 1. Las dirigidas específicamente a él (userId)
    // 2. Las dirigidas a su rol (targetRole)
    // 3. Las que no tienen userId ni targetRole (globales)
    const conditions = or(
      eq(schema.notifications.userId, userId),
      eq(schema.notifications.targetRole, userRole as any),
      and(isNull(schema.notifications.userId), isNull(schema.notifications.targetRole)),
    );

    const whereConditions = query?.unreadOnly
      ? and(conditions, eq(schema.notifications.isRead, false))
      : conditions;

    const [notifications, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.notifications)
        .where(whereConditions)
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.notifications).where(whereConditions),
    ]);

    return {
      data: notifications.map((n) => ({
        ...n,
        metadata: n.metadata ? JSON.parse(n.metadata) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cuenta notificaciones no leídas para un usuario
   */
  async getUnreadCount(userId: string, userRole: string): Promise<number> {
    const conditions = and(
      eq(schema.notifications.isRead, false),
      or(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.targetRole, userRole as any),
        and(isNull(schema.notifications.userId), isNull(schema.notifications.targetRole)),
      ),
    );

    const [result] = await this.db
      .select({ count: count() })
      .from(schema.notifications)
      .where(conditions);

    return result?.count || 0;
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(id: string) {
    const [notification] = await this.db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, id))
      .returning();

    return notification;
  }

  /**
   * Marca todas las notificaciones como leídas para un usuario
   */
  async markAllAsRead(userId: string, userRole: string) {
    const conditions = or(
      eq(schema.notifications.userId, userId),
      eq(schema.notifications.targetRole, userRole as any),
      and(isNull(schema.notifications.userId), isNull(schema.notifications.targetRole)),
    );

    await this.db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(and(conditions, eq(schema.notifications.isRead, false)));

    return { message: 'Todas las notificaciones marcadas como leídas' };
  }

  /**
   * Elimina una notificación
   */
  async remove(id: string) {
    await this.db.delete(schema.notifications).where(eq(schema.notifications.id, id));
    return { message: 'Notificación eliminada' };
  }
}
