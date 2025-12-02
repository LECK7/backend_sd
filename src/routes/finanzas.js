import express from "express";
import { prisma } from "../prismaClient.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { registrarLog } from "../middlewares/logger.js";

const router = express.Router();

router.post("/registrar", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { tipo, categoria, monto, descripcion } = req.body;

    if (!tipo || !categoria || !monto)
      return res.status(400).json({ error: "Faltan campos obligatorios" });

    if (!["INGRESO", "EGRESO"].includes(tipo))
      return res.status(400).json({ error: "Tipo inválido" });

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        tipo,
        categoria,
        monto: parseFloat(monto).toFixed(2),
        descripcion,
        usuarioId: req.user.id,
      },
    });

    await registrarLog(req, "MOVIMIENTO_REGISTRADO", `${tipo} ${movimiento.id} - ${categoria}`);

    res.json({ ok: true, movimiento });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const movimientos = await prisma.movimientoFinanciero.findMany({
      include: { usuario: true },
      orderBy: { fecha: "desc" },
    });

    const data = movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      categoria: m.categoria,
      monto: Number(m.monto),
      descripcion: m.descripcion,
      fecha: m.fecha,
      usuario: m.usuario ? { id: m.usuario.id, nombre: m.usuario.nombre } : null,
    }));

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
