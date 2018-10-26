const logger = require('./logger');
const AWS = require('aws-sdk');
const uuid = require('node-uuid');
const Q = require('q');
let async = require('async');
const fs = require('fs');
const path = require('path');
const utilsfunction = require('./utils');
const _ = require('lodash');
const config = require('../config/config');
const credentials = config.credentials;

AWS.config.update({
  accessKeyId: credentials.AwsAccessKey,
  secretAccessKey: credentials.AwsSecretAccessKey,
  region: credentials.AwsRegion,
})
const endpoint = new AWS.Endpoint(credentials.accessHost);
const awsUtils = {}
const SES_CONFIG = _.extend(AWS, { apiVersion: process.env.AWS_API_VERSION });
const ses = new AWS.SES(SES_CONFIG);

const S3 = new AWS.S3({ endpoint: endpoint, signatureVersion: 'v2' })

const sns = new AWS.SNS({
  region: process.env.SnsAwsRegion,
});


awsUtils.getS3 = () => {
  return s3;
};

awsUtils.getPreSignedURL = (prefix) => {
  const s3ObjectKey = `${prefix}/${uuid.v1()}`;
  const deferred = Q.defer();

  s3.getSignedUrl('putObject', {
    Bucket: process.env.AwsS3Bucket,
    Expires: parseInt(process.env.PreSignedUrlExpiration, 10),
    Key: s3ObjectKey,
    ACL: 'public-read',
  }, (err, url) => {
    if (err == null) {
      deferred.resolve({
        preSignedUrl: url,
        key: s3ObjectKey,
        url: awsUtils.getS3Url(s3ObjectKey),
      });
    } else {
      logger.error(err);
    }
  });

  return deferred.promise;
};

awsUtils.getS3Url = (key) => {
  return `https://${process.env.AwsS3Bucket}.s3.amazonaws.com/${key}`;
};

awsUtils.getCFUrl = (key) => {
  return `https://${process.env.AwsCloudFront}/${key}`;
};

awsUtils.publishSnsSMS = (to, message) => {
  const deferred = Q.defer();
  const params = {
    Message: message,
    MessageStructure: 'string',
    PhoneNumber: to,
  };

  const paramsAtt = {
    attributes: { /* required */
      DefaultSMSType: 'Transactional',
      DefaultSenderID: 'UTIL',
    },
  };

  sns.setSMSAttributes(paramsAtt, (err, data) => {
    if (err) {
      logger.error(err, err.stack);
    } else {
      logger.info(data);
      sns.publish(params, (snsErr, snsData) => {
        if (snsErr) {
          // an error occurred
          logger.error(snsErr);
          deferred.reject(snsErr);
        } else {
          // successful response
          // logger.info(data);
          deferred.resolve(snsData);
        }
      });
    }
  });

  return deferred.promise;
};

awsUtils.putObject = (file, key, encoding) => {
  return new Promise((resolve, reject) => {
    // fs.readFile(file.path, (error, fileContent) => {
    // if unable to read file contents, throw exception
    // if (error) { throw error; }

    const params = {
      Body: file.body,
      Bucket: process.env.AwsS3Bucket,
      Key: key,
      ACL: 'public-read',
      ContentType: file.mime,
      ContentDisposition: 'inline',
      ContentEncoding: encoding,
    };

    s3.putObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        logger.info(data);
        resolve({
          key, url: awsUtils.getCFUrl(key),
        });
      }
    });
  });
  // });
};

awsUtils.uploadFolder = (folder, files, videoType) => {
  const vType = videoType || 'story';
  return new Promise((resolve, reject) => {
    const distFolderPath = `${vType}/${uuid.v1()}`;

    const promises = [];

    // Can use `forEach`, but used `every` as hack to break the loop
    files.every((file) => {
      // get the full path of the file
      const key = path.join(distFolderPath, path.basename(file.path));

      promises.push(awsUtils.putObject(file, key));
      return true;
    });

    Q.allSettled(promises)
      .then((results) => {
        const s3Files = [];
        results.forEach((result) => {
          if (result.state === 'fulfilled') {
            s3Files.push(result.value);
          } else {
            reject(result.reason);
          }
        });
        resolve(s3Files);
      });
  });
  // });
};

