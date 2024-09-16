const mongoose = require('mongoose');

// Esquema de Configuración de Parámetros
const parametroSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        unique: true  // Cada parámetro debe tener un nombre único
    },
    valor: {
        type: Number,  // Tipo de dato del valor del parametro
        required: true  // El valor puede ser cualquier tipo (número, booleano, string, etc.)
    },
    descripcion: {
        type: String  // Descripción del parámetro
    },
    actualizadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Referencia al usuario que actualizó el parámetro
    },
    fechaActualizacion: {
        type: Date,
        default: Date.now  // Fecha en la que se actualizó el parámetro
    }
}, { timestamps: true });

module.exports = mongoose.model('Parametro', parametroSchema);
