const express = require('express');
const {
    getParametros,
    getParametroById,
    updateParametro
} = require('../controllers/parametroController');

const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestionar parámetros
router.get('/', authMiddleware, checkPermissions('ver_parametros'), getParametros);  // Obtener todos los parámetros
router.get('/:id', authMiddleware, checkPermissions('ver_parametro_id'), getParametroById);  // Obtener un parámetro por su ID
router.put('/:id', authMiddleware, checkPermissions('actualizar_parametro_id'), updateParametro);  // Actualizar un parámetro por su ID

module.exports = router;
