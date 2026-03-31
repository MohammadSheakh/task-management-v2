# Quick Fix Implementation Guide

**Created**: 31-03-26  
**Purpose**: Step-by-step code changes to fix the re-registration issue  
**Time Required**: 15-20 minutes  

---

## 🎯 PROBLEM SUMMARY

When you delete a user from MongoDB and try to re-register with the same email, you get:
```
"Please wait 10 seconds before requesting another OTP"
```

**Cause**: Redis OTP keys from previous registration still exist.

---

## ✅ QUICK FIX (15 minutes)

### Step 1: Add `clearAllOtpData` to OTP Service (3 minutes)

**File**: `src/modules/otp/otp-v2.service.ts`  
**Location**: Add after `clearOtpData()` method (around line 365)

```typescript
/**
 * Clear ALL OTP-related Redis keys for an email
 * Use this when deleting a user or before re-registration
 *
 * @param email - User's email address
 */
async clearAllOtpData(email: string): Promise<void> {
  const lowerEmail = email.toLowerCase().trim();
  
  const keys = [
    `otp:verify:${lowerEmail}`,
    `otp:reset:${lowerEmail}`,
    `otp:cooldown:${lowerEmail}`,
    `otp:send_count:${lowerEmail}`,
  ];

  await redisClient.del(keys);
  logger.info(`All OTP data cleared for ${lowerEmail}`);
}

/**
 * Clear cooldown only (for successful verification)
 * @param email - User's email address
 */
async clearCooldown(email: string): Promise<void> {
  const lowerEmail = email.toLowerCase().trim();
  await redisClient.del(`otp:cooldown:${lowerEmail}`);
  logger.info(`Cooldown cleared for ${lowerEmail}`);
}
```

---

### Step 2: Add Defensive Cleanup in createUserV2 (5 minutes)

**File**: `src/modules/auth/auth.service.ts`  
**Location**: Update `createUserV2` function (around line 170-210)

```typescript
const createUserV2 = async (userData: ICreateUser, userProfileId:string) => {

  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
    } else {
      await User.findOneAndUpdate({ email: userData.email }, userData);
      
      const verificationToken = await TokenService.createVerifyEmailToken(existingUser);
      
      // 🆕 DEFENSIVE: Clear stale OTP data before sending new OTP
      await otpService.clearAllOtpData(existingUser.email);
      
      await otpService.sendVerificationOtp(existingUser.email);
      return { verificationToken };
    }
  }

  userData.password = await bcryptjs.hash(userData.password, 12);
  const user = await User.create(userData);

  // 🆕 DEFENSIVE: Clear any stale OTP data before sending new OTP
  await otpService.clearAllOtpData(user.email);

  const [verificationToken] = await Promise.all([
    TokenService.createVerifyEmailToken(user),
    otpService.sendVerificationOtp(user.email)
  ]);

  return { user, verificationToken };
};
```

**Key Changes**:
- Line 20: Added `await otpService.clearAllOtpData(existingUser.email);`
- Line 32: Added `await otpService.clearAllOtpData(user.email);`

---

### Step 3: Test the Fix (7 minutes)

```bash
# 1. Restart your server
npm run dev

# 2. Test registration flow
curl -X POST http://localhost:5000/api/v1/register/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "role": "user",
    "acceptTOC": true
  }'

# 3. Delete user from MongoDB
mongosh
> use task-management
> db.users.deleteOne({ email: "test@example.com" })
> db.userprofiles.deleteOne({ userId: <userId> })

# 4. Immediately try to re-register (should work now!)
curl -X POST http://localhost:5000/api/v1/register/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "newpassword123",
    "name": "Test User 2",
    "role": "user",
    "acceptTOC": true
  }'

# Expected response: Success! No cooldown error ✅
```

---

## 🚀 OPTIONAL: Proper Cleanup (Add 10-15 minutes)

If you want to implement the **complete solution** (recommended for production):

### Step 4: Create User Redis Cleanup Utility (5 minutes)

**File**: `src/modules/auth/auth.service.ts`  
**Location**: Add before `AuthService` exports (around line 1100)

