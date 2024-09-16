const MovimientoInventario = require('../models/MovimientoInventario');
const Producto = require('../models/Producto');
const LoteProduccion = require('../models/LoteProduccion');
const Stock = require('../models/Stock');

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

// Crear un nuevo movimiento de inventario
exports.createMovimientoInventario = async (req, res) => {
    try {
        const { productoId, loteProduccion, tipoMovimiento, razon, cantidad, origenDestino } = req.body;
        const userId = req.user ? req.user._id : null;

        // Validar los campos requeridos
        if (!productoId || typeof productoId !== 'string') {
            return res.status(400).json({ error: 'El campo "productoId" es requerido y debe ser una cadena de texto válida.' });
        }
        if (!tipoMovimiento || !['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipoMovimiento)) {
            return res.status(400).json({ error: 'El campo "tipoMovimiento" debe ser "ENTRADA", "SALIDA" o "AJUSTE".' });
        }
        if (!razon || typeof razon !== 'string') {
            return res.status(400).json({ error: 'El campo "razon" es requerido y debe ser una cadena de texto válida.' });
        }
        if (!cantidad || typeof cantidad !== 'number' || cantidad <= 0) {
            return res.status(400).json({ error: 'El campo "cantidad" es requerido y debe ser un número positivo.' });
        }

        // Verificar si el producto existe
        const producto = await Producto.findById(productoId);
        if (!producto) {
            return res.status(400).json({ error: 'El producto asociado no existe.' });
        }

        // Verificar si el lote existe (si se envía)
        let lote = null;
        if (loteProduccion) {
            lote = await LoteProduccion.findById(loteProduccion);
            if (!lote) {
                return res.status(400).json({ error: 'El lote asociado no existe.' });
            }
        }

        // Generar movimientoId
        const movimientoId = await generateMovimientoId();

        // Crear el nuevo movimiento de inventario
        const nuevoMovimiento = new MovimientoInventario({
            movimientoId,
            productoId,
            loteProduccion: loteProduccion || null,
            tipoMovimiento,
            razon,
            cantidad,
            fechaMovimiento: new Date(),
            usuarioId: userId,
            origenDestino: origenDestino || 'almacen'  // Usar 'almacen' si no se proporciona
        });

        // Actualizar el stock o el lote según el tipo de movimiento
        const stock = await Stock.findOne({ productoId });

        if (tipoMovimiento === 'ENTRADA') {
            stock.stockActual += cantidad;
            if (lote) lote.cantidadProducida += cantidad;
        } else if (tipoMovimiento === 'SALIDA') {
            if (stock.stockActual < cantidad) {
                return res.status(400).json({ error: 'No hay suficiente stock para realizar la salida.' });
            }
            stock.stockActual -= cantidad;
            if (lote) {
                lote.cantidadVendida += cantidad;
                lote.cantidadDisponible = lote.cantidadProducida - lote.cantidadVendida;
                if (lote.cantidadDisponible <= 0) lote.estado = 'agotado';
            }
        } else if (tipoMovimiento === 'AJUSTE') {
            // Los ajustes pueden ser incrementos o decrementos en el stock
            stock.stockActual += cantidad;  // Ajuste positivo o negativo
        }

        // Guardar el stock actualizado
        await stock.save();
        if (lote) await lote.save();

        // Guardar el movimiento de inventario
        await nuevoMovimiento.save();

        // Respuesta exitosa
        res.status(201).json({
            message: 'Movimiento de inventario creado exitosamente',
            movimiento: nuevoMovimiento
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Obtener todos los movimientos de inventario
exports.getMovimientosInventario = async (req, res) => {
    try {
        const movimientos = await MovimientoInventario.find()
            .populate({
                path: 'productoId',
                select: 'nombre descripcion sku precioVenta costo unidadMedida diasExpiracion'
            })
            .populate({
                path: 'loteProduccion',
                select: 'fechaProduccion cantidadProducida cantidadVendida fechaVencimiento costoLote ubicacionLote codigoLote estado cantidadDisponible'
            })
            .populate({
                path: 'usuarioId',
                select: 'name ci email contactInfo'
            });

        res.status(200).json(movimientos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los movimientos de inventario.' });
    }
};


// Obtener un movimiento de inventario por su ID
exports.getMovimientoInventarioById = async (req, res) => {
    try {
        const movimiento = await MovimientoInventario.findById(req.params.id).populate('productoId loteProduccion usuarioId');
        if (!movimiento) {
            return res.status(404).json({ error: 'Movimiento no encontrado.' });
        }
        res.status(200).json(movimiento);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el movimiento de inventario.' });
    }
};

// Actualizar un movimiento de inventario por su ID
exports.updateMovimientoInventario = async (req, res) => {
    try {
        const { productoId, loteProduccion, tipoMovimiento, razon, cantidad, origenDestino } = req.body;
        const movimiento = await MovimientoInventario.findById(req.params.id);

        if (!movimiento) {
            return res.status(404).json({ error: 'Movimiento no encontrado.' });
        }

        // Actualizar los campos según lo que se envíe
        if (productoId) movimiento.productoId = productoId;
        if (loteProduccion) movimiento.loteProduccion = loteProduccion;
        if (tipoMovimiento) movimiento.tipoMovimiento = tipoMovimiento;
        if (razon) movimiento.razon = razon;
        if (cantidad !== undefined) movimiento.cantidad = cantidad;
        if (origenDestino) movimiento.origenDestino = origenDestino;

        await movimiento.save();
        res.status(200).json({ message: 'Movimiento de inventario actualizado exitosamente', movimiento });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el movimiento de inventario.' });
    }
};

// Eliminar un movimiento de inventario por su ID
exports.deleteMovimientoInventario = async (req, res) => {
    try {
        const movimiento = await MovimientoInventario.findById(req.params.id);
        if (!movimiento) {
            return res.status(404).json({ error: 'Movimiento no encontrado.' });
        }

        // Eliminar el movimiento de inventario
        await MovimientoInventario.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Movimiento de inventario eliminado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el movimiento de inventario.' });
    }
};
