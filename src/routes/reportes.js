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
    // 🧾 1️⃣ Ventas agrupadas por día
    // ===========================
    const ventasPorDia = await prisma.venta.groupBy({
      by: ["createdAt"],
      _sum: { total: true },
      orderBy: { createdAt: "asc" },
    });

    const ventasFormateadas = ventasPorDia.map(v => ({
      createdAt: v.createdAt,
      _sum: { total: Number(v._sum.total || 0) },
    }));

    // ===========================
    // 🛒 2️⃣ Productos más vendidos
    // ===========================
    const productosMasVendidos = await prisma.itemVenta.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true, subtotal: true },
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
    // 💰 3️⃣ Finanzas (Ingresos y Egresos)
    // ===========================
    const movimientos = await prisma.movimientoFinanciero.findMany();

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
      ventasPorDia: ventasFormateadas,
      productosMasVendidos: productosFinal,
      finanzas: {
        ingresos: totalIngresos,
        egresos: totalEgresos,
        balance,
      },
    });
  } catch (err) {
    console.error("Error generando reporte:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
