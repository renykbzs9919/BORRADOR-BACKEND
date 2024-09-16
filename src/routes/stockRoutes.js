const express = require('express');
const { obtenerStock, obtenerStockPorProducto, actualizarStock, eliminarStock } = require('../controllers/stockController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestión de stock
router.get('/', authMiddleware, checkPermissions('ver_stock'), obtenerStock);
router.get('/:productoId', authMiddleware, checkPermissions('ver_stock_id'), obtenerStockPorProducto);
router.put('/:productoId', authMiddleware, checkPermissions('editar_stock_id'), actualizarStock);
router.delete('/:productoId', authMiddleware, checkPermissions('eliminar_stock_id'), eliminarStock);

module.exports = router;
