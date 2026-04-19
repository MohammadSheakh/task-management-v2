# Child Account Creation V3 - Subscription Validation

## 📅 Date: 13-04-2026

## ✅ QUICK SUMMARY

**Feature:** Add subscription validation to child account creation  
**File Modified:** `childrenBusinessUser.service.ts` → `createChildAccountV3()`  
**Status:** ✅ Implemented - Ready for testing

---

## 🎯 Problem Solved

**Before:** Any business user could create unlimited child accounts without having an active subscription.

**After:** 
- ✅ Business user MUST have an active subscription to create child accounts
- ✅ Child account creation is limited by subscription plan's `maxChildrenAccount`
- ✅ Clear error messages when limits are reached
- ✅ Remaining slots shown in success message

---

## 🔒 Validation Logic

### Step-by-Step Validation Flow

```
User clicks "Create Child Account"
    ↓
Step 1: Verify business user exists
    ↓
Step 2: VALIDATE SUBSCRIPTION (NEW!)
    ├─ 2.1: Check active subscription exists
    │   → If NO: "No active subscription found. Please subscribe to a plan..."
    │
    ├─ 2.2: Get subscription plan details
    │   → Fetch maxChildrenAccount from plan
    │   → If plan not found: Error
    │
    ├─ 2.3: Count existing active children
    │   → Query: ChildrenBusinessUser.countDocuments({
    │       parentBusinessUserId,
    │       status: "active",
    │       isDeleted: false
    │     })
    │
    ├─ 2.4: Check if limit exceeded
    │   → If currentChildrenCount >= maxChildrenAllowed:
    │     ❌ Error: "You have reached the maximum limit of X child accounts..."
    │
    └─ 2.5: Log remaining slots
        → logger.info(`Remaining slots after creation: ${remainingSlots}`)
    ↓
Step 3: Check if email already exists
    ↓
Step 4: Create UserProfile
    ↓
Step 5: Create User account (child)
    ↓
Step 6: Queue UserProfile update (BullMQ)
    ↓
Step 7: Create parent-child relationship
    ↓
Step 8: Send email with credentials
    ↓
Step 9: Invalidate cache
    ↓
Step 10: Return success with updated message
    → "Child account created successfully. You now have 2/5 child accounts..."
```

---

## 📋 Code Changes

### 1. Added Imports

```typescript
import { UserSubscription } from '../subscription.module/userSubscription/userSubscription.model';
import { SubscriptionPlan } from '../subscription.module/subscriptionPlan/subscriptionPlan.model';
import { UserSubscriptionStatusType } from '../subscription.module/userSubscription/userSubscription.constant';
```

### 2. New Validation Step (Step 2)

```typescript
/*-─────────────────────────────────
|  Step 2: Validate subscription and child account limits
|  V3 ENHANCEMENT: Check active subscription and maxChildrenAccount limit
└──────────────────────────────────*/

// 2.1: Check if business user has an active subscription
const activeSubscription = await UserSubscription.findOne({
  userId: new Types.ObjectId(businessUserId),
  status: { $in: [UserSubscriptionStatusType.active, UserSubscriptionStatusType.trialing] },
  isDeleted: false,
})
.sort({ createdAt: -1 })
.lean();

if (!activeSubscription) {
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'No active subscription found. Please subscribe to a plan before creating child accounts.',
  );
}

// 2.2: Get subscription plan details (including maxChildrenAccount)
let subscriptionPlan = null;
if (activeSubscription.subscriptionPlanId) {
  subscriptionPlan = await SubscriptionPlan.findById(activeSubscription.subscriptionPlanId).lean();
}

if (!subscriptionPlan) {
  throw new ApiError(
    StatusCodes.INTERNAL_SERVER_ERROR,
    'Subscription plan not found. Please contact support.',
  );
}

const maxChildrenAllowed = subscriptionPlan.maxChildrenAccount || 0;

logger.info(`[Child Account Validation] Plan: ${subscriptionPlan.subscriptionName}, Max children allowed: ${maxChildrenAllowed}`);

// 2.3: Count existing active children
const currentChildrenCount = await this.model.countDocuments({
  parentBusinessUserId: new Types.ObjectId(businessUserId),
  status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
  isDeleted: false,
});

logger.info(`[Child Account Validation] Current children count: ${currentChildrenCount}`);

// 2.4: Check if adding one more child would exceed the limit
if (currentChildrenCount >= maxChildrenAllowed) {
  const errorMessage = `You have reached the maximum limit of ${maxChildrenAllowed} child account${maxChildrenAllowed > 1 ? 's' : ''} for your ${subscriptionPlan.subscriptionName} plan. Please upgrade your plan to add more children. (Current: ${currentChildrenCount}/${maxChildrenAllowed})`;
  
  logger.warn(`[Child Account Validation] Limit exceeded: ${errorMessage}`);
  
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    errorMessage,
  );
}

// 2.5: Log remaining slots
const remainingSlots = maxChildrenAllowed - currentChildrenCount - 1;
logger.info(`[Child Account Validation] Remaining slots after creation: ${remainingSlots}`);
```

### 3. Updated Success Message

```typescript
// OLD:
message: 'Child account created successfully. Login credentials have been sent to the child\'s email.',

// NEW:
message: `Child account created successfully. You now have ${currentChildrenCount + 1}/${maxChildrenAllowed} child accounts. Login credentials have been sent to the child's email.`,
```

---

## 🧪 Test Scenarios

### Scenario 1: No Active Subscription
```bash
POST /api/v1/children-business-user/create
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

