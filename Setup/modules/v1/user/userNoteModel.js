const mongoose = require('mongoose');
const { Schema } = mongoose;

let userNoteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    word: {
        type: String
    },
    meaning: {
        type: String,
    }
}, {
        versionKey: false,
        timestamps: true
    }
);

// Save user note/word
userNoteSchema.statics.saveUserNote = function (data) {
    return data.save();
};

userNoteSchema.statics.getUserNoteList = function (userId, skipRecord, limit) {
    return this.find({ userId: userId }).sort({ createdAt: -1 }).skip(skipRecord).limit(limit);
};

userNoteSchema.statics.getUserNoteListCount = function (userId) {
    return this.find({userId: userId}).count();
};

let userNotes = mongoose.model('usernotes', userNoteSchema);
module.exports = userNotes;