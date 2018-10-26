const adminValidator = require('./adminValidator.js');
const _v = require('../../../helper/validate.js');
const errorUtil = require('../../../helper/error');
const utils = require('../../../helper/utils.js');
const jwt = require('../../../helper/jwt');
const logger = require('../../../helper/logger');
const errorHandler = require('../../../helper/error');
const acronymsModel = require('./acronymsModel');
const adminModel = require('./adminModel');

let adminMiddleware = {};

adminMiddleware.validateInput = (type, validateType) => {
    return function (req, res, next) {
        var adminValidators = {};
        var validators = adminValidator.getadminValidator(req, type);
        adminValidators = validators;
        var error = _v.validates(req.body, adminValidators);
        if (!utils.empty(error)) {
            return errorUtil.validationError(res, { err: req.t("EMAIL_REQUIRE") });
        }
        next();
    };
}

adminMiddleware.validateAdmin = (req, res, next) => {
    try {
        let token = (req.headers && req.headers['accesstoken']);
        jwt.verifyToken(token).then(id => {
            req.id = id;
            next();
        }).catch(codeError => {
            if (codeError.name === 'TokenExpiredError') {
                logger.error('[Token or code expire in verification(super)]', codeError);
                return res.status(400).json({ err: req.t("ADMIN_UNAUTH"), status: 502 });
            }
            else {
                logger.error('[Token or code error in verification(super)]', codeError);
                return res.status(400).json({ err: req.t("ADMIN_UNAUTH"), status: 502 });
            }
        })
    } catch (error) {
        logger.error(`[Error in verification(super) middleware]${error}`);
        return errorHandler.validationError(res, { err: req.t("TRY_AGAIN") });
    }
};

adminMiddleware.isSameAcronymsWord = (req, res, next) => {
    try {
        acronymsModel.findOne({ word: new RegExp(req.body.word + '\\w*', "igm") })
            .then(findResult => {
                if (findResult) {
                    if (findResult._id == req.body.id) {
                        next();
                    } else {
                        return res.status(401).json({ err: req.t('ADMIN_ALREADY_EXISTS'), status: 401 })
                    }
                } else {
                    next();
                }
            })
            .catch(error => {
                logger.error("Error ! While Get same word in admin middleware", error);
                return res.status(400).json({ err: req.t("TRY_AGAIN"), status: 400 });
            })
    } catch (error) {
        logger.error(`[Error ! While Get same word in admin middleware`, error);
        return res.status(400).json({ err: req.t('TRY_AGAIN'), status: 400 })
    }
};

adminMiddleware.isEmailAlreadyExist = (req, res, next) => {
    try {
        adminModel.findOne({ email: req.body.email })
            .then(findResult => {
                if (findResult) {
                    if (findResult._id == req.body.adminId) {
                        next();
                    } else {
                        return res.status(401).json({ err: req.t('ADMIN_EMAIL_ALREADY_REGISTERED') })
                    }
                } else {
                    next();
                }
            })
            .catch(error => {
                logger.error("Error ! While Get same email in admin middleware", error);
                return res.status(400).json({ err: req.t("TRY_AGAIN"), status: 400 });
            })
    } catch (error) {
        logger.error(`[Error ! While Get same email in admin middleware`, error);
        return res.status(400).json({ err: req.t('TRY_AGAIN'), status: 400 })
    }
};

module.exports = adminMiddleware;
