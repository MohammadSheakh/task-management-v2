# 🔗 Chapter 7: OAuth Integration - Complete Guide

**Version**: 1.0  
**Date**: 22-03-26  
**Difficulty**: Advanced  
**Prerequisites**: Chapter 2 (Login), Chapter 4 (JWT Tokens), Chapter 6 (Password Management)  

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ How OAuth 2.0 works
- ✅ Google login flow (step-by-step)
- ✅ Apple login flow (step-by-step)
- ✅ Token encryption (AES-256-CBC)
- ✅ Account linking (local + OAuth)
- ✅ New user registration via OAuth
- ✅ OAuth security best practices
- ✅ Testing OAuth flows
- ✅ Debugging OAuth issues
- ✅ OAuth vs traditional authentication

---

## 📊 Big Picture: OAuth Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    OAUTH INTEGRATION                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Traditional Auth vs OAuth                               │  │
│  │                                                          │  │
│  │  Traditional (Email/Password):                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ User registers with email/password                 │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ System stores hashed password                      │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ User logs in with password                         │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ System verifies password hash                      │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  OAuth (Social Login):                                  │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ User clicks "Login with Google"                    │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ Google authenticates user                          │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ Google returns ID token                            │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ System verifies Google token                       │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ System creates/finds user account                  │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OAuth Providers                                         │  │
│  │  ┌──────────────────┐  ┌──────────────────┐             │  │
│  │  │  Google OAuth    │  │  Apple Sign-In   │             │  │
│  │  │                  │  │                  │             │  │
│  │  │ • Google account │  │ • Apple ID       │             │  │
│  │  │ • Gmail email    │  │ • Private relay  │             │  │
│  │  │ • Profile photo  │  │ • Name (first)   │             │  │
│  │  │ • Name           │  │ • Email (relay)  │             │  │
│  │  └──────────────────┘  └──────────────────┘             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 How OAuth 2.0 Works

### **OAuth Flow:**

```
┌─────────────────────────────────────────────────────────┐
│              OAUTH 2.0 AUTHORIZATION CODE FLOW           │
│                                                          │
│  1. User clicks "Login with Google"                     │
│     ↓                                                    │
│  2. Redirect to Google OAuth consent screen              │
│     ↓                                                    │
│  3. User logs in with Google                            │
│     ↓                                                    │
│  4. User grants permissions                             │
│     ↓                                                    │
│  5. Google redirects back with authorization code       │
│     ↓                                                    │
│  6. Backend exchanges code for ID token                 │
│     ↓                                                    │
│  7. Backend verifies ID token                           │
│     ↓                                                    │
│  8. Backend extracts user info from token               │
│     ↓                                                    │
│  9. Backend creates/finds user account                  │
│     ↓                                                    │
│  10. Backend generates JWT tokens                       │
│     ↓                                                    │
│  11. User logged in                                     │
└─────────────────────────────────────────────────────────┘
```

### **Why OAuth?**

```
Advantages:
┌─────────────────────────────────────────────────┐
│ ✓ No password to remember                      │
│ ✓ Faster registration (1-click)                │
│ ✓ Higher conversion rates                      │
│ ✓ Trusted provider (Google/Apple)              │
│ ✓ Email verified by provider                   │
│ ✓ Less security liability                      │
└─────────────────────────────────────────────────┘

Disadvantages:
┌─────────────────────────────────────────────────┐
│ ✗ Dependency on third-party                    │
│ ✗ Less control over user data                  │
│ ✗ Provider can revoke access                   │
│ ✗ Privacy concerns (data sharing)              │
└─────────────────────────────────────────────────┘
```

---

## 🔗 Google Login Implementation

### **Step 1: Google OAuth Setup**

**Prerequisites:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Get Client ID and Client Secret
6. Add authorized redirect URIs

**Environment Variables:**
```bash
# .env
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
OAUTH_ENCRYPTION_KEY=your-32-character-secret-key
```

---

### **Step 2: Encryption Utility**

**File**: `src/utils/encryption.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-in-production-32';
const IV_LENGTH = 16; // AES block size

/**
 * Encrypt OAuth token before storing
 */
export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt OAuth token
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const decipher = createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
    iv
  );
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Check if text is encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const parts = text.split(':');
  if (parts.length !== 2) {
    return false;
  }
  
  // Check if IV is valid hex (16 bytes = 32 hex chars)
  const ivPattern = /^[0-9a-f]{32}$/;
  const dataPattern = /^[0-9a-f]+$/;
  
  return ivPattern.test(parts[0]) && dataPattern.test(parts[1]);
}
```

