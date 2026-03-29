# 👨‍👩‍👧‍👦 Children Business User Module - Architecture Documentation (v2.0)

**Version**: 2.0 - Updated with Socket.IO Real-Time  
**Status**: ✅ Production Ready  
**Last Updated**: 12-03-26  

---

## 🎯 Module Overview (v2.0)

The Children Business User Module manages **parent-child relationships** in family/team groups, enabling business users (parents/teachers) to create and manage child accounts, set permissions, and monitor children's progress with **real-time Socket.IO integration**.

### Key Features (v2.0)

- ✅ **Child Account Management** - Create, update, remove child accounts
- ✅ **Secondary User Permissions** - Grant task creation rights to one child
- ✅ **Family Relationship Tracking** - Parent-child relationship management
- ✅ **Subscription Limit Enforcement** - Enforce max children per subscription
- ✅ **Socket.IO Real-Time** ⭐ NEW! - Family activity broadcasting
- ✅ **Real-Time Parent Notifications** ⭐ NEW! - Child progress updates
- ✅ **Family Room Auto-Join** ⭐ NEW! - Based on relationship
- ✅ **Redis Caching** - High-performance reads (5-10 minute TTL)

---

## 📂 Module Structure (v2.0)

```
childrenBusinessUser.module/
├── doc/
│   ├── dia/                        # 8 Mermaid diagrams (v2.0)
│   │   ├── childrenBusinessUser-schema-v2.mermaid
│   │   ├── childrenBusinessUser-system-architecture-v2.mermaid
│   │   ├── childrenBusinessUser-sequence-v2.mermaid
│   │   ├── childrenBusinessUser-user-flow-v2.mermaid
│   │   ├── childrenBusinessUser-swimlane-v2.mermaid
│   │   ├── childrenBusinessUser-state-machine-v2.mermaid
│   │   ├── childrenBusinessUser-component-architecture-v2.mermaid
│   │   └── childrenBusinessUser-system-flow-v2.mermaid
│   ├── README.md                   # Module documentation
│   ├── API_DOCUMENTATION.md        # API reference
│   ├── children-business-user-roles-mapping.md
│   ├── CHILDREN_BUSINESS_USER_ARCHITECTURE-v2.md  # This file
│   └── perf/
│       └── childrenBusinessUser-performance-report.md
│
├── childrenBusinessUser.constant.ts   # Constants and rate limits
├── childrenBusinessUser.interface.ts  # TypeScript interfaces
├── childrenBusinessUser.model.ts      # Mongoose schema & model
├── childrenBusinessUser.validation.ts # Zod validation schemas
├── childrenBusinessUser.service.ts    # Business logic with Socket.IO ⭐
├── childrenBusinessUser.controller.ts # HTTP handlers
├── childrenBusinessUser.route.ts      # API routes with Socket.IO info
└── childrenBusinessUser.cron.ts       # Scheduled jobs (optional)
```

---

## 🏗️ Architecture Design (v2.0)

### Design Principles

1. **Direct Parent-Child Relationship** ⭐ UPDATED
   - No group complexity
   - Direct relationship via childrenBusinessUser collection
   - One-to-many (parent → multiple children)

2. **Secondary User System**
   - Only ONE child per business user can be Secondary User
   - Secondary User can create tasks for family
   - Non-secondary users can only create personal tasks

3. **Real-Time Integration** ⭐ NEW!
   - Socket.IO for family activity broadcasting
   - Real-time parent notifications
   - Family room auto-join based on relationship

4. **Cache-First Strategy**
   - Redis cache-aside pattern
   - Configurable TTLs (5-10 minutes)
   - Automatic cache invalidation on changes

5. **Subscription Enforcement**
   - Check subscription limits before creating child accounts
   - Enforce max children per subscription tier
   - Prevent duplicate relationships

---

## 📊 Database Schema (v2.0)

### childrenBusinessUser Collection

```typescript
interface IChildrenBusinessUser {
  _id: Types.ObjectId;
  parentBusinessUserId: Types.ObjectId;  // Parent/Teacher
  childUserId: Types.ObjectId;            // Child/Student
  addedAt: Date;
  addedBy: Types.ObjectId;                // Who added
  status: 'active' | 'inactive' | 'removed';
  isSecondaryUser: boolean;               // ⭐ Can create tasks for family
  note?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes

```typescript
// Primary query: Get all children of a business user
childrenBusinessUserSchema.index({ 
  parentBusinessUserId: 1, 
  status: 1, 
  isDeleted: 1 
});

