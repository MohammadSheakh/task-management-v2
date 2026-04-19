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

  // RevenueCat does NOT provide X-RevenueCat-Signature header
  // Instead, we verify using the Authorization header (Bearer token)
  // configured in RevenueCat Dashboard → Project Settings → Webhooks
  const authHeader = req.headers['authorization'] as string;
  const webhookSecret = config.revenueCat?.webhookSecret;

  if (!webhookSecret) {
    console.error('❌ RevenueCat webhook secret not set');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  // Verify webhook Authorization header
  const isValid = verifyRevenueCatAuth(authHeader, webhookSecret);

  if (!isValid) {
    console.error('❌ RevenueCat webhook authorization verification failed');
    res.status(401).json({ error: 'Invalid webhook authorization' });
    return;
  }

  console.log('✅ RevenueCat webhook authorization verified');

  // Parse the raw body (express.raw() returns a Buffer)
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
  let event: any;
  
  try {
    event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch (error) {
    console.error('❌ Failed to parse webhook body:', error);
    res.status(400).json({ error: 'Invalid JSON in webhook body' });
    return;
  }

  console.log('📦 Event type:', event.event_id || event.type);

  try {
    // RevenueCat uses event.type (e.g., "INITIAL_PURCHASE", "RENEWAL", etc.)
    const eventType = event.event_id || event.type;
    
    switch (eventType) {
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
        console.log(`🪝🪝 Unhandled event type: ${eventType}`);
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
 * Verify RevenueCat webhook Authorization header
 *
 * RevenueCat does NOT provide HMAC signature verification
 * Instead, configure an Authorization header value in RevenueCat Dashboard
 * and verify it matches our webhook secret
 *
 * @see https://community.revenuecat.com/dashboard-tools-52/is-x-revenuecat-signature-removed-and-where-is-webhook-secret-key-7110
 */
function verifyRevenueCatAuth(
  authHeader: string | undefined,
  secret: string
): boolean {
  console.log('🔐 Verifying RevenueCat webhook authorization');

  if (!authHeader || !secret) {
    console.error('❌ Missing authorization header or secret');
    return false;
  }

  try {
    // Support both formats:
    // - "Bearer your-secret"
    // - "your-secret" (raw token)
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    // Compare tokens using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(token, 'utf8'),
      Buffer.from(secret, 'utf8')
    );
  } catch (error) {
    console.error('Error verifying RevenueCat authorization:', error);
    return false;
  }
}

export default revenueCatWebhookHandler;
