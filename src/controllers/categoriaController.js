const Categoria = require('../models/Categoria');
const mongoose = require('mongoose');
// Crear una nueva categoría
exports.createCategoria = async (req, res, next) => {
    try {
        const { nombre } = req.body;

        // Verificar si ya existe una categoría con el mismo nombre
        const categoriaExistente = await Categoria.findOne({ nombre });
        if (categoriaExistente) {
            return res.status(400).json({ message: 'Ya existe una categoría con ese nombre' });
        }

        // Crear la nueva categoría
        const newCategoria = new Categoria({ nombre });
        const savedCategoria = await newCategoria.save();

        res.status(201).json(savedCategoria);
    } catch (error) {
        console.error('Error creando la categoría:', error);
        next(error);
    }
};


// Obtener todas las categorías
exports.getCategorias = async (req, res) => {
    try {
        const categorias = await Categoria.aggregate([
            {
                $lookup: {
                    from: 'productos', // Nombre de la colección de productos
                    localField: '_id',
                    foreignField: 'categoria',
                    as: 'productos'
                }
            },
            {
                $project: {
                    nombre: 1,
                    cantidadProductos: { $size: '$productos' }, // Contar la cantidad de productos
                    nombresProductos: '$productos.nombre' // Mostrar los nombres de los productos
                }
            }
        ]);

        res.status(200).json(categorias);
    } catch (error) {
        console.error('Error obteniendo las categorías:', error);
        res.status(500).json({ message: 'Error al obtener las categorías' });
    }
};


// Obtener una categoría por ID
exports.getCategoriaById = async (req, res) => {
    try {
        const { id } = req.params;

        const categoria = await Categoria.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(id) } // Asegúrate de usar 'new' al crear el ObjectId
            },
            {
                $lookup: {
                    from: 'productos',
                    localField: '_id',
                    foreignField: 'categoria',
                    as: 'productos'
                }
            },
            {
                $project: {
                    nombre: 1,
                    cantidadProductos: { $size: '$productos' }, // Contar la cantidad de productos
                    nombresProductos: '$productos.nombre' // Mostrar los nombres de los productos
                }
            }
        ]);

        if (categoria.length === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        res.status(200).json(categoria[0]); // Devuelve el primer resultado ya que es una categoría
    } catch (error) {
        console.error('Error obteniendo la categoría:', error);
        res.status(500).json({ message: 'Error al obtener la categoría' });
    }
};


// Actualizar una categoría por ID
exports.updateCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        // Verificar si el nombre ya existe
        const categoriaExistente = await Categoria.findOne({ nombre });
        if (categoriaExistente && categoriaExistente._id.toString() !== id) {
            return res.status(400).json({ message: 'Ya existe otra categoría con ese nombre' });
        }

        const updatedCategoria = await Categoria.findByIdAndUpdate(
            id,
            { nombre },
            { new: true, runValidators: true }
        );

        if (!updatedCategoria) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        res.status(200).json(updatedCategoria);
    } catch (error) {
        console.error('Error actualizando la categoría:', error);
        res.status(500).json({ message: 'Error al actualizar la categoría' });
    }
};

// Eliminar una categoría por ID
exports.deleteCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si existen productos asociados a la categoría
        const productosAsociados = await Producto.find({ categoria: id });

        if (productosAsociados.length > 0) {
            return res.status(400).json({ message: 'No se puede eliminar la categoría, tiene productos asociados.' });
        }

        // Si no hay productos asociados, proceder a eliminar la categoría
        const deletedCategoria = await Categoria.findByIdAndDelete(id);

        if (!deletedCategoria) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        res.status(200).json({ message: 'Categoría eliminada correctamente' });
    } catch (error) {
        console.error('Error eliminando la categoría:', error);
        res.status(500).json({ message: 'Error al eliminar la categoría' });
    }
};


