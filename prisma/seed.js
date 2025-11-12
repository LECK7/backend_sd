import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // --- Usuarios ---
  const adminPass = await bcrypt.hash('admin123', 10)
  const vendedorPass = await bcrypt.hash('vendedor123', 10)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@panaderia.com' },
    update: {},
    create: {
      nombre: 'Administrador General',
      email: 'admin@panaderia.com',
      telefono: '999111222',
      rol: 'ADMIN',
      password: adminPass,
    },
  })

  const vendedor = await prisma.usuario.upsert({
    where: { email: 'vendedor@panaderia.com' },
    update: {},
    create: {
      nombre: 'Juan Pérez',
      email: 'vendedor@panaderia.com',
      telefono: '999333444',
      rol: 'VENDEDOR',
      password: vendedorPass,
    },
  })

  // --- Productos ---
  const productos = await prisma.$transaction([
    prisma.producto.upsert({
      where: { codigo: 'PAN001' },
      update: {},
      create: {
        codigo: 'PAN001',
        nombre: 'Pan Francés',
        descripcion: 'Pan clásico crujiente por fuera y suave por dentro.',
        precio: 0.30,
        stock: 500,
      },
    }),
    prisma.producto.upsert({
      where: { codigo: 'PAN002' },
      update: {},
      create: {
        codigo: 'PAN002',
        nombre: 'Pan Integral',
        descripcion: 'Pan saludable con harina integral.',
        precio: 0.40,
        stock: 300,
      },
    }),
    prisma.producto.upsert({
      where: { codigo: 'PAN003' },
      update: {},
      create: {
        codigo: 'PAN003',
        nombre: 'Torta de Chocolate',
        descripcion: 'Torta artesanal con cacao 70%.',
        precio: 15.00,
        stock: 10,
      },
    }),
  ])

  // --- Clientes ---
  const clientes = await prisma.$transaction([
    prisma.cliente.upsert({
      where: { email: 'maria.lopez@example.com' },
      update: {},
      create: {
        nombre: 'María López',
        email: 'maria.lopez@example.com',
        telefono: '987654321',
        direccion: 'Av. Los Pinos 123',
      },
    }),
    prisma.cliente.upsert({
      where: { email: 'carlos.ramos@example.com' },
      update: {},
      create: {
        nombre: 'Carlos Ramos',
        email: 'carlos.ramos@example.com',
        telefono: '912345678',
        direccion: 'Jr. Lima 456',
      },
    }),
  ])

  // --- Ventas ---
  const venta1 = await prisma.venta.create({
    data: {
      codigo: 'V001',
      usuarioId: vendedor.id,
      clienteId: clientes[0].id,
      total: 30.00,
      metodoPago: 'YAPE',
      esCredito: false,
      items: {
        create: [
          {
            productoId: productos[0].id,
            cantidad: 20,
            precioUnit: 0.30,
            subtotal: 6.00,
          },
          {
            productoId: productos[2].id,
            cantidad: 1,
            precioUnit: 15.00,
            subtotal: 15.00,
          },
        ],
      },
    },
  })

  const venta2 = await prisma.venta.create({
    data: {
      codigo: 'V002',
      usuarioId: vendedor.id,
      clienteId: clientes[1].id,
      total: 40.00,
      metodoPago: 'EFECTIVO',
      esCredito: true,
      estado: 'PENDIENTE',
      items: {
        create: [
          {
            productoId: productos[1].id,
            cantidad: 50,
            precioUnit: 0.40,
            subtotal: 20.00,
          },
        ],
      },
    },
  })

  // --- Movimientos de inventario ---
  await prisma.$transaction([
    prisma.movimientoInventario.create({
      data: {
        productoId: productos[0].id,
        cantidad: 20,
        tipo: 'SALIDA',
        motivo: 'Venta V001',
        ventaRelacionada: venta1.id,
        creadoPor: vendedor.id,
      },
    }),
    prisma.movimientoInventario.create({
      data: {
        productoId: productos[1].id,
        cantidad: 50,
        tipo: 'SALIDA',
        motivo: 'Venta V002 (crédito)',
        ventaRelacionada: venta2.id,
        creadoPor: vendedor.id,
      },
    }),
  ])

  // --- Movimiento financiero ---
  await prisma.movimientoFinanciero.create({
    data: {
      tipo: 'INGRESO',
      categoria: 'Venta diaria',
      monto: 21.00,
      descripcion: 'Pago recibido vía Yape',
      usuarioId: vendedor.id,
    },
  })

  console.log('✅ Seed completado con éxito')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
