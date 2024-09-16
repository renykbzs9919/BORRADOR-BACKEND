const mongoose = require('mongoose');
const LoteProduccion = require('./LoteProduccion'); // No hay dependencia circular en este archivo

// Esquema de Stock
const stockSchema = new mongoose.Schema({
    productoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },
    stockActual: { type: Number, required: true, default: 0 },
    stockReservado: { type: Number, default: 0 },
    stockMinimo: { type: Number, default: 0 },
    stockMaximo: { type: Number },
    stockDisponible: { type: Number }
}, { timestamps: true });

// Método para actualizar el stock disponible basado en los lotes
stockSchema.methods.actualizarStockDisponible = async function () {
    try {
        const lotesDisponibles = await LoteProduccion.find({
            productoId: this.productoId,
            estado: 'disponible'
        });

        const stockDisponible = lotesDisponibles.reduce((total, lote) => total + lote.cantidadDisponible, 0);
        this.stockDisponible = stockDisponible; // Actualiza el campo stockDisponible
        return this.save(); // Guarda el stock actualizado en la base de datos
    } catch (error) {
        console.error("Error al actualizar el stock disponible:", error);
    }
};

module.exports = mongoose.model('Stock', stockSchema);
