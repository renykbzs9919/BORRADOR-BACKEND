const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    ip: { type: String },
    browser: { type: String },
    device: { type: String },
    loginDate: { type: Date, default: Date.now }
});

const qrTokenSchema = new mongoose.Schema({
    token: { type: String, required: true },
    used: { type: Boolean, default: false },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date } // Puedes agregarle una expiración si lo deseas
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ci: { type: Number, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthdate: { type: Date, required: true },
    gender: { type: String, enum: ['Masculino', 'Femenino'], required: true },
    role: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true
    },
    permissions: [{
        permission: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
        granted: { type: Boolean, required: true }
    }],
    contactInfo: {
        phone: { type: Number, required: true },
        address: { type: String, required: true }
    },
    qrTokens: [qrTokenSchema], // Aquí añadimos el array de tokens QR para el usuario
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    lastLogin: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    accountLocked: { type: Boolean, default: false },

    sessions: [sessionSchema]
}, { timestamps: true });

// Definir métodos de instancia para el esquema de usuario

// Verificar si la cuenta está bloqueada
userSchema.methods.isAccountLocked = function () {
    return this.accountLocked;
};

// Incrementar los intentos fallidos de inicio de sesión
userSchema.methods.incrementFailedLoginAttempts = async function () {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) {  // Bloquear la cuenta después de 5 intentos fallidos
        this.accountLocked = true;
    }
    await this.save();
};

// Restablecer los intentos fallidos y desbloquear la cuenta
userSchema.methods.resetFailedLoginAttempts = async function () {
    this.failedLoginAttempts = 0;
    this.accountLocked = false;
    await this.save();
};

module.exports = mongoose.model('User', userSchema);
