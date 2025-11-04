import express from 'express';
import { prisma } from '../prismaClient.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.post('/crear', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { clienteId, items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items vacíos' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // validar stock y calcular total
      let total = 0;
      for (const it of items) {
        const prod = await tx.producto.findUnique({ where: { id: it.productoId } });
        if (!prod) throw new Error(`Producto no encontrado: ${it.productoId}`);
        if (prod.stock < it.cantidad) throw new Error(`Stock insuficiente para ${prod.nombre}`);
        total += Number(it.cantidad) * Number(it.precioUnit);
      }

      // crear venta
      const venta = await tx.venta.create({
        data: {
          clienteId: clienteId || null,
          usuarioId: userId,
          total: total.toFixed(2),
          estado: 'COMPLETADA'
        }
      });

      // crear items, decrementar stock y crear movimiento
      for (const it of items) {
        await tx.itemVenta.create({
          data: {
            ventaId: venta.id,
            productoId: it.productoId,
            cantidad: it.cantidad,
            precioUnit: it.precioUnit.toString(),
            subtotal: (Number(it.cantidad) * Number(it.precioUnit)).toFixed(2)
          }
        });

        // decrementar stock
        await tx.producto.update({
          where: { id: it.productoId },
          data: { stock: { decrement: it.cantidad } }
        });

        // movimiento inventario
        await tx.movimientoInventario.create({
          data: {
            productoId: it.productoId,
            cantidad: it.cantidad,
            tipo: 'SALIDA',
            motivo: `Venta ${venta.id}`,
            ventaRelacionada: venta.id,
            creadoPor: userId
          }
        });
      }

      return venta;
    });

    res.json({ ok: true, venta: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar ventas (simple)
router.get('/', requireAuth, async (req, res) => {
  const ventas = await prisma.venta.findMany({
    include: { items: true, cliente: true, usuario: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(ventas);
});

export default router;
