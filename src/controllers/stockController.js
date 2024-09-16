const Stock = require('../models/Stock');
const Parametro = require('../models/Parametro');
const alertaController = require('../controllers/alertaController');

// Función para validar y generar alertas de stock bajo
const verificarYGenerarAlertaStock = async (stock) => {
    try {
        // Obtener el parámetro cantidad_minima_reabastecimiento
        const cantidadMinimaReabastecimiento = await Parametro.findOne({ nombre: 'cantidad_minima_reabastecimiento' });
        if (!cantidadMinimaReabastecimiento) {
            throw new Error('El parámetro "cantidad_minima_reabastecimiento" no está configurado.');
        }

        // Generar alerta si el stock está por debajo de la cantidad mínima de reabastecimiento
        if (stock.stockDisponible < cantidadMinimaReabastecimiento.valor) {
            await alertaController.generarAlertaStockBajo(stock);
        }
    } catch (error) {
        console.error('Error al verificar o generar alerta de stock:', error.message);
        throw error;
    }
};

// Obtener el stock de todos los productos
exports.obtenerStock = async (req, res) => {
    try {
        const stock = await Stock.find().populate('productoId');
        if (!stock || stock.length === 0) {
            return res.status(404).json({ message: 'No se encontró stock para los productos.' });
        }
        res.status(200).json(stock);
    } catch (error) {
        console.error('Error al obtener el stock de productos:', error.message);
        res.status(500).json({ message: 'Error interno del servidor al obtener el stock de productos.' });
    }
};

// Obtener el stock de un producto específico por ID
exports.obtenerStockPorProducto = async (req, res) => {
    try {
        const { productoId } = req.params;
        const stock = await Stock.findOne({ productoId }).populate('productoId');
        if (!stock) {
            return res.status(404).json({ message: 'No se encontró stock para este producto.' });
        }
        res.status(200).json(stock);
    } catch (error) {
        console.error('Error al obtener el stock del producto:', error.message);
        res.status(500).json({ message: 'Error interno del servidor al obtener el stock del producto.' });
    }
};

// Actualizar el stock de un producto específico por ID
exports.actualizarStock = async (req, res) => {
    try {
        const { productoId } = req.params;
        const { stockActual, stockReservado, stockMinimo, stockMaximo } = req.body;

        // Validar si el stock existe
        const stock = await Stock.findOne({ productoId });
        if (!stock) {
            return res.status(404).json({ message: 'No se encontró stock para este producto.' });
        }

        // Validar los campos
        if (stockActual !== undefined && (typeof stockActual !== 'number' || stockActual < 0)) {
            return res.status(400).json({ message: 'El campo "stockActual" debe ser un número positivo.' });
        }
        if (stockReservado !== undefined && (typeof stockReservado !== 'number' || stockReservado < 0)) {
            return res.status(400).json({ message: 'El campo "stockReservado" debe ser un número positivo.' });
        }
        if (stockMinimo !== undefined && (typeof stockMinimo !== 'number' || stockMinimo < 0)) {
            return res.status(400).json({ message: 'El campo "stockMinimo" debe ser un número positivo.' });
        }
        if (stockMaximo !== undefined && (typeof stockMaximo !== 'number' || stockMaximo <= 0)) {
            return res.status(400).json({ message: 'El campo "stockMaximo" debe ser un número positivo mayor que cero.' });
        }

        // Actualizar los campos de stock
        stock.stockActual = stockActual ?? stock.stockActual;
        stock.stockReservado = stockReservado ?? stock.stockReservado;
        stock.stockMinimo = stockMinimo ?? stock.stockMinimo;
        stock.stockMaximo = stockMaximo ?? stock.stockMaximo;

        // Verificar si el stock está por debajo del mínimo o cantidad mínima de reabastecimiento
        await verificarYGenerarAlertaStock(stock);

        // Guardar el stock actualizado
        const stockActualizado = await stock.save();
        res.status(200).json({
            message: 'Stock actualizado exitosamente.',
            stock: stockActualizado
        });
    } catch (error) {
        console.error('Error al actualizar el stock del producto:', error.message);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el stock del producto.' });
    }
};

// Eliminar el stock de un producto (por ejemplo, si el producto es eliminado)
exports.eliminarStock = async (req, res) => {
    try {
        const { productoId } = req.params;
        const stock = await Stock.findOneAndDelete({ productoId });
        if (!stock) {
            return res.status(404).json({ message: 'No se encontró stock para este producto.' });
        }
        res.status(200).json({ message: 'Stock eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar el stock del producto:', error.message);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el stock del producto.' });
    }
};
