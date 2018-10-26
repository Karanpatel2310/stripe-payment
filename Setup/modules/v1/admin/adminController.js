const adminUtils = require('./adminUtils');
const logger = require('../../../helper/logger');
const packageModel = require('./packageModel');
const passwordHash = require('password-hash');
const adminModel = require('./adminModel');
const utils = require('../../../helper/utils');
const aws = require('../../../helper/aws');
const jwt = require('../../../helper/jwt');
const _ = require('lodash');
const acronymsModel = require('./acronymsModel');
const mongoose = require('mongoose');
const userModel = require('../user/userModel');
const adminRoleModel = require('./adminRoleModel');
const lessonTopicModel = require('../lesson/lessonTopics');
const cmsModel = require('../cms/cmsModel');
const userSubscriptionHistoryModel = require('../userSubscription/userSubscriptionHistoryModel');
let path = require('path');
const adminCtr = {};

// Admin login send email
adminCtr.login = (req, res) => {
  try {
    let email = req.body.email;
    let password = req.body.password;
    adminModel.findOne({ "email": email })
      .then(result => {
        if (utils.empty(result)) {
          return res.status(401).json({ err: req.t("ADMIN_UNAUTH"), code: 401 });
        } else if (!utils.empty(result) && result.isVerified == false) {
          return res.status(401).json({ err: req.t("ADMIN_ACCOUNT_NOT_VERIFIED_YET"), code: 401 });
        } else {
          if (result && passwordHash.verify(req.body.password, result.password)) {
            let secretToken = jwt.createSecretToken({ uid: result._id });
            let response = {
              token: secretToken,
              role: result.role
            };
            return res.status(200).json({ "message": req.t("LOGIN_SUCCESS"), "data": response });
          } else {
            logger.warn('[no credentials]');
            return res.status(400).json({ err: req.t("INVALID_CREDENTIAL") });
          }
        }
      }).catch(err => {
        logger.error("Error In Login(super) from db", err);
        return res.status(400).json({ err: req.t("TRY_AGAIN") });
      })
  } catch (error) {
    logger.error(`[Error in Login(super)]`, error);
    return res.status(400).json({ err: req.t("TRY_AGAIN") });
  }
};

// Get packages added by admin
adminCtr.getPackages = (req, res) => {
  packageModel.find({})
    .then((packages) => {
      return res.status(200).json({ "message": req.t("DATA_FOUND"), "data": packages });
    }).catch((error) => {
      logger.error('Error! While get packages by admin in adminCtr', err);
      return res.status(400).json({ "error": req.t("TRY_AGAIN") });
    });
};

// Get getAcronyms list for USER
adminCtr.getAcronymsList = (req, res) => {
  acronymsModel.find({})
    .then((list) => {
      return res.status(200).json({ "message": req.t("DATA_FOUND"), "data": list });
    }).catch((error) => {
      logger.error('Error! While get Acronyms by admin in adminCtr', err);
      return res.status(400).json({ "error": req.t("TRY_AGAIN") });
    });
};

// Admin forget password
adminCtr.forgetPassword = (req, res) => {
  const {
    email
  } = req.body;
  let password = utils.makeRandomStringOfLength(12);
  let newPassword = passwordHash.generate(password);
  adminModel.findOne({ email: email })
    .then((admin) => {
      if (!admin) {
        return res.status(400).json({ err: req.t("EMAIL_NOT_FOUND") });
      } else {
        aws.sendEmail(admin.email, "admin", "adminForgetPassword", password, "Forget password verification", function (err, isEmailSent) {
          if (isEmailSent) {
            res.status(200).json({ "message": req.t("MSG_PASSWORD_SENT") });
            adminModel.findOneAndUpdate({ email: email }, { password: newPassword })
              .then(update => {
                logger.info("Admin forget password Update successfully");
              }).catch(error => {
                logger.error("Error ! Update admin forget password after sent email");
                res.status(400).json({ "error": req.t("TRY_AGAIN") });
              })
          } else {
            logger.error('[Erro in login(super) mail sending failure]', err);
            return res.status(400).json({ "error": req.t("TRY_AGAIN") });
          }
        });
      }
    }).catch((err) => {
      logger.error("Error! While find admin email in adminCtr", err);
      return res.status(400).json({ "error": req.t("TRY_AGAIN") });
    });
};

// Get admin data
adminCtr.getAdminDetails = (req, res) => {
  adminModel.findOne({ _id: req.id }, { email: 1 })
    .then((result) => {
      return res.status(200).json({ data: result });
    })
    .catch((err) => {
      logger.error('Error! While get admin details', err);
      return res.status(200).json({ err: req.t('TRY_AGAIN') });
    })
};

// Admin Change password
adminCtr.changePassword = (req, res) => {
  const {
    email, password, newPassword, confirmPassword
  } = req.body;
  if (req.body) {
    adminModel.findOne({ _id: req.id })
      .then((result) => {
        if (req.body.password === '') {
          return res.status(500).json({ err: req.t('ERR_PASSWORD') });
        } else if (req.body.newPassword === '') {
          return res.status(500).json({ err: req.t('ERR_NEW_PASSWORD') });
        } else if (req.body.confirmPassword === '') {
          return res.status(500).json({ err: req.t('ERR_CONFIRM_PASSWORD') });
        } else if (!_.isEmpty(req.body.password) && !_.isEmpty(req.body.newPassword) && !_.isEmpty(req.body.confirmPassword)) {
          if (passwordHash.verify(req.body.password, result.password)) {
            const updateData = {
              password: passwordHash.generate(confirmPassword)
            };
            adminModel.findByIdAndUpdate({ _id: req.id }, updateData)
              .then((updateResult) => {
                return res.status(200).json({ "message": req.t('MSG_CHANGED_PASSWORD') });
              })
              .catch((err) => {
                logger.error('Error! While Update user details', err);
                return res.status(400).json({ err: req.t('TRY_AGAIN') });
              });
          } else {
            return res.status(400).json({ err: req.t('ERR_INVALID_CURRENT_PASSWORD') });
          }
        }
      }).catch((err) => {
        logger.error('Error! While get admin password', err);
        return res.status(200).json({ err: req.t('NOT_FOUND') });
      });
  } else {
    logger.error('Error! While update admin profile', err);
    return res.status(200).json({ err: req.t('TRY_AGAIN') });
  }
};

// Get lesson-topic for admim
adminCtr.getLessonTopics = (req, res) => {
  lessonTopicModel.find({}).sort({ createdAt: 1 })
    .then((list) => {
      return res.status(200).json({ "data": list });
    }).catch((error) => {
      logger.error('Error! While get lesson topic list for admin in adminCtr', err);
      return res.status(400).json({ "message": req.t("TRY_AGAIN") });
    });
};

// Update lesson-topic by admim
adminCtr.updateLessonTopics = (req, res) => {
  lessonTopicModel.findByIdAndUpdate({ _id: req.body.topicId }, req.body)
    .then((list) => {
      return res.status(200).json({ "message": req.t("ADMIN_UPDATE_SUCCESSFULLY"), "data": list });
    }).catch((error) => {
      logger.error('Error! While update lesson topic by admin in adminCtr', err);
      return res.status(400).json({ "message": req.t("TRY_AGAIN") });
    });
};

// Get user list for admin
adminCtr.getUserList = (req, res) => {
  let page = parseInt(req.params.page);
  let skipRecord = 0;
  let limit = parseInt(process.env.MAX_RECORD);
  if (!utils.empty(page) && !isNaN(page)) {
    skipRecord = ((page - 1) * limit);
  }
  Promise.all([
    userModel.getUserListForAdmin(skipRecord, limit),
    userModel.userListPageCountForAdmin()
  ])
    .then(result => {
      let response = {
        "data": result[0],
        "total": result[1]
      }
      return res.status(200).json(response);
    })
    .catch(err => {
      logger.info("Error! While Get User list for admin in adminCtr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') })
    })
};

// Get user list by userId for admin
adminCtr.getUserDetailsById = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.params.userId);
  userModel.aggregate([
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
    }
  ])
    .then(details => {
      return res.status(200).json({ data: details })
    }).catch(err => {
      logger.info("Error! While Get User list by userId for admin in adminCtr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') });
    })
};

// Block | unblock user by admin
adminCtr.blockUnblockUser = (req, res) => {
  let userId = req.params.userId;
  userModel.findByIdAndUpdate({ _id: userId }, req.body)
    .then(details => {
      return res.status(200).json({ message: req.t('ADMIN_UPDATE_SUCCESSFULLY') })
    }).catch(err => {
      logger.info("Error! While Block OR Unblock User By admin in adminCtr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') });
    })
};

// Get User Completed Lesson details
adminCtr.getTotalLessonAndCompletedLessonCount = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.params.userId);
  let page = parseInt(req.params.page);
  adminUtils.getUserCompletedLessonDetails(page, userId)
    .then(result => {
      return res.status(200).json(result);
    })
    .catch(err => {
      logger.error("Error! While Get lesson details day wise from lesson Utils in admin Ctr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') });
    })
};

// Set add  admin by super admin
adminCtr.addNewAdmin = (req, res) => {
  let email = req.body.email;
  let name = req.body.name;
  let role = req.body.role;
  let isVerified = req.body.isVerified;
  let password = utils.makeRandomStringOfLength(12);
  let newPassword = passwordHash.generate(password);
  let adminData = {
    email: email,
    name: name,
    password: newPassword,
    role: role,
    isVerified: isVerified
  };
  try {
    adminModel.findOne({ email: email })
      .then((admin) => {
        if (admin) {
          return res.status(400).json({ err: req.t("ADMIN_EMAIL_ALREADY_REGISTERED") });
        } else {
          aws.sendEmail(email, name, "newAdminEmailVerification", password, "New App Admin Email & Password Verification", function (err, isEmailSent) {
            if (isEmailSent) {
              let newAdmindata = new adminModel(adminData);
              adminModel.setNewAdmin(newAdmindata)
                .then(data => {
                  return res.status(200).json({ "message": req.t("ADMIN_VERIFICATION_EMAIL_SENT") });
                })
                .catch(err => {
                  logger.error(err);
                  return res.status(400).json({ err: req.t("TRY_AGAIN") });
                })
            } else {
              logger.error('[Erro in send email to new admin mail sending failure]', err);
              return res.status(400).json({ err: req.t("TRY_AGAIN") });
            }
          });
        }
      }).catch((err) => {
        logger.error("Error! While find admin email in adminCtr", err);
        return res.status(400).json({ "error": req.t("TRY_AGAIN") });
      });
  }
  catch (error) {
    logger.error("Error! While add or edit admin by super in adminCtr", error);
    return res.status(400).json({ err: req.t("TRY_AGAIN") });
  }
};

// Verify New Admin Email
adminCtr.verifyNewAdminEmail = (req, res) => {
  const {
    email,
  } = req.params;

  let verifyData = {
    isVerified: true
  };

  adminModel.findOne({ email: req.params.email })
    .then((admin) => {
      if (admin.isVerified == null || admin.isVerified == undefined) {
        res.status(400).json({ error: req.t('ERR_UNAUTH') });
      } else if (admin.isVerified == true) {
        res.sendFile(path.resolve('templates/alreadyVerifyEmail.html'));
      } else {
        res.sendFile(path.resolve('templates/verifyEmail.html'));
        adminModel.findOneAndUpdate({ email: email }, verifyData)
          .then(data => {
          })
          .catch(err => {
            logger.error(err);
            return res.status(400).json({ err: req.t("TRY_AGAIN") });
          })
      }
    })
    .catch((err) => {
      logger.error(err);
      res.status(500).json({ error: req.t('ERR_INTERNAL_SERVER') });
    });
};

// Set edit admin by super admin
adminCtr.editNewAdmin = (req, res) => {
  let adminId = mongoose.Types.ObjectId(req.body.adminId);
  let email = req.body.email;
  let name = req.body.name;
  let adminData = {
    email: email,
    name: name
  };
  try {
    aws.sendEmail(email, name, "editNewAdminEmailVerification", "password", "Changed Email By Super Admin", function (err, isEmailSent) {
      if (isEmailSent) {
        adminModel.findByIdAndUpdate({ _id: adminId }, adminData)
          .then(data => {
            return res.status(200).json({ "message": req.t("ADMIN_UPDATE_SUCCESSFULLY") });
          })
          .catch(err => {
            logger.error(err);
            return res.status(400).json({ err: req.t("TRY_AGAIN") });
          })
      } else {
        logger.error('[Erro in send email to new admin mail sending failure]', err);
        return res.status(400).json({ err: req.t("TRY_AGAIN") });
      }
    });
  }
  catch (error) {
    logger.error("Error! While add or edit admin by super in adminCtr", error);
    return res.status(400).json({ err: req.t("TRY_AGAIN") });
  }
};

// Get Admin Role list
adminCtr.getAdminRoleList = (req, res) => {
  adminRoleModel.find({})
    .then(list => {
      return res.status(200).json({ data: list })
    })
    .catch(err => {
      logger.error("Error! While Get role list in adminCtr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') })
    })
};

// Get Admin List
adminCtr.getAdminList = (req, res) => {
  let page = parseInt(req.params.page);
  let skipRecord = 0;
  let limit = parseInt(process.env.MAX_RECORD);
  if (!utils.empty(page) && !isNaN(page)) {
    skipRecord = ((page - 1) * limit);
  }
  Promise.all([
    adminModel.getAdminList(skipRecord, limit),
    adminModel.getAdminListCount(),
  ])
    .then(lists => {
      let response = {
        "data": lists[0],
        "total": lists[1]
      }
      return res.status(200).json(response)
    }).catch(error => {
      logger.error("Error! While Get admin list in adminCtr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') })
    })
};

// Delete Admin By Super Admin 
adminCtr.deleteNewAdmin = (req, res) => {
  adminModel.remove({ _id: mongoose.Types.ObjectId(req.body.adminId) })
    .then(list => {
      return res.status(200).json({ message: req.t('ADMIN_DELETE_SUCCESSFULLY') })
    })
    .catch(err => {
      logger.error("Error! While Delete admin by super admin in adminCtr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') })
    })
};

// Get Acronyms List For Admin
adminCtr.getAcronymsList = (req, res) => {
  let page = parseInt(req.params.page);
  let skipRecord = 0;
  let limit = parseInt(process.env.MAX_RECORD);
  if (!utils.empty(page) && !isNaN(page)) {
    skipRecord = ((page - 1) * limit);
  }
  Promise.all([
    acronymsModel.getAcronymsList(skipRecord, limit),
    acronymsModel.getAcronymsListCount(),
  ])
    .then(lists => {
      let response = {
        "data": lists[0],
        "total": lists[1]
      }
      return res.status(200).json(response)
    }).catch(error => {
      logger.error("Error! While Get Acronyms list in adminCtr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') })
    })
};

// Set Acronyms Data By admin
adminCtr.addEditAcronymsData = (req, res) => {
  try {
    if (req.body.id) { // Edit
      acronymsModel.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.id) }, req.body).then(data => {
        if (!utils.empty(data)) {
          return res.status(200).json({ "message": req.t("ADMIN_UPDATE_SUCCESSFULLY") });
        }
        else {
          return res.status(400).json({ err: req.t("TRY_AGAIN") });
        }
      }).catch(err => {
        logger.error(err);
        return res.status(400).json({ err: req.t("TRY_AGAIN") });
      })
    } else { // Add
      let addData = new acronymsModel(req.body);
      acronymsModel.setNewAcronyms(addData).then(data => {
        if (!utils.empty(data)) {
          return res.status(200).json({ "message": req.t("ADMIN_ADD_SUCCESSFULLY") });
        }
        else {
          return res.status(400).json({ err: req.t("TRY_AGAIN") });
        }
      }).catch(err => {
        logger.error(err);
        return res.status(400).json({ err: req.t("TRY_AGAIN") });
      })
    }
  } catch (error) {
    logger.error(error);
    return res.status(400).json({ err: req.t("TRY_AGAIN") });
  }
};

// Delete Acronyms By Admin 
adminCtr.deleteAcronymsWord = (req, res) => {
  acronymsModel.remove({ _id: mongoose.Types.ObjectId(req.body.id) })
    .then(list => {
      return res.status(200).json({ message: req.t('ADMIN_DELETE_SUCCESSFULLY') })
    })
    .catch(err => {
      logger.error("Error! While Delete Acronyms in adminCtr", err);
      return res.status(400).json({ err: req.t('TRY_AGAIN') })
    })
};

// Get lesson-topic-list for admim dashboard
adminCtr.getLessonTopicsListDashboard = (req, res) => {
  lessonTopicModel.find({}).sort({ createdAt: 1 })
    .then((list) => {
      list.unshift({
        "_id": 1,
        "title": "All",
      })
      return res.status(200).json({ "data": list });
    }).catch((error) => {
      logger.error('Error! While get lesson topic list for admin dashboard in adminCtr', error);
      return res.status(400).json({ "message": req.t("TRY_AGAIN") });
    });
};

// Get user subscription details
adminCtr.userSubscriptionHistory = (req, res) => {
  let userId = mongoose.Types.ObjectId(req.params.userId);
  let flag = req.query.type;
  let page = parseInt(req.params.page);
  let skipRecord = 0;
  let limit = parseInt(process.env.MAX_RECORD);
  if (!utils.empty(page) && !isNaN(page)) {
    skipRecord = ((page - 1) * limit);
  }
  userSubscriptionHistoryModel.totalCount(userId, flag).then(totalCount => {
    userSubscriptionHistoryModel.findHistoryData(userId, flag, skipRecord, limit).then(historyData => {
      let response = {
        "data": historyData,
        "total": totalCount
      }
      return res.status(200).json(response);
    }).catch(error => {
      logger.error("Error ! user subscription history", error);
      return res.status(400).json({ error: req.t('TRY_AGAIN') })
    })
  })
};

adminCtr.getPrivacyPolicyAndFAQForAll = (req, res) => {
  cmsModel.find({})
    .then(contentDetails => {
      return res.status(200).json({ "data": contentDetails });
    })
    .catch(error => {
      logger.error("Get CMS content for all in adminCtr", error);
      return res.status(500).json({ err: req.t("TRY_AGAIN") })
    })
};

module.exports = adminCtr;
