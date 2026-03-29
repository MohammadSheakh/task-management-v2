# 📋 Agenda: Business User → Children Account Model Correction

**Date**: 09-03-26
**Version**: V2
**Type**: Backend Correction - Business/Children Relationship
**Priority**: CRITICAL

---

## 🎯 Problem Statement

### ❌ **Current Implementation (WRONG)**

```
Business User → Creates Group/Family → Adds Members (Children)
```

**Issues**:
1. ❌ Business user can create MULTIPLE groups
2. ❌ No direct parent-child relationship in User model
3. ❌ Group concept is abstract - not clearly "children accounts"
4. ❌ Child accounts are just "group members" - no special relationship

---

### ✅ **Correct Business Model (From Requirements)**

```
Business User (Parent/Teacher)
  ↓
  Purchases Subscription (business_starter/level1/level2)
  ↓
  Can create children accounts (4/40/999 based on subscription)
  ↓
  Children accounts automatically belong to ONE family/group
```

**Key Requirements**:
1. ✅ Business user registers themselves (NOT admin-created)
2. ✅ Business user purchases subscription
3. ✅ Business user can create children accounts (up to subscription limit)
4. ✅ **ONE family/group per business user** (auto-created)
5. ✅ Children automatically assigned to that family/group
6. ✅ Children have special relationship with business user (parent-child)

---

## 📝 Solution Options

### **Option A: Add Parent-Child Relationship to User Model** (Recommended ✅)

**Approach**: Add `parentBusinessUserId` field to User model

```typescript
// src/modules/user.module/user/user.interface.ts
export interface IUser extends Document {
  // ... existing fields ...
  
  // ✅ NEW: Parent-Child Relationship
  /**
   * If this user is a child account, reference to parent business user
   * If null, this is an independent user (individual or business)
   */
  parentBusinessUserId?: Types.ObjectId;
  
  /**
   * Is this user a business user who can have children?
   */
  isBusinessUser?: boolean;
  
  /**
   * If business user, auto-created group/family ID
   */
  familyGroupId?: Types.ObjectId;
}
```

**Benefits**:
- ✅ Simple, direct relationship
- ✅ Easy to query: "Get all children of business user X"
- ✅ Clear distinction between business users and children
- ✅ No need for complex group membership queries

---

### **Option B: Enforce Single Group Per Business User**

**Approach**: Keep group.module but enforce ONE group per business user

```typescript
// src/modules/group.module/group/group.service.ts
async createGroup(ownerUserId: string, groupData: any) {
  // ✅ Check if business user already has a group
  const existingGroup = await Group.findOne({ ownerUserId });
  
  if (existingGroup) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have a family group. Children are automatically added to it.'
    );
  }
  
  // Create group
  const group = await Group.create({
    ownerUserId,
    name: groupData.name || 'My Family',
    maxMembers: await getMaxMembersFromSubscription(ownerUserId),
    currentMemberCount: 1, // Owner is first member
  });
  
  // ✅ Update user with familyGroupId
  await User.findByIdAndUpdate(ownerUserId, {
    familyGroupId: group._id,
    isBusinessUser: true,
  });
  
  return group;
}

async addChildAccount(
  businessUserId: string,
  childUserData: any
) {
  // ✅ Get or create family group
  let familyGroup = await Group.findOne({ ownerUserId: businessUserId });
  
  if (!familyGroup) {
    // Auto-create family group
    familyGroup = await this.createGroup(businessUserId, {});
  }
  
  // ✅ Check subscription limit
  const subscription = await getUserSubscription(businessUserId);
  if (familyGroup.currentMemberCount >= subscription.maxChildrenAccount) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `You have reached the maximum limit of ${subscription.maxChildrenAccount} children accounts.`
    );
  }
  
  // ✅ Create child user with parent reference
  const childUser = await User.create({
    ...childUserData,
    parentBusinessUserId: businessUserId,
    role: 'commonUser', // Child is a common user
  });
  
  // ✅ Add child to family group
  await GroupMemberService.addMember(familyGroup._id.toString(), childUser._id.toString());
  
  return childUser;
}
```

