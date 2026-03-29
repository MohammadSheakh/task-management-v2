# 🏗️ NOTIFICATION MODULE - PART 2 (Advanced Topics)

**Version**: 1.0.0 (NestJS)  
**Last Updated**: 26-03-29  
**Level**: Senior/Mastery

---

## 12. **SOCKET.IO REAL-TIME DELIVERY**

### **12.1 Socket Gateway Architecture**

```typescript
// socket.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationGateway implements OnModuleInit {
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    this.logger.log('✅ Notification Gateway initialized');
  }

  /**
   * Handle client connection
   */
  @SubscribeMessage('connect')
  async handleConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.logger.log(`Client connected: ${client.id} (user: ${data.userId})`);

    // Join user's personal room
    client.join(`user:${data.userId}`);

    // Store userId in socket data for later use
    client.data.userId = data.userId;

    // Send unread count
    const unreadCount = await this.getUnreadCount(data.userId);
    client.emit('unread-count', { count: unreadCount });
  }

  /**
   * Handle disconnection
   */
  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    client.leave(`user:${client.data.userId}`);
  }

  /**
   * Emit notification to specific user
   */
  async emitToUser(
    userId: string,
    event: string,
    data: any,
  ) {
    this.logger.debug(`Emitting ${event} to user ${userId}`);
    
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast to all users with specific role
   */
  async broadcastToRole(
    role: string,
    event: string,
    data: any,
  ) {
    this.logger.debug(`Broadcasting ${event} to role ${role}`);
    
    this.server.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  private async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `notifications:unread:${userId}`;
    const cached = await this.cacheManager.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    const count = await this.notificationModel.countDocuments({
      receiverId: userId,
      isRead: false,
      isDeleted: false,
    });

    await this.cacheManager.set(cacheKey, count, 300);
    return count;
  }
}
```

### **12.2 Socket Event Types**

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | Client → Server | `{ userId }` | Client connects |
| `disconnect` | Client → Server | - | Client disconnects |
| `notification:created` | Server → Client | `{ notificationId, title, message, type }` | New notification |
| `notification:read` | Server → Client | `{ notificationId }` | Notification marked read |
| `notification:deleted` | Server → Client | `{ notificationId }` | Notification deleted |
| `unread-count` | Server → Client | `{ count }` | Unread count update |

### **12.3 Client Integration Example**

```typescript
// Frontend (React/Angular/Vue)
import io from 'socket.io-client';

const socket = io(`${API_URL}/notifications`, {
  auth: { token: authToken },
});

// Connect
socket.emit('connect', { userId: currentUserId });

// Listen for new notifications
socket.on('notification:created', (data) => {
  // Update UI
  setNotifications(prev => [data, ...prev]);
  
  // Play sound
  playNotificationSound();
  
  // Show toast
  showToast(data.title, data.message);
  
  // Update badge
  updateUnreadBadge(prev => prev + 1);
});

// Listen for unread count updates
socket.on('unread-count', (data) => {
  setUnreadCount(data.count);
});

// Cleanup on unmount
useEffect(() => {
  return () => {
    socket.emit('disconnect');
    socket.disconnect();
  };
}, []);
```

---

## 13. **CACHING STRATEGY**

### **13.1 Cache Keys Structure**

```typescript
const CACHE_KEYS = {
  // Unread count per user
  unreadCount: (userId: string) => `notifications:unread:${userId}`,
  
  // Recent notifications list
  recentNotifications: (userId: string, page: number = 1) => 
    `notifications:user:${userId}:page:${page}`,
  
  // Notification detail
  notificationDetail: (notificationId: string) => 
    `notification:detail:${notificationId}`,
  
  // User notification preferences
  userPreferences: (userId: string) => 
    `notifications:preferences:${userId}`,
};
```

### **13.2 Cache TTL Configuration**

```typescript
const CACHE_TTL = {
  unreadCount: 300,           // 5 minutes
  recentNotifications: 180,   // 3 minutes
  notificationDetail: 600,    // 10 minutes
  userPreferences: 900,       // 15 minutes
};
```

### **13.3 Cache Implementation**

