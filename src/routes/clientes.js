import express from 'express';
import { prisma } from '../prismaClient.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, requireRole(['ADMIN', 'VENDEDOR']), async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(clientes);
  } catch (err) {
    console.error('❌ Error al obtener clientes:', err.message);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.post('/', requireAuth, requireRole(['ADMIN', 'VENDEDOR']), async (req, res) => {
  try {
    const { nombre, email, telefono, direccion } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        email: email || null,
        telefono: telefono || null,
        direccion: direccion || null,
      },
    });

    res.json(cliente);
  } catch (err) {
    console.error('❌ Error al crear cliente:', err.message);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.get('/:id', requireAuth, requireRole(['ADMIN', 'VENDEDOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({ where: { id } });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(cliente);
  } catch (err) {
    console.error('❌ Error al obtener cliente:', err.message);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

router.put('/:id', requireAuth, requireRole(['ADMIN', 'VENDEDOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, direccion } = req.body;

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: { nombre, email, telefono, direccion },
    });

    res.json(clienteActualizado);
  } catch (err) {
    console.error('❌ Error al actualizar cliente:', err.message);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

router.delete('/:id', requireAuth, requireRole(['ADMIN', 'VENDEDOR']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.cliente.delete({ where: { id } });
    res.json({ ok: true, message: 'Cliente eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar cliente:', err.message);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
