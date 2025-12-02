import express from "express";
import { prisma } from "../prismaClient.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = express.Router();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "Token no proporcionado" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(403).json({ error: "Token inválido o expirado" });
  }
};

router.put("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.rol !== "ADMIN") {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const id = req.params.id;

    const { nombre, email, password, telefono, rol } = req.body;
    let updateData = { nombre, email, telefono, rol };

    delete updateData.id;

    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "La contraseña debe tener al menos 6 caracteres." });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const validRoles = ['ADMIN', 'VENDEDOR', 'PRODUCCION'];
    if (rol && !validRoles.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido: ${rol}. Los roles permitidos son: ${validRoles.join(', ')}` });
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: id }, 
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
      },
    });

    res.json(usuarioActualizado);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(400).json({ error: err.message });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.user.rol !== "ADMIN")
      return res.status(403).json({ error: "Acceso denegado" });

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
      },
    });

    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.rol !== "ADMIN")
      return res.status(403).json({ error: "Acceso denegado" });

    const { nombre, email, password, telefono, rol } = req.body;

    const validRoles = ['ADMIN', 'VENDEDOR', 'PRODUCCION'];
    if (!validRoles.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido: ${rol}. Los roles permitidos son: ${validRoles.join(', ')}` });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "La contraseña es requerida y debe tener al menos 6 caracteres." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.usuario.create({
      data: { nombre, email, password: hashed, telefono, rol },
    });

    res.json({
      ok: true,
      usuario: { id: nuevoUsuario.id, nombre, email, telefono, rol },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "El email ya está registrado." });
    }
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.rol !== "ADMIN")
      return res.status(403).json({ error: "Acceso denegado" });

    await prisma.usuario.delete({ where: { id: req.params.id } });
    res.json({ ok: true, message: "Usuario eliminado correctamente" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(400).json({ error: err.message });
  }
});

export default router;