const moment = require('moment-timezone');
const mongoose = require('mongoose');
const Venta = require('../models/Venta');
const LoteProduccion = require('../models/LoteProduccion');
const Producto = require('../models/Producto');
const Pago = require('../models/Pago');
const User = require('../models/User');

const crearFiltroFecha = (query) => {
    const { month, year, startDate, endDate, week } = query;
    let filtroFecha = {};

    const timeZone = 'America/La_Paz';

    console.log('Query recibida:', query);

    if (month) {
        const [year, monthNumber] = month.split('-');
        const start = moment.tz(`${year}-${monthNumber}-01`, timeZone).startOf('month');
        const end = moment.tz(`${year}-${monthNumber}-01`, timeZone).endOf('month');
        filtroFecha = {
            $gte: start.toDate(),
            $lte: end.toDate()
        };

        console.log('Filtro para el mes específico:');
        console.log('Fecha de inicio (start):', start.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Fecha de fin (end):', end.format('YYYY-MM-DD HH:mm:ss'));
    } else if (year) {
        const start = moment.tz(`${year}-01-01`, timeZone).startOf('year');
        const end = moment.tz(`${year}-12-31`, timeZone).endOf('year');
        filtroFecha = {
            $gte: start.toDate(),
            $lte: end.toDate()
        };

        console.log('Filtro para el año específico:');
        console.log('Fecha de inicio (start):', start.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Fecha de fin (end):', end.format('YYYY-MM-DD HH:mm:ss'));
    } else if (week) {
        const today = moment.tz(timeZone).startOf('day');
        const start = today.clone().subtract(6, 'days');
        const end = today.clone().endOf('day');
        filtroFecha = {
            $gte: start.toDate(),
            $lte: end.toDate()
        };

        console.log('Filtro para la semana específica:');
        console.log('Fecha de inicio (start):', start.format('YYYY-MM-DD HH:mm:ss'));
        console.log('Fecha de fin (end):', end.format('YYYY-MM-DD HH:mm:ss'));
    } else if (startDate || endDate) {
        const start = startDate ? moment.tz(startDate, timeZone).startOf('day') : undefined;
        const end = endDate ? moment.tz(endDate, timeZone).endOf('day') : undefined;
        filtroFecha = {
            ...(start && { $gte: start.toDate() }),
            ...(end && { $lte: end.toDate() })
        };

        console.log('Filtro para el rango de fechas:');
        if (start) console.log('Fecha de inicio (start):', start.format('YYYY-MM-DD HH:mm:ss'));
        if (end) console.log('Fecha de fin (end):', end.format('YYYY-MM-DD HH:mm:ss'));
    }

    console.log('Filtro final aplicado:', JSON.stringify(filtroFecha, null, 2));
    return filtroFecha;
};

const generarReporteProductosCompleto = async (req, res) => {
    const filtroFecha = crearFiltroFecha(req.query);

    try {
        // 1. Productos más vendidos
        const productosMasVendidos = await Venta.aggregate([
            { $match: { fechaVenta: filtroFecha } },
            { $unwind: '$productos' },
            {
                $group: {
                    _id: '$productos.productoId',
                    totalCantidadVendida: { $sum: '$productos.cantidad' },
                    totalVenta: { $sum: { $multiply: ['$productos.cantidad', '$productos.precioUnitario'] } }
                }
            },
            { $sort: { totalCantidadVendida: -1 } },
            { $lookup: { from: 'productos', localField: '_id', foreignField: '_id', as: 'producto' } },
            { $unwind: '$producto' },
            { $project: { nombre: '$producto.nombre', totalCantidadVendida: 1, totalVenta: 1 } }
        ]);

        const idsProductosMasVendidos = productosMasVendidos.map(p => p._id);

        // 2. Margen de ganancia por producto
        const margenGananciaPorProducto = await Venta.aggregate([
            { $match: { fechaVenta: filtroFecha } },
            { $unwind: '$productos' },
            {
                $lookup: {
                    from: 'productos',
                    localField: 'productos.productoId',
                    foreignField: '_id',
                    as: 'producto'
                }
            },
            { $unwind: '$producto' },
            {
                $group: {
                    _id: '$productos.productoId',
                    nombre: { $first: '$producto.nombre' },
                    totalCosto: { $sum: { $multiply: ['$productos.cantidad', '$producto.costo'] } },
                    totalVenta: { $sum: { $multiply: ['$productos.cantidad', '$productos.precioUnitario'] } }
                }
            },
            {
                $addFields: {
                    margenGanancia: {
                        $multiply: [
                            { $divide: [{ $subtract: ['$totalVenta', '$totalCosto'] }, '$totalCosto'] },
                            100
                        ]
                    }
                }
            },
            {
                $project: {
                    nombre: 1,
                    totalCosto: 1,
                    totalVenta: 1,
                    margenGanancia: { $round: ['$margenGanancia', 2] }
                }
            }
        ]);

        // 3. Pérdidas por productos expirados o dañados
        const productosPerdidos = await LoteProduccion.aggregate([
            {
                $match: {
                    $or: [
                        { estado: 'expirado' },
                        { estado: 'dañado' }
                    ],
                    fechaProduccion: filtroFecha
                }
            },
            {
                $lookup: {
                    from: 'productos',
                    localField: 'productoId',
                    foreignField: '_id',
                    as: 'producto'
                }
            },
            { $unwind: '$producto' },
            {
                $group: {
                    _id: '$productoId',
                    totalCantidadPerdida: { $sum: '$cantidadDisponible' },
                    valorPerdido: { $sum: { $multiply: ['$cantidadDisponible', '$producto.costo'] } }
                }
            },
            { $project: { nombre: '$producto.nombre', totalCantidadPerdida: 1, valorPerdido: 1 } }
        ]);

        // 4. Productos sin movimiento (excluyendo productos más vendidos)
        const productosSinMovimiento = await Producto.aggregate([
            {
                $lookup: {
                    from: 'movimientoinventarios',
                    let: { productoId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$productoId', '$$productoId'] },
                                fecha: filtroFecha
                            }
                        }
                    ],
                    as: 'movimientos'
                }
            },
            {
                $addFields: { totalMovimientos: { $size: '$movimientos' } }
            },
            { $match: { totalMovimientos: { $eq: 0 }, _id: { $nin: idsProductosMasVendidos } } },
            { $project: { nombre: 1, totalMovimientos: 1 } }
        ]);

        // 5. Productos en riesgo de expirar
        const productosEnRiesgoExpirar = await LoteProduccion.aggregate([
            {
                $match: {
                    fechaVencimiento: { $lt: new Date(moment().add(30, 'days').toISOString()) },
                    estado: 'disponible',
                    fechaProduccion: filtroFecha
                }
            },
            {
                $group: {
                    _id: '$productoId',
                    cantidadDisponible: { $sum: '$cantidadDisponible' },
                    fechaVencimiento: { $first: '$fechaVencimiento' }
                }
            },
            { $lookup: { from: 'productos', localField: '_id', foreignField: '_id', as: 'producto' } },
            { $unwind: '$producto' },
            { $project: { nombre: '$producto.nombre', cantidadDisponible: 1, fechaVencimiento: 1 } }
        ]);

        // 6. Rentabilidad por producto
        const rentabilidadPorProducto = await Venta.aggregate([
            { $match: { fechaVenta: filtroFecha } },
            { $unwind: '$productos' },
            {
                $lookup: {
                    from: 'productos',
                    localField: 'productos.productoId',
                    foreignField: '_id',
                    as: 'producto'
                }
            },
            { $unwind: '$producto' },
            {
                $group: {
                    _id: '$productos.productoId',
                    nombre: { $first: '$producto.nombre' },
                    totalCosto: { $sum: { $multiply: ['$productos.cantidad', '$producto.costo'] } },
                    totalVenta: { $sum: { $multiply: ['$productos.cantidad', '$productos.precioUnitario'] } }
                }
            },
            {
                $addFields: {
                    rentabilidad: {
                        $multiply: [
                            { $divide: [{ $subtract: ['$totalVenta', '$totalCosto'] }, '$totalCosto'] },
                            100
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    nombre: 1,
                    rentabilidad: { $round: ['$rentabilidad', 2] }
                }
            }
        ]);

        res.json({
            productosMasVendidos,
            margenGananciaPorProducto,
            productosPerdidos,
            productosSinMovimiento,
            productosEnRiesgoExpirar,
            rentabilidadPorProducto
        });
    } catch (error) {
        console.error('Error generando el reporte completo de productos:', error);
        res.status(500).json({ message: 'Error generando el reporte completo de productos' });
    }
};

const generarReporteClientesCompleto = async (req, res) => {
    const filtroFecha = crearFiltroFecha(req.query);

    try {
        // Clientes con más compras
        const clientesMasCompran = await Venta.aggregate([
            { $match: { fechaVenta: filtroFecha } },
            {
                $group: {
                    _id: '$cliente',
                    totalComprado: { $sum: '$totalVenta' }
                }
            },
            { $sort: { totalComprado: -1 } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'cliente' } },
            { $unwind: '$cliente' },
            { $project: { nombre: '$cliente.name', totalComprado: 1, email: '$cliente.email' } }
        ]);

        // Clientes con deuda
        const clientesConDeuda = await Venta.aggregate([
            { $match: { saldoVenta: { $gt: 0 }, fechaVenta: filtroFecha } },
            {
                $group: {
                    _id: '$cliente',
                    totalDeuda: { $sum: '$saldoVenta' }
                }
            },
            { $sort: { totalDeuda: -1 } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'cliente' } },
            { $unwind: '$cliente' },
            { $project: { nombre: '$cliente.name', totalDeuda: 1, email: '$cliente.email' } }
        ]);

        // Pagos realizados
        const pagosRealizados = await Pago.aggregate([
            { $match: { fechaPago: filtroFecha } },
            { $unwind: '$pagosAplicados' },
            {
                $group: {
                    _id: '$cliente',
                    totalPagado: { $sum: '$pagosAplicados.pagoAplicado' },
                    pagos: {
                        $push: {
                            ventaId: '$pagosAplicados.ventaId',
                            pagoAplicado: '$pagosAplicados.pagoAplicado',
                            saldoRestante: '$pagosAplicados.saldoRestante',
                            fechaPago: '$fechaPago',
                        }
                    }
                }
            },
            { $sort: { totalPagado: -1 } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'cliente' } },
            { $unwind: '$cliente' },
            { $project: { nombre: '$cliente.name', totalPagado: 1, pagos: 1, email: '$cliente.email' } }
        ]);

        // Ventas con saldo pendiente
        const ventasConSaldoPendiente = await Venta.aggregate([
            { $match: { saldoVenta: { $gt: 0 }, fechaVenta: filtroFecha } },
            {
                $group: {
                    _id: '$cliente',
                    ventasPendientes: {
                        $push: {
                            ventaId: '$_id',
                            fechaVenta: '$fechaVenta',
                            saldoPendiente: '$saldoVenta',
                            totalVenta: '$totalVenta'
                        }
                    }
                }
            },
            { $sort: { 'ventasPendientes.saldoPendiente': -1 } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'cliente' } },
            { $unwind: '$cliente' },
            { $project: { nombre: '$cliente.name', ventasPendientes: 1, email: '$cliente.email' } }
        ]);

        // Clientes inactivos
        const fechaLimiteInactividad = new Date(moment().subtract(30, 'days').toISOString());
        const clientesInactivos = await Venta.aggregate([
            { $match: { fechaVenta: { $lt: fechaLimiteInactividad, ...filtroFecha } } },
            {
                $group: {
                    _id: '$cliente',
                    ultimaCompra: { $max: '$fechaVenta' }
                }
            },
            { $sort: { ultimaCompra: -1 } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'cliente' } },
            { $unwind: '$cliente' },
            { $project: { nombre: '$cliente.name', ultimaCompra: 1, email: '$cliente.email' } }
        ]);

        // Resumen general
        const resumenGeneral = await Promise.all([
            Venta.aggregate([
                { $match: { fechaVenta: filtroFecha } },
                { $group: { _id: null, totalClientes: { $addToSet: '$cliente' } } },
                { $project: { totalClientes: { $size: '$totalClientes' } } }
            ]),
            Venta.aggregate([
                { $match: { saldoVenta: { $gt: 0 }, fechaVenta: filtroFecha } },
                { $group: { _id: null, totalDeudaGlobal: { $sum: '$saldoVenta' } } }
            ]),
            Venta.aggregate([
                { $match: { saldoVenta: { $eq: 0 }, fechaVenta: filtroFecha } },
                { $group: { _id: '$cliente', clientesSinDeuda: { $addToSet: '$cliente' } } },
                { $project: { totalClientesSinDeuda: { $size: '$clientesSinDeuda' } } }
            ])
        ]);

        res.json({
            clientesMasCompran,
            clientesConDeuda,
            pagosRealizados,
            ventasConSaldoPendiente,
            clientesInactivos,
            resumenGeneral: {
                totalClientes: resumenGeneral[0][0]?.totalClientes || 0,
                totalDeudaGlobal: resumenGeneral[1][0]?.totalDeudaGlobal || 0,
                totalClientesSinDeuda: resumenGeneral[2][0]?.totalClientesSinDeuda || 0
            }
        });
    } catch (error) {
        console.error('Error generando el reporte completo de clientes:', error);
        res.status(500).json({ message: 'Error generando el reporte completo de clientes' });
    }
};

