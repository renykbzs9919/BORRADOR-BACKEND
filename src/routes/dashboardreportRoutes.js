const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');
const Venta = require('../models/Venta');
const LoteProduccion = require('../models/LoteProduccion');
const Stock = require('../models/Stock');
const Alerta = require('../models/Alerta');
const Producto = require('../models/Producto');

// Función para obtener el rango de fechas en base al filtro
const obtenerRangoDeFechas = (timeRange) => {
    let now = moment().tz('America/La_Paz');
    let startDate;

    switch (timeRange) {
        case 'day':
            startDate = now.clone().subtract(7, 'days'); // Últimos 7 días
            break;
        case 'week':
            startDate = now.clone().subtract(12, 'weeks'); // Últimas 12 semanas
            break;
        case 'month':
            startDate = now.clone().subtract(12, 'months'); // Últimos 12 meses
            break;
        case 'year':
            startDate = now.clone().subtract(5, 'years'); // Últimos 5 años
            break;
        default:
            startDate = now.clone().subtract(1, 'month'); // Último mes por defecto
    }
    return { startDate, endDate: now };
};

// Ruta de Resumen del Dashboard
router.get('/summary', authMiddleware, checkPermissions('ver_resumen_dashboard'), async (req, res) => {
    try {
        const { timeRange = 'month' } = req.query;
        const { startDate, endDate } = obtenerRangoDeFechas(timeRange);

        const [totalProduction, totalSales, inventoryValue, activeAlerts] = await Promise.all([
            LoteProduccion.aggregate([
                { $match: { fechaProduccion: { $gte: startDate.toDate(), $lte: endDate.toDate() } } },
                { $group: { _id: null, total: { $sum: '$cantidadProducida' } } }
            ]),
            Venta.aggregate([
                { $match: { fechaVenta: { $gte: startDate.toDate(), $lte: endDate.toDate() } } },
                { $group: { _id: null, total: { $sum: '$totalVenta' } } }
            ]),
            Stock.aggregate([
                { $lookup: { from: 'productos', localField: 'productoId', foreignField: '_id', as: 'producto' } },
                { $unwind: '$producto' },
                { $group: { _id: null, total: { $sum: { $multiply: ['$stockActual', '$producto.costo'] } } } }
            ]),
            Alerta.countDocuments({ estado: { $in: ['pendiente', 'en_proceso'] } })
        ]);

        res.json({
            totalProduction: totalProduction[0]?.total || 0,
            totalSales: totalSales[0]?.total || 0,
            inventoryValue: inventoryValue[0]?.total || 0,
            activeAlerts
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching summary data', error: error.message });
    }
});

// Ruta para obtener datos de ventas con filtros de fecha
router.get('/sales', authMiddleware, checkPermissions('ver_ventas_dashboard'), async (req, res) => {
    try {
        const { timeRange = 'month' } = req.query;
        const { startDate, endDate } = obtenerRangoDeFechas(timeRange);

        const salesData = await Venta.aggregate([
            { $match: { fechaVenta: { $gte: startDate.toDate(), $lte: endDate.toDate() } } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: timeRange === 'year' ? '%Y' : '%Y-%m-%d',
                            date: '$fechaVenta'
                        }
                    },
                    totalSales: { $sum: '$totalVenta' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(salesData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales data', error: error.message });
    }
});

// Ruta para obtener datos de producción con filtros de fecha
router.get('/production', authMiddleware, checkPermissions('ver_produccion_dashboard'), async (req, res) => {
    try {
        const { timeRange = 'month' } = req.query;
        const { startDate, endDate } = obtenerRangoDeFechas(timeRange);

        const productionData = await LoteProduccion.aggregate([
            { $match: { fechaProduccion: { $gte: startDate.toDate(), $lte: endDate.toDate() } } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: timeRange === 'year' ? '%Y' : '%Y-%m-%d',
                            date: '$fechaProduccion'
                        }
                    },
                    totalProduction: { $sum: '$cantidadProducida' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(productionData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching production data', error: error.message });
    }
});

// Ruta para obtener el valor de inventario
router.get('/inventory', authMiddleware, checkPermissions('ver_inventarios_dashboard'), async (req, res) => {
    try {
        const inventoryData = await Stock.aggregate([
            { $lookup: { from: 'productos', localField: 'productoId', foreignField: '_id', as: 'producto' } },
            { $unwind: '$producto' },
            {
                $project: {
                    productoNombre: '$producto.nombre',
                    stockActual: 1,
                    stockDisponible: 1,
                    stockMinimo: 1,
                    stockMaximo: 1
                }
            }
        ]);

        res.json(inventoryData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching inventory data', error: error.message });
    }
});

// Ruta para obtener productos con lotes dañados o expirados
router.get('/quality-issues', authMiddleware, checkPermissions('ver_alertas_dashboard'), async (req, res) => {
    try {
        const { timeRange = 'month' } = req.query;  // Rango de tiempo desde query params
        const { startDate, endDate } = obtenerRangoDeFechas(timeRange);

        // Consulta para buscar lotes dañados o expirados
        const qualityIssues = await LoteProduccion.aggregate([
            {
                $match: {
                    $or: [
                        { estado: 'dañado' },  // Lotes que están dañados
                        { fechaVencimiento: { $lte: endDate.toDate() } }  // Lotes que han expirado
                    ],
                    fechaProduccion: { $gte: startDate.toDate(), $lte: endDate.toDate() }  // Filtrar por el rango de fechas
                }
            },
            {
                $lookup: {
                    from: 'productos',  // Referencia a la colección de productos
                    localField: 'productoId',
                    foreignField: '_id',
                    as: 'producto'
                }
            },
            {
                $unwind: '$producto'  // Desglosar el producto
            },
            {
                $group: {
                    _id: {
                        productoId: '$producto._id',
                        productoNombre: '$producto.nombre'
                    },  // Agrupar por producto
                    count: { $sum: 1 }  // Contar los lotes dañados o expirados
                }
            },
            { $sort: { count: -1 } }  // Ordenar por la cantidad de problemas (descendente)
        ]);

        res.json(qualityIssues);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quality issues data', error: error.message });
    }
});

module.exports = router;
