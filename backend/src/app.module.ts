import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesModule } from './modules/sales/sales.module';
import { AccountsReceivableModule } from './modules/accounts-receivable/accounts-receivable.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CashClosingsModule } from './modules/cash-closings/cash-closings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    WarehousesModule,
    CustomersModule,
    SalesModule,
    AccountsReceivableModule,
    DashboardModule,
    CashClosingsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
