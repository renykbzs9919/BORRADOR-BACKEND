const jwt = require('jsonwebtoken');

// Generar un token JWT
exports.generateToken = (user) => {
    return jwt.sign({
        id: user._id, role: user.role,
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });
};

// Verificar y decodificar un token JWT
exports.verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};
