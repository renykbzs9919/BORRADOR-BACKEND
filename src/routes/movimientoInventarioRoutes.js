const express = require('express');
const {
    createMovimientoInventario,
    getMovimientosInventario,
    getMovimientoInventarioById,
    updateMovimientoInventario,
    deleteMovimientoInventario
} = require('../controllers/movimientoInventarioController');

const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestionar movimientos de inventario
router.post('/', authMiddleware, checkPermissions('crear_movimiento_inventario'), createMovimientoInventario);  // Crear un nuevo movimiento de inventario
router.get('/', authMiddleware, checkPermissions('ver_movimientos_inventario'), getMovimientosInventario);  // Obtener todos los movimientos de inventario
router.get('/:id', authMiddleware, checkPermissions('ver_movimiento_inventario_id'), getMovimientoInventarioById);  // Obtener un movimiento de inventario por su ID
router.put('/:id', authMiddleware, checkPermissions('actualizar_movimiento_inventario_id'), updateMovimientoInventario);  // Actualizar un movimiento de inventario por su ID
router.delete('/:id', authMiddleware, checkPermissions('eliminar_movimiento_inventario_id'), deleteMovimientoInventario);  // Eliminar un movimiento de inventario por su ID

module.exports = router;
