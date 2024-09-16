const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const useragent = require('express-useragent');
const path = require('path');
const QRCode = require('qrcode');
const Jimp = require('jimp');
const moment = require('moment-timezone'); // Importamos moment-timezone
const { createCanvas, loadImage } = require('canvas');

// Transporter para enviar correos electrónicos
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

// Controlador para el inicio de sesión
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

        if (user.isAccountLocked()) {
            return res.status(403).json({ message: 'Cuenta bloqueada. Contacte al administrador.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await user.incrementFailedLoginAttempts();
            return res.status(400).json({ message: 'Credenciales incorrectas' });
        }

        await user.resetFailedLoginAttempts();

        // Capturar la hora y fecha exacta del servidor (puede cambiar dependiendo del servidor)
        const loginDateTime = new Date();

        // Capturar el último inicio de sesión en la base de datos
        user.lastLogin = loginDateTime;

        const ua = useragent.parse(req.headers['user-agent']);
        let browser = `${ua.browser} ${ua.version}`;
        let device = ua.platform;

        if (ua.isDesktop) {
            device = 'Desktop';
        } else if (ua.isMobile) {
            device = 'Mobile';
        }

        if (ua.isBot) {
            browser = 'Bot';
        } else if (ua.source.includes('Thunder Client')) {
            browser = 'Thunder Client';
        } else if (ua.source.includes('Postman')) {
            browser = 'Postman';
        }

        let ip = req.ip;
        if (ip.startsWith('::ffff:')) {
            ip = ip.split(':').pop();
        }

        const sessionInfo = {
            ip: ip,
            browser: browser || 'unknown',
            device: device || 'unknown',
            loginDate: loginDateTime,  // Añadimos la fecha y hora del servidor al registro
        };

        user.sessions.push(sessionInfo);
        if (user.sessions.length > 5) {
            user.sessions.shift();
        }

        await user.save();

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'mysecretkey',
            { expiresIn: process.env.JWT_EXPIRES || '1h' }
        );

        res.status(200).json({ message: 'Sesión iniciada', token });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};


// Solicitar restablecimiento de contraseña
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'No se encontró un usuario con ese correo electrónico' });

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Solicitud de restablecimiento de contraseña',
            text: `Haz clic en el siguiente enlace para restablecer tu contraseña: \n\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Se ha enviado un correo electrónico para restablecer la contraseña' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Restablecer la contraseña
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Token no válido o ha expirado' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: 'Contraseña restablecida correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Obtener el perfil del usuario
exports.getUserProfile = async (req, res) => {
    try {
        // Obtén el ID del usuario desde req.user (agregado por el middleware)
        const userId = req.user;

        // Busca el usuario en la base de datos
        const user = await User.findById(userId)
            .populate({
                path: 'permissions.permission', // Poblamos los permisos individuales del usuario
                select: 'name' // Solo obtenemos el campo 'name' de los permisos
            });

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Excluye la contraseña y otros campos no deseados de la respuesta
        const { password, __v, createdAt, updatedAt, role, ...userData } = user.toObject();

        // Verificar si hay permisos individuales y obtener sus nombres
        if (user.permissions && user.permissions.length > 0) {
            userData.permissions = user.permissions.map(p => ({
                name: p.permission.name,
                granted: p.granted
            }));
        } else {
            userData.permissions = ['Sin permisos asignados'];
        }

        // Asignar el rol del usuario si existe
        userData.role = role ? role.name : 'Sin rol asignado';

        // Enviar la información del usuario sin la contraseña
        res.status(200).json(userData);
    } catch (err) {
        console.error('Error al obtener el perfil del usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};



// Ruta para validar el token
exports.validateToken = (req, res) => {
    const token = req.header('Authorization').split(' ')[1];

    if (!token) {
        // Token no proporcionado
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.status(200).json({ message: 'Token valido' });
    } catch (error) {
        // Token inválido o expirado
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};


// Función para generar un QR con imagen en el centro
exports.generarQRConImagen = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Eliminar cualquier token QR anterior
        user.qrTokens = [];

        // Generar un nuevo token JWT para el QR (válido por 10 minutos)
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'mysecretkey',
            { expiresIn: '10m' } // Duración de 10 minutos
        );

        const now = moment().tz('America/La_Paz'); // Fecha y hora actual en La Paz
        const expiresAt = now.clone().add(10, 'minutes'); // Expiración en 10 minutos en la misma zona horaria

        // Crear un nuevo token QR y agregarlo a la lista de tokens QR del usuario
        user.qrTokens.push({
            token: token,
            expiresAt: expiresAt, // Usamos la fecha con la hora en "America/La_Paz"
        });

        await user.save();

        const loginUrl = `${process.env.FRONTEND_URL}/loginqr?token=${token}`;

        // Crear el canvas para el código QR
        const canvas = createCanvas(500, 500);
        await QRCode.toCanvas(canvas, loginUrl, { errorCorrectionLevel: 'H' });

        // Obtener la ruta absoluta de la imagen del logo
        const logoPath = path.join(__dirname, '../mardely-logo.png');

        // Cargar la imagen (logo) que queremos insertar en el QR
        const logo = await loadImage(logoPath);
        const ctx = canvas.getContext('2d');

        // Definir el tamaño y posición de la imagen centrada en el QR
        const logoSize = 100;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = (canvas.height - logoSize) / 2;

        // Dibujar la imagen en el centro del QR
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

        // Convertir el canvas en imagen base64
        const qrWithLogo = canvas.toDataURL();

        // Enviar la imagen generada al frontend
        res.status(200).json({ qrCodeUrl: qrWithLogo, message: 'QR code generado con éxito' });
    } catch (error) {
        console.error('Error al generar el QR con imagen:', error);
        res.status(500).json({ message: 'Error al generar el QR code' });
    }
};


// Controlador para login a través del QR
exports.loginConQR = async (req, res) => {
    try {
        const { token } = req.query;

        // Verificar el token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener la fecha y hora actual en la zona horaria de La Paz
        const nowLaPaz = moment().tz('America/La_Paz');
        // Verificar si el token QR es válido (no expirado y no usado)
        const qrToken = user.qrTokens.find(
            (qr) => qr.token === token && moment(qr.expiresAt).isAfter(nowLaPaz) && !qr.used
        );

        if (!qrToken) {
            return res.status(400).json({ message: 'El QR ha expirado o ya ha sido usado' });
        }

        // Marcar el token como usado
        qrToken.used = true;
        await user.save();

        // Generar un token de sesión normal como en el login manual
        const sessionToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES || '1h' }
        );

        // Enviar el token de sesión
        res.status(200).json({ message: 'Sesión iniciada', token: sessionToken });
    } catch (error) {
        console.error('Error al iniciar sesión con QR:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'El token QR ha expirado' });
        }
        return res.status(500).json({ message: 'Error al iniciar sesión con QR' });
    }
};