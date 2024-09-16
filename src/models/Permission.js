const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    group: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);
