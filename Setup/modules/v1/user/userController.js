const _ = require('lodash');
const mongoose = require('mongoose');
const passwordHash = require('password-hash');
const logger = require('../../../helper/logger');
const auth = require('../../../helper/auth');
const constants = require('../../../config/constants');
const jwt = require('../../../helper/jwt');
const User = require('./userModel');
const userNoteModel = require('./userNoteModel');
const completedLessonModel = require('../lesson/completedLessonModel');
const userUtils = require('./userUtils');
const aws = require('../../../helper/aws');
const utils = require('../../../helper/utils');
const changeLevelListModel = require('../changelevel/changeLevelListModel');
const suggestedCurriculumModel = require('../static/suggestedCurriculumModel');
const lessonTopicModel = require('../lesson/lessonTopics');
const cmsModel = require('../cms/cmsModel');
const acronymsModel = require('../admin/acronymsModel');
const userCtr = {};
const contactLessonTopicsModel = require('./contactlesson');
let path = require('path');

userCtr.checkUserExist = (req, res) => {
  const { email, phone, loginType } = req.body;
  let promise = userUtils.checkUserExist(email, 'email');

  const { loginTypes } = constants.auth;

  if (loginTypes.Mobile.is(loginType)) {
    promise = userUtils.checkUserExist(phone, 'phone');
  }

  promise
    .then((isExist) => {
      res.status(200).json({ isExist });
    })
    .catch((err) => {
      logger.error(err);
      res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
    });
};

// Normal Signup
userCtr.signup = (req, res) => {
  const {
    loginType, phone, email, password, fullName,
  } = req.body;

  const userData = {
    password: passwordHash.generate(password),
    signupType: loginType,
    status: constants.user.statuses.NotVerified.key,
    fullName,
    email: email
  };

  if (req.body) {
    User.findOne({ email: email })
      .then(result => {
        if (result && result.status === 'NotVerified') {
          return res.status(406).json({ error: req.t('ERR_USER_NOT_VERIFIED_EMAIL') });
        } else if (result && result.status === 'Active') {
          return res.status(400).json({ error: req.t('ERR_USER_ALREADY_EXIST') });
        } else {
          changeLevelListModel.findOne({ "name": "Elementary" })
            .then((data) => {
              if (data) {
                userUtils.createUser(userData, req.apiVersion, data).then((savedUser) => {
                  aws.sendEmail(email, fullName, "emailAccountActivate", savedUser.otp.code, "Account And Email Verification", (err, isEmailSent) => {
                    if (isEmailSent) {
                      return res.status(200).json({ message: req.t('MSG_ACCOUNT_CREATED') });
                    } else {
                      logger.error('[Erro in login(super) mail sending failure]', err);
                    }
                  });
                }).catch((err) => {
                  logger.error(err);
                  return res.status(500).json({ "error": req.t('ERR_INTERNAL_SERVER') });
                });
              } else {
                logger.error("Error While Get user type list in userCtr");
              }
            })
            .catch((error) => {
              logger.error("Error While Get user type list in userCtr", error);
              return res.status(400).json({ "error": req.t('ERR_USER_BLOCKED') })
            })
        }
      })
      .catch(err => {
        logger.error(err);
        return res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
      })
  } else {
    return res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
  }
};

// Login
userCtr.authenticate = (req, res) => {
  const {
    loginType, phone, email, password,
  } = req.body;

  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        res.status(400).json({ error: req.t('ERR_USER_NOT_FOUND') });
      } else if (user && user.status === "NotVerified") {
        res.status(406).json({ error: req.t('ERR_USER_NOT_VERIFIED_EMAIL') });
      } else {
        if (constants.user.statuses.Active.is(user.status)) {
          if (passwordHash.verify(password, user.password)) {
            const token = jwt.getAuthToken({ id: user._id });
            return res.status(200).json({ token });
          } else {
            return res.status(400).json({ error: req.t('ERR_PASSWORD_NOT_MATCHED') });
          }
        } else {
          return res.status(406).json({ error: req.t('ERR_USER_BLOCKED') });
        }
      }
    }).catch((err) => {
      logger.error(err);
      return res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
    });
};

