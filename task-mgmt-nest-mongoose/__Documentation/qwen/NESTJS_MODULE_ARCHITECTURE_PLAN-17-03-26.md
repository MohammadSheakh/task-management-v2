# 🏗️ **NestJS Module Architecture Plan**

**Senior-Level, Clean, Scalable, Industry-Standard Design**

---

## 🎯 **Core Philosophy**

1. ✅ **Separation of Concerns** - Auth ≠ User Management
2. ✅ **Domain-Driven Design** - Group by business domain
3. ✅ **Single Responsibility** - Each module does ONE thing well
4. ✅ **Clear Dependencies** - No circular dependencies
5. ✅ **Scalability** - Easy to add new features
6. ✅ **Redis for Short-Term Data** - OTP, sessions, tokens (NOT MongoDB)

---

## 🗂️ **MODULE ARCHITECTURE**

### **Tier 1: Core Infrastructure Modules** (Shared by all)

```
src/
├── common/                       # ⭐ SHARED UTILITIES
│   ├── decorators/               # @User(), @Role(), @Public()
│   ├── filters/                  # Global exception filters
│   ├── guards/                   # AuthGuard, RoleGuard, ThrottleGuard
│   ├── interceptors/             # TransformResponse, Logging, Cache
│   ├── pipes/                    # ValidationPipe, ParseObjectIdPipe
│   └── middleware/               # Express-compatible middleware
│
├── config/                       # ⭐ CONFIGURATION
│   ├── config.module.ts
│   ├── config.service.ts
│   └── env.validation.ts
│
├── database/                     # ⭐ DATABASE
│   ├── database.module.ts
│   ├── database.service.ts
│   └── mongoose.options.ts
│
└── helpers/                      # ⭐ SHARED HELPERS
    ├── redis/
    │   ├── redis.module.ts
    │   └── redis.service.ts
    ├── bullmq/
    │   ├── bullmq.module.ts
    │   └── bullmq.service.ts
    └── email/
        ├── email.module.ts
        └── email.service.ts
```

---

### **Tier 2: Authentication & User Management**

```
src/modules/
├── auth.module/                  # ⭐ AUTHENTICATION (Parent Module)
│   ├── auth.module.ts
│   ├── auth/                     # Core auth logic
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/           # Passport strategies
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── local.strategy.ts
│   │   │   ├── google.strategy.ts
│   │   │   └── apple.strategy.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   ├── refresh-token.dto.ts
│   │   │   └── forgot-password.dto.ts
│   │   └── entities/
│   │       └── token.entity.ts
│   │
│   ├── otp/                      # ⭐ OTP sub-module (REDIS-BASED)
│   │   ├── otp.service.ts        # Uses Redis, NOT MongoDB
│   │   ├── dto/
│   │   │   ├── create-otp.dto.ts
│   │   │   └── verify-otp.dto.ts
│   │   └── interfaces/
│   │       └── otp-payload.interface.ts
│   │
│   └── doc/
│       ├── dia/
│       ├── perf/
│       └── README.md
│
├── user.module/                  # ⭐ USER MANAGEMENT (Parent Module)
│   ├── user.module.ts
│   ├── user/                     # Core user entity
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.schema.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   │
│   ├── userProfile/              # User profile sub-module
│   │   ├── userProfile.service.ts
│   │   ├── userProfile.schema.ts
│   │   └── dto/
│   │       └── update-profile.dto.ts
│   │
│   ├── userDevices/              # Device tracking sub-module
│   │   ├── userDevices.service.ts
│   │   ├── userDevices.schema.ts
│   │   └── dto/
│   │       └── register-device.dto.ts
│   │
│   ├── userRoleData/             # Role-specific data sub-module
│   │   ├── userRoleData.service.ts
│   │   ├── userRoleData.schema.ts
│   │   └── entities/
│   │       └── userRoleData.entity.ts
│   │
│   ├── oAuthAccount/             # OAuth accounts sub-module
│   │   ├── oAuthAccount.service.ts
│   │   ├── oAuthAccount.schema.ts
│   │   └── entities/
│   │       └── oAuthAccount.entity.ts
│   │
│   └── doc/
│       ├── dia/
│       ├── perf/
│       └── README.md
```

---

### **Tier 3: Core Business Modules**

