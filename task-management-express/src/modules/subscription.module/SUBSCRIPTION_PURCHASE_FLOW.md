# 🛒 Subscription Purchase Flow - Complete Guide

**Stripe (Web) vs RevenueCat (Mobile)**

---

## 📋 Overview

Your system now supports **two purchase flows**:

| Feature | Stripe (Business) | RevenueCat (Individual) |
|---------|------------------|------------------------|
| **Platform** | Web | iOS, Android (Mobile App) |
| **Endpoint** | `POST /purchase/:id` | `POST /revenuecat-purchase/:id` |
| **Returns** | Stripe Checkout URL | RevenueCat Config |
| **Payment Method** | Card, Bank Transfer | Apple Pay, Google Pay, Card |
| **User Flow** | Redirect to Stripe | In-app purchase via SDK |

---

## 🌐 Stripe Purchase Flow (Web)

### Endpoint
```http
POST /api/v1/subscription-plans/purchase/:subscriptionPlanId
Authorization: Bearer <user_token>
```

### Request
```bash
curl -X POST http://localhost:6730/api/v1/subscription-plans/purchase/64f5a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Response
```json
{
  "success": true,
  "code": 200,
  "data": "https://checkout.stripe.com/c/pay/cs_test_abc123...",
  "message": "Redirect to Checkout"
}
```

### User Flow

```
┌─────────────┐
│   User on   │
│   Web App   │
└──────┬──────┘
       │ Click "Subscribe"
       ↓
┌─────────────┐
│  Frontend   │
│  calls API  │
└──────┬──────┘
       │ POST /purchase/:id
       ↓
┌─────────────┐
│  Backend    │
│  Creates    │
│  Stripe     │
│  Session    │
└──────┬──────┘
       │ Returns checkout URL
       ↓
┌─────────────┐
│  Frontend   │
│  Redirects  │
│  to Stripe  │
└──────┬──────┘
       │ User completes payment
       ↓
┌─────────────┐
│   Stripe    │
│   Webhook   │
│   → Backend │
└──────┬──────┘
       │ Updates UserSubscription
       ↓
