# 🚀 Task Management Backend - NestJS + Mongoose

**1000x Scalable Enterprise Backend** | Express → NestJS Migration Learning Project

---

## 📚 **Project Purpose**

This is a **NestJS + Mongoose** re-implementation of the Express.js backend (`task-management-backend-template/`), designed for:

1. ✅ **Learning**: Understand Express → NestJS transition
2. ✅ **Scalability**: Built for 100K+ concurrent users, 10M+ tasks
3. ✅ **Enterprise Patterns**: Dependency injection, decorators, modular architecture
4. ✅ **Comparison**: Side-by-side comparison with Express.js patterns

---

## 🗂️ **Folder Structure**

```
task-mgmt-nest-mongoose/
├── src/
│   ├── common/                    # Shared utilities
│   │   ├── decorators/            # Custom decorators (@User(), @Role())
│   │   ├── filters/               # Exception filters
│   │   ├── guards/                # Auth guards, Role guards
│   │   ├── interceptors/          # Response transformation, logging
│   │   ├── pipes/                 # Validation pipes
│   │   └── middleware/            # Express-compatible middleware
│   ├── config/                    # Configuration modules
│   ├── database/                  # MongoDB/Mongoose setup
│   ├── modules/                   # Feature modules
│   │   ├── auth/                  # Authentication module
│   │   ├── task/                  # Task module (with SubTask)
│   │   ├── user/                  # User module
│   │   ├── childrenBusinessUser/  # Parent-Child relationships
│   │   ├── analytics/             # Analytics & charts
│   │   ├── notification/          # Notifications
│   │   ├── subscription/          # Subscription plans
│   │   └── payment/               # Payment processing
│   └── main.ts                    # Application entry point
├── test/                          # E2E tests
├── __Documentation/               # Documentation
├── figma-asset/                   # Figma references
└── postman-collections/           # API testing
```

---

## 🎓 **Express → NestJS Transition Guide**

### **Module Comparison**

| Aspect | Express.js | NestJS |
|--------|-----------|--------|
| **Routing** | `router.get()` | `@Get()` decorator |
| **Middleware** | `app.use()` | `@UseGuards()`, `@UseInterceptors()` |
| **Validation** | Zod schema | `class-validator` + Pipes |
| **Error Handling** | Try-catch blocks | Exception Filters |
| **Dependency Injection** | Manual | Automatic (Constructor injection) |
| **Module Structure** | Manual organization | `@Module()` decorator |

---

### **Example: Auth Controller**

#### **Express.js Pattern** (`task-management-backend-template/`)

```typescript
// auth.controller.ts
const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  const result = await AuthService.login(email, password);
  
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
  
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged in successfully',
    data: result,
  });
});
```

#### **NestJS Pattern** (`task-mgmt-nest-mongoose/`)

```typescript
// auth.controller.ts
@Post('login')
@HttpCode(HttpStatus.OK)
@UseInterceptors(TransformResponseInterceptor)
async login(
  @Body() loginDto: LoginDto,
  @Res({ passthrough: true }) response: Response,
) {
  const result = await this.authService.login(loginDto.email, loginDto.password);
  
  response.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
  
  return result;
}
```

**Key Differences**:
- ✅ Decorators (`@Post`, `@Body`, `@Res`)
- ✅ DTO for validation
- ✅ Interceptors for response transformation
- ✅ Automatic dependency injection

---

### **Example: Service**

#### **Express.js Pattern**

```typescript
// auth.service.ts
export const AuthService = {
  login: async (email: string, password: string) => {
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new ApiError(401, 'Invalid credentials');
    
    const isValid = await bcryptjs.compare(password, user.password);
    if (!isValid) throw new ApiError(401, 'Invalid credentials');
    
    const tokens = await TokenService.accessAndRefreshToken(user);
    return { user, tokens };
  },
};
```