```
├── task.module/                  # ⭐ TASK MANAGEMENT (Parent Module)
│   ├── task.module.ts
│   ├── task/                     # Task sub-module
│   │   ├── task.controller.ts
│   │   ├── task.service.ts
│   │   ├── task.schema.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── subTask/                  # SubTask sub-module
│   │   ├── subTask.controller.ts
│   │   ├── subTask.service.ts
│   │   ├── subTask.schema.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   └── doc/
│
├── childrenBusinessUser.module/  # ⭐ PARENT-CHILD RELATIONSHIPS
│   ├── childrenBusinessUser.module.ts
│   ├── childrenBusinessUser.controller.ts
│   ├── childrenBusinessUser.service.ts
│   ├── childrenBusinessUser.schema.ts
│   ├── dto/
│   └── entities/
│
├── taskProgress.module/          # ⭐ TASK PROGRESS TRACKING
│   ├── taskProgress.module.ts
│   ├── taskProgress.controller.ts
│   ├── taskProgress.service.ts
│   ├── taskProgress.schema.ts
│   ├── dto/
│   └── entities/
│
├── notification.module/          # ⭐ NOTIFICATIONS
│   ├── notification.module.ts
│   ├── notification.controller.ts
│   ├── notification.service.ts
│   ├── notification.schema.ts
│   ├── dto/
│   └── entities/
│
├── analytics.module/             # ⭐ ANALYTICS & CHARTS
│   ├── analytics.module.ts
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   ├── dto/
│   └── doc/
```

---

### **Tier 4: Payment & Subscription**

```
├── payment.module/               # ⭐ PAYMENTS (Parent Module)
│   ├── payment.module.ts
│   ├── payment/                  # Payment processing
│   │   ├── payment.controller.ts
│   │   ├── payment.service.ts
│   │   ├── payment.schema.ts
│   │   └── dto/
│   │
│   ├── subscription/             # Subscription plans
│   │   ├── subscription.controller.ts
│   │   ├── subscription.service.ts
│   │   ├── subscription.schema.ts
│   │   └── dto/
│   │
│   ├── stripeWebhook/            # Stripe webhooks
│   │   ├── stripeWebhook.controller.ts
│   │   └── stripeWebhook.service.ts
│   │
│   └── doc/
```

---

### **Tier 5: Infrastructure Modules**

```
├── health.module/                # ⭐ HEALTH CHECKS
│   ├── health.controller.ts
│   └── health.service.ts
│
└── app.module.ts                 # ⭐ ROOT MODULE
```

---

## 📊 **MODULE DEPENDENCY GRAPH**

```
┌─────────────────────────────────────────────────────────┐
│                    app.module.ts                        │
│  (Imports all Tier 1 + Tier 2 modules globally)         │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  auth.module  │ │  user.module  │ │   database    │
│               │ │               │ │    module     │
│  - JWT        │ │  - User CRUD  │ │               │
│  - OAuth      │ │  - Profile    │ │  - MongoDB    │
│  - Redis OTP  │ │  - Devices    │ │  - Redis      │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │
        └────────┬────────┘
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  task.module  │ │  children     │ │ notification  │
│               │ │  BusinessUser │ │    module     │
│  - Task CRUD  │ │               │ │               │
│  - SubTask    │ │  - Relations  │ │  - Push       │
│  - Progress   │ │  - Permissions│ │  - Email      │
└───────────────┘ └───────────────┘ └───────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  analytics    │ │  payment      │ │   health      │
│    module     │ │    module     │ │    module     │
│               │ │               │ │               │
│  - Charts     │ │  - Stripe     │ │  - DB Check   │
│  - Reports    │ │  - Subs       │ │  - Redis      │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## 🎯 **KEY DESIGN DECISIONS**

### **1. Auth Module (Separate from User)**

**Why Separate?**
- ✅ **Security** - Auth logic isolated from user management
- ✅ **Reusability** - Auth can be used by other services
- ✅ **Testing** - Test auth independently
- ✅ **Scalability** - Auth can be extracted to microservice

```typescript
// auth.module.ts - Handles authentication ONLY
@Module({
  imports: [
    UserModule,  // Needs user data
    JwtModule,
    PassportModule,
    RedisModule, // For OTP storage
  ],
  providers: [AuthService, JwtService, BcryptService, OtpService],
  controllers: [AuthController],
  exports: [AuthService],  // Export for other modules
})
```

---

### **2. OTP Storage: Redis NOT MongoDB** ⭐ **IMPORTANT**

**Why Redis?**
- ✅ **Short-Term Data** - OTPs expire in 10-20 minutes
- ✅ **Auto-Expiry** - Redis TTL automatically deletes expired OTPs
- ✅ **Fast Access** - In-memory storage (sub-millisecond)
- ✅ **No Database Clutter** - No need to clean up old OTPs
- ✅ **Atomic Operations** - Redis INCR for attempt counting
- ✅ **Scalability** - Redis handles high concurrency

**Redis OTP Structure**:
```typescript
// OTP Key Format
otp:verify:{email}     → { otp: '123456', expiresAt: timestamp }
otp:reset:{email}      → { otp: '654321', expiresAt: timestamp }

// TTL: 10 minutes (600 seconds)
await redisClient.setEx(`otp:verify:${email}`, 600, otpData);

// Auto-deleted by Redis after 10 minutes
```

**OTP Service (Redis-Based)**:
```typescript
// otp.service.ts
@Injectable()
export class OtpService {
  constructor(@Inject(REDIS_CLIENT) private redisClient: Redis) {}
  
  async createOtp(email: string, type: 'verify' | 'reset'): Promise<string> {
    const otp = this.generateOtp();
    const key = `otp:${type}:${email}`;
    
    // Store in Redis with 10-minute TTL
    await this.redisClient.setEx(
      key,
      600, // 10 minutes
      JSON.stringify({
        otp,
        createdAt: Date.now(),
        attempts: 0,
      })
    );
    
    return otp;
  }
  
  async verifyOtp(email: string, otp: string, type: string): Promise<boolean> {
    const key = `otp:${type}:${email}`;
    const data = await this.redisClient.get(key);
    
    if (!data) {
      throw new BadRequestException('OTP expired or not found');
    }
    
    const parsed = JSON.parse(data);
    
    if (parsed.otp !== otp) {
      // Increment attempt counter
      parsed.attempts += 1;
      await this.redisClient.setEx(key, 600, JSON.stringify(parsed));
      
      if (parsed.attempts >= 5) {
        await this.redisClient.del(key);
        throw new BadRequestException('Too many failed attempts');
      }
      
      throw new BadRequestException('Invalid OTP');
    }
    
    // OTP verified - delete it
    await this.redisClient.del(key);
    return true;
  }
}
```

**Comparison: Redis vs MongoDB for OTP**

| Aspect | Redis | MongoDB |
|--------|-------|---------|
| **Storage Type** | In-memory (fast) | Disk-based (slower) |
| **TTL** | Automatic | Manual cleanup needed |
| **Access Speed** | < 1ms | 5-10ms |
| **Concurrency** | Excellent | Good |
| **Data Persistence** | Not needed (short-term) | Overkill for OTP |
| **Cleanup** | Automatic | Manual cron job |
| **Cost** | Low (shared Redis) | Higher (DB storage) |

**Verdict**: ✅ **Redis is the clear winner for OTP storage**

---

### **3. User Module (Parent with Sub-Modules)**

**Why Parent Module?**
- ✅ **Domain Cohesion** - All user-related logic together
- ✅ **Shared DTOs** - Common user DTOs
- ✅ **Single Import** - Import `UserModule` and get everything
- ✅ **Clear Boundaries** - User domain is self-contained

```typescript
// user.module.ts - PARENT MODULE
@Module({
  imports: [
    UserSubModule,
    UserProfileSubModule,
    UserDevicesSubModule,
    UserRoleDataSubModule,
    OAuthAccountSubModule,
  ],
  exports: [
    UserService,
    UserProfileService,
    UserDevicesService,
  ],
})
export class UserModule {}
```

---

### **4. Task Module (Task + SubTask Together)**

**Why Grouped?**
- ✅ **Business Logic** - Tasks and SubTasks are inseparable
- ✅ **Virtual Populate** - Easy to configure relationship
- ✅ **Transaction Support** - Task + SubTask operations in one transaction
- ✅ **Performance** - Fewer queries with virtual populate

---

### **5. ChildrenBusinessUser Module (Separate)**

**Why Separate?**
- ✅ **Different Domain** - Relationship management ≠ User management
- ✅ **Different Permissions** - Different access control rules
- ✅ **Scalability** - Can be extracted to separate service later
- ✅ **Clarity** - Clear separation between "users" and "relationships"

---

### **6. Notification Module (Separate)**

**Why Separate?**
- ✅ **Cross-Cutting** - Used by ALL modules
- ✅ **Queue-Based** - BullMQ processor
- ✅ **Multi-Channel** - Email, Push, In-App
- ✅ **Scalability** - Can handle high volume independently

---

## 📝 **MODULE IMPORT STRATEGY**

### **Global Modules** (Imported once in `app.module.ts`)

```typescript
// app.module.ts
@Module({
  imports: [
    // Tier 1: Infrastructure (Global)
    ConfigModule,
    DatabaseModule,
    RedisModule,
    BullMQModule,
    EmailModule,
    
    // Tier 2: Core
    AuthModule,
    UserModule,
    
    // Tier 3: Business
    TaskModule,
    ChildrenBusinessUserModule,
    NotificationModule,
    AnalyticsModule,
    
    // Tier 4: Payment
    PaymentModule,
    
    // Tier 5: Infrastructure
    HealthModule,
  ],
})
export class AppModule {}
```

### **Feature Module Imports** (Import only what's needed)

```typescript
// task.module.ts
@Module({
  imports: [
    // Need User module to populate assigned users
    UserModule,
    
    // Need Notification module to send task notifications
    NotificationModule,
    
    // MongoDB collections
    MongooseModule.forFeature([
      { name: 'Task', schema: TaskSchema },
      { name: 'SubTask', schema: SubTaskSchema },
    ]),
  ],
})
```

---

## 🔧 **SENIOR-LEVEL PATTERNS**

### **1. Dependency Injection**

```typescript
// ✅ GOOD: Constructor injection
@Injectable()
export class TaskService {
  constructor(
    @InjectModel('Task') private taskModel: Model<TaskDocument>,
    private notificationService: NotificationService,
    private cacheService: CacheService,
  ) {}
}
```

### **2. Module Boundaries**

```typescript
// ✅ GOOD: Clear boundaries
// Task module doesn't know about User module internals
// It only uses exported services

