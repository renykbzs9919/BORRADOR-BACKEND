const express = require('express');
const { createPayment, getPaymentsByCustomer, getOutstandingSalesByCustomer } = require('../controllers/pagoController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Ruta para crear un nuevo pago
router.post('/', authMiddleware, checkPermissions('crear_pago'), createPayment);

// Ruta para obtener los pagos realizados por un cliente
router.get('/cliente/:clienteId', authMiddleware, checkPermissions('ver_pagos'), getPaymentsByCustomer);

// Ruta para obtener las ventas con saldo pendiente de un cliente
router.get('/cliente/:clienteId/pendientes', authMiddleware, checkPermissions('ver_ventas_pendientes'), getOutstandingSalesByCustomer);

module.exports = router;
