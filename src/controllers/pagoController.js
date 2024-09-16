const Pago = require('../models/Pago');
const Venta = require('../models/Venta');

// Crear un nuevo pago y aplicarlo a las ventas con saldo pendiente
exports.createPayment = async (req, res) => {
    try {
        const { cliente, montoPagado, metodoPago, fechaPago, ventas } = req.body;

        let ventasPendientes = [];
        let totalDeuda = 0;

        if (ventas && ventas.length > 0) {
            // Si se envían IDs de ventas, buscar solo esas ventas
            let query = { _id: { $in: ventas }, saldoVenta: { $gt: 0 } };
            ventasPendientes = await Venta.find(query).sort({ fechaVenta: 1 });

            // Verificar que las ventas existan y correspondan al cliente
            if (ventasPendientes.length === 0) {
                return res.status(400).json({ error: 'No se encontraron ventas con saldo pendiente o no se encontraron las ventas especificadas.' });
            }

            // Validar que todas las ventas pertenezcan al cliente
            const ventasInvalidas = ventasPendientes.filter(venta => String(venta.cliente) !== cliente);
            if (ventasInvalidas.length > 0) {
                return res.status(400).json({
                    error: 'Una o más ventas no pertenecen al cliente proporcionado.',
                    ventasInvalidas: ventasInvalidas.map(venta => venta._id)
                });
            }

            // Verificar que todas las ventas tengan saldo pendiente
            const ventasSinSaldo = ventas.filter(ventaId => !ventasPendientes.some(venta => String(venta._id) === ventaId));
            if (ventasSinSaldo.length > 0) {
                return res.status(400).json({
                    error: 'Una o más ventas no tienen saldo pendiente.',
                    ventasSinSaldo: ventasSinSaldo
                });
            }

            // Calcular la suma total de las deudas de las ventas seleccionadas
            totalDeuda = ventasPendientes.reduce((acc, venta) => acc + venta.saldoVenta, 0);

            // Verificar que el monto pagado sea igual al total de las deudas
            if (montoPagado !== totalDeuda) {
                return res.status(400).json({
                    error: `El monto pagado debe ser igual a la suma total de las deudas (${totalDeuda} BS) de las ventas especificadas.`
                });
            }

        } else {
            // Si no se envían IDs de ventas, obtener todas las ventas pendientes del cliente
            ventasPendientes = await Venta.find({ cliente, saldoVenta: { $gt: 0 } }).sort({ fechaVenta: 1 });

            if (ventasPendientes.length === 0) {
                return res.status(400).json({ error: 'No se encontraron ventas con saldo pendiente para este cliente.' });
            }

            // Calcular el saldo total de todas las deudas
            totalDeuda = ventasPendientes.reduce((acc, venta) => acc + venta.saldoVenta, 0);

            // Verificar que el monto pagado no supere la deuda total
            if (montoPagado > totalDeuda) {
                return res.status(400).json({
                    error: `El monto pagado no puede ser mayor que el saldo total (${totalDeuda} BS) de todas las deudas del cliente.`
                });
            }
        }

        let montoRestante = montoPagado;
        const pagosAplicados = [];

        // Aplicar el pago a las ventas pendientes, empezando por las más antiguas
        for (const venta of ventasPendientes) {
            if (montoRestante <= 0) break;

            const saldoPrevio = venta.saldoVenta;
            const pagoAplicado = Math.min(montoRestante, venta.saldoVenta);
            venta.saldoVenta -= pagoAplicado;
            await venta.save();

            pagosAplicados.push({
                ventaId: venta._id,
                saldoPrevio,
                pagoAplicado,
                saldoRestante: venta.saldoVenta
            });

            montoRestante -= pagoAplicado;
        }

        // Establecer la fecha del pago
        const nuevaFechaPago = fechaPago ? new Date(fechaPago) : new Date();

        // Crear el nuevo registro de pago
        const nuevoPago = new Pago({
            cliente,
            montoPagado,
            saldoRestante: montoRestante,
            metodoPago,
            fechaPago: nuevaFechaPago,
            pagosAplicados // Detalles del pago aplicado
        });

        await nuevoPago.save();

        // Responder con los detalles del pago aplicado
        res.status(201).json({
            fechaPago: nuevoPago.fechaPago,
            message: `El cliente pagó ${montoPagado} BS y se aplicó a las ventas.`,
            pagosAplicados
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener pagos realizados por un cliente
exports.getPaymentsByCustomer = async (req, res) => {
    const { clienteId } = req.params;

    try {
        const pagos = await Pago.find({ cliente: clienteId })
            .populate('pagosAplicados.ventaId')  // Poblamos los detalles de las ventas relacionadas
            .sort({ fechaPago: -1 })  // Ordenar por fecha de pago más reciente
            .lean();

        if (pagos.length === 0) {
            return res.status(404).json({ error: 'No se encontraron pagos para este cliente.' });
        }

        // Recorremos los pagos para generar la respuesta con más detalles
        const response = pagos.map(pago => ({
            fechaPago: pago.fechaPago,
            montoPagado: pago.montoPagado,
            metodoPago: pago.metodoPago,
            saldoRestante: pago.saldoRestante,
            pagosAplicados: pago.pagosAplicados.map(detalle => ({
                ventaId: detalle.ventaId._id,
                fechaVenta: detalle.ventaId.fechaVenta,
                totalVenta: detalle.ventaId.totalVenta,
                saldoPrevio: detalle.saldoPrevio,
                pagoAplicado: detalle.pagoAplicado,
                saldoRestante: detalle.saldoRestante
            }))
        }));

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener ventas con saldo pendiente de un cliente
exports.getOutstandingSalesByCustomer = async (req, res) => {
    const { clienteId } = req.params;

    try {
        const ventasPendientes = await Venta.find({ cliente: clienteId, saldoVenta: { $gt: 0 } })
            .sort({ fechaVenta: -1 })
            .lean();

        if (ventasPendientes.length === 0) {
            return res.status(404).json({ error: 'No se encontraron ventas con saldo pendiente para este cliente.' });
        }

        const response = ventasPendientes.map(venta => ({
            ventaId: venta._id,
            fechaVenta: venta.fechaVenta,
            totalVenta: venta.totalVenta,
            saldoVenta: venta.saldoVenta
        }));

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