**Why Encrypt OAuth Tokens?**
```
Security Risk (Plain Text):
┌─────────────────────────────────────────────────┐
│  Database breached                              │
│    ↓                                             │
│  OAuth tokens exposed                           │
│    ↓                                             │
│  Attacker can:                                  │
│  • Impersonate user on Google                   │
│  • Access user's Google data                    │
│  • Use tokens on other services                 │
└─────────────────────────────────────────────────┘

Solution (Encryption):
┌─────────────────────────────────────────────────┐
│  Database breached                              │
│    ↓                                             │
│  Encrypted tokens exposed                       │
│    ↓                                             │
│  Attacker sees:                                 │
│  a1b2c3d4...:encrypted-data-hex                 │
│    ↓                                             │
│  Cannot decrypt without key                     │
│  AES-256-CBC encryption                         │
│  Billions of years to crack                     │
└─────────────────────────────────────────────────┘
```

---

### **Step 3: OAuth Account Service**

**File**: `src/modules/user.module/oauthAccount/oauthAccount.service.ts`

```typescript
import { OAuthAccount } from './oauthAccount.model';
import { OAuth2Client } from 'google-auth-library';
import { encrypt, decrypt } from '../../../utils/encryption';
import { TAuthProvider } from '../../auth/auth.constants';

export class OAuthAccountService {
  private static googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  /**
   * Encrypt OAuth token before storing
   */
  private encryptToken(token: string): string {
    if (!token) return '';
    return encrypt(token);
  }

  /**
   * Decrypt OAuth token for use
   */
  private decryptToken(encryptedToken: string): string {
    if (!encryptedToken) return '';
    return decrypt(encryptedToken);
  }

  /**
   * Create OAuth account with encrypted tokens
   */
  async createOAuthAccount(
    userId: string,
    authProvider: TAuthProvider,
    providerId: string,
    email: string,
    accessToken: string,
    isVerified: boolean = true,
  ): Promise<OAuthAccount> {
    const encryptedAccessToken = this.encryptToken(accessToken);

    return await OAuthAccount.create({
      userId,
      authProvider,
      providerId,
      email,
      accessToken: encryptedAccessToken,  // ✅ Encrypted
      isVerified,
      lastUsedAt: new Date(),
    });
  }

  /**
   * Update OAuth account tokens (encrypted)
   */
  async updateOAuthTokens(
    oAuthAccountId: string,
    accessToken: string,
  ): Promise<OAuthAccount> {
    const encryptedAccessToken = this.encryptToken(accessToken);

    return await OAuthAccount.findByIdAndUpdate(
      oAuthAccountId,
      {
        accessToken: encryptedAccessToken,
        lastUsedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Get decrypted access token
   */
  async getDecryptedAccessToken(oAuthAccountId: string): Promise<string> {
    const account = await OAuthAccount.findById(oAuthAccountId)
      .select('+accessToken');

    if (!account) {
      throw new Error('OAuth account not found');
    }

    return this.decryptToken(account.accessToken || '');
  }

  /**
   * Verify Google ID token
   */
  async verifyGoogleToken(idToken: string) {
    const ticket = await OAuthAccountService.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload()!;

    return {
      provider: TAuthProvider.google,
      providerId: payload.sub,  // Google's unique user ID
      email: payload.email!,
      name: payload.name,
      picture: payload.picture,
    };
  }
}
```

---

### **Step 4: Google Login Flow**

**File**: `src/modules/auth/auth.service.ts`

