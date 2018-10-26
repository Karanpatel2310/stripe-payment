const express = require('express');
const adminCtr = require('./adminController');
const userMiddleware = require('../user/userMiddleware');
const adminMiddleware = require('./adminMiddleware.js');

const adminRouter = express.Router();

// Routes

// Admin Login
adminRouter.post('/login', adminMiddleware.validateInput('login'), adminCtr.login);

// Verify Code sent to email when admin login 
// adminRouter.post('/code/verify', adminMiddleware.validateAdmin, adminCtr.verifyMailCode); 

// get user-packages route
adminRouter.get('/packages', userMiddleware.loadUser, userMiddleware.isUserBlocked, adminCtr.getPackages);

// get user-acronyms for user
adminRouter.get('/acronyms/list', userMiddleware.loadUser, userMiddleware.isUserBlocked, adminCtr.getAcronymsList);

// admin forget password
adminRouter.post('/forget-password', adminCtr.forgetPassword);

// admin change password
adminRouter.post('/change-password', adminMiddleware.validateAdmin, adminCtr.changePassword);

// admin lesson Details
adminRouter.get('/details', adminMiddleware.validateAdmin, adminCtr.getAdminDetails);

// Get lesson topics list for admin
adminRouter.get('/lesson-topic', adminMiddleware.validateAdmin, adminCtr.getLessonTopics);

// Update lesson topics by admin
adminRouter.post('/update/lesson-topic', adminMiddleware.validateAdmin, adminCtr.updateLessonTopics);

// Get user list for admin
adminRouter.get('/user-list/:page', adminMiddleware.validateAdmin, adminCtr.getUserList);

// Get user Details By UserId for admin
adminRouter.get('/user-details/:userId', adminMiddleware.validateAdmin, adminCtr.getUserDetailsById);

// Block OR Unblock user by admin
adminRouter.post('/block-unblock/:userId', adminMiddleware.validateAdmin, adminCtr.blockUnblockUser);

// Get Completed Lesson count of user and Total lesson count added by admin
adminRouter.get('/completed-lessons-list/:page/:userId', adminMiddleware.validateAdmin, adminCtr.getTotalLessonAndCompletedLessonCount);

// Get Admin Role List
adminRouter.get('/role-list', adminMiddleware.validateAdmin, adminCtr.getAdminRoleList);

// Get Admins List
adminRouter.get('/list/:page', adminMiddleware.validateAdmin, adminCtr.getAdminList);

// Add new admin by super admin
adminRouter.post('/add', adminMiddleware.validateAdmin, adminMiddleware.isEmailAlreadyExist, adminCtr.addNewAdmin);

// Edit admin
adminRouter.post('/edit', adminMiddleware.validateAdmin, adminMiddleware.isEmailAlreadyExist, adminCtr.editNewAdmin);

// Verify New Admin Email
adminRouter.get('/verify-email/:email', adminCtr.verifyNewAdminEmail);

// Delete admin
adminRouter.post('/delete', adminMiddleware.validateAdmin, adminCtr.deleteNewAdmin);

// Add Edit addEditAcronymsData by admin
adminRouter.post('/add-edit/acronyms', adminMiddleware.validateAdmin, adminMiddleware.isSameAcronymsWord ,adminCtr.addEditAcronymsData);

// Get AcronymsData For admin
adminRouter.get('/acronyms-list/:page', adminMiddleware.validateAdmin, adminCtr.getAcronymsList);

// Delete AcronymsData by admin
adminRouter.post('/acronyms/delete', adminMiddleware.validateAdmin, adminCtr.deleteAcronymsWord);

// Get lesson topics list for admin
adminRouter.get('/lesson-topic-list', adminMiddleware.validateAdmin, adminCtr.getLessonTopicsListDashboard);

// Get Sub Scription Details for admin
adminRouter.get('/history/:userId/:page', adminMiddleware.validateAdmin, adminCtr.userSubscriptionHistory);

// Get Privacy Policy and FAQ for All User
adminRouter.get('/privacy-policy-and-faq', adminCtr.getPrivacyPolicyAndFAQForAll);

module.exports = adminRouter;