// SignUp With Social App
userCtr.authenticateProvider = (req, res) => {
  const { provider, fullName, email } = req.body;
  const { id, accessToken } = req.body.socialInfo;
  // Find User
  User.findOne({ 'provider.id': id, 'provider.platform': provider })
    .then((user) => {
      auth.socialCheck({ id, accessToken }, provider)
        .then(() => {
          if (user) {
            const token = jwt.getAuthToken({ id: user._id });
            return res.status(200).json({ token, isNewUser: false });
          } else {
            changeLevelListModel.findOne({ "name": "Elementary" })
              .then((data) => {
                let userLevelId = data._id;
                let email = req.body.email;
                // Create Account
                userUtils.createSocialUser({
                  fullName,
                  provider: {
                    id,
                    platform: provider,
                  },
                  signupType: 'Social',
                  userLevelId,
                  email
                }).then((newUser) => {
                  const token = jwt.getAuthToken({ id: newUser._id });
                  return res.status(200).json({ token, isNewUser: true });
                }).catch((err) => {
                  logger.error(err);
                  return res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
                });
              }).catch((err) => {
                logger.error(err);
                return res.status(500).json({ error: req.t('NOT_FOUND') });
              })
          }
        }).catch((err) => {
          logger.error(err);
          return res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
        });
    }).catch((err) => {
      logger.error("User does not exists", err);
      return res.status(500).json({ error: req.t('NOT_FOUND') });
    })
};

userCtr.forgetPassword = (req, res) => {
  const {
    email
  } = req.body;
  let password = utils.makeRandomStringOfLength(12);
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(400).json({ "error": req.t("EMAIL_NOT_FOUND") });
      } else {
        aws.sendEmail(user.email, user.fullName, "accountActivate", password, "Password Assistance", function (err, isEmailSent) {
          if (isEmailSent) {
            return res.status(200).json({ "message": req.t("MSG_PASSWORD_SENT") });
          } else {
            logger.error('[Erro in login(super) mail sending failure]', err);
            return res.status(400).json({ "error": req.t("TRY_AGAIN") });
          }
        });
      }
    }).catch((err) => {
      logger.error("Error! While find user email in userUtils", err);
      return res.status(400).json({ "error": req.t("TRY_AGAIN") });
    });
};

userCtr.resetPassword = (req, res) => {
  // const {
  //   loginType, phone, email, otp, password,
  // } = req.body;

  // const { loginTypes } = constants.auth;
  // const query = {
  //   signupType: loginType,
  // };

  // if (loginTypes.Mobile.is(loginType)) {
  //   query.phone = phone;
  // } else if (loginTypes.Email.is(loginType)) {
  //   query.email = email;
  // }

  // query['otp.code'] = otp;
  // query['otp.expires'] = { $gte: new Date() };

  // User.findOne(query)
  //   .then((user) => {
  //     if (!user) {
  //       res.status(400).json({ error: req.t('ERR_GENRIC_OTP_EXPIRE') });
  //     } else {
  //       const userToUpdate = user;
  //       userToUpdate.password = passwordHash.generate(password);
  //       userToUpdate.otp = {};
  //       userToUpdate.save()
  //         .then(() => {
  //           res.status(200).json({ msg: req.t('MSG_PASSWORD_RESET') });
  //         })
  //         .catch((err) => {
  //           logger.error(err);
  //           res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
  //         });
  //     }
  //   })
  //   .catch((err) => {
  //     logger.error(err);
  //     res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
  //   });
};

