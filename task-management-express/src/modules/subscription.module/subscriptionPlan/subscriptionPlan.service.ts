//@ts-ignore
import Stripe from "stripe";
import { GenericService } from "../../_generic-module/generic.services";
import { ISubscriptionPlan } from "./subscriptionPlan.interface";
import { SubscriptionPlan } from "./subscriptionPlan.model";
import { getOrCreateStripeCustomer, UserSubscriptionService } from "../userSubscription/userSubscription.service";
import ApiError from "../../../errors/ApiError";
//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { IUserSubscription } from "../userSubscription/userSubscription.interface";
import { UserSubscription } from "../userSubscription/userSubscription.model";
import { UserSubscriptionStatusType } from "../userSubscription/userSubscription.constant";
import { TCurrency } from "../../../enums/payment";
import { config } from "../../../config";
import { IUser } from "../../token/token.interface";
import stripe from "../../../config/paymentGateways/stripe.config";
import { User } from "../../user.module/user/user.model";
import { TTransactionFor } from "../../../constants/TTransactionFor";

export class SubscriptionPlanService extends GenericService<typeof SubscriptionPlan, ISubscriptionPlan>
{
    private stripe : Stripe
    
    constructor(){
        super(SubscriptionPlan)
        this.stripe = stripe;
    }

    userSubscriptionService = new UserSubscriptionService()

    getByTSubscription = async (subscriptionType: string) => {
        return await this.model.findOne({ subscriptionType });
    }

