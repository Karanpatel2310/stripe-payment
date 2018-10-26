const mongoose = require('mongoose');
const { Schema } = mongoose;

let acronymsSchema = new mongoose.Schema({
    word: {
        type: String,
    },
    meaning: {
        type: String,
    }
}, {
        versionKey: false,
        timestamps: true
    });

acronymsSchema.statics.setNewAcronyms = function (data) {
    return data.save();
};

acronymsSchema.statics.getAcronymsList = function (skipRecord, limit) {
    return this.find().sort({ createdAt: -1 }).skip(skipRecord).limit(limit);
};

acronymsSchema.statics.getAcronymsListCount = function () {
    return this.find().count();
};

let acronyms = mongoose.model('acronyms', acronymsSchema);
module.exports = acronyms;