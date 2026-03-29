# ✅ Child Permissions Feature - Implementation Plan

**Date**: 11-03-26  
**Status**: 🔄 **IN PROGRESS**  
**Figma Reference**: `dashboard-flow-03.png`, `add-task-flow-for-permission-account-interface.png`  

---

## 🎯 Feature Overview

Parents/Teachers can grant task management permissions to their children/students.

### **Permissions:**
- ✅ `canCreateTasks` - Create new tasks
- ✅ `canAssignTasks` - Assign tasks to others  
- ✅ `canDeleteTasks` - Delete own tasks
- ✅ `canViewAllTasks` - View all family tasks
- ✅ `canCreateSubtasks` - Add subtasks

---

## 📊 Figma Analysis

### **dashboard-flow-03.png** (Parent Dashboard)
```
Permissions Section:
- "Allow Secondary users to create tasks" toggle
- "Secondary users can create and assign tasks to others"
- Shows which children have permissions
```

### **add-task-flow-for-permission-account-interface.png** (Child with Permission)
```
Child with "Task Manager" permission can:
- Create Collaborative Tasks
- Create Single Assignment Tasks  
- Create Personal Tasks
- Assign tasks to family members
- See all members in "Assign To" dropdown
```

---

## 🏗️ Implementation Status

### ✅ **Completed (Files Modified)**

1. **Interface** (`childrenBusinessUser.interface.ts`)
   - Added `IChildPermissions` interface
   - Added `permissions` field to `IChildrenBusinessUser`

2. **Model** (`childrenBusinessUser.model.ts`)
   - Added `permissions` schema with 5 boolean fields
   - Default values set (restrictive by default)

3. **Validation** (`childrenBusinessUser.validation.ts`)
   - Added `updateChildPermissionsValidationSchema`
   - Validates all permission fields

4. **Service** (`childrenBusinessUser.service.ts`)
   - Added `updateChildPermissions()` method
   - Added `getChildPermissions()` method
   - Cache invalidation included

---

### ⏳ **TODO: Remaining Implementation**

#### **1. Controller Method**

**File**: `childrenBusinessUser.controller.ts`

```typescript
/** ----------------------------------------------
 * @role Business User (Parent/Teacher)
 * @Section Child Permissions
 * @module ChildrenBusinessUser
 * @figmaIndex dashboard-flow-03.png
 * @desc Update child task management permissions
 *----------------------------------------------*/
updateChildPermissions = catchAsync(async (req: Request, res: Response) => {
  const businessUserId = (req.user as IUser).userId;
  const { childId } = req.params;
  const { permissions } = req.body;

  const result = await this.childrenBusinessUserService.updateChildPermissions(
    businessUserId,
    childId,
    permissions
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Child permissions updated successfully',
    success: true,
  });
});
```

---

#### **2. Route Definition**

**File**: `childrenBusinessUser.route.ts`

```typescript
/*-─────────────────────────────────
|  Business | Children | Permissions | dashboard-flow-03.png | Update child permissions
|  @desc Grant or revoke task management permissions for child
|  @auth Business user (Parent/Teacher) only
|  @rateLimit 20 requests per hour
└──────────────────────────────────*/
router.route('/:childId/permissions').put(
  auth(TRole.business),
  validateRequest(validation.updateChildPermissionsValidationSchema),
  controller.updateChildPermissions
);

/*-─────────────────────────────────
|  Business | Children | Permissions | dashboard-flow-03.png | Get child permissions
|  @desc Get current permissions for a child
|  @auth Business user (Parent/Teacher) only
└──────────────────────────────────*/
router.route('/:childId/permissions').get(
  auth(TRole.business),
  controller.getChildPermissions
);
```

---

#### **3. Integration with Task Module**

**File**: `task.module/task.middleware.ts`

```typescript
/**
 * Check if child user has permission to create tasks
 */
export const checkChildTaskPermission = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req.user as IUser).userId;
  const user = await User.findById(userId).select('role').lean();

  // If business user → always allow
  if (user?.role === TRole.business) {
    return next();
  }

  // If child user → check permissions
  if (user?.role === TRole.child) {
    const { ChildrenBusinessUser } = await import(
      '../../childrenBusinessUser.module/childrenBusinessUser.model'
    );

    const relationship = await ChildrenBusinessUser.findOne({
      childUserId: new Types.ObjectId(userId),
      isDeleted: false,
      status: 'active',
    }).select('permissions');

    if (!relationship) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Child account not found'
      );
    }

    // Check specific permission based on action
    const action = req.method === 'POST' ? 'canCreateTasks' :
                   req.method === 'PUT' ? 'canAssignTasks' :
                   req.method === 'DELETE' ? 'canDeleteTasks' : 'canViewAllTasks';

    if (!relationship.permissions[action]) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        `You do not have permission to ${action.replace('can', '').toLowerCase()} tasks`
      );
    }
  }

  next();
});
```

---

#### **4. Update Task Routes**

**File**: `task.module/task.route.ts`

```typescript
/*-─────────────────────────────────
|  Child | Business | Task | create-task-flow.png | Create task
|  @desc Create personal, single assignment, or collaborative task
|  @auth All authenticated users (child, business)
|  @permission Child users need canCreateTasks permission
└──────────────────────────────────*/
router.route('/').post(
  auth(TRole.commonUser),
  checkChildTaskPermission,  // ⬅️ NEW: Check child permissions
  validateRequest(validation.createTaskValidationSchema),
  controller.create
);
```

---

## 📡 API Endpoints

### **PUT /children/:childId/permissions**

Update child's task management permissions.

**Request:**
```http
PUT /children/64f5a1b2c3d4e5f6g7h8i9j0/permissions
Authorization: Bearer <PARENT_JWT_TOKEN>
Content-Type: application/json

{
  "permissions": {
    "canCreateTasks": true,
    "canAssignTasks": true,
    "canDeleteTasks": false,
    "canViewAllTasks": true,
    "canCreateSubtasks": true
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "childUserId": "64f5a1b2c3d4e5f6g7h8i9j0",
    "permissions": {
      "canCreateTasks": true,
      "canAssignTasks": true,
      "canDeleteTasks": false,
      "canViewAllTasks": true,
      "canCreateSubtasks": true
    },
    "updatedAt": "2026-03-11T10:30:00.000Z"
  },
  "message": "Child permissions updated successfully"
}
```

---

### **GET /children/:childId/permissions**

Get current permissions for a child.

**Request:**
```http
GET /children/64f5a1b2c3d4e5f6g7h8i9j0/permissions
Authorization: Bearer <PARENT_JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "childUserId": "64f5a1b2c3d4e5f6g7h8i9j0",
    "permissions": {
      "canCreateTasks": true,
      "canAssignTasks": true,
      "canDeleteTasks": false,
      "canViewAllTasks": true,
      "canCreateSubtasks": true
    }
  }
}
```

---

## 🔐 Permission Matrix

| Action | Business User | Child with Permission | Child without Permission |
|--------|---------------|----------------------|-------------------------|
| Create Personal Task | ✅ Yes | ✅ Yes | ❌ No |
| Create Single Assignment | ✅ Yes | ✅ Yes | ❌ No |
| Create Collaborative Task | ✅ Yes | ✅ Yes | ❌ No |
| Assign Task to Others | ✅ Yes | ✅ Yes | ❌ No |
| Delete Own Task | ✅ Yes | ❌ No (default) | ❌ No |
| View All Family Tasks | ✅ Yes | ✅ Yes (default) | ✅ Yes (default) |
| Create Subtask | ✅ Yes | ✅ Yes (default) | ✅ Yes (default) |

---

## 🧪 Testing Examples

### **Test 1: Parent Grants Permissions**
```bash
curl -X PUT http://localhost:5000/children/CHILD_ID/permissions \
  -H "Authorization: Bearer PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": {
      "canCreateTasks": true,
      "canAssignTasks": true
    }
  }'
```

### **Test 2: Child Creates Task (With Permission)**
```bash
curl -X POST http://localhost:5000/tasks \
  -H "Authorization: Bearer CHILD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Task",
    "taskType": "personal",
    "startTime": "2026-03-11T10:00:00Z"
  }'
# Expected: 201 Created
```

### **Test 3: Child Creates Task (Without Permission)**
```bash
# Same as Test 2 but child doesn't have canCreateTasks permission
# Expected: 403 Forbidden
# Response: "You do not have permission to create tasks"
```

---

## 📁 Files To Modify

### ✅ Already Modified:
1. `childrenBusinessUser.interface.ts` - Added permissions interface
2. `childrenBusinessUser.model.ts` - Added permissions schema
3. `childrenBusinessUser.validation.ts` - Added validation schema
4. `childrenBusinessUser.service.ts` - Added service methods

### ⏳ TODO:
1. `childrenBusinessUser.controller.ts` - Add controller method
2. `childrenBusinessUser.route.ts` - Add GET/PUT routes
3. `task.module/task.middleware.ts` - Add permission check middleware
4. `task.module/task.route.ts` - Add middleware to create task route
5. `task.module/doc/CHILD_PERMISSIONS_FEATURE-11-03-26.md` - Create documentation

---

## 🎯 Frontend Integration

### **Parent Dashboard (dashboard-flow-03.png)**
```dart
// Toggle permissions for child
PUT /children/:childId/permissions
{
  "permissions": {
    "canCreateTasks": true,  // From toggle
    "canAssignTasks": true,   // From toggle
    ...
  }
}
```

### **Child Profile (profile-permission-account-interface.png)**
```dart
// Display "Task Manager" badge if has permissions
if (permissions.canCreateTasks && permissions.canAssignTasks) {
  showBadge("Task Manager");
}
```

### **Task Creation (add-task-flow-for-permission-account-interface.png)**
```dart
// Enable "Create Task" button if has permission
if (permissions.canCreateTasks) {
  enableCreateTaskButton();
} else {
  showDisabledWithTooltip("Ask parent for permission");
}
```

---

## ✅ Implementation Checklist

- [x] Interface: Add `IChildPermissions`
- [x] Model: Add `permissions` schema
- [x] Validation: Add schema
- [x] Service: Add `updateChildPermissions()`
- [x] Service: Add `getChildPermissions()`
- [ ] Controller: Add method
- [ ] Routes: Add GET/PUT endpoints
- [ ] Middleware: Add task permission check
- [ ] Task Routes: Integrate middleware
- [ ] Documentation: Create feature doc
- [ ] Testing: Manual testing
- [ ] Testing: Unit tests

---

**Implementation Status**: 🔄 **IN PROGRESS**  
**Next Step**: Add controller method and routes
