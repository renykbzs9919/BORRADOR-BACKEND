const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const Venta = require('../models/Venta');
const MovimientoInventario = require('../models/MovimientoInventario');
const Pago = require('../models/Pago');
const Parametro = require('../models/Parametro');

const mongoose = require('mongoose');

// Registrar un nuevo usuario
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role, contactInfo, ci, birthdate, gender } = req.body;

        // Validación de campos obligatorios
        if (!name || !email || !password || !role || !ci || !contactInfo || !contactInfo.phone) {
            console.log('Todos los campos son obligatorios.');
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        // Validar que el CI y teléfono sean numéricos
        if (isNaN(ci) || isNaN(contactInfo.phone)) {
            return res.status(400).json({ message: 'El CI y el teléfono deben ser valores numéricos.' });
        }

        // Verificar si el email ya está registrado
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // Verificar si el CI ya está registrado
        const ciExists = await User.findOne({ ci });
        if (ciExists) {
            return res.status(400).json({ message: 'El número de CI ya está registrado.' });
        }

        // Validar que el rol sea un ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(role)) {
            return res.status(400).json({ message: 'El rol no es un ObjectId válido.' });
        }

        // Verificar si el rol existe
        const roleExists = await Role.findById(role);
        if (!roleExists) {
            return res.status(400).json({ message: 'El rol proporcionado no existe.' });
        }

        // Obtener permisos asociados al rol
        const rolePermissions = await Permission.find({ _id: { $in: roleExists.permissions } });
        const userPermissions = rolePermissions.map(permission => ({
            permission: permission._id,
            granted: true
        }));

        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el nuevo usuario
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            ci,
            birthdate,
            gender,
            contactInfo,
            permissions: userPermissions
        });

        // Respuesta exitosa
        res.status(201).json({ message: 'Usuario registrado exitosamente', user: newUser });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

