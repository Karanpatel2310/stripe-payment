const mongoose = require('mongoose');
const config = require('../../../config/config');
const ROLE = config.role;
const { Schema } = mongoose;

let adminRoleSchema = new mongoose.Schema({
    role: {
        type: String,
        "enum": [
            ROLE.Super,
            ROLE.App
        ]
    },
}, {
        versionKey: false,
        timestamps: true
    });

let adminRoles = mongoose.model('adminroles', adminRoleSchema);
module.exports = adminRoles;