// Verify verification email of user
userCtr.verifyEmail = (req, res) => {
  const {
    email, code,
  } = req.params;

  const query = {
    signupType: 'Email',
  };

  query.email = email;

  query['otp.code'] = code;
  query['otp.expires'] = { $gte: new Date() };

  User.findOne({ email: email })
    .then((user) => {
      if (!user || user.status === 'NotVerified') {
        const userToUpdate = user;
        userToUpdate.otp = {};
        userToUpdate.status = constants.user.statuses.Active.key;
        userToUpdate.save()
          .then(() => {
            return res.sendFile(path.resolve('templates/verifyEmail.html'));
            // return res.send('<h3 style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial;">Your email address verified successfully, you may login to mobile app now.</h3>');
          })
          .catch((err) => {
            logger.error(err);
            return res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
          });
      } else {
        return res.sendFile(path.resolve('templates/alreadyVerifyEmail.html'));
      }
    })
    .catch((err) => {
      logger.error(err);
      return res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
    });
};

userCtr.resendOtp = (req, res) => {
  // const {
  //   loginType, phone, email,
  // } = req.body;

  // userUtils.generateSendOtp(loginType, phone, email, 'verification-otp')
  //   .then((result) => {
  //     res.status(result.code).json({ msg: result.msg });
  //   })
  //   .catch((err) => {
  //     logger.error(err);
  //     res.status(500).json({ error: err });
  //   });
};

userCtr.recoverAccountOtp = (req, res) => {
  // const {
  //   email,
  // } = req.body;

  // User.findOne({ recoverEmailId: email })
  //   .then((user) => {
  //     if (user) {
  //       userUtils.generateSendOtp(constants.auth.loginTypes.Email.key, null, email, 'recover-account-otp', true)
  //         .then(() => {
  //           res.status(200).json({ msg: req.t('MSG_RECOVER_ACCOUNT') });
  //         })
  //         .catch((err) => {
  //           logger.error(err);
  //           res.status(500).json({ error: err });
  //         });
  //     } else {
  //       res.status(200).json({ error: req.t('MSG_RECOVER_ACCOUNT') });
  //     }
  //   })
  //   .catch((err) => {
  //     logger.error(err);
  //     res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
  //   });
};

userCtr.recoverAccount = (req, res) => {
  // const {
  //   loginType, phone, email, otp, password, recoverEmailId,
  // } = req.body;

  // User.findOne({ recoverEmailId: recoverEmailId, 'otp.code': otp, 'otp.expires': { $gte: new Date() } })
  //   .then((user) => {
  //     if (user) {
  //       // check user is exist
  //       const { loginTypes } = constants.auth;
  //       const query = {
  //         signupType: loginType,
  //       };

  //       if (loginTypes.Mobile.is(loginType)) {
  //         query.phone = phone;
  //       } else if (loginTypes.Email.is(loginType)) {
  //         query.email = email;
  //       }
  //       query._id = { $ne: user._id };

  //       User.findOne(query)
  //         .then((existingUser) => {
  //           if (!existingUser) {
  //             const userToUpdate = user;

  //             userToUpdate.signupType = loginType;

  //             if (loginTypes.Mobile.is(loginType)) {
  //               userToUpdate.phone = phone;
  //             } else if (loginTypes.Email.is(loginType)) {
  //               if (user.recoverEmailId === email) {
  //                 return res.status(400).json({ error: req.t('ERR_RECOVEREMAIL_SAME') });
  //               }
  //               userToUpdate.email = email;
  //             }

  //             userToUpdate.password = passwordHash.generate(password);
  //             userToUpdate.otp = {};
  //             userToUpdate.save()
  //               .then(() => {
  //                 res.status(200).json({ msg: req.t('MSG_RECOVER_ACCOUNT_SUCCESS') });
  //               })
  //               .catch((err) => {
  //                 logger.error(err);
  //                 res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
  //               });
  //           } else {
  //             res.status(400).json({ error: req.t('ERR_USER_ALREADY_EXIST') });
  //           }
  //         });
  //     } else {
  //       res.status(400).json({ msg: req.t('ERR_GENRIC_OTP_EXPIRE') });
  //     }
  //   })
  //   .catch((err) => {
  //     logger.error(err);
  //     res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
  //   });
};