exports.registerUsers = async (req, res) => {
    try {
        const users = req.body; // Se espera un array de usuarios

        // Validación básica
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'Debe proporcionar un array de usuarios.' });
        }

        const registeredUsers = [];
        const errors = [];

        for (let user of users) {
            const { name, email, password, role, contactInfo, ci, birthdate, gender } = user;

            // Validación de campos obligatorios para cada usuario
            if (!name || !email || !password || !role || !ci || !contactInfo || !contactInfo.phone) {
                errors.push({ message: `Todos los campos son obligatorios para el usuario con email ${email}.` });
                continue;
            }

            // Validar que el CI y teléfono sean numéricos
            if (isNaN(ci) || isNaN(contactInfo.phone)) {
                errors.push({ message: `El CI y el teléfono deben ser valores numéricos para el usuario con email ${email}.` });
                continue;
            }

            // Verificar si el email ya está registrado
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                errors.push({ message: `El correo electrónico ${email} ya está registrado.` });
                continue;
            }

            // Verificar si el CI ya está registrado
            const ciExists = await User.findOne({ ci });
            if (ciExists) {
                errors.push({ message: `El número de CI ${ci} ya está registrado.` });
                continue;
            }

            // Validar que el rol sea un ObjectId válido
            if (!mongoose.Types.ObjectId.isValid(role)) {
                errors.push({ message: `El rol no es un ObjectId válido para el usuario con email ${email}.` });
                continue;
            }

            // Verificar si el rol existe
            const roleExists = await Role.findById(role);
            if (!roleExists) {
                errors.push({ message: `El rol proporcionado no existe para el usuario con email ${email}.` });
                continue;
            }

            // Obtener permisos asociados al rol
            const rolePermissions = await Permission.find({ _id: { $in: roleExists.permissions } });
            const userPermissions = rolePermissions.map(permission => ({
                permission: permission._id,
                granted: true
            }));

            // Hashear la contraseña
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Crear el nuevo usuario
            const newUser = await User.create({
                name,
                email,
                password: hashedPassword,
                role,
                ci,
                birthdate,
                gender,
                contactInfo,
                permissions: userPermissions
            });

            registeredUsers.push(newUser);
        }

        // Respuesta
        if (errors.length > 0) {
            return res.status(400).json({ message: 'Algunos usuarios no pudieron ser registrados.', errors, registeredUsers });
        }

        res.status(201).json({ message: 'Todos los usuarios fueron registrados exitosamente', users: registeredUsers });
    } catch (error) {
        console.error('Error al registrar los usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};



// Obtener todos los usuarios
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().populate('role').select('-password');
        res.status(200).json({ message: 'Usuarios obtenidos correctamente', users });
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de usuario no válido.' });
        }

        const user = await User.findById(id).populate('role').select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.status(200).json({ message: 'Usuario obtenido correctamente', user });
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Actualizar un usuario por ID (Teléfono, dirección y rol)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { contactInfo, role, updatePermissions } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de usuario no válido.' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        let updated = false; // Flag para saber si algo cambió

        // Validar que el teléfono sea numérico
        if (contactInfo && contactInfo.phone && isNaN(contactInfo.phone)) {
            return res.status(400).json({ message: 'El teléfono debe ser numérico.' });
        }

        // Actualizar información de contacto solo si cambia
        if (contactInfo) {
            if (contactInfo.phone && contactInfo.phone !== user.contactInfo.phone) {
                user.contactInfo.phone = contactInfo.phone;
                updated = true;
            }
            if (contactInfo.address && contactInfo.address !== user.contactInfo.address) {
                user.contactInfo.address = contactInfo.address;
                updated = true;
            }
        }

        // Actualizar el rol solo si cambia
        if (role && !user.role.equals(role)) {
            if (!mongoose.Types.ObjectId.isValid(role)) {
                return res.status(400).json({ message: 'El rol no es un ObjectId válido.' });
            }

            const roleExists = await Role.findById(role);
            if (!roleExists) {
                return res.status(400).json({ message: 'El rol proporcionado no existe.' });
            }

            user.role = role;
            updated = true;

            // Actualizar los permisos si se debe actualizar el rol
            if (updatePermissions) {
                const rolePermissions = await Permission.find({ _id: { $in: roleExists.permissions } });
                user.permissions = rolePermissions.map(permission => ({
                    permission: permission._id,
                    granted: true
                }));
            }
        }

        // Solo guardar si algo cambió
        if (updated) {
            await user.save();
            res.status(200).json({ message: 'Usuario actualizado correctamente', user });
        } else {
            res.status(200).json({ message: 'No hubo cambios en los datos del usuario.' });
        }
    } catch (error) {
        console.error('Error al actualizar el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// Eliminar un usuario por ID
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar si el ID es válido
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de usuario no válido.' });
        }

        // Buscar el usuario por ID
        const user = await User.findById(id).populate('role');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Obtener el rol 'admin' para comparar
        const adminRole = await Role.findOne({ name: 'admin' });
        if (!adminRole) {
            return res.status(500).json({ message: 'No se pudo encontrar el rol de administrador.' });
        }

        // Verificar si el usuario tiene el rol de admin
        if (user.role._id.equals(adminRole._id)) {
            const adminsRestantes = await User.countDocuments({ role: adminRole._id, _id: { $ne: id } });
            if (adminsRestantes === 0) {
                return res.status(400).json({ message: 'No se puede eliminar el usuario porque es el único administrador restante.' });
            }
        }

        // Verificar si el usuario está asociado a ventas (como cliente o vendedor)
        const ventasAsociadas = await Venta.findOne({ $or: [{ vendedor: id }, { cliente: id }] });
        if (ventasAsociadas) {
            return res.status(400).json({ message: 'No se puede eliminar el usuario porque está asociado a ventas.' });
        }

        // Verificar si el usuario está asociado a movimientos de inventario
        const movimientosAsociados = await MovimientoInventario.findOne({ usuarioId: id });
        if (movimientosAsociados) {
            return res.status(400).json({ message: 'No se puede eliminar el usuario porque está asociado a movimientos de inventario.' });
        }

        // Verificar si el usuario está asociado a pagos
        const pagosAsociados = await Pago.findOne({ cliente: id });
        if (pagosAsociados) {
            return res.status(400).json({ message: 'No se puede eliminar el usuario porque está asociado a pagos.' });
        }

        // Verificar si el usuario está asociado a la configuración de parámetros
        const parametrosAsociados = await Parametro.findOne({ actualizadoPor: id });
        if (parametrosAsociados) {
            return res.status(400).json({ message: 'No se puede eliminar el usuario porque está asociado a parámetros.' });
        }

        // Eliminar el usuario si pasa todas las validaciones
        await User.findByIdAndDelete(id);

        res.status(200).json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


// Actualizar permisos personalizados de un usuario
exports.updateUserPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de usuario no válido.' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Validar si los permisos existen
        const validPermissions = await Permission.find({ _id: { $in: permissions.map(p => p.permission) } });
        if (validPermissions.length !== permissions.length) {
            return res.status(400).json({ message: 'Algunos permisos no son válidos.' });
        }

        permissions.forEach(p => {
            const existingPermissionIndex = user.permissions.findIndex(up => up.permission.equals(p.permission));

            if (existingPermissionIndex !== -1) {
                if (p.granted === false) {
                    user.permissions.splice(existingPermissionIndex, 1);
                } else {
                    user.permissions[existingPermissionIndex].granted = true;
                }
            } else if (p.granted !== false) {
                user.permissions.push({ permission: p.permission, granted: true });
            }
        });

        await user.save();
        res.status(200).json({ message: 'Permisos actualizados correctamente', user });
    } catch (error) {
        console.error('Error al actualizar los permisos del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Obtener las últimas 5 sesiones de un usuario
exports.getUserSessions = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de usuario no válido.' });
        }

        const user = await User.findById(id).select('sessions');
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        res.status(200).json({ message: 'Sesiones del usuario obtenidas correctamente', sessions: user.sessions });
    } catch (error) {
        console.error('Error al obtener las sesiones del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Desbloquear una cuenta de usuario
exports.unlockUserAccount = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de usuario no válido.' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // Restablecer los intentos fallidos y desbloquear la cuenta
        await user.resetFailedLoginAttempts();

        res.status(200).json({ message: 'Cuenta desbloqueada correctamente' });
    } catch (error) {
        console.error('Error al desbloquear la cuenta del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};



exports.getVendedores = async (req, res) => {
    try {
        // Buscar el rol de vendedor
        const vendedorRole = await Role.findOne({ name: 'vendedor' });
        if (!vendedorRole) {
            return res.status(404).json({ message: 'Rol de vendedor no encontrado.' });
        }

        // Obtener los usuarios que tienen el rol de vendedor
        const vendedores = await User.find({ role: vendedorRole._id }).select('-password');

        res.status(200).json({ message: 'Vendedores obtenidos correctamente', vendedores });
    } catch (error) {
        console.error('Error al obtener vendedores:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


exports.getClientes = async (req, res) => {
    try {
        // Buscar el rol de cliente
        const clienteRole = await Role.findOne({ name: 'cliente' });
        if (!clienteRole) {
            return res.status(404).json({ message: 'Rol de cliente no encontrado.' });
        }

        // Obtener los usuarios que tienen el rol de cliente
        const clientes = await User.find({ role: clienteRole._id }).select('-password');

        res.status(200).json({ message: 'Clientes obtenidos correctamente', clientes });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


exports.getAdmins = async (req, res) => {
    try {
        // Buscar el rol de admin
        const adminRole = await Role.findOne({ name: 'admin' });
        if (!adminRole) {
            return res.status(404).json({ message: 'Rol de administrador no encontrado.' });
        }

        // Obtener los usuarios que tienen el rol de administrador
        const admins = await User.find({ role: adminRole._id }).select('-password');

        res.status(200).json({ message: 'Administradores obtenidos correctamente', admins });
    } catch (error) {
        console.error('Error al obtener administradores:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


exports.getTrabajadores = async (req, res) => {
    try {
        // Buscar el rol de trabajador
        const trabajadorRole = await Role.findOne({ name: 'trabajador' });
        if (!trabajadorRole) {
            return res.status(404).json({ message: 'Rol de trabajador no encontrado.' });
        }

        // Obtener los usuarios que tienen el rol de trabajador
        const trabajadores = await User.find({ role: trabajadorRole._id }).select('-password');

        res.status(200).json({ message: 'Trabajadores obtenidos correctamente', trabajadores });
    } catch (error) {
        console.error('Error al obtener trabajadores:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};















