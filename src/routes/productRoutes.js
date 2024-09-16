const express = require('express');
const { createProducto, getProductos, getProductoById, updateProducto, deleteProducto } = require('../controllers/productoController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Ruta para gestión de productos
router.post('/', authMiddleware, checkPermissions('crear_producto'), createProducto);
router.get('/', authMiddleware, checkPermissions('ver_productos'), getProductos);
router.get('/:id', authMiddleware, checkPermissions('ver_producto_id'), getProductoById);
router.put('/:id', authMiddleware, checkPermissions('actualizar_producto_id'), updateProducto);
router.delete('/:id', authMiddleware, checkPermissions('eliminar_producto_id'), deleteProducto);

module.exports = router;
