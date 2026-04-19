import { config } from "../../../../../config";
import stripe from "../../../../../config/paymentGateways/stripe.config";
import { TCurrency } from "../../../../../enums/payment";
import { IUser } from "../../../../token/token.interface";
import { User } from "../../../../user.module/user/user.model";
import { PaymentGateway } from "../paymentgateway.abstract";

export class StripeGateway extends PaymentGateway{

    async resolveCustomer(user: IUser): Promise<string> {
        if (user.stripe_customer_id) return user.stripe_customer_id;
        
        const customer = await stripe.customers.create({
            name: user.userName,
            email: user.email,
        });
        
        await User.findByIdAndUpdate(user.userId, {
            $set: { stripe_customer_id: customer.id }
        });

        return customer.id;
    }

    async createSession({ stripeCustomerId , price , metadata }: {stripeCustomerId : string, price : number , metadata : any}) {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer: stripeCustomerId,
            line_items: [{
                price_data: {
                currency: TCurrency.usd,
                product_data: { name: 'Amount' },
                unit_amount: price * 100,
                },
                quantity: 1,
            }],
            metadata,
            success_url: config.stripe.success_url,
            cancel_url: config.stripe.cancel_url,
        });
        return { url: session.url };
    }
}