//@ts-ignore
import { Request, Response } from 'express';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import Stripe from 'stripe';
import { config } from '../../../config';
import stripe from '../../../config/paymentGateways/stripe.config';
import { User } from '../../user.module/user/user.model';
import ApiError from '../../../errors/ApiError';
import { handlePaymentSucceeded } from './handlePaymentSucceeded';
// V2 Handlers - Production Grade
import { handleSuccessfulPaymentV2 } from './handleSuccessfulPayment.v2';
import { handleFailedPaymentV2, handleCheckoutSessionExpiredV2 } from './handleFailedPayment.v2';
import { handleSubscriptionCancellationV2 } from './handleSubscriptionCancellation.v2';
import { handleSubscriptionDatesV2 } from './handleSubscriptionDates.v2';
import { handleSubscriptionUpdatedV2 } from './handleSubscriptionUpdated.v2';
import { queueTrialWillEndNotification } from '../../../helpers/bullmq/webhookNotificationQueue';
import { logger } from '../../../shared/logger';
import { errorLogger } from '../../../shared/logger';

const webhookHandler = async (req: Request, res: Response): Promise<void> => {
     const sig = req.headers['stripe-signature'];
     const webhookSecret = config.stripe.webhookSecret;

     if (!webhookSecret) {
          errorLogger.error('Stripe webhook secret not set');
          res.status(500).send('Webhook secret not configured');
          return;
     }

     let event: Stripe.Event;

     try {
          event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
     } catch (err: any) {
          errorLogger.error('Webhook signature verification failed:', err.message);
          res.status(400).send(`Webhook Error: ${err.message}`);
          return;
     }

     logger.info(`[Stripe Webhook] Received event: ${event.type}`, {
          eventId: event.id,
          apiVersion: event.api_version,
     });

     try {
          switch (event.type) {
               /*-─────────────────────────────────
               |  ONE-TIME PAYMENT (Order, etc.)
               └──────────────────────────────────*/
               case 'checkout.session.completed':
                    logger.info('[Stripe Webhook] checkout.session.completed');
                    await handlePaymentSucceeded(event.data.object);
                    break;

               /*-─────────────────────────────────
               |  PAYMENT FAILURES
               └──────────────────────────────────*/
               case 'payment_intent.payment_failed':
                    logger.info('[Stripe Webhook] payment_intent.payment_failed');
                    await handleFailedPaymentV2(event.data.object as any);
                    break;

               case 'checkout.session.expired':
                    logger.info('[Stripe Webhook] checkout.session.expired');
                    await handleCheckoutSessionExpiredV2(event.data.object);
                    break;

               /*-─────────────────────────────────
               |  SUBSCRIPTION PAYMENT SUCCESS
               └──────────────────────────────────*/
               case 'invoice.payment_succeeded':
                    logger.info('[Stripe Webhook] invoice.payment_succeeded');
                    await handleSuccessfulPaymentV2(event.data.object);
                    break;

               /*-─────────────────────────────────
               |  SUBSCRIPTION CREATED (Dates)
               └──────────────────────────────────*/
               case 'customer.subscription.created':
                    logger.info('[Stripe Webhook] customer.subscription.created');
                    await handleSubscriptionDatesV2(event.data.object);
                    break;

               /*-─────────────────────────────────
               |  TRIAL WILL END (3 days notice)
               └──────────────────────────────────*/
               case 'customer.subscription.trial_will_end': {
                    logger.info('[Stripe Webhook] customer.subscription.trial_will_end');
                    const subscription = event.data.object;
                    const metadata = subscription.metadata || {};
                    const trialEndDate = subscription.trial_end
                         ? new Date(subscription.trial_end * 1000)
                         : null;
                    const daysRemaining = trialEndDate
                         ? Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                         : 3;

                    if (metadata.userId) {
                         await queueTrialWillEndNotification({
                              userId: metadata.userId,
                              subscriptionId: metadata.referenceId || subscription.id,
                              trialEndDate: trialEndDate!,
                              daysRemaining,
                         });
                    }
                    break;
               }

               /*-─────────────────────────────────
               |  INVOICE PAYMENT FAILED (Subscription)
               └──────────────────────────────────*/
               case 'invoice.payment_failed':
                    logger.info('[Stripe Webhook] invoice.payment_failed');
                    await handleFailedPaymentV2(event.data.object);
                    break;

               /*-─────────────────────────────────
               |  SUBSCRIPTION CANCELLED/DELETED
               └──────────────────────────────────*/
               case 'customer.subscription.deleted':
                    logger.info('[Stripe Webhook] customer.subscription.deleted');
                    await handleSubscriptionCancellationV2(event.data.object);
                    break;

               /*-─────────────────────────────────
               |  SUBSCRIPTION UPDATED
               └──────────────────────────────────*/
               case 'customer.subscription.updated':
                    logger.info('[Stripe Webhook] customer.subscription.updated');
                    await handleSubscriptionUpdatedV2(
                         event.data.object,
                         event.data.previous_attributes,
                    );
                    break;

               /*-─────────────────────────────────
               |  TRANSFER CREATED (Payouts)
               └──────────────────────────────────*/
               case 'transfer.created':
                    logger.info('[Stripe Webhook] transfer.created');
                    // TODO: Handle transfer/payout tracking
                    break;

               default:
                    logger.info(`[Stripe Webhook] Unhandled event type: ${event.type}`);
                    break;
          }

          // ✅ Always respond 200 to acknowledge receipt
          res.status(200).json({ received: true });
     } catch (err: any) {
          errorLogger.error('[Stripe Webhook] Error handling event:', {
               eventType: event.type,
               eventId: event.id,
               error: err.message,
               stack: err.stack,
          });
          res.status(500).send(`Internal Server Error: ${err.message}`);
     }
};

export default webhookHandler;



/***************
// handleTransferCreated
const handleTransferCreated = async (transfer: Stripe.Transfer) => {
     try {
          console.log(`Transfer for user ${transfer.destination} created`);

          // Get order and shop details from transfer metadata
          const booking = await Booking.findById(transfer.metadata?.bookingId);
          if (!booking) {
               throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking not found');
          }
          // update isTransferd true
          booking.isPaymentTransferd = true;
          booking.paymentStatus = PaymentStatus.PAID;
          booking.status = BOOKING_STATUS.COMPLETED;
          await booking.save();

          // get isExistPayment
          const isExistPayment = await Payment.findOne({ booking: booking._id, method: booking.paymentMethod });
          if (!isExistPayment) {
               throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment not found');
          }
          isExistPayment.status = PaymentStatus.PAID;
          await isExistPayment.save();
     } catch (error) {
          console.error('Error in handleTransferCreated:', error);
     }
};
*********** */