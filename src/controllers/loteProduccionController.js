const LoteProduccion = require('../models/LoteProduccion');
const Producto = require('../models/Producto');
const Stock = require('../models/Stock');
const Venta = require('../models/Venta');
const MovimientoInventario = require('../models/MovimientoInventario');
const Parametro = require('../models/Parametro');

// Función para generar código de lote único e incremental
const generateLoteCode = async () => {
    const lastLote = await LoteProduccion.findOne().sort({ createdAt: -1 });
    let nextId = 1;

    if (lastLote && lastLote.codigoLote) {
        const lastIdNumber = parseInt(lastLote.codigoLote.split('-')[1], 10);
        nextId = lastIdNumber + 1;
    }

    return `LOTE-${nextId.toString().padStart(6, '0')}`;
};

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

// Crear un nuevo lote de producción
exports.createLoteProduccion = async (req, res) => {
    try {
        const { productoId, cantidadProducida, ubicacionLote } = req.body;
        const userId = req.user ? req.user._id : null;

        // Obtener parámetros necesarios
        const stockMinimo = await Parametro.findOne({ nombre: 'stock_Minimo' });
        const diasProximosAExpirar = await Parametro.findOne({ nombre: 'dias_Proximos_A_Expirar' });

        // Validar los campos
        if (!productoId || typeof productoId !== 'string') {
            return res.status(400).json({ error: 'El campo "productoId" es requerido y debe ser una cadena de texto válida.' });
        }
        if (!cantidadProducida || typeof cantidadProducida !== 'number' || cantidadProducida <= 0) {
            return res.status(400).json({ error: 'El campo "cantidadProducida" es requerido y debe ser un número positivo.' });
        }
        if (!ubicacionLote || typeof ubicacionLote !== 'string') {
            return res.status(400).json({ error: 'El campo "ubicacionLote" es requerido y debe ser una cadena de texto.' });
        }

        // Verificar si el producto existe
        const producto = await Producto.findById(productoId);
        if (!producto) {
            return res.status(400).json({ error: 'El producto asociado no existe.' });
        }

        // Generar el costo del lote basado en la cantidad producida y el costo del producto
        const costoLote = cantidadProducida * producto.costo;

        // Generar código de lote
        const codigoLote = await generateLoteCode();

        // Usar la fecha actual si no se proporciona una fecha de producción
        const fechaProduccion = req.body.fechaProduccion ? new Date(req.body.fechaProduccion) : new Date();

        // Calcular la fecha de vencimiento sumando los días de expiración del producto
        const fechaVencimiento = new Date(fechaProduccion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + producto.diasExpiracion);

        // Crear el nuevo lote de producción
        const nuevoLote = new LoteProduccion({
            productoId,
            fechaProduccion,
            cantidadProducida,
            cantidadVendida: 0,  // Inicialmente 0
            fechaVencimiento,
            costoLote,
            ubicacionLote,
            codigoLote
        });

        // Guardar el lote de producción
        await nuevoLote.save();

        // Actualizar el stock del producto
        const stock = await Stock.findOne({ productoId });
        if (stock) {
            stock.stockActual += cantidadProducida;  // Incrementar el stock actual
            if (stockMinimo.valor !== 0 && stock.stockActual < stockMinimo.valor) {
                return res.status(400).json({ error: `El stock actual (${stock.stockActual}) está por debajo del mínimo permitido (${stockMinimo.valor}).`, status: 400 });
            }
            await stock.save();
        }

        // Generar movimientoId
        const movimientoId = await generateMovimientoId();

        // Crear un nuevo movimiento de inventario de tipo ENTRADA
        const nuevoMovimiento = new MovimientoInventario({
            movimientoId,
            productoId,
            loteProduccion: nuevoLote._id,
            tipoMovimiento: 'ENTRADA',
            razon: 'PRODUCTOS FABRICADOS',
            cantidad: cantidadProducida,
            fechaMovimiento: fechaProduccion,
            costoMovimiento: costoLote,
            usuarioId: userId,
            origenDestino: 'almacen'
        });

        // Guardar el movimiento de inventario
        await nuevoMovimiento.save();

        // Validar si el lote está próximo a expirar
        if (diasProximosAExpirar.valor !== 0 && fechaVencimiento) {
            const diasRestantes = Math.ceil((new Date(fechaVencimiento) - new Date()) / (1000 * 60 * 60 * 24));
            if (diasRestantes <= diasProximosAExpirar.valor) {
                return res.status(200).json({
                    message: `Lote de producción creado, pero el producto está próximo a expirar en ${diasRestantes} días.`,
                    lote: nuevoLote,
                    movimiento: nuevoMovimiento,
                    advertencia: `Producto próximo a expirar en ${diasRestantes} días.`
                });
            }
        }

        // Respuesta exitosa
        res.status(201).json({
            message: 'Lote de producción y movimiento de inventario creados exitosamente',
            lote: nuevoLote,
            movimiento: nuevoMovimiento
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};



// Obtener todos los lotes de producción
exports.getLotesProduccion = async (req, res) => {
    try {
        const lotes = await LoteProduccion.find().populate('productoId');
        res.status(200).json(lotes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los lotes de producción.' });
    }
};

// Obtener un lote de producción por su ID
exports.getLoteProduccionById = async (req, res) => {
    try {
        const lote = await LoteProduccion.findById(req.params.id).populate('productoId');
        if (!lote) {
            return res.status(404).json({ error: 'Lote no encontrado' });
        }
        res.status(200).json(lote);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el lote de producción.' });
    }
};

// Actualizar un lote de producción por su ID
exports.updateLoteProduccion = async (req, res) => {
    try {
        const { cantidadProducida, fechaVencimiento, estado } = req.body;
        const lote = await LoteProduccion.findById(req.params.id);

        if (!lote) {
            return res.status(404).json({ error: 'Lote no encontrado' });
        }

        // Validar si la cantidad producida es menor que la cantidad vendida
        if (cantidadProducida !== undefined) {
            if (cantidadProducida < lote.cantidadVendida) {
                return res.status(400).json({
                    error: `La cantidad producida no puede ser menor que la cantidad ya vendida (${lote.cantidadVendida}).`
                });
            }
            lote.cantidadProducida = cantidadProducida;
            lote.cantidadDisponible = cantidadProducida - lote.cantidadVendida;
        }

        if (fechaVencimiento) lote.fechaVencimiento = new Date(fechaVencimiento);
        if (estado) lote.estado = estado;

        await lote.save();
        res.status(200).json({
            message: 'Lote de producción actualizado exitosamente',
            lote
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el lote de producción.' });
    }
};

// Eliminar un lote de producción por su ID
exports.deleteLoteProduccion = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el lote existe
        const lote = await LoteProduccion.findById(id);
        if (!lote) {
            return res.status(404).json({ error: 'Lote no encontrado' });
        }

        // Verificar si el lote está asociado a algún movimiento de inventario
        const movimientosAsociados = await MovimientoInventario.find({ loteProduccion: id });
        if (movimientosAsociados.length > 0) {
            return res.status(400).json({ error: 'El lote no puede ser eliminado porque está asociado a movimientos de inventario.' });
        }

        // Verificar si el lote está asociado a alguna venta
        const ventasAsociadas = await Venta.find({ 'productos.loteProduccion': id });
        if (ventasAsociadas.length > 0) {
            return res.status(400).json({ error: 'El lote no puede ser eliminado porque está asociado a ventas.' });
        }

        // Eliminar el stock asociado a este lote (disminuir el stock actual)
        const stock = await Stock.findOne({ productoId: lote.productoId });
        if (stock) {
            stock.stockActual -= lote.cantidadProducida;
            if (stock.stockActual < 0) stock.stockActual = 0;
            await stock.save();
        }

        // Eliminar el lote de producción
        await LoteProduccion.findByIdAndDelete(id);

        res.status(200).json({ message: 'Lote de producción y sus relaciones eliminados exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el lote de producción.' });
    }
};


// Obtener todos los lotes de producción asociados a un producto específico
// Obtener todos los lotes de producción asociados a un producto específico
exports.getLotesPorProducto = async (req, res) => {
    try {
        const { productoId } = req.params;

        // Validar que el productoId es proporcionado
        if (!productoId || typeof productoId !== 'string') {
            return res.status(400).json({ error: 'El campo "productoId" es requerido y debe ser una cadena de texto válida.' });
        }

        // Verificar si el producto existe
        const producto = await Producto.findById(productoId);
        if (!producto) {
            return res.status(404).json({ error: 'El producto no fue encontrado.' });
        }

        // Buscar los lotes asociados al producto
        const lotes = await LoteProduccion.find({ productoId }).populate('productoId');

        // Verificar si hay lotes asociados
        if (lotes.length === 0) {
            return res.status(404).json({ error: 'No se encontraron lotes de producción para el producto proporcionado.' });
        }

        // Modificar la respuesta para excluir información del producto
        const lotesModificados = lotes.map(lote => {
            return {
                _id: lote._id,
                fechaProduccion: lote.fechaProduccion,
                cantidadProducida: lote.cantidadProducida,
                cantidadVendida: lote.cantidadVendida,
                fechaVencimiento: lote.fechaVencimiento,
                costoLote: lote.costoLote,
                ubicacionLote: lote.ubicacionLote,
                codigoLote: lote.codigoLote,
                estado: lote.estado,
                cantidadDisponible: lote.cantidadDisponible,
                createdAt: lote.createdAt,
                updatedAt: lote.updatedAt,
                productoId: lote.productoId._id // Solo mantener el ID del producto
            };
        });

        // Retornar los lotes modificados
        res.status(200).json(lotesModificados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los lotes de producción por producto.' });
    }
};
