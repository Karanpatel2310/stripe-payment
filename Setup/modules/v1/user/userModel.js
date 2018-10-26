const mongoose = require('mongoose');
const config = require('../../../config/config'),
  CURRENTPACKAGE = config.currentPackage;
const { Schema } = mongoose;

const userSchema = new Schema({
  userLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "changeLevelLists"
  },
  email: {
    type: String,
    // required: () => { return this.signupType === 'Email'; },
  },
  password: {
    type: String,
    default: ""
  },
  fullName: {
    type: String,
  },
  recoverEmailId: {
    type: String,
  },
  profilePic: {
    type: String,
  },
  phone: {
    type: String,
    required: () => { return this.signupType === 'Mobile'; },
  },
  provider: {
    id: {
      type: String,
    },
    platform: {
      type: String,
      enum: ['Google', 'Facebook', 'Kakao']
    },
  },
  otp: {
    code: {
      type: String,
    },
    expires: {
      type: Date,
    },
    _id: false,
  },
  status: {
    type: String,
    enum: ['NotVerified', 'Active', 'Deactive'],
    default: 'Active',
  },
  signupType: {
    type: String,
    enum: ['Email', 'Mobile', 'Social'],
    required: true,
  },
  dob: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
  },
  address: {
    addressLine1: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    pinCode: {
      type: String,
    },
  },
  card: {
    cardNo: {
      type: String,
    },
    expDate: {
      type: String,
    },
    cvv: {
      type: Number,
    },
    ccName: {
      type: String,
    },
  },
  completedLesson: {
    type: Number,
    default: 0
  },
  subscriptionLesson: {
    type: Number,
    default: 0
  },
  extraSubscriptionLesson: {
    type: Number,
    default: 0
  },
  completedSubscriptionLesson: {
    type: Number,
    default: 0
  },
  completedExtraSubscriptionLesson: {
    type: Number,
    default: 0
  },
  subscriptionStartDate: {
    type: Date,
  },
  subscriptionEndDate: {
    type: Date,
  },
  currentPackage: {
    type: String,
    enum: [
      CURRENTPACKAGE.Trial,
      CURRENTPACKAGE.Subscription,
      CURRENTPACKAGE.ExpiredSubscription
    ],
    default: config.currentPackage.Trial
  },
  trialLessonLimit: {
    type: Number,
    default: 2
  },
  isLevel: {
    type: Boolean,
    default: true
  },
  isBlock: {
    type: Boolean,
    default: false
  },
  userSubscriptionStartDate: {
    type: Date,
    default: null
  },
  userSubscriptionEndDate: {
    type: Date,
    default: null
  },
  totalLesson: {
    type: Number,
    default: 0
  }
}, { collection: 'users', timestamps: true, versionKey: false });

// Inc User total lesson count
userSchema.statics.updateUserTotalLessonCount = function (userId) {
  return this.findByIdAndUpdate({ _id: mongoose.Types.ObjectId(userId) }, { $inc: { "completedLesson": +1, "totalLesson": +1 } })
};

// Update User total lesson count
userSchema.statics.updateUserSubscriptionLesson = function (userId, lessons) {
  return this.findByIdAndUpdate({ _id: userId }, { currentPackage: config.currentPackage.Subscription, $inc: { "subscriptionLesson": +lessons } })
};

// Update User total lesson count
userSchema.statics.updateUserIsLevel = function (userId) {
  return this.findOneAndUpdate({ _id: userId }, { isLevel: false })
};

// Get User List for admin
userSchema.statics.getUserListForAdmin = function (skipRecord, limit) {
  return this.aggregate([
    {
      $lookup: {
        from: "changeLevelLists",
        localField: "userLevelId",
        foreignField: "_id",
        as: "changeLevelDetails"
      }
    },
    {
      $unwind: {
        path: "$changeLevelDetails",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "completedLessons",
        localField: "_id",
        foreignField: "userId",
        as: "completedLessonDetails"
      }
    },
    {
      $unwind: {
        path: "$completedLessonDetails",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: "$_id",
        total: { $sum: 1 },
        changeLevel: { $first: "$changeLevelDetails.name" },
        changeLevelId: { $first: "$changeLevelDetails._id" },
        userId: { $first: "$_id" },
        status: { $first: "$status" },
        currentPackage: { $first: "$currentPackage" },
        completedLesson: { $first: "$totalLesson" },
        subscriptionLesson: { $first: "$subscriptionLesson" },
        trialLessonLimit: { $first: "$trialLessonLimit" },
        isLevel: { $first: "$isLevel" },
        fullName: { $first: "$fullName" },
        signupType: { $first: "$signupType" },
        userLevelId: { $first: "$userLevelId" },
        email: { $first: "$email" },
        isBlock: { $first: "$isBlock" },
        createdAt: { $first: "$createdAt" },
      }
    },
    {
      $sort: { createdAt: -1 }
    }
  ]).skip(skipRecord).limit(limit)
};

// Get User List Page count for admin
userSchema.statics.userListPageCountForAdmin = function () {
  return this.find().count();
};

userSchema.statics.getUserAndSubscriptionDetails = function (userId) {
  return this.aggregate([
    {
      $match: { _id: userId }
    },
    {
      $lookup: {
        from: "changeLevelLists",
        localField: "userLevelId",
        foreignField: "_id",
        as: "changeLevelDetails"
      }
    },
    {
      $unwind: {
        path: "$changeLevelDetails",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: "$_id",
        level: { $first: "$changeLevelDetails.name" },
        fullName: { $first: "$fullName" },
        userSubscriptionStartDate: { $first: "$userSubscriptionStartDate" },
        todayDate: { $first: new Date() },
      }
    },
    {
      $project: {
        _id: 1,
        level: 1,
        fullName: 1,
        userSubscriptionStartDate: 1,
        todayDate: 1,
      }
    }
  ])
}

const User = mongoose.model('users', userSchema);
module.exports = User; 
