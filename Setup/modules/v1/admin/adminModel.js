const mongoose = require('mongoose');
const config = require('../../../config/config');
const ROLE = config.role;
const { Schema } = mongoose;

let adminSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
    },
    role: {
        type: String,
        "enum": [
            ROLE.Super,
            ROLE.App
        ]
    },
    isVerified: {
        type: Boolean,
        default: false
    },
}, {
        versionKey: false,
        timestamps: true
    });

adminSchema.statics.saveLoginData = function (data) {
    return data.save();
};

adminSchema.statics.getByEmailPasswd = function (data) {
    return this.findOne(data);
};

adminSchema.statics.setToken = function (_id, token) {
    return this.update({ _id }, { $set: token }, { new: true });
};

adminSchema.statics.unSetToken = function (_id, token) {
    return this.update({ _id }, { $unset: token }, { new: true });
};

adminSchema.statics.findByIdAndCode = function (_id, code) {
    return this.findOne({ _id, "verificationCode": code });
};

adminSchema.statics.getEmailStatus = function () {
    return this.findOne(null, { "authRequired": 1 });
};

adminSchema.statics.findAdminId = function () {
    return this.find();
};

adminSchema.statics.setNewAdmin = function (data) {
    return data.save();
};

adminSchema.statics.getAdminList = function (skipRecord, limit) {
    return this.find().skip(skipRecord).limit(limit);
};

adminSchema.statics.getAdminListCount = function () {
    return this.find().count();
};

let admin = mongoose.model('admins', adminSchema);
module.exports = admin;