```typescript
import { OAuthAccountService } from '../user.module/oauthAccount/oauthAccount.service';
import { OAuthAccount } from '../user.module/oauthAccount/oauthAccount.model';
import { User } from '../user.module/user/user.model';
import { UserProfile } from '../user.module/userProfile/userProfile.model';
import { TokenService } from '../token/token.service';
import { TAuthProvider } from './auth.constants';

const oAuthAccountService = new OAuthAccountService();

const googleLogin = async ({ 
  idToken, 
  role, 
  acceptTOC 
}: IGoogleLoginPayload) => {
  // Step 1: Verify Google token
  const { provider, providerId, email, name, picture } =
    await oAuthAccountService.verifyGoogleToken(idToken);

  if (!email || !providerId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Email or provider ID missing',
    );
  }

  // Step 2: Check if Google account already exists
  let googleAccount = await OAuthAccount.findOne({
    authProvider: TAuthProvider.google,
    providerId,
  }).populate('userId');

  if (googleAccount && googleAccount.userId) {
    // ✅ Existing Google user → Log in
    const user = await User.findById(googleAccount.userId);
    
    if (!user || user.isDeleted) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'User not found or deactivated',
      );
    }

    // Update token (encrypted)
    await oAuthAccountService.updateOAuthTokens(googleAccount._id, idToken);

    const tokens = await TokenService.accessAndRefreshToken(user);
    const { hashedPassword, ...userWithoutPassword } = user.toObject();

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  // Step 3: Check for existing LOCAL account with same email
  const localUser = await User.findOne({
    email: email.toLowerCase(),
    hashedPassword: { $ne: null },  // has password → local account
  });

  if (localUser) {
    // 🔄 Auto-link if email is verified
    if (localUser.isEmailVerified) {
      // 🔗 Link Google to existing local user
      await oAuthAccountService.createOAuthAccount(
        localUser._id,
        TAuthProvider.google,
        providerId,
        email.toLowerCase(),
        idToken,
        true,
      );

      const tokens = await TokenService.accessAndRefreshToken(localUser);
      const { hashedPassword, ...userWithoutPassword } = localUser.toObject();

      return {
        user: userWithoutPassword,
        tokens,
        isLinked: true,
      };
    } else {
      // 🛑 Don't auto-link if email isn't verified
      throw new ApiError(
        StatusCodes.CONFLICT,
        'An account with this email exists. Please verify your email first.',
      );
    }
  }

  // Step 4: No existing account → Create new user
  if (!role) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Role is required for new Google signup',
    );
  }
  
  if (!acceptTOC) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You must accept Terms and Conditions',
    );
  }

  // Create profile
  const userProfile = await UserProfile.create({ acceptTOC: true });

  // Create user (no password needed for OAuth)
  const newUser = await User.create({
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    isEmailVerified: true,  // ✅ Google verified email
    role,
    authProvider: TAuthProvider.google,
    profileId: userProfile._id,
    profileImage: picture ? { imageUrl: picture } : undefined,
  });

  // Link profile back
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId: userProfile._id,
    userId: newUser._id,
  });

  // Create OAuth account (encrypted token)
  await oAuthAccountService.createOAuthAccount(
    newUser._id,
    TAuthProvider.google,
    providerId,
    email.toLowerCase(),
    idToken,
    true,
  );

  const tokens = await TokenService.accessAndRefreshToken(newUser);
  const { hashedPassword, ...userWithoutPassword } = newUser.toObject();

  return {
    user: userWithoutPassword,
    tokens,
    isNewUser: true,
  };
};
```

---

### **Step 5: Google Login Flow Diagram**

```
┌─────────────────────────────────────────────────┐
│  1. Client: User Clicks "Login with Google"     │
│  Google Sign-In SDK                             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  2. Google: User Authenticates                  │
│  Google OAuth consent screen                    │
│  User grants permissions                        │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  3. Google: Returns ID Token                    │
│  JWT token containing:                          │
│  • sub (providerId)                             │
│  • email                                        │
│  • name                                         │
│  • picture                                      │
│  • email_verified                               │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  4. Client: Sends ID Token to Backend           │
│  POST /auth/google-login                        │
│  { "idToken": "eyJhbGciOiJSUzI1NiIs..." }      │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  5. Backend: Verify Google Token                │
│  googleAuth.verifyIdToken({                     │
│    idToken,                                     │
│    audience: GOOGLE_CLIENT_ID                   │
│  })                                             │
│                                                 │
│  Extract: providerId, email, name, picture      │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  6. Backend: Check Existing OAuth Account       │
│  OAuthAccount.findOne({                         │
│    authProvider: 'google',                      │
│    providerId                                   │
│  })                                             │
│                                                 │
│  If exists → Login user                         │
│  If not → Continue to step 7                    │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  7. Backend: Check Existing Local Account       │
│  User.findOne({                                 │
│    email,                                       │
│    hashedPassword: { $ne: null }                │
│  })                                             │
│                                                 │
│  If exists → Link Google account                │
│  If not → Create new user                       │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  8. Backend: Create New User (if needed)        │
│  User.create({                                  │
│    email,                                       │
│    name,                                        │
│    isEmailVerified: true,                       │
│    authProvider: 'google',                      │
│    role                                         │
│  })                                             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  9. Backend: Create OAuth Account               │
│  OAuthAccount.create({                          │
│    userId,                                      │
│    authProvider: 'google',                      │
│    providerId,                                  │
│    email,                                       │
│    accessToken: encrypt(idToken),  🔒           │
│    isVerified: true                             │
│  })                                             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  10. Backend: Generate JWT Tokens               │
│  TokenService.accessAndRefreshToken(user)       │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  11. Backend: Return Response                   │
│  {                                              │
│    "success": true,                             │
│    "user": { _id, name, email, role },          │
│    "tokens": {                                  │
│      "accessToken": "...",                      │
│      "refreshToken": "..."                      │
│    },                                           │
│    "isNewUser": true                            │
│  }                                              │
└─────────────────────────────────────────────────┘
```

