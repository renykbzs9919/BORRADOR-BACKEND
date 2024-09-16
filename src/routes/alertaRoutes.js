const express = require('express');
const { generarAlertas, obtenerAlertas } = require('../controllers/alertaController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestión de alertas
router.get('/', authMiddleware, checkPermissions('ver_alertas'), obtenerAlertas);
router.post('/generar', authMiddleware, checkPermissions('generar_alertas'), generarAlertas);

module.exports = router;
