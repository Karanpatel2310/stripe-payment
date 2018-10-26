const express = require('express');

const userCtr = require('./userController');
const middleware = require('../../../middleware');
const userMiddleware = require('./userMiddleware');
const validationRules = require('./userValidationRules');

const userRouter = express.Router();

// Inject Validation Rules
userRouter.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {
    req.validations = validationRules.get(req.path);
    middleware.reqValidator(req, res, next);
  } else {
    next();
  }
});

// Routes
userRouter.post('/check-user-exist', userCtr.checkUserExist);

userRouter.post('/signup', userCtr.signup);

userRouter.post('/authenticate', userCtr.authenticate);

userRouter.post('/authenticate-provider', userCtr.authenticateProvider);

userRouter.post('/forget-password', userCtr.forgetPassword);

userRouter.post('/reset-password', userCtr.resetPassword);

userRouter.get('/verify-email/:email/:code', userCtr.verifyEmail);

userRouter.post('/resend-otp', userCtr.resendOtp);

userRouter.post('/recover-account-otp', userCtr.recoverAccountOtp);

userRouter.post('/recover-account', userCtr.recoverAccount);
// userRouter.post('/update-profile', userMiddleware.loadUser, userCtr.updateProfile);

userRouter.get('/profile', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.profile);

// Get User Profile
userRouter.get('/get-profile', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.getProfile);

// Update User Profile
userRouter.post('/update-profile', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.updateProfile);

// Set User Package
userRouter.post('/set-packages', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.setPackage);

// Set User Notes
userRouter.post('/set-notes', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.setUserNotes);

// Delete User Notes
userRouter.post('/delete-notes', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.deleteUserNotes);

// Get User Notes
userRouter.get('/get-notes/:page', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.getUserNotes);

// Get suggested-curriculum for users
userRouter.get('/suggested-curriculum/:langCode', userCtr.getSuggestedCurriculum);

userRouter.get('/verify-forget-email/:email/:code', userCtr.verifyForgetEmail);

// Get completed lesson list for users
userRouter.get('/completed-lesson/:page', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.getCompletedLessonList);

// Get CMS Content for users
userRouter.post('/cms-content', userCtr.getCMSContentUser);

// Get AcronymsData For User
userRouter.get('/acronyms-list', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.getAcronymsList);

// Get User Progress For User
userRouter.get('/progress', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.getUserProgress);

// Get lesson topics list for user
userRouter.get('/lesson-topic-list/:languageCode', userMiddleware.loadUser, userMiddleware.isUserBlocked, userCtr.getLessonTopicsListDashboard);

// Delete User Data By userID
userRouter.get('/delete-all-data/:userId', userCtr.getDeleteUserDataByUserId);

// Resend email if user not activated his account
userRouter.post('/resend-email', userCtr.resendEmail);

module.exports = userRouter;