```typescript
@Injectable()
export class NotificationService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Get unread count with caching
   */
  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = CACHE_KEYS.unreadCount(userId);
    
    // Try cache first
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== null) {
      this.logger.debug(`Cache HIT for unread count: ${userId}`);
      return cached;
    }

    // Query database
    this.logger.debug(`Cache MISS for unread count: ${userId}`);
    const count = await this.notificationModel.countDocuments({
      receiverId: new Types.ObjectId(userId),
      isRead: false,
      isDeleted: false,
    });

    // Cache the result
    await this.cacheManager.set(cacheKey, count, CACHE_TTL.unreadCount);
    
    return count;
  }

  /**
   * Get notifications with pagination
   */
  async getNotifications(
    userId: string,
    options: { page: number; limit: number; unreadOnly: boolean },
  ): Promise<NotificationDocument[]> {
    const cacheKey = CACHE_KEYS.recentNotifications(userId, options.page);
    
    const cached = await this.cacheManager.get<NotificationDocument[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query: any = {
      receiverId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    if (options.unreadOnly) {
      query.isRead = false;
    }

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate('sender', 'name email profileImage')
      .lean();

    await this.cacheManager.set(cacheKey, notifications, CACHE_TTL.recentNotifications);
    
    return notifications;
  }

  /**
   * Invalidate cache when notification is read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(notificationId, {
      isRead: true,
      readAt: new Date(),
    });

    // Invalidate caches
    await Promise.all([
      this.cacheManager.del(CACHE_KEYS.unreadCount(userId)),
      this.cacheManager.del(CACHE_KEYS.recentNotifications(userId, 1)),
      this.cacheManager.del(CACHE_KEYS.recentNotifications(userId, 2)),
      this.cacheManager.del(CACHE_KEYS.recentNotifications(userId, 3)),
    ]);

    this.logger.debug(`Invalidated cache for user ${userId}`);
  }
}
```

### **13.4 Cache Invalidation Strategy**

```typescript
// When to invalidate:
// 1. New notification created → Invalidate recent notifications (page 1)
// 2. Notification marked as read → Invalidate unread count + recent notifications
// 3. Notification deleted → Invalidate recent notifications
// 4. User preferences changed → Invalidate user preferences

async invalidateUserCache(userId: string, options: {
  invalidateUnread?: boolean;
  invalidateRecent?: boolean;
  invalidatePreferences?: boolean;
} = {}) {
  const keysToDelete: string[] = [];

  if (options.invalidateUnread !== false) {
    keysToDelete.push(CACHE_KEYS.unreadCount(userId));
  }

  if (options.invalidateRecent !== false) {
    // Invalidate first 5 pages
    for (let page = 1; page <= 5; page++) {
      keysToDelete.push(CACHE_KEYS.recentNotifications(userId, page));
    }
  }

  if (options.invalidatePreferences !== false) {
    keysToDelete.push(CACHE_KEYS.userPreferences(userId));
  }

  await Promise.all(keysToDelete.map(key => this.cacheManager.del(key)));
}
```

---

## 14. **ERROR HANDLING & RETRY LOGIC**

### **14.1 Error Types**

```typescript
export enum NotificationErrorType {
  // Transient errors (retry)
  EMAIL_SERVICE_UNAVAILABLE = 'EMAIL_SERVICE_UNAVAILABLE',
  PUSH_SERVICE_UNAVAILABLE = 'PUSH_SERVICE_UNAVAILABLE',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Permanent errors (don't retry)
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  INVALID_CHANNEL = 'INVALID_CHANNEL',
  
  // Unknown errors (retry with backoff)
  UNKNOWN = 'UNKNOWN',
}
```

### **14.2 Retry Configuration**

```typescript
// BullMQ job configuration with retry logic
const jobConfig = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

// Custom retry logic based on error type
@Process('sendNotification')
async process(job: Job<NotificationJobData>) {
  try {
    await this.sendNotification(job.data);
  } catch (error) {
    const errorType = this.classifyError(error);
    
    if (errorType === NotificationErrorType.INVALID_RECIPIENT) {
      // Don't retry for invalid recipient
      this.logger.warn(`Invalid recipient, skipping retry: ${error.message}`);
      return;
    }
    
    if (errorType === NotificationErrorType.RATE_LIMIT_EXCEEDED) {
      // Delay longer for rate limits
      const delay = 60000; // 1 minute
      throw new JobRetryException(error.message, delay);
    }
    
    // Throw for BullMQ to handle retry
    throw error;
  }
}
```

### **14.3 Dead Letter Queue**

```typescript
// Failed jobs are automatically moved to dead letter queue
// Configure in BullMQ:
BullModule.registerQueue({
  name: QUEUE_NAMES.NOTIFICATION,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnFail: { count: 500 }, // Keep failed jobs for analysis
  },
});

// Processor for dead letter queue
@Processor(`${QUEUE_NAMES.NOTIFICATION}-failed`)
export class FailedNotificationProcessor {
  @Process()
  async processFailed(job: Job) {
    this.logger.error(`Failed job after all retries: ${job.id}`);
    this.logger.error(`Error: ${job.failedReason}`);
    this.logger.error(`Data: ${JSON.stringify(job.data)}`);
    
    // Store in separate collection for manual review
    await this.failedNotificationModel.create({
      jobId: job.id,
      data: job.data,
      error: job.failedReason,
      attempts: job.attemptsMade,
      failedAt: new Date(),
    });
  }
}
```

