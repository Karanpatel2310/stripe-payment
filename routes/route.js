const express = require('express');
const router = express.Router();
var http = require('http');

const keyPublishable = process.env.pk_test_lb0Dfi5JI86J9lCMkylxtE15;
const keySecret = process.env.sk_test_hEwz0upa45UWbi4dgkeXBrhq;

const stripe = require('stripe')('sk_test_hEwz0upa45UWbi4dgkeXBrhq');

//Bring schema from payment.js to make an api for add delete update payment
const Payment = require('../models/payment');

router.get('/', function (req, res, next) {
    // console.log('success');
    res.send('Payment App');
});

// Add data
router.post('/payment', function (req, res, next) {
    // console.log('post method called');
        email = req.body.email,
        card_number = req.body.card_number,
        amount = req.body.amount * 100,
        cvc = req.body.cvc,
        exp_month = req.body.exp_month,
        exp_year = req.body.exp_year

    // console.log(req.body);

    stripe.tokens.create({
        card: {
            "number": card_number,
            "exp_month": exp_month,
            "exp_year": exp_year,
            "cvc": cvc
        }
    }, function (err, token) {
        if (err) {
            // console.log(err);
            console.log(err.message);
            res.json(err);
        }
        else {
            stripe.customers.create({
                email: email,
                source: token.id
            }).then(function (customer) {
                if (customer) {
                    // console.log(customer);
                    stripe.charges.create({
                        amount,
                        description: 'description',
                        currency: "usd",
                        customer: customer.id
                    }).then(function (charge) {
                        const status = charge;
                        // console.log(charge);
                        let newPayment = new Payment({
                            id: status.id,
                            email: email,
                            amount: amount,
                            description: 'description',
                            transaction_details: status
                        });
                        newPayment.save((err, details) => {
                            if (err) {
                                console.log(err);
                                res.json({
                                    err
                                });
                            }
                            else {
                                console.log(details);
                                res.json({
                                    msg: 'Done'
                                });
                            }
                        })
                    }, function (error) {
                        res.json({ error });
                    });
                }
            }, function (error) {
                res.json({ error });
            }
                );
        }
    });
});

//Create a route for subscription plan
router.post("/createplan", function (req, res) {
    console.log("It's Working");
    const amount = req.body.amount,
        interval = req.body.interval,
        name = req.body.name,
        id = req.body.id;

    stripe.plans.create({
        amount: amount,
        interval: interval,
        name: name,
        currency: "usd",
        id: id
    }, function (err, plan) {
        if (err) {
            console.log(err);
            res.json({ err });
        }
        else {
            console.log(plan);
            res.json({ plan });
        }
    });
});

//Create a subscription route
router.post('/createsub', function (req, res) {

    console.log("Sub is working");
    const card_number = req.body.card_number,
    exp_month = req.body.exp_month,
    exp_year = req.body.exp_year,
    cvc = req.body.cvc
    email = req.body.email;
    plan = req.body.plan;
    
    stripe.tokens.create({
        card: {
            "number": card_number,
            "exp_month": exp_month,
            "exp_year": exp_year,
            "cvc": cvc
        }
    }, function (err, token) {
        if (err) {
            // console.log(err);
            console.log(err.message);
            res.json(err);
        }
        else {
            stripe.customers.create({
                email: email,
                source : token.id
            }, function (err, customer) {
                if (err) {
                    console.log(err);
                    res.json({ err });
                }
                else {
                    console.log(customer);
                    stripe.subscriptions.create({
                        customer: customer.id,
                        items: [
                        {
                            plan: plan,
                        },
                        ]
                    }, function(err, subscription) {
                        if(err){
                            console.log(err);
                            res.json({err})
                        }
                        else{
                            console.log(subscription);
                            res.json({subscription});
                        }
                        }
                    );
                }
            }
            );
        }
    });
});

module.exports = router;