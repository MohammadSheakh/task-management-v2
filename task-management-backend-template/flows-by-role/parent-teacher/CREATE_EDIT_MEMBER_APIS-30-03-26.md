# ✅ CREATE & EDIT MEMBER FLOW - Complete API Documentation

**Last Updated**: 30-03-26  
**Status**: ✅ **COMPLETE**  
**Figma References**: 
- `create-child-flow.png` - Create Member screen
- `edit-child-flow.png` - Edit Member screen

---

## 📊 SUMMARY

I've verified and implemented **ALL APIs** for the **Create Member** and **Edit Member** flows:

### ✅ **Create Member Flow** (create-child-flow.png)
**API**: `POST /children-business-users/children`  
**Status**: ✅ **Already Implemented**

### ✅ **Edit Member Flow** (edit-child-flow.png)
**APIs**:
1. ✅ `PATCH /children-business-users/children/:childId` - **NEWLY ADDED** - Update profile
2. ✅ `DELETE /children-business-users/children/:childId` - Already exists - Remove member
3. ✅ `POST /children-business-users/children/:childId/reactivate` - Already exists - Reactivate

---

## 🎯 CREATE MEMBER FLOW

### Screen: Create Member
**Figma**: `teacher-parent-dashboard/team-members/create-child-flow.png`

### API Details

```
POST /children-business-users/children
```

**Request Body**:
```json
{
  "name": "Alax Morgn",
  "email": "alax.morgn@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+1234567890",
  "gender": "male",
  "supportMode": "calm",
  "location": "New York, USA",
  "dateOfBirth": "2015-05-15"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "childUser": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "Alax Morgn",
      "email": "alax.morgn@example.com",
      "phoneNumber": "+1234567890",
      "accountCreatorId": "64f5a1b2c3d4e5f6g7h8i9j1"
    },
    "relationship": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j2",
      "parentBusinessUserId": "64f5a1b2c3d4e5f6g7h8i9j1",
      "childUserId": "64f5a1b2c3d4e5f6g7h8i9j0",
      "addedAt": "2026-03-30T10:00:00.000Z",
      "status": "active",
      "isSecondaryUser": false
    }
  },
  "message": "Child account created successfully and added to family"
}
```

### Form Fields Mapping (Create → Backend)

| Figma Field | Backend Field | Model | Required | Validation |
|-------------|---------------|-------|----------|------------|
| User name | `name` | User | ✅ Yes | 2-100 chars |
| Email | `email` | User | ✅ Yes | Valid email |
| Phone number | `phoneNumber` | User | Optional | Valid phone format |
| Address | `location` | UserProfile | Optional | Max 200 chars |
| Gender | `gender` | User | Optional | male/female/other |
| Date of Birth | `dateOfBirth` | UserProfile | Optional | YYYY-MM-DD |
| Age | *(auto-calculated)* | - | Auto | From DOB |
| Support Mode | `supportMode` | UserProfile | Optional | calm/encouraging/logical |
| Enter Password | `password` | User | ✅ Yes | Min 8 chars |

---

## 🎯 EDIT MEMBER FLOW

### Screen: Edit Member
**Figma**: `teacher-parent-dashboard/team-members/edit-child-flow.png`

### API #1: Update Profile

```
PATCH /children-business-users/children/:childId
```

**Request Body** (all fields optional):
```json
{
  "name": "Alax Morgn Updated",
  "email": "alax.updated@example.com",
  "phoneNumber": "+1234567899",
  "gender": "male",
  "supportMode": "encouraging",
  "location": "Los Angeles, USA",
  "dateOfBirth": "2015-05-15",
  "password": "NewSecurePass456!",
  "note": "Updated profile information"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "Alax Morgn Updated",
      "email": "alax.updated@example.com",
      "phoneNumber": "+1234567899",
      "gender": "male",
      "profileImage": {
        "imageUrl": "https://example.com/avatar.png"
      }
    },
    "profile": {
      "supportMode": "encouraging",
      "location": "Los Angeles, USA",
      "dob": "2015-05-15"
    },
    "relationship": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j2",
      "note": "Updated profile information",
      "isSecondaryUser": false,
      "status": "active"
    }
  },
  "message": "Child profile updated successfully"
}
```

