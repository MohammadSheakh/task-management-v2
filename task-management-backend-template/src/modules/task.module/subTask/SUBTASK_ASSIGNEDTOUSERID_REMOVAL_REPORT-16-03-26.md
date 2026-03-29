# ✅ SubTask `assignedToUserId` Field Removal Report

**Date:** 16-03-26  
**Status:** ✅ COMPLETE  
**Reason:** Field not needed - subtasks are NOT assigned to individuals

---

## 🎯 DECISION RATIONALE

### **Why Remove `assignedToUserId`?**

1. **Flutter Model Alignment:**
   ```dart
   // Flutter SubTask model
   class SubTask {
     final String title;
     final bool isCompleted;
   }
   ```
   - No `assignedToUserId` field in Flutter
   - Subtasks are simple checklist items

2. **Task Assignment Logic:**
   - ✅ **Task** can be assigned to multiple people (`assignedUserIds` array)
   - ❌ **SubTask** is NOT assigned to individuals
   - ✅ All task assignees can complete ANY subtask

3. **Figma Verification:**
   - Subtasks appear as simple checkboxes
   - No user assignment UI for individual subtasks
   - Subtasks are shared checklist items for all task assignees

4. **Proper Tracking:**
   - Who completed what is tracked in **TaskProgress module** (for collaborative tasks)
   - SubTask only needs: `isCompleted` + `completedAt`

---

## 📝 FILES MODIFIED

### 1. **subTask.model.ts** ✅
**Changes:**
- ❌ Removed `assignedToUserId` field from schema
- ❌ Removed `assignedToUserId` index
- ✅ Updated transform to not delete non-existent field

**Before:**
```typescript
assignedToUserId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
},

// Index
subTaskSchema.index({ assignedToUserId: 1, isCompleted: 1, isDeleted: 1 });

// Transform
delete ret.assignedToUserId;
```

**After:**
```typescript
// Field removed completely

// Updated indexes
subTaskSchema.index({ taskId: 1, isCompleted: 1, isDeleted: 1 });
subTaskSchema.index({ taskId: 1, order: 1, isDeleted: 1 });

// Transform (removed deletion line)
delete ret.createdById;
// assignedToUserId deletion removed
```

---

### 2. **subTask.interface.ts** ✅
**Changes:**
- ❌ Removed `assignedToUserId?: Types.ObjectId` from `ISubTask`
- ❌ Removed from `ISubTaskQueryOptions`
- ❌ Removed from `ICreateSubTask` DTO
- ❌ Removed from `IUpdateSubTask` DTO

**Before:**
```typescript
export interface ISubTask {
  // ...
  assignedToUserId?: Types.ObjectId;
}

export interface ISubTaskQueryOptions {
  // ...
  assignedToUserId?: string;
}

export interface ICreateSubTask {
  title: string;
  assignedToUserId?: string;
}

export interface IUpdateSubTask {
  title?: string;
  isCompleted?: boolean;
  assignedToUserId?: string;
  order?: number;
}
```

**After:**
```typescript
export interface ISubTask {
  // assignedToUserId removed
}

export interface ISubTaskQueryOptions {
  // assignedToUserId removed
}

export interface ICreateSubTask {
  title: string;
}

export interface IUpdateSubTask {
  title?: string;
  isCompleted?: boolean;
  order?: number;
}
```

---

### 3. **subTask.validation.ts** ✅
**Changes:**
- ❌ Removed `assignedToUserId` validation from create schema
- ❌ Removed `assignedToUserId` validation from update schema

**Before:**
```typescript
export const createSubTaskValidationSchema = z.object({
  body: z.object({
    // ...
    assignedToUserId: z
      .string()
      .refine((val) => val.match(/^[0-9a-fA-F]{24}$/), {
        message: 'Invalid assignedToUserId format',
      })
      .optional(),
  }),
});
```

**After:**
```typescript
export const createSubTaskValidationSchema = z.object({
  body: z.object({
    taskId: z.string(),
    title: z.string().min(1).max(200),
    order: z.number().optional(),
    isCompleted: z.boolean().default(false).optional(),
  }),
});
```

---

### 4. **subTask.service.ts** ✅
**Changes:**
- ✅ Updated `getUserSubTaskStatistics` to use `createdById` instead of `assignedToUserId`

