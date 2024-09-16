const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema({
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    venta: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Venta', required: true }],
    montoPagado: { type: Number, required: true },
    saldoRestante: { type: Number, required: true },
    metodoPago: {
        type: String,
        enum: ['efectivo', 'transferencia'],
        required: true
    },
    fechaPago: { type: Date, default: Date.now },
    // Nueva estructura de pago aplicado
    pagosAplicados: [{
        ventaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta' },
        saldoPrevio: { type: Number },
        pagoAplicado: { type: Number },
        saldoRestante: { type: Number }
    }],
    notas: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Pago', pagoSchema);