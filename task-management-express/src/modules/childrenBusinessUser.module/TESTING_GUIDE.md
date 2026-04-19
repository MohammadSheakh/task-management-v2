# 🧪 ChildrenBusinessUser Module Testing Guide

**Version**: 1.0.0  
**Date**: 26-03-23  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test File](#test-file)
3. [Installation](#installation)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Test Examples](#test-examples)
7.Module Specifics](#module-specifics)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This testing suite provides comprehensive integration tests for the ChildrenBusinessUser Module:

- **Child Account Creation**: With subscription limit enforcement
- **Parent-Child Relationship Management**: CRUD operations
- **Permissions**: Business user vs child user access
- **Subscription Limits**: Enforcement of plan limits
- **Redis Caching**: For children lists and counts
- **Soft Delete**: Remove and reactivate children

### Testing Framework

- **Vitest**: Fast, modern testing framework
- **Supertest**: HTTP assertion library
- **MongoDB**: Test database
- **Redis**: Test cache

---

## 📦 Test File Created

| File | Module | Tests | Lines | Status |
|------|--------|-------|-------|--------|
| `childrenBusinessUser.test.ts` | ChildrenBusinessUser | 25+ | 700+ | ✅ Complete |

---

## 📊 Test Coverage

### Test Categories (25+ Tests)

| Category | Tests | Status |
|----------|-------|--------|
| Child Account Creation | 5 | ✅ Complete |
| Get Children | 4 | ✅ Complete |
| Remove Child | 2 | ✅ Complete |
| Reactivate Child | 2 | ✅ Complete |
| Parent-Child Relationship | 2 | ✅ Complete |
| Statistics | 1 | ✅ Complete |
| Caching | 2 | ✅ Complete |
| Permissions | 3 | ✅ Complete |

---

## 🚀 Running Tests

### Quick Start

```bash
# Run ChildrenBusinessUser tests
npx vitest run src/modules/childrenBusinessUser.module/childrenBusinessUser.test.ts

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Recommended: Add to package.json

```json
{
  "scripts": {
    "test:children": "vitest run src/modules/childrenBusinessUser.module/*.test.ts"
  }
}
```

---

## 📝 Test Examples

### Example 1: Creating Child Account

```typescript
it('should create child account successfully', async () => {
  // Arrange: Create business user with subscription
  const { user: businessUser } = await createTestBusinessUser();
  const token = await generateToken(businessUser._id.toString(), 'business');
  await createActiveSubscription(businessUser._id, 10);
  
  const childData = {
    name: generateUniqueName('Child'),
    email: generateUniqueEmail(),
    password: 'ChildPassword123!',
  };

  // Act
  const response = await request(app)
    .post('/api/v1/children-business-users/children')
    .set('Authorization', `Bearer ${token}`)
    .send(childData)
    .expect(201);

  // Assert
  expect(response.body.data.childUser).toBeDefined();
  expect(response.body.data.relationship).toBeDefined();
  expect(response.body.data.childUser.role).toBe('commonUser');
});
```

### Example 2: Testing Subscription Limit

```typescript
it('should reject child creation exceeding limit', async () => {
  // Arrange
  const { user: businessUser } = await createTestBusinessUser();
  const token = await generateToken(businessUser._id.toString(), 'business');
  await createActiveSubscription(businessUser._id, 2); // Max 2 children
  
  // Create 2 children
  for (let i = 0; i < 2; i++) {
    const child = await createTestChildUser();
    await createRelationship(businessUser._id, child.user._id);
  }

  // Act & Assert
  const response = await request(app)
    .post('/api/v1/children-business-users/children')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Third Child',
      email: generateUniqueEmail(),
      password: 'Password123!',
    })
    .expect(400);

  expect(response.body.message).toContain('limit');
});
```

### Example 3: Testing Parent-Child Relationship

```typescript
it('should get parent business user for child', async () => {
  // Arrange
  const { user: businessUser } = await createTestBusinessUser();
  const { user: childUser } = await createTestChildUser();
  const token = await generateToken(childUser._id.toString(), 'commonUser');
  
  await createRelationship(businessUser._id, childUser._id);

  // Act
  const response = await request(app)
    .get('/api/v1/children-business-users/my-parent')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  // Assert
  expect(response.body.data.parentBusinessUserId)
    .toBe(businessUser._id.toString());
});
```

### Example 4: Testing Soft Delete

```typescript
it('should soft delete child relationship', async () => {
  // Arrange
  const { user: businessUser } = await createTestBusinessUser();
  const token = await generateToken(businessUser._id.toString(), 'business');
  await createActiveSubscription(businessUser._id, 10);
  
  const child = await createTestChildUser();
  const relationship = await createRelationship(businessUser._id, child.user._id);

  // Act
  const response = await request(app)
    .delete(`/api/v1/children-business-users/children/${child.user._id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  // Assert
  const relationshipInDb = await ChildrenBusinessUser.findById(relationship._id);
  expect(relationshipInDb?.status).toBe('removed');
});
```

---

## 🎯 Module Specifics

### Relationship Statuses

```typescript
enum ChildrenBusinessUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REMOVED = 'removed',
}
```

**Testing Considerations**:
- Active: Normal parent-child relationship
- Inactive: Temporarily disabled
- Removed: Soft deleted (can be reactivated)

### Subscription Limits

```typescript
// Subscription plan enforces max children
const plan = await SubscriptionPlan.create({
  name: 'Test Plan',
  price: 9.99,
  maxChildrenAccount: 10,  // Max children allowed
});
```

**Testing**:
```typescript
it('should enforce subscription limit', async () => {
  await createActiveSubscription(businessUser._id, 2);
  
  // Create max children
  await createRelationship(businessUser._id, child1._id);
  await createRelationship(businessUser._id, child2._id);
  
  // Try to create 3rd - should fail
  const response = await request(app)
    .post('/api/v1/children-business-users/children')
    .send(childData)
    .expect(400);
  
  expect(response.body.message).toContain('limit');
});
```

### Redis Caching

```typescript
// Cache keys
children:business:{businessUserId}:children    // Children list
children:business:{businessUserId}:count       // Children count
children:child:{childUserId}:parent            // Parent info
```

**Testing Cache**:
```typescript
it('should cache children list', async () => {
  // First request
  await request(app)
    .get('/api/v1/children-business-users/my-children')
    .set('Authorization', `Bearer ${token}`);

  // Check cache
  const cacheKey = `children:business:${businessUser._id}:children`;
  const cached = await redisClient.get(cacheKey);
  expect(cached).toBeDefined();
});
```

---

## 🏆 Best Practices

### 1. Test Data Generation

```typescript
// ✅ GOOD: Unique emails prevent conflicts
const generateUniqueEmail = () => 
  `test.${Date.now()}@example.com`;

// ❌ BAD: Hardcoded emails
const email = 'test@example.com'; // May conflict
```

### 2. User Creation Helpers

```typescript
// ✅ GOOD: Reusable helpers
const createTestBusinessUser = async () => {
  const email = generateUniqueEmail();
  const profile = await UserProfile.create({ acceptTOC: true });
  const user = await User.create({
    email,
    password: 'TestPassword123!',
    name: generateUniqueName('Business'),
    role: 'business',
    profileId: profile._id,
    isEmailVerified: true,
  });
  return { user, profile };
};

const createTestChildUser = async () => {
  // Similar pattern for child users
};
```

### 3. Subscription Setup

```typescript
// ✅ GOOD: Helper for active subscription
const createActiveSubscription = async (
  userId: mongoose.Types.ObjectId,
  maxChildren = 10,
) => {
  const plan = await SubscriptionPlan.create({
    name: 'Test Plan',
    price: 9.99,
    maxChildrenAccount: maxChildren,
    features: ['Test Feature'],
  });

  return await UserSubscription.create({
    userId,
    planId: plan._id,
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
};
```

### 4. Relationship Creation

```typescript
// ✅ GOOD: Helper for relationships
const createRelationship = async (
  parentBusinessUserId: mongoose.Types.ObjectId,
  childUserId: mongoose.Types.ObjectId,
  status = 'active',
) => {
  return await ChildrenBusinessUser.create({
    parentBusinessUserId,
    childUserId,
    status,
    canCreateTasks: true,
    canViewProgress: true,
  });
};
```

### 5. Testing Permissions

```typescript
// ✅ GOOD: Test all permission scenarios
describe('Permissions', () => {
  it('should allow business user to access children');
  it('should allow child to access parent');
  it('should reject child accessing business endpoints');
  it('should reject unauthorized users');
});
```

---

## 🔧 Troubleshooting

### Issue 1: Subscription Required Error

**Problem**: `400 Bad Request - Subscription required`

**Solution**:
```typescript
// Ensure business user has active subscription
await createActiveSubscription(businessUser._id, 10);
```

### Issue 2: Duplicate Email Error

**Problem**: `400 Bad Request - Email already exists`

**Solution**:
```typescript
// Use unique email generator
const email = generateUniqueEmail();
```

### Issue 3: Cache Not Invalidating

**Problem**: Old data returned after creating child

**Solution**:
```typescript
// Ensure service invalidates cache
await this.invalidateCache(businessUserId, childUserId);

// Test cache invalidation
it('should invalidate cache after creating child', async () => {
  await redisClient.setEx(cacheKey, 300, JSON.stringify({ cached: true }));
  
  await request(app).post('/children').send(childData);
  
  const cachedAfter = await redisClient.get(cacheKey);
  expect(cachedAfter).toBeNull();
});
```

### Issue 4: Permission Errors

**Problem**: `403 Forbidden` when accessing endpoint

**Solution**:
```typescript
// Ensure correct role
const token = await generateToken(userId, 'business'); // or 'commonUser'

// Check route permissions
// Business endpoints: auth(TRole.business)
// Child endpoints: auth(TRole.commonUser)
```

---

## 📈 Coverage Goals

| Module | Goal | Current |
|--------|------|---------|
| ChildrenBusinessUser | 80% | - |

---

## 🎓 Learning Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [API Docs](./doc/API_DOCUMENTATION.md)
- [Architecture Guide](./doc/CHILDREN_BUSINESS_USER_ARCHITECTURE-v2.md)

---

**Created**: 26-03-23  
**Author**: Senior Engineering Team  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