userCtr.profile = (req, res) => {
  const { user } = req;
  res.status(200).json(_.omit(user.toObject(), ['password', '__v']));
};

// Get User profile
userCtr.getProfile = (req, res) => {
  let userId = req.user._id;
  let isPasswordExists = false;
  User.findOne({ _id: req.user._id })
    .then((result) => {
      if (result) {
        if (result.password && !_.isEmpty(result.password)) {
          let response = {
            "otp": result.otp,
            "status": result.status,
            "completedLesson": result.completedLesson,
            "subscriptionLesson": result.subscriptionLesson,
            "currentPackage": result.currentPackage,
            "trialLessonLimit": result.trialLessonLimit,
            "isLevel": result.isLevel,
            "_id": result._id,
            "password": result.password,
            "signupType": result.signupType,
            "fullName": result.fullName,
            "email": result.email,
            "userLevelId": result.userLevelId,
            "isPasswordExists": true,
            "extraSubscriptionLesson": result.extraSubscriptionLesson,
            "total": Math.abs(result.extraSubscriptionLesson) + Math.abs(result.subscriptionLesson)
          }
          res.status(200).json({ data: response });
        } else {
          let response = {
            "otp": result.otp,
            "status": result.status,
            "completedLesson": result.completedLesson,
            "subscriptionLesson": result.subscriptionLesson,
            "currentPackage": result.currentPackage,
            "trialLessonLimit": result.trialLessonLimit,
            "isLevel": result.isLevel,
            "_id": result._id,
            "password": result.password,
            "signupType": result.signupType,
            "fullName": result.fullName,
            "email": result.email,
            "userLevelId": result.userLevelId,
            "isPasswordExists": false,
            "extraSubscriptionLesson": result.extraSubscriptionLesson,
            "total": Math.abs(result.extraSubscriptionLesson) + Math.abs(result.subscriptionLesson)
          }
          res.status(200).json({ data: response });
        }
      }
      User.updateUserIsLevel(userId)
        .then((resultData) => {
          if (resultData) {
          }
        }).catch((error) => {
          logger.error("Error! While update isLevel Field in userCtr", error);
        })
      return;
    })
    .catch(() => {
      return res.status(500).json({ "error": req.t('ERR_INTERNAL_SERVER_ERROR') });
    });
};

// Update User Profile
userCtr.updateProfile = (req, res) => {
  const {
    fullName, password, newPassword
  } = req.body;
  const updateData = {
    password: passwordHash.generate(newPassword),
    fullName: fullName,
  };
  if (req.body) {
    User.findOne({ _id: req.user._id })
      .then((result) => {
        if (_.isEmpty(fullName)) {
          return res.status(500).json({ error: req.t('ERR_VALID_NAME') });
        } else if (req.body.password && req.body.newPassword === '') {
          return res.status(500).json({ error: req.t('ERR_PASSWORD_IS_NOT_MATCHED') });
        } else if (req.body.password === '' && req.body.newPassword) {
          return res.status(500).json({ error: req.t('ERR_PASSWORD_IS_NOT_MATCHED') });
        } else if (!_.isEmpty(req.body.password) && !_.isEmpty(req.body.newPassword)) {
          if (passwordHash.verify(req.body.password, result.password)) {
            User.findByIdAndUpdate({ _id: req.user._id }, updateData)
              .then((updateResult) => {
                return res.status(200).json({ message: req.t('MSG_PROFILE_UPDATED') });
              })
              .catch((err) => {
                logger.error('Error! While Update user details', err);
              });
          } else {
            return res.status(500).json({ "error": req.t('ERR_CURRENT_PASSWORD_NOT_MATCHED') });
          }
        } else {
          User.findByIdAndUpdate({ _id: req.user._id }, { "fullName": updateData.fullName })
            .then((updateResult) => {
              return res.status(200).json({ "message": req.t('MSG_PROFILE_UPDATED') });
            })
            .catch((err) => {
              logger.error('Error! While Update user details', err);
            });
        }
      }).catch((err) => {
        logger.error('Error! While get user password', err);
        return res.status(400).json({ "error": req.t('NOT_FOUND') });
      });
  } else {
    logger.error('Error! While update user profile', err);
    return res.status(400).json({ "error": req.t('TRY_AGAIN') });
  }
};

