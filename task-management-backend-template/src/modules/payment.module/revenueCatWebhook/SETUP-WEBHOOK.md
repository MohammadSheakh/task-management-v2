# RevenueCat Webhook Setup Guide

## ⚠️ Important: RevenueCat Does NOT Provide HMAC Signature

According to RevenueCat's official documentation and community posts:
- **RevenueCat does NOT provide `X-RevenueCat-Signature` header**
- **RevenueCat does NOT provide HMAC body signing**
- The only verification method is through the **Authorization header**

**Source**: [RevenueCat Community - Is x-revenuecat-signature removed?](https://community.revenuecat.com/dashboard-tools-52/is-x-revenuecat-signature-removed-and-where-is-webhook-secret-key-7110)

---

## Setup Steps

### 1. Generate a Webhook Secret

Generate a secure random token for your webhook secret:

```bash
openssl rand -hex 32
```

Example output: `a1b2c3d4e5f6...` (64 characters)

### 2. Add to `.env` File

Add the webhook secret to your environment variables:

```env
REVENUECAT_WEBHOOK_SECRET=your_generated_secret_here
```

### 3. Configure Webhook in RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Select your project
3. Navigate to **Project Settings** → **Webhooks**
4. Click **Add Webhook** or edit existing webhook
5. Configure the following:

   **Webhook URL:**
   ```
   https://your-domain.com/api/v1/revenuecat-webhook
   ```

   **Authorization Header Value:**
   ```
   Bearer your_generated_secret_here
   ```
   
   Or simply (without "Bearer " prefix):
   ```
   your_generated_secret_here
   ```

   **Make sure the value matches exactly what's in your `.env` file!**

6. Select the events you want to receive:
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ REFUND
   - ✅ BILLING_ISSUE
   - ✅ NON_RENEWING_PURCHASE (if applicable)

7. Save the webhook configuration

### 4. Test the Webhook

RevenueCat allows you to send a test webhook:

1. In the Webhooks section, click **Send Test**
2. Choose an event type (e.g., INITIAL_PURCHASE)
3. Check your server logs for the webhook receipt

You should see:
```
🪝 RevenueCat webhook received
🔐 Verifying RevenueCat webhook authorization
✅ RevenueCat webhook authorization verified
📦 Event type: INITIAL_PURCHASE
```

---

## Troubleshooting

### "Invalid webhook authorization" Error

**Cause**: The Authorization header value in RevenueCat doesn't match your `REVENUECAT_WEBHOOK_SECRET`

**Solution**:
1. Check the value in RevenueCat Dashboard → Project Settings → Webhooks → Authorization Header Value
2. Check your `.env` file: `REVENUECAT_WEBHOOK_SECRET=...`
3. Make sure they match **exactly** (no extra spaces, same case)

### Webhook Not Receiving Events

**Check**:
1. Webhook URL is correct and accessible from the internet
2. Your server is running and accepting POST requests
3. Check server logs for incoming requests
4. Use a tool like [webhook.site](https://webhook.site) to test if RevenueCat is sending events

### Body Parsing Issues

**The webhook route uses `express.raw()`**, which is correct for RevenueCat. If you see parsing errors:

1. Make sure the route in `app.ts` is:
   ```typescript
   app.post('/api/v1/revenuecat-webhook', express.raw({ type: 'application/json' }), revenueCatWebhookHandler);
   ```

2. **This route MUST be before `app.use(express.json())`** (which it is in your setup)

---

## Security Notes

- The webhook secret should be kept secure (like a password)
- Never commit it to version control
- Use a strong, randomly generated secret (at least 32 bytes)
- Rotate the secret periodically if needed
- The Authorization header verification uses timing-safe comparison to prevent timing attacks

---

## Event Types Handled

Your webhook handler currently supports:

| Event Type | Description | Handler |
|------------|-------------|---------|
| `INITIAL_PURCHASE` | User subscribes for the first time | `handleInitialPurchase` |
| `RENEWAL` | Subscription renewed | `handleRenewal` |
| `CANCELLATION` | User cancelled subscription | `handleCancellation` |
| `EXPIRATION` | Subscription expired | `handleExpiration` |
| `REFUND` | Refund processed | `handleRefund` |
| `BILLING_ISSUE` | Payment failed | `handleBillingIssue` |
| `SUBSCRIPTION` | Subscription state changes | `handleSubscription` |

---

## Additional Resources

- [RevenueCat Webhooks Documentation](https://www.revenuecat.com/docs/webhooks)
- [RevenueCat Community - Webhook Verification](https://community.revenuecat.com/sdks-51/webhook-message-verification-7165)
- [RevenueCat Community - Authorization Header](https://community.revenuecat.com/dashboard-tools-52/is-x-revenuecat-signature-removed-and-where-is-webhook-secret-key-7110)