// Get parent for a child
childrenBusinessUserSchema.index({ 
  childUserId: 1, 
  status: 1, 
  isDeleted: 1 
});

// Get secondary user
childrenBusinessUserSchema.index({ 
  parentBusinessUserId: 1, 
  isSecondaryUser: 1, 
  status: 1, 
  isDeleted: 1 
}, { unique: true });  // Only ONE secondary user per parent

// Text search for notes
childrenBusinessUserSchema.index({ note: 'text' });
```

---

## 🔄 Real-Time Integration (v2.0) ⭐ NEW!

### Socket.IO Family Rooms

```typescript
// Auto-join on connection
async autoJoinFamilyRoom(userId: string) {
  // Check if user is a child
  const childRelationship = await ChildrenBusinessUser.findOne({
    childUserId: userId,
    status: 'active'
  });
  
  if (childRelationship) {
    // Join parent's family room
    socket.join(childRelationship.parentBusinessUserId.toString());
  }
  
  // Check if user is a business user
  const parentRelationship = await ChildrenBusinessUser.findOne({
    parentBusinessUserId: userId,
    status: 'active'
  });
  
  if (parentRelationship) {
    // Join own family room
    socket.join(userId);
  }
}
```

### Real-Time Events

```typescript
// Child completes task → Parent receives real-time update
socket.on('task-progress:completed', {
  taskId: 'task123',
  taskTitle: 'Math Homework',
  childId: 'child001',
  childName: 'John',
  timestamp: new Date()
});

// Broadcast to family room
socketService.broadcastGroupActivity(businessUserId, {
  type: 'task_completed',
  actor: { userId: childId, name: childName },
  task: { taskId, title: taskTitle },
  timestamp: new Date()
});
```

### Redis Cache Keys (v2.0)

```typescript
// Family relationships
childrenBusinessUser:family:{businessUserId}:children  // TTL: 10 min
childrenBusinessUser:child:{childId}:parent            // TTL: 10 min
childrenBusinessUser:secondary:{businessUserId}        // TTL: 15 min

// Socket.IO state
socket:family:{businessUserId}:members                 // TTL: 1 min
socket:family:{businessUserId}:activity                // TTL: 2 min
```

---

## 🎯 Key Components (v2.0)

### 1. Children Business User Service

**File**: `childrenBusinessUser.service.ts`

**Responsibilities**:
- Create child accounts with subscription enforcement
- Manage parent-child relationships
- Set/unset Secondary User permissions
- Real-time Socket.IO broadcasting ⭐ NEW!
- Redis caching

**Key Methods**:
```typescript
class ChildrenBusinessUserService {
  // Create child account
  async createChildAccount(
    businessUserId: string,
    childData: CreateChildDTO
  ): Promise<{ childUser: IUser; relationship: IChildrenBusinessUser }>

  // Get all children
  async getChildrenOfBusinessUser(
    businessUserId: string,
    options?: QueryOptions
  ): Promise<PaginatedResponse<IChild>>

  // Get parent for a child
  async getParentBusinessUser(
    childUserId: string
  ): Promise<IParentInfo>

  // Set Secondary User
  async setSecondaryUser(
    businessUserId: string,
    childUserId: string,
    isSecondaryUser: boolean
  ): Promise<ISecondaryUserStatus>

  // Remove child from family
  async removeChildFromFamily(
    businessUserId: string,
    childUserId: string,
    note?: string
  ): Promise<void>

