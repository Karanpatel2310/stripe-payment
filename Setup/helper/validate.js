const _ = require('lodash');
const isEmail = require('isemail');
const isFloat = require('is-float');
const utils = require('../helper/utils');
const isAlphanumeric = require('is-alphanumeric');
const passwordRules = require('password-rules');
const isValidUSZip = require('is-valid-zip');
const PhoneNumber = require('awesome-phonenumber');
const l10n = require('jm-ez-l10n');
const isBase64 = require('is-base64');
const isValidDate = require('is-valid-date');
const cardValidator = require('card-validator');

const passwordPolicy = {
  minimumLength: 6,
  maximumLength: 30,
  requireCapital: true,
  requireLower: true,
  requireNumber: false,
  requireSpecial: false,
};

const validator = {};
validator.isValidDate = (str) => {
  return isValidDate(str);
};

validator.isValidCC = (str) => {
  const card = cardValidator.number(str);
  return card.isValid;
};

validator.isValidCVV = (str) => {
  const cardNum = cardValidator.number(str);
  let maxLength = 3;
  if (cardNum.card && cardNum.card.type === 'american-express') {
    maxLength = 4;
  }
  const card = cardValidator.cvv(str, maxLength);
  return card.isValid;
};

validator.isValidCCExpDate = (str) => {
  const card = cardValidator.expirationDate(str);
  return card.isValid;
};

validator.isValidBase64 = (str) => {
  return isBase64(str);
};
validator.isValidMime = (str, options) => {
  if (str) {
    return validator.isValidEnum(str.type, options);
  }
  return false;
};

validator.isValidMongoId = (str) => {
  return str.match(/^[0-9a-fA-F]{24}$/);
};

validator.isValid = (str) => {
  if (typeof str !== 'string' || _.isEmpty(str)) {
    return false;
  }
  return true;
};

validator.notEmpty = (str) => {
  return _.isNumber(str) || !_.isEmpty(str);
};

validator.isArray = (str) => {
  return _.isArray(str);
};

validator.isCommaArray = (str) => {
  return _.isArray(str.split(','));
};

validator.isAlphanumeric = (str) => {
  return isAlphanumeric(str);
};

validator.isInt = (str) => {
  return _.isNumber(str);
};

validator.isFloat = (str) => {
  return isFloat(str);
};

validator.isEmail = (str) => {
  if (str) {
    return isEmail.validate(str);
  }
  return false;
};

validator.isValidPhoneNumber = (str) => {
  const pn = new PhoneNumber(str);
  return pn.isValid() && pn.isMobile();
};

validator.isValidRex = (str, options) => {
  const { rex } = options;
  if (this.isValid(str)) {
    if (!_.isEmpty(rex)) {
      return rex.test(str);
    }
    return false;
  }
  return false;
};

validator.isValidEnum = (str, options) => {
  const { aEnum } = options;
  if (!_.isEmpty(str)) {
    if (!_.isEmpty(aEnum) && aEnum.isDefined(str)) {
      return true;
    }
    return false;
  }
  return false;
};

validator.validPassword = (str) => {
  const hasError = passwordRules(str, passwordPolicy);

  if (hasError) {
    return false;
  }
  return true;
};

// Only US Zipcode
validator.isValidUSZip = (str) => {
  return isValidUSZip(str);
};

validator.checkLength = (str, options) => {
  const { min, max } = options;
  if (_.isFinite(min) && min > 0) {
    if (str.length < min) {
      return false;
    }
  }

  if (_.isFinite(max) && max > 0) {
    if (str.length > max) {
      return false;
    }
  }
  return true;
};

const strToObj = (str, obj) => {
  return str.split('.').reduce((o, i) => {
    if (!o) {
      return undefined;
    }
    return o[i];
  }, obj);
};