// Update packages of user added by admin
userCtr.setPackage = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.user._id);
  let packageId = mongoose.Types.ObjectId(req.body.packageId);
  let lessons = req.body.lessons;
  let packageObj = {
    userId: userId,
    packageId: packageId
  }
  try {
    userUtils.saveUserPackage(req, userId, packageId, packageObj, lessons)
      .then(result => {
        logger.info("[Package Added successfully]");
        return res.status(200).json({ "message": result });
      }).catch(err => {
        logger.error(err);
        return res.status(400).json({ "error": req.t("TRY_AGAIN") });
      });
  } catch (error) {
    logger.error("[Error in update Commnets]", error);
    return res.status(400).json({ "error": req.t("TRY_AGAIN") });
  }
};

// Add Note/word by user
userCtr.setUserNotes = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.user._id);
  let word = req.body.word;
  let meaning = req.body.meaning;
  let noteData = {
    userId: userId,
    word: word,
    meaning: meaning
  }
  try {
    userUtils.saveNote(req, userId, noteData, word)
      .then(result => {
        return res.status(200).json(result);
      }).catch(err => {
        logger.error(err);
        return res.status(400).json({ "error": req.t("TRY_AGAIN") });
      });
  } catch (error) {
    logger.error("[Error in set user note]", error);
    return res.status(400).json({ "error": req.t("TRY_AGAIN") });
  }
};

// Delete User Note by Note Id
userCtr.deleteUserNotes = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.user._id);
  let noteId = mongoose.Types.ObjectId(req.body.noteId);
  try {
    userNoteModel.remove({ _id: noteId })
      .then(result => {
        return res.status(200).json({ "message": req.t("DELETE_SUCCESSFULLY") });
      }).catch(err => {
        logger.error(err);
        return res.status(400).json({ "error": req.t("TRY_AGAIN") });
      });
  } catch (error) {
    logger.error("[Error in delete user note]", error);
    return res.status(400).json({ "error": req.t("TRY_AGAIN") });
  }
};

// Get User Save Note
userCtr.getUserNotes = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.user._id);
  let page = parseInt(req.params.page);
  let skipRecord = 0;
  let limit = parseInt(process.env.MAX_RECORD);
  if (!utils.empty(page) && !isNaN(page)) {
    skipRecord = ((page - 1) * limit);
  }
  Promise.all([
    userNoteModel.getUserNoteList(userId, skipRecord, limit),
    userNoteModel.getUserNoteListCount(userId),
  ])
    .then(lists => {
      let response = {
        "data": lists[0],
        "total": Math.ceil(lists[1] / process.env.MAX_RECORD)
      }
      return res.status(200).json(response)
    }).catch(error => {
      logger.error('Error! While get user note in userCtr', error);
      return res.status(400).json({ "error": req.t("TRY_AGAIN") });
    })
};