  // ⭐ NEW: Broadcast family activity
  async broadcastFamilyActivity(
    businessUserId: string,
    activity: IFamilyActivity
  ): Promise<void>
}
```

---

### 2. Secondary User Permission System

**Purpose**: Allow one child to create tasks for the family

**Rules**:
- ✅ Only ONE Secondary User per business user
- ✅ Secondary User can create personal, single assignment, and collaborative tasks
- ✅ Non-secondary users can only create personal tasks
- ✅ Business user can grant/revoke Secondary User status anytime

**Implementation**:
```typescript
// Pre-save hook ensures only one secondary user
childrenBusinessUserSchema.pre('save', async function (next) {
  if (this.isSecondaryUser && this.isModified('isSecondaryUser')) {
    const existingSecondary = await (this.constructor as any).findOne({
      parentBusinessUserId: this.parentBusinessUserId,
      isSecondaryUser: true,
      childUserId: { $ne: this.childUserId },
      isDeleted: false,
    });

    if (existingSecondary) {
      throw new Error('Only one child can be the Secondary User per business user');
    }
  }
  next();
});
```

**Usage in Task Creation**:
```typescript
// Task service checks Secondary User status
async canCreateTask(userId: string, taskType: string): Promise<boolean> {
  // Personal tasks: Always allowed
  if (taskType === 'personal') {
    return true;
  }
  
  // Check if Secondary User
  const relationship = await ChildrenBusinessUser.findOne({
    childUserId: userId,
    isSecondaryUser: true,
    status: 'active'
  });
  
  return !!relationship;  // Secondary user can create all task types
}
```

---

### 3. Subscription Limit Enforcement

**Purpose**: Enforce max children per subscription tier

**Subscription Tiers**:
```typescript
const SUBSCRIPTION_LIMITS = {
  individual: { maxChildren: 0 },      // No children accounts
  business_starter: { maxChildren: 5 }, // Up to 5 children
  business_level1: { maxChildren: 10 }, // Up to 10 children
  business_level2: { maxChildren: 20 }, // Up to 20 children
};
```

**Enforcement**:
```typescript
async createChildAccount(businessUserId: string, childData: CreateChildDTO) {
  // Get business user's subscription
  const subscription = await UserSubscription.findOne({
    userId: businessUserId,
    status: 'active'
  });
  
  // Get subscription plan
  const plan = await SubscriptionPlan.findById(subscription.subscriptionPlanId);
  
  // Count current children
  const currentChildrenCount = await this.getChildrenCount(businessUserId);
  
  // Check limit
  if (currentChildrenCount >= plan.maxChildrenAccount) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `You have reached the maximum limit of ${plan.maxChildrenAccount} children accounts`
    );
  }
  
  // Proceed with creation
  // ...
}
```

---

## 🔐 Security Features (v2.0)

### 1. Authentication

- ✅ JWT authentication required for all endpoints
- ✅ Role-based access control
  - `business` role: Full management of children
  - `child` role: View parent information only

### 2. Authorization

```typescript
// Business user can only manage their own children
GET /children-business-user/children  // ✅ Own children
GET /children-business-user/children?id=other_parent  // ❌ Others' children

// Child can only view their own parent
GET /children-business-user/parent  // ✅ Own parent
GET /children-business-user/parent?id=other_child  // ❌ Others' parent
```

### 3. Data Privacy

```typescript
// ✅ Good: Aggregated family data
{
  familyName: "Smith Family",
  childrenCount: 3,
  activeChildrenToday: 2
}

// ❌ Bad: Exposing individual child data in family analytics
{
  children: [
    { email: "child@example.com", ... }  // Never expose!
  ]
}
```

### 4. Secondary User Security

```typescript
// Only business user can set Secondary User
PUT /children-business-user/set-secondary-user
Authorization: Bearer <business_token>  // ✅ Business user
Authorization: Bearer <child_token>     // ❌ Child user

// Verify business user owns the request
const relationship = await ChildrenBusinessUser.findOne({
  parentBusinessUserId: businessUserId,
  childUserId: childUserId
});

if (!relationship) {
  throw new ApiError(403, 'You do not have permission to manage this child');
}
```

---

## 📈 Performance Optimization (v2.0)

### 1. Redis Caching Strategy

```typescript
// Cache-aside pattern
async getChildrenOfBusinessUser(businessUserId: string) {
  const cacheKey = `childrenBusinessUser:family:${businessUserId}:children`;
  
  // 1. Try cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. Cache miss - query DB
  const children = await this.aggregateChildren(businessUserId);
  
  // 3. Write to cache (10 min TTL)
  await redisClient.setEx(cacheKey, 600, JSON.stringify(children));
  
  // 4. Return data
  return children;
}
```

**Cache TTLs**:
```typescript
// Family relationships
family:children: 10 min
child:parent: 10 min
secondary:user: 15 min

