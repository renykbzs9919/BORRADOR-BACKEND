const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar si el usuario está autenticado
const authMiddleware = async (req, res, next) => {
    try {
        // Obtener el token del encabezado Authorization
        const authHeader = req.header('Authorization');

        // Verificar si el encabezado Authorization está presente y tiene el formato correcto
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token, autorización denegada' });
        }

        // Extraer el token después de "Bearer "
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token, autorización denegada' });
        }

        // Verificar el token JWT sin usar callback
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');

        // Asegurarse de que "decoded" contiene el campo "id"
        if (!decoded || !decoded.id) {
            return res.status(401).json({ message: 'Token inválido, sin ID de usuario.' });
        }

        // Buscar el usuario en la base de datos sin incluir la contraseña
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Añadir el usuario a la solicitud (req.user)
        req.user = user;

        // Continuar al siguiente middleware o controlador
        next();
    } catch (error) {
        // Manejar errores específicos de JWT
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expirado, por favor vuelve a iniciar sesión.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token inválido, autorización denegada.' });
        }

        console.error('Error de autenticación:', error);
        return res.status(401).json({ message: 'Token no válido o expirado' });
    }
};

module.exports = authMiddleware;
