const express = require('express');
const path = require('path');

const router = express.Router();

const apiVersion = path.basename(__filename, '.js');
const v = `../modules/${apiVersion}`;

router.use((req, res, next) => {
  req.apiVersion = apiVersion;
  next();
});

/* eslint import/no-dynamic-require: 0 */
router.use('/user', require(`${v}/user/userRoute`));
router.use('/admin', require(`${v}/admin/adminRoute`));

router.all('/*', (req, res) => {
  return res.status(404).json({ message: 'Invalid Request' });
});

module.exports = router;
