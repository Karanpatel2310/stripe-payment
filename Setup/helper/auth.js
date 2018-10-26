const auth = {};
const request = require('request');
const Q = require('q');
const l10n = require('jm-ez-l10n');
const rn = require('random-number');
const uuid = require('node-uuid');
const _ = require('lodash');
const constants = require('../config/constants');

auth.generateOtp = () => {
  const options = {
    min: 10000,
    max: 99999,
    integer: true,
  };
  return rn(options);
};

auth.generateOtpEmail = () => {
  return uuid.v1();
};

auth.socialCheck = (providerInfo, provider) => {
  const { providers } = constants.auth;
  if (providers.Facebook.is(provider)) {
    return auth.fbCheck(providerInfo);
  } else if (providers.Google.is(provider)) {
    return auth.googleCheck(providerInfo);
  } else if (providers.Kakao.is(provider)) {
    return auth.KakaoCheck(providerInfo);
  }
};

auth.fbCheck = (providerInfo) => {
  const { id, accessToken } = providerInfo;
  const deferred = Q.defer();
  request(`https://graph.facebook.com/me?access_token=${accessToken}`, (err, response, data) => {
    if (!err) {
      const me = JSON.parse(data);
      if (response.statusCode === 200 && me.id === id) {
        // Valid user - allow to go forward
        deferred.resolve();
      } else {
        deferred.reject(l10n.t('ERR_FB_ACCESS_TOKEN_EXP'));
      }
    } else {
      deferred.reject(l10n.t('ERR_FB_ACCESS_TOKEN_EXP'));
    }
  });
  return deferred.promise;
};

auth.googleCheck = (providerInfo) => {
  const { id, accessToken } = providerInfo;
  const deferred = Q.defer();
  request(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${accessToken}`, (err, response, data) => {
    if (!err) {
      const me = JSON.parse(data);
      if (response.statusCode === 200 && me.sub === id) {
        // Valid user - allow to go forward
        deferred.resolve();
      } else {
        deferred.reject(l10n.t('ERR_GOOGLE_ACCESS_TOKEN_EXP'));
      }
    } else {
      deferred.reject(l10n.t('ERR_GOOGLE_ACCESS_TOKEN_EXP'));
    }
  });
  return deferred.promise;
};

auth.KakaoCheck = (providerInfo) => {
  const { id, accessToken } = providerInfo;
  const deferred = Q.defer();
  let option = {
    url: 'https://kapi.kakao.com/v1/user/access_token_info',
    method: 'GET',
    headers:{
      'Authorization': `Bearer ${accessToken}`            
    }
  }
  request(option, (err, response, data) => {
    if (_.isEmpty(err)) {
      const me = JSON.parse(data);
      if (response.statusCode === 200 && me.id == id) {
        deferred.resolve();
      } else {
        deferred.reject(l10n.t('ERR_KAKAO_ACCESS_TOKEN_EXP'));
      }
    } else {
      deferred.reject(l10n.t('ERR_KAKAO_ACCESS_TOKEN_EXP'));
    }
  });
  return deferred.promise;
};

module.exports = auth;
