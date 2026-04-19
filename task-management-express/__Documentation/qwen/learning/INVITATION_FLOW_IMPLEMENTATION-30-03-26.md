# 🎓 INVITATION FLOW - Learning Implementation

**Date**: 30-03-26  
**Purpose**: Educational implementation (does NOT replace current flow)  
**Status**: ✅ **IMPLEMENTED FOR LEARNING**

---

## 📚 WHAT YOU'LL LEARN

By studying this implementation, you'll learn:

1. ✅ **Deep linking** for mobile apps (iOS + Android)
2. ✅ **Token-based activation** system
3. ✅ **Invitation email** with magic links
4. ✅ **Pending account** state management
5. ✅ **Universal Links** (iOS) / **App Links** (Android)
6. ✅ **Secure token generation** and verification
7. ✅ **Two-step account creation** flow

---

## 🔄 INVITATION FLOW DIAGRAM

```
┌─────────────┐
│   Parent    │
│  (Business  │
│    User)    │
└──────┬──────┘
       │ 1. Choose "Child sets own password"
       ↓
┌─────────────────────────────────┐
│  POST /children-business-users/ │
│         children/invite         │
│                                 │
│  {                              │
│    name: "Alax Morgn",          │
│    email: "alax@example.com",   │
│    ...other fields              │
│  }                              │
└──────┬──────────────────────────┘
       │ 2. Create PENDING account
       ↓
┌─────────────────────────────────┐
│  Backend:                       │
│  ✅ Create User (status: pending) │
│  ✅ Generate activation token   │
│  ✅ Store token in Redis (24h)  │
│  ✅ Send invitation email       │
└──────┬──────────────────────────┘
       │ 3. Email sent
       ↓
┌─────────────────────────────────┐
│  Child receives email:          │
│  "You're invited! 🎉"           │
│                                 │
│  [Download App] [Activate]      │
│                                 │
│  Link:                          │
│  https://app.taskmgmt.com/      │
│  activate?token=abc123xyz       │
└──────┬──────────────────────────┘
       │ 4. Child clicks link
       ↓
┌─────────────────────────────────┐
│  Deep Link Behavior:            │
│                                 │
│  If app installed:              │
│  → Opens app directly           │
│  → Activation screen            │
│                                 │
│  If app NOT installed:          │
│  → Opens App Store/Play Store   │
│  → User installs app            │
│  → Opens app automatically      │
└──────┬──────────────────────────┘
       │ 5. App opens activation screen
       ↓
┌─────────────────────────────────┐
│  Activation Screen:             │
│  ┌───────────────────────────┐ │
│  │  Set Your Password        │ │
│  │                           │ │
│  │  Password: [__________]   │ │
│  │  Confirm:  [__________]   │ │
│  │                           │ │
│  │  [Activate Account]       │ │
│  └───────────────────────────┘ │
└──────┬──────────────────────────┘
       │ 6. Child sets password
       ↓
┌─────────────────────────────────┐
│  POST /activate-account         │
│  {                              │
│    token: "abc123xyz",          │
│    password: "MyPass123!"       │
│  }                              │
└──────┬──────────────────────────┘
       │ 7. Verify & Activate
       ↓
┌─────────────────────────────────┐
│  Backend:                       │
│  ✅ Verify token (Redis)        │
│  ✅ Hash password               │
│  ✅ Update User (active)        │
│  ✅ Create UserProfile          │
│  ✅ Create relationship         │
│  ✅ Invalidate cache            │
│  ✅ Auto-login (return tokens)  │
└──────┬──────────────────────────┘
       │ 8. Success!
       ↓
┌─────────────┐
│   Child     │
│  Logged In  │
│  ✅         │
└─────────────┘
```

---

## 📂 FILES CREATED (FOR LEARNING)

