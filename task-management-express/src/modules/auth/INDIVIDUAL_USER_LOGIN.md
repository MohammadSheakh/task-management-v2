# 📱 Individual User Login Endpoint

**New endpoint for mobile app individual user authentication with subscription status**

---

## 📋 Overview

The `/login/individual-user` endpoint is designed for **individual users** (mobile app) to log in and receive their subscription status and support style configuration in a single response.

### Key Features

- ✅ **Authentication**: Standard email/password login
- ✅ **Subscription Status**: Returns active RevenueCat subscription info
- ✅ **Support Style Check**: Indicates if user has configured support mode
- ✅ **Mobile Optimized**: FCM token support for push notifications
- ✅ **Session Caching**: Redis-based session caching for performance

---

## 🔌 Endpoint Specification

### POST `/api/v1/login/individual-user`

**Authentication**: None (public endpoint)  
**Rate Limit**: 5 attempts per 15 minutes

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "password123",
  "fcmToken": "optional_fcm_token_for_push_notifications"
}
```

#### Response Structure

```json
{
  "success": true,
  "code": 200,
  "message": "Individual user logged in successfully",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "user",
      "isEmailVerified": true,
      "subscriptionType": "individual",
      "profile": {
        "_id": "64f5a1b2c3d4e5f6g7h8i9j1",
        "supportMode": "calm",
        "notificationStyle": "gentle",
        "age": 25,
        "gender": "male"
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "accessTokenExpiresAt": "2026-03-30T12:00:00.000Z",
      "refreshTokenExpiresAt": "2026-04-06T12:00:00.000Z"
    },
    "subscription": {
      "isSubscribed": true,
      "status": "active",
      "plan": {
        "_id": "64f5a1b2c3d4e5f6g7h8i9j2",
        "subscriptionName": "Individual Monthly",
        "subscriptionType": "individual",
        "amount": "10.99",
        "currency": "USD",
        "duration": "monthly"
      },
      "currentPeriodStartDate": "2026-03-01T00:00:00.000Z",
      "expirationDate": "2026-04-01T00:00:00.000Z",
      "paymentGateway": "revenuecat",
      "purchasePlatform": "ios"
    },
    "isSupportStyleSet": true
  }
}
```

#### Response When Not Subscribed

```json
{
  "success": true,
  "code": 200,
  "message": "Individual user logged in successfully",
  "data": {
    "user": { ... },
    "tokens": { ... },
    "subscription": {
      "isSubscribed": false,
      "status": null,
      "plan": null,
      "message": "No active subscription found"
    },
    "isSupportStyleSet": false
  }
}
```

---

## 🎯 Frontend Flow (Mobile App)

### Login Flow Decision Tree

```
┌─────────────┐
│   User      │
│   Login     │
└────────────┘
       │ POST /login/individual-user
       ↓
┌─────────────┐
│   Backend   │
│   Response  │
└──────┬──────┘
       │
       ├─► isSubscribed = false?
       │   └─► Navigate to Subscription Purchase Page
       │
       ├─► isSupportStyleSet = false?
       │   └─► Navigate to Support Style Selection
       │
       └─► isSubscribed = true AND isSupportStyleSet = true?
           └─► Navigate to Home Screen
```

### Implementation Example (Flutter)

```dart
class LoginService {
  Future<LoginResponse> loginIndividualUser(
    String email, 
    String password,
    String? fcmToken,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/login/individual-user'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        if (fcmToken != null) 'fcmToken': fcmToken,
      }),
    );

    final result = jsonDecode(response.body);

    if (result['success']) {
      return LoginResponse.fromJson(result['data']);
    } else {
      throw Exception(result['message']);
    }
  }

  void handleLoginResponse(LoginResponse response) {
    // Store tokens
    SecureStorage.saveToken('accessToken', response.tokens.accessToken);
    SecureStorage.saveToken('refreshToken', response.tokens.refreshToken);

    // Check subscription status
    if (!response.subscription.isSubscribed) {
      // Navigate to subscription purchase page
      navigator.pushNamed('/purchase-subscription');
      return;
    }

    // Check support style
    if (!response.isSupportStyleSet) {
      // Navigate to support style selection
      navigator.pushNamed('/select-support-style');
      return;
    }

    // All good - navigate to home
    navigator.pushNamed('/home');
  }
}

