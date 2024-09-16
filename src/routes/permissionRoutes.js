const express = require('express');
const {
    createPermission,
    getPermissions,
    getPermissionById,
    updatePermission,
    deletePermission
} = require('../controllers/permissionController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestión de permisos

router.post('/', authMiddleware, checkPermissions('crear_permiso'), createPermission);
router.get('/', authMiddleware, checkPermissions('ver_permisos'), getPermissions);
router.get('/:id', authMiddleware, checkPermissions('ver_permiso_id'), getPermissionById);
router.put('/:id', authMiddleware, checkPermissions('actualizar_permiso_id'), updatePermission);
router.delete('/:id', authMiddleware, checkPermissions('eliminar_permiso_id'), deletePermission);

module.exports = router;
