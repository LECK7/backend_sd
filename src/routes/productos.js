import express from 'express';
import { prisma } from '../prismaClient.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Listar productos (público para consumo del frontend)
router.get('/', async (req, res) => {
  const productos = await prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
  res.json(productos);
});

// Obtener producto por id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

// Crear producto (requiere auth)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { codigo, nombre, descripcion, precio, stock, activo } = req.body;
    const producto = await prisma.producto.create({
      data: { codigo, nombre, descripcion, precio: precio.toString(), stock, activo }
    });
    res.json(producto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Actualizar producto
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.precio) data.precio = data.precio.toString();
    const producto = await prisma.producto.update({ where: { id }, data });
    res.json(producto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar (soft) -> marcar activo=false
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  await prisma.producto.update({ where: { id }, data: { activo: false } });
  res.json({ ok: true });
});

export default router;