#### **NestJS Pattern**

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    private bcryptService: BcryptService,
    private tokenService: TokenService,
  ) {}
  
  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email }).select('+password').exec();
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const isValid = await this.bcryptService.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    
    const tokens = await this.tokenService.generateTokens(user);
    return { user, tokens };
  }
}
```

**Key Differences**:
- ✅ `@Injectable()` decorator
- ✅ Constructor dependency injection
- ✅ Explicit model injection
- ✅ Standard NestJS exceptions

---

## 🏗️ **Architecture Principles**

### **1. Modular Design**
Each feature is a self-contained module:
```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  exports: [AuthService],
})
export class AuthModule {}
```

### **2. Dependency Injection**
No manual instantiation - NestJS manages it:
```typescript
constructor(
  private authService: AuthService,
  private userService: UserService,
) {}
```

### **3. Decorator-Based Routing**
Clear, readable routes:
```typescript
@Get('tasks')
@UseGuards(AuthGuard, RoleGuard('business', 'child'))
@RateLimit('user')
async getTasks(@User() user: UserPayload, @Query() query: TaskQueryDto) {
  return this.taskService.getTasks(user.userId, query);
}
```

### **4. Automatic Validation**
DTOs with `class-validator`:
```typescript
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}
```

---

## 📊 **Scalability Features**

| Feature | Implementation |
|---------|---------------|
| **Redis Caching** | Cache-aside pattern with TTL |
| **Rate Limiting** | Redis-based sliding window |
| **Queue (BullMQ)** | Heavy operations → background jobs |
| **MongoDB Indexes** | Compound indexes for all queries |
| **Horizontal Scaling** | Stateless design, Redis sessions |
| **Observability** | Structured logging, health checks |

---

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+
- MongoDB 6+
- Redis 7+

### **Installation**

```bash
cd task-mgmt-nest-mongoose

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run start:dev
```

### **Environment Variables**

```bash
# Server
NODE_ENV=development
PORT=6733

# Database
MONGODB_URI=mongodb://localhost:27017/task-mgmt-nest

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

---

## 📝 **Development Workflow**

### **1. Create New Module**

```bash
# Generate module
nest g module modules/feature-name
nest g controller modules/feature-name
nest g service modules/feature-name
```

### **2. Add Documentation**

Every module gets a `/doc` folder:
```
modules/feature-name/
├── doc/
│   ├── dia/           # Mermaid diagrams
│   ├── perf/          # Performance reports
│   └── README.md      # Module documentation
```

### **3. Write Tests**

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

---

## 📚 **Learning Resources**

### **Express → NestJS Migration**

| Topic | Express File | NestJS File |
|-------|-------------|-------------|
| **Auth Module** | `src/modules/auth/` | `src/modules/auth/` |
| **Task Module** | `src/modules/task.module/` | `src/modules/task/` |
| **User Module** | `src/modules/user.module/` | `src/modules/user/` |

### **Documentation**

- [NestJS Official Docs](https://docs.nestjs.com)
- [Express vs NestJS Comparison](./__Documentation/qwen/EXPRESS_NESTJS_COMPARISON.md)
- [Module Architecture Guide](./__Documentation/qwen/MODULE_ARCHITECTURE.md)

---

## 🎯 **Module Status**

| Module | Status | Express Equivalent |
|--------|--------|-------------------|
| **Auth** | 🟡 In Progress | `src/modules/auth/` |
| **User** | ⚪ Pending | `src/modules/user.module/` |
| **Task** | ⚪ Pending | `src/modules/task.module/` |
| **ChildrenBusinessUser** | ⚪ Pending | `src/modules/childrenBusinessUser.module/` |
| **Analytics** | ⚪ Pending | `src/modules/analytics.module/` |
| **Notification** | ⚪ Pending | `src/modules/notification.module/` |

---

## 📅 **Generation Plan**

### **Phase 1: Foundation** ✅
- [x] Project structure
- [x] Core configuration
- [ ] Auth module (START HERE)

### **Phase 2: Core Modules**
- [ ] User module
- [ ] Task module
- [ ] ChildrenBusinessUser module

### **Phase 3: Advanced**
- [ ] Analytics module
- [ ] Notification module
- [ ] Subscription/Payment module

---

## ⚠️ **Known Issues & Considerations**

1. **Virtual Populate**: Needs special handling in NestJS + Mongoose
2. **Generic Controller**: Creating NestJS-style generic controller
3. **Validation**: Migrating from Zod to class-validator
4. **Middleware**: Converting Express middleware to NestJS guards/interceptors

---

## 📊 **Performance Targets**

| Metric | Target | Current (Express) | Target (NestJS) |
|--------|--------|-------------------|-----------------|
| **Response Time (GET)** | < 200ms | 150ms | < 150ms |
| **Response Time (POST)** | < 500ms | 350ms | < 300ms |
| **Concurrent Users** | 100K+ | 100K+ | 100K+ |
| **Cache Hit Rate** | > 80% | 85% | > 85% |

---

**Last Updated**: 17-03-26  
**Version**: 1.0.0 - Foundation  
**Status**: 🟡 In Progress

---
-17-03-26
