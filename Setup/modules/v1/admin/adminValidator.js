let validator = {};

validator.getadminValidator = (req, type) => {
    let input = {
        login: {
            email: ["isEmail", req.t("EMAIL_REQUIRE", { FIELD: "valid email address" })],
        }
    };
    return input[type];
}

module.exports = validator;
