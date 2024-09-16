const express = require('express');
const {
    loginUser,
    forgotPassword,
    resetPassword,
    getUserProfile,
    validateToken,
    generarQRConImagen,
    loginConQR
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermissions = require('../middlewares/roleMiddleware');

const router = express.Router();

// Ruta para iniciar sesión
router.post('/login', loginUser);

// Ruta para solicitar restablecimiento de contraseña
router.post('/forgotpassword', forgotPassword);

// Ruta para restablecer la contraseña
router.post('/resetpassword/:token', resetPassword);

// Ruta para obtener el perfil de un usuario
router.get('/profile', authMiddleware, getUserProfile);

// Ruta para validar un token
router.get('/validate', validateToken);

// Ruta para generar un código QR para un usuario específico
router.get('/generateqr/:userId', authMiddleware, checkPermissions('generar_qr'), generarQRConImagen);

// Ruta para manejar el login con QR
router.get('/loginqr', loginConQR);
module.exports = router;