### **14.4 Circuit Breaker Pattern**

```typescript
@Injectable()
export class EmailService {
  private circuitBreaker: CircuitBreaker;
  
  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      threshold: 5,      // Open circuit after 5 failures
      timeout: 60000,    // Close after 1 minute
      resetTimeout: 1,   // Half-open state allows 1 request
    });
  }
  
  async send(email: EmailData): Promise<SendResult> {
    return this.circuitBreaker.execute(async () => {
      // Actual email sending logic
      await this.sendGrid.send(email);
    });
  }
}

// Circuit Breaker States:
// CLOSED: Normal operation, requests pass through
// OPEN: Too many failures, requests fail immediately
// HALF_OPEN: Testing if service recovered, allow 1 request
```

---

## 15. **SECURITY CONSIDERATIONS**

### **15.1 Input Validation**

```typescript
// DTO with comprehensive validation
export class CreateNotificationDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-\_\.\,\!\?]+$/, {
    message: 'Title contains invalid characters',
  })
  title: string;

  @IsNotEmpty({ message: 'Message is required' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @IsNotEmpty({ message: 'Receiver is required' })
  @IsMongoId({ message: 'Invalid receiver ID format' })
  receiverId: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid sender ID format' })
  senderId?: string;

  @IsNotEmpty()
  @IsEnum(NotificationType, { message: 'Invalid notification type' })
  type: NotificationType;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;
}
```

### **15.2 Authorization Checks**

```typescript
// Guard to ensure users can only access their own notifications
@Injectable()
export class NotificationOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const notificationId = request.params.id;

    if (!notificationId) {
      return true; // Let route handle validation
    }

    const notification = await this.notificationModel.findById(notificationId);
    
    if (!notification) {
      return false; // Let route handle 404
    }

    // Admin can access all
    if (user.role === 'admin') {
      return true;
    }

    // Users can only access their own notifications
    return notification.receiverId.toString() === user.userId;
  }
}

// Usage in controller
@Get(':id')
@UseGuards(AuthGuard, NotificationOwnerGuard)
async getNotification(@Param('id') id: string) {
  // Only accessible by notification owner or admin
}
```

### **15.3 Rate Limiting**

```typescript
// Per-user rate limiting
@Injectable()
export class NotificationRateLimiter {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async checkLimit(userId: string, limit: number = 100, windowMs: number = 60000): Promise<boolean> {
    const key = `rate:notifications:${userId}`;
    const current = await this.cacheManager.get<number>(key) || 0;

    if (current >= limit) {
      return false;
    }

    await this.cacheManager.set(key, current + 1, windowMs / 1000);
    return true;
  }
}

// Usage in controller
@Post()
@Throttle(100, 60) // 100 requests per minute
async createNotification(@Body() dto: CreateNotificationDto, @User() user: any) {
  // Rate limited
}
```

### **15.4 Data Sanitization**

```typescript
// Sanitize notification content before storing
function sanitizeNotificationContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/on\w+="[^"]*"/g, '') // Remove event handlers
    .trim();
}

// In service
async sendNotification(dto: CreateNotificationDto) {
  const sanitizedDto = {
    ...dto,
    title: sanitizeNotificationContent(dto.title),
    message: sanitizeNotificationContent(dto.message),
  };
  
  // Continue with sanitized data
}
```

---

## 16. **PERFORMANCE OPTIMIZATION**

### **16.1 Database Query Optimization**

```typescript
// ✅ GOOD: Indexed queries, lean, select only needed fields
async getUserNotifications(userId: string, page: number, limit: number) {
  return this.notificationModel
    .find({
      receiverId: new Types.ObjectId(userId),
      isDeleted: false,
    })
    .select('title message type isRead createdAt senderId') // Only needed fields
    .populate('sender', 'name profileImage') // Minimal populate
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean() // Return plain objects, not Mongoose docs
    .exec();
}

// ❌ BAD: No select, no lean, deep populate
async getNotifications(userId: string) {
  return this.notificationModel
    .find({ receiverId: userId })
    .populate('sender')
    .populate('receiver')
    .exec();
}
```

### **16.2 Aggregation Pipeline**

```typescript
// Efficient unread count with aggregation
async getUnreadCountWithDetails(userId: string) {
  const pipeline = [
    {
      $match: {
        receiverId: new Types.ObjectId(userId),
        isRead: false,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        latest: { $max: '$createdAt' },
      },
    },
    {
      $project: {
        _id: 0,
        type: '$_id',
        count: 1,
        latest: 1,
      },
    },
  ];

  const result = await this.notificationModel.aggregate(pipeline);
  
  return {
    total: result.reduce((sum, r) => sum + r.count, 0),
    byType: result,
  };
}
```

