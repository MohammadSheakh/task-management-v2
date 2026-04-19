# 🔐 OTP Quick Reference Guide

## ✅ Quick Start

```typescript
import { OtpV2WithRedis } from '../otp/otp-v2.service';

const otpService = new OtpV2WithRedis();
```

---

## 📦 Methods

### 1. Send Verification OTP

```typescript
await otpService.sendVerificationOtp('user@example.com');
// ✅ Sends email automatically
// ✅ Stores hashed OTP in Redis (10 min TTL)
// ✅ Rate limiting: 3 sends/hour, 60s cooldown
```

### 2. Verify OTP

```typescript
await otpService.verifyOtp('user@example.com', '123456');
// ✅ Returns true if valid
// ✅ Deletes OTP from Redis on success
// ✅ Max 5 attempts per OTP
```

### 3. Send Password Reset OTP

```typescript
await otpService.sendResetPasswordOtp('user@example.com');
// ✅ Sends email automatically
// ✅ Stores hashed OTP in Redis (10 min TTL)
```

### 4. Verify Password Reset OTP

```typescript
await otpService.verifyResetPasswordOtp('user@example.com', '123456');
// ✅ Returns true if valid
// ✅ Deletes OTP from Redis on success
```

### 5. Clear OTP Data (Admin/Emergency)

```typescript
await otpService.clearOtpData('user@example.com');
// ✅ Removes all OTP data from Redis
```

---

## 🔧 Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `OTP_TTL` | 600s (10 min) | OTP expiration time |
| `OTP_COOLDOWN_TTL` | 60s | Time between resend requests |
| `OTP_SEND_LIMIT` | 3 | Max OTP sends per hour |
| `OTP_MAX_ATTEMPTS` | 5 | Max verification attempts |
| `BCRYPT_SALT_ROUNDS` | 10 | Bcrypt hashing rounds |

---

## 🛡️ Rate Limiting

### Cooldown Check
```
Request OTP → Check cooldown (60s) → If active: 429 Error
```

### Hourly Send Limit
```
Check send count → If >= 3/hour → 429 Error
```

### Max Verify Attempts
```
Check attempts → If >= 5 → Delete OTP → 429 Error
```

---

## 🔑 Redis Keys

```
otp:verify:{email}       → Verification OTP (hash + attempts)
otp:reset:{email}        → Password reset OTP (hash + attempts)
otp:cooldown:{email}     → Cooldown flag
otp:send_count:{email}   → Hourly send counter
```

---

## ⚠️ Error Handling

```typescript
try {
  await otpService.sendVerificationOtp('user@example.com');
} catch (error) {
  if (error.statusCode === 429) {
    // Rate limit exceeded
    console.log('Too many requests:', error.message);
  } else if (error.statusCode === 400) {
    // Invalid input
    console.log('Bad request:', error.message);
  } else {
    // Server error
    console.log('Server error:', error.message);
  }
}
```

---

## 🧪 Testing

### Test OTP Flow

```typescript
// 1. Send OTP
await otpService.sendVerificationOtp('test@example.com');

// 2. Check Redis (optional)
const otpData = await redisClient.get('otp:verify:test@example.com');
console.log('OTP stored:', JSON.parse(otpData));

// 3. Verify OTP (replace with actual OTP from email)
await otpService.verifyOtp('test@example.com', '123456');
```

### Test Rate Limiting

```typescript
// Test cooldown (send twice within 60s)
try {
  await otpService.sendVerificationOtp('test@example.com');
  await otpService.sendVerificationOtp('test@example.com'); // 429 Error
} catch (error) {
  console.log('Cooldown active:', error.message);
}

// Test hourly limit (send 4 times)
for (let i = 0; i < 4; i++) {
  try {
    await otpService.sendVerificationOtp('test@example.com');
  } catch (error) {
    console.log(`Attempt ${i + 1}:`, error.message);
  }
}

// Test max attempts (verify with wrong OTP 6 times)
for (let i = 0; i < 6; i++) {
  try {
    await otpService.verifyOtp('test@example.com', '000000');
  } catch (error) {
    console.log(`Attempt ${i + 1}:`, error.message);
  }
}
```

---

## 📊 Monitoring

### Check Redis Keys

```bash
redis-cli
KEYS otp:*
# Shows all active OTP keys
```

### Check TTL

```bash
redis-cli
TTL otp:verify:test@example.com
# Shows remaining time in seconds
```

### Monitor Commands

```bash
redis-cli MONITOR
# Watch all Redis commands in real-time
```

---

## 🔗 Integration Examples

### Registration Flow

```typescript
// In auth.service.ts
const createUser = async (userData, userProfileId) => {
  const existingUser = await User.findOne({ email: userData.email });
  
  if (existingUser && !existingUser.isEmailVerified) {
    await User.findOneAndUpdate({ email: userData.email }, userData);
    const verificationToken = await TokenService.createVerifyEmailToken(existingUser);
    
    // ✅ Send OTP via email
    await otpService.sendVerificationOtp(existingUser.email);
    
    return { verificationToken };
  }
  
  // Create new user
  userData.password = await bcryptjs.hash(userData.password, 12);
  const user = await User.create(userData);
  
  // ✅ Send OTP in parallel with token creation
  const [verificationToken] = await Promise.all([
    TokenService.createVerifyEmailToken(user),
    otpService.sendVerificationOtp(user.email)
  ]);
  
  return { user, verificationToken };
};
```

### Email Verification Flow

```typescript
// In auth.service.ts
const verifyEmail = async (email, token, otp) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  
  // Verify token
  await TokenService.verifyToken(token, config.token.TokenSecret, TokenType.VERIFY);
  
  // ✅ Verify OTP
  await otpService.verifyOtp(user.email, otp);
  
  // Mark email as verified
  user.isEmailVerified = true;
  await user.save();
  
  const tokens = await TokenService.accessAndRefreshToken(user);
  return { user, tokens };
};
```

### Password Reset Flow

```typescript
// In auth.service.ts
const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  
  // Invalidate sessions
  const sessionPattern = `session:${user._id}:*`;
  const keys = await redisClient.keys(sessionPattern);
  if (keys.length > 0) await redisClient.del(keys);
  
  // Create reset token
  const resetPasswordToken = await TokenService.createResetPasswordToken(user);
  
  // ✅ Send OTP via email
  await otpService.sendResetPasswordOtp(user.email);
  
  user.isResetPassword = true;
  user.lastPasswordChange = new Date();
  await user.save();
  
  return { resetPasswordToken };
};

const resetPassword = async (email, newPassword, otp) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  
  // ✅ Verify OTP
  await otpService.verifyResetPasswordOtp(user.email, otp);
  
  // Reset password
  user.password = await bcryptjs.hash(newPassword, 12);
  user.lastPasswordChange = new Date();
  user.isResetPassword = false;
  await user.save();
  
  // Invalidate sessions
  const sessionPattern = `session:${user._id}:*`;
  const keys = await redisClient.keys(sessionPattern);
  if (keys.length > 0) await redisClient.del(keys);
  
  const { password, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};
```

---

## 📝 Notes

- ✅ **Email sending is synchronous** - Consider moving to BullMQ queue for production
- ✅ **OTPs are automatically deleted** after 10 minutes (Redis TTL)
- ✅ **Rate limiting is per email** - Different emails have separate limits
- ✅ **Failed attempts are tracked** - Resets when new OTP is generated
- ✅ **OTPs are hashed** - Never stored in plain text

---

**Last Updated**: 26-03-23  
**Status**: ✅ Production Ready
