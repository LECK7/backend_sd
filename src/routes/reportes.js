import express from "express";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

// =========================================================
// 📊 GET /api/reportes/resumen-general
// =========================================================
router.get("/resumen-general", requireAuth, async (req, res) => {
  try {
    // ===========================
    // 🗓️ 0️⃣ Fechas de hoy
    // ===========================
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1);

    // ===========================
    // 🧾 1️⃣ Ventas agrupadas por día (más limpio)
    // ===========================
    const ventasPorDia = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") AS fecha, 
        SUM("total")::numeric AS total
      FROM "Venta"
      WHERE "createdAt" >= ${hoy} AND "createdAt" < ${mañana}
      GROUP BY DATE("createdAt")
      ORDER BY fecha ASC;
    `;

    const ventasFormateadas = ventasPorDia.map(v => ({
      fecha: v.fecha,
      total: Number(v.total || 0),
    }));

    // ===========================
    // 🛒 2️⃣ Productos más vendidos del día
    // ===========================
    const productosMasVendidos = await prisma.itemVenta.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true, subtotal: true },
      where: { venta: { createdAt: { gte: hoy, lt: mañana } } },
      orderBy: { _sum: { cantidad: "desc" } },
      take: 10,
    });

    const idsProductos = productosMasVendidos.map(p => p.productoId);

    const productos = await prisma.producto.findMany({
      where: { id: { in: idsProductos } },
      select: { id: true, nombre: true },
    });

    const productosFinal = productosMasVendidos.map(p => {
      const producto = productos.find(prod => prod.id === p.productoId);
      return {
        nombre: producto?.nombre || "Desconocido",
        cantidadVendida: Number(p._sum.cantidad || 0),
        total: Number(p._sum.subtotal || 0),
      };
    });

    // ===========================
    // 💰 3️⃣ Finanzas (solo de hoy)
    // ===========================
    const movimientos = await prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: hoy, lt: mañana } },
      orderBy: { fecha: "asc" },
    });

    const totalIngresos = movimientos
      .filter(m => m.tipo === "INGRESO")
      .reduce((acc, m) => acc + Number(m.monto), 0);

    const totalEgresos = movimientos
      .filter(m => m.tipo === "EGRESO")
      .reduce((acc, m) => acc + Number(m.monto), 0);

    const balance = totalIngresos - totalEgresos;

    // ===========================
    // 📤 4️⃣ Respuesta final
    // ===========================
    res.json({
      fecha: hoy,
      ventasPorDia: ventasFormateadas,
      productosMasVendidos: productosFinal,
      finanzas: {
        ingresos: Number(totalIngresos.toFixed(2)),
        egresos: Number(totalEgresos.toFixed(2)),
        balance: Number(balance.toFixed(2)),
      },
    });
  } catch (err) {
    console.error("Error generando reporte:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
