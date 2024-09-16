const express = require('express');
const { createCategoria, getCategorias, getCategoriaById, updateCategoria, deleteCategoria } = require('../controllers/categoriaController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Ruta para crear una nueva categoría
router.post('/', authMiddleware, checkPermissions('crear_categoria'), createCategoria);
router.get('/', authMiddleware, checkPermissions('ver_categorias'), getCategorias);
router.get('/:id', authMiddleware, checkPermissions('ver_categoria_id'), getCategoriaById);
router.put('/:id', authMiddleware, checkPermissions('editar_categoria_id'), updateCategoria);
router.delete('/:id', authMiddleware, checkPermissions('eliminar_categoria_id'), deleteCategoria);

module.exports = router;