---

## 🍎 Apple Login Implementation

### **Apple Sign-In Setup:**

**Prerequisites:**
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create App ID with Sign In with Apple capability
3. Create Service ID
4. Generate private key
5. Get Team ID, Client ID, Key ID
6. Configure domains

**Environment Variables:**
```bash
# .env
APPLE_CLIENT_ID=com.example.taskmanagement
APPLE_TEAM_ID=ABC123DEF4
APPLE_KEY_ID=XYZ789
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
```

---

### **Apple Login Flow:**

**File**: `src/modules/auth/auth.service.ts`

```typescript
import appleSignin from 'apple-signin-auth';

const appleLogin = async ({ 
  idToken, 
  role, 
  acceptTOC 
}: IGoogleLoginPayload) => {
  // Step 1: Verify Apple ID token
  const applePayload = await appleSignin.verifyIdToken(idToken, {
    audience: process.env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  });

  const { sub: providerId, email } = applePayload;
  
  // ⚠️ Apple only sends email on FIRST login
  // After that, email is null (privacy protection)
  if (!email) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Email not provided by Apple. Please use "Sign in with Apple" on the same device.',
    );
  }

  // Step 2: Check if Apple account already exists
  let appleAccount = await OAuthAccount.findOne({
    authProvider: TAuthProvider.apple,
    providerId,
  }).populate('userId');

  if (appleAccount && appleAccount.userId) {
    // ✅ Existing Apple user → Log in
    const user = await User.findById(appleAccount.userId);
    
    if (!user || user.isDeleted) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'User not found or deactivated',
      );
    }

    // Update token (encrypted)
    await oAuthAccountService.updateOAuthTokens(appleAccount._id, idToken);

    const tokens = await TokenService.accessAndRefreshToken(user);
    const { hashedPassword, ...userWithoutPassword } = user.toObject();

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  // Step 3: Check for existing LOCAL account with same email
  const localUser = await User.findOne({
    email: email.toLowerCase(),
    hashedPassword: { $ne: null },
  });

  if (localUser) {
    // 🔄 Auto-link if email is verified
    if (localUser.isEmailVerified) {
      await oAuthAccountService.createOAuthAccount(
        localUser._id,
        TAuthProvider.apple,
        providerId,
        email.toLowerCase(),
        idToken,
        true,
      );

      const tokens = await TokenService.accessAndRefreshToken(localUser);
      const { hashedPassword, ...userWithoutPassword } = localUser.toObject();

      return {
        user: userWithoutPassword,
        tokens,
        isLinked: true,
      };
    } else {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'An account with this email exists. Please verify your email first.',
      );
    }
  }

  // Step 4: No existing account → Create new user
  if (!role) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Role is required for new Apple signup',
    );
  }
  
  if (!acceptTOC) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You must accept Terms and Conditions',
    );
  }

  // Create profile
  const userProfile = await UserProfile.create({ acceptTOC: true });

  // Create user (Apple doesn't provide name in token after first login)
  const newUser = await User.create({
    name: email.split('@')[0],  // Use email prefix as name
    email: email.toLowerCase(),
    isEmailVerified: true,  // ✅ Apple verified email
    role,
    authProvider: TAuthProvider.apple,
    profileId: userProfile._id,
  });

  // Link profile back
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId: userProfile._id,
    userId: newUser._id,
  });

  // Create OAuth account (encrypted token)
  await oAuthAccountService.createOAuthAccount(
    newUser._id,
    TAuthProvider.apple,
    providerId,
    email.toLowerCase(),
    idToken,
    true,
  );

  const tokens = await TokenService.accessAndRefreshToken(newUser);
  const { hashedPassword, ...userWithoutPassword } = newUser.toObject();

  return {
    user: userWithoutPassword,
    tokens,
    isNewUser: true,
  };
};
```

---

### **Apple Privacy Features:**

```
┌─────────────────────────────────────────────────┐
│  Apple Sign-In Privacy Features                 │
│                                                  │
│  1. Email Privacy                               │
│  • Email only sent on FIRST login               │
│  • Subsequent logins: email = null              │
│  • Must store email in OAuthAccount             │
│                                                  │
│  2. Private Relay Email                         │
│  • User can choose "Hide My Email"              │
│  • Apple generates relay email:                 │
│    abc123def456@privaterelay.appleid.com        │
│  • Apple forwards to user's real email          │
│  • User can disable relay anytime               │
│                                                  │
│  3. Name Privacy                                │
│  • Name only sent on FIRST login                │
│  • Subsequent logins: name = null               │
│  • Must store name on first login               │
└─────────────────────────────────────────────────┘
```