const generarReporteClienteEspecifico = async (req, res) => {
    try {
        const { clienteId } = req.query;
        const filtroFecha = crearFiltroFecha(req.query);

        // Verificar si el cliente existe
        const clienteExistente = await User.exists({ _id: clienteId });
        if (!clienteExistente) {
            return res.status(400).json({ message: 'ID de cliente no válido' });
        }

        // Filtrar las ventas por cliente, saldo mayor a 0, y fechas
        const filtroVentas = {
            cliente: clienteId,
            saldoVenta: { $gt: 0 },
            fechaVenta: filtroFecha
        };

        const ventas = await Venta.find(filtroVentas)
            .populate('cliente', 'name')
            .populate('vendedor', 'name ')
            .populate('productos.productoId', 'nombre precioVenta')
            .populate('productos.lotes.loteId', 'fechaVencimiento')
            .lean();

        if (ventas.length === 0) {
            return res.status(404).json({ message: 'No se encontraron ventas para este cliente' });
        }

        const idsVentas = ventas.map(venta => venta._id);
        const pagos = await Pago.find({
            'pagosAplicados.ventaId': { $in: idsVentas },
            fechaPago: filtroFecha
        })
            .populate('cliente', 'name lastname')
            .lean();

        const mapaPagos = new Map();
        pagos.forEach(pago => {
            pago.pagosAplicados.forEach(detalle => {
                if (mapaPagos.has(detalle.ventaId.toString())) {
                    mapaPagos.get(detalle.ventaId.toString()).push({
                        pagoId: pago._id,
                        montoAplicado: detalle.pagoAplicado,
                        montoTotal: pago.montoPagado,
                        fechaPago: pago.fechaPago
                    });
                } else {
                    mapaPagos.set(detalle.ventaId.toString(), [{
                        pagoId: pago._id,
                        montoAplicado: detalle.pagoAplicado,
                        montoTotal: pago.montoPagado,
                        fechaPago: pago.fechaPago
                    }]);
                }
            });
        });

        let totalVendido = 0;
        let totalPagado = 0;
        let totalDeuda = 0;

        const ventasFormateadas = ventas.map(venta => {
            const pagosDeVenta = mapaPagos.get(venta._id.toString()) || [];
            const totalPagadoVenta = pagosDeVenta.reduce((total, pago) => total + pago.montoAplicado, 0) + venta.pagoInicial;
            totalPagado += totalPagadoVenta;
            totalDeuda += venta.saldoVenta;
            totalVendido += venta.totalVenta;

            return {
                ventaId: venta._id,
                cliente: venta.cliente ? `${venta.cliente.name}` : 'Cliente no encontrado',
                vendedor: venta.vendedor ? `${venta.vendedor.name} ` : 'Vendedor no encontrado',
                productos: venta.productos.map(p => ({
                    producto: p.productoId ? p.productoId.nombre : 'Producto no encontrado',
                    cantidad: p.cantidad,
                    precio: p.precioUnitario,
                    lotes: p.lotes.map(l => ({
                        loteId: l.loteId ? l.loteId._id : 'Lote no encontrado',
                        cantidad: l.cantidad,
                        fechaVencimiento: l.loteId ? l.loteId.fechaVencimiento : 'Sin fecha'
                    }))
                })),
                totalVenta: venta.totalVenta,
                pagoInicial: venta.pagoInicial,
                saldoVenta: venta.saldoVenta,
                fechaVenta: venta.fechaVenta,
                pagos: pagosDeVenta
            };
        });

        res.json({
            ventas: ventasFormateadas,
            totalVendido,
            totalPagado,
            totalDeuda
        });
    } catch (error) {
        console.error('Error generando reporte del cliente específico:', error);
        res.status(500).json({ message: 'Error generando el reporte del cliente' });
    }
};

