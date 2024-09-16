const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vendedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    productos: [{
        productoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Producto',
            required: true
        },
        cantidad: { type: Number, required: true },
        precioUnitario: { type: Number, required: true },
        lotes: [{
            loteId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'LoteProduccion',
                required: true
            },
            cantidad: { type: Number, required: true }
        }]
    }],
    totalVenta: { type: Number, required: true },
    saldoVenta: { type: Number, default: 0 },
    pagoInicial: { type: Number, default: 0 },
    fechaVenta: { type: Date, default: Date.now },
    estado: { type: String, enum: ['pendiente', 'completada', 'cancelada'], default: 'pendiente' },
    notas: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Venta', ventaSchema);
