const mongoose = require('mongoose');

// Función para conectar a la base de datos
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {

        });
        console.log('MongoDB conectado');
    } catch (error) {
        console.error('Error de conexión a MongoDB:', error);
        process.exit(1); // Detener el proceso en caso de error
    }
};

module.exports = connectDB;