```typescript
/**
 * Clean up ALL Redis data for a user
 * Call this when deleting a user from database
 *
 * @param userId - User's MongoDB ID
 * @param email - User's email address
 */
async function cleanupUserRedisData(
  userId: string,
  email: string
): Promise<void> {
  try {
    const lowerEmail = email.toLowerCase().trim();
    
    // 1. Clear OTP data
    await otpService.clearAllOtpData(lowerEmail);
    
    // 2. Clear session data
    const sessionPattern = `session:${userId}:*`;
    const sessionKeys = await redisClient.keys(sessionPattern);
    if (sessionKeys.length > 0) {
      await redisClient.del(sessionKeys);
      logger.info(`Sessions cleared for user ${userId}`);
    }
    
    // 3. Clear user cache (if any)
    const userCacheKey = `user:${userId}:profile`;
    await redisClient.del(userCacheKey);
    
    logger.info(`Redis cleanup completed for user ${userId} (${lowerEmail})`);
  } catch (error) {
    errorLogger.error('Redis cleanup error:', error);
    // Don't throw - cleanup failure shouldn't block user deletion
  }
}
```

---

### Step 5: Update User Deletion Functions (10 minutes)

**Find your user deletion functions**:

```bash
grep -r "User.delete" src/modules/
grep -r "User.findByIdAndDelete" src/modules/
```

**Example Update** (adjust based on your actual code):

```typescript
// File: src/modules/user.module/user.service.ts (or wherever you delete users)

const deleteUser = async (userId: string) => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  
  // 🆕 Add Redis cleanup BEFORE MongoDB delete
  await cleanupUserRedisData(user._id, user.email);
  
  // Now delete from MongoDB
  await User.findByIdAndDelete(userId);
  await UserProfile.findByIdAndDelete(user.profileId);
  
  return { success: true };
};
```

---

## 🎯 EMERGENCY FIX (Right Now)

If you need to fix this **immediately** without code changes:

### Option 1: Manual Redis Cleanup

```bash
# Connect to Redis
redis-cli

# Delete the problematic keys
DEL otp:cooldown:test@example.com
DEL otp:verify:test@example.com
DEL otp:send_count:test@example.com
DEL otp:reset:test@example.com

# Exit
exit

# Now you can register!
```

### Option 2: Wait 60 Seconds

Just wait for the cooldown to expire naturally (TTL: 60 seconds).

---

## ✅ VERIFICATION CHECKLIST

After implementing the fix, verify:

```
✅ Can register new user
✅ Can delete user from MongoDB
✅ Can immediately re-register with same email
✅ No cooldown error
✅ OTP email received
✅ Can verify OTP and login
```

---

## 📊 EXPECTED RESULTS

### Before Fix
```
Registration → Delete → Re-register: ❌ FAILS (60s wait)
```

### After Fix
```
Registration → Delete → Re-register: ✅ SUCCESS (immediate)
```

---

## 📝 SUMMARY OF CHANGES

| File | Change | Lines |
|------|--------|-------|
| `otp-v2.service.ts` | Add `clearAllOtpData()` method | +15 |
| `otp-v2.service.ts` | Add `clearCooldown()` method | +7 |
| `auth.service.ts` | Clear OTP in `createUserV2()` (existing user) | +2 |
| `auth.service.ts` | Clear OTP in `createUserV2()` (new user) | +2 |
| **Total** | | **~26 lines** |

---

## 🐛 TROUBLESHOOTING

### Issue: Still getting cooldown error

**Check**: Did you restart the server after code changes?
```bash
# Restart server
npm run dev
```

### Issue: TypeScript errors

**Check**: Import `redisClient` and logger are available:
```typescript
import { redisClient } from "../../helpers/redis/redis";
import { logger, errorLogger } from '../../shared/logger';
```

### Issue: OTP email not received

**Check**: Email service is working, check logs:
```bash
# Watch logs
tail -f logs/app.log | grep "OTP"
```

---

## 📚 RELATED DOCUMENTATION

- [OTP-COOLDOWN-ISSUE-AND-SOLUTION-31-03-26.md](./OTP-COOLDOWN-ISSUE-AND-SOLUTION-31-03-26.md)
- [OTP-STALE-DATA-ISSUE-RE-REGISTRATION-31-03-26.md](./OTP-STALE-DATA-ISSUE-RE-REGISTRATION-31-03-26.md)
- [OTP-STALE-DATA-ISSUE-VISUAL-SUMMARY-31-03-26.md](./OTP-STALE-DATA-ISSUE-VISUAL-SUMMARY-31-03-26.md)

---

**Quick Fix Version**: 1.0  
**Implementation Time**: 15-20 minutes  
**Last Updated**: 31-03-26

---

-31-03-26