    //---------------------------------
    // Patient | Landing Page | Purchase a subscription plan .. 
    //---------------------------------
    purchaseSubscriptionForSuplify = async (subscriptionPlanId: string, _user: IUser/*, userId: string | undefined*/) => {
        //  User → Clicks "Buy Plan"
        //        ↓
        // Backend → Creates Checkout Session (stripe.checkout.sessions.create)
        //        ↓
        // Stripe → Returns session.url
        //        ↓
        // User → Redirected to Stripe Checkout
        //        ↓
        // User → Completes payment
        //        ↓
        // Stripe → Redirects to /success?session_id=cs_test_xxx
        //        ↓
        // Frontend → Extracts session_id
        //        ↓
        // Frontend → Calls YOUR API: GET /api/subscription/verify-session?session_id=...
        //        ↓
        // Backend → Calls Stripe: checkout.sessions.retrieve(session_id)
        //        ↓
        // Backend → Returns safe data (plan, amount, status)
        //        ↓
        // Frontend → Shows success UI, logs analytics, redirects

        const {userId} = _user;
        
        let subscriptionPlan: ISubscriptionPlan | null = await SubscriptionPlan.findById(subscriptionPlanId);
        if (!subscriptionPlan) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Subscription plan not found`
            );
        }

        // console.log('Subscription Plan Found: ', subscriptionPlan);

        const user:IUser | null = await User.findById(userId);
        if (!user) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                'User not found'
            );
        }

        /*
        if (user.subscriptionType !== TSubscription.none) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                'User is already subscribed to a plan'
            );
        }
        */

        //---------------------------------
        // If stripeCustomerId found .. we dont need to create that .. 
        //---------------------------------   

        let  stripeCustomer = await getOrCreateStripeCustomer(user);

        /*---------------------------------------
        let stripeCustomer;
        if(!user.stripe_customer_id){
            let _stripeCustomer = await stripe.customers.create({
                name: user?.name,
                email: user?.email,
            });
            
            stripeCustomer = _stripeCustomer.id;

            await User.findByIdAndUpdate(user?._id, { $set: { stripe_customer_id: stripeCustomer } });
            
        }else{
            stripeCustomer = user.stripe_customer_id;
        }

        ---------------------------------------*/

        //---------------------------------
        // Lets create a userSubscription // TODO : we have to check already have userSubsription or not .. 
        //---------------------------------

        const newUserSubscription : IUserSubscription = await UserSubscription.create({
            userId: user._id, //🔗
            subscriptionPlanId : null, //🔗this will be assign after free trial end .. if stripe charge 70 dollar .. and in webhook we update this with standard plan 
            subscriptionStartDate: null, //new Date()
            currentPeriodStartDate: null, // new Date(), // ⚡ we will update this in webhook after successful payment
            expirationDate: null, // new Date(new Date().setDate(new Date().getDate() + 1)), // 1 days free trial
            isFromFreeTrial: false, // this is not from free trial
            cancelledAtPeriodEnd : false,
            status : UserSubscriptionStatusType.processing,
            // isAutoRenewed : 70 dollar pay houar pore true hobe 
            // billingCycle :  it should be 1 .. after first 70 dollar payment 
            // renewalDate : will be updated after 70 dollar for standard plan successful payment in webhook 
            stripe_subscription_id: null, // because its free trial // after 70 dollar payment we will update this 
            stripe_transaction_id : null, // because its free trial // after 70 dollar payment we will update this 
        
            // ⚡⚡⚡⚡ must null assign korte hobe renewal date e 

            /******
             * 
             * when a user cancel his subscription
             * 
             * we add that date at ** cancelledAt **
             * 
             * ** status ** -> cancelled
             * 
             * ******* */
        
        });

        // Create a new subscription
        // const subscription = await this.stripe.subscriptions.create({
        //   customer: stripeCustomer,
        //   items: [{ price: subscriptionPlan.stripe_price_id }],
        //   expand: ['latest_invoice.payment_intent'],
        // });


        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomer,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                price: subscriptionPlan.stripe_price_id,
                quantity: 1,
                },
            ],
            // 🎯 Pass metadata to access later in webhooks
            subscription_data: {
                metadata: {
                userId: user._id.toString(),
                subscriptionType: subscriptionPlan.subscriptionType.toString(),// TSubscription.standard.toString(),
                subscriptionPlanId: subscriptionPlan._id.toString(),
                referenceId: newUserSubscription._id.toString(),
                referenceFor:  TTransactionFor.UserSubscription.toString(),
                /*****
                 * payment successful
                 * 
                 * we need to create a payment transaction for this userSubscription
                 * for that we need referenceId and referenceFor
                 * 
                 * ******* */
                currency : TCurrency.usd.toString(),
                amount : subscriptionPlan.amount.toString()
                },
            },
            // ✅ Top-level metadata (available directly on session)
            metadata: {
                referenceId: newUserSubscription._id.toString(),
                referenceFor: TTransactionFor.UserSubscription.toString(),
                user : JSON.stringify(_user), // for handlePaymentSucceeded 
                currency: TCurrency.usd.toString(),
                amount: subscriptionPlan.amount.toString(),

                subscriptionType: subscriptionPlan.subscriptionType.toString(),
                subscriptionPlanId: subscriptionPlan._id.toString(),
                userId: user._id.toString(),
                planNickname: subscriptionPlan.subscriptionName.toString(), // e.g., "Pro Plan"
                
               /*******
                referenceId: newUserSubscription._id.toString(),
                referenceFor: TTransactionFor.UserSubscription.toString(),
                currency: TCurrency.usd.toString(),
                amount: subscriptionPlan.amount.toString(),
                user : JSON.stringify(_user),
                ****** */
            },
            // success_url: `${config.app.frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            // cancel_url: `${config.app.frontendUrl}/pricing`,
            success_url: config.stripe.success_url,
            cancel_url: config.stripe.cancel_url,
        });

