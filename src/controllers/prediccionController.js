const mongoose = require('mongoose');
const ARIMA = require('arima');
const Venta = require('../models/Venta');
const LoteProduccion = require('../models/LoteProduccion');

// Función para obtener datos históricos de ventas (a nivel diario)
const obtenerDatosHistoricosVentasDiario = async (productoId) => {
    const ventasDiarias = await Venta.aggregate([
        {
            $match: { "productos.productoId": new mongoose.Types.ObjectId(productoId) }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$fechaVenta" } },  // Agrupación diaria
                totalVentas: { $sum: "$totalVenta" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    return ventasDiarias.map(v => v.totalVentas);
};

// Función para obtener datos históricos de producción por producto (a nivel diario)
const obtenerDatosHistoricosProduccionDiario = async (productoId) => {
    const produccionDiaria = await LoteProduccion.aggregate([
        {
            $match: { productoId: new mongoose.Types.ObjectId(productoId) }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$fechaProduccion" } },  // Agrupación diaria
                totalProducido: { $sum: "$cantidadProducida" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    return produccionDiaria.map(p => p.totalProducido);
};

// Función para obtener datos históricos de ventas (a nivel mensual)
const obtenerDatosHistoricosVentasMensual = async (productoId) => {
    const ventasMensuales = await Venta.aggregate([
        {
            $match: { "productos.productoId": new mongoose.Types.ObjectId(productoId) }
        },
        {
            $group: {
                _id: { $month: "$fechaVenta" },  // Agrupación mensual
                totalVentas: { $sum: "$totalVenta" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    return ventasMensuales.map(v => v.totalVentas);
};

// Función para obtener datos históricos de producción por producto (a nivel mensual)
const obtenerDatosHistoricosProduccionMensual = async (productoId) => {
    const produccionMensual = await LoteProduccion.aggregate([
        {
            $match: { productoId: new mongoose.Types.ObjectId(productoId) }
        },
        {
            $group: {
                _id: { $month: "$fechaProduccion" },  // Agrupación mensual
                totalProducido: { $sum: "$cantidadProducida" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    return produccionMensual.map(p => p.totalProducido);
};

// Función para calcular el Error Medio Absoluto (MAE)
const calcularMAE = (valoresReales, predicciones) => {
    const erroresAbsolutos = valoresReales.map((valor, index) => Math.abs(valor - predicciones[index]));
    return erroresAbsolutos.reduce((a, b) => a + b, 0) / valoresReales.length;
};

// Función para calcular el Error Cuadrático Medio (RMSE)
const calcularRMSE = (valoresReales, predicciones) => {
    const erroresCuadrados = valoresReales.map((valor, index) => Math.pow(valor - predicciones[index], 2));
    return Math.sqrt(erroresCuadrados.reduce((a, b) => a + b, 0) / valoresReales.length);
};

// Función para calcular el Error Porcentual Medio Absoluto (MAPE)
const calcularMAPE = (valoresReales, predicciones) => {
    const erroresPorcentuales = valoresReales.map((valor, index) => Math.abs((valor - predicciones[index]) / valor));
    return (erroresPorcentuales.reduce((a, b) => a + b, 0) / valoresReales.length) * 100;
};

// Función para aplicar SARIMA y predecir (diario)
const aplicarSARIMAYPredecirDiario = (datosHistoricos) => {
    console.log('Datos históricos (diario):', datosHistoricos);

    // Ajustar manualmente los parámetros de SARIMA
    const sarima = new ARIMA({
        p: 1, d: 1, q: 1,   // Parámetros de ARIMA
        P: 1, D: 1, Q: 1,   // Parámetros de la parte estacional
        s: 7,               // Estacionalidad semanal (cada 7 días)
        method: 0,          // Cambiar el método de optimización a MLE exacto
        optimizer: 6,       // Optimización con L-BFGS (por defecto)
        verbose: true       // Modo verboso para debug
    }).train(datosHistoricos);


    // Predecir los próximos 7 días
    const [predicciones, errores] = sarima.predict(7);

    console.log('Predicciones (diario):', predicciones);
    console.log('Errores (diario):', errores);

    return { predicciones, errores };
};

// Función para aplicar SARIMA y predecir (mensual)
const aplicarSARIMAYPredecirMensual = (datosHistoricos) => {
    console.log('Datos históricos (mensual):', datosHistoricos);

    const sarima = new ARIMA({
        p: 2, d: 1, q: 2,   // Parámetros de ARIMA
        P: 1, D: 1, Q: 1,   // Parámetros de la parte estacional
        s: 12,              // Estacionalidad mensual (12 meses)
        method: 0,          // Optimización con MLE exacto
        optimizer: 6,       // L-BFGS por defecto
        verbose: true       // Modo verboso para debug
    }).train(datosHistoricos);

    const [predicciones, errores] = sarima.predict(12);  // Predecir 12 meses

    console.log('Predicciones (mensual):', predicciones);
    return { predicciones, errores };
};

// Controlador principal para obtener predicciones de ventas y producción con filtro de query
const obtenerPrediccionesVentasYProduccion = async (req, res) => {
    try {
        const { productoId } = req.params;
        const { tipo } = req.query; // 'mensual' o 'diario'

        if (!productoId) {
            return res.status(400).json({ error: 'Debe proporcionar un productoId' });
        }

        if (!tipo || (tipo !== 'mensual' && tipo !== 'diario')) {
            return res.status(400).json({ error: 'Debe especificar "tipo" como "mensual" o "diario".' });
        }

        let ventasHistoricas;
        let produccionHistorica;
        let prediccionesVentas, erroresVentas;
        let prediccionesProduccion, erroresProduccion;

        if (tipo === 'diario') {
            // 1. Obtener los datos históricos de ventas por producto (diario)
            ventasHistoricas = await obtenerDatosHistoricosVentasDiario(productoId);

            // 2. Obtener los datos históricos de producción por producto (diario)
            produccionHistorica = await obtenerDatosHistoricosProduccionDiario(productoId);

            if (ventasHistoricas.length < 7 || produccionHistorica.length < 7) {
                return res.status(400).json({ error: 'No hay suficientes datos históricos para hacer predicciones diarias.' });
            }

            // 3. Aplicar SARIMA y predecir con los datos históricos de ventas (diario)
            ({ predicciones: prediccionesVentas, errores: erroresVentas } = aplicarSARIMAYPredecirDiario(ventasHistoricas));

            // 4. Aplicar SARIMA y predecir con los datos históricos de producción (diario)
            ({ predicciones: prediccionesProduccion, errores: erroresProduccion } = aplicarSARIMAYPredecirDiario(produccionHistorica));
        } else if (tipo === 'mensual') {
            // 1. Obtener los datos históricos de ventas por producto (mensual)
            ventasHistoricas = await obtenerDatosHistoricosVentasMensual(productoId);

            // 2. Obtener los datos históricos de producción por producto (mensual)
            produccionHistorica = await obtenerDatosHistoricosProduccionMensual(productoId);

            if (ventasHistoricas.length < 12 || produccionHistorica.length < 12) {
                return res.status(400).json({ error: 'No hay suficientes datos históricos para hacer predicciones mensuales.' });
            }

            // 3. Aplicar SARIMA y predecir con los datos históricos de ventas (mensual)
            ({ predicciones: prediccionesVentas, errores: erroresVentas } = aplicarSARIMAYPredecirMensual(ventasHistoricas));

            // 4. Aplicar SARIMA y predecir con los datos históricos de producción (mensual)
            ({ predicciones: prediccionesProduccion, errores: erroresProduccion } = aplicarSARIMAYPredecirMensual(produccionHistorica));
        }

        // 5. Calcular las métricas de error para ventas
        const maeVentas = calcularMAE(ventasHistoricas, prediccionesVentas);
        const rmseVentas = calcularRMSE(ventasHistoricas, prediccionesVentas);
        const mapeVentas = calcularMAPE(ventasHistoricas, prediccionesVentas);

        // 6. Calcular las métricas de error para producción
        const maeProduccion = calcularMAE(produccionHistorica, prediccionesProduccion);
        const rmseProduccion = calcularRMSE(produccionHistorica, prediccionesProduccion);
        const mapeProduccion = calcularMAPE(produccionHistorica, prediccionesProduccion);

        // 7. Responder con las predicciones y los valores históricos en formato JSON
        res.json({
            productoId,
            tipo,  // Indica si es diario o mensual
            ventas: {
                historico: ventasHistoricas,  // Datos históricos de ventas
                predicciones: prediccionesVentas,  // Predicciones
                mae: maeVentas,
                rmse: rmseVentas,
                mape: mapeVentas
            },
            produccion: {
                historico: produccionHistorica,  // Datos históricos de producción
                predicciones: prediccionesProduccion,  // Predicciones
                mae: maeProduccion,
                rmse: rmseProduccion,
                mape: mapeProduccion
            }
        });
    } catch (error) {
        console.error('Error al obtener predicciones:', error);
        res.status(500).json({ error: 'Error al obtener predicciones', detalle: error.message });
    }
};

module.exports = { obtenerPrediccionesVentasYProduccion };