**Benefits**:
- ✅ Uses existing group.module
- ✅ Enforces single family per business user
- ✅ Auto-creates group when needed
- ✅ Maintains parent-child relationship

---

### **Option C: Create Dedicated childrenBusinessUser Module** (Most Explicit ✅)

**Approach**: Create new module specifically for business user → children relationship

**Proposed Structure**:
```
src/modules/childrenBusinessUser.module/
├── childrenBusinessUser/
│   ├── childrenBusinessUser.interface.ts
│   ├── childrenBusinessUser.model.ts
│   ├── childrenBusinessUser.service.ts
│   ├── childrenBusinessUser.controller.ts
│   └── childrenBusinessUser.route.ts
└── doc/
    ├── dia/
    │   └── childrenBusinessUser-schema.mermaid
    └── docs/
        └── README.md
```

**Interface**:
```typescript
// src/modules/childrenBusinessUser.module/childrenBusinessUser.interface.ts
import { Types, Document, Model } from 'mongoose';

export interface IChildrenBusinessUser extends Document {
  /**
   * Reference to parent business user
   */
  parentBusinessUserId: Types.ObjectId;
  
  /**
   * Reference to child user
   */
  childUserId: Types.ObjectId;
  
  /**
   * When child was added to family
   */
  addedAt: Date;
  
  /**
   * Who added this child (usually parent, could be self-registration with code)
   */
  addedBy: Types.ObjectId;
  
  /**
   * Child's status in family
   */
  status: 'active' | 'inactive' | 'removed';
  
  /**
   * Soft delete
   */
  isDeleted: boolean;
  
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChildrenBusinessUserModel extends Model<IChildrenBusinessUser> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<IChildrenBusinessUser>>;
  
  /**
   * Check if user is already a child of this business user
   */
  isChildOfBusinessUser(
    parentBusinessUserId: Types.ObjectId,
    childUserId: Types.ObjectId
  ): Promise<boolean>;
  
  /**
   * Get children count for business user
   */
  getChildrenCount(parentBusinessUserId: Types.ObjectId): Promise<number>;
}
```

**Model**:
```typescript
// src/modules/childrenBusinessUser.module/childrenBusinessUser.model.ts
const childrenBusinessUserSchema = new Schema<IChildrenBusinessUser>(
  {
    parentBusinessUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent business user ID is required'],
      index: true,
    },
    childUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Child user ID is required'],
      unique: true, // One user can only be child once
      index: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'removed'],
      default: 'active',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
childrenBusinessUserSchema.index({ parentBusinessUserId: 1, status: 1 });

// Check if user is already a child
childrenBusinessUserSchema.statics.isChildOfBusinessUser = async function (
  parentBusinessUserId: Types.ObjectId,
  childUserId: Types.ObjectId
): Promise<boolean> {
  const existing = await this.exists({
    parentBusinessUserId,
    childUserId,
    isDeleted: false,
  });
  return !!existing;
};

// Get children count
childrenBusinessUserSchema.statics.getChildrenCount = async function (
  parentBusinessUserId: Types.ObjectId
): Promise<number> {
  const result = await this.countDocuments({
    parentBusinessUserId,
    status: 'active',
    isDeleted: false,
  });
  return result;
};

childrenBusinessUserSchema.plugin(paginate);

export const ChildrenBusinessUser = model<IChildrenBusinessUser, IChildrenBusinessUserModel>(
  'ChildrenBusinessUser',
  childrenBusinessUserSchema
);
```

