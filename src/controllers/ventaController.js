const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const LoteProduccion = require('../models/LoteProduccion');
const Stock = require('../models/Stock');
const MovimientoInventario = require('../models/MovimientoInventario');
const Parametro = require('../models/Parametro');

// Función para generar movimiento ID único e incremental
const generateMovimientoId = async () => {
    const lastMovimiento = await MovimientoInventario.findOne().sort({ createdAt: -1 });
    let nextId = 1;

    if (lastMovimiento && lastMovimiento.movimientoId) {
        const lastIdNumber = parseInt(lastMovimiento.movimientoId.split('-')[1], 10);
        nextId = lastIdNumber + 1;
    }

    return `MOV-${nextId.toString().padStart(6, '0')}`;
};
// 

// Crear una nueva venta con validaciones de límite de deuda y cantidades
exports.createVenta = async (req, res) => {
    try {
        const { cliente, vendedor, productos, pagoInicial = 0, fechaVenta, notas } = req.body;
        const userId = req.user ? req.user._id : null;  // ID del usuario que realiza la venta

        // Validación de campos requeridos
        if (!cliente || typeof cliente !== 'string') {
            return res.status(400).json({ error: 'El campo "cliente" es requerido y debe ser una cadena de texto válida.' });
        }
        if (!vendedor || typeof vendedor !== 'string') {
            return res.status(400).json({ error: 'El campo "vendedor" es requerido y debe ser una cadena de texto válida.' });
        }
        if (!Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ error: 'El campo "productos" es requerido y debe ser un array de productos.' });
        }
        if (typeof pagoInicial !== 'number' || pagoInicial < 0) {
            return res.status(400).json({ error: 'El campo "pagoInicial" debe ser un número positivo o cero.' });
        }

        // Obtener el parámetro límite de deuda del cliente
        const limiteDeudas = await Parametro.findOne({ nombre: 'limite_Deudas_Cliente' });
        if (!limiteDeudas) {
            return res.status(500).json({ error: 'El parámetro límite de deudas no está configurado.' });
        }

        // Calcular la deuda actual del cliente (ventas pendientes)
        const ventasPendientes = await Venta.find({ cliente, estado: 'pendiente' });
        const deudaTotalCliente = ventasPendientes.reduce((total, venta) => total + venta.saldoVenta, 0);

        // Advertencia si el cliente ha excedido el límite de deuda
        let advertenciaDeuda = null;
        if (deudaTotalCliente > limiteDeudas.valor) {
            advertenciaDeuda = `Advertencia: El cliente ha superado el límite de deudas permitido (${limiteDeudas.valor} Bs). La venta se ha realizado, pero la deuda hasta la fecha del cliente es ${deudaTotalCliente} Bs.`;
        }

        let totalVenta = 0;
        let lotesUsadosVenta = [];  // Para almacenar los lotes usados en la venta

        // Validación de productos y gestión de lotes
        for (let producto of productos) {
            if (!producto.productoId || typeof producto.productoId !== 'string') {
                return res.status(400).json({ error: 'Cada producto debe tener un "productoId" válido.' });
            }
            if (!producto.cantidad || typeof producto.cantidad !== 'number' || producto.cantidad <= 0) {
                return res.status(400).json({ error: 'Cada producto debe tener una "cantidad" mayor a cero.' });
            }
            if (!Array.isArray(producto.lotes) || producto.lotes.length === 0) {
                return res.status(400).json({ error: 'Debes seleccionar al menos un lote para el producto.' });
            }

            // Verificar existencia del producto
            const productoInfo = await Producto.findById(producto.productoId);
            if (!productoInfo) {
                return res.status(400).json({ error: `El producto con ID ${producto.productoId} no existe.` });
            }

            // Obtener el precio unitario, si no se envía, usar el precioVenta del producto
            const precioUnitario = producto.precioUnitario || productoInfo.precioVenta;

            let cantidadRestante = producto.cantidad;
            let cantidadTotalLotes = 0; // Para verificar que la suma de los lotes no exceda la cantidad total del producto

            // Validar y ordenar los lotes enviados por fecha de producción (los más antiguos primero)
            const lotesOrdenados = [];
            for (let lote of producto.lotes) {
                const loteInfo = await LoteProduccion.findById(lote.loteId);

                if (!loteInfo) {
                    return res.status(400).json({ error: `El lote con ID ${lote.loteId} no existe.` });
                }

                // Validar que el lote pertenece al producto
                if (loteInfo.productoId.toString() !== producto.productoId) {
                    return res.status(400).json({ error: `El lote ${loteInfo.codigoLote} no pertenece al producto ${productoInfo.nombre}.` });
                }

                // Validar que la cantidad solicitada del lote no exceda la cantidad disponible en el lote
                if (lote.cantidad > loteInfo.cantidadDisponible) {
                    return res.status(400).json({
                        error: `La cantidad solicitada (${lote.cantidad}) para el lote ${loteInfo.codigoLote} excede la cantidad disponible (${loteInfo.cantidadDisponible}).`
                    });
                }

                // Acumular la cantidad total de los lotes para el producto
                cantidadTotalLotes += lote.cantidad;

                // Agregar lote a la lista de lotes usados
                lotesOrdenados.push({ ...lote, loteInfo });
            }

            // Validar que la cantidad total de los lotes no sea menor que la cantidad solicitada del producto
            if (cantidadTotalLotes < producto.cantidad) {
                return res.status(400).json({
                    error: `La cantidad total de los lotes (${cantidadTotalLotes}) no cubre la cantidad solicitada (${producto.cantidad}) para el producto ${productoInfo.nombre}.`
                });
            }

            let lotesUsados = [];
            let cantidadSobrante = producto.cantidad;

            // Ordenar los lotes por fecha de producción
            lotesOrdenados.sort((a, b) => new Date(a.loteInfo.fechaProduccion) - new Date(b.loteInfo.fechaProduccion));

            // Procesar los lotes usados en la venta
            for (let lote of lotesOrdenados) {
                const loteInfo = lote.loteInfo;

                let cantidadUsadaDelLote = Math.min(lote.cantidad, cantidadSobrante);
                lotesUsados.push({ loteId: lote.loteId, cantidad: cantidadUsadaDelLote });

                // Guardar los lotes usados en la venta
                lotesUsadosVenta.push({
                    productoId: producto.productoId,
                    loteId: lote.loteId,
                    cantidadUsada: cantidadUsadaDelLote
                });

                // Restar la cantidad utilizada del lote
                cantidadSobrante -= cantidadUsadaDelLote;

                // Si ya se ha cubierto la cantidad solicitada, detener el proceso
                if (cantidadSobrante <= 0) break;
            }

            // Calcular el total de la venta para este producto
            totalVenta += producto.cantidad * precioUnitario;
            producto.lotes = lotesUsados;
            producto.precioUnitario = precioUnitario;
        }

        // Determinar el saldo de la venta
        const saldoVenta = totalVenta - pagoInicial;

        // Crear nueva venta
        const nuevaVenta = new Venta({
            cliente,
            vendedor,
            productos,
            pagoInicial,
            saldoVenta,
            totalVenta,
            fechaVenta: fechaVenta || new Date(),
            estado: saldoVenta === 0 ? 'completada' : 'pendiente',
            notas
        });

        // Guardar la nueva venta
        await nuevaVenta.save();

        // Actualización de stock y generación de movimientos de inventario
        for (let producto of productos) {
            for (let lote of producto.lotes) {
                const loteInfo = await LoteProduccion.findById(lote.loteId);

                // Actualizar el lote
                loteInfo.cantidadVendida += lote.cantidad;
                loteInfo.cantidadDisponible -= lote.cantidad;
                if (loteInfo.cantidadDisponible <= 0) loteInfo.estado = 'agotado';
                await loteInfo.save();

                // Generar movimiento de inventario
                const movimientoId = await generateMovimientoId();
                const nuevoMovimiento = new MovimientoInventario({
                    movimientoId,
                    productoId: producto.productoId,
                    loteProduccion: loteInfo._id,
                    tipoMovimiento: 'SALIDA',
                    razon: 'VENTA',
                    cantidad: lote.cantidad,
                    fechaMovimiento: fechaVenta || new Date(),
                    costoMovimiento: lote.cantidad * producto.precioUnitario,
                    usuarioId: userId,
                    origenDestino: 'VENTA'
                });

                await nuevoMovimiento.save();
            }
        }

        // Respuesta exitosa, incluyendo los lotes usados y la advertencia si hay exceso de deuda
        return res.status(201).json({
            message: 'Venta realizada exitosamente.',
            venta: nuevaVenta,
            lotesUsados: lotesUsadosVenta,
            advertenciaDeuda // Incluir advertencia si el cliente ha superado el límite de deuda
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

// Función para registrar múltiples ventas


// Obtener todas las ventas
exports.getVentas = async (req, res) => {
    try {
        const ventas = await Venta.find()
            .populate({
                path: 'cliente',
                select: '-password -resetPasswordToken -resetPasswordExpires -__v' // Excluir campos sensibles
            })
            .populate({
                path: 'vendedor',
                select: '-password -resetPasswordToken -resetPasswordExpires -__v' // Excluir campos sensibles
            })
            .populate('productos.productoId', 'nombre')  // Solo traer el nombre del producto
            .populate('productos.lotes.loteId', 'codigoLote'); // Solo traer el código del lote

        res.status(200).json({ ventas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las ventas.' });
    }
};



// Obtener una venta por su ID
exports.getVentaById = async (req, res) => {
    try {
        const venta = await Venta.findById(req.params.id)
            .populate({
                path: 'cliente',
                select: '-password -resetPasswordToken -resetPasswordExpires -__v'  // Excluir campos sensibles
            })
            .populate({
                path: 'vendedor',
                select: '-password -resetPasswordToken -resetPasswordExpires -__v'  // Excluir campos sensibles
            })
            .populate('productos.productoId', 'nombre')
            .populate('productos.lotes.loteId', 'codigoLote');

        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }

        res.status(200).json({ venta });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la venta.' });
    }
};



//actualizar una venta por su ID
exports.updateVenta = async (req, res) => {
    try {
        const { cliente, vendedor, productos, pagoInicial, fechaVenta, notas } = req.body;

        // Validar si la venta existe
        const venta = await Venta.findById(req.params.id);
        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }

        // Actualizar los campos
        venta.cliente = cliente || venta.cliente;
        venta.vendedor = vendedor || venta.vendedor;
        venta.productos = productos || venta.productos;
        venta.pagoInicial = pagoInicial !== undefined ? pagoInicial : venta.pagoInicial;
        venta.fechaVenta = fechaVenta || venta.fechaVenta;
        venta.notas = notas || venta.notas;

        // Recalcular el saldo y el total de la venta
        let totalVenta = 0;
        for (let producto of venta.productos) {
            const productoInfo = await Producto.findById(producto.productoId);
            const precioUnitario = producto.precioUnitario || productoInfo.precioVenta;
            totalVenta += producto.cantidad * precioUnitario;
        }

        const saldoVenta = totalVenta - venta.pagoInicial;
        venta.totalVenta = totalVenta;
        venta.saldoVenta = saldoVenta;
        venta.estado = saldoVenta === 0 ? 'completada' : 'pendiente';

        // Guardar la venta actualizada
        await venta.save();

        res.status(200).json({
            message: 'Venta actualizada exitosamente.',
            venta
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar la venta.' });
    }
};


// Eliminar una venta por su ID
exports.deleteVenta = async (req, res) => {
    try {
        const venta = await Venta.findById(req.params.id);

        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada.' });
        }

        // Verificar si la venta tiene movimientos de inventario asociados
        const movimientosAsociados = await MovimientoInventario.find({ razon: 'VENTA', productoId: { $in: venta.productos.map(p => p.productoId) } });

        if (movimientosAsociados.length > 0) {
            return res.status(400).json({ error: 'No se puede eliminar la venta porque está asociada a movimientos de inventario.' });
        }

        // Eliminar la venta
        await Venta.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Venta eliminada exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la venta.' });
    }
};
