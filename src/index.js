import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import productosRoutes from './routes/productos.js';
import ventasRoutes from './routes/ventas.js';
import usuariosRoutes from "./routes/usuarios.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);

app.get('/', (req, res) => res.json({ ok: true, msg: 'API Backend panaderia funcionando' }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend en http://localhost:${port}`));