```
src/modules/childrenBusinessUser.module/
├── childrenBusinessUser.route.ts          ← Added: POST /children/invite
├── childrenBusinessUser.controller.ts     ← Added: inviteChild method
├── childrenBusinessUser.service.ts        ← Added: inviteChildAccount method
├── childrenBusinessUser.validation.ts     ← Added: inviteChildValidationSchema
│
├── activation/
│   ├── activation.route.ts                ← NEW: POST /activate-account
│   ├── activation.controller.ts           ← NEW: Activation handler
│   ├── activation.service.ts              ← NEW: Token verification & activation
│   └── activation.token.service.ts        ← NEW: Token generation/validation
│
└── doc/
    └── INVITATION_FLOW_IMPLEMENTATION-30-03-26.md

src/helpers/
├── emailService.ts                        ← Added: sendInvitationEmail function
└── deepLink.service.ts                    ← NEW: Deep link generation

src/config/
└── deepLink.config.ts                     ← NEW: Deep link configuration
```

---

## 🔑 KEY CONCEPTS

### 1. **Pending Account State**

```typescript
// User model gets new status
{
  email: "alax@example.com",
  status: "pending",  // ← New state (not active yet)
  isEmailVerified: false,
  // ... other fields
}
```

### 2. **Activation Token**

```typescript
// Stored in Redis with 24h TTL
Key: "activation:token:abc123xyz"
Value: {
  email: "alax@example.com",
  name: "Alax Morgn",
  businessUserId: "parent-id",
  childData: { ... }
}
TTL: 86400 seconds (24 hours)
```

### 3. **Deep Link Structure**

```typescript
// Universal Link (iOS) / App Link (Android)
https://app.taskmgmt.com/activate?token=abc123xyz

// Falls back to:
// - App if installed
// - Website/App Store if not installed
```

### 4. **Token Verification**

```typescript
// On activation
const tokenData = await redisClient.get(`activation:token:${token}`);

if (!tokenData) {
  throw new ApiError(400, 'Invalid or expired token');
}

// Token valid for 24 hours only
```

---

## 🎯 API ENDPOINTS

### 1. **Send Invitation** (Parent)

```
POST /children-business-users/children/invite
Authorization: Bearer <parent-jwt-token>

Request:
{
  "name": "Alax Morgn",
  "email": "alax@example.com",
  "phoneNumber": "+1234567890",
  "location": "New York, USA",
  "gender": "male",
  "dateOfBirth": "2015-05-15",
  "supportMode": "calm"
}

Response (202 Accepted):
{
  "success": true,
  "data": {
    "message": "Invitation sent to alax@example.com",
    "expiresAt": "2026-03-31T10:00:00.000Z"
  }
}
```

### 2. **Activate Account** (Child)

```
POST /activate-account
No auth required (public endpoint)

Request:
{
  "token": "abc123xyz",
  "password": "MySecurePass123!"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "Alax Morgn",
      "email": "alax@example.com",
      "role": "child"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  },
  "message": "Account activated successfully! You're now logged in."
}
```

### 3. **Check Invitation Status** (Optional)

```
GET /children-business-users/invite/status/:token
No auth required

Response:
{
  "success": true,
  "data": {
    "status": "pending",  // or "activated" or "expired"
    "email": "alax@example.com",
    "name": "Alax Morgn",
    "expiresAt": "2026-03-31T10:00:00.000Z"
  }
}
```

---

## 📧 EMAIL TEMPLATE

```html
Subject: 🎉 You're invited to join Task Management!

Hi Alax,

Your parent has invited you to join Task Management!
This platform will help you manage your tasks and goals effectively.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 GET STARTED IN 3 STEPS:

1. Download the app
   [📱 Download on the App Store]
   [🤖 Get it on Google Play]

2. Activate your account
   [✅ Activate Now]
   
   Or click this link:
   https://app.taskmgmt.com/activate?token=abc123xyz

3. Set your password and start managing tasks!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ This invitation expires in 24 hours.

🔒 For security, please choose a strong password.

See you inside! 🚀

---
Task Management Team
```

---

## 🔐 SECURITY FEATURES

### 1. **Token Security**

```typescript
// Token generation
const token = crypto.randomBytes(32).toString('hex');
// Result: "a1b2c3d4e5f6..." (64 chars, very secure)

// Stored hashed in Redis (like passwords)
const hashedToken = await bcryptjs.hash(token, 10);
await redisClient.setEx(`activation:token:${hashedToken}`, 86400, data);
```

### 2. **Rate Limiting**

```typescript
// Prevent spam invitations
const inviteLimiter = rateLimiter('strict');
// 5 invitations per hour per parent
```

