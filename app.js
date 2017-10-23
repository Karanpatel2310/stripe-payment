var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
var path = require('path');

var app = express(); //or const app = require("express")();
var router = express.Router();
const route = require('./routes/route.js');

const port = 7000;

//Connect to database
mongoose.connect('mongodb://localhost/payment');

// Database Validation 
//If Success
mongoose.connection.on('connected', function () {
  console.log('Database Connection Created Successfully With Payment');
})

//If any error
mongoose.connection.on('error', function (err) {
  if (err) {
    console.log('Error in database Connection :' + err);
  }
})

//Adding Middleware
//1.cors
app.use(cors());

//2.body-parser
app.use(bodyParser.json());

//static files
app.use(express.static(path.join(__dirname, 'public')));

//Routes
app.use('/api', route);
// app.use('/', route);
app.listen(port, function () {
  console.log("Server has started With Port :" + port);
});
