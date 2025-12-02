import express from "express";
import { prisma } from "../prismaClient.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = express.Router();

// Helper: redondear
const R = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ===============================
// 1) RESUMEN GENERAL DEL DÍA
// ===============================
router.get(
  "/resumen-general",
  requireAuth,
  requireRole(["ADMIN", "VENDEDOR", "PRODUCCION"]),
  async (req, res) => {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const mañana = new Date(hoy);
      mañana.setDate(hoy.getDate() + 1);

      const ventas = await prisma.venta.findMany({
        where: { createdAt: { gte: hoy, lt: mañana }, estado: "COMPLETADA" },
        include: { items: { include: { producto: true } } },
      });

      const ingresos = ventas.reduce((acc, v) => acc + Number(v.total), 0);

      const movimientos = await prisma.movimientoFinanciero.findMany({
        where: { fecha: { gte: hoy, lt: mañana } },
      });

      const egresos = movimientos
        .filter((m) => m.tipo === "EGRESO")
        .reduce((acc, m) => acc + Number(m.monto), 0);

      const balance = ingresos - egresos;

      res.json({
        fecha: hoy,
        resumen: {
          ingresos: R(ingresos),
          egresos: R(egresos),
          balance: R(balance),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al generar resumen general" });
    }
  }
);

// ===============================
// X) PRODUCTOS MÁS VENDIDOS (DEL DÍA)
// ===============================
router.get("/productos-mas-vendidos", requireAuth, async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1);

    const ventas = await prisma.venta.findMany({
      where: {
        estado: "COMPLETADA",
        createdAt: { gte: hoy, lt: mañana },
      },
      include: {
        items: { include: { producto: true } },
      },
    });

    const conteo = {};

    ventas.forEach((venta) => {
      venta.items.forEach((item) => {
        if (!item.producto) return;

        const nombre = item.producto.nombre;

        conteo[nombre] = (conteo[nombre] || 0) + Number(item.cantidad);
      });
    });

    const resultado = Object.entries(conteo)
      .map(([producto, cantidad]) => ({ producto, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    res.json(resultado);
  } catch (err) {
    console.error("Error productos-mas-vendidos:", err);
    res.status(500).json({ error: "Error al obtener productos más vendidos" });
  }
});

// ===============================
// 2) VENTAS POR DÍA (MES)
// ===============================
router.get("/ventas-por-dia", requireAuth, async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const year = new Date().getFullYear();

    const ventas = await prisma.$queryRawUnsafe(`
      SELECT 
        DATE("createdAt") AS fecha,
        SUM(total) AS total
      FROM "Venta"
      WHERE EXTRACT(MONTH FROM "createdAt") = ${mes}
        AND EXTRACT(YEAR FROM "createdAt") = ${year}
        AND estado = 'COMPLETADA'
      GROUP BY fecha
      ORDER BY fecha ASC
    `);

    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en ventas por día" });
  }
});

// ===============================
// 3) VENTAS POR HORA (DÍA)
// ===============================
router.get("/ventas-por-hora", requireAuth, async (req, res) => {
  try {
    const dia = new Date(req.query.dia);
    const siguiente = new Date(dia);
    siguiente.setDate(dia.getDate() + 1);

    const datos = await prisma.$queryRawUnsafe(`
      SELECT 
        EXTRACT(HOUR FROM "createdAt") AS hora,
        SUM(total) AS total
      FROM "Venta"
      WHERE "createdAt" >= '${dia.toISOString()}' 
        AND "createdAt" < '${siguiente.toISOString()}'
        AND estado = 'COMPLETADA'
      GROUP BY hora
      ORDER BY hora
    `);

    res.json(datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error ventas por hora" });
  }
});

// ===============================
// 4) CATEGORÍAS MÁS VENDIDAS
// ===============================
router.get("/categorias-mas-vendidas", requireAuth, async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const year = new Date().getFullYear();

    const datos = await prisma.$queryRawUnsafe(`
      SELECT 
        c.nombre AS categoria,
        SUM(i.cantidad) AS cantidad
      FROM "Venta" v
      JOIN "ItemVenta" i ON i."ventaId" = v.id
      JOIN "Producto" p ON p.id = i."productoId"
      JOIN "Categoria" c ON c.id = p."categoriaId"
      WHERE EXTRACT(MONTH FROM v."createdAt") = ${mes}
        AND EXTRACT(YEAR FROM v."createdAt") = ${year}
        AND v.estado = 'COMPLETADA'
      GROUP BY categoria
      ORDER BY cantidad DESC
    `);

    res.json(datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error categorias más vendidas" });
  }
});

