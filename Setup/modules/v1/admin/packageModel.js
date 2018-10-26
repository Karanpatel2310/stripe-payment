const mongoose = require('mongoose');
const { Schema } = mongoose;

const packageSchema = new Schema({
  price: {
    type: String,
  },
  lessons: {
    type: String,
  },
  type: {
    type: String,
  }
}, { collection: 'packages', timestamps: true, versionKey: false });

const packages = mongoose.model('packages', packageSchema);
module.exports = packages; 