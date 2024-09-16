const Parametro = require('./models/Parametro');  // Importa el modelo de parámetros

const parametrosIniciales = [
    { nombre: 'limite_Deudas_Cliente', valor: 1000, descripcion: 'Límite de deudas permitido para un cliente' },
    { nombre: 'dias_Proximos_A_Expirar', valor: 7, descripcion: 'Número de días para considerar que un producto está próximo a expirar' },
    { nombre: 'stock_Minimo', valor: 50, descripcion: 'Stock mínimo para generar alertas de reabastecimiento' },
    { nombre: 'stock_Maximo', valor: 2000, descripcion: 'Stock máximo para generar alertas de almacenamiento' },
    { nombre: 'dias_Antes_Alerta_Expiracion', valor: 5, descripcion: 'Número de días antes de la expiración para generar una alerta' },
    { nombre: 'cantidad_minima_reabastecimiento', valor: 30, descripcion: 'Cantidad mínima para generar una alerta de reabastecimiento' },
];

// Función para inicializar los parámetros
const inicializarParametros = async () => {
    try {
        for (const parametro of parametrosIniciales) {
            const parametroExistente = await Parametro.findOne({ nombre: parametro.nombre });

            if (!parametroExistente) {
                // Si el parámetro no existe, lo crea
                const nuevoParametro = new Parametro({
                    ...parametro,
                    actualizadoPor: null,  // O el ID del usuario administrador si está disponible
                });
                await nuevoParametro.save();
                console.log(`Parámetro ${parametro.nombre} creado exitosamente.`);
            } else {
                // Si el parámetro ya existe, no se hace nada
                console.log(`Parámetro ${parametro.nombre} ya existe. No se realizaron cambios.`);
            }
        }
    } catch (error) {
        console.error('Error al inicializar los parámetros:', error.message);
    }
};

module.exports = inicializarParametros;
