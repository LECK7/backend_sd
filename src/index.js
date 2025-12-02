import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import productosRoutes from './routes/productos.js';
import ventasRoutes from './routes/ventas.js';
import usuariosRoutes from "./routes/usuarios.js";
import reportesRoutes from "./routes/reportes.js";
import finanzasRoutes from "./routes/finanzas.js";
import cajaRoutes from "./routes/caja.js";
import clientesRoutes from "./routes/clientes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes); 
app.use("/api/usuarios", usuariosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/finanzas", finanzasRoutes);
app.use("/api/caja", cajaRoutes);
app.use("/api/clientes", clientesRoutes);

app.get('/', (req, res) => res.json({ ok: true, msg: 'API Backend panaderia funcionando' }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend en http://localhost:${port}`));
