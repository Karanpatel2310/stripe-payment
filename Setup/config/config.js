let devSetting = function () { };

devSetting.newUser = "new";
devSetting.advancedUser = "advanced";
devSetting.expertUser = "expert";

// AWS
devSetting.credentials = {
    accessHost: process.env.START_ENGLISH_NOW_ACCESS_HOST,
    AwsAccessKey: process.env.AwsAccessKey,
    AwsSecretAccessKey: process.env.AwsSecretAccessKey,
    AwsRegion: process.env.AwsRegion
}

devSetting.AWS_CONFIG_S3 = {
    "accessKeyId": process.env.AwsAccessKey,
    "secretAccessKey": process.env.AwsSecretAccessKey,
    "Bucket": process.env.BUCKET_NAME,
    // AwsAccessKey: process.env.AwsAccessKey,
    // AwsSecretAccessKey: process.env.AwsSecretAccessKey,
    // Bucket: process.env.BUCKET_NAME
};

devSetting.AWS_FROM = process.env.AWS_FROM;

devSetting.AWS_BUCKET = process.env.BUCKET_NAME;
devSetting.DEFAULT_USER_SRTFILR_PATH = "srtFile/";
devSetting.DEFAULT_ADMIN_AUDIO_PATH = "audioFile/";

devSetting.Admin_Forget_Password = process.env.Admin_Forget_Password;


devSetting.videoLevel = {
    "Elementary": "Elementary",
    "Intermediate": "Intermediate",
    "Advanced": "Advanced"
}

devSetting.currentPackage = {
    "Trial": "Trial",
    "Subscription": "Subscription",
    "ExpiredSubscription": "SubscriptionExpired"
}

devSetting.role = {
    "Super": "Super",
    "App": "App"
}

devSetting.day = {
    "Monday": "Monday",
    "Tuesday": "Tuesday",
    "Wednesday": "Wednesday",
    "Thursday": "Thursday",
    "Friday": "Friday",
    "Saturday": "Weekend"
}

devSetting.videoType = {
    "News": "News",
    "General_English": "General_English",
    "TV_Shows_Movies": "TV_Shows_Movies",
    "Business_English": "Business_English",
    "Speeches": "Speeches",
    "Surprise_Pick": "Surprise_Pick"
}

devSetting.changeLevel = {
    "Elementary": "Elementary",
    "Intermediate": "Intermediate",
    "Advanced": "Advanced"
}

devSetting.expireTokenIn = 60 * 30; //token will expire after half n hour
devSetting.SECRET = process.env.SECRET;

module.exports = devSetting;