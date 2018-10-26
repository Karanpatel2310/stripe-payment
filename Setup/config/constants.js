const Enum = require('enum');

module.exports = {
  pager: {
    limit: 50,
  },
  supportedMime: {
    image: ['image/png', 'image/jpeg', 'image/jpg'],
  },
  auth: {
    loginTypes: new Enum(['Email', 'Mobile']),
    providers: new Enum(['Facebook', 'Google', 'Kakao']),
    optExpire: 1 * 3600 * 1000, // 1 hour
  },
  user: {
    statuses: new Enum(['NotVerified', 'Active', 'Deactive']),
    genders: new Enum(['Male', 'Female']),
  },
  skillLevel: new Enum(['Elementary', 'Intermediate', 'Advanced']),
};