// Get SuggestedCurriculum list for user
userCtr.getSuggestedCurriculum = (req, res) => {
  if (req.params.langCode === "ko") {
    suggestedCurriculumModel.aggregate([
      {
        $lookup: {
          from: "lessonTopics",
          localField: "lessonTopicId",
          foreignField: "_id",
          as: "topicDetails"
        }
      },
      {
        $unwind: {
          path: "$topicDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          icon: { $first: "$icon" },
          day: { $first: "$topicDetails.dayKR" },
          title: { $first: "$topicDetails.titleKR" },
          lessonTopicId: { $first: "$topicDetails._id" },
          createdAt: { $first: "$topicDetails.createdAt" },
        }
      },
      {
        $sort: { createdAt: 1 }
      }
    ])
      .then((list) => {
        return res.status(200).json({ "message": req.t("DATA_FOUND"), data: list });
      }).catch((error) => {
        logger.error('Error! While get user curriculam list for admin in userCtr', err);
        return res.status(400).json({ "error": req.t("TRY_AGAIN") });
      });
  } else {
    suggestedCurriculumModel.aggregate([
      {
        $lookup: {
          from: "lessonTopics",
          localField: "lessonTopicId",
          foreignField: "_id",
          as: "topicDetails"
        }
      },
      {
        $unwind: {
          path: "$topicDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          icon: { $first: "$icon" },
          day: { $first: "$topicDetails.day" },
          title: { $first: "$topicDetails.title" },
          lessonTopicId: { $first: "$topicDetails._id" },
          createdAt: { $first: "$topicDetails.createdAt" },
        }
      },
      {
        $sort: { createdAt: 1 }
      }
    ])
      .then((list) => {
        return res.status(200).json({ "message": req.t("DATA_FOUND"), data: list });
      }).catch((error) => {
        logger.error('Error! While get user curriculam list for admin in userCtr', err);
        return res.status(400).json({ "error": req.t("TRY_AGAIN") });
      });
  }

};

// Update user forget password
userCtr.verifyForgetEmail = (req, res) => {
  let newPassword = passwordHash.generate(req.params.code);
  res.sendFile(path.resolve('templates/verifyEmail.html'));
  User.update({ "email": req.params.email }, { $set: { "password": newPassword } })
    .then(result => {
      logger.info("Forget password update successfully of user in userCtr");
    }).catch(error => {
      logger.error("Error ! While update forget password", error);
    })
};

// Get lesson-topic for user
userCtr.getLessonTopics = (req, res) => {
  lessonTopicModel.find({}).sort({ createdAt: 1 })
    .then((list) => {
      return res.status(200).json({ "data": list });
    }).catch((error) => {
      logger.error('Error! While get lesson topic list for user in userCtr', error);
      return res.status(400).json({ error: req.t("TRY_AGAIN") });
    });
};

// Get Completed-Lesson List (user-wise)
userCtr.getCompletedLessonList = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.user._id);
  let page = parseInt(req.params.page);
  let skipRecord = 0;
  let limit = parseInt(process.env.MAX_RECORD);
  if (!utils.empty(page) && !isNaN(page)) {
    skipRecord = ((page - 1) * limit);
  }
  userCtr.getCompleteLessonsCount(userId, function (total) {
    completedLessonModel.aggregate([
      {
        $match: { "userId": userId },
      },
      {
        $lookup: {
          from: "lessonTopics",
          localField: "lessonTopicId",
          foreignField: "_id",
          as: "lessionTopics"
        }
      },
      {
        $unwind: {
          path: "$lessionTopics",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "sublessons",
          localField: "subLessonId",
          foreignField: "_id",
          as: "subLessonDetails"
        }
      },
      {
        $unwind: {
          path: "$subLessonDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          lessonId: { $first: "$lessonId" },
          subLessonId: { $first: "$subLessonId" },
          day: { $first: "$day" },
          lessonTopicId: { $first: "$lessonTopicId" },
          level: { $first: "$level" },
          createdAt: { $first: "$createdAt" },
          userLevelId: { $first: "$userLevelId" },
          lessonName: { $first: "$subLessonDetails.lessonName" },
          subLessonName: { $first: "$subLessonName" },
          topicName: { $first: "$lessionTopics.title" },
          topicNameKR: { $first: "$lessionTopics.titleKR" }
        }
      },
      { "$sort": { createdAt: -1 } },
      { "$limit": skipRecord + parseInt(process.env.MAX_RECORD) },
      { "$skip": skipRecord }
    ], (err, result) => {
      if (err) {
        logger.error("Error in get all completed lesson details of user", err);
        return res.status(400).json({ "message": req.t("TRY_AGAIN") });
      } else {
        if (result.length > 0 && !utils.empty(result)) {
          return res.status(200).json({
            "data": result,
            "total": Math.ceil(total / process.env.MAX_RECORD)
          });
        } else {
          return res.status(400).json({ error: req.t("NO_LESSON_FOUND") });
        }
      }
    });
  });
};

