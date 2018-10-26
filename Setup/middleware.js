const _ = require('lodash');
const _v = require('./helper/validate.js');

const middleware = {};

middleware.reqValidator = (req, res, next) => {
  const { validations } = req;
  const error = _v.validate(req, validations);
  if (!_.isEmpty(error)) {
    res.status(error.statusCode).json(error);
  } else {
    next();
  }
};

module.exports = middleware;