### Form Fields Mapping (Edit → Backend)

| Figma Field | Backend Field | Model | Update Logic |
|-------------|---------------|-------|--------------|
| User name | `name` | User | Direct update |
| Email | `email` | User | ✅ Checks for duplicates |
| Phone number | `phoneNumber` | User | Direct update |
| Address | `location` | UserProfile | Updates profile |
| Gender | `gender` | User | Enum validation |
| Date of Birth | `dateOfBirth` | UserProfile | Updates profile |
| Age | *(auto-calculated)* | - | Auto from DOB |
| Support Mode | `supportMode` | UserProfile | calm/encouraging/logical |
| Enter Password | `password` | User | ✅ Hashed with bcrypt (12 rounds) |

### Special Features

✅ **Email Uniqueness Check**: If email is updated, checks against existing users  
✅ **Password Hashing**: Automatically hashes with bcryptjs (12 rounds)  
✅ **Cache Invalidation**: Invalidates Redis cache after update  
✅ **Dual Model Update**: Updates both User and UserProfile models  
✅ **Audit Trail**: Note field tracked in relationship model  

---

### API #2: Remove Member

```
DELETE /children-business-users/children/:childId
```

**Request Body** (optional):
```json
{
  "note": "Child account removed by parent"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Child removed from family successfully"
}
```

**What happens**:
- ✅ Soft delete (sets `isDeleted: true`, `status: 'removed'`)
- ✅ Child account still exists in database
- ✅ Can be reactivated later
- ✅ Cache invalidated

---

### API #3: Reactivate Member

```
POST /children-business-users/children/:childId/reactivate
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Child account reactivated successfully"
}
```

**What happens**:
- ✅ Sets `status: 'active'`
- ✅ Sets `isDeleted: false`
- ✅ Adds note: "Reactivated"
- ✅ Cache invalidated

---

## 📊 COMPLETE TEAM MEMBERS FEATURE

### All Available APIs

| # | Method | Endpoint | Purpose | Figma |
|---|--------|----------|---------|-------|
| 1 | POST | `/children-business-users/children` | Create member | create-child-flow.png |
| 2 | PATCH | `/children-business-users/children/:childId` | **Update member** | edit-child-flow.png |
| 3 | DELETE | `/children-business-users/children/:childId` | Remove member | edit-child-flow.png |
| 4 | POST | `/children-business-users/children/:childId/reactivate` | Reactivate member | edit-child-flow.png |
| 5 | GET | `/children-business-users/team-members` | Get members with task counts | team-member-flow-01.png |
| 6 | GET | `/children-business-users/team-members/statistics` | Get statistics | team-member-flow-01.png |
| 7 | GET | `/children-business-users/team-members/list/v3` | Get paginated list | team-member-flow-01.png |
| 8 | GET | `/children-business-users/team-members/:memberId/v2` | Get member details | all-task-of-a-member-flow.png |
| 9 | PUT | `/children-business-users/children/:childId/secondary-user` | Set secondary user | dashboard-flow-03.png |
| 10 | GET | `/children-business-users/secondary-user` | Get secondary user | dashboard-flow-03.png |

---

## 🔐 SECURITY & VALIDATION

### Rate Limiting

| Endpoint | Rate Limit | Reason |
|----------|-----------|---------|
| POST /children | 3 req/hour | Prevents abuse (strict) |
| PATCH /children/:childId | 20 req/hour | Prevents frequent changes |
| DELETE /children/:childId | 20 req/hour | Prevents accidental deletion |
| GET endpoints | 30 req/min | Normal usage |

### Authentication