### **16.3 Batch Operations**

```typescript
// ✅ GOOD: Batch update for marking all as read
async markAllAsRead(userId: string): Promise<number> {
  const result = await this.notificationModel.updateMany(
    {
      receiverId: new Types.ObjectId(userId),
      isRead: false,
      isDeleted: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
  );

  // Invalidate cache once
  await this.cacheManager.del(CACHE_KEYS.unreadCount(userId));
  
  return result.modifiedCount;
}

// ❌ BAD: Individual updates
async markAllAsRead(userId: string) {
  const notifications = await this.notificationModel.find({
    receiverId: userId,
    isRead: false,
  });

  for (const notification of notifications) {
    await notification.markAsRead(); // N+1 queries!
  }
}
```

### **16.4 Connection Pooling**

```typescript
// Mongoose connection pool configuration
MongooseModule.forRootAsync({
  useFactory: () => ({
    uri: process.env.MONGODB_URI,
    maxPoolSize: 10, // Maintain up to 10 connections
    minPoolSize: 5,  // Maintain at least 5 connections
    maxIdleTimeMS: 30000, // Close idle connections after 30s
    serverSelectionTimeoutMS: 5000, // Timeout after 5s
    socketTimeoutMS: 45000, // Close sockets after 45s of no I/O
  }),
});
```

---

## 17. **TESTING STRATEGY**

### **17.1 Unit Tests**

```typescript
describe('NotificationService', () => {
  let service: NotificationService;
  let notificationModel: Model<NotificationDocument>;
  let cacheManager: Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getModelToken('Notification'),
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            find: jest.fn(),
            updateMany: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationModel = module.get<Model<NotificationDocument>>(getModelToken('Notification'));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it('should create notification and add to queue', async () => {
    const dto: CreateNotificationDto = {
      title: 'Test',
      message: 'Test message',
      receiverId: '507f1f77bcf86cd799439011',
      type: NotificationType.CUSTOM,
    };

    const mockNotification = {
      _id: new Types.ObjectId(),
      ...dto,
      status: NotificationStatus.PENDING,
    };

    jest.spyOn(notificationModel, 'create').mockResolvedValue(mockNotification as any);

    const result = await service.sendNotification(dto);

    expect(notificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test',
        status: NotificationStatus.PENDING,
      }),
    );
    expect(result).toBeDefined();
  });

  it('should return cached unread count', async () => {
    jest.spyOn(cacheManager, 'get').mockResolvedValue(5);

    const count = await service.getUnreadCount('507f1f77bcf86cd799439011');

    expect(count).toBe(5);
    expect(cacheManager.get).toHaveBeenCalledWith('notifications:unread:507f1f77bcf86cd799439011');
  });
});
```

### **17.2 Integration Tests**

```typescript
describe('NotificationController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [NotificationModule, ConfigModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    authToken = loginResponse.body.data.accessToken;
  });

  it('/notifications (GET)', () => {
    return request(app.getHttpServer())
      .get('/notifications?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.notifications).toBeInstanceOf(Array);
      });
  });

  it('/notifications/:id/read (PUT)', () => {
    return request(app.getHttpServer())
      .put('/notifications/507f1f77bcf86cd799439011/read')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.isRead).toBe(true);
      });
  });
});
```

### **17.3 BullMQ Processor Tests**

```typescript
describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let emailService: EmailService;
  let job: Job<NotificationJobData>;

  beforeEach(() => {
    emailService = {
      send: jest.fn().mockResolvedValue({ messageId: 'msg_123' }),
    };

    processor = new NotificationProcessor(
      emailService as any,
      // ... other mocks
    );

    job = {
      data: {
        notificationId: '507f1f77bcf86cd799439011',
        channels: ['email'],
        priority: 'normal',
      },
      progress: jest.fn(),
    } as any;
  });

  it('should process email notification successfully', async () => {
    await processor.processSendNotification(job);

    expect(emailService.send).toHaveBeenCalled();
    expect(job.progress).toHaveBeenCalledWith(100);
  });

  it('should retry on email service failure', async () => {
    (emailService.send as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

    await expect(processor.processSendNotification(job)).rejects.toThrow();
  });
});
```

---

**This concludes Part 2 of the Notification Module guide.**

---

## 📚 **KEY TAKEAWAYS FROM PART 2**

1. **Socket.IO** - Real-time delivery with rooms and events
2. **Caching** - Multi-level caching with invalidation strategy
3. **Error Handling** - Retry logic, circuit breakers, dead letter queues
4. **Security** - Input validation, authorization, rate limiting
5. **Performance** - Query optimization, batch operations, connection pooling
6. **Testing** - Unit, integration, and processor tests

---

**Next Module**: Chatting Module (real-time messaging architecture)

---
-26-03-29