┌─────────────┐
│  Success!   │
│  Redirect   │
│  back to    │
│  app        │
└─────────────┘
```

### Frontend Implementation (Web)

```javascript
// React/Vue/Angular example
async function purchaseSubscription(planId) {
  const response = await fetch(`/api/v1/subscription-plans/purchase/${planId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();
  
  if (result.success) {
    // Redirect to Stripe Checkout
    window.location.href = result.data;
  } else {
    console.error('Purchase failed:', result.message);
  }
}
```

---

## 📱 RevenueCat Purchase Flow (Mobile)

### Endpoint
```http
POST /api/v1/subscription-plans/revenuecat-purchase/:subscriptionPlanId
Authorization: Bearer <user_token>
```

### Request
```bash
curl -X POST http://localhost:6730/api/v1/subscription-plans/revenuecat-purchase/64f5a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Response
```json
{
  "success": true,
  "code": 200,
  "data": {
    "apiKey": "your_revenuecat_public_api_key",
    "appUserId": "user_mongodb_id",
    "productIdentifier": "individual_monthly",
    "packageIdentifier": "monthly",
    "planDetails": {
      "subscriptionName": "Individual Monthly",
      "subscriptionType": "individual",
      "amount": "10.99",
      "currency": "USD",
      "availablePlatforms": ["ios", "android"]
    },
    "instructions": {
      "ios": "Use RevenueCat SDK to purchase package on iOS App Store",
      "android": "Use RevenueCat SDK to purchase package on Google Play Store",
      "nextStep": "After purchase, RevenueCat webhook will automatically update your subscription status"
    }
  },
  "message": "RevenueCat purchase configuration retrieved. Use this config with RevenueCat SDK in your mobile app."
}
```

### User Flow (Mobile)

```
┌─────────────┐
│   User on   │
│  Mobile App │
└──────┬──────┘
       │ Tap "Subscribe"
       ↓
┌─────────────┐
│  Flutter    │
│  App calls  │
│  Backend    │
└──────┬──────┘
       │ POST /revenuecat-purchase/:id
       ↓
┌─────────────┐
│  Backend    │
│  Returns    │
│  RevenueCat │
│  Config     │
└──────┬──────┘
       │ Config with product ID
       ↓
┌─────────────┐
│  RevenueCat │
│  SDK        │
│  (in app)   │
└──────┬──────┘
       │ Shows native purchase sheet
       ↓
┌─────────────┐
│  Apple/     │
│  Google     │
│  Pay Sheet  │
└──────┬──────┘
       │ User confirms with FaceID/TouchID
       ↓
┌─────────────┐
│  RevenueCat │
│  Backend    │
│  processes  │
└──────┬──────┘
       │ Webhook → Your Backend
       ↓
┌─────────────┐
│  Backend    │
│  Updates    │
│  UserSub    │
└──────┬──────┘
       │ SDK receives update
       ↓
┌─────────────┐
│  App shows  │
│  "Success!" │
└─────────────┘
```

### Mobile Implementation (Flutter)

```dart
import 'package:purchases_flutter/purchases_flutter.dart';

class SubscriptionService {
  // 1. Fetch RevenueCat config from backend
  Future<RevenueCatConfig> fetchRevenueCatConfig(String planId) async {
    final response = await http.post(
      Uri.parse('$backendUrl/api/v1/subscription-plans/revenuecat-purchase/$planId'),
      headers: {
        'Authorization': 'Bearer $userToken',
        'Content-Type': 'application/json',
      },
    );

    final result = json.decode(response.body);
    
    if (result['success']) {
      return RevenueCatConfig.fromJson(result['data']);
    } else {
      throw Exception(result['message']);
    }
  }

  // 2. Initialize RevenueCat SDK
  Future<void> initializeRevenueCat(RevenueCatConfig config) async {
    await Purchases.configure(
      apiKey: config.apiKey,
      appUserID: config.appUserId,
    );
  }

  // 3. Purchase subscription
  Future<CustomerInfo> purchaseSubscription(RevenueCatConfig config) async {
    // Get offerings
    final offerings = await Purchases.getOfferings();
    
    // Find the package
    final package = offerings.current?.availablePackages.firstWhere(
      (p) => p.storeProduct?.id == config.productIdentifier,
    );

    if (package == null) {
      throw Exception('Package not found');
    }

    // Purchase
    final customerInfo = await Purchases.purchasePackage(
      package: package,
    );

    return customerInfo;
  }

  // 4. Complete purchase flow
  Future<void> completePurchase(String planId) async {
    try {
      // Step 1: Fetch config from backend
      final config = await fetchRevenueCatConfig(planId);
      
      // Step 2: Initialize RevenueCat
      await initializeRevenueCat(config);
      
      // Step 3: Purchase
      final customerInfo = await purchaseSubscription(config);
      
      // Step 4: Check if purchase was successful
      if (customerInfo.entitlements.active.containsKey('premium')) {
        print('✅ Subscription active!');
        // Navigate to premium features
      }
    } catch (e) {
      if (e is PurchasesErrorCode) {
        // Handle specific errors
        if (e == PurchasesErrorCode.purchaseCancelledError) {
          print('User cancelled purchase');
        } else if (e == PurchasesErrorCode.paymentPendingError) {
          print('Payment pending (e.g., waiting for approval)');
        }
      }
      rethrow;
    }
  }
}

// Data model
class RevenueCatConfig {
  final String apiKey;
  final String appUserId;
  final String productIdentifier;
  final String packageIdentifier;
  final PlanDetails planDetails;

  factory RevenueCatConfig.fromJson(Map<String, dynamic> json) {
    return RevenueCatConfig(
      apiKey: json['apiKey'],
      appUserId: json['appUserId'],
      productIdentifier: json['productIdentifier'],
      packageIdentifier: json['packageIdentifier'],
      planDetails: PlanDetails.fromJson(json['planDetails']),
    );
  }
}

class PlanDetails {
  final String subscriptionName;
  final String subscriptionType;
  final String amount;
  final String currency;
  final List<String> availablePlatforms;

  factory PlanDetails.fromJson(Map<String, dynamic> json) {
    return PlanDetails(
      subscriptionName: json['subscriptionName'],
      subscriptionType: json['subscriptionType'],
      amount: json['amount'],
      currency: json['currency'],
      availablePlatforms: List<String>.from(json['availablePlatforms']),
    );
  }
}
```

---

## 🔍 Key Differences

### Stripe (Web)

1. **Redirect Flow**: User leaves your app → Stripe Checkout → back to your app
2. **Backend-Heavy**: Backend creates Stripe session
3. **Webhook-Driven**: Backend receives webhook, updates database
4. **No SDK Needed**: Just redirect to URL

### RevenueCat (Mobile)

1. **In-App Purchase**: Native iOS/Android purchase sheets
2. **SDK-Heavy**: Mobile app uses RevenueCat SDK
3. **Backend + SDK**: Backend provides config, SDK handles purchase
4. **Automatic Sync**: RevenueCat SDK auto-syncs with backend via webhooks

---

## 🎯 When to Use Which

### Use Stripe (`/purchase/:id`) when:
- ✅ User is on **web platform**
- ✅ You want Stripe Checkout flow
- ✅ Payment via card/bank transfer
- ✅ No mobile app involvement

### Use RevenueCat (`/revenuecat-purchase/:id`) when:
- ✅ User is on **iOS or Android app**
- ✅ You want native in-app purchase experience
- ✅ Payment via Apple Pay/Google Pay
- ✅ You have RevenueCat SDK integrated

---

## 🧪 Testing

### Test Stripe Purchase

```bash
# 1. Get user token
TOKEN="your_user_token"

# 2. Purchase subscription
curl -X POST http://localhost:6730/api/v1/subscription-plans/purchase/64f5a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer $TOKEN"

# 3. Open returned URL in browser
# 4. Complete payment with test card: 4242 4242 4242 4242
```

### Test RevenueCat Purchase

```bash
# 1. Get user token
TOKEN="your_user_token"

# 2. Fetch RevenueCat config
curl -X POST http://localhost:6730/api/v1/subscription-plans/revenuecat-purchase/64f5a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer $TOKEN"

# 3. Use returned config in mobile app
# 4. Complete purchase with sandbox Apple/Google account
```

---

## 📊 Subscription Plan Types

### Individual Plans (RevenueCat)

```json
{
  "subscriptionType": "individual",
  "purchaseChannel": "revenuecat",
  "availablePlatforms": ["ios", "android"],
  "revenueCatProductIdentifier": "individual_monthly",
  "revenueCatPackageIdentifier": "monthly"
}
```

**Purchase via**: `/revenuecat-purchase/:id`

### Business Plans (Stripe)

```json
{
  "subscriptionType": "business_starter",
  "purchaseChannel": "stripe",
  "availablePlatforms": ["web"],
  "stripe_product_id": "prod_xxx",
  "stripe_price_id": "price_xxx"
}
```

**Purchase via**: `/purchase/:id`

---

## 🚨 Common Issues

### Issue: "This plan is not configured for RevenueCat"

**Solution**: Ensure the subscription plan has:
```json
{
  "purchaseChannel": "revenuecat",
  "subscriptionType": "individual"
}
```

### Issue: RevenueCat SDK not initializing

**Solution**: 
1. Verify `apiKey` is correct (public key, not secret)
2. Ensure `appUserId` matches your user's ID
3. Check RevenueCat dashboard for app configuration

### Issue: Webhook not updating subscription

**Solution**:
1. Verify webhook URL is publicly accessible
2. Check webhook secret in `.env`
3. Review backend logs for errors

---

## 📚 Related Documentation

- [HYBRID_SUBSCRIPTION_SUMMARY.md](./HYBRID_SUBSCRIPTION_SUMMARY.md)
- [revenueCat/README.md](./revenueCat/README.md)
- [revenueCat/SETUP_GUIDE.md](./revenueCat/SETUP_GUIDE.md)
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

**Last Updated**: 2026-03-23  
**Author**: Backend Development Team
