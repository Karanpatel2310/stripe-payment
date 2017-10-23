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
    console.log('post method called');
    card_number = req.body.card_number,
        email = req.body.email,
        amount = req.body.amount,
        cvc = req.body.cvc,
        exp_month = req.body.exp_month,
        exp_year = req.body.exp_year

    console.log(req.body);

    // stripe.tokens.create({
    //     card: {
    //         "number": card_number,
    //         "exp_month": exp_month,
    //         "exp_year": exp_year,
    //         "cvc": cvc
    //     }
    // }).then(function (err, token) {
    //     // console.log(token);
    //     if (err) {
    //         console.log(err);
    //         console.log("I am form token error");
    //     }
    //     else {
    //         stripe.customers.create({
    //             email: email,
    //             source: token.id
    //         }).then(function (customer, err) {

    //             // stripe.charges.create({
    //             //     amount,
    //             //     description: 'Testing',
    //             //     currency: "used",
    //             //     customer: customer.id                        
    //             // }).then(function (err, result) {
    //             //     if (err) {
    //             //         console.log(err);
    //             //     }
    //             //     else {
    //             //         console.log(result);
    //             //     }
    //             // })
    //             console.log("i am form customers");
    //             console.log(customer);
    //             stripe.charges.create({
    //                 amount,
    //                 description: 'Testing',
    //                 currency: 'usd',
    //                 customer: customer.id
    //             }, function (err, charge) {
    //                 if (err) {
    //                     // bad things
    //                     console.log(err);
    //                 } else {
    //                     console.log(charge);
    //                 }
    //             });

    //         })
    //     }
    // });
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
                // console.log('your customer is ');
                // console.log(customer);                
                // console.log('your error is ');
                // console.log(error);
                if (customer) {
                    // console.log(customer);
                    stripe.charges.create({
                        amount,
                        description: 'description',
                        currency: "usd",
                        customer: customer.id
                    }).then(function (charge) {
                        const status = charge;
                        console.log('complete result is here');
                        console.log(charge);
                        let newPayment = new Payment({
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
                                    msg: 'Your Transation is done successfully '
                                });
                            }
                        })
                        // res.json({ charge });
                    }, function (error) {
                        console.log('i am new error');
                        console.log(error);
                        res.json({ error });
                    });
                }
            }, function (error) {
                // CVC error
                console.log(error);
                res.json({ error });
            }
                );
        }
    });
});

module.exports = router;
