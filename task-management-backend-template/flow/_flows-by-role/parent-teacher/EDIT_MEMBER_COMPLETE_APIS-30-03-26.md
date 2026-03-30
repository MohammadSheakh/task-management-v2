# ✅ EDIT MEMBER FLOW - Complete Implementation

**Last Updated**: 30-03-26  
**Status**: ✅ **COMPLETE - ALL FIGMA FIELDS IMPLEMENTED**  
**Figma Reference**: `edit-child-flow.png` - Edit Member screen

---

## 📊 SUMMARY

I've verified and implemented the **Edit Member** API with **ALL fields** from the Figma design:

### ✅ **Edit Member Flow** (edit-child-flow.png)
**API**: `PATCH /children-business-users/children/:childId`  
**Status**: ✅ **COMPLETE - All Figma fields + Proper validation**

---

## 🎯 EDIT MEMBER FLOW

### Screen: Edit Member
**Figma**: `teacher-parent-dashboard/team-members/edit-child-flow.png`

### Complete Form Fields Mapping

| # | Figma Field | Backend Field | Model | Required | Validation | Update Logic |
|---|-------------|---------------|-------|----------|------------|--------------|
| 1 | User name | `name` | User | Optional* | 2-100 chars | Direct update |
| 2 | Email | `email` | User | Optional* | Valid email, unique | ✅ Checks duplicates |
| 3 | Phone number | `phoneNumber` | User | Optional | International format | Direct update |
| 4 | Address | `location` | UserProfile | Optional | Max 200 chars | Updates profile |
| 5 | Gender | `gender` | User | Optional | male/female/other | Enum validation |
| 6 | Date of Birth | `dateOfBirth` | UserProfile | Optional | YYYY-MM-DD | Updates profile |
| 7 | Age | *(auto-calculated)* | - | Auto | From DOB | Display only |
| 8 | Support Mode | `supportMode` | UserProfile | Optional | calm/encouraging/logical | Updates profile |
| 9 | Enter Password | `password` | User | Optional | Min 8 chars, hashed | Only if provided |

*Note: At least one field must be provided for update

### Support Mode Options (from Figma)

```
┌─────────────────────────────────┐
│  Support Mode Dropdown:         │
│                                 │
│  🧠 Calm         (selected)     │
│  ❤️ Encouraging                │
│  💡 Logical                     │
└─────────────────────────────────┘
```

---

## 📝 API DETAILS

### Endpoint

```
PATCH /children-business-users/children/:childId
```

**Authentication**: Required (Business User role)  
**Rate Limit**: 20 requests/hour (prevents frequent changes)  
**URL Parameter**: `:childId` - UUID of the child account

---

### Request Body

**Update All Fields Example:**
```json
{
  "name": "Alax Morgn Updated",
  "email": "alax.updated@example.com",
  "phoneNumber": "+1234567899",
  "location": "Los Angeles, USA",
  "gender": "male",
  "dateOfBirth": "2015-05-15",
  "supportMode": "encouraging",
  "password": "NewSecurePass456!",
  "note": "Updated profile information"
}
```

**Update Single Field Example:**
```json
{
  "supportMode": "logical"
}
```

### Validation Rules

```typescript
{
  name?: string (2-100 chars),
  email?: string (valid email, unique check),
  phoneNumber?: string (international format),
  location?: string (max 200 chars),
  gender?: 'male' | 'female' | 'other',
  dateOfBirth?: string (YYYY-MM-DD format),
  supportMode?: 'calm' | 'encouraging' | 'logical',
  password?: string (min 8 chars, auto-hashed),
  note?: string (max 500 chars, admin note)
}
```

---

### Response: 200 OK

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
        "imageUrl": "/uploads/users/user.png"
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

---

## 🔄 COMPLETE FLOW

### Step-by-Step Process

```
┌─────────────┐
│   Parent    │
│  (Business  │
│    User)    │
└────────────┘
       │ 1. Click "Edit" on team member
       ↓
┌─────────────────────────────────┐
│  GET /team-members/:memberId/v2 │
│  (Load current data)            │
└──────┬──────────────────────────┘
       │ 2. Display form with
       │    pre-filled data
       ↓
┌─────────────────────────────────┐
│  Edit Member Form:              │
│  - Pre-filled with current data │
│  - Modify any fields            │
│  - Change password (optional)   │
└──────┬──────────────────────────┘
       │ 3. Click "Update Profile"
       ↓
┌─────────────────────────────────┐
│  PATCH /children-business-users/│
│         children/:childId       │
│                                 │
│  Request Body:                  │
│  {                              │
│    name, email, phoneNumber,    │
│    location, gender,            │
│    dateOfBirth, supportMode,    │
│    password, note               │
│  } (all optional)               │
└──────┬──────────────────────────┘
       │ 4. Validate & Process
       ↓
┌─────────────────────────────────┐
│  Backend Actions:               │
│  ✅ Verify relationship         │
│  ✅ Check email uniqueness      │
│  ✅ Hash new password           │
│  ✅ Update User model           │
│     - name, email, phone, gender│
│  ✅ Update UserProfile model    │
│     - supportMode, location, dob│
│  ✅ Update relationship note    │
│  ✅ Invalidate cache            │
└──────┬──────────────────────────┘
       │ 5. Return
       ↓
┌─────────────────────────────────┐
│  Response:                      │
│  { user, profile, relationship }│
│  Status: 200 OK                 │
└──────┬──────────────────────────┘
       │ 6. Refresh
       ↓
┌─────────────┐
│  Updated    │
│  Member     │
│  Data       │
└─────────────┘
```

