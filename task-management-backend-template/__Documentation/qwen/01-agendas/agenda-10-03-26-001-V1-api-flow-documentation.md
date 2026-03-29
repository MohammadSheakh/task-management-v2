# Agenda: API Flow Documentation - Task Module

**Date:** 10-03-26  
**Session:** 001  
**Version:** V1  
**Focus:** Task Module API Flow Documentation

---

## 📋 Objective

Create comprehensive API flow documentation that maps **Figma screens** to **actual API endpoints** for the Task Management module.

**Why:** Backend developers and Flutter developers need a clear understanding of:
- Which API calls are triggered on each screen
- Request/response formats for each flow
- Error handling and recovery strategies
- Permission-based UI variations
- State management and cache invalidation

---

## 📁 Files Created

### Flow Documentation (New Folder: `/flow/`)

| File | Purpose | Status |
|------|---------|--------|
| `flow/README.md` | Index and navigation for all flows | ✅ Complete |
| `flow/01-child-student-home-flow.md` | Child home screen API flow | ✅ Complete |
| `flow/02-business-parent-dashboard-flow.md` | Parent dashboard API flow | ✅ Complete |
| `flow/03-child-task-creation-flow.md` | Task creation with permissions | ✅ Complete |

---

## 📊 Flow Documents Breakdown

### Flow 01: Child/Student - Home Screen

**Figma:** `app-user/group-children-user/home-flow.png`

**Flows Documented:**
1. App Launch & Authentication
2. Home Screen Initial Load (parallel API calls)
3. Pull to Refresh
4. View Task Details
5. Complete a Task
6. Update Subtask Progress
7. Filter Tasks by Status
8. Filter Tasks by Priority
9. Paginated Task List

**Key Features:**
- Sequence diagram for complete user session
- State management table (cache invalidation)
- Error handling with recovery strategies
- Performance considerations (caching, optimizations)
- Flutter integration points

---

### Flow 02: Business/Parent - Dashboard

**Figma:** `teacher-parent-dashboard/dashboard/`

**Flows Documented:**
1. Dashboard Initial Load
2. View All Tasks with Filters
3. Create Task for Child (Single Assignment)
4. Create Collaborative Task (Multiple Children)
5. Update Child's Task
6. Monitor Task Completion
7. Delete Task
8. Weekly/Monthly Progress Report
9. Task Assignment with Permissions

**Key Features:**
- Parent-specific endpoints
- Child monitoring capabilities
- Permission management
- Analytics and reporting
- Group-based task creation

---

### Flow 03: Child/Student - Task Creation (Permission-Based)

**Figma:** `app-user/group-children-user/add-task-flow-for-permission-account-interface.png`

**Flows Documented:**
1. Permission Check (Pre-Screen Load)
2. Create Task Screen - With Permission (Full UI)
3. Create Personal Task (Always Allowed)
4. Create Single Assignment Task (Permission Required)
5. Create Collaborative Task (Multiple Assignees)
6. Create Task Screen - Without Permission (Restricted UI)
7. Validation Errors (4 different scenarios)
8. Post-Creation Flow

**Key Features:**
- Permission matrix by role
- Task type validation logic
- Daily task limit enforcement (5 tasks/day)
- Group-based permissions
- Frontend permission checking logic
- Error handling with specific messages

---

## 🎯 Key Achievements

### 1. Standardized Flow Documentation Format

Each flow document includes:
- ✅ Role and Figma reference
- ✅ User journey overview
- ✅ Step-by-step API calls with request/response
- ✅ Sequence diagrams
- ✅ State management tables
- ✅ Error handling strategies
- ✅ Performance considerations
- ✅ Flutter integration points
- ✅ Testing checklist

### 2. Role-Based Organization

Documents organized by user role:
- **Child/Student** flows
- **Business/Parent** flows
- **Admin** flows (TODO)

### 3. Permission Logic Documentation