**Service**:
```typescript
// src/modules/childrenBusinessUser.module/childrenBusinessUser.service.ts
import { GenericService } from '../../_generic-module/generic.services';
import { ChildrenBusinessUser } from './childrenBusinessUser.model';
import { IChildrenBusinessUser } from './childrenBusinessUser.interface';
import { User } from '../../user.module/user/user.model';
import { SubscriptionPlan } from '../../subscription.module/subscriptionPlan/subscriptionPlan.model';
import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';

export class ChildrenBusinessUserService extends GenericService<typeof ChildrenBusinessUser, IChildrenBusinessUser> {
  constructor() {
    super(ChildrenBusinessUser);
  }

  /**
   * Add child to business user's family
   */
  async addChildToFamily(
    businessUserId: string,
    childUserData: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
    }
  ): Promise<any> {
    // ✅ Check if business user exists and is business user
    const businessUser = await User.findById(businessUserId);
    if (!businessUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Business user not found');
    }

    // ✅ Check if user has active business subscription
    const subscription = await UserSubscription.findOne({
      userId: businessUserId,
      status: 'active',
    });

    if (!subscription) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You must have an active business subscription to add children'
      );
    }

    // ✅ Get subscription plan to check max children
    const plan = await SubscriptionPlan.findById(subscription.subscriptionPlanId);
    if (!plan) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription plan not found');
    }

    // ✅ Check current children count
    const currentChildrenCount = await this.getChildrenCount(businessUserId);
    if (currentChildrenCount >= plan.maxChildrenAccount) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `You have reached the maximum limit of ${plan.maxChildrenAccount} children accounts. Please upgrade your subscription.`
      );
    }

    // ✅ Check if email already exists
    const existingUser = await User.findOne({ email: childUserData.email });
    if (existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists');
    }

    // ✅ Create child user account
    const childUser = await User.create({
      ...childUserData,
      role: 'commonUser', // Child is a common user
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      isBusinessUser: false,
    });

    // ✅ Create relationship record
    const relationship = await this.model.create({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      childUserId: childUser._id,
      addedBy: new Types.ObjectId(businessUserId),
      status: 'active',
    });

    // ✅ Auto-create or get family group
    const familyGroup = await this.getOrCreateFamilyGroup(businessUserId, plan.maxChildrenAccount);

    // ✅ Add child to family group (if not already member)
    await this.addChildToGroup(familyGroup._id.toString(), childUser._id.toString());

    return {
      childUser,
      relationship,
      familyGroup,
    };
  }

  /**
   * Get or create family group for business user
   */
  private async getOrCreateFamilyGroup(
    businessUserId: string,
    maxMembers: number
  ): Promise<any> {
    // Import Group model dynamically to avoid circular dependency
    const { Group } = await import('../../group.module/group/group.model');

    let familyGroup = await Group.findOne({ ownerUserId: businessUserId });

    if (!familyGroup) {
      // Auto-create family group
      familyGroup = await Group.create({
        ownerUserId: new Types.ObjectId(businessUserId),
        name: `${businessUser.name}'s Family`,
        description: 'Auto-created family group',
        maxMembers: maxMembers,
        currentMemberCount: 1, // Owner is first member
        visibility: 'private',
        status: 'active',
      });

      // Update business user with familyGroupId
      await User.findByIdAndUpdate(businessUserId, {
        familyGroupId: familyGroup._id,
        isBusinessUser: true,
      });
    }

    return familyGroup;
  }

  /**
   * Add child to family group
   */
  private async addChildToGroup(groupId: string, childUserId: string): Promise<void> {
    const { GroupMemberService } = await import('../../group.module/groupMember/groupMember.service');

    const groupMemberService = new GroupMemberService();

    try {
      await groupMemberService.addMember(groupId, childUserId, 'member');
    } catch (error) {
      // If already member, ignore
      if (error.message.includes('already a member')) {
        return;
      }
      throw error;
    }
  }

  /**
   * Get all children of a business user
   */
  async getChildrenOfBusinessUser(businessUserId: string): Promise<any[]> {
    const children = await this.model.aggregate([
      {
        $match: {
          parentBusinessUserId: new Types.ObjectId(businessUserId),
          status: 'active',
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'childUserId',
          foreignField: '_id',
          as: 'childUser',
        },
      },
      { $unwind: '$childUser' },
      {
        $project: {
          _id: 1,
          childUserId: '$childUser._id',
          name: '$childUser.name',
          email: '$childUser.email',
          phoneNumber: '$childUser.phoneNumber',
          profileImage: '$childUser.profileImage',
          addedAt: 1,
          status: 1,
        },
      },
    ]);

    return children;
  }

  /**
   * Get children count for business user
   */
  async getChildrenCount(businessUserId: string): Promise<number> {
    return await this.model.countDocuments({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: 'active',
      isDeleted: false,
    });
  }

  /**
   * Remove child from family
   */
  async removeChildFromFamily(
    businessUserId: string,
    childUserId: string
  ): Promise<void> {
    // Update relationship status
    await this.model.findOneAndUpdate(
      {
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        childUserId: new Types.ObjectId(childUserId),
      },
      {
        status: 'removed',
        isDeleted: true,
      }
    );

    // Remove from group
    const { GroupMemberService } = await import('../../group.module/groupMember/groupMember.service');
    const groupMemberService = new GroupMemberService();

    const familyGroup = await this.getFamilyGroup(businessUserId);
    if (familyGroup) {
      await groupMemberService.removeMember(familyGroup._id.toString(), childUserId);
    }
  }

  /**
   * Get family group for business user
   */
  private async getFamilyGroup(businessUserId: string): Promise<any> {
    const { Group } = await import('../../group.module/group/group.model');
    return await Group.findOne({ ownerUserId: businessUserId });
  }
}
```

**Routes**:
```typescript
// src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts
import express from 'express';
import { ChildrenBusinessUserController } from './childrenBusinessUser.controller';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import validateRequest from '../../../shared/validateRequest';
import * as validation from './childrenBusinessUser.validation';

