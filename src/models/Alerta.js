const mongoose = require('mongoose');

// Esquema de Alerta
const alertaSchema = new mongoose.Schema({
    productoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },
    loteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoteProduccion'
    },
    tipoAlerta: {
        type: String,
        enum: ['stock_bajo', 'vencimiento', 'almacenamiento_maximo'],  // Se agregó 'almacenamiento_maximo'
        required: true
    },
    descripcion: {
        type: String
    },
    prioridad: {
        type: String,
        enum: ['baja', 'media', 'alta'],
        default: 'media'
    },
    umbralReabastecimiento: { type: Number },
    stockActual: { type: Number },
    stockMinimo: { type: Number },
    stockMaximo: { type: Number },  // Agregado stockMaximo para las alertas de almacenamiento máximo
    alertaVencimiento: { type: Boolean, default: false },
    alertaStockMaximo: { type: Boolean, default: false },  // Agregado alertaStockMaximo
    fechaVencimiento: { type: Date },
    alertaStockBajo: { type: Boolean, default: false },
    fechaAlerta: { type: Date, default: Date.now },
    estado: {
        type: String,
        enum: ['pendiente', 'resuelto', 'en_proceso'],
        default: 'pendiente'
    },  // Estado de la alerta
}, { timestamps: true });

module.exports = mongoose.model('Alerta', alertaSchema);