---

## 🔗 Account Linking

### **What is Account Linking?**

```
Scenario:
┌─────────────────────────────────────────────────┐
│  User registers with email/password             │
│  john@example.com / SecurePass123!              │
│                                                 │
│  Later, user wants to login with Google         │
│  john@example.com (same email)                  │
│                                                 │
│  Question: Create new account or link?          │
│                                                 │
│  Answer: LINK to existing account!              │
└─────────────────────────────────────────────────┘
```

### **Account Linking Flow:**

```typescript
// Check for existing local account
const localUser = await User.findOne({
  email: email.toLowerCase(),
  hashedPassword: { $ne: null },  // Has password = local account
});

if (localUser) {
  // Check if email is verified
  if (localUser.isEmailVerified) {
    // ✅ Auto-link accounts
    await oAuthAccountService.createOAuthAccount(
      localUser._id,
      TAuthProvider.google,
      providerId,
      email,
      idToken,
      true,
    );
    
    return {
      user: localUser,
      tokens,
      isLinked: true,  // ← Indicates account was linked
    };
  } else {
    // 🛑 Don't auto-link unverified emails
    throw new ApiError(
      StatusCodes.CONFLICT,
      'An account with this email exists. Please verify your email first.',
    );
  }
}
```

### **Why Link Accounts?**

```
Benefits:
┌─────────────────────────────────────────────────┐
│ ✓ Single account (no duplicates)               │
│ ✓ Login with either method                     │
│ ✓ All data in one place                        │
│ ✓ Better user experience                       │
│ ✓ No account confusion                         │
└─────────────────────────────────────────────────┘

Security:
┌─────────────────────────────────────────────────┐
│ • Only link if email verified                  │
│ • Prevents account hijacking                   │
│ • User must prove email ownership              │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Testing OAuth Flows

### **Test 1: Google Login (New User)**

```bash
# Get Google ID token from client (Flutter/Web)
# Then send to backend

curl -X POST http://localhost:5000/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "role": "user",
    "acceptTOC": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Google login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "authProvider": "google"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    },
    "isNewUser": true
  }
}
```

---

### **Test 2: Google Login (Existing User)**

```bash
# Same Google account, second login
curl -X POST http://localhost:5000/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "role": "user",
    "acceptTOC": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... },
    "isNewUser": false  // ← Existing user
  }
}
```

---

### **Test 3: Account Linking**

```bash
# 1. Register with email/password
curl -X POST http://localhost:5000/auth/register ...

# 2. Verify email
curl -X POST http://localhost:5000/auth/verify-email ...

# 3. Login with Google (same email)
curl -X POST http://localhost:5000/auth/google-login ...
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... },
    "isLinked": true  // ← Account was linked
  }
}
```

---

### **Test 4: Check Encrypted Token**

```bash
mongosh

# Find OAuth account
db.oauthaccounts.findOne({ 
  providerId: "google-provider-id" 
})

// Expected:
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "authProvider": "google",
  "providerId": "123456789",
  "email": "john@example.com",
  "accessToken": "a1b2c3d4...:encrypted-hex-data",  // ← Encrypted!
  "isVerified": true,
  "lastUsedAt": ISODate("...")
}
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **OAuth 2.0 Flow**: Authorization code flow
2. ✅ **Google Login**: ID token verification
3. ✅ **Apple Login**: Privacy features (email relay)
4. ✅ **Token Encryption**: AES-256-CBC encryption
5. ✅ **Account Linking**: Local + OAuth accounts
6. ✅ **New User Registration**: Via OAuth
7. ✅ **Existing User Login**: Via OAuth
8. ✅ **Security Best Practices**: Email verification, encryption
9. ✅ **Testing**: OAuth flows
10. ✅ **Debugging**: MongoDB checks

### **Key Files:**

| File | Purpose |
|------|---------|
| `encryption.ts` | AES-256-CBC encryption |
| `oauthAccount.service.ts` | OAuth account management |
| `oauthAccount.model.ts` | OAuth account schema |
| `auth.service.ts` | Google/Apple login |

### **Security Features:**

- ✅ Token encryption (AES-256-CBC)
- ✅ Email verification required for linking
- ✅ Provider token verification
- ✅ Account linking security
- ✅ Privacy protection (Apple)

### **Next Chapter:**

→ [Chapter 8: Security Features](./LEARN_AUTH_08_SECURITY.md)

---

**Created**: 22-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide
