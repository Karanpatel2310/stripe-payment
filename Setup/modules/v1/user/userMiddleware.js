const _ = require('lodash');
const constants = require('../../../config/constants');
const jwt = require('../../../helper/jwt.js');
const logger = require('../../../helper/logger.js');
const User = require('./userModel.js');
const mongoose = require('mongoose');
const sublessonModel = require('../lesson/sublessonModel');
const middleware = {};

middleware.loadUser = (req, res, next) => {
  const { headers, byPassRoutes } = req;
  if (!_.isEmpty(byPassRoutes)) {
    if (_.includes(byPassRoutes, req.path)) {
      next();
      return;
    }
  }
  console.log('headers.accesstoken', headers.accesstoken);
  if (_.isEmpty(headers.accesstoken)) {
    res.status(401).json({ error: req.t('ERR_UNAUTH') });
  } else {
    const decoded = jwt.decodeAuthToken(headers.accesstoken);
    if (decoded) {
      User.findOne({ _id: decoded.id })
        .then((user) => {
          if (user) {
            if (!constants.user.statuses.Active.is(user.status)) {
              res.status(401).json({ error: req.t('ERR_USER_BLOCKED') });
            } else if (user.status === 'NotVerified') {
              res.status(406).json({ error: req.t('ERR_USER_NOT_VERIFIED_EMAIL') });
            } else if (user.isBlock == true) {
              res.status(401).json({ error: req.t('PLZ_CONTACT_TO_ADMIN') });
            }
            else {
              req.user = user;
              next();
            }
          } else {
            res.status(401).json({ error: req.t('ERR_TOKEN_EXP') });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(401).json({ error: req.t('ERR_TOKEN_EXP') });
        });
      req.user = decoded;
    } else {
      res.status(401).json({ error: req.t('TOKEN_EXP') });
    }
  }
};

middleware.isUserBlocked = (req, res, next) => {
  try {
    let userId = mongoose.Types.ObjectId(req.user._id);
    User.findOne({ _id: userId })
      .then(existedUser => {
        if (existedUser && existedUser.isBlock === true) {
          return res.status(502).json({ error: req.t('PLZ_CONTACT_TO_ADMIN') });
        } else {
          next();
        }
      })
      .catch(error => {
        logger.error(`[Error in checking user is block or not in user middleware]:${error}`);
        return res.status(400).json({ error: req.t('TRY_AGAIN') });
      })
  }
  catch (error) {
    logger.error("IN CATCH USER MIDDLEWARE", error);
    return res.status(400).json({ error: req.t('TRY_AGAIN') });
  }
};

middleware.isSubLessonIdExists = (req, res, next) => {
  try {
    if (req.body.subLessonId && _.isEmpty(req.body.day)) {
      let subLessonId = mongoose.Types.ObjectId(req.body.subLessonId);
      sublessonModel.findOne({ _id: subLessonId })
        .then(result => {
          if (!result) {
            return res.status(511).json({ error: req.t('ERR_LESSON_DELETED_BY_ADMIN') });
          } else {
            next();
          }
        })
        .catch(error => {
          logger.error(`[Error in checking sublesson id exists or not in sublesson model]:${error}`);
          return res.status(400).json({ error: req.t('TRY_AGAIN') });
        })
    } else {
      next();
    }
  }
  catch (error) {
    logger.error("IN CATCH USER MIDDLEWARE", error);
    return res.status(400).json({ error: req.t('TRY_AGAIN') });
  }
};

module.exports = middleware;