const getReporteDeudasPorVendedor = async (req, res) => {
    const vendedorId = req.params.vendedorId;
    const filtroFecha = crearFiltroFecha(req.query);

    try {
        const vendedor = await User.findById(vendedorId).select('name');
        if (!vendedor) {
            return res.status(404).json({ message: 'Vendedor no encontrado' });
        }

        const ventasPendientes = await Venta.find({
            vendedor: new mongoose.Types.ObjectId(vendedorId),
            saldoVenta: { $gt: 0 },
            fechaVenta: filtroFecha
        })
            .populate('cliente', 'name')
            .populate('productos.productoId', 'nombre')
            .lean();

        console.log('Filtro de fecha aplicado:', JSON.stringify(filtroFecha, null, 2));
        console.log('Ventas encontradas:', ventasPendientes.length);
        ventasPendientes.forEach((venta, index) => {
            console.log(`Venta ${index + 1}:`, venta);
        });

        const reporte = [];
        const clientesMap = new Map();

        ventasPendientes.forEach(venta => {
            const clienteId = venta.cliente._id.toString();
            if (!clientesMap.has(clienteId)) {
                clientesMap.set(clienteId, {
                    cliente: venta.cliente.name,
                    totalDeuda: 0,
                    cobrado: 0,
                    ventas: []
                });
            }

            const clienteData = clientesMap.get(clienteId);
            clienteData.totalDeuda += venta.saldoVenta;
            clienteData.ventas.push({
                fecha: venta.fechaVenta,
                totalVenta: venta.totalVenta,
                saldoVenta: venta.saldoVenta,
                productos: venta.productos.map(p => p.productoId.nombre)
            });
        });

        clientesMap.forEach(clienteData => {
            reporte.push(clienteData);
        });

        const totalDeuda = ventasPendientes.reduce((acc, venta) => acc + venta.saldoVenta, 0);
        const totalCobrado = ventasPendientes.reduce((acc, venta) => acc + (venta.totalVenta - venta.saldoVenta), 0);

        const resultadoFinal = {
            vendedor: vendedor.name,
            totalDeuda: totalDeuda,
            totalCobrado: totalCobrado,
            clientes: reporte
        };

        res.json(resultadoFinal);
    } catch (error) {
        console.error('Error obteniendo reporte de deudas por vendedor:', error);
        res.status(500).json({ message: 'Error obteniendo reporte de deudas por vendedor' });
    }
};

module.exports = {
    generarReporteProductosCompleto,
    generarReporteClientesCompleto,
    generarReporteClienteEspecifico,
    getReporteDeudasPorVendedor
};