const router = express.Router();
const controller = new ChildrenBusinessUserController();

/*-─────────────────────────────────
|  Business User | 01-01 | Add child account
|  @module ChildrenBusinessUser
|  @desc Create child account and add to family
|  @auth Business user with active subscription
└──────────────────────────────────*/
router.post(
  '/children',
  auth(TRole.commonUser), // Business user is a commonUser role
  validateRequest(validation.addChildValidationSchema),
  controller.addChild
);

/*-─────────────────────────────────
|  Business User | 01-02 | Get all my children
|  @module ChildrenBusinessUser
|  @desc Get all children accounts
└──────────────────────────────────*/
router.get(
  '/my-children',
  auth(TRole.commonUser),
  controller.getMyChildren
);

/*-─────────────────────────────────
|  Business User | 01-03 | Remove child from family
|  @module ChildrenBusinessUser
|  @desc Remove child account from family
└──────────────────────────────────*/
router.delete(
  '/children/:childId',
  auth(TRole.commonUser),
  controller.removeChild
);

/*-─────────────────────────────────
|  Child | 01-04 | Get my parent business user
|  @module ChildrenBusinessUser
|  @desc Get parent business user details
└──────────────────────────────────*/
router.get(
  '/my-parent',
  auth(TRole.commonUser),
  controller.getParentBusinessUser
);

export const ChildrenBusinessUserRoute = router;
```

**Benefits**:
- ✅ Explicit parent-child relationship
- ✅ Dedicated module for children management
- ✅ Clear separation of concerns
- ✅ Easy to extend (child permissions, activities, etc.)
- ✅ Maintains group.module integration

---

## 🎯 Recommended Implementation

### **Option C: childrenBusinessUser.module** (Recommended ✅)

**Why**:
1. ✅ **Explicit relationship** - Clear parent-child connection
2. ✅ **Dedicated module** - Separate concern from group.module
3. ✅ **Auto-create family** - One family per business user
4. ✅ **Subscription enforcement** - Check max children limit
5. ✅ **Scalable** - Easy to add child-specific features

---

## 📝 Implementation Plan

### Phase 1: Create childrenBusinessUser.module (1-2 days)

**Files to Create**:
```
src/modules/childrenBusinessUser.module/
├── childrenBusinessUser/
│   ├── childrenBusinessUser.interface.ts
│   ├── childrenBusinessUser.model.ts
│   ├── childrenBusinessUser.service.ts
│   ├── childrenBusinessUser.controller.ts
│   ├── childrenBusinessUser.route.ts
│   └── childrenBusinessUser.validation.ts
├── doc/
│   ├── dia/
│   │   ├── childrenBusinessUser-schema.mermaid
│   │   ├── childrenBusinessUser-flow.mermaid
│   │   └── childrenBusinessUser-sequence.mermaid
│   └── docs/
│       └── README.md
└── childrenBusinessUser.constant.ts
```

---

### Phase 2: Update User Model (30 minutes)

**File**: `src/modules/user.module/user/user.interface.ts`

```typescript
export interface IUser extends Document {
  // ... existing fields ...
  
