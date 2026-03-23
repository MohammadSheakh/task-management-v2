import { config } from '..';

/**
 * RevenueCat Configuration
 * 
 * Setup Instructions:
 * 1. Create account at https://dashboard.revenuecat.com
 * 2. Create iOS app in RevenueCat
 * 3. Create Android app in RevenueCat
 * 4. Configure products in App Store Connect & Google Play Console
 * 5. Link products to RevenueCat offerings
 * 6. Get API key from RevenueCat dashboard
 * 
 * Webhook Setup:
 * 1. Go to Project Settings → Webhooks in RevenueCat
 * 2. Add webhook URL: https://your-domain.com/api/v1/revenuecat-webhook
 * 3. Copy the webhook signing secret
 * 4. Add to .env: REVENUECAT_WEBHOOK_SECRET=your_secret_here
 */

const revenueCatConfig = {
  // RevenueCat API Key (from dashboard.revenuecat.com)
  apiKey: config.revenueCat?.apiKey || process.env.REVENUECAT_API_KEY,
  
  // Webhook secret for signature verification
  webhookSecret: config.revenueCat?.webhookSecret || process.env.REVENUECAT_WEBHOOK_SECRET,
  
  // Environment
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  
  // Default Individual plan product identifier (must match RevenueCat dashboard)
  defaultIndividualProductIdentifier: 'individual_monthly',
  
  // Default package identifier (must match RevenueCat dashboard)
  defaultPackageIdentifier: 'monthly',
};

export default revenueCatConfig;