// Response models
class LoginResponse {
  final User user;
  final Tokens tokens;
  final Subscription subscription;
  final bool isSupportStyleSet;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      user: User.fromJson(json['user']),
      tokens: Tokens.fromJson(json['tokens']),
      subscription: Subscription.fromJson(json['subscription']),
      isSupportStyleSet: json['isSupportStyleSet'],
    );
  }
}

class Subscription {
  final bool isSubscribed;
  final String? status;
  final Plan? plan;
  final DateTime? currentPeriodStartDate;
  final DateTime? expirationDate;
  final String? paymentGateway;
  final String? purchasePlatform;

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      isSubscribed: json['isSubscribed'],
      status: json['status'],
      plan: json['plan'] != null ? Plan.fromJson(json['plan']) : null,
      currentPeriodStartDate: json['currentPeriodStartDate'] != null 
        ? DateTime.parse(json['currentPeriodStartDate']) 
        : null,
      expirationDate: json['expirationDate'] != null 
        ? DateTime.parse(json['expirationDate']) 
        : null,
      paymentGateway: json['paymentGateway'],
      purchasePlatform: json['purchasePlatform'],
    );
  }
}
```

---

## 🗄️ Database Queries

### Subscription Status Query

The endpoint queries `UserSubscription` collection for active subscriptions:

```javascript
// Find active RevenueCat subscription
db.UserSubscription.findOne({
  userId: ObjectId("64f5a1b2c3d4e5f6g7h8i9j0"),
  status: { $in: ["active", "trialing"] },
  paymentGateway: "revenuecat",
  isDeleted: false
})
.sort({ createdAt: -1 })
.populate("subscriptionPlanId")
```

### Support Style Check

Checks if `supportMode` is set in `UserProfile`:

```javascript
// Support mode must be one of: "calm", "encouraging", "logical"
const isSupportStyleSet = !!(
  userProfile?.supportMode &&
  ["calm", "encouraging", "logical"].includes(userProfile.supportMode)
);
```

---

## 🔐 Security Features

### Rate Limiting
- **5 login attempts per 15 minutes** (same as `/login/v2`)
- Uses Redis-based rate limiter

### Email Verification
- Users must verify email before logging in
- Unverified users receive OTP via email

### Session Management
- Redis session caching for performance
- Session TTL: 7 days (matches refresh token expiry)
- FCM token tracking for device management

### Token Security
- JWT access and refresh tokens
- Refresh token stored in HTTP-only cookie
- Token rotation on refresh

---

## 📊 Subscription Status Values

| Status | Description | Frontend Action |
|--------|-------------|-----------------|
| `active` | Subscription is active | Grant full access |
| `trialing` | Free trial period | Grant full access, show trial end date |
| `cancelled` | Cancelled but still valid | Show warning, expiration date |
| `past_due` | Payment failed | Show payment update prompt |
| `expired` | Subscription expired | Redirect to purchase page |
| `null` | No subscription | Redirect to purchase page |

---

## 🎨 Support Style Values

| Support Mode | Description | Communication Style |
|--------------|-------------|---------------------|
| `calm` | Gentle guidance | Peaceful reminders, soothing encouragement |
| `encouraging` | Positive energy | Motivational reminders, uplifting support |
| `logical` | Rational approach | Clear, fact-based guidance |

---

## 🧪 Testing

### Test with cURL

```bash
# Test login with subscription
curl -X POST http://localhost:6730/api/v1/login/individual-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fcmToken": "test_fcm_token_123"
  }'

