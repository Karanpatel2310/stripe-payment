const jwt = require('jwt-simple');
const jwToken = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('./logger');
const adminModel = require('../modules/v1/admin/adminModel');
const jwtUtil = {};

jwtUtil.getAuthToken = (data) => {
  return jwt.encode(data, process.env.JwtSecret);
};

jwtUtil.decodeAuthToken = (token) => {
  if (token) {
    try {
      return jwt.decode(token, process.env.JwtSecret);
    } catch (err) {
      logger.error('Error! When decode token', err);
      return false;
    }
  }
  return false;
};

// 
jwtUtil.createSecretToken = (data) => {
  let token = jwToken.sign(data, config.SECRET);
  return token;
};

jwtUtil.decodeToken = (token) => {
  var data = {};
  if (token) {
    try {
      var decoded = jwToken.verify(token, config.SECRET);
      data = decoded;
    } catch (err) {
      data
    }
  }
  return data;
};

jwtUtil.createToken = (data, options) => {
  let token = jwToken.sign(data, config.SECRET, options);
  return token;
};

jwtUtil.verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    if (token) {
      try {
        jwToken.verify(token, config.SECRET, (err, decoded) => {
          if (err) {
            reject(err);
          }
          else {
            adminModel.findOne({ _id: decoded.uid })
              .then(isExists => {
                if (!isExists) {
                  reject({ err :'You are unauthorized'});
                } else {
                  resolve(decoded.uid);
                }
              })
              .catch(error => {
                logger.error("Error While find admin Id in admin middleware", error);
                reject(error);
              })
          }
        });
      } catch (error) {
        reject(error);
      }
    } else {
      reject({ err: "No Token Provided" });
    }
  })
};

module.exports = jwtUtil;
