import express from 'express';
import { prisma } from '../prismaClient.js';
import { requireAuth } from '../middlewares/auth.js';
import { registrarLog } from '../middlewares/logger.js';

const router = express.Router();

router.post('/crear', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { clienteId, items, metodoPago, esCredito } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Items vacíos' });

  try {
    const venta = await prisma.$transaction(async (tx) => {
      let total = 0;
      for (const it of items) {
        const prod = await tx.producto.findUnique({ where: { id: it.productoId } });
        if (!prod) throw new Error(`Producto no encontrado: ${it.productoId}`);
        if (prod.stock < it.cantidad) throw new Error(`Stock insuficiente para ${prod.nombre}`);
        total += Number(it.cantidad) * Number(it.precioUnit);
      }

      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId: clienteId || null,
          usuarioId: userId,
          total: total.toFixed(2),
          estado: 'COMPLETADA',
          metodoPago: esCredito ? 'EFECTIVO' : metodoPago,
          esCredito: esCredito ?? false,
        },
      });

      for (const it of items) {
        await tx.itemVenta.create({
          data: {
            ventaId: nuevaVenta.id,
            productoId: it.productoId,
            cantidad: it.cantidad,
            precioUnit: it.precioUnit.toString(),
            subtotal: (Number(it.cantidad) * Number(it.precioUnit)).toFixed(2),
          },
        });

        await tx.producto.update({
          where: { id: it.productoId },
          data: { stock: { decrement: it.cantidad } },
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: it.productoId,
            cantidad: it.cantidad,
            tipo: 'SALIDA',
            motivo: `Venta ${nuevaVenta.id}`,
            ventaRelacionada: nuevaVenta.id,
            creadoPor: userId,
          },
        });
      }

      if (!esCredito) {
        await tx.movimientoFinanciero.create({
          data: {
            tipo: 'INGRESO',
            categoria: 'VENTA',
            monto: total.toFixed(2),
            descripcion: `Venta ${nuevaVenta.id}`,
            usuarioId: userId,
          },
        });
      }

      return nuevaVenta;
    });

    await registrarLog(
      req,
      'VENTA_CREADA',
      `Venta ${venta.id} creada por ${req.user.email} (${esCredito ? 'fiado' : metodoPago})`
    );

    res.json({ ok: true, venta });
  } catch (err) {
    console.error('Error al crear venta:', err);
    res.status(400).json({ error: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        items: { include: { producto: true } },
        cliente: true,
        usuario: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

export default router;