# Test login without subscription (new user)
curl -X POST http://localhost:6730/api/v1/login/individual-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123"
  }'
```

### Test with Postman

1. **Method**: POST
2. **URL**: `http://localhost:6730/api/v1/login/individual-user`
3. **Headers**: `Content-Type: application/json`
4. **Body** (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "password123",
  "fcmToken": "optional_token"
}
```

### Expected Test Scenarios

| Scenario | Email | Expected Response |
|----------|-------|-------------------|
| ✅ Valid credentials | verified@example.com | 200 OK with tokens |
| ❌ Invalid credentials | wrong@example.com | 401 Unauthorized |
| ❌ Unverified email | unverified@example.com | 400 Bad Request + OTP sent |
| ❌ Deleted account | deleted@example.com | 401 Unauthorized |
| ✅ With subscription | subscribed@example.com | 200 OK + subscription data |
| ✅ Without subscription | new@example.com | 200 OK + isSubscribed: false |

---

## 🚨 Error Responses

### Invalid Credentials
```json
{
  "success": false,
  "code": 401,
  "message": "Invalid credentials"
}
```

### Email Not Verified
```json
{
  "success": false,
  "code": 400,
  "message": "Please verify your email before logging in. A verification OTP has been sent to your email."
}
```

### Account Deleted
```json
{
  "success": false,
  "code": 401,
  "message": "Your account is deleted. Please create a new account."
}
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "code": 429,
  "message": "Too many login attempts. Please try again later."
}
```

---

## 📝 Implementation Files

### Modified Files

1. **`src/modules/auth/auth.service.ts`**
   - Added `loginIndividualUser()` method
   - Fetches subscription from `UserSubscription` collection
   - Checks support mode in `UserProfile`

2. **`src/modules/auth/auth.controller.ts`**
   - Added `loginIndividualUser` controller
   - Handles request/response formatting

3. **`src/modules/auth/auth.routes.ts`**
   - Added route: `POST /login/individual-user`

4. **`src/modules/auth/auth.validations.ts`**
   - Added `individualUserLoginValidationSchema`
   - Validates email, password, and optional fcmToken

---

## 🔄 Comparison with Other Login Endpoints

| Feature | `/login` | `/login/v2` | `/login/individual-user` |
|---------|----------|-------------|-------------------------|
| **Target** | Web (Legacy) | Web (Parent/Child) | Mobile (Individual) |
| **FCM Token** | Optional | Optional | Optional |
| **Subscription Status** | ❌ No | ❌ No | ✅ Yes |
| **Support Style Check** | ❌ No | ❌ No | ✅ Yes |
| **Session Caching** | ❌ No | ✅ Yes | ✅ Yes |
| **Device Tracking** | ❌ No | ✅ Yes | ✅ Yes |

---

## 🎯 Frontend Integration Checklist

- [ ] Store access token securely (Keychain/Keystore)
- [ ] Store refresh token in secure storage
- [ ] Check `isSubscribed` flag on login
- [ ] Check `isSupportStyleSet` flag on login
- [ ] Implement navigation logic based on flags
- [ ] Handle subscription purchase flow
- [ ] Implement support style selection screen
- [ ] Add token refresh mechanism
- [ ] Handle logout (clear tokens)
- [ ] Implement FCM token handling

---

## 📚 Related Documentation

- [RevenueCat Setup Guide](../subscription.module/revenueCat/SETUP_GUIDE.md)
- [Subscription Purchase Flow](../subscription.module/SUBSCRIPTION_PURCHASE_FLOW.md)
- [User Profile Schema](../user.module/userProfile/userProfile.interface.ts)
- [User Subscription Model](../subscription.module/userSubscription/userSubscription.model.ts)

---

**Created**: 2026-03-30  
**Author**: Backend Development Team  
**Version**: 1.0.0
