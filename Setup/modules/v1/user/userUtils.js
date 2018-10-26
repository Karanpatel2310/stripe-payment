const uuid = require('node-uuid');
const mongoose = require('mongoose');
const l10n = require('jm-ez-l10n');
const User = require('./userModel');
const userNoteModel = require('./userNoteModel');
const userModel = require('./userModel');
const utils = require('../../../helper/utils');
const auth = require('../../../helper/auth');
const logger = require('../../../helper/logger');
const moment = require('moment');
const constants = require('../../../config/constants');
const notification = require('../../../helper/notification');
const aws = require('../../../helper/aws');
const userSubscriptionModel = require('./userSubscriptionModel');
const completedLessonModel = require('../lesson/completedLessonModel');
const userUtils = {};

userUtils.checkUserExist = (email, field) => {
  return new Promise((resolve, reject) => {
    const query = {};
    if (!email) {
      resolve(false);
    }
    query[field] = email;
    User.count(query)
      .then((count) => {
        resolve(count > 0);
      }).catch((err) => {
        reject(err);
      });
  });
};

userUtils.createSocialUser = (userInfo) => {
  const {
    provider, signupType, fullName, userLevelId, email,
    completedLesson, currentPackage, subscriptionStartDate,
    subscriptionLesson, trialLessonLimit
  } = userInfo;

  const user = new User({
    fullName,
    provider,
    signupType,
    userLevelId,
    email,
    completedLesson,
    currentPackage,
    subscriptionStartDate,
    subscriptionLesson,
    trialLessonLimit
  });

  return user.save();
};

userUtils.createUser = (userInfo, apiVersion, data) => {
  const {
    password, signupType, status, phone, email, fullName,
    completedLesson, currentPackage, subscriptionStartDate,
    subscriptionLesson, trialLessonLimit, userLevelId
  } = userInfo;

  const otpExpireBy = new Date();
  otpExpireBy.setTime(otpExpireBy.getTime() + constants.auth.optExpire);

  const otp = {
    code: auth.generateOtp(),
    expires: otpExpireBy,
  };

  const user = new User({
    password,
    signupType,
    status,
    fullName,
    phone,
    email,
    otp,
    completedLesson,
    currentPackage,
    subscriptionStartDate,
    subscriptionLesson,
    trialLessonLimit,
    userLevelId: data._id
  });
  return user.save();

  // userUtils.sendOtp(signupType, phone, email, otp, 'verification-otp', apiVersion);
  // return user.save();
};

userUtils.uploadImage = (image, user) => {
  if (image) {
    const userToUpdate = user;
    // Upload image
    const body = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const ext = image.split(';')[0].split('/')[1] || 'jpg';
    const key = `${uuid.v1()}.${ext}`;
    aws.putObject({ body, mime: `image/${ext}` }, key, 'base64')
      .then((result) => {
        userToUpdate.profilePic = result.url;
        userToUpdate.save();
      })
      .catch((err) => {
        logger.error(err);
      });
  }
};

userUtils.sendOtp = (signupType, phone, email, otp, template, apiVersion) => {
  // Send OTP
  const { loginTypes } = constants.auth;
  if (loginTypes.Mobile.is(signupType)) {
    notification.sendSms(phone, `sms-${template}`, { code: otp.code });
  } else if (loginTypes.Email.is(signupType)) {
    notification.sendMail(email, `email-${template}`, { link: `${process.env.RootUrl}/api/${apiVersion}/user/verify-email/${email}/${otp.code}` });
  }
};

