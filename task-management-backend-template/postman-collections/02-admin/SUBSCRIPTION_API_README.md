# Subscription Plan Management APIs

## Overview

This document describes the subscription plan management APIs for the task management system. The system supports two payment channels:

- **Stripe** - For business subscriptions (web-based)
- **RevenueCat** - For individual subscriptions (mobile apps - iOS/Android)

## Subscription Types

| Type | Payment Channel | Platform | Target Users |
|------|----------------|----------|--------------|
| `individual` | RevenueCat | iOS, Android | Regular users, children |
| `business_starter` | Stripe | Web | Parents, teachers (up to 5 children) |
| `business_level1` | Stripe | Web | Parents, teachers (up to 10 children) |
| `business_level2` | Stripe | Web | Parents, teachers (up to 25 children) |

## Business Logic

### Automatic Channel Assignment

When creating a subscription plan:

```typescript
if (subscriptionType === 'individual') {
  purchaseChannel = 'revenuecat';
  availablePlatforms = ['ios', 'android'];
} else {
  purchaseChannel = 'stripe';
  availablePlatforms = ['web'];
}
```

### Stripe Integration (Business Plans)

- ✅ Products and prices created **automatically** via Stripe API
- ✅ Recurring billing handled by Stripe
- ✅ Webhook integration for payment success/failure
- ✅ Customer portal for subscription management

### RevenueCat Integration (Individual Plans)

- ⚠️ Products must be created **manually** in RevenueCat dashboard
- ⚠️ Admin must link to App Store Connect (iOS) and Google Play Console (Android)
- ✅ RevenueCat handles cross-platform subscriptions
- ✅ Webhook integration for subscription events

## API Endpoints

### Super Admin Only

#### Create Subscription Plan
```http
POST /api/v1/subscription-plan
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Request Body:**
```json
{
  "subscriptionName": "Individual Monthly",
  "subscriptionType": "individual",
  "amount": "9.99",
  "maxChildrenAccount": 0,
  "isActive": true
}
```

**Response (RevenueCat Plan):**
```json
{
  "success": true,
  "message": "Subscription Plan created successfully. ⚠️ Remember to create the product in RevenueCat dashboard.",
  "data": {
    "_id": "plan_id",
    "subscriptionName": "Individual Monthly",
    "subscriptionType": "individual",
    "purchaseChannel": "revenuecat",
    "revenueCatProductIdentifier": "individual_monthly",
    "revenueCatPackageIdentifier": "monthly"
  },
  "metadata": {
    "revenueCatSetupRequired": true,
    "revenueCatProductIdentifier": "individual_monthly",
    "revenueCatPackageIdentifier": "monthly",
    "dashboardUrl": "https://dashboard.revenuecat.com"
  }
}
```

**Response (Stripe Plan):**
```json
{
  "success": true,
  "message": "Subscription Plan created successfully. ✅ Stripe product and price created automatically.",
  "data": {
    "_id": "plan_id",
    "subscriptionName": "Business Starter",
    "subscriptionType": "business_starter",
    "purchaseChannel": "stripe",
    "stripe_product_id": "prod_xxxxx",
    "stripe_price_id": "price_xxxxx"
  },
  "metadata": {
    "stripeProductId": "prod_xxxxx",
    "stripePriceId": "price_xxxxx"
  }
}
```

#### Update Subscription Plan
```http
PUT /api/v1/subscription-plan/:id
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Updatable Fields:**
- `subscriptionName`
- `amount`
- `maxChildrenAccount`
- `isActive`
- `isDeleted`
- `revenueCatProductIdentifier`
- `revenueCatPackageIdentifier`

**Non-Updatable:**
- `subscriptionType` (cannot change Individual to Business)
- `purchaseChannel` (auto-managed)
- `stripe_product_id` (requires new product)
- `stripe_price_id` (requires new price)

#### Delete Subscription Plan
```http
PUT /api/v1/subscription-plan/softDelete/:id
Authorization: Bearer {{ADMIN_TOKEN}}

DELETE /api/v1/subscription-plan/delete/:id
Authorization: Bearer {{ADMIN_TOKEN}}
```

### All Authenticated Users

#### Get All Plans
```http
GET /api/v1/subscription-plan
Authorization: Bearer {{USER_TOKEN}}
```

#### Get Active Plans (Paginated)
```http
GET /api/v1/subscription-plan/paginate?isActive=true&page=1&limit=10
Authorization: Bearer {{USER_TOKEN}}
```

#### Filter by Subscription Type
```http
# Business Plans (for parents)
GET /api/v1/subscription-plan/paginate?isActive=true&subscriptionType=business_starter

# Individual Plans (for users)
GET /api/v1/subscription-plan/paginate?isActive=true&subscriptionType=individual
```

#### Get Plan by ID
```http
GET /api/v1/subscription-plan/:id
Authorization: Bearer {{USER_TOKEN}}
```

