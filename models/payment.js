const mongoose = require('mongoose');

const PaymentSchema = mongoose.Schema({
    id:{
        type:String,
    },
    email:{
        type:String,
        required: true
    },
    amount:{
        type:Number,
        required: true
    }
})

const Payment = module.exports = mongoose.model('Payment', PaymentSchema);