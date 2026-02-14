import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============ ENUMS ============
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'ALMACENERO', 'VENDEDOR']);
export const saleTypeEnum = pgEnum('sale_type', ['CONTADO', 'CREDITO']);
export const saleStatusEnum = pgEnum('sale_status', ['COMPLETADA', 'CANCELADA', 'PENDIENTE']);
export const transferStatusEnum = pgEnum('transfer_status', ['PENDIENTE', 'COMPLETADA', 'CANCELADA']);
export const movementTypeEnum = pgEnum('movement_type', ['ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'TRANSFERENCIA', 'PRODUCCION']);
export const accountStatusEnum = pgEnum('account_status', ['PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA']);
export const warehouseTypeEnum = pgEnum('warehouse_type', ['CENTRAL', 'MOVIL']);
export const productTypeEnum = pgEnum('product_type', ['TERMINADO', 'MATERIA_PRIMA']);

// ============ USERS ============
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('VENDEDOR'),
  isActive: boolean('is_active').notNull().default(true),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ CATEGORIES ============
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ PRODUCTS ============
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  sku: varchar('sku', { length: 50 }).notNull().unique(),
  description: text('description'),
  categoryId: uuid('category_id').references(() => categories.id),
  type: productTypeEnum('type').notNull().default('TERMINADO'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0'),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull().default('0'),
  minStock: integer('min_stock').notNull().default(0),
  unit: varchar('unit', { length: 20 }).notNull().default('unidad'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ WAREHOUSES ============
export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  type: warehouseTypeEnum('type').notNull().default('CENTRAL'),
  address: text('address'),
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ WAREHOUSE STOCK ============
export const warehouseStock = pgTable('warehouse_stock', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ STOCK MOVEMENTS ============
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  type: movementTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull().default(0),
  newStock: integer('new_stock').notNull().default(0),
  reason: text('reason'),
  referenceId: uuid('reference_id'),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ CUSTOMERS ============
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }).notNull().default('0'),
  currentDebt: decimal('current_debt', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ SALES ============
export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleNumber: varchar('sale_number', { length: 20 }).notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  type: saleTypeEnum('type').notNull(),
  status: saleStatusEnum('status').notNull().default('COMPLETADA'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).notNull().default('0'),
  discount: decimal('discount', { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ SALE ITEMS ============
export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').references(() => sales.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
});

// ============ ACCOUNTS RECEIVABLE ============
export const accountsReceivable = pgTable('accounts_receivable', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').references(() => sales.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  balance: decimal('balance', { precision: 10, scale: 2 }).notNull(),
  status: accountStatusEnum('status').notNull().default('PENDIENTE'),
  dueDate: timestamp('due_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ PAYMENTS ============
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountReceivableId: uuid('account_receivable_id').references(() => accountsReceivable.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('EFECTIVO'),
  reference: varchar('reference', { length: 100 }),
  notes: text('notes'),
  receivedBy: uuid('received_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ TRANSFERS ============
export const transfers = pgTable('transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferNumber: varchar('transfer_number', { length: 20 }).notNull().unique(),
  fromWarehouseId: uuid('from_warehouse_id').references(() => warehouses.id).notNull(),
  toWarehouseId: uuid('to_warehouse_id').references(() => warehouses.id).notNull(),
  status: transferStatusEnum('status').notNull().default('PENDIENTE'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ TRANSFER ITEMS ============
export const transferItems = pgTable('transfer_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferId: uuid('transfer_id').references(() => transfers.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
});

// ============ CASH CLOSINGS ============
export const cashClosings = pgTable('cash_closings', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  date: timestamp('date').notNull(),
  totalCash: decimal('total_cash', { precision: 10, scale: 2 }).notNull().default('0'),
  totalCredit: decimal('total_credit', { precision: 10, scale: 2 }).notNull().default('0'),
  totalSales: decimal('total_sales', { precision: 10, scale: 2 }).notNull().default('0'),
  totalCollections: decimal('total_collections', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ RELATIONS ============
export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  warehouses: many(warehouses),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  warehouseStocks: many(warehouseStock),
  saleItems: many(saleItems),
}));

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  assignedUser: one(users, { fields: [warehouses.assignedUserId], references: [users.id] }),
  stocks: many(warehouseStock),
}));

export const warehouseStockRelations = relations(warehouseStock, ({ one }) => ({
  warehouse: one(warehouses, { fields: [warehouseStock.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [warehouseStock.productId], references: [products.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  accounts: many(accountsReceivable),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
  warehouse: one(warehouses, { fields: [sales.warehouseId], references: [warehouses.id] }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const accountsReceivableRelations = relations(accountsReceivable, ({ one, many }) => ({
  sale: one(sales, { fields: [accountsReceivable.saleId], references: [sales.id] }),
  customer: one(customers, { fields: [accountsReceivable.customerId], references: [customers.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  account: one(accountsReceivable, { fields: [payments.accountReceivableId], references: [accountsReceivable.id] }),
  receivedByUser: one(users, { fields: [payments.receivedBy], references: [users.id] }),
}));

export const transfersRelations = relations(transfers, ({ one, many }) => ({
  fromWarehouse: one(warehouses, { fields: [transfers.fromWarehouseId], references: [warehouses.id] }),
  toWarehouse: one(warehouses, { fields: [transfers.toWarehouseId], references: [warehouses.id] }),
  createdByUser: one(users, { fields: [transfers.createdBy], references: [users.id] }),
  items: many(transferItems),
}));

export const transferItemsRelations = relations(transferItems, ({ one }) => ({
  transfer: one(transfers, { fields: [transferItems.transferId], references: [transfers.id] }),
  product: one(products, { fields: [transferItems.productId], references: [products.id] }),
}));
