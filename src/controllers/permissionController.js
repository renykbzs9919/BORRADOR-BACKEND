const Permission = require('../models/Permission');

// Crear un nuevo permiso
exports.createPermission = async (req, res) => {
    try {
        const { name, description } = req.body;

        const permissionExists = await Permission.findOne({ name });
        if (permissionExists) return res.status(400).json({ message: 'El permiso ya existe' });

        const permission = await Permission.create({ name, description });
        res.status(201).json(permission);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Obtener todos los permisos
exports.getPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find();
        res.status(200).json(permissions);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Obtener un permiso por ID
exports.getPermissionById = async (req, res) => {
    try {
        const { id } = req.params;
        const permission = await Permission.findById(id);
        if (!permission) return res.status(404).json({ message: 'Permiso no encontrado' });

        res.status(200).json(permission);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Actualizar un permiso por ID
exports.updatePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const permission = await Permission.findById(id);
        if (!permission) return res.status(404).json({ message: 'Permiso no encontrado' });

        permission.name = name || permission.name;
        permission.description = description || permission.description;

        await permission.save();
        res.status(200).json(permission);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Eliminar un permiso por ID
exports.deletePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const permission = await Permission.findByIdAndDelete(id);
        if (!permission) return res.status(404).json({ message: 'Permiso no encontrado' });

        res.status(200).json({ message: 'Permiso eliminado correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