- ✅ All endpoints require `auth(TRole.business)`
- ✅ Only business users (parents/teachers) can manage children
- ✅ JWT token required in Authorization header

### Validation Rules

**Email**:
- Must be valid email format
- Must be unique across all users
- Automatically lowercased

**Password**:
- Minimum 8 characters
- Maximum 128 characters
- Hashed with bcryptjs (12 rounds)
- Never returned in responses

**Phone Number**:
- Optional field
- Must match international phone format
- Allows: `+`, digits, spaces, dashes, parentheses

**Support Mode**:
- Enum: `calm`, `encouraging`, `logical`
- From Figma design
- Stored in UserProfile

**Date of Birth**:
- Format: `YYYY-MM-DD`
- Used to calculate age dynamically
- Stored in UserProfile

---

## 🎯 USE CASES

### Use Case 1: Parent Creates Child Account

**Flow**:
1. Parent logs in → gets JWT token
2. Parent fills Create Member form
3. Frontend calls: `POST /children-business-users/children`
4. Backend:
   - ✅ Verifies business user has active subscription
   - ✅ Checks email uniqueness
   - ✅ Hashes password
   - ✅ Creates User account (role: 'child')
   - ✅ Creates UserProfile
   - ✅ Creates ChildrenBusinessUser relationship
   - ✅ Invalidates cache
5. Child account created → Parent can now assign tasks

---

### Use Case 2: Parent Updates Child Profile

**Flow**:
1. Parent clicks Edit on team member
2. Frontend loads current data: `GET /children-business-users/team-members/:memberId/v2`
3. Parent modifies fields
4. Frontend calls: `PATCH /children-business-users/children/:childId`
5. Backend:
   - ✅ Verifies relationship exists
   - ✅ Checks email uniqueness (if email changed)
   - ✅ Hashes new password (if provided)
   - ✅ Updates User model
   - ✅ Updates UserProfile model
   - ✅ Updates relationship note (if provided)
   - ✅ Invalidates cache
6. Profile updated → Frontend refreshes data

---

### Use Case 3: Parent Removes Child from Family

**Flow**:
1. Parent clicks Remove on team member
2. Frontend calls: `DELETE /children-business-users/children/:childId`
3. Backend:
   - ✅ Soft deletes (sets isDeleted: true)
   - ✅ Sets status: 'removed'
   - ✅ Invalidates cache
4. Child removed → Still exists in database
5. Parent can reactivate later

---

### Use Case 4: Parent Reactivates Previously Removed Child

**Flow**:
1. Parent navigates to removed members list
2. Parent clicks Reactivate
3. Frontend calls: `POST /children-business-users/children/:childId/reactivate`
4. Backend:
   - ✅ Sets status: 'active'
   - ✅ Sets isDeleted: false
   - ✅ Adds note: "Reactivated"
   - ✅ Invalidates cache
5. Child reactivated → Can receive tasks again

---

## 📝 TESTING GUIDE

### Manual Testing with cURL

#### 1. Create Child Account

```bash
curl -X POST http://localhost:5000/children-business-users/children \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Child",
    "email": "testchild@example.com",
    "password": "SecurePass123!",
    "phoneNumber": "+1234567890",
    "gender": "male",
    "supportMode": "calm",
    "location": "New York",
    "dateOfBirth": "2015-05-15"
  }'
```

#### 2. Update Child Profile

```bash
curl -X PATCH http://localhost:5000/children-business-users/children/CHILD_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "supportMode": "encouraging",
    "location": "Los Angeles"
  }'
```

#### 3. Remove Child

```bash
curl -X DELETE http://localhost:5000/children-business-users/children/CHILD_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Testing removal"
  }'
```

#### 4. Reactivate Child

