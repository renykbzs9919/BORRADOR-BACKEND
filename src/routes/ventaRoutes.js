const express = require('express');
const { createVenta, getVentas, getVentaById, deleteVenta, updateVenta } = require('../controllers/ventaController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para ventas
router.post('/', authMiddleware, checkPermissions('crear_venta'), createVenta);
router.get('/', authMiddleware, checkPermissions('ver_ventas'), getVentas);
router.get('/:id', authMiddleware, checkPermissions('ver_venta_id'), getVentaById);
router.put('/:id', authMiddleware, checkPermissions('actualizar_venta_id'), updateVenta);
router.delete('/:id', authMiddleware, checkPermissions('eliminar_venta_id'), deleteVenta);

module.exports = router;
