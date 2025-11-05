import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('Insertando datos iniciales...');

  console.log('Esperando 3 segundos para asegurar que las tablas se crearon...');
  await delay(3000);

  const hashedPassword = await bcrypt.hash('123456', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@panaderia.com' },
    update: {},
    create: {
      nombre: 'Administrador General',
      email: 'admin@panaderia.com',
      password: hashedPassword,
      rol: 'ADMIN',
      telefono: '999999999',
    },
  });

  // Cliente genérico
  const cliente = await prisma.cliente.upsert({
    where: { email: 'generico@venta.com' },
    update: {},
    create: {
      nombre: 'Venta Mostrador',
      email: 'generico@venta.com',
      telefono: '000000000',
    },
  });

  // Producto inicial
  const producto = await prisma.producto.upsert({
    where: { codigo: 'PAN001' },
    update: {},
    create: {
      codigo: 'PAN001',
      nombre: 'Pan Francés',
      descripcion: 'Pan básico de mostrador',
      precio: new Prisma.Decimal(0.3),
      stock: 100,
      activo: true,
    },
  });

  // Movimiento de inventario inicial
  await prisma.movimientoInventario.create({
    data: {
      productoId: producto.id,
      cantidad: 100,
      tipo: 'ENTRADA',
      motivo: 'Stock inicial',
      creadoPor: admin.id, 
    },
  });

  console.log('✅ Seed completo: admin + cliente + producto + stock inicial');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