---

## 🔐 SECURITY FEATURES

### Email Uniqueness Check

```typescript
// Only checks if email is being updated
if (updateData.email) {
  const existingUser = await User.findOne({
    email: updateData.email.toLowerCase(),
    _id: { $ne: new Types.ObjectId(childUserId) }, // Exclude current user
    isDeleted: false,
  });

  if (existingUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Email already exists. Please use a different email address.'
    );
  }
}
```

### Password Security

```typescript
// Password hashing (only if provided)
if (updateData.password) {
  userUpdateData.password = await bcryptjs.hash(updateData.password, 12);
}

// Stored hashed in database
// Never returned in response
```

### Dual Model Update

```typescript
// User Model Updates
{
  name?: string,
  email?: string,
  phoneNumber?: string,
  gender?: string,
  password?: string  // Hashed
}

// UserProfile Model Updates
{
  supportMode?: string,
  location?: string,
  dob?: string  // Converted to Date
}
```

### Cache Invalidation

```typescript
// Automatically invalidates cache after update
await this.invalidateCache(businessUserId, childUserId);

// Cache keys invalidated:
// - children:business:{userId}:children
// - children:business:{userId}:count
// - children:team-list:{userId}
// - children:team-statistics:{userId}
```

---

## 📊 DATABASE STRUCTURE

### User Model Updates

```javascript
// Fields that can be updated
User.findByIdAndUpdate(childUserId, {
  name: "Alax Morgn Updated",
  email: "alax.updated@example.com",
  phoneNumber: "+1234567899",
  gender: "male",
  password: "$2b$12$KIXx...hashed..."  // If provided
}, { new: true, runValidators: true })
```

### UserProfile Model Updates

```javascript
// Fields that can be updated
UserProfile.findOneAndUpdate(
  { userId: childUserId },
  {
    supportMode: "encouraging",
    location: "Los Angeles, USA",
    dob: new Date("2015-05-15")
  },
  { new: true, upsert: true, runValidators: true }
)
```

### ChildrenBusinessUser Model Updates

```javascript
// Optional admin note
ChildrenBusinessUser.findByIdAndUpdate(relationshipId, {
  note: "Updated profile information"
}, { new: true })
```

---

## 🧪 TESTING

### cURL Examples

#### Update All Fields

```bash
curl -X PATCH http://localhost:5000/children-business-users/children/64f5a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alax Morgn Updated",
    "email": "alax.updated@example.com",
    "phoneNumber": "+1234567899",
    "location": "Los Angeles, USA",
    "gender": "male",
    "dateOfBirth": "2015-05-15",
    "supportMode": "encouraging",
    "password": "NewSecurePass456!",
    "note": "Updated profile information"
  }'
```

#### Update Single Field (Support Mode)

```bash
curl -X PATCH http://localhost:5000/children-business-users/children/64f5a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supportMode": "logical"
  }'
```

#### Update Password Only

```bash
curl -X PATCH http://localhost:5000/children-business-users/children/64f5a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecurePassword123!"
  }'
```

#### Update Location Only

```bash
curl -X PATCH http://localhost:5000/children-business-users/children/64f5a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "New York, USA"
  }'
```

---

### Test Cases

```typescript
// ✅ Update all fields
PATCH /children-business-users/children/:childId
{
  name: "Updated Name",
  email: "updated@example.com",
  phoneNumber: "+1234567899",
  location: "New Location",
  gender: "female",
  dateOfBirth: "2015-05-15",
  supportMode: "encouraging",
  password: "NewPass123!"
}
// Expected: 200 OK - All fields updated

// ✅ Update single field
PATCH /children-business-users/children/:childId
{
  supportMode: "logical"
}
// Expected: 200 OK - Only supportMode updated

// ✅ Update password only
PATCH /children-business-users/children/:childId
{
  password: "NewSecurePass456!"
}
// Expected: 200 OK - Password hashed and updated

// ✅ Update email (unique)
PATCH /children-business-users/children/:childId
{
  email: "newunique@example.com"
}
// Expected: 200 OK - Email updated

// ❌ Update email (duplicate)
PATCH /children-business-users/children/:childId
{
  email: "existing@example.com"  // Already exists
}
// Expected: 400 Bad Request - "Email already exists"

// ❌ Update with invalid email format
PATCH /children-business-users/children/:childId
{
  email: "invalid-email"
}
// Expected: 400 Bad Request - "Please provide a valid email address"

// ❌ Update with invalid support mode
PATCH /children-business-users/children/:childId
{
  supportMode: "invalid-mode"
}
// Expected: 400 Bad Request - "Support mode must be calm, encouraging, or logical"

// ❌ Update with invalid date format
PATCH /children-business-users/children/:childId
{
  dateOfBirth: "15-05-2015"  // Wrong format
}
// Expected: 400 Bad Request - "Date must be in YYYY-MM-DD format"

// ❌ Update non-existent child
PATCH /children-business-users/children/invalid-id
{}
// Expected: 404 Not Found - "Child account not found"

// ❌ Update without authentication
PATCH /children-business-users/children/:childId
{}
// Expected: 401 Unauthorized

// ❌ Update child not under this business user
PATCH /children-business-users/children/other-user-child-id
{}
// Expected: 404 Not Found - "Child account not found or not associated"
```

