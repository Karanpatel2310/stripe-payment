const mongoose = require('mongoose');
const { Schema } = mongoose;

const lessonTopicsSchema = new Schema({
  title: {
    type: String,
  },
  titleKR: {
    type: String,
  },
}, { collection: 'contactLessonTopics', timestamps: true, versionKey: false });

const lessonTopics = mongoose.model('contactLessonTopics', lessonTopicsSchema);
module.exports = lessonTopics; 