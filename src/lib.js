const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Role = require('./models/Role');
const Permission = require('./models/Permission');

// Crear permisos por defecto agrupados
const createDefaultPermissions = async () => {
    const permissions = [
        // Rutas de alertas
        { name: 'ver_alertas', description: 'Permite ver todas las alertas', group: 'Alertas' },
        { name: 'generar_alertas', description: 'Permite generar alertas', group: 'Alertas' },

        // Rutas de categorías
        { name: 'crear_categoria', description: 'Permite crear una categoría', group: 'Categorías' },
        { name: 'ver_categorias', description: 'Permite ver todas las categorías', group: 'Categorías' },
        { name: 'ver_categoria_id', description: 'Permite ver una categoría por su ID', group: 'Categorías' },
        { name: 'editar_categoria_id', description: 'Permite editar una categoría por su ID', group: 'Categorías' },
        { name: 'eliminar_categoria_id', description: 'Permite eliminar una categoría por su ID', group: 'Categorías' },

        // Rutas del dashboard (resumen, ventas, producción, inventario, alertas)
        { name: 'ver_resumen_dashboard', description: 'Permite ver el resumen del dashboard', group: 'Dashboard' },
        { name: 'ver_ventas_dashboard', description: 'Permite ver los datos de ventas en el dashboard', group: 'Dashboard' },
        { name: 'ver_produccion_dashboard', description: 'Permite ver los datos de producción en el dashboard', group: 'Dashboard' },
        { name: 'ver_inventarios_dashboard', description: 'Permite ver los datos de inventario en el dashboard', group: 'Dashboard' },
        { name: 'ver_alertas_dashboard', description: 'Permite ver las alertas en el dashboard', group: 'Dashboard' },

        // Rutas de lotes de producción
        { name: 'crear_lote_produccion', description: 'Permite crear un lote de producción', group: 'Producción' },
        { name: 'ver_lotes_produccion', description: 'Permite ver todos los lotes de producción', group: 'Producción' },
        { name: 'ver_lotes_produccion_id', description: 'Permite ver lotes de producción por producto', group: 'Producción' },
        { name: 'ver_lote_produccion_id', description: 'Permite ver un lote de producción por su ID', group: 'Producción' },
        { name: 'actualizar_lote_produccion_id', description: 'Permite actualizar un lote de producción por su ID', group: 'Producción' },
        { name: 'eliminar_lote_produccion_id', description: 'Permite eliminar un lote de producción por su ID', group: 'Producción' },

        // Rutas de movimientos de inventario
        { name: 'crear_movimiento_inventario', description: 'Permite crear un movimiento de inventario', group: 'Inventario' },
        { name: 'ver_movimientos_inventario', description: 'Permite ver todos los movimientos de inventario', group: 'Inventario' },
        { name: 'ver_movimiento_inventario_id', description: 'Permite ver un movimiento de inventario por su ID', group: 'Inventario' },
        { name: 'actualizar_movimiento_inventario_id', description: 'Permite actualizar un movimiento de inventario por su ID', group: 'Inventario' },
        { name: 'eliminar_movimiento_inventario_id', description: 'Permite eliminar un movimiento de inventario por su ID', group: 'Inventario' },

        // Rutas de pagos
        { name: 'crear_pago', description: 'Permite crear un pago', group: 'Pagos' },
        { name: 'ver_pagos', description: 'Permite ver los pagos de un cliente', group: 'Pagos' },
        { name: 'ver_ventas_pendientes', description: 'Permite ver las ventas pendientes de un cliente', group: 'Pagos' },

        // Rutas de parámetros
        { name: 'ver_parametros', description: 'Permite ver todos los parámetros', group: 'Parámetros' },
        { name: 'ver_parametro_id', description: 'Permite ver un parámetro por su ID', group: 'Parámetros' },
        { name: 'actualizar_parametro_id', description: 'Permite actualizar un parámetro por su ID', group: 'Parámetros' },

        // Rutas de permisos
        { name: 'crear_permiso', description: 'Permite crear un permiso', group: 'Permisos' },
        { name: 'ver_permisos', description: 'Permite ver todos los permisos', group: 'Permisos' },
        { name: 'ver_permiso_id', description: 'Permite ver un permiso por su ID', group: 'Permisos' },
        { name: 'actualizar_permiso_id', description: 'Permite actualizar un permiso por su ID', group: 'Permisos' },
        { name: 'eliminar_permiso_id', description: 'Permite eliminar un permiso por su ID', group: 'Permisos' },

        // Rutas de predicciones
        { name: 'ver_predicciones', description: 'Permite ver las predicciones de ventas y producción', group: 'Predicciones' },

        // Rutas de productos
        { name: 'crear_producto', description: 'Permite crear un producto', group: 'Productos' },
        { name: 'ver_productos', description: 'Permite ver todos los productos', group: 'Productos' },
        { name: 'ver_producto_id', description: 'Permite ver un producto por su ID', group: 'Productos' },
        { name: 'actualizar_producto_id', description: 'Permite actualizar un producto por su ID', group: 'Productos' },
        { name: 'eliminar_producto_id', description: 'Permite eliminar un producto por su ID', group: 'Productos' },

        // Rutas de reportes
        { name: 'ver_reportes_productos', description: 'Permite ver el reporte de productos', group: 'Reportes' },
        { name: 'ver_reportes_clientes', description: 'Permite ver el reporte de clientes', group: 'Reportes' },
        { name: 'ver_reportes_clientes_especificos', description: 'Permite ver el reporte de un cliente específico', group: 'Reportes' },
        { name: 'ver_reportes_deudas_por_vendedor', description: 'Permite ver el reporte de deudas por vendedor', group: 'Reportes' },

        // Rutas de roles
        { name: 'crear_rol', description: 'Permite crear un rol', group: 'Roles' },
        { name: 'ver_roles', description: 'Permite ver todos los roles', group: 'Roles' },
        { name: 'ver_rol_id', description: 'Permite ver un rol por su ID', group: 'Roles' },
        { name: 'actualizar_rol_id', description: 'Permite actualizar un rol por su ID', group: 'Roles' },
        { name: 'eliminar_rol_id', description: 'Permite eliminar un rol por su ID', group: 'Roles' },
        { name: 'agregar_permisos_rol', description: 'Permite agregar permisos a un rol', group: 'Roles' },

        // Rutas de stock
        { name: 'ver_stock', description: 'Permite ver el stock de todos los productos', group: 'Stock' },
        { name: 'ver_stock_id', description: 'Permite ver el stock de un producto por su ID', group: 'Stock' },
        { name: 'editar_stock_id', description: 'Permite editar el stock de un producto por su ID', group: 'Stock' },
        { name: 'eliminar_stock_id', description: 'Permite eliminar el stock de un producto por su ID', group: 'Stock' },

        // Rutas de usuarios
        { name: 'crear_usuario', description: 'Permite crear un usuario', group: 'Usuarios' },
        { name: 'ver_usuarios', description: 'Permite ver todos los usuarios', group: 'Usuarios' },
        { name: 'ver_usuario_id', description: 'Permite ver un usuario por su ID', group: 'Usuarios' },
        { name: 'actualizar_usuario_id', description: 'Permite actualizar un usuario por su ID', group: 'Usuarios' },
        { name: 'eliminar_usuario_id', description: 'Permite eliminar un usuario por su ID', group: 'Usuarios' },
        { name: 'actualizar_permisos_usuario', description: 'Permite actualizar los permisos de un usuario', group: 'Usuarios' },
        { name: 'ver_sesiones_usuario', description: 'Permite ver las sesiones de un usuario', group: 'Usuarios' },
        { name: 'desbloquear_cuenta', description: 'Permite desbloquear la cuenta de un usuario', group: 'Usuarios' },
        { name: 'generar_qr', description: 'Generar QR para la cuenta de un usuario', group: 'Usuarios' },

        // Rutas de vendedores, admins, clientes y trabajadores
        { name: 'ver_vendedores', description: 'Permite ver todos los vendedores', group: 'Vendedores' },
        { name: 'ver_admins', description: 'Permite ver todos los administradores', group: 'Administradores' },
        { name: 'ver_clientes', description: 'Permite ver todos los clientes', group: 'Clientes' },
        { name: 'ver_trabajadores', description: 'Permite ver todos los trabajadores', group: 'Trabajadores' },
    ];

    // Lógica para crear permisos en la base de datos (por ejemplo, insertarlos)  

    // Verificar si ya existen los permisos y crearlos si no existen
    for (const perm of permissions) {
        const existingPermission = await Permission.findOne({ name: perm.name });
        if (!existingPermission) {
            await Permission.create(perm);
        }
    }
};

