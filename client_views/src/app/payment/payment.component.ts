import { Component, OnInit } from '@angular/core';
import { PaymentService } from '../payment.service';
import { Payment } from '../payment';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})

export class PaymentComponent implements OnInit {

  payments: Payment[];
  payment: Payment;
  email: String;
  amount: Number;
  card_number: Number;
  cvc: Number;
  exp_month: Number;
  exp_year: Number;

  constructor(private paymentService: PaymentService) { }

  ngOnInit() {
  }

  addPayment() {
    const newPayment = {
      email: this.email,
      amount: this.amount,
      card_number: this.card_number,
      cvc: this.cvc,
      exp_month: this.exp_month,
      exp_year: this.exp_year
    };
    // console.log(newPayment);
    this.paymentService.addPayment(newPayment)
      .subscribe(payment => {
        // this.payments.push(payment);
          this.email = '' ;
          this.amount = null;
          this.card_number = null;
          this.cvc = null,
          this.exp_month = null;
          this.exp_year = null;
      });
  }

}