  // ✅ NEW: Parent-Child Relationship
  parentBusinessUserId?: Types.ObjectId;  // Reference to parent
  isBusinessUser?: boolean;                // Is this a business user?
  familyGroupId?: Types.ObjectId;          // Auto-created family group
}
```

---

### Phase 3: Update Group Module (30 minutes)

**File**: `src/modules/group.module/group/group.service.ts`

```typescript
// Enforce ONE group per business user
async createGroup(ownerUserId: string, groupData: any) {
  const existingGroup = await Group.findOne({ ownerUserId });
  
  if (existingGroup) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have a family group. Children are automatically added to it.'
    );
  }
  
  // ... rest of creation logic
}
```

---

### Phase 4: Update Subscription Flow (30 minutes)

**File**: `src/modules/subscription.module/subscriptionPlan/subscriptionPlan.service.ts`

```typescript
// After successful subscription purchase
if (subscriptionType.includes('business')) {
  // Auto-create family group
  await Group.create({
    ownerUserId: userId,
    name: `${user.name}'s Family`,
    maxMembers: plan.maxChildrenAccount,
    currentMemberCount: 1,
    visibility: 'private',
  });
  
  // Update user
  await User.findByIdAndUpdate(userId, {
    isBusinessUser: true,
    familyGroupId: group._id,
  });
}
```

---

## 📊 New Business Flow

### Registration & Subscription Purchase

```
1. User registers as business user
   POST /auth/register
   ↓
2. User purchases business subscription
   POST /subscription-plans/purchase/:id
   ↓
3. Stripe webhook: payment.succeeded
   ↓
4. Auto-create family group
   Group.create({
     ownerUserId: userId,
     maxMembers: plan.maxChildrenAccount,
   })
   ↓
5. Update user
   User.findByIdAndUpdate(userId, {
     isBusinessUser: true,
     familyGroupId: group._id,
   })
   ↓
6. User can now add children
```

---

### Adding Children

```
1. Business user adds child
   POST /children-business-users/children
   Body: { name, email, password }
   ↓
2. Check subscription limit
   currentChildrenCount < plan.maxChildrenAccount
   ↓
3. Create child user
   User.create({
     ...childData,
     parentBusinessUserId: businessUserId,
     role: 'commonUser',
   })
   ↓
4. Create relationship
   ChildrenBusinessUser.create({
     parentBusinessUserId,
     childUserId,
   })
   ↓
5. Add to family group (auto)
   GroupMember.create({
     groupId: familyGroupId,
     userId: childUserId,
     role: 'member',
   })
```

---

## ✅ Final Recommendation

**Dear Mohammad**,

Based on your requirements, I recommend:

### **Option C: childrenBusinessUser.module** ✅

**Why**:
1. ✅ **Clear parent-child relationship** - Not just "group members"
2. ✅ **Auto-create family** - One family per business user
3. ✅ **Subscription enforcement** - Check max children limit
4. ✅ **Dedicated module** - Easy to maintain and extend
5. ✅ **Aligns with Figma** - "Team Members" = Children accounts

**Implementation Time**: 1-2 days

---

## ❓ Your Decision?

**Option 1**: Build childrenBusinessUser.module (1-2 days) - Recommended ✅
**Option 2**: Update existing group.module to enforce single group (2-3 hours)
**Option 3**: Add parentBusinessUserId to User model only (1 hour)

**What would you like me to do?**

---

**Agenda Created**: 09-03-26
**Version**: V2
**Status**: Awaiting your decision
