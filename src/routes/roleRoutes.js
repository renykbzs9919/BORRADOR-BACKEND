const express = require('express');
const {
    createRole,
    getRoles,
    getRoleById,
    updateRole,
    deleteRole,
    addPermissionsToRole
} = require('../controllers/roleController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestión de roles

router.post('/', authMiddleware, checkPermissions('crear_rol'), createRole);
router.get('/', authMiddleware, checkPermissions('ver_roles'), getRoles);
router.get('/:id', authMiddleware, checkPermissions('ver_rol_id'), getRoleById);
router.put('/:id', authMiddleware, checkPermissions('actualizar_rol_id'), updateRole);
router.delete('/:id', authMiddleware, checkPermissions('eliminar_rol_id'), deleteRole);
router.put('/:id/addpermissions', authMiddleware, checkPermissions('agregar_permisos_rol'), addPermissionsToRole);

module.exports = router;
