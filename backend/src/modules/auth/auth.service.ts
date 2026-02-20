import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE_TOKEN } from '../../database/database.module';
import { Database } from '../../database/connection';
import { NotificationsService } from '../notifications/notifications.service';
import * as schema from '../../database/schema';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async login(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async logout(userId: string) {
    // Obtener info del usuario para la notificación
    const [user] = await this.db
      .select({ firstName: schema.users.firstName, lastName: schema.users.lastName, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (user) {
      await this.notificationsService.notifyAdmins(
        'SESION_CERRADA',
        'Sesión cerrada',
        `${user.firstName} ${user.lastName} (${user.role}) ha cerrado sesión`,
        { userId },
      );
    }

    return { message: 'Sesión cerrada exitosamente' };
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; role?: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: (data.role as any) || 'VENDEDOR',
      })
      .returning();

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    // Notificar a administradores de nuevo registro
    await this.notificationsService.notifyAdmins(
      'SISTEMA',
      'Nuevo usuario registrado',
      `Se registró ${data.firstName} ${data.lastName} con rol ${data.role || 'VENDEDOR'}`,
      { userId: user.id, email: data.email },
    );

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
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
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; currentPassword?: string; newPassword?: string }) {
    // Si se quiere cambiar contraseña, verificar la actual
    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new BadRequestException('Debe proporcionar la contraseña actual');
      }
      const [userWithPw] = await this.db
        .select({ password: schema.users.password })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!userWithPw) throw new UnauthorizedException('Usuario no encontrado');

      const isValid = await bcrypt.compare(data.currentPassword, userWithPw.password);
      if (!isValid) {
        throw new BadRequestException('Contraseña actual incorrecta');
      }

      const hashedPw = await bcrypt.hash(data.newPassword, 10);
      await this.db.update(schema.users).set({ password: hashedPw }).where(eq(schema.users.id, userId));
    }

    // Actualizar campos de perfil
    const updateData: Record<string, any> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;

    if (Object.keys(updateData).length > 0) {
      await this.db.update(schema.users).set(updateData).where(eq(schema.users.id, userId));
    }

    return this.getProfile(userId);
  }
}
