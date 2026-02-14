# KERAVEP - Sistema de Gestión Empresarial

Sistema de gestión integral para empresas de venta y producción de productos capilares.

## Stack Tecnológico

- **Backend:** NestJS + TypeScript + Drizzle ORM
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + shadcn/ui
- **Base de Datos:** PostgreSQL 15
- **Infraestructura:** Docker

## Inicio Rápido

```bash
# 1. Levantar PostgreSQL
docker-compose up -d

# 2. Backend
cd backend
pnpm install
pnpm db:push
pnpm db:seed
pnpm start:dev

# 3. Frontend
cd frontend
pnpm install
pnpm dev
```

## Módulos

- Autenticación (JWT)
- Almacén e Inventario
- Clientes
- Ventas (POS)
- Cuentas por Cobrar
- Actividad de Vendedores
