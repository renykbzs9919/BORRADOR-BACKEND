const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    categoria: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categoria',  // Referencia al modelo Categoria
        required: true
    },
    sku: { type: String, unique: true },  // Código SKU único e incremental
    precioVenta: { type: Number, required: true },  // Precio al que se vende el producto
    costo: { type: Number, required: true },  // Costo de producción o adquisición del producto
    unidadMedida: { type: String, required: true },  // Unidad de medida del producto (ej. unidades, litros, kilogramos)
    diasExpiracion: { type: Number, required: true },  // Días hasta la expiración (para lotes de producción)
}, { timestamps: true });

module.exports = mongoose.model('Producto', productoSchema);
