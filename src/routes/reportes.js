import express from "express";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.get("/resumen-general", requireAuth, async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1);

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

router.get("/ventas-por-dia", requireAuth, async (req, res) => {
  try {
    const datos = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") AS fecha, 
        SUM("total")::numeric AS total
      FROM "Venta"
      GROUP BY DATE("createdAt")
      ORDER BY fecha ASC;
    `;

    const resultado = datos.map(v => ({
      fecha: v.fecha,
      total: Number(v.total || 0),
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/productos-mas-vendidos", requireAuth, async (req, res) => {
  try {
    const productos = await prisma.itemVenta.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: "desc" } },
      take: 10
    });

    const ids = productos.map(p => p.productoId);

    const info = await prisma.producto.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true }
    });

    const resultado = productos.map(p => {
      const prod = info.find(x => x.id === p.productoId);
      return {
        nombre: prod?.nombre || "Desconocido",
        cantidadVendida: Number(p._sum.cantidad || 0),
        total: Number(p._sum.subtotal || 0)
      };
    });

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
