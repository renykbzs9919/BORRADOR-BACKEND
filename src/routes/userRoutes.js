const express = require('express');
const {
    registerUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    updateUserPermissions,
    getUserSessions,
    unlockUserAccount,
    getVendedores,
    getAdmins,
    getClientes,
    getTrabajadores,
    registerUsers
} = require('../controllers/userController');

const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Rutas para gestionar vendedores
router.get('/vendedores', authMiddleware, checkPermissions('ver_vendedores'), getVendedores);  // Obtener todos los vendedores

// Rutas para gestionar administradores
router.get('/admins', authMiddleware, checkPermissions('ver_admins'), getAdmins);  // Obtener todos los administradores

// Rutas para gestionar clientes
router.get('/clientes', authMiddleware, checkPermissions('ver_clientes'), getClientes);  // Obtener todos los clientes

// Rutas para gestionar trabajadores
router.get('/trabajadores', authMiddleware, checkPermissions('ver_trabajadores'), getTrabajadores);  // Obtener todos los trabajadores

// Rutas para registrar usuarios
router.post('/register', authMiddleware, registerUsers);  // Registrar un nuevo usuario
// Rutas para gestionar usuarios
router.post('/', authMiddleware, checkPermissions('crear_usuario'), registerUser);  // Registrar un nuevo usuario
router.get('/', authMiddleware, checkPermissions('ver_usuarios'), getUsers);  // Obtener todos los usuarios
router.get('/:id', authMiddleware, checkPermissions('ver_usuario_id'), getUserById);  // Obtener un usuario por su ID
router.put('/:id', authMiddleware, checkPermissions('actualizar_usuario_id'), updateUser);  // Actualizar un usuario por su ID
router.delete('/:id', authMiddleware, checkPermissions('eliminar_usuario_id'), deleteUser);  // Eliminar un usuario por su ID
router.put('/:id/permissions', authMiddleware, checkPermissions('actualizar_permisos_usuario'), updateUserPermissions);  // Actualizar permisos de un usuario por su ID
router.get('/:id/sessions', authMiddleware, checkPermissions('ver_sesiones_usuario'), getUserSessions);  // Obtener las últimas 5 sesiones de un usuario
router.put('/:id/unlock', authMiddleware, checkPermissions('desbloquear_cuenta'), unlockUserAccount);  // Desbloquear una cuenta de usuario

module.exports = router;









