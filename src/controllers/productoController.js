const Producto = require('../models/Producto');
const Categoria = require('../models/Categoria');
const Stock = require('../models/Stock');
const Parametro = require('../models/Parametro');
const Alerta = require('../models/Alerta');
const MovimientoInventario = require('../models/MovimientoInventario');
const Venta = require('../models/Venta');
const LoteProduccion = require('../models/LoteProduccion');


// Función para generar SKU único e incremental
const generateSKU = async (nombre) => {
    const lastProduct = await Producto.findOne().sort({ createdAt: -1 });
    const lastSku = lastProduct ? parseInt(lastProduct.sku.split('-').pop()) : 0;
    const newSku = isNaN(lastSku) ? 1 : lastSku + 1;
    return `SC-${nombre.split(' ').join('-').toUpperCase()}-${newSku.toString().padStart(3, '0')}`;
};

// Crear un nuevo producto
exports.createProducto = async (req, res) => {
    try {
        const { nombre, descripcion, categoria, precioVenta, costo, unidadMedida, diasExpiracion } = req.body;

        // Validar los campos
        if (!nombre || typeof nombre !== 'string') {
            return res.status(400).json({ error: 'El campo "nombre" es requerido y debe ser una cadena de texto.' });
        }
        if (precioVenta === undefined || typeof precioVenta !== 'number' || precioVenta <= 0) {
            return res.status(400).json({ error: 'El campo "precioVenta" es requerido y debe ser un número positivo.' });
        }
        if (costo === undefined || typeof costo !== 'number' || costo <= 0) {
            return res.status(400).json({ error: 'El campo "costo" es requerido y debe ser un número positivo.' });
        }
        if (!unidadMedida || typeof unidadMedida !== 'string') {
            return res.status(400).json({ error: 'El campo "unidadMedida" es requerido y debe ser una cadena de texto.' });
        }
        if (diasExpiracion === undefined || typeof diasExpiracion !== 'number' || diasExpiracion <= 0) {
            return res.status(400).json({ error: 'El campo "diasExpiracion" es requerido y debe ser un número positivo.' });
        }

        // Verificar si el nombre del producto ya existe
        const productoExistente = await Producto.findOne({ nombre });
        if (productoExistente) {
            return res.status(400).json({ error: 'El producto con ese nombre ya existe.' });
        }

        // Verificar si la categoría existe
        const categoriaExistente = await Categoria.findById(categoria);
        if (!categoriaExistente) {
            return res.status(400).json({ error: 'La categoría proporcionada no existe.' });
        }

        // Generar SKU único e incremental
        const sku = await generateSKU(nombre);

        // Crear el nuevo producto
        const nuevoProducto = new Producto({
            nombre,
            descripcion: descripcion || '',
            categoria,
            sku,
            precioVenta,
            costo,
            unidadMedida,
            diasExpiracion
        });

        // Guardar el producto
        await nuevoProducto.save();

        // Obtener el parámetro stock_Minimo
        const stockMinimo = await Parametro.findOne({ nombre: 'stock_Minimo' });
        if (!stockMinimo) {
            return res.status(500).json({ error: 'El parámetro "stock_Minimo" no está configurado.', status: 500 });
        }

        // Obtener el parámetro stock_Maximo
        const stockMaximo = await Parametro.findOne({ nombre: 'stock_Maximo' });
        if (!stockMaximo) {
            return res.status(500).json({ error: 'El parámetro "stock_Maximo" no está configurado.', status: 500 });
        }

        // Inicializar el stock del producto
        const nuevoStock = new Stock({
            productoId: nuevoProducto._id,
            stockActual: 0,
            stockReservado: 0,
            stockMinimo: stockMinimo.valor,
            stockMaximo: stockMaximo.valor
        });
        await nuevoStock.save();

        // Verificar `dias_Proximos_A_Expirar` para generar alertas
        const diasProximosExpirar = await Parametro.findOne({ nombre: 'dias_Proximos_A_Expirar' });
        if (!diasProximosExpirar) {
            return res.status(500).json({ error: 'El parámetro "dias_Proximos_A_Expirar" no está configurado.', status: 500 });
        }

        // Generar alerta si el producto está cerca de expirar
        const fechaExpiracionProducto = new Date();
        fechaExpiracionProducto.setDate(fechaExpiracionProducto.getDate() + diasExpiracion);
        const proximidadExpiracion = new Date();
        proximidadExpiracion.setDate(proximidadExpiracion.getDate() + diasProximosExpirar.valor);

        if (fechaExpiracionProducto <= proximidadExpiracion) {
            const nuevaAlerta = new Alerta({
                productoId: nuevoProducto._id,
                alertaVencimiento: true,
                fechaAlerta: new Date()
            });
            await nuevaAlerta.save();
        }

        // Respuesta JSON exitosa
        res.status(201).json({
            message: 'Producto creado exitosamente',
            producto: nuevoProducto
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};




// Obtener todos los productos
exports.getProductos = async (req, res) => {
    try {
        const productos = await Producto.find().populate('categoria');
        res.status(200).json(productos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los productos.' });
    }
};

// Obtener un producto por su ID
exports.getProductoById = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id).populate('categoria');
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.status(200).json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el producto.' });
    }
};

// Actualizar un producto por su ID
exports.updateProducto = async (req, res) => {
    try {
        const { nombre, descripcion, categoria, precioVenta, costo, unidadMedida, diasExpiracion } = req.body;

        // Validar si el producto existe
        const producto = await Producto.findById(req.params.id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        // Validar campos
        if (nombre && typeof nombre !== 'string') {
            return res.status(400).json({ error: 'El campo "nombre" debe ser una cadena de texto.' });
        }
        if (precioVenta !== undefined && (typeof precioVenta !== 'number' || precioVenta <= 0)) {
            return res.status(400).json({ error: 'El campo "precioVenta" debe ser un número positivo.' });
        }
        if (costo !== undefined && (typeof costo !== 'number' || costo <= 0)) {
            return res.status(400).json({ error: 'El campo "costo" debe ser un número positivo.' });
        }
        if (unidadMedida && typeof unidadMedida !== 'string') {
            return res.status(400).json({ error: 'El campo "unidadMedida" debe ser una cadena de texto.' });
        }
        if (diasExpiracion !== undefined && (typeof diasExpiracion !== 'number' || diasExpiracion <= 0)) {
            return res.status(400).json({ error: 'El campo "diasExpiracion" debe ser un número positivo.' });
        }

        // Actualizar los campos
        if (nombre) producto.nombre = nombre;
        if (descripcion) producto.descripcion = descripcion;
        if (categoria) {
            const categoriaExistente = await Categoria.findById(categoria);
            if (!categoriaExistente) {
                return res.status(400).json({ error: 'La categoría proporcionada no existe.' });
            }
            producto.categoria = categoria;
        }
        if (precioVenta) producto.precioVenta = precioVenta;
        if (costo) producto.costo = costo;
        if (unidadMedida) producto.unidadMedida = unidadMedida;
        if (diasExpiracion) producto.diasExpiracion = diasExpiracion;

        await producto.save();
        res.status(200).json({ message: 'Producto actualizado exitosamente.', producto });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el producto.' });
    }
};

// Eliminar un producto por su ID
exports.deleteProducto = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el producto existe
        const producto = await Producto.findById(id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        // Verificar si el producto está asociado a algún movimiento de inventario
        const movimientosAsociados = await MovimientoInventario.find({ productoId: id });
        if (movimientosAsociados.length > 0) {
            return res.status(400).json({ error: 'El producto no puede ser eliminado porque está asociado a movimientos de inventario.' });
        }

        // Verificar si el producto está asociado a alguna venta
        const ventasAsociadas = await Venta.find({ 'productos.productoId': id });
        if (ventasAsociadas.length > 0) {
            return res.status(400).json({ error: 'El producto no puede ser eliminado porque está asociado a ventas.' });
        }

        // Eliminar todas las alertas asociadas al producto
        await Alerta.deleteMany({ productoId: id });

        // Eliminar todos los lotes de producción asociados al producto
        await LoteProduccion.deleteMany({ productoId: id });

        // Eliminar el stock asociado al producto
        await Stock.deleteOne({ productoId: id });

        // Eliminar el producto
        await Producto.findByIdAndDelete(id);

        // Respuesta exitosa
        res.status(200).json({ message: 'Producto y todas sus referencias eliminadas exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el producto.' });
    }
};