        return session.url;
    }

    /**
     * Create Subscription Plan (Admin Dashboard)
     * 
     * Business Logic:
     * - Individual plans → RevenueCat (iOS/Android mobile apps)
     * - Business plans (business_starter, business_level1, business_level2) → Stripe (web)
     * 
     * @param planData - Subscription plan data from admin
     * @returns Created subscription plan with metadata
     * 
     * @description
     * For Stripe: Automatically creates product and price in Stripe
     * For RevenueCat: Generates product identifiers (admin must create in RevenueCat dashboard)
     */
    async createSubscriptionPlan(planData: Partial<ISubscriptionPlan> & {
        subscriptionName: string;
        amount: string;
        subscriptionType: string;
        revenueCatProductIdentifier?: string;
        revenueCatPackageIdentifier?: string;
    }) {
        const { TSubscription } = await import('../../../enums/subscription');
        const { TInitialDuration, TRenewalFrequency } = await import('./subscriptionPlan.constant');
        const { TCurrency } = await import('../../../enums/payment');
        const { logger } = await import('../../../shared/logger');

        // Deactivate existing plans with same subscription type
        const existingPlan = await SubscriptionPlan.find({
            isActive: true,
            subscriptionType: planData.subscriptionType
        });

        for (const plan of existingPlan) {
            plan.isActive = false;
            await plan.save();
        }

        // Prepare plan data
        const data: ISubscriptionPlan = {
            subscriptionName: planData.subscriptionName,
            amount: planData.amount,
            subscriptionType: planData.subscriptionType,
            initialDuration: TInitialDuration.month,
            renewalFrequncy: TRenewalFrequency.monthly,
            currency: TCurrency.usd,
            isActive: true,
            ...planData,
        } as ISubscriptionPlan;

        // Set purchase channel based on subscription type
        if (planData.subscriptionType === TSubscription.individual) {
            data.purchaseChannel = 'revenuecat';  // Individual plans use RevenueCat
            data.availablePlatforms = ['ios', 'android'];
        } else {
            data.purchaseChannel = 'stripe';  // Business plans use Stripe
            data.availablePlatforms = ['web'];
        }

        // Create Stripe product and price (for Business plans)
        if (data.purchaseChannel === 'stripe' || data.purchaseChannel === 'both') {
            const product = await this.stripe.products.create({
                name: data.subscriptionType,
                description: `Subscription plan for ${data.subscriptionType}`,
            });

            const price = await this.stripe.prices.create({
                unit_amount: Math.round(parseFloat(data?.amount as string) * 100), // Amount in cents
                currency: data.currency,
                recurring: {
                    interval: 'month',
                    interval_count: 1,
                },
                product: product.id,
            });
            data.stripe_product_id = product.id;
            data.stripe_price_id = price.id;
        }

        // Set RevenueCat identifiers (for Individual plans)
        if (data.purchaseChannel === 'revenuecat' || data.purchaseChannel === 'both') {
            data.revenueCatProductIdentifier = planData.revenueCatProductIdentifier || `${data.subscriptionType}_monthly`;
            data.revenueCatPackageIdentifier = planData.revenueCatPackageIdentifier || 'monthly';
            
            // Log setup instructions for admin
            logger.info(`
╔══════════════════════════════════════════════════════════════╗
║  📱 REVENUECAT PRODUCT SETUP REQUIRED                        ║
╠══════════════════════════════════════════════════════════════╣
║  Subscription Plan: ${data.subscriptionName}
║  Product Identifier: ${data.revenueCatProductIdentifier}
║  Package Identifier: ${data.revenueCatPackageIdentifier}
╠══════════════════════════════════════════════════════════════╣
║  Steps to complete:                                          ║
║  1. Go to https://dashboard.revenuecat.com                   ║
║  2. Navigate to Products section                             ║
║  3. Create new Product with identifier:                      ║
║     → ${data.revenueCatProductIdentifier}
║  4. Link to App Store Connect (iOS)                          ║
║  5. Link to Google Play Console (Android)                    ║
║  6. Create Package with identifier:                          ║
║     → ${data.revenueCatPackageIdentifier}
║  7. Set price in App Store Connect & Google Play Console     ║
╚══════════════════════════════════════════════════════════════╝
            `);
        }

        // Create the plan in database
        const result = await this.model.create(data);

        return {
            plan: result,
            metadata: data.purchaseChannel === 'revenuecat' ? {
                revenueCatSetupRequired: true,
                revenueCatProductIdentifier: data.revenueCatProductIdentifier,
                revenueCatPackageIdentifier: data.revenueCatPackageIdentifier,
                dashboardUrl: 'https://dashboard.revenuecat.com',
            } : {
                stripeProductId: data.stripe_product_id,
                stripePriceId: data.stripe_price_id,
            }
        };
    }
}