Response (403 Forbidden):
{
  "success": false,
  "message": "No active subscription found. Please subscribe to a plan before creating child accounts."
}
```

### Scenario 2: Limit Reached
```bash
# Business user has "Business Level 1" plan (max 5 children)
# Already has 5 children, tries to create 6th

Response (403 Forbidden):
{
  "success": false,
  "message": "You have reached the maximum limit of 5 child accounts for your Business Level 1 plan. Please upgrade your plan to add more children. (Current: 5/5)"
}
```

### Scenario 3: Successful Creation
```bash
# Business user has "Business Level 1" plan (max 5 children)
# Currently has 2 children, creates 3rd

Response (200 OK):
{
  "success": true,
  "data": {
    "childUser": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      ...
    },
    "relationship": { ... },
    "message": "Child account created successfully. You now have 3/5 child accounts. Login credentials have been sent to the child's email."
  }
}
```

### Scenario 4: Trial Subscription
```bash
# Business user has active trial (status: "trialing")
# Plan allows 3 children, currently has 1

✅ Should succeed! (Trialing status is allowed)
Response (200 OK):
{
  "message": "Child account created successfully. You now have 2/3 child accounts..."
}
```

---

## 📊 Database Queries

### Query 1: Check Active Subscription
```javascript
// MongoDB
db.usersubscriptions.findOne({
  userId: ObjectId("BUSINESS_USER_ID"),
  status: { $in: ["active", "trialing"] },
  isDeleted: false
}).sort({ createdAt: -1 })
```

### Query 2: Get Subscription Plan
```javascript
// MongoDB
db.subscriptionplans.findOne({
  _id: ObjectId("SUBSCRIPTION_PLAN_ID_FROM_USER_SUBSCRIPTION")
})
```

### Query 3: Count Existing Children
```javascript
// MongoDB
db.childrenbusinessusers.countDocuments({
  parentBusinessUserId: ObjectId("BUSINESS_USER_ID"),
  status: "active",
  isDeleted: false
})
```

---

## 🔍 Logging Output

### Successful Creation
```
[Child Account Validation] Plan: Business Level 1, Max children allowed: 5
[Child Account Validation] Current children count: 2
[Child Account Validation] Remaining slots after creation: 2
Credentials email sent to child: john@example.com
Cache invalidated for business user: BUSINESS_USER_ID
```

### Limit Exceeded
```
[Child Account Validation] Plan: Business Level 1, Max children allowed: 5
[Child Account Validation] Current children count: 5
[Child Account Validation] Limit exceeded: You have reached the maximum limit of 5 child accounts...
```

### No Subscription
```
(No validation logs - fails at Step 2.1)
```

---

## 📁 Files Modified

1. ✅ `childrenBusinessUser.service.ts`
   - Added `UserSubscription` import
   - Added `SubscriptionPlan` import
   - Added `UserSubscriptionStatusType` import
   - Added Step 2: Subscription validation logic
   - Updated success message to show current/max count

---

## 🚀 Deployment Checklist

- [x] Code implemented and tested locally
- [ ] Verify `maxChildrenAccount` field exists in all subscription plans
- [ ] Test with user having no subscription → Should get 403 error
- [ ] Test with user at limit → Should get 403 error with clear message
- [ ] Test with user under limit → Should succeed with updated message
- [ ] Test with trial subscription → Should succeed
- [ ] Test with cancelled subscription → Should fail (status not in active/trialing)
- [ ] Monitor logs for validation messages
- [ ] Update API documentation

---

## 💡 Business Logic Notes

### Why Check Both `active` and `trialing` Status?
- **Active:** Paid subscription, fully functional
- **Trialing:** Free trial period, should allow child creation to test the product
- **Cancelled:** Subscription ended, should NOT allow new children

### Why Use `maxChildrenAccount` from Plan?
- Different plans have different limits (e.g., Basic: 2, Pro: 5, Enterprise: unlimited)
- Stored in `SubscriptionPlan` schema as `maxChildrenAccount: number`
- Allows flexible pricing tiers

### Why Count Only `ACTIVE` Children?
- Removed children (`isDeleted: true`) don't count toward limit
- Inactive children (`status: "removed"`) don't count
- Only currently active parent-child relationships count

### What Happens When User Upgrades Plan?
- New `maxChildrenAccount` from upgraded plan applies immediately
- User can create more children if under new limit
- No migration needed - validation happens at creation time

---

## 🔮 Future Enhancements

1. **Cache the validation result** (Redis) for 5 minutes to reduce DB queries
2. **Add subscription expiry check** - don't allow creation if subscription expires soon
3. **Add upgrade prompt** in error response with link to upgrade page
4. **Track historical limits** - log when users hit limits for analytics
5. **Add soft limit warnings** - notify user when they reach 80% of limit
6. **Support for temporary increases** - allow admin to temporarily increase limit for specific users

---

**Status:** ✅ Implemented  
**Last Updated:** 13-04-2026  
**Author:** Engineering Team  
**Related Files:** 
- `childrenBusinessUser.service.ts` (Step 2 validation)
- `userSubscription.model.ts` (Active subscription check)
- `subscriptionPlan.model.ts` (maxChildrenAccount field)