// Get Complete Lesson Count (user wise) 
userCtr.getCompleteLessonsCount = (userId, callback) => {
  completedLessonModel.aggregate([
    {
      $match: { "userId": userId },
    },
    {
      $lookup: {
        from: "lessonTopics",
        localField: "lessonTopicId",
        foreignField: "_id",
        as: "lessionTopics"
      }
    },
    {
      $unwind: {
        path: "$lessionTopics",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: "sublessons",
        localField: "subLessonId",
        foreignField: "_id",
        as: "subLessonDetails"
      }
    },
    {
      $unwind: {
        path: "$subLessonDetails",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: "$_id",
        lessonId: { $first: "$lessonId" },
        subLessonId: { $first: "$subLessonId" },
        day: { $first: "$day" },
        lessonTopicId: { $first: "$lessonTopicId" },
        level: { $first: "$level" },
        createdAt: { $first: "$createdAt" },
        userLevelId: { $first: "$userLevelId" },
        lessonName: { $first: "$subLessonDetails.lessonName" },
        topicName: { $first: "$lessionTopics.title" },
        topicNameKR: { $first: "$lessionTopics.titleKR" }
      }
    }
  ], (err, getDataCount) => {
    if (err) {
      logger.error("Error in get completed Lesson data count", err);
      callback(err);
    } else {
      if (getDataCount.length > 0 && !utils.empty(getDataCount)) {
        callback(getDataCount.length);
      } else {
        callback("");
      }
    }
  });
};

// Get Completed-Lesson List (user-wise)
userCtr.getCMSContentUser = (req, res) => {
  if (req.body.cms == 'faq') {
    cmsModel.findOne({}, { faq: 1, _id: 0 })
      .then((list) => {
        let response = {
          "content": list.faq
        }
        return res.status(200).json(response);
      }).catch((error) => {
        logger.error('Error! While get CMS content for user in userCtr', error);
        return res.status(400).json({ error: req.t("TRY_AGAIN") });
      });
  } else {
    cmsModel.findOne({}, { privacyPolicyAndTermsOfUse: 1, _id: 0 })
      .then((list) => {
        let response = {
          "content": list.privacyPolicyAndTermsOfUse
        }
        return res.status(200).json(response);
      }).catch((error) => {
        logger.error('Error! While get CMS content for user in userCtr', error);
        return res.status(400).json({ error: req.t("TRY_AGAIN") });
      });
  }
};

// Get Acronyms List For Admin
userCtr.getAcronymsList = (req, res) => {
  acronymsModel.find({})
    .then(lists => {
      return res.status(200).json({ data: lists })
    }).catch(error => {
      logger.error("Error! While Get Acronyms list in userCtr", error);
      return res.status(400).json({ err: req.t('TRY_AGAIN') })
    })
};

