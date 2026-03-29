# 📋 Complete Business Flow: Task, SubTask, Group, GroupMember & User Modules

**Date**: 09-03-26  
**Version**: 1.0.0  
**Purpose**: Explain complete business logic and relationships

---

## 🎯 Executive Summary

This document explains the complete business flow of the Task Management system, covering how **Users**, **Tasks**, **SubTasks**, **Groups**, and **GroupMembers** interact to create a comprehensive task management platform.

---

## 📊 Module Overview

### **1. User Module** (`user.module`)
**Purpose**: Manages all user accounts (Business Users and Children)

**Key Fields**:
```typescript
interface IUser {
  _id: ObjectId;
  name: String;
  email: String;
  role: 'admin' | 'user' | 'commonUser';
  accountCreatorId: ObjectId;      // Who created this account
  isBusinessUser: Boolean;          // Is this a business user?
  subscriptionType: 'none' | 'individual' | 'business_starter' | 'business_level1' | 'business_level2';
}
```

**User Types**:
- **Business User** (Parent/Teacher): Can create children accounts
- **Child User**: Created by business user, belongs to family
- **Individual User**: Self-registered, personal use only

---

### **2. Children Business User Module** (`childrenBusinessUser.module`)
**Purpose**: Manages parent-child relationships

**Key Fields**:
```typescript
interface IChildrenBusinessUser {
  parentBusinessUserId: ObjectId;   // Business user (parent)
  childUserId: ObjectId;            // Child account
  addedBy: ObjectId;                // Who added this child
  status: 'active' | 'inactive' | 'removed';
}
```

**Business Logic**:
- Business user creates child accounts (up to subscription limit)
- Direct parent-child relationship (no group abstraction)
- Subscription limits: 4/40/999 children based on plan

---

### **3. Group Module** (`group.module`)
**Purpose**: Manages family groups for task assignment

**Key Fields**:
```typescript
interface IGroup {
  _id: ObjectId;
  ownerUserId: ObjectId;           // Business user who owns group
  name: String;                     // e.g., "Smith Family"
  maxMembers: Number;               // From subscription plan
  currentMemberCount: Number;       // Auto-tracked
  visibility: 'private' | 'public' | 'inviteOnly';
  status: 'active' | 'suspended' | 'archived';
}
```

**Business Logic**:
- ONE family group per business user (optional)
- Used for collaborative task assignment
- maxMembers set from subscription plan

---

### **4. GroupMember Module** (`group.module/groupMember`)
**Purpose**: Manages group membership and permissions

**Key Fields**:
```typescript
interface IGroupMember {
  groupId: ObjectId;                // Reference to group
  userId: ObjectId;                 // Reference to user
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'inactive' | 'blocked';
  permissions: {
    canCreateTasks: Boolean;        // Can create tasks for group?
    canInviteMembers: Boolean;      // Can invite others?
    canRemoveMembers: Boolean;      // Can remove members?
  };
}
```

**Business Logic**:
- Business user = owner role
- Children = member role (by default)
- Permissions control task creation rights

---

### **5. Task Module** (`task.module`)
**Purpose**: Manages tasks with 3 types

**Key Fields**:
```typescript
interface ITask {
  _id: ObjectId;
  createdById: ObjectId;           // Who created this task
  ownerUserId: ObjectId;           // Task owner (for personal tasks)
  taskType: 'personal' | 'singleAssignment' | 'collaborative';
  assignedUserIds: [ObjectId];     // Users assigned to task
  groupId: ObjectId;               // Group this task belongs to
  
  title: String;
  description: String;
  status: 'pending' | 'inProgress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  
  totalSubtasks: Number;
  completedSubtasks: Number;
  subtasks: [ISubTask];            // Embedded subtasks
  
  startTime: Date;
  dueDate: Date;
  completedTime: Date;
}
```

**Task Types**:
1. **Personal**: For oneself only
2. **Single Assignment**: Assigned to ONE other person
3. **Collaborative**: Assigned to MULTIPLE people (group task)

---

### **6. SubTask Module** (`task.module/subTask`)
**Purpose**: Manages subtasks within a task

**Key Fields**:
```typescript
interface ISubTask {
  _id: ObjectId;
  taskId: ObjectId;                // Parent task
  createdById: ObjectId;           // Who created this subtask
  assignedToUserId: ObjectId;      // Who is responsible
  title: String;
  description: String;
  duration: String;                 // e.g., "10 min", "1 hour"
  isCompleted: Boolean;
  completedAt: Date;
  order: Number;                    // Sort order
}
```

**Business Logic**:
- Subtasks can be embedded (for small tasks) OR separate collection
- Each subtask can be assigned to different users
- Progress tracking: completedSubtasks / totalSubtasks

---

## 🔄 Complete Business Flows

### **Flow 1: Business User Registration & Setup**

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User Registers                                      │
├─────────────────────────────────────────────────────────────┤
│ POST /auth/register                                         │
│ Body: { name, email, password, role: 'commonUser' }         │
│                                                             │
│ Result:                                                     │
│ - User created with subscriptionType = 'none'              │
│ - isBusinessUser = false (by default)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Purchase Business Subscription                      │
├─────────────────────────────────────────────────────────────┤
│ POST /subscription-plans/purchase/:id                       │
│ Plan: business_starter ($29.99/mo, 4 children)             │
│                                                             │
│ Result:                                                     │
│ - User.subscriptionType = 'business_starter'               │
│ - User.isBusinessUser = true                               │
│ - Can now create children accounts                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: (Optional) Create Family Group                      │
├─────────────────────────────────────────────────────────────┤
│ POST /groups                                                │
│ Body: { name: "Smith Family" }                             │
│                                                             │
│ Result:                                                     │
│ - Group created with ownerUserId = businessUserId          │
│ - Group.maxMembers = 4 (from subscription)                 │
│ - Business user added as 'owner' role                      │
└─────────────────────────────────────────────────────────────┘
```

---

### **Flow 2: Business User Creates Child Account**

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Create Child Account                                │
├─────────────────────────────────────────────────────────────┤
│ POST /children-business-users/children                      │
│ Body: { name, email, password, phoneNumber }               │
│                                                             │
│ Validation:                                                 │
│ 1. Check subscription limit (currentChildren < maxAllowed) │
│ 2. Check email doesn't already exist                       │
│                                                             │
│ Result:                                                     │
│ - Child User created                                       │
│   - accountCreatorId = businessUserId                      │
│   - role = 'commonUser'                                    │
│   - subscriptionType = 'none'                              │
│ - ChildrenBusinessUser relationship created                │
│   - parentBusinessUserId = businessUserId                  │
│   - childUserId = child._id                                │
│   - status = 'active'                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: (Optional) Add Child to Family Group                │
├─────────────────────────────────────────────────────────────┤
│ POST /group-members                                         │
│ Body: { groupId, userId: childId, role: 'member' }         │
│                                                             │
│ Result:                                                     │
│ - GroupMember created                                      │
│   - groupId = familyGroupId                                │
│   - userId = childId                                       │
│   - role = 'member'                                        │
│   - permissions.canCreateTasks = false (default)           │
│ - Group.currentMemberCount incremented                     │
└─────────────────────────────────────────────────────────────┘
```

---

### **Flow 3: Creating Different Task Types**

#### **3A: Personal Task**

```
┌─────────────────────────────────────────────────────────────┐
│ Create Personal Task                                        │
├─────────────────────────────────────────────────────────────┤
│ POST /tasks                                                 │
│ Body: {                                                     │
│   taskType: 'personal',                                    │
│   title: "My Personal Task",                               │
│   startTime: "2026-03-10T09:00:00Z"                        │
│ }                                                           │
│                                                             │
│ Auto-set by backend:                                        │
│ - ownerUserId = userId (creator owns it)                   │
│ - assignedUserIds = [] (no one else assigned)              │
│ - groupId = null (not a group task)                        │
│                                                             │
│ Result:                                                     │
│ - Task visible only to creator                             │
│ - Creator can complete/delete it                           │
└─────────────────────────────────────────────────────────────┘
```

#### **3B: Single Assignment Task**

```
┌─────────────────────────────────────────────────────────────┐
│ Create Single Assignment Task                               │
├─────────────────────────────────────────────────────────────┤
│ POST /tasks                                                 │
│ Body: {                                                     │
│   taskType: 'singleAssignment',                            │
│   title: "Task for John",                                  │
│   assignedUserIds: [child1Id],                             │
│   groupId: familyGroupId                                   │
│ }                                                           │
│                                                             │
│ Validation:                                                 │
│ - assignedUserIds.length === 1                             │
│ - assignedUser is member of groupId                        │
│                                                             │
│ Result:                                                     │
│ - Task visible to creator AND assigned user                │
│ - Assigned user can update status/complete                 │
│ - Task belongs to group                                    │
└─────────────────────────────────────────────────────────────┘
```

#### **3C: Collaborative Task**

```
┌─────────────────────────────────────────────────────────────┐
│ Create Collaborative Task                                   │
├─────────────────────────────────────────────────────────────┤
│ POST /tasks                                                 │
│ Body: {                                                     │
│   taskType: 'collaborative',                               │
│   title: "Family Project",                                 │
│   assignedUserIds: [child1Id, child2Id, child3Id],         │
│   groupId: familyGroupId                                   │
│ }                                                           │
│                                                             │
│ Validation:                                                 │
│ - assignedUserIds.length > 1                               │
│ - All assigned users are members of groupId                │
│                                                             │
│ Result:                                                     │
│ - Task visible to creator AND all assigned users           │
│ - All assigned users can update status                     │
│ - Progress tracked via completedSubtasks                   │
└─────────────────────────────────────────────────────────────┘
```

---

### **Flow 4: Task Management by Different Users**

```
┌─────────────────────────────────────────────────────────────┐
│ Scenario: Parent creates collaborative task                 │
├─────────────────────────────────────────────────────────────┤
│ Initial State:                                              │
│ - Parent (business user) has 2 children: Child1, Child2    │
│ - Family group exists with 3 members                       │
│                                                             │
│ Action: Parent creates task                                 │
│ POST /tasks                                                 │
│ {                                                           │
│   taskType: 'collaborative',                               │
│   title: "Clean the House",                                │
│   assignedUserIds: [Child1Id, Child2Id],                   │
│   groupId: familyGroupId,                                  │
│   subtasks: [                                              │
│     { title: "Clean living room", assignedTo: Child1Id },  │
│     { title: "Clean kitchen", assignedTo: Child2Id }       │
│   ]                                                        │
│ }                                                           │
│                                                             │
│ Result:                                                     │
│ - Task created with status = 'pending'                     │
│ - totalSubtasks = 2, completedSubtasks = 0                 │
│ - Notification sent to Child1 and Child2                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Child1 completes their subtask                              │
├─────────────────────────────────────────────────────────────┤
│ PUT /subtasks/:subtaskId                                    │
│ { isCompleted: true, completedAt: new Date() }             │
│                                                             │
│ Result:                                                     │
│ - Subtask marked complete                                  │
│ - Task.completedSubtasks = 1 (auto-updated)                │
│ - Progress: 1/2 (50%)                                      │
│ - Notification to Parent: "Child1 completed their part"    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Child2 completes their subtask                              │
├─────────────────────────────────────────────────────────────┤
│ PUT /subtasks/:subtaskId                                    │
│ { isCompleted: true, completedAt: new Date() }             │
│                                                             │
│ Result:                                                     │
│ - Subtask marked complete                                  │
│ - Task.completedSubtasks = 2 (auto-updated)                │
│ - Progress: 2/2 (100%)                                     │
│ - Task.status auto-changed to 'completed'                  │
│ - Task.completedTime = new Date()                          │
│ - Notification to Parent: "Task completed!"                │
└─────────────────────────────────────────────────────────────┘
```

---

### **Flow 5: Permission-Based Task Creation**

```
┌─────────────────────────────────────────────────────────────┐
│ Parent grants task creation permission to Child1            │
├─────────────────────────────────────────────────────────────┤
│ PUT /group-members/:memberId                                │
│ {                                                           │
│   permissions: {                                             │
│     canCreateTasks: true                                   │
│   }                                                        │
│ }                                                           │
│                                                             │
│ Result:                                                     │
│ - Child1.canCreateTasks = true                             │
│ - Child1 can now create tasks for the family               │
│ - Child2.canCreateTasks = false (unchanged)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Child1 creates task for sibling (Child2)                    │
├─────────────────────────────────────────────────────────────┤
│ POST /tasks (by Child1)                                     │
│ {                                                           │
│   taskType: 'singleAssignment',                            │
│   title: "Help mom with groceries",                        │
│   assignedUserIds: [Child2Id],                             │
│   groupId: familyGroupId                                   │
│ }                                                           │
│                                                             │
│ Validation:                                                 │
│ - Check Child1.permissions.canCreateTasks === true         │
│ - Check Child2 is member of familyGroupId                  │
│                                                             │
│ Result:                                                     │
│ - Task created successfully                                │
│ - Child2 receives notification                             │
│ - Task visible to Parent, Child1, Child2                   │
└─────────────────────────────────────────────────────────────┘
```

---

### **Flow 6: Task Queries by Different Users**

```
┌─────────────────────────────────────────────────────────────┐
│ GET /tasks/my (by Parent)                                   │
├─────────────────────────────────────────────────────────────┤
│ Returns:                                                    │
│ 1. Tasks created by Parent                                 │
│ 2. Tasks owned by Parent (personal)                        │
│ 3. Tasks assigned to Parent                                │
│ 4. Tasks for all groups where Parent is owner              │
│                                                             │
│ Query Logic:                                                │
│ {                                                           │
│   $or: [                                                   │
│     { createdById: parentId },                             │
│     { ownerUserId: parentId },                             │
│     { assignedUserIds: parentId },                         │
│     { groupId: { $in: [parentGroups] } }                   │
│   ]                                                        │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ GET /tasks/my (by Child1)                                   │
├─────────────────────────────────────────────────────────────┤
│ Returns:                                                    │
│ 1. Tasks created by Child1 (if has permission)             │
│ 2. Tasks owned by Child1 (personal)                        │
│ 3. Tasks assigned to Child1                                │
│ 4. Tasks for groups where Child1 is member                 │
│                                                             │
│ Query Logic:                                                │
│ {                                                           │
│   $or: [                                                   │
│     { createdById: child1Id },                             │
│     { ownerUserId: child1Id },                             │
│     { assignedUserIds: child1Id },                         │
│     { groupId: { $in: [child1Groups] } }                   │
│   ]                                                        │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Business Rules

### **1. Task Visibility**

| User Type | Can See |
|-----------|---------|
| **Creator** | All tasks they created |
| **Owner** | Tasks they own (personal) |
| **Assigned User** | Tasks assigned to them |
| **Group Member** | Tasks for their groups |
| **Parent (Business User)** | All tasks in their family groups |

---

### **2. Task Permissions**

| Action | Creator | Owner | Assigned | Group Member |
|--------|---------|-------|----------|--------------|
| View | ✅ | ✅ | ✅ | ✅ (group tasks) |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Complete | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Add Subtasks | ✅ | ✅ | ✅ | ❌ |

---

### **3. SubTask Assignment**

```
SubTask can be assigned to:
1. Any user in the same group
2. The task creator
3. Users with canCreateTasks permission

Cannot assign to:
- Users outside the group
- Blocked/inactive members
```

---

### **4. Group Membership Requirements**

```
To be assigned to a group task:
1. Must be active member of the group
2. Must not be blocked
3. Group must be active

To create group tasks:
1. Must have canCreateTasks = true
2. Must be active member
3. Group must allow task creation
```

---

## 📊 Database Relationships

```
User (Business User)
  │
  ├─→ ChildrenBusinessUser (parent-child relationship)
  │     └─→ User (Child)
  │
  ├─→ Group (owns family group)
  │     └─→ GroupMember (membership)
  │           └─→ User (children as members)
  │
  └─→ Task (creates tasks)
        ├─→ assignedUserIds: [User]
        ├─→ groupId: Group
        └─→ SubTask (embedded or separate)
              └─→ assignedToUserId: User
```

---

## 🎉 Summary

### **Module Responsibilities:**

| Module | Responsibility |
|--------|---------------|
| **user.module** | User accounts (business + children) |
| **childrenBusinessUser.module** | Parent-child relationships |
| **group.module** | Family groups for task assignment |
| **groupMember.module** | Membership & permissions |
| **task.module** | Task creation & management |
| **subTask.module** | Subtask tracking |

### **Key Design Decisions:**

1. ✅ **Direct parent-child relationship** (no group abstraction needed)
2. ✅ **Groups for task assignment only** (optional feature)
3. ✅ **3 task types** (personal, single, collaborative)
4. ✅ **Permission-based task creation** (canCreateTasks flag)
5. ✅ **Embedded subtasks** (for simplicity) OR separate collection
6. ✅ **Redis caching** for all read operations
7. ✅ **Daily task limits** (prevent abuse)

---

**Document Created**: 09-03-26  
**Version**: 1.0.0  
**Status**: ✅ Complete Business Flow Documented