const validate = (req, validationRules, parentKey) => {
  const { body, files } = req;
  const orgBody = req.orgBody || body;
  let input = {};
  let error = {};

  if (!_.isEmpty(validationRules)) {
    // Can use `forEach`, but used `every` as hack to break the loop
    Object.keys(validationRules).every((key) => {
      let validations = validationRules[key];
      if (validations.isFile) {
        input = files;
      } else {
        input = body;
      }
      if (validations.isOptional && input[key] === undefined) {
        return error;
      }
      if (!_.isEmpty(validations.byPassWhen) || typeof validations.byPassWhen === 'function') {
        if (typeof validations.byPassWhen === 'function') {
          if (validations.byPassWhen(orgBody)) {
            return error;
          }
        } else if (!_.isEmpty(strToObj(validations.byPassWhen, input))) {
          return error;
        }
      }

      if (validations.hasChilds && validations.hasChilds === true) {
        if (_.isEmpty(input[key])) {
          const generatedError = validator.getGeneratedError((parentKey ? `${parentKey}.` : '') + key, 'notEmpty');
          error = {
            statusCode: 400,
            field: key,
            type: 'notEmpty',
            error: generatedError,
            generatedError: generatedError,
          };
        } else {
          error = validate({ body: input[key], orgBody: body }, validations.childs, key);
        }

        // return false; // To break the `every` loop
      }

      if (!_.isArray(validations)) {
        if (_.isEmpty(validations.rules)) {
          validations = [validations];
        } else {
          validations = validations.rules;
        }
      }

      // Can use `forEach`, but used `every` as hack to break the loop
      validations.every((validation) => {
        if (!_.isEmpty(validation)) {
          const {
            type, msg, options, statusCode,
          } = validation;
          if (!validator[type](input[key], options)) {
            const generatedError = validator.getGeneratedError((parentKey ? `${parentKey}.` : '') + key, type, options, input[key]);
            error = {
              statusCode: statusCode || 400,
              field: key,
              type: type,
              error: msg ? l10n.t(msg) : null || generatedError,
              generatedError: generatedError,
            };
            return false;
          }
        }
        return true;
      });

      if (!_.isEmpty(error)) {
        return false;
      }
      return true;
    });
  }
  return error;
};

validator.getGeneratedError = (field, type, options, str) => {
  switch (type) {
  case 'notEmpty':
    return `${field} is required`;
  case 'isValidPhoneNumber':
    return `${field} is not valid`;
  case 'isValidMime':
    return `${field} - Unsopported file format`;
  case 'validPassword': {
    const hasError = passwordRules(str, passwordPolicy);
    return hasError.sentence;
  }
  case 'isAlphanumeric': {
    return `${field} - Invalid input, only supported Alphanumeric chars.`;
  }
  case 'checkLength':
    if (_.isFinite(options.max) === _.isFinite(options.min)) {
      return `${field} should be exactly of ${options.min} char`;
    } else if (_.isFinite(options.max) && _.isFinite(options.min)) {
      return `${field} should be at-least of ${options.min} and maximum of ${options.max} char`;
    } else if (_.isFinite(options.max)) {
      return `${field} should maximum of ${options.max} char`;
    } else if (_.isFinite(options.min)) {
      return `${field} should at-least of ${options.min} char`;
    }
    return `${field} - error - ${type}`;
  default:
    return `${field} - error - ${type}`;
  }
};

// Is used for admin login
let validates = (input, props, type) => {
  let error = "";
  for (var k in props) {
      if (props.hasOwnProperty(k)) {
          let inputName = k;
          let validationData = props[k];
          if (!utils.empty(validationData)) {
              let validationFunction = validationData[0] || notEmpty;
              let errorMessage = validationData[1] || "Please enter input.";
              let options = validationData[2];
              if (!validator[validationFunction](input[inputName], options)) {
                  error = errorMessage;
                  break;
              }
          }
      }
  }
  return error;
}

module.exports = {
  validate: validate,
  validates: validates
};
