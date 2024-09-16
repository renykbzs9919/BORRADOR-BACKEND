const mongoose = require('mongoose');

const loteProduccionSchema = new mongoose.Schema({
    productoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },
    fechaProduccion: {
        type: Date,
        required: true
    },
    cantidadProducida: {
        type: Number,
        required: true
    },
    cantidadVendida: {
        type: Number,
        default: 0
    },
    cantidadDisponible: {
        type: Number,
        default: function () {
            return this.cantidadProducida - this.cantidadVendida;
        }
    },
    fechaVencimiento: {
        type: Date
    },
    costoLote: {
        type: Number,
        required: true
    },
    ubicacionLote: {
        type: String,
        required: true
    },
    codigoLote: {
        type: String,
        unique: true,
        required: true
    },
    estado: {
        type: String,
        enum: ['disponible', 'dañado', 'expirado', 'agotado', 'mal_empaque'],
        default: 'disponible'
    }
}, { timestamps: true });

// Middleware para actualizar el estado del lote basado en la cantidad disponible
loteProduccionSchema.pre('save', function (next) {
    this.cantidadDisponible = this.cantidadProducida - this.cantidadVendida;
    if (this.cantidadDisponible <= 0) {
        this.estado = 'agotado';
    }
    next();
});

// Middleware post-save para actualizar el stock disponible al guardar un lote
loteProduccionSchema.post('save', async function (lote) {
    try {
        const Stock = mongoose.model('Stock'); // Evitamos la dependencia circular con mongoose.model
        const stock = await Stock.findOne({ productoId: lote.productoId });
        if (stock) {
            await stock.actualizarStockDisponible(); // Actualizamos el stock disponible
        }
    } catch (error) {
        console.error("Error actualizando el stock disponible:", error);
    }
});

module.exports = mongoose.model('LoteProduccion', loteProduccionSchema);
