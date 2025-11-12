import express from "express";
import { prisma } from "../prismaClient.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = express.Router();

router.get(
  "/resumen",
  requireAuth,
  requireRole(["ADMIN", "VENDEDOR", "PRODUCCION"]),
  async (req, res) => {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const mañana = new Date(hoy);
      mañana.setDate(hoy.getDate() + 1);

      // Ventas del día con sus items
      const ventasHoy = await prisma.venta.findMany({
        where: { createdAt: { gte: hoy, lt: mañana }, estado: "COMPLETADA" },
        include: {
          cliente: true,
          usuario: true,
          items: {
            include: { producto: true },
          },
        },
      });


      // Calcular ingresos
      const ingresos = ventasHoy.reduce(
        (acc, venta) => acc + Number(venta.total),
        0
      );

      // Egresos del día
      const movimientos = await prisma.movimientoFinanciero.findMany({
        where: { fecha: { gte: hoy, lt: mañana } },
        orderBy: { fecha: "asc" },
      });

      const totalEgresos = movimientos
        .filter((m) => m.tipo === "EGRESO")
        .reduce((acc, m) => acc + Number(m.monto), 0);

      const balance = ingresos - totalEgresos;
      const redondear = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

      // Formato para frontend
      const resumen = {
        ingresos: redondear(ingresos),
        egresos: redondear(totalEgresos),
        balance: redondear(balance),
      };

      const ventas = ventasHoy.flatMap((venta) =>
        venta.items.map((i) => ({
          cliente: venta.cliente?.nombre || "Venta rápida",
          producto: i.producto?.nombre || "Producto",
          cantidad: Number(i.cantidad) || 0,
          precioUnit: Number(i.precioUnit) || 0,
          total: Number(i.subtotal) || 0,
          metodoPago: venta.metodoPago || "Efectivo",
          esCredito: !!venta.esCredito,
        }))
      );

      const gastos = movimientos
        .filter((m) => m.tipo === "EGRESO")
        .map((m) => ({
          categoria: m.categoria,
          descripcion: m.descripcion || "",
          monto: Number(m.monto),
        }));

      res.json({
        fecha: hoy,
        resumen,
        ventas,
        gastos,
      });
    } catch (error) {
      console.error("Error al obtener resumen de caja:", error);
      res.status(500).json({ error: "Error al obtener resumen de caja" });
    }
  }
);

export default router;
