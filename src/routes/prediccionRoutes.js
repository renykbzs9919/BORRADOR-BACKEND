const express = require('express');
const { obtenerPrediccionesVentasYProduccion, } = require('../controllers/prediccionController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestión de alertas
router.get('/ventas-produccion/:productoId', authMiddleware, checkPermissions('ver_predicciones'), obtenerPrediccionesVentasYProduccion);


module.exports = router;
