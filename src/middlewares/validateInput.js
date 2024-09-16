const { validationResult } = require('express-validator');

// Middleware para manejar la validación de entradas
const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = validateInput;
