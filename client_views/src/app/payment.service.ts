import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
import { Payment } from './payment';

import 'rxjs/add/operator/map';

@Injectable()
export class PaymentService {

    constructor(private http: Http) { }

    addPayment(newPayment) {
        var headers = new Headers();
        headers.append('Content-Type', 'application/json');
        return this.http.post('http://localhost:7000/api/payment', newPayment, { headers: headers })
            .map(res => res.json());
    }
}
