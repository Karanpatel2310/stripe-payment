const utils = require('../helper/utils');

let error = {};

error.notFound = (res,req) => {
    res.status(404).json("INVALID_REQUEST");
};

error.notAuthenticated = (res,req,data) => {
    var response = {};
        if (!utils.empty(data) && _.isObject(data)) {
            for (var key in data) {
                response[key] = data[key];
            }
        } else {
            response["message"] = "NOT_AUTHORIZED";
        }
    res.status(401).json(response);
};

error.validationError = (res, message) => {
    return res.status(400).json(message);
};

error.validationErrorPost = (res, message) => {
    return res.status(405).json(message);
};

error.validationErrorPostUpdate = (res, message) => {
    return res.status(203).json(message);
};

module.exports = error;