// ===============================
// 5) MÉTODOS DE PAGO
// ===============================
router.get("/metodos-de-pago", requireAuth, async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const year = new Date().getFullYear();

    if (!mes) {
      return res.status(400).json({ error: "Mes inválido" });
    }

    const datos = await prisma.$queryRawUnsafe(`
      SELECT 
        "metodoPago" AS metodo,
        COUNT(*) AS cantidad,
        SUM(total) AS total
      FROM "Venta"
      WHERE EXTRACT(MONTH FROM "createdAt") = ${mes}
        AND EXTRACT(YEAR FROM "createdAt") = ${year}
        AND estado = 'COMPLETADA'
      GROUP BY "metodoPago"
    `);

    // 🔥 CONVERTIR BIGINT → NUMBER
    const procesado = datos.map((d) => ({
      metodo: d.metodo,
      cantidad: Number(d.cantidad),
      total: Number(d.total),
    }));

    res.json(procesado);

  } catch (err) {
    console.error("Error en métodos de pago:", err);
    res.status(500).json({ error: "Error en métodos de pago" });
  }
});



// ===============================
// 6) TICKET PROMEDIO DIARIO
// ===============================
router.get("/ticket-promedio", requireAuth, async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const year = new Date().getFullYear();

    const datos = await prisma.$queryRawUnsafe(`
      SELECT 
        DATE("createdAt") AS fecha,
        AVG(total) AS ticket_promedio
      FROM "Venta"
      WHERE EXTRACT(MONTH FROM "createdAt") = ${mes}
        AND EXTRACT(YEAR FROM "createdAt") = ${year}
        AND estado = 'COMPLETADA'
      GROUP BY fecha
      ORDER BY fecha ASC
    `);

    res.json(datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error ticket promedio" });
  }
});

// ===============================
// 7) TOP 5 PRODUCTOS POR INGRESOS
// ===============================
router.get("/top5-productos-ingresos", requireAuth, async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const year = new Date().getFullYear();

    const datos = await prisma.$queryRawUnsafe(`
      SELECT 
        p.nombre,
        SUM(i.subtotal) AS ingresos
      FROM "Venta" v
      JOIN "ItemVenta" i ON i."ventaId" = v.id
      JOIN "Producto" p ON p.id = i."productoId"
      WHERE EXTRACT(MONTH FROM v."createdAt") = ${mes}
        AND EXTRACT(YEAR FROM v."createdAt") = ${year}
        AND v.estado = 'COMPLETADA'
      GROUP BY p.nombre
      ORDER BY ingresos DESC
      LIMIT 5
    `);

    res.json(datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error top productos" });
  }
});

// ===============================
// 8) INGRESOS vs EGRESOS DIARIOS
// ===============================
router.get("/flujo-diario", requireAuth, async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const year = new Date().getFullYear();

    const ingresos = await prisma.$queryRawUnsafe(`
      SELECT 
        DATE("createdAt") AS fecha,
        SUM(total) AS ingresos
      FROM "Venta"
      WHERE EXTRACT(MONTH FROM "createdAt") = ${mes}
        AND EXTRACT(YEAR FROM "createdAt") = ${year}
        AND estado = 'COMPLETADA'
      GROUP BY fecha
      ORDER BY fecha ASC
    `);

    const egresos = await prisma.$queryRawUnsafe(`
      SELECT 
        DATE(fecha) AS fecha,
        SUM(monto) AS egresos
      FROM "MovimientoFinanciero"
      WHERE EXTRACT(MONTH FROM fecha) = ${mes}
        AND EXTRACT(YEAR FROM fecha) = ${year}
        AND tipo = 'EGRESO'
      GROUP BY fecha
      ORDER BY fecha ASC
    `);

    res.json({ ingresos, egresos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error flujo diario" });
  }
});

// ===============================
// 9) PROYECCIÓN DE VENTAS DEL MES
// ===============================
router.get("/proyeccion-ventas", requireAuth, async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    const year = new Date().getFullYear();

    const ventas = await prisma.$queryRawUnsafe(`
      SELECT 
        DATE("createdAt") AS fecha,
        SUM(total) AS total
      FROM "Venta"
      WHERE EXTRACT(MONTH FROM "createdAt") = ${mes}
        AND EXTRACT(YEAR FROM "createdAt") = ${year}
        AND estado = 'COMPLETADA'
      GROUP BY fecha
      ORDER BY fecha ASC
    `);

    const diasTranscurridos = ventas.length;
    const diasDelMes = new Date(year, mes, 0).getDate();

    const totalActual = ventas.reduce((acc, v) => acc + Number(v.total), 0);
    const promedioDiario = diasTranscurridos > 0 ? totalActual / diasTranscurridos : 0;

    const proyeccion = promedioDiario * diasDelMes;

    res.json({
      totalActual: R(totalActual),
      proyeccion: R(proyeccion),
      promedioDiario: R(promedioDiario),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error proyección ventas" });
  }
});

export default router;