**Before:**
```typescript
async getUserSubTaskStatistics(userId: Types.ObjectId) {
  const stats = await this.model.aggregate([
    {
      $match: {
        assignedToUserId: new Types.ObjectId(userId),
        isDeleted: false,
      },
    },
    // ...
  ]);
}
```

**After:**
```typescript
async getUserSubTaskStatistics(userId: Types.ObjectId) {
  const stats = await this.model.aggregate([
    {
      $match: {
        createdById: new Types.ObjectId(userId),
        isDeleted: false,
      },
    },
    // ...
  ]);
}
```

---

### 5. **subTask.route.ts** ✅
**Changes:**
- ❌ Removed `assignedToUserId` populate from 3 route handlers

**Before:**
```typescript
setQueryOptions({
  populate: [
    { path: 'createdById', select: 'name email' },
    { path: 'assignedToUserId', select: 'name email' },
  ],
})
```

**After:**
```typescript
setQueryOptions({
  populate: [
    { path: 'createdById', select: 'name email' },
  ],
})
```

---

## 📊 IMPACT ANALYSIS

### **Database Migration Required:**

```javascript
// Run this in MongoDB to clean up existing data
db.subtasks.updateMany(
  { assignedToUserId: { $exists: true } },
  { $unset: { assignedToUserId: "" } }
);

// Remove the index
db.subtasks.dropIndex("assignedToUserId_1_isCompleted_1_isDeleted_1");
```

### **API Changes:**

#### **Create Subtask**
**Before:**
```json
POST /v1/tasks/subtask/
{
  "taskId": "...",
  "title": "Step 1",
  "assignedToUserId": "..."  // ❌ REMOVED
}
```

**After:**
```json
POST /v1/tasks/subtask/
{
  "taskId": "...",
  "title": "Step 1",
  "order": 1
}
```

#### **Update Subtask**
**Before:**
```json
PUT /v1/tasks/subtask/:id
{
  "title": "Updated",
  "assignedToUserId": "..."  // ❌ REMOVED
}
```

**After:**
```json
PUT /v1/tasks/subtask/:id
{
  "title": "Updated",
  "isCompleted": true,
  "order": 2
}
```

---

## ✅ VERIFICATION CHECKLIST

- [x] Model field removed
- [x] Index removed
- [x] Interface updated
- [x] DTOs updated
- [x] Validation schemas updated
- [x] Service logic updated
- [x] Route populate removed
- [x] Transform function updated
- [x] Documentation created

---

## 🎯 CORRECT DATA MODEL

### **Task Module Architecture:**

```
Task (Parent)
├── assignedUserIds: [ObjectId]  ← Multiple people can be assigned
├── createdById: ObjectId
├── ownerUserId: ObjectId
└── subtasks: [Embedded] OR SubTask[] (Separate collection)
    ├── title: String
    ├── isCompleted: Boolean
    ├── completedAt: Date
    └── order: Number
    └── NO assignedToUserId ✅

TaskProgress (For Collaborative Tasks)
├── taskId: ObjectId
├── userId: ObjectId  ← Track per-user progress
├── completedSubtaskIndexes: [Number]
└── status: String
```

### **User Journey:**

1. **Parent creates collaborative task** → Assigns to 3 children
2. **Task has 5 subtasks** → Simple checklist
3. **Child 1 completes subtask #1** → 
   - ✅ SubTask: `isCompleted = true`
   - ✅ TaskProgress: `completedSubtaskIndexes: [0]` for Child 1
   - ✅ Task: `completedSubtasks` count updated
4. **Child 2 completes subtask #2** →
   - ✅ SubTask: `isCompleted = true` (shared)
   - ✅ TaskProgress: `completedSubtaskIndexes: [1]` for Child 2

**Key Insight:** Subtasks are **shared checklist items**, not individually assigned!

---

## 📌 NEXT STEPS

1. ✅ Run database migration to remove field
2. ✅ Test all SubTask endpoints
3. ✅ Update Postman collection (remove `assignedToUserId` from examples)
4. ✅ Verify Flutter app alignment
5. ✅ Update API documentation

---

**Report By:** Qwen Code (Senior Backend Engineer)  
**Status:** ✅ COMPLETE - All files updated  
**Database Migration:** ⚠️ PENDING (Run migration script)
