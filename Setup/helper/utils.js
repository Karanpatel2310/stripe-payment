let utilsfunction = {};
const fs = require('fs');

utilsfunction.empty = (mixedVar) => {
    let undef, key, i, len;
    let emptyValues = ["undefined", null, false, 0, '', '0'];
    for (i = 0, len = emptyValues.length; i < len; i++) {
        if (mixedVar === emptyValues[i]) {
            return true;
        }
    }
    if (typeof mixedVar === 'object') {
        for (key in mixedVar) {
            return false;
        }
        return true;
    }
    return false;
};

utilsfunction.isDefined = (variable) => {
    if (typeof variable == 'boolean') return true;
    return (typeof variable != undefined && typeof variable != "undefined" && variable !== null && variable !== "");
};

utilsfunction.emptyWithOutZero = (mixedVar) => {
    let undef, key, i, len;
    let emptyValues = ["undefined", null, false, '', undefined];
    for (i = 0, len = emptyValues.length; i < len; i++) {
        if (mixedVar === emptyValues[i]) {
            return true;
        }
    }
    if (typeof mixedVar === 'object') {
        for (key in mixedVar) {
            return false;
        }
        return true;
    }
    return false;
};

utilsfunction.makeRandomNumber = () => {
    let text = "";
    let possible = "0123456789";
    for (let i = 0; i < 4; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

utilsfunction.getTime = () => {
    var date = new Date();
    var time = date.getTime();
    return time;
};


utilsfunction.getHtmlContent = (filePath, callback) => {
    let content = "";
    fs.readFile(filePath, 'utf8', function (err, html) {
        if (!err) {
            content = html;

        }
        callback(null, content);

    });
};

utilsfunction.makeRandomStringOfLength = (length) => {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

utilsfunction.make3DigitRandomNumber = () => {
    let text = "";
    let possible = "123456789";
    for (let i = 0; i < 3; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

utilsfunction.makeCapitalLetters = (length) => {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

module.exports = utilsfunction;