awsUtils.downloadObject = (key) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: process.env.AwsS3BucketLiveStream,
      Key: key,
    };

    const filePath = `/tmp/${path.basename(key)}`;
    logger.info('Started');
    s3.getObject(params, (err, data) => {
      if (err) {
        return reject(err);
      }

      fs.writeFile(filePath, data.Body, (errFile) => {
        if (errFile) {
          return reject(errFile);
        }
        logger.info('The file has been saved!', filePath);
        resolve({ path: filePath, type: data.ContentType });
      });
    });
  });
};

awsUtils.sendEmail = (email, uName, fileName, link, subject, callback) => {
  let resetpwd;
  let newLink;
  let admin_url;

  let verifiedImage = process.env.VERIFY_EMAIL_IMAGE;
  let alreadyVerifiedImage = process.env.ALREADY_VERIFY_IMAGE;

  if (fileName === 'emailAccountActivate') {
    resetpwd = "./templates/" + fileName + ".html";
    newLink = process.env.EmailVerificationURL + email + "/" + link;
  } else if (fileName === 'adminForgetPassword') {
    resetpwd = "./templates/" + fileName + ".html";
    newLink = config.Admin_Forget_Password
  } else if (fileName == 'newAdminEmailVerification') {
    resetpwd = "./templates/" + fileName + ".html";
    newLink = process.env.newAdminEmailVerification + email;
    admin_url = config.Admin_Forget_Password
  } else if (fileName == 'editNewAdminEmailVerification') {
    resetpwd = "./templates/" + fileName + ".html";
    admin_url = config.Admin_Forget_Password
  } else if (fileName == 'contactUsToAdmin') {
    resetpwd = "./templates/" + fileName + ".html";
  } else {
    resetpwd = "./templates/" + fileName + ".html";
    newLink = process.env.ForgetEmailVerificationURL + email + "/" + link;
  }
  utilsfunction.getHtmlContent(resetpwd, function (err, content) {

    content = content.replace("{USERNAME}", uName);
    content = content.replace("{LINK}", link);
    content = content.replace("{ADMIN_URL}", admin_url);
    content = content.replace("{REDIRECT}", newLink);
    content = content.replace("{VERIFY}", verifiedImage);
    content = content.replace("{ALREADYVERIFY}", alreadyVerifiedImage);
    var to = email;
    // this must relate to a verified SES account 
    var from = process.env.AWS_FROM; // Note : Put in .env file
    //need to change // this sends the email 
    // @todo - add HTML version 
    ses.sendEmail({
      Source: "Start English Now<" + from + ">", //need to change 
      Destination: { ToAddresses: [to] },
      ReplyToAddresses: [email],
      Message: {
        Subject: {
          Data: subject
        },
        Body: {
          Html: {
            Data: content,
          }
        }
      }
    }, function (error, data) {
      console.log("AWS ERROR", error);
      if (error) {
        isEmailSent = false;
      } else {
        isEmailSent = true;
      }
      callback(error, isEmailSent);
    });
  });
};

awsUtils.uploadAdminAudio = (file, userId, newFilename, cb) => {
  let userFullImageDir;
  if (file.fieldName == 'audio') {
    userFullImageDir = config.DEFAULT_ADMIN_AUDIO_PATH;
  } else {
    userFullImageDir = config.DEFAULT_USER_SRTFILR_PATH;
  }
  let currentFile = awsUtils;
  currentFile.uploadFile(file, userId, newFilename, userFullImageDir, (savedFile1) => {
    // cb(savedFile1);
    let result = {
      originalImage: savedFile1 && savedFile1.data[0] ? savedFile1.data[0] : "",
    }
    cb(result);
  });
}

