//@ts-ignore
import { Request, Response } from 'express';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { config } from '../../../config';
import crypto from 'crypto';
import { handleInitialPurchase } from './handlers/handleInitialPurchase';
import { handleRenewal } from './handlers/handleRenewal';
import { handleCancellation } from './handlers/handleCancellation';
import { handleExpiration } from './handlers/handleExpiration';
import { handleRefund } from './handlers/handleRefund';
import { handleBillingIssue } from './handlers/handleBillingIssue';
import { handleSubscription } from './handlers/handleSubscription';

/**
 * RevenueCat Webhook Handler
 * 
 * RevenueCat sends webhook events for subscription lifecycle:
 * - INITIAL_PURCHASE: User subscribes for the first time
 * - RENEWAL: Subscription renewed
 * - CANCELLATION: User cancelled subscription
 * - EXPIRATION: Subscription expired
 * - REFUND: Refund processed
 * - BILLING_ISSUE: Payment failed
 * - SUBSCRIPTION: Subscription state changes
 * 
 * Webhook URL: POST /api/v1/revenuecat-webhook
 */

const revenueCatWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  console.log('🪝 RevenueCat webhook received');
  
  const signature = req.headers['X-RevenueCat-Signature'] as string;
  const webhookSecret = config.revenueCat?.webhookSecret;

  if (!webhookSecret) {
    console.error('❌ RevenueCat webhook secret not set');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  // Verify webhook signature
  const isValid = verifyRevenueCatSignature(req.body, signature, webhookSecret);
  
  if (!isValid) {
    console.error('❌ RevenueCat webhook signature verification failed');
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  console.log('✅ RevenueCat webhook signature verified');

  const event = req.body;
  console.log('📦 Event type:', event.event_id);

  try {
    switch (event.event_id) {
      case 'INITIAL_PURCHASE':
        console.log(`
          ////////////////////////////////////////
          🪝🪝REVENUE_CAT INITIAL_PURCHASE
          ////////////////////////////////////////
        `);
        await handleInitialPurchase(event);
        break;

      case 'RENEWAL':
        console.log(`
          ////////////////////////////////////////
          🪝🪝REVENUE_CAT RENEWAL
          ////////////////////////////////////////
        `);
        await handleRenewal(event);
        break;

      case 'CANCELLATION':
        console.log(`
          ////////////////////////////////////////
          🪝REVENUE_CAT CANCELLATION
          ////////////////////////////////////////
        `);
        await handleCancellation(event);
        break;

      case 'EXPIRATION':
        console.log(`
          ////////////////////////////////////////
          🪝REVENUE_CAT EXPIRATION
          ////////////////////////////////////////
        `);
        await handleExpiration(event);
        break;

      case 'REFUND':
        console.log(`
          ////////////////////////////////////////
          🪝REVENUE_CAT REFUND
          ////////////////////////////////////////
        `);
        await handleRefund(event);
        break;

      case 'BILLING_ISSUE':
        console.log(`
          ////////////////////////////////////////
          🪝REVENUE_CAT BILLING_ISSUE
          ////////////////////////////////////////
        `);
        await handleBillingIssue(event);
        break;

      case 'SUBSCRIPTION':
        console.log(`
          ////////////////////////////////////////
          🪝REVENUE_CAT SUBSCRIPTION
          ////////////////////////////////////////
        `);
        await handleSubscription(event);
        break;

      default:
        console.log(`🪝🪝 Unhandled event type: ${event.event_id}`);
        break;
    }

    // Respond to RevenueCat
    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('❌❌ Error handling RevenueCat webhook:', err);
    res.status(500).json({ error: `Internal Server Error: ${err.message}` });
  }
};

/**
 * Verify RevenueCat webhook signature
 * 
 * RevenueCat signs webhooks with HMAC-SHA256
 * Signature format: "hash=hex_encoded_hash"
 */
function verifyRevenueCatSignature(
  body: any,
  signature: string,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  try {
    // Parse signature to get the hash
    const signatureParts = signature.split('=');
    if (signatureParts.length !== 2) {
      return false;
    }

    const receivedHash = signatureParts[1];

    // Calculate expected hash
    const bodyString = JSON.stringify(body);
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');

    // Compare hashes
    return crypto.timingSafeEqual(
      Buffer.from(receivedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch (error) {
    console.error('Error verifying RevenueCat signature:', error);
    return false;
  }
}

export default revenueCatWebhookHandler;
