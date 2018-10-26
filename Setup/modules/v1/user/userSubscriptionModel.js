const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "users"
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "packages"
  }
}, { collection: 'userSubscriptions', timestamps: true, versionKey: false });

// save user package
userSubscriptionSchema.statics.savePackage = function (data) {
  return data.save();
};

const userSubscriptions = mongoose.model('userSubscriptions', userSubscriptionSchema);
module.exports = userSubscriptions; 
