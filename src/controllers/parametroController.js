const Parametro = require('../models/Parametro');
const mongoose = require('mongoose');
// Obtener todos los parámetros
exports.getParametros = async (req, res) => {
    try {
        const parametros = await Parametro.find();
        res.status(200).json(parametros);
    } catch (error) {
        console.error('Error al obtener los parámetros:', error);
        res.status(500).json({ error: 'Error al obtener los parámetros.' });
    }
};

// Obtener un parámetro por ID
exports.getParametroById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de parámetro no válido.' });
        }

        const parametro = await Parametro.findById(id);
        if (!parametro) {
            return res.status(404).json({ error: 'Parámetro no encontrado.' });
        }

        res.status(200).json(parametro);
    } catch (error) {
        console.error('Error al obtener el parámetro:', error);
        res.status(500).json({ error: 'Error al obtener el parámetro.' });
    }
};

// Actualizar el valor de un parámetro por ID
exports.updateParametro = async (req, res) => {
    try {
        const { id } = req.params;
        const { valor } = req.body;
        const userId = req.user ? req.user._id : null; // Obtener el ID del usuario del req

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de parámetro no válido.' });
        }

        if (!valor) {
            return res.status(400).json({ error: 'El campo "valor" es requerido.' });
        }

        // Buscar el parámetro por ID
        const parametro = await Parametro.findById(id);
        if (!parametro) {
            return res.status(404).json({ error: 'Parámetro no encontrado.' });
        }

        // Actualizar solo el valor y los campos de audit trail
        parametro.valor = valor;
        parametro.actualizadoPor = userId;
        parametro.fechaActualizacion = new Date();

        await parametro.save();
        res.status(200).json({ message: 'Parámetro actualizado correctamente.', parametro });
    } catch (error) {
        console.error('Error al actualizar el parámetro:', error);
        res.status(500).json({ error: 'Error al actualizar el parámetro.' });
    }
};
