const express = require('express');
const {
    generarReporteProductosCompleto,
    generarReporteClientesCompleto,
    generarReporteClienteEspecifico,
    getReporteDeudasPorVendedor
} = require('../controllers/reporteController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para reportes con permisos
router.get('/reporte-productos', authMiddleware, checkPermissions('ver_reportes_productos'), generarReporteProductosCompleto);
router.get('/reporte-clientes', authMiddleware, checkPermissions('ver_reportes_clientes'), generarReporteClientesCompleto);
router.get('/reporte-cliente-especifico', authMiddleware, checkPermissions('ver_reportes_clientes_especificos'), generarReporteClienteEspecifico);

// Ruta para obtener el reporte de deudas por vendedor
router.get('/reporte-deudas-por-vendedor/:vendedorId', authMiddleware, checkPermissions('ver_reportes_deudas_por_vendedor'), getReporteDeudasPorVendedor);
module.exports = router;