// Socket.IO state
socket:members: 1 min
socket:activity: 2 min
```

### 2. Cache Invalidation (v2.0)

```typescript
// Invalidate on relationship changes
async setSecondaryUser(businessUserId: string, childUserId: string, isSecondary: boolean) {
  // Update relationship
  await ChildrenBusinessUser.findOneAndUpdate(...);
  
  // Invalidate caches
  await redisClient.del([
    `childrenBusinessUser:family:${businessUserId}:children`,
    `childrenBusinessUser:secondary:${businessUserId}`
  ]);
  
  // Broadcast via Socket.IO
  await this.broadcastFamilyActivity(businessUserId, {
    type: 'permission_changed',
    actor: { userId: businessUserId },
    child: { userId: childUserId, isSecondaryUser: isSecondary },
    timestamp: new Date()
  });
}
```

### 3. Query Optimization

```typescript
// ✅ Good: Use indexes
const children = await ChildrenBusinessUser.find({
  parentBusinessUserId: businessUserId,
  status: 'active',
  isDeleted: false
}).populate('childUserId', 'name email profileImage');

// Use projection
// Use lean() for read-only queries
```

---

## 📊 API Endpoints Summary (v2.0)

### Family Management (5 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/children-business-user/children` | ✅ Business | Get all children |
| POST | `/children-business-user/create-child` | ✅ Business | Create child account |
| PUT | `/children-business-user/set-secondary-user` | ✅ Business | Set Secondary User |
| PUT | `/children-business-user/:id` | ✅ Business | Update child info |
| DELETE | `/children-business-user/:id` | ✅ Business | Remove child from family |

### Parent Information (1 endpoint)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/children-business-user/parent` | ✅ Child | Get parent information |

**Total**: 6 endpoints

---

## 🔗 External Dependencies (v2.0)

### Internal Modules

- ✅ **user.module** - User data source
- ✅ **subscription.module** - Subscription limit enforcement
- ✅ **task.module** - Task creation permissions
- ✅ **notification.module** - Activity feed integration
- ✅ **Socket.IO service** - Real-time broadcasting ⭐ NEW!

### External Services

- ✅ **MongoDB** - Primary database
- ✅ **Redis** - Caching layer
- ✅ **Socket.IO** - Real-time layer ⭐ NEW!

---

## 🧪 Testing Strategy (v2.0)

### Unit Tests

```typescript
describe('ChildrenBusinessUserService', () => {
  describe('createChildAccount', () => {
    it('should create child account successfully', async () => {
      // Test successful creation
    });

    it('should enforce subscription limit', async () => {
      // Test limit enforcement
    });

    it('should prevent duplicate child accounts', async () => {
      // Test duplicate prevention
    });
  });

  describe('setSecondaryUser', () => {
    it('should set Secondary User successfully', async () => {
      // Test setting secondary user
    });

    it('should enforce only one secondary user', async () => {
      // Test single secondary user enforcement
    });

    it('should broadcast via Socket.IO', async () => {
      // Test real-time broadcast
    });
  });
});
```

### Integration Tests

```typescript
describe('Children Business User API (v2.0)', () => {
  describe('POST /children-business-user/create-child', () => {
    it('should return 201 with child data', async () => {
      // Test endpoint
    });

    it('should require business role', async () => {
      // Test authorization
    });
  });

  describe('PUT /children-business-user/set-secondary-user', () => {
    it('should broadcast via Socket.IO', async () => {
      // Test real-time broadcast
    });
  });
});
```

---

## 🚀 Future Enhancements

### Phase 2 (Optional)

- [ ] Invite system for children (email invitation)
- [ ] Multiple parents per child (co-parenting support)
- [ ] Child activity analytics
- [ ] Family calendar integration
- [ ] Real-time chat between family members

### Phase 3 (Future)

- [ ] AI-powered family insights
- [ ] Automated task suggestions based on family patterns
- [ ] Family goal setting and tracking
- [ ] Reward system for family achievements

---

## 📝 Related Documentation (v2.0)

- [API Documentation](./API_DOCUMENTATION.md)
- [Performance Report](./perf/childrenBusinessUser-performance-report.md)
- [Diagrams (v2.0)](./dia/) ⭐ UPDATED
- [System Guide](./CHILDREN_BUSINESS_USER_SYSTEM_GUIDE-v2.md) ⭐ NEW!
- [Socket.IO Integration](../../helpers/socket/SOCKET_IO_INTEGRATION.md) ⭐ NEW!

---

**Document Generated**: 09-03-26  
**Updated**: 12-03-26 (v2.0)  
**Author**: Qwen Code Assistant  
**Status**: ✅ Production Ready (v2.0)