### 3. **Token Expiration**

```typescript
// Tokens expire after 24 hours
await redisClient.setEx(key, 86400, data);

// Expired tokens automatically deleted by Redis
```

### 4. **One-Time Use**

```typescript
// Token deleted after successful activation
await redisClient.del(`activation:token:${token}`);

// Reuse attempt → Error
if (!tokenData) {
  throw new ApiError(400, 'Token already used or expired');
}
```

---

## 🎨 FRONTEND INTEGRATION

### **Parent Dashboard (Web)**

```javascript
// Invite child (instead of creating directly)
const inviteChild = async (childData) => {
  const response = await axios.post(
    '/children-business-users/children/invite',
    childData,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.data;
};

// Usage
const handleInvite = async (formData) => {
  try {
    const result = await inviteChild(formData);
    toast.success(`Invitation sent to ${formData.email}!`);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Invite failed');
  }
};
```

### **Child Activation (Mobile App - Flutter)**

```dart
// Handle deep link
class ActivationScreen extends StatefulWidget {
  @override
  _ActivationScreenState createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  String? token;
  
  @override
  void initState() {
    super.initState();
    // Extract token from deep link
    getTokenFromLink();
  }
  
  Future<void> getTokenFromLink() async {
    final uri = await getInitialUri(); // From uni_links package
    if (uri != null) {
      final params = uri.queryParameters;
      setState(() {
        token = params['token'];
      });
    }
  }
  
  Future<void> activateAccount(String password) async {
    final response = await http.post(
      Uri.parse('https://api.taskmgmt.com/activate-account'),
      body: jsonEncode({
        'token': token,
        'password': password,
      }),
    );
    
    if (response.statusCode == 200) {
      // Auto-login with returned tokens
      final data = jsonDecode(response.body);
      await saveTokens(data['data']['tokens']);
      Navigator.pushReplacementNamed(context, '/home');
    }
  }
}
```

---

## 📊 COMPARISON: CURRENT vs INVITATION

| Feature | Current Flow | Invitation Flow |
|---------|--------------|-----------------|
| **Created by** | Parent | Parent (initiates), Child (completes) |
| **Password set by** | Parent | Child |
| **Account status** | Active immediately | Pending → Active |
| **Email sent** | With credentials | With activation link |
| **Token required** | ❌ No | ✅ Yes (24h expiry) |
| **Deep link** | ❌ No | ✅ Yes |
| **Steps for child** | 1. Login | 1. Click link → 2. Set password → 3. Login |
| **Security** | Good | Better (child owns password) |
| **Best for** | Young children (<13) | Teenagers (13+) |
| **Parent knows password** | ✅ Yes | ❌ No |

---

## ✅ LEARNING OUTCOMES

After studying this implementation, you'll understand:

1. ✅ **How to implement token-based activation**
   - Token generation
   - Redis storage with TTL
   - Verification on activation

2. ✅ **Deep linking for mobile apps**
   - Universal Links (iOS)
   - App Links (Android)
   - Fallback behavior

3. ✅ **Pending account state management**
   - User model extensions
   - State transitions
   - Cleanup of expired invitations

4. ✅ **Secure email invitations**
   - Magic link generation
   - Email template design
   - Token expiration handling

5. ✅ **Two-step account creation**
   - Parent initiates
   - Child completes
   - Automatic login after activation

---

## 🚀 NEXT STEPS (If You Want to Use It)

1. **Configure deep links** in your Flutter app
2. **Set up Universal Links** for iOS
3. **Set up App Links** for Android
4. **Test the flow** end-to-end
5. **Add optional toggle** in your Create Member form

---

## 📚 FILES TO STUDY

Start with these files in order:

1. `activation.token.service.ts` - Token generation
2. `childrenBusinessUser.service.ts` - inviteChildAccount method
3. `activation.service.ts` - Activation logic
4. `activation.controller.ts` - API endpoint
5. `emailService.ts` - Invitation email
6. `deepLink.config.ts` - Deep link configuration

---

**Document Generated**: 30-03-26  
**Purpose**: ✅ **EDUCATIONAL ONLY - Current flow unchanged**  
**Status**: Ready for learning!
