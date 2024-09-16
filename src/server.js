const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const initializeData = require('./lib');
const inicializarParametros = require('./parametrosInit');

// Cargar configuración de variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

// Inicializar datos por defecto (roles y usuario admin)
initializeData();

// Inicializar los parámetros
inicializarParametros();

// Inicializar la aplicación de Express
const app = express();

// Middleware para habilitar CORS y manejar JSON en las solicitudes
app.use(cors({
    origin: process.env.FRONTEND_URL, // Leer la URL del frontend desde .env
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Permitir métodos específicos si es necesario
    credentials: true // Si necesitas enviar cookies u otras credenciales
}));
app.use(express.json());


// Rutas
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const authRoutes = require('./routes/authRoutes');
const alertaRoutes = require('./routes/alertaRoutes');  // Nueva ruta
const dashboardReportRoutes = require('./routes/dashboardreportRoutes');  // Nueva ruta
const loteProduccionRoutes = require('./routes/loteProduccionRoutes');  // Nueva ruta
const movimientoInventarioRoutes = require('./routes/movimientoInventarioRoutes');  // Nueva ruta
const pagoRoutes = require('./routes/pagoRoutes');  // Nueva ruta
const reporteRoutes = require('./routes/reporteRoutes');  // Nueva ruta
const stockRoutes = require('./routes/stockRoutes');  // Nueva ruta
const ventaRoutes = require('./routes/ventaRoutes');  // Nueva ruta
const categoriaRoutes = require('./routes/categoriaRoutes');
const parametroRoutes = require('./routes/parametrosRoutes');
const prediccionesRoutes = require('./routes/prediccionRoutes');  // Nueva ruta



// Rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/alertas', alertaRoutes);  // Nueva ruta
app.use('/api/dashboard', dashboardReportRoutes);  // Nueva ruta
app.use('/api/lotes', loteProduccionRoutes);  // Nueva ruta
app.use('/api/movimientos', movimientoInventarioRoutes);  // Nueva ruta
app.use('/api/pagos', pagoRoutes);  // Nueva ruta
app.use('/api/reportes', reporteRoutes);  // Nueva ruta
app.use('/api/stock', stockRoutes);  // Nueva ruta
app.use('/api/ventas', ventaRoutes);  // Nueva ruta
app.use('/api/categorias', categoriaRoutes);
app.use('/api/parametros', parametroRoutes);
app.use('/api/predicciones', prediccionesRoutes);  // Nueva ruta


// Ruta de prueba para asegurarse de que el servidor esté funcionando
app.get('/', (req, res) => {
    res.send('API en funcionamiento');
});

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware para manejo de errores generales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Error en el servidor' });
});

// Configuración del puerto y puesta en marcha del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