userUtils.generateNewOtp = (user) => {
  return new Promise((resolve, reject) => {
    const userToUpdate = user;
    const otpExpireBy = new Date();
    otpExpireBy.setTime(otpExpireBy.getTime() + constants.auth.optExpire);

    const otp = {
      code: auth.generateOtp(),
      expires: otpExpireBy,
    };
    userToUpdate.otp = otp;
    userToUpdate.save()
      .then(() => {
        resolve(otp);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

userUtils.generateSendOtp = (loginType, phone, email, template, isRecovery) => {
  return new Promise((resolve, reject) => {
    const { loginTypes } = constants.auth;
    const query = {
      signupType: loginType,
    };

    if (loginTypes.Mobile.is(loginType)) {
      query.phone = phone;
    } else if (loginTypes.Email.is(loginType)) {
      if (isRecovery) {
        query.recoverEmailId = email;
      } else {
        query.email = email;
      }
    }

    User.findOne(query)
      .then((user) => {
        if (!user) {
          resolve({ code: 400, msg: l10n.t('ERR_USER_NOT_FOUND') });
        } else {
          userUtils.generateNewOtp(user)
            .then((otp) => {
              userUtils.sendOtp(loginType, phone, email, otp, template);
              resolve({ code: 200, msg: l10n.t('MSG_OTP_SENT') });
            })
            .catch((err) => {
              reject(err);
            });
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// Set user package and update subscription lesson count
userUtils.saveUserPackage = (req, userId, packageId, packageObj, lessons) => {
  return new Promise((resolve, reject) => {
    try {
      let packageData = new userSubscriptionModel(packageObj);
      userSubscriptionModel.savePackage(packageData)
        .then((data) => {
          if (data) {
            User.updateUserSubscriptionLesson(userId, lessons)
              .then((userData) => {
                if (userData) {
                  let response = {
                    data: userData,
                    message: req.t('SUBSCRIPTION_LESSON_COUNT')
                  }
                  return resolve(response);
                  // return resolve("Subscription lesson count update successfully");
                } else {
                  logger.error("Error! While update User lesson details in userUtils");
                }
              }).catch((error) => {
                logger.error("Error! While update subscription lesson in userUtils", error);
                reject(error);
              })
          }
        }).catch((error) => {
          logger.error("Error ! Find Lesson and userId in lessonUtils", error);
          reject(error);
        })
    } catch (error) {
      logger.error("In catch", error);
      reject(error);
    }
  })
};

// Save user note and find already exists note
userUtils.saveNote = (req, userId, noteData, word) => {
  return new Promise((resolve, reject) => {
    try {
      userNoteModel.find({ userId: userId, "word": word })
        .then((result) => {
          if (result && result.length > 0) {
            return resolve({ message: req.t('ALREADY_NOTE_SAVE') });
          } else {
            let data = new userNoteModel(noteData);
            userNoteModel.saveUserNote(data)
              .then((notes) => {
                return resolve({ message: req.t('NOTE_SAVE') });
              })
              .catch((err) => {
                logger.error("Error ! Save User note", err);
                reject(error);
              })
          }
        })
        .catch((err) => {
          logger.error("Error! While find user note/word in userUtils", err);
          reject(error);
        })
    } catch (error) {
      logger.error("In Save User note", error);
      reject(error);
    }
  })
};

userUtils.getOtherUserProgressResult = (userId) => {
  let prevMonthStartDay = moment().subtract(1, 'months').startOf('month').toISOString();
  let prevMonthLastDay = moment().subtract(1, 'months').endOf('month').toISOString();
  return new Promise((resolve, reject) => {
    try {
      completedLessonModel.aggregate([
        {
          $match: { userId: { $ne: userId } }
        },
        {
          $match: {
            "createdAt": {
              "$gte": new Date(prevMonthStartDay),
              "$lte": new Date(prevMonthLastDay)
            }
          }
        },
        {
          $group: {
            _id: "1",
            total: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1
          }
        }
      ])
        .then((otherUserCount) => {
          let response;
          if (otherUserCount.length > 0) {
            response = {
              total: otherUserCount[0].total
            }
          } else {
            response = {
              total: 0
            }            
          }
          return resolve(response);
        })
        .catch((error) => {
          logger.error("['Error!!!']", error);
          reject(error);
        })
    } catch (error) {
      logger.error("In catch While ['getOtherUserProgressResult'] ", error);
      reject(error);
    }
  })
};

userUtils.getLoginUserProgressResult = (userId) => {
  return new Promise((resolve, reject) => {
    try {
      userModel.findOne({ _id: userId })
        .then(findResult => {
          if (findResult.userSubscriptionStartDate) {
            let userSubscriptionStartDate = findResult.userSubscriptionStartDate;
            let userSubscriptionEndDate = findResult.userSubscriptionEndDate;
            let startOfLastMonth = moment(userSubscriptionStartDate).startOf('month').toISOString();
            let endOfLastMonth = moment(userSubscriptionStartDate).endOf('month').toISOString();
            completedLessonModel.aggregate([
              {
                $match: { userId: userId }
              },
              {
                $match: {
                  "createdAt": {
                    "$gte": new Date(startOfLastMonth),
                    "$lte": new Date(endOfLastMonth)
                  }
                }
              },
              {
                $group: {
                  _id: "1",
                  total: { $sum: 1 },
                  userName: { $first: "$fullName" },
                  userSubscriptionStartDate: { $first: '$userSubscriptionStartDate' },
                  completedLesson: { $first: '$completedLesson' }
                }
              },
              {
                $project: {
                  _id: 0,
                  total: 1,
                  userName: 1,
                  userSubscriptionStartDate: 1,
                  completedLesson: 1
                }
              }
            ])
              .then((loginUserCompletedLessonCount) => {
                let response = {
                  userInfo: findResult,
                  loginUserCompletedLessonCount: loginUserCompletedLessonCount,
                  userSubscriptionEndDate: userSubscriptionEndDate
                }
                return resolve(response);
              })
              .catch((error) => {
                logger.error("['Error!!!']", error);
                reject(error);
              })
          } else {
            let response = {
              userInfo: findResult,
              loginUserCompletedLessonCount: findResult.completedLesson,
              userSubscriptionEndDate: null,
            }
            return resolve(response);
          }
        })
        .catch((error) => {
          logger.error("ERROR ['getLoginUserProgressResult'] ", error);
          reject(error);
        })
    } catch (error) {
      logger.error("In catch While ['getLoginUserProgressResult'] ", error);
      reject(error);
    }
  })
};

userUtils.getTotalUserCount = (userId) => {
  return new Promise((resolve, reject) => {
    try {
      userModel.find({ _id: { $ne: userId } }).count()
        .then((count) => {
          return resolve(count);
        })
        .catch((error) => {
          logger.error("['Error!!! While Count total user in userUtils']", error);
          reject(error);
        })
    } catch (error) {
      logger.error("In catch While ['getTotalUserCount'] ", error);
      reject(error);
    }
  })
};

module.exports = userUtils;