awsUtils.uploadFile = (file, referenceId, newFilename, storagePath, cb) => {
  let files = file;
  let currentFile = awsUtils;
  let response = { "data": [], "error": "" };
  let fileData = [];

  let configS3 = config.AWS_CONFIG_S3;
  configS3 = _.extend(configS3, { apiVersion: '2010-12-01' });
  let S3 = new AWS.S3(configS3);

  let oldFilename = file.path;
  let fileName = file.name;
  let extension = path.extname(fileName);
  let baseFileName = path.basename(fileName, extension);
  // let newFilename = fileName + "_" + utilsfunction.getTime() + extension;
  let newPath = storagePath + newFilename;
  let data = fs.readFileSync(oldFilename);

  fileData.push({
    "data": data,
    "type": file.type,
    "name": newFilename,
    "path": newPath
  });
  if (fileData.length > 0) {
    async.eachSeries(fileData, (file, callback) => {
      let params = {
        Bucket: process.env.BUCKET_NAME,
        ACL: 'public-read',
        Body: file.data,
        Key: file.path,
        ContentType: file.type
      };
      S3.putObject(params, (err, res) => {
        if (utilsfunction.isDefined(err)) {
          response.error = err;
          console.log("file upload:" + err);
        }
        response.data.push(file.name);
        cb(response);
      });
    }, (err) => {
      console.log("series", err, response);
      cb(response);
    });
  } else {
    console.log("error: no file");
    cb(response);
  }
};

awsUtils.deleteFile = (oldData, storagePath) => {
  let configS3 = config.AWS_CONFIG_S3;
  configS3 = _.extend(configS3, { apiVersion: '2010-12-01' });
  let S3 = new AWS.S3(configS3);

  let params = {
    Bucket: process.env.BUCKET_NAME
  };
  params.Key = storagePath + oldData;
  S3.deleteObject(params, function (err, data) {
    if (err) {
      console.log("AWS response ", err);
    }
  });
};

awsUtils.uploadAdminSrtFile = (file, newFilename, cb) => {
  let userFullImageDir = config.DEFAULT_USER_SRTFILR_PATH;
  let currentFile = awsUtils;
  currentFile.uploadSrtFile(file, newFilename, userFullImageDir, (savedFile1) => {
    // cb(savedFile1);
    let result = {
      originalImage: savedFile1 && savedFile1.data[0] ? savedFile1.data[0] : "",
    }
    cb(result);
  });
};

awsUtils.uploadSrtFile = (file, newFilename, storagePath, cb) => {
  let files = file;
  let currentFile = awsUtils;
  let response = { "data": [], "error": "" };
  let fileData = [];

  let configS3 = config.AWS_CONFIG_S3;
  configS3 = _.extend(configS3, { apiVersion: '2010-12-01' });
  let S3 = new AWS.S3(configS3);

  let oldFilename = file.path;
  let fileName = file.name;
  let extension = path.extname(fileName);
  let baseFileName = path.basename(fileName, extension);
  // let newFilename = fileName + "_" + utilsfunction.getTime() + extension;
  let newPath = storagePath + newFilename;
  let data = fs.readFileSync(oldFilename);

  fileData.push({
    "data": data,
    "type": file.type,
    "name": newFilename,
    "path": newPath
  });
  if (fileData.length > 0) {
    async.eachSeries(fileData, (file, callback) => {
      let params = {
        Bucket: process.env.BUCKET_NAME,
        ACL: 'public-read',
        Body: file.data,
        Key: file.path,
        ContentType: file.type
      };
      S3.putObject(params, (err, res) => {
        if (utilsfunction.isDefined(err)) {
          response.error = err;
          console.log("file upload:" + err);
        }
        response.data.push(file.name);
        cb(response);
      });
    }, (err) => {
      console.log("series", err, response);
      cb(response);
    });
  } else {
    console.log("error: no file");
    cb(response);
  }
};

module.exports = awsUtils;