// Crear roles por defecto (admin, vendedor, cliente, trabajador)
const createDefaultRoles = async () => {
    const roles = [
        { name: 'admin' },
        { name: 'vendedor' },
        { name: 'cliente' },
        { name: 'trabajador' }
    ];

    for (const role of roles) {
        const existingRole = await Role.findOne({ name: role.name });
        if (!existingRole) {
            await Role.create(role);
        }
    }
};

// Asignar permisos a roles específicos
const assignPermissionsToRoles = async () => {
    const adminRole = await Role.findOne({ name: 'admin' });
    const vendedorRole = await Role.findOne({ name: 'vendedor' });
    const clienteRole = await Role.findOne({ name: 'cliente' });
    const trabajadorRole = await Role.findOne({ name: 'trabajador' });

    // Asignar todos los permisos al admin
    const allPermissions = await Permission.find();
    adminRole.permissions = allPermissions.map(perm => perm._id);
    await adminRole.save();

    // Permisos para el vendedor
    const vendedorPermissions = await Permission.find({
        name: {
            $in: [
                'crear_venta', 'ver_ventas', 'ver_venta_id', 'actualizar_venta_id',
                'crear_pago', 'ver_pagos', 'ver_pago_id', 'actualizar_pago_id',
                'ver_usuarios', 'crear_usuario', 'actualizar_usuario_id',
                'ver_productos', 'ver_stock_producto', 'ver_reporte_cliente'
            ]
        }
    });
    vendedorRole.permissions = vendedorPermissions.map(perm => perm._id);
    await vendedorRole.save();

    // Permisos para el cliente
    const clientePermissions = await Permission.find({
        name: {
            $in: ['ver_ventas', 'ver_venta_id', 'ver_pagos', 'ver_pago_id']
        }
    });
    clienteRole.permissions = clientePermissions.map(perm => perm._id);
    await clienteRole.save();

    // Permisos para el trabajador
    const trabajadorPermissions = await Permission.find({
        name: {
            $in: ['crear_producto', 'ver_productos', 'ver_producto_id', 'actualizar_producto_id',
                'ver_stock_producto', 'actualizar_stock_producto',
                'crear_lote_produccion', 'ver_lotes_produccion', 'actualizar_lote_produccion_id',
                'ver_reporte_productos']
        }
    });
    trabajadorRole.permissions = trabajadorPermissions.map(perm => perm._id);
    await trabajadorRole.save();
};

// Crear usuario administrador por defecto
const createDefaultAdmin = async () => {
    try {
        const adminRole = await Role.findOne({ name: 'admin' }).populate('permissions');
        if (!adminRole) {
            console.error('No se encontró el rol de administrador, asegúrate de crearlo primero.');
            return;
        }

        const existingAdmin = await User.findOne({ email: 'admin@example.com' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);

            const adminPermissions = adminRole.permissions.map(permission => ({
                permission: permission._id,
                granted: true
            }));

            await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                password: hashedPassword,
                role: adminRole._id,
                birthdate: '1990-01-01',
                gender: 'Masculino',
                ci: '12345678',
                contactInfo: {
                    address: '123 Admin Street',
                    phone: '1234567890'
                },
                permissions: adminPermissions  // Asignar los permisos personalizados al administrador
            });

            console.log('Usuario admin creado.');
        } else {
            console.log('El usuario admin ya existe.');
        }
    } catch (error) {
        console.error('Error creando el usuario admin por defecto:', error);
    }
};

// Inicializar permisos, roles y usuario admin por defecto
const initializeData = async () => {
    await createDefaultPermissions();
    await createDefaultRoles();
    await assignPermissionsToRoles();
    await createDefaultAdmin();
};

module.exports = initializeData;