```bash
curl -X POST http://localhost:5000/children-business-users/children/CHILD_ID/reactivate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎨 FRONTEND INTEGRATION

### React/Axios Example

```javascript
// Create Child
const createChild = async (childData) => {
  const response = await axios.post(
    '/children-business-users/children',
    childData,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.data;
};

// Update Child
const updateChild = async (childId, updateData) => {
  const response = await axios.patch(
    `/children-business-users/children/${childId}`,
    updateData,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.data;
};

// Remove Child
const removeChild = async (childId, note) => {
  const response = await axios.delete(
    `/children-business-users/children/${childId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      data: { note }
    }
  );
  return response.data;
};

// Reactivate Child
const reactivateChild = async (childId) => {
  const response = await axios.post(
    `/children-business-users/children/${childId}/reactivate`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.data;
};
```

---

## 📊 DATABASE SCHEMA

### ChildrenBusinessUser Model

```javascript
{
  _id: ObjectId,
  parentBusinessUserId: ObjectId,  // Reference to User (business user)
  childUserId: ObjectId,           // Reference to User (child)
  addedAt: Date,
  addedBy: ObjectId,
  status: 'active' | 'inactive' | 'removed',
  isSecondaryUser: Boolean,        // Only ONE per business user
  note: String,                    // Max 500 chars
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
// Primary query: Get all active children
{ parentBusinessUserId: 1, status: 1, isDeleted: 1 }

// Get parent for a child
{ childUserId: 1, status: 1, isDeleted: 1 }

// Get children by status
{ status: 1, isDeleted: 1 }

// Only ONE secondary user per business user
Enforced at application level
```

---

## 🚀 PERFORMANCE OPTIMIZATIONS

### Redis Caching

**Cache Keys**:
```
children:business:{businessUserId}:children     // 10 min TTL
children:business:{businessUserId}:count        // 10 min TTL
children:team-list:business:{businessUserId}    // 3 min TTL
children:team-statistics:business:{businessUserId} // 5 min TTL
```

**Cache Invalidation**:
- ✅ On create child
- ✅ On update child
- ✅ On remove child
- ✅ On reactivate child
- ✅ On set secondary user

### Database Optimization

**Query Optimization**:
- ✅ Uses `.lean()` for read-only queries
- ✅ Uses projection to select only needed fields
- ✅ Uses aggregation pipeline for complex queries
- ✅ Uses paginate plugin for pagination

**Indexing Strategy**:
- ✅ Compound indexes for multi-field queries
- ✅ Partial indexes for active records only
- ✅ Unique index on childUserId (one parent per child)

---

## ✅ VERIFICATION CHECKLIST

### Create Member Flow
- [x] POST endpoint exists
- [x] Validates all form fields
- [x] Hashes password
- [x] Creates User account
- [x] Creates UserProfile
- [x] Creates relationship record
- [x] Checks subscription limit
- [x] Invalidates cache
- [x] Returns proper response

### Edit Member Flow
- [x] PATCH endpoint exists
- [x] Validates update fields
- [x] Checks email uniqueness
- [x] Hashes new password (if provided)
- [x] Updates User model
- [x] Updates UserProfile model
- [x] Updates relationship note
- [x] Invalidates cache
- [x] Returns updated data

### Remove Member Flow
- [x] DELETE endpoint exists
- [x] Soft deletes (not permanent)
- [x] Sets status to 'removed'
- [x] Invalidates cache
- [x] Returns success response

### Reactivate Member Flow
- [x] POST endpoint exists
- [x] Sets status to 'active'
- [x] Sets isDeleted to false
- [x] Adds reactivation note
- [x] Invalidates cache
- [x] Returns success response

---

## 📚 RELATED DOCUMENTATION

- [Team Members Page APIs](./TEAM_MEMBERS_PAGE_APIS-18-03-26.md)
- [Secondary User Management](./SECONDARY_USER_APIS-18-03-26.md)
- [Children Business User Module](../src/modules/childrenBusinessUser.module/doc/)
- [Figma Assets](../figma-asset/teacher-parent-dashboard/team-members/)

---

**Document Generated**: 30-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ **COMPLETE - ALL APIS IMPLEMENTED**