// User Progress API
userCtr.getUserProgress = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.user._id);
  let totalUserProgressCount;
  let loginUserCompletedCount;
  let userFullName;
  let loginUserCompletedLessonCount;
  let userStartOfSubScriptionMonth;
  let userSubscriptionEndDate;

  userUtils.getOtherUserProgressResult(userId)
    .then(otherUserProgressResult => {
      if (otherUserProgressResult) {
        totalUserProgressCount = otherUserProgressResult.total
      }
      userUtils.getLoginUserProgressResult(userId)
        .then(loginUserDetails => {
          if (loginUserDetails) {
            userFullName = loginUserDetails.userInfo.fullName,
              userStartOfSubScriptionMonth = loginUserDetails.userInfo.userSubscriptionStartDate,
              userSubscriptionEndDate = loginUserDetails.userInfo.userSubscriptionEndDate,
              levelId = loginUserDetails.userInfo.userLevelId,
              loginUserCompletedLessonCount = loginUserDetails.loginUserCompletedLessonCount
          }
          userUtils.getTotalUserCount(userId) // Don't include current user
            .then(totalUserCount => {
              changeLevelListModel.findOne({ _id: mongoose.Types.ObjectId(loginUserDetails.userInfo.userLevelId) }, function (err, response) {
                let finalResponse;
                if (userStartOfSubScriptionMonth != null || userStartOfSubScriptionMonth != undefined) {
                  finalResponse = {
                    "totalUserCompletedLessonCount": loginUserDetails.userInfo.completedLesson,
                    "average": totalUserProgressCount / totalUserCount,
                    "level": response.name,
                    "fullName": userFullName,
                    // "totalUsers": totalUserCount,
                    "userStartOfSubScriptionMonth": userStartOfSubScriptionMonth,
                    "userEndOfSubScriptionMonth": userSubscriptionEndDate,
                    "todayDate": new Date(),
                    // 'loginUserCompletedLessonCount': loginUserCompletedLessonCount
                  }
                } else {
                  finalResponse = {
                    "totalUserCompletedLessonCount": loginUserDetails.userInfo.completedLesson,
                    "average": totalUserProgressCount / totalUserCount,
                    "level": response.name,
                    "fullName": userFullName,
                    // "totalUsers": totalUserCount,
                    "userStartOfSubScriptionMonth": null,
                    "userEndOfSubScriptionMonth": null,
                    "todayDate": new Date(),
                    // 'loginUserCompletedLessonCount': loginUserCompletedLessonCount
                  }
                }
                return res.status(200).json(finalResponse)
              })
            })
            .catch(err => {
              logger.error("Error! While getTotalUserCount", err);
              return res.status(400).json({ error: req.t('TRY_AGAIN') })
            })
        })
        .catch(err => {
          logger.error("Error! While getLoginUserProgressResult", err);
          return res.status(400).json({ error: req.t('TRY_AGAIN') })
        })
    })
    .catch(err => {
      logger.error("Error! While getOtherUserProgressResult", err);
      return res.status(400).json({ error: req.t('TRY_AGAIN') })
    })
};

userCtr.getLessonTopicsListDashboard = (req, res) => {
  contactLessonTopicsModel.aggregate([
    {
      $group: {
        _id: "$_id",
        topicName: { $first: "$title" },
      }
    }
  ], (err, getDataCount) => {
    if (err) {
      logger.error('Error! While get lesson topic list for user contact topics', error);
      return res.status(400).json({ "message": req.t("TRY_AGAIN") });
    } else {
      return res.status(200).json({ "data": getDataCount });
    }
  });
};

userCtr.getDeleteUserDataByUserId = (req, res) => {
  console.log('req.params', req.params.userId);
};

// Resend Verification email to user
userCtr.resendEmail = (req, res) => {
  let email = req.body.email;
  if (email) {
    User.findOne({ email: email })
      .then((user) => {
        if (user && user.status === 'NotVerified') {
          aws.sendEmail(email, user.fullName, "emailAccountActivate", user.otp.code, "Account And Email Verification", (err, isEmailSent) => {
            if (isEmailSent) {
              return res.status(200).json({ message: req.t('VERIFICATION_EMAIL_SENT') });
            } else {
              logger.error('[Error in resend mail sending failure]', err);
              return res.status(400).json({ error: req.t('TRY_AGAIN') })
            }
          })
        } else {
          return res.status(400).json({ message: req.t('ERR_USER_ALREADY_EXIST') });
        }
      }).catch(err => {
        logger.error('[User not found error in resend mail sending failure]', err);
        return res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
      })
  } else {
    return res.status(400).json({ error: req.t("TRY_AGAIN") });
  }
}

module.exports = userCtr;