### Purchase Subscription

#### Purchase Business Plan (Stripe)
```http
POST /api/v1/subscription-plan/purchase/:subscriptionPlanId
Authorization: Bearer {{USER_TOKEN}}
```

**Response:**
```json
{
  "success": true,
  "data": "https://checkout.stripe.com/c/pay/cs_test_xxx",
  "message": "Redirect to Checkout"
}
```

**Next Step:** Redirect user to Stripe checkout URL

#### Purchase Individual Plan (RevenueCat)
```http
POST /api/v1/subscription-plan/revenuecat-purchase/:subscriptionPlanId
Authorization: Bearer {{USER_TOKEN}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": "revenuecat_api_key",
    "appUserId": "user_id",
    "productIdentifier": "individual_monthly",
    "packageIdentifier": "monthly",
    "planDetails": {
      "subscriptionName": "Individual Monthly",
      "subscriptionType": "individual",
      "amount": "9.99",
      "currency": "USD"
    },
    "instructions": {
      "ios": "Use RevenueCat SDK to purchase package on iOS App Store",
      "android": "Use RevenueCat SDK to purchase package on Google Play Store",
      "nextStep": "After purchase, RevenueCat webhook will automatically update your subscription status"
    }
  }
}
```

**Next Step:** Use RevenueCat SDK in mobile app to complete purchase

### Cancel Subscription

#### Cancel My Subscription
```http
POST /api/v1/subscription-plan/cancel
Authorization: Bearer {{USER_TOKEN}}
```

**Effect:**
- Sets `cancelledAtPeriodEnd: true`
- Status changes to `'cancelling'`
- Subscription active until end of billing period
- No automatic refund

#### Admin Cancel Patient's Subscription
```http
POST /api/v1/subscription-plan/cancel-for-patient?personId=USER_ID
Authorization: Bearer {{ADMIN_TOKEN}}
```

## RevenueCat Setup Guide

When you create an Individual subscription plan, follow these steps:

### 1. Create Product in RevenueCat
1. Go to https://dashboard.revenuecat.com
2. Navigate to **Products** section
3. Click **New Product**
4. Enter Product Identifier: `individual_monthly`
5. Set Product Name: "Individual Monthly"

### 2. Link to App Stores

#### iOS (App Store Connect)
1. In RevenueCat, click on your product
2. Go to **iOS** tab
3. Click **Add Product**
4. Select from App Store Connect or create new
5. Set price in App Store Connect

#### Android (Google Play Console)
1. In RevenueCat, click on your product
2. Go to **Android** tab
3. Click **Add Product**
4. Select from Google Play Console or create new
5. Set price in Google Play Console

### 3. Create Package
1. In RevenueCat, go to **Offerings**
2. Create new Offering or use "Default"
3. Add Package with identifier: `monthly`
4. Link to the product you created

### 4. Verify Setup
```bash
# Check in RevenueCat dashboard
- Product exists with correct identifier
- Package exists with correct identifier
- Linked to both iOS and Android
- Prices set correctly in both stores
```

## Testing

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
```

### RevenueCat Testing
1. Use sandbox environment
2. Create test users in App Store Connect & Google Play Console
3. Test purchase flow in development mode
4. Verify webhook events in RevenueCat dashboard

## Postman Collection

Import the collection:
```
postman-collections/02-admin/03-Subscription-Plan-Management.postman_collection.json
```

### Environment Variables
- `BASE_URL`: `http://localhost:5000`
- `ADMIN_TOKEN`: Super admin JWT token
- `USER_TOKEN`: Regular user JWT token
- `SUBSCRIPTION_PLAN_ID`: Created plan ID

## Error Handling

### Common Errors

#### 400 Bad Request
```json
{
  "success": false,
  "message": "This plan is not configured for RevenueCat. Select an Individual plan."
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Subscription plan not found"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "message": "You already cancel your subscription"
}
```

## Webhooks

### Stripe Webhook
- Endpoint: `/api/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`
- Updates: `UserSubscription`, `PaymentTransaction`

### RevenueCat Webhook
- Endpoint: `/api/v1/revenuecat-webhook`
- Events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`
- Updates: `UserSubscription`, `PaymentTransaction`

## Security

- ✅ Admin endpoints require `TRole.admin` or `TRole.superAdmin`
- ✅ User endpoints require authentication
- ✅ Subscription purchase requires active user session
- ✅ Webhook signatures verified

## Rate Limiting

- Create Plan: 10 per hour (admin only)
- Purchase Subscription: 5 per minute per user
- Cancel Subscription: 2 per minute per user

## Support

For issues or questions:
- Stripe Dashboard: https://dashboard.stripe.com
- RevenueCat Dashboard: https://dashboard.revenuecat.com
- API Documentation: See Postman collection
