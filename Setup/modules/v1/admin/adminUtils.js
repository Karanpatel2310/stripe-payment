const logger = require('../../../helper/logger');
const completedLessonsModel = require('../lesson/completedLessonModel');
const utils = require('../../../helper/utils');
const adminUtils = {};

adminUtils.getUserCompletedLessonDetails = (page, userId) => {
    return new Promise((resolve, reject) => {
        try {
            adminUtils.getUserCompletedLessonPageCount(userId, function (count) {
                let skipRecord = 0;
                let limit = parseInt(process.env.MAX_RECORD);
                if (!utils.empty(page) && !isNaN(page)) {
                    skipRecord = ((page - 1) * limit);
                }
                completedLessonsModel.aggregate([
                    {
                        $match: { "userId": userId }
                    },
                    {
                        $lookup: {
                            from: "lessonTopics",
                            localField: "lessonTopicId",
                            foreignField: "_id",
                            as: "topicDetails"
                        }
                    },
                    {
                        $unwind: {
                            path: "$topicDetails",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: "lessons",
                            localField: "lessonId",
                            foreignField: "_id",
                            as: "lessonsDetails"
                        }
                    },
                    {
                        $unwind: {
                            path: "$lessonsDetails",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: "sublessons",
                            localField: "subLessonId",
                            foreignField: "_id",
                            as: "subLessonsDetails"
                        }
                    },
                    {
                        $unwind: {
                            path: "$subLessonsDetails",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $group: {
                            "_id": "$_id",
                            "subLessonId": { $first: "$subLessonsDetails._id" },
                            "lessonName": { $first: "$subLessonsDetails.lessonName" },
                            "srtFile": { $first: "$subLessonsDetails.srtFile" },
                            "startTime": { $first: "$subLessonsDetails.startTime" },
                            "endTime": { $first: "$subLessonsDetails.endTime" },
                            "completedLessonCreatedAt": { $first: "$createdAt" },
                            "completedLessonUpdatedAt": { $first: "$updatedAt" },
                            "lessonId": { $first: "$lessonsDetails._id" },
                            "lessonTopicId": { $first: "$lessonsDetails.lessonTopicId" },
                            "videoLevel": { $first: "$lessonsDetails.videoLevel" },
                            "youtubeId": { $first: "$lessonsDetails.youtubeId" },
                            "introduction": { $first: "$lessonsDetails.introduction" },
                            "tags": { $first: "$lessonsDetails.tags" },
                            "isSingle": { $first: "$lessonsDetails.isSingle" },
                            "subCreatedAt": { $first: "$lessonsDetails.createdAt" },
                            "subUpdatedAt": { $first: "$lessonsDetails.updatedAt" },
                            "day": { $first: "$topicDetails.day" },
                            "title": { $first: "$topicDetails.title" }
                        }
                    },
                    { "$sort": { completedLessonCreatedAt: -1 } },
                    { "$limit": skipRecord + parseInt(process.env.MAX_RECORD) },
                    { "$skip": skipRecord },
                ])
                    .then((completedLessonDetails) => {
                        let finalResult = {
                            "data": completedLessonDetails,
                            "total": count
                        }
                        return resolve(finalResult);
                    })
                    .catch((err) => {
                        logger.error("Error ! Completed Lesson details of user for admin admin utils", err);
                        reject(err);
                    })
            })
        } catch (error) {
            logger.error("In catch", error);
            reject(error);
        }
    })
};

adminUtils.getUserCompletedLessonPageCount = (userId, callback) => {
    completedLessonsModel.find({ userId: userId }).count()
        .then((list) => {
            callback(list);
        }).catch((err) => {
            logger.error("Error ! Get Completed Lesson list page count in admin Utils", err);
            reject(err);
        })
};

module.exports = adminUtils;
