import ApiError from "../../../errors/ApiError";
import { IUser } from "../../token/token.interface";
import { PaymentGateway } from "./gateways/paymentgateway.abstract";
import { TPaymentGateway } from "./payment.constant";
import {  PurchaseStrategy } from "./purchaseStrategy/purchaseStrategy.abstract";
import { StatusCodes } from 'http-status-codes';

// https://www.youtube.com/watch?v=vE74gnv4VlY

export type TPurchaseType = 'Journey' | 'Capsule';
export type TGatewayType = 'stripe' | 'paypal';

export class PaymentService {

    private paymentGateways: Record<string, PaymentGateway> = {};
    private strategies : Record<string, PurchaseStrategy<any>> = {};

    /*-------------
    public registerPaymentGateway(
        paymentMethod: TPaymentGateway,
        gateway: PaymentGateway
    ){
        this.paymentGateways[paymentMethod] = gateway;
    }
    -------------*/

    // Register WHAT to purchase
    registerStrategy(type: TPurchaseType, strategy: PurchaseStrategy<any>) {
        this.strategies[type] = strategy;
    }

    // Register HOW to pay
    registerGateway(type: TGatewayType, gateway: PaymentGateway) {
        this.paymentGateways[type] = gateway;
    }
    
    /*-─────────────────────────────────
    |  MUST: We need to register these Gateway and Strategies in app.ts
    └──────────────────────────────────*/

    public async processPayment(
        purchaseType: TPurchaseType,
        gatewayType: TGatewayType,
        entityId: string,
        user: IUser
    ){
        /*----------
        const gateway = this.paymentGateways[paymentMethod]
        if(gateway){
            await gateway.processPayment(serviceBooking);
        }else{
            throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found.');
        }
        ------------*/

        const strategy = this.strategies[purchaseType];
        if (!strategy) {
            throw new ApiError(StatusCodes.BAD_REQUEST, `Unknown purchase type: ${purchaseType}`);
        }

        const gateway = this.paymentGateways[gatewayType];
        
        if (!gateway) {
            throw new ApiError(StatusCodes.BAD_REQUEST, `Unknown gateway: ${gatewayType}`);
        }

        return strategy.processPayment(entityId, user, gateway);
    }
}