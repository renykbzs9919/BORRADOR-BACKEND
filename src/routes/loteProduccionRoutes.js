const express = require('express');
const {
    createLoteProduccion,
    getLotesProduccion,
    getLoteProduccionById,
    updateLoteProduccion,
    deleteLoteProduccion,
    getLotesPorProducto,
} = require('../controllers/loteProduccionController');

const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestionar lotes de producción
router.post('/', authMiddleware, checkPermissions('crear_lote_produccion'), createLoteProduccion);  // Crear un nuevo lote de producción
router.get('/', authMiddleware, checkPermissions('ver_lotes_produccion'), getLotesProduccion);  // Obtener todos los lotes de producción

// Rutas más específicas (con parámetros)
router.get('/producto/:productoId', authMiddleware, checkPermissions('ver_lotes_produccion_id'), getLotesPorProducto);  // Obtener lotes por producto
router.get('/:id', authMiddleware, checkPermissions('ver_lote_produccion_id'), getLoteProduccionById);  // Obtener un lote de producción por su ID
router.put('/:id', authMiddleware, checkPermissions('actualizar_lote_produccion_id'), updateLoteProduccion);  // Actualizar un lote de producción por su ID
router.delete('/:id', authMiddleware, checkPermissions('eliminar_lote_produccion_id'), deleteLoteProduccion);  // Eliminar un lote de producción por su ID

module.exports = router;
