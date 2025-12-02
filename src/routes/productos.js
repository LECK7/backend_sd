import express from 'express';
import { prisma } from '../prismaClient.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// LISTAR PRODUCTOS
router.get('/', requireAuth, requireRole(['ADMIN', 'PRODUCCION','VENDEDOR']), async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });

    // LOG antes de responder
    if (typeof registrarLog === "function") {
      await registrarLog(req, "PRODUCTOS_LISTADOS", `Productos listados por ${req.user.email}`);
    }

    return res.json(productos);

  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener los productos' });
  }
});

// OBTENER UNO
router.get('/:id', requireAuth, requireRole(['ADMIN', 'PRODUCCION','VENDEDOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await prisma.producto.findUnique({ where: { id } });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json(producto);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// CREAR PRODUCTO
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { codigo, nombre, descripcion, precio, stock, activo } = req.body;

    const producto = await prisma.producto.create({
      data: { codigo, nombre, descripcion, precio: precio.toString(), stock, activo }
    });

    if (typeof registrarLog === "function") {
      await registrarLog(req, "PRODUCTO_CREADO", `Producto ${producto.id} creado por ${req.user.email}`);
    }

    return res.json(producto);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ACTUALIZAR PRODUCTO
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.precio) data.precio = data.precio.toString();

    const producto = await prisma.producto.update({ where: { id }, data });

    if (typeof registrarLog === "function") {
      await registrarLog(req, "PRODUCTO_ACTUALIZADO", `Producto ${producto.id} actualizado por ${req.user.email}`);
    }

    return res.json(producto);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ELIMINAR (DESACTIVAR)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.producto.update({
      where: { id },
      data: { activo: false }
    });

    return res.json({ ok: true });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ACTUALIZAR STOCK
router.put("/:id/stock", requireAuth, requireRole(['PRODUCCION', 'ADMIN']), async (req, res) => {
  try {
    const id = req.params.id;
    const { cantidadAAgregar } = req.body;

    if (typeof cantidadAAgregar !== 'number' || cantidadAAgregar <= 0 || !Number.isInteger(cantidadAAgregar)) {
      return res.status(400).json({ error: "La cantidad a agregar debe ser un número entero positivo." });
    }

    const productoActualizado = await prisma.producto.update({
      where: { id },
      data: { stock: { increment: cantidadAAgregar } },
      select: { id: true, nombre: true, stock: true },
    });

    if (typeof registrarLog === "function") {
      await registrarLog(req, "PRODUCTO_STOCK_ACTUALIZADO", 
        `Stock de producto ${productoActualizado.id} actualizado por ${req.user.email}`);
    }

    return res.json(productoActualizado);

  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    return res.status(400).json({ error: err.message });
  }
});

export default router;
