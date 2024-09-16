const Role = require('../models/Role');
const Permission = require('../models/Permission');

// Crear un nuevo rol
exports.createRole = async (req, res) => {
    try {
        const { name, permissions } = req.body;

        const roleExists = await Role.findOne({ name });
        if (roleExists) return res.status(400).json({ message: 'El rol ya existe' });

        const validPermissions = await Permission.find({ _id: { $in: permissions } });
        if (validPermissions.length !== permissions.length) {
            return res.status(400).json({ message: 'Algunos permisos no son válidos' });
        }

        const role = await Role.create({ name, permissions });
        res.status(201).json(role);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Obtener todos los roles
exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find().populate('permissions');
        res.status(200).json(roles);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Obtener un rol por ID
exports.getRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await Role.findById(id).populate('permissions');
        if (!role) return res.status(404).json({ message: 'Rol no encontrado' });

        res.status(200).json(role);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Actualizar un rol por ID
exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, permissions } = req.body;

        const role = await Role.findById(id);
        if (!role) return res.status(404).json({ message: 'Rol no encontrado' });

        const validPermissions = await Permission.find({ _id: { $in: permissions } });
        if (validPermissions.length !== permissions.length) {
            return res.status(400).json({ message: 'Algunos permisos no son válidos' });
        }

        role.name = name || role.name;
        role.permissions = permissions || role.permissions;

        await role.save();
        res.status(200).json(role);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Eliminar un rol por ID
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await Role.findByIdAndDelete(id);
        if (!role) return res.status(404).json({ message: 'Rol no encontrado' });

        res.status(200).json({ message: 'Rol eliminado correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Agregar permisos a un rol
exports.addPermissionsToRole = async (req, res) => {
    try {
        const { id } = req.params;  // ID del rol
        const { permissions } = req.body;  // Lista de permisos a agregar

        // Verificar que el rol exista
        const role = await Role.findById(id);
        if (!role) return res.status(404).json({ message: 'Rol no encontrado' });

        // Validar que los permisos enviados existan en la base de datos
        const validPermissions = await Permission.find({ _id: { $in: permissions } });
        if (validPermissions.length !== permissions.length) {
            return res.status(400).json({ message: 'Algunos permisos no son válidos' });
        }

        // Agregar nuevos permisos sin duplicados
        role.permissions = [...new Set([...role.permissions, ...permissions])];
        await role.save();

        res.status(200).json({ message: 'Permisos del rol actualizados correctamente', role });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
