import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as schema from './schema';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const [admin] = await db
    .insert(schema.users)
    .values({
      email: 'admin@keravep.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'KERAVEP',
      role: 'ADMIN',
    })
    .onConflictDoNothing()
    .returning();

  // Create seller
  const sellerPassword = await bcrypt.hash('vendedor123', 10);
  const [seller] = await db
    .insert(schema.users)
    .values({
      email: 'vendedor@keravep.com',
      password: sellerPassword,
      firstName: 'Carlos',
      lastName: 'Vendedor',
      role: 'VENDEDOR',
      phone: '809-555-0001',
    })
    .onConflictDoNothing()
    .returning();

  // Create warehouse manager
  const warehousePassword = await bcrypt.hash('almacen123', 10);
  const [warehouseUser] = await db
    .insert(schema.users)
    .values({
      email: 'almacen@keravep.com',
      password: warehousePassword,
      firstName: 'María',
      lastName: 'Almacenera',
      role: 'ALMACENERO',
      phone: '809-555-0002',
    })
    .onConflictDoNothing()
    .returning();

  console.log('✅ Users created');

  // Categories
  const categoryData = [
    { name: 'Shampoo', description: 'Productos de limpieza capilar' },
    { name: 'Acondicionador', description: 'Productos de acondicionamiento' },
    { name: 'Tratamiento', description: 'Tratamientos capilares especializados' },
    { name: 'Coloración', description: 'Tintes y productos de color' },
    { name: 'Styling', description: 'Productos de peinado y estilizado' },
    { name: 'Materia Prima', description: 'Ingredientes para producción' },
  ];

  const cats = await db
    .insert(schema.categories)
    .values(categoryData)
    .onConflictDoNothing()
    .returning();

  console.log('✅ Categories created');

  // Products
  const productData = [
    { name: 'Shampoo Keratina 500ml', sku: 'SH-KER-500', categoryId: cats[0]?.id, type: 'TERMINADO' as const, price: '350.00', cost: '120.00', minStock: 20, unit: 'unidad' },
    { name: 'Shampoo Coco 300ml', sku: 'SH-COC-300', categoryId: cats[0]?.id, type: 'TERMINADO' as const, price: '250.00', cost: '80.00', minStock: 15, unit: 'unidad' },
    { name: 'Acondicionador Keratina 500ml', sku: 'AC-KER-500', categoryId: cats[1]?.id, type: 'TERMINADO' as const, price: '380.00', cost: '130.00', minStock: 20, unit: 'unidad' },
    { name: 'Tratamiento Reconstructor', sku: 'TR-REC-250', categoryId: cats[2]?.id, type: 'TERMINADO' as const, price: '550.00', cost: '200.00', minStock: 10, unit: 'unidad' },
    { name: 'Mascarilla Hidratante 300ml', sku: 'TR-HID-300', categoryId: cats[2]?.id, type: 'TERMINADO' as const, price: '420.00', cost: '150.00', minStock: 12, unit: 'unidad' },
    { name: 'Tinte Negro Natural', sku: 'CO-NEG-60', categoryId: cats[3]?.id, type: 'TERMINADO' as const, price: '180.00', cost: '60.00', minStock: 30, unit: 'unidad' },
    { name: 'Gel Fijador Extra Fuerte', sku: 'ST-GEL-250', categoryId: cats[4]?.id, type: 'TERMINADO' as const, price: '200.00', cost: '70.00', minStock: 25, unit: 'unidad' },
    { name: 'Crema para Peinar 200ml', sku: 'ST-CRE-200', categoryId: cats[4]?.id, type: 'TERMINADO' as const, price: '280.00', cost: '95.00', minStock: 18, unit: 'unidad' },
    { name: 'Base de Keratina (Litro)', sku: 'MP-KER-1L', categoryId: cats[5]?.id, type: 'MATERIA_PRIMA' as const, price: '0', cost: '800.00', minStock: 5, unit: 'litro' },
    { name: 'Fragancia Coco Concentrada', sku: 'MP-FCO-500', categoryId: cats[5]?.id, type: 'MATERIA_PRIMA' as const, price: '0', cost: '450.00', minStock: 3, unit: 'litro' },
  ];

  const prods = await db
    .insert(schema.products)
    .values(productData)
    .onConflictDoNothing()
    .returning();

  console.log('✅ Products created');

  // Warehouses  
  const [centralWarehouse] = await db
    .insert(schema.warehouses)
    .values([
      { name: 'Almacén Central', type: 'CENTRAL' as const, address: 'Calle Principal #123, Santo Domingo' },
      { name: 'Guagüita Carlos', type: 'MOVIL' as const, assignedUserId: seller?.id, address: 'Móvil - Zona Norte' },
    ])
    .onConflictDoNothing()
    .returning();

  console.log('✅ Warehouses created');

  // Stock in central warehouse
  if (centralWarehouse && prods.length > 0) {
    const stockData = prods.map((p, i) => ({
      warehouseId: centralWarehouse.id,
      productId: p.id,
      quantity: 50 + i * 10,
    }));

    await db.insert(schema.warehouseStock).values(stockData).onConflictDoNothing();
    console.log('✅ Initial stock created');
  }

  // Customers
  const customerData = [
    { firstName: 'Ana', lastName: 'García', email: 'ana@email.com', phone: '809-555-1001', creditLimit: '5000.00', address: 'Av. Independencia #456' },
    { firstName: 'Pedro', lastName: 'Martínez', email: 'pedro@email.com', phone: '809-555-1002', creditLimit: '3000.00', address: 'Calle Duarte #789' },
    { firstName: 'Luisa', lastName: 'Fernández', email: 'luisa@email.com', phone: '809-555-1003', creditLimit: '8000.00', address: 'Av. 27 de Febrero #321' },
    { firstName: 'José', lastName: 'Rodríguez', phone: '809-555-1004', creditLimit: '2000.00', address: 'Calle El Conde #654' },
    { firstName: 'Carmen', lastName: 'López', email: 'carmen@email.com', phone: '809-555-1005', creditLimit: '10000.00', address: 'Santiago Centro' },
  ];

  await db.insert(schema.customers).values(customerData).onConflictDoNothing();
  console.log('✅ Customers created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin:      admin@keravep.com / admin123');
  console.log('  Vendedor:   vendedor@keravep.com / vendedor123');
  console.log('  Almacenero: almacen@keravep.com / almacen123');

  await pool.end();
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
