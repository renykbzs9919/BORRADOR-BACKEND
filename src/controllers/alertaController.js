const moment = require('moment-timezone');
const Alerta = require('../models/Alerta');
const LoteProduccion = require('../models/LoteProduccion');
const Stock = require('../models/Stock');
const Parametro = require('../models/Parametro');

// Generar alertas de stock bajo, vencimiento y almacenamiento máximo (POST)
exports.generarAlertas = async (req, res) => {
    try {
        // Eliminar todas las alertas existentes en la base de datos (esto depende de la lógica de tu negocio, si es necesario)
        await Alerta.deleteMany({});

        const alertasGeneradas = [];

        // Obtener los parámetros necesarios
        const diasProximosAExpirar = await Parametro.findOne({ nombre: 'dias_Proximos_A_Expirar' });
        const stockMinimo = await Parametro.findOne({ nombre: 'stock_Minimo' });
        const stockMaximo = await Parametro.findOne({ nombre: 'stock_Maximo' });
        const diasAntesAlertaExpiracion = await Parametro.findOne({ nombre: 'dias_Antes_Alerta_Expiracion' });
        const cantidadMinimaReabastecimiento = await Parametro.findOne({ nombre: 'cantidad_minima_reabastecimiento' });

        // Buscar productos con bajo stock o por encima del stock máximo
        const productosStock = await Stock.find({
            $or: [
                { $expr: { $lt: ["$stockDisponible", stockMinimo.valor] } },  // Stock bajo
                { $expr: { $gt: ["$stockDisponible", stockMaximo.valor] } }   // Stock por encima del máximo
            ]
        }).populate('productoId');

        // Fecha actual y fecha límite para vencimientos
        const hoy = moment().tz('America/La_Paz').toDate();
        const fechaExpiracionProxima = moment(hoy).add(diasProximosAExpirar.valor, 'days').toDate();

        // Buscar lotes próximos a expirar
        const lotesCercaExpirar = await LoteProduccion.find({
            fechaVencimiento: { $gte: hoy, $lte: fechaExpiracionProxima }
        }).populate('productoId');

        // Generar alertas de stock (bajo o por encima del máximo)
        for (let stock of productosStock) {
            if (stock.stockDisponible < stockMinimo.valor) {
                const alertaStockBajo = await generarAlertaStockBajo(stock, stockMinimo.valor, cantidadMinimaReabastecimiento.valor);
                if (alertaStockBajo) alertasGeneradas.push(alertaStockBajo);
            } else if (stock.stockDisponible > stockMaximo.valor) {
                const alertaStockAlto = await generarAlertaStockAlto(stock, stockMaximo.valor);
                if (alertaStockAlto) alertasGeneradas.push(alertaStockAlto);
            }
        }

        // Generar alertas de vencimiento
        for (let lote of lotesCercaExpirar) {
            const alertaVencimiento = await generarAlertaVencimiento(lote, diasAntesAlertaExpiracion.valor);
            if (alertaVencimiento) alertasGeneradas.push(alertaVencimiento);
        }

        res.status(201).json({
            message: 'Alertas generadas con éxito',
            alertas: alertasGeneradas
        });
    } catch (error) {
        console.error('Error al generar las alertas:', error);
        res.status(500).json({ error: 'Error al generar las alertas.' });
    }
};

// Función para generar alerta de stock bajo
const generarAlertaStockBajo = async (stock, stockMinimo, cantidadMinimaReabastecimiento) => {
    const alerta = new Alerta({
        productoId: stock.productoId._id,
        tipoAlerta: 'stock_bajo',
        descripcion: `El stock del producto "${stock.productoId.nombre}" está por debajo del umbral mínimo (${stockMinimo} unidades).`,
        prioridad: 'alta',
        umbralReabastecimiento: cantidadMinimaReabastecimiento,
        stockActual: stock.stockDisponible,
        stockMinimo: stockMinimo,
        alertaStockBajo: true,
        fechaAlerta: moment().tz('America/La_Paz').toDate()
    });

    await alerta.save();
    return alerta;
};

// Función para generar alerta de almacenamiento máximo
const generarAlertaStockAlto = async (stock, stockMaximo) => {
    const alerta = new Alerta({
        productoId: stock.productoId._id,
        tipoAlerta: 'almacenamiento_maximo',
        descripcion: `El stock del producto "${stock.productoId.nombre}" ha excedido el máximo permitido (${stockMaximo} unidades).`,
        prioridad: 'media',
        stockActual: stock.stockDisponible,
        stockMaximo: stockMaximo,
        alertaStockMaximo: true,  // Se activa la alerta de stock máximo
        fechaAlerta: moment().tz('America/La_Paz').toDate()
    });

    await alerta.save();
    return alerta;
};

// Función para generar alerta de vencimiento
const generarAlertaVencimiento = async (lote, diasAntesAlertaExpiracion) => {
    const alerta = new Alerta({
        productoId: lote.productoId._id,
        loteId: lote._id,
        tipoAlerta: 'vencimiento',
        descripcion: `El lote "${lote.codigoLote}" del producto "${lote.productoId.nombre}" está próximo a vencer en los próximos ${diasAntesAlertaExpiracion} días.`,
        prioridad: 'media',
        alertaVencimiento: true,
        fechaVencimiento: moment(lote.fechaVencimiento).tz('America/La_Paz').toDate(),
        fechaAlerta: moment().tz('America/La_Paz').toDate()
    });

    await alerta.save();
    return alerta;
};

// Obtener todas las alertas (GET)
exports.obtenerAlertas = async (req, res) => {
    try {
        const alertas = await Alerta.find()
            .populate('productoId', 'nombre descripcion')
            .populate('loteId', 'codigoLote');

        const alertasConFechas = alertas.map(alerta => {
            return {
                ...alerta.toObject(),
                fechaAlerta: moment(alerta.fechaAlerta).tz('America/La_Paz').format('YYYY-MM-DD HH:mm:ss'),
                fechaVencimiento: alerta.fechaVencimiento ? moment(alerta.fechaVencimiento).tz('America/La_Paz').format('YYYY-MM-DD HH:mm:ss') : null
            };
        });

        res.status(200).json(alertasConFechas);
    } catch (error) {
        console.error('Error al obtener las alertas:', error);
        res.status(500).json({ error: 'Error al obtener las alertas.' });
    }
};