// ❌ BAD: Circular dependencies
// Task imports User, User imports Task
```

### **3. Shared Common Module**

```typescript
// common.module.ts
@Module({
  providers: [
    // Shared services available globally
    CacheService,
    LoggerService,
    ValidationService,
  ],
  exports: [
    CacheService,
    LoggerService,
    ValidationService,
  ],
})
export class CommonModule {}
```

---

## 📊 **COMPARISON: Express vs NestJS**

| Aspect | Express.js | NestJS (Proposed) |
|--------|-----------|-------------------|
| **Auth** | Separate module | Separate module (better isolated) |
| **OTP Storage** | MongoDB ❌ | Redis ✅ |
| **User** | Flat structure | Parent module with sub-modules |
| **Task** | Flat with subTask | Parent module with sub-modules |
| **Dependencies** | Manual | Automatic (DI) |
| **Testing** | Manual setup | Built-in testing module |
| **Scalability** | Good | Excellent (modular) |

---

## ✅ **WHY THIS IS SENIOR-LEVEL**

1. ✅ **Domain-Driven Design** - Modules match business domains
2. ✅ **Clear Boundaries** - No module knows too much about others
3. ✅ **Scalability** - Easy to extract modules to microservices
4. ✅ **Testability** - Each module can be tested independently
5. ✅ **Maintainability** - Clear structure, easy to find code
6. ✅ **Industry Standard** - Follows NestJS best practices
7. ✅ **Future-Proof** - Ready for growth and changes
8. ✅ **Smart Data Storage** - Redis for short-term (OTP), MongoDB for long-term

---

## 📝 **NEXT STEPS**

**Ready to start Auth Module migration with:**
- ✅ Redis-based OTP service (NOT MongoDB)
- ✅ JWT authentication
- ✅ OAuth strategies (Google, Apple)
- ✅ Refresh token rotation
- ✅ Complete documentation with Express → NestJS comparison

**Ready to proceed?** 🚀

---

**Last Updated**: 17-03-26  
**Version**: 1.0.0  
**Status**: 🟡 Ready to Start

---
-17-03-26