Clear documentation of:
- `canCreateTasks` permission
- Task type restrictions (personal vs group)
- Daily task limits
- Group-based access control

### 4. Backend-Frontend Alignment

Each API flow tied to:
- Specific Figma screenshot
- Actual backend endpoint
- Real request/response examples
- Error scenarios

---

## 📈 Statistics

| Metric | Count |
|--------|-------|
| Flow Documents Created | 3 |
| Total API Flows Documented | 20+ |
| Sequence Diagrams | 3 |
| Error Scenarios Covered | 15+ |
| Endpoints Documented | 25+ |
| Pages of Documentation | ~60 |

---

## 🗂️ Folder Structure

```
task-management-backend-template/
├── flow/
│   ├── README.md (index)
│   ├── 01-child-student-home-flow.md
│   ├── 02-business-parent-dashboard-flow.md
│   └── 03-child-task-creation-flow.md
│
└── __Documentation/
    └── qwen/
        └── agenda-10-03-26-001-V1-api-flow-docs.md (this file)
```

---

## 🔄 Next Steps (TODO)

### High Priority
1. **Task Edit Flow** (`04-child-task-edit-flow.md`)
   - Figma: `edit-update-task-flow.png`
   - Update task details
   - Update task status
   - Update subtask progress

2. **Profile/Permissions Flow** (`05-child-profile-flow.md`)
   - Figma: `profile-permission-account-interface.png`
   - View profile
   - View permissions
   - Request permission changes

3. **Team Members Flow** (`06-business-team-flow.md`)
   - Figma: `teacher-parent-dashboard/team-members/`
   - View team members
   - Add/remove members
   - Manage member permissions

### Medium Priority
4. **Task Monitoring Flow** (`07-business-monitoring-flow.md`)
   - Figma: `teacher-parent-dashboard/task-monitoring/`
   - Monitor child progress
   - View completion rates
   - Track subtask progress

5. **Settings/Permissions Flow** (`08-business-settings-flow.md`)
   - Figma: `teacher-parent-dashboard/settings-permission-section/`
   - Update group settings
   - Manage permissions
   - Notification preferences

6. **Admin Dashboard Flow** (`09-admin-dashboard-flow.md`)
   - Figma: `main-admin-dashboard/`
   - System overview
   - User management
   - Task oversight

### Low Priority
7. **Notification Flows** (All roles)
8. **Group Management Flows**
9. **Analytics/Reports Flows**

---

## 🎓 Lessons Learned

### What Worked Well:
1. **Modular approach** - One flow per document
2. **Figma alignment** - Direct screenshot references
3. **Real examples** - Actual request/response from Postman
4. **Error focus** - Dedicated error handling sections
5. **Performance notes** - Caching and optimization tips

### Challenges:
1. **Permission complexity** - Multiple permission levels needed clear documentation
2. **Task type validation** - Personal vs single vs collaborative required detailed examples
3. **State management** - Cache invalidation across related flows

### Solutions:
1. **Permission matrix tables** - Clear role-based permissions
2. **Validation error examples** - Show exact error responses
3. **Cache key naming** - Standardized cache invalidation patterns

---

## 🔗 Related Documentation

- **Postman Collections:** `/postman-collections/`
- **Figma Assets:** `/figma-asset/`
- **Task Module Routes:** `src/modules/task.module/task/task.route.ts`
- **SubTask Routes:** `src/modules/task.module/subTask/subTask.route.ts`
- **API Documentation:** `src/modules/task.module/doc/API_DOCUMENTATION.md`

---

## 📞 For Questions

Refer to:
1. Flow README: `flow/README.md`
2. Specific flow documents (01, 02, 03)
3. Postman collections for actual requests
4. Backend route files for implementation details

---

**Session Complete:** ✅  
**Next Session:** Continue with flows 04-06 (Task Edit, Profile, Team Members)  
**Time Spent:** ~2 hours  
**Output:** 3 comprehensive flow documents + index

---

10-03-26
