import { prisma } from "../prismaClient.js";

export const registrarLog = async (req, accion, detalles = "") => {
  try {
    await prisma.logSistema.create({
      data: {
        usuarioId: req.user?.id || null,
        accion,
        detalles,
        ip: req.ip,
      },
    });
  } catch (err) {
    console.error("Error registrando log:", err.message);
  }
};