---

## 🎨 FRONTEND INTEGRATION

### React/Axios Example

```javascript
// Load current data for edit form
const loadMemberData = async (memberId) => {
  const response = await axios.get(
    `/children-business-users/team-members/${memberId}/v2`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.data;
};

// Update child profile
const updateChildProfile = async (childId, updateData) => {
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

// Usage in component
const handleUpdateProfile = async (formData) => {
  try {
    const result = await updateChildProfile(childId, formData);
    
    if (result.success) {
      // Show success message
      toast.success('Profile updated successfully!');
      
      // Refresh member data
      const updatedData = await loadMemberData(childId);
      setMemberData(updatedData);
    }
  } catch (error) {
    // Show error message
    toast.error(error.response?.data?.message || 'Update failed');
  }
};
```

### Vue/Axios Example

```javascript
// Load current data
async loadMemberData(memberId) {
  const response = await this.$axios.get(
    `/children-business-users/team-members/${memberId}/v2`
  );
  return response.data;
},

// Update profile
async updateProfile(childId, formData) {
  try {
    const response = await this.$axios.patch(
      `/children-business-users/children/${childId}`,
      formData
    );
    
    if (response.data.success) {
      this.$toast.success('Profile updated successfully!');
      await this.loadMemberData(childId);
    }
  } catch (error) {
    this.$toast.error(error.response?.data?.message || 'Update failed');
  }
}
```

---

## ✅ VERIFICATION CHECKLIST

### Implementation Status

- [x] **All Figma fields implemented**
  - [x] User name
  - [x] Email (with uniqueness check)
  - [x] Phone number
  - [x] Address (location)
  - [x] Gender
  - [x] Date of Birth
  - [x] Support Mode (Calm/Encouraging/Logical)
  - [x] Password (optional, hashed)

- [x] **Validation**
  - [x] Email format validation
  - [x] Email uniqueness check
  - [x] Password strength (min 8 chars)
  - [x] Phone number format
  - [x] Date format (YYYY-MM-DD)
  - [x] Gender enum validation
  - [x] Support mode enum validation

- [x] **Database Operations**
  - [x] Update User model fields
  - [x] Update UserProfile model fields
  - [x] Update relationship note (optional)
  - [x] Hash password (if provided)
  - [x] Use upsert for UserProfile

- [x] **Security**
  - [x] Rate limiting (20/hour)
  - [x] JWT authentication required
  - [x] Business user role check
  - [x] Password hashing
  - [x] Email uniqueness verification

- [x] **Performance**
  - [x] Redis cache invalidation
  - [x] Selective field updates
  - [x] Proper error logging

---

## 📊 COMPARISON: CREATE vs EDIT

| Feature | Create Member | Edit Member |
|---------|---------------|-------------|
| **Method** | POST | PATCH |
| **Endpoint** | `/children` | `/children/:childId` |
| **Rate Limit** | 3/hour (strict) | 20/hour |
| **Required Fields** | name, email, password | At least one field |
| **Email Check** | Must be unique | Unique (excluding self) |
| **Password** | Required | Optional |
| **Creates** | User + UserProfile + Relationship | Updates existing |
| **Email Sent** | ✅ Credentials email | ❌ No email |
| **Response** | childUser, relationship | user, profile, relationship |

---

## 📚 RELATED DOCUMENTATION

- [CREATE_MEMBER_COMPLETE_APIS-30-03-26.md](./CREATE_MEMBER_COMPLETE_APIS-30-03-26.md) - Create Member API
- [CREATE_EDIT_MEMBER_APIS-30-03-26.md](./CREATE_EDIT_MEMBER_APIS-30-03-26.md) - Combined API docs
- [CREATE_EDIT_MEMBER_VISUAL_SUMMARY-30-03-26.md](./CREATE_EDIT_MEMBER_VISUAL_SUMMARY-30-03-26.md) - Visual summary
- [Children Business User Module](../src/modules/childrenBusinessUser.module/)
- [Figma Assets](../figma-asset/teacher-parent-dashboard/team-members/)

---

**Document Generated**: 30-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ **COMPLETE - ALL FIGMA FIELDS IMPLEMENTED**
