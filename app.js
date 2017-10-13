var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var path = require('path');

var app = express(); //or const app = require("express")();

const keyPublishable = process.env.pk_test_lb0Dfi5JI86J9lCMkylxtE15;
const keySecret = process.env.sk_test_hEwz0upa45UWbi4dgkeXBrhq;

const stripe = require("stripe")('sk_test_hEwz0upa45UWbi4dgkeXBrhq');

port = 3000;

//Adding Middleware
//1.cors
app.use(cors());

app.set("view engine", "pug");

//2.body-parser
app.use(bodyParser.json());
app.use(require("body-parser").urlencoded({extended: false}));

//Routes Part
app.get("/", (req, res) =>
res.render("index.pug", {keyPublishable}));

app.post("/charge", (req, res) => {
let amount = 500;

stripe.customers.create({
  email: req.body.stripeEmail,
  card: req.body.stripeToken
})
.then(customer =>
  stripe.charges.create({
    amount,
    description: "Sample Charge",
    currency: "usd",
    customer: customer.id
  }))
.catch(err => console.log("Error:", err))
.then(charge => res.render("charge.pug"));
});

app.listen(port, function () {
    console.log("Server has started With Port :" + port);
});
