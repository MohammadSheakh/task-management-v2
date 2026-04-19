// Gateway interface - HOW to pay

import { IUser } from "../../../token/token.interface";

/*-─────────────────────────────────
|  We need to implement different gateway .. like Stripe Gateway
| paypal gateway based on this abstract class
| so, those gateway must extends this PaymentGateway abstract class 
└──────────────────────────────────*/
export abstract class PaymentGateway{
    abstract createSession(params : {
        stripeCustomerId ? : string;
        price : number;
        metadata : Record<string, string>,
    }) : Promise < { url : string }>

    abstract resolveCustomer(user: IUser) : Promise<string>;

}
