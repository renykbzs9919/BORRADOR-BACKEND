const mongoose = require('mongoose');

const movimientoInventarioSchema = new mongoose.Schema({
    movimientoId: { type: String, unique: true },
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    loteProduccion: { type: mongoose.Schema.Types.ObjectId, ref: 'LoteProduccion', required: true },
    tipoMovimiento: { type: String, enum: ['ENTRADA', 'SALIDA'], required: true },
    razon: { type: String, required: true },
    cantidad: { type: Number, required: true },
    fechaMovimiento: { type: Date, default: Date.now },
    costoMovimiento: { type: Number },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    origenDestino: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('MovimientoInventario', movimientoInventarioSchema);
