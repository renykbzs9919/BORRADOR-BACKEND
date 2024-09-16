const User = require('../models/User');

// Middleware para verificar los permisos de usuario basados en permisos personalizados
const checkPermissions = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // Buscar al usuario por su ID y popular los permisos personalizados del usuario
            const user = await User.findById(req.user.id)
                .populate('permissions.permission');  // Popular los permisos personalizados del usuario

            if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

            // 1. Revisar si el usuario tiene permisos personalizados
            const userPermission = user.permissions.find(p => p.permission.name === requiredPermission);

            // Verificar si el permiso existe y está otorgado
            if (userPermission && userPermission.granted) {
                return next();  // Permiso otorgado, proceder a la siguiente función
            }

            // Si el permiso existe pero está denegado
            if (userPermission && !userPermission.granted) {
                return res.status(403).json({ message: 'Acceso denegado: Permiso denegado' });
            }

            // Si el permiso no se encuentra en la lista de permisos personalizados
            return res.status(403).json({ message: 'Acceso denegado: No tiene el permiso requerido' });
        } catch (error) {
            console.error('Error en la verificación de permisos:', error);
            return res.status(500).json({ message: 'Error en la verificación de permisos' });
        }
    };
};

module.exports = checkPermissions;
