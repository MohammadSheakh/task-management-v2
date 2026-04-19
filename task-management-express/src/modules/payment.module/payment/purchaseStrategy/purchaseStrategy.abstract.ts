import stripe from "../../../../config/paymentGateways/stripe.config";
import ApiError from "../../../../errors/ApiError";
import { IUser } from "../../../token/token.interface";
import { StatusCodes } from 'http-status-codes';
import { User } from "../../../user.module/user/user.model";
import mongoose from 'mongoose';
import { TCurrency } from "../../../../enums/payment";
import { config } from "../../../../config";
import { PaymentGateway } from "../gateways/paymentgateway.abstract";

export abstract class PurchaseStrategy<T>{

    // These differ per entity - child class implements these
    abstract findExisting(entityId: string) : Promise<T>;
    abstract checkAlreadyPurchased(entityId : string, userId : string) : Promise<boolean>;
    abstract createPendingPurchase(entity : T, user : IUser, session : any) : Promise<any>;
    abstract getMetadata(purchase : any, entity : T, user : IUser ) : Record <string, string>;

    /*------------------- NOW WE GET THIS FROM GATEWAY
    // Shared — never duplicated again
    private async resolveStripeCustomer(user: IUser): Promise<string> {
        if (user.stripe_customer_id) return user.stripe_customer_id;
        
        const customer = await stripe.customers.create({
            name: user.userName,
            email: user.email,
        });

        await User.findByIdAndUpdate(user.userId, { 
                $set: { 
                    stripe_customer_id: customer.id
                } 
            }
        );
        return customer.id;
    }
    ---------------------*/


    // THIS NEVER CHANGES - lives here once, forever
    async processPayment(
        entityId: string,
        loggedInUser: IUser,
        gateway : PaymentGateway  // 👈 gateway comes in here
    ) :Promise<{ url: string }>{
        // check already purchased
        const alreadyPurchased = await this.checkAlreadyPurchased(entityId, loggedInUser.userId);
        if(alreadyPurchased){
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Already purchased')
        }

        // Find entity
        const entity = await this.findExisting(entityId);
        if(!entity){
            throw new ApiError(StatusCodes.NOT_FOUND, 'Not found');
        }

        // 3. Stripe customer — SAME FOR ALL
        // const stripeCustomerId = await this.resolveStripeCustomer(user);
        const customerId = await gateway.resolveCustomer(loggedInUser);

        // create pending purchase - SAME FLOW, DIFFEREENT MODEL
        let pendingPurchase;
        const session = await mongoose.startSession();
        await session.withTransaction(async() => {
            pendingPurchase = await this.createPendingPurchase(entity, loggedInUser, session);
        })
        session.endSession();

        const metadata = this.getMetadata(pendingPurchase, entity, loggedInUser);

        return gateway.createSession({
            stripeCustomerId: customerId,
            price: pendingPurchase.price,
            metadata,
        });

        /*-----------------------
        // 5. Build stripe session — SAME FOR ALL
        const stripeSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer: stripeCustomerId,
            line_items: [{
                price_data: {
                currency: TCurrency.usd,
                product_data: { name: 'Amount' },
                unit_amount: pendingPurchase.price * 100,
                },
                quantity: 1,
            }],
            metadata: this.getMetadata(pendingPurchase, entity, loggedInUser), // only this differs
            success_url: config.stripe.success_url,
            cancel_url: config.stripe.cancel_url,
        });

        return { url: stripeSession.url };

        ------------------------*/
    }
}



// export class SSLGateway implements PaymentGateway {
//     processPayment(serviceBooking : IServiceBooking){

//     }
// }
