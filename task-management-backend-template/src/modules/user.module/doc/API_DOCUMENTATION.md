# User Management Module - API Documentation

## 📋 Overview

Complete API documentation for the User Management Module with support for **user profiles**, **support mode preferences**, **notification settings**, and **admin user management**.

**Base URL:** `{{baseUrl}}/v1`  
**Last Updated:** 10-03-26  
**Version:** 2.0

---

## 🏗️ Architecture

### Module Structure
```
src/modules/user.module/
├── user/                    # User Module
│   ├── user.constant.ts     # Enums and constants
│   ├── user.interface.ts    # TypeScript interfaces
│   ├── user.model.ts        # Mongoose schema & model
│   ├── user.validation.ts   # Zod validation schemas
│   ├── user.service.ts      # Business logic
│   ├── user.controller.ts   # HTTP handlers
│   ├── user.middleware.ts   # Custom middleware
│   └── user.route.ts        # API routes
│
├── userProfile/             # User Profile Module
│   ├── userProfile.constant.ts
│   ├── userProfile.interface.ts
│   ├── userProfile.model.ts
│   └── ...
│
└── doc/                     # Documentation
    ├── API_DOCUMENTATION.md
    └── dia/                 # Mermaid diagrams
```

---

## 🔐 Authentication

All endpoints require JWT authentication via Bearer token (except public endpoints):

```http
Authorization: Bearer <access_token>
```

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `child` | Group members, students | Personal profile management |
| `business` | Group owners, parents, teachers | Personal profile management |
| `admin` | System administrators | Full user management |

---

## 📚 User Profile Endpoints

**Base Path:** `/users`

### 1. Get My Profile
```http
GET /users/profile
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Get current user's profile information

**Response:**
```json
{
  "code": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "profileImage": "https://...",
    "role": "user",
    "accountCreatorId": "507f1f77bcf86cd799439010",
    "profileId": "507f1f77bcf86cd799439012",
    "profile": {
      "supportMode": "calm",
      "notificationStyle": "gentle",
      "location": "New York",
      "gender": "male",
      "dob": "2010-01-15"
    },
    "createdAt": "2026-01-01T10:00:00.000Z"
  },
  "success": true
}
```

---

### 2. Get Profile Information
```http
GET /users/profile-info
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Get user's profile information (detailed view)

**Response:**
```json
{
  "code": 200,
  "message": "Profile information retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "profileImage": "https://...",
    "profile": {
      "userId": "507f1f77bcf86cd799439011",
      "location": "New York",
      "gender": "male",
      "dob": "2010-01-15T00:00:00.000Z",
      "supportMode": "calm",
      "notificationStyle": "gentle"
    }
  },
  "success": true
}
```

---

### 3. Update Profile Information
```http
PUT /users/profile-info
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Update user profile information

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phoneNumber": "+1234567890"
}
```

**Updatable Fields:**
- `name`, `phoneNumber`
- Profile fields via nested object

**Response:**
```json
{
  "code": 200,
  "message": "Profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe Updated",
    "phoneNumber": "+1234567890",
    "profile": {
      "supportMode": "calm",
      "notificationStyle": "gentle"
    }
  },
  "success": true
}
```

---

### 4. Update Profile Image Separately
```http
PUT /users/profile-picture
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Content-Type: multipart/form-data
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Update user profile image separately

**Request:**
- **Content-Type:** `multipart/form-data`
- **Field:** `profileImage` (file)

**Supported Formats:**
- JPEG, PNG, WEBP
- HEIC (auto-converted to PNG)
- Max size: 5MB

**Response:**
```json
{
  "code": 200,
  "message": "Profile image updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "profileImage": "https://.../uploads/users/profile-123.png"
  },
  "success": true
}
```

---

### 5. Get Support Mode
```http
GET /users/support-mode
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Get user's support mode preference (calm/encouraging/logical)

**Response:**
```json
{
  "code": 200,
  "message": "Support mode retrieved successfully",
  "data": {
    "supportMode": "calm"
  },
  "success": true
}
```

**Support Mode Options:**
| Mode | Description |
|------|-------------|
| `calm` | Calm, reassuring motivational style |
| `encouraging` | Enthusiastic, encouraging style |
| `logical` | Logical, fact-based motivational style |

---

### 6. Update Support Mode
```http
PUT /users/support-mode
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Update user's support mode preference

**Request Body:**
```json
{
  "supportMode": "encouraging"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Support mode updated successfully",
  "data": {
    "supportMode": "encouraging"
  },
  "success": true
}
```

---

### 7. Update Notification Style
```http
PUT /users/notification-style
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Update user's notification style preference

**Request Body:**
```json
{
  "notificationStyle": "firm"
}
```

**Notification Style Options:**
| Style | Description |
|-------|-------------|
| `gentle` | Gentle, soft notification style |
| `firm` | Firm, direct notification style |
| `xyz` | Custom notification style |

**Response:**
```json
{
  "code": 200,
  "message": "Notification style updated successfully",
  "data": {
    "notificationStyle": "firm"
  },
  "success": true
}
```

---

### 8. Soft Delete User
```http
PUT /users/softDelete/:id
Authorization: Bearer <token>
Role: child, business
Rate Limit: 20 requests per minute
Access: User can only delete themselves
```

**Description:** Soft delete user by ID (set isDeleted flag)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User ID to delete |

**Response:**
```json
{
  "code": 200,
  "message": "User deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "isDeleted": true
  },
  "success": true
}
```

---

### 9. Get All Users
```http
GET /users
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Description:** Get all users (for internal use)

**Response:**
```json
{
  "code": 200,
  "message": "Users retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  ],
  "success": true
}
```

---

## 👤 Admin User Management Endpoints

**Base Path:** `/users`

### 1. Get All Users with Statistics
```http
GET /users/paginate?role=user&page=1&limit=10&sortBy=-createdAt
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `user-list-flow.png`

**Description:** Admin views all users with statistics

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `role` | string | `user` | Filter by role |
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `sortBy` | string | `-createdAt` | Sort field |

**Response:**
```json
{
  "code": 200,
  "message": "Users retrieved successfully with statistics",
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "createdAt": "2026-01-01T10:00:00.000Z",
        "statistics": {
          "totalTasks": 15,
          "completedTasks": 12,
          "completionRate": 80
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  },
  "success": true
}
```

---

### 2. Get All Students
```http
GET /users/paginate/for-student?from=2026-01-01&to=2026-01-31
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `user-list-flow.png`

**Description:** Admin views all students with date range filter

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | date | Start date (YYYY-MM-DD) |
| `to` | date | End date (YYYY-MM-DD) |
| `page` | number | Page number |
| `limit` | number | Items per page |

---

### 3. Get All Mentors
```http
GET /users/paginate/for-mentor
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `user-list-flow.png`

**Description:** Admin views all mentors

---

### 4. Get All Sub-Admins
```http
GET /users/paginate/for-sub-admin
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `user-list-flow.png`

**Description:** Admin views all sub-admins

---

### 5. Send Invitation to Sub-Admin
```http
POST /users/send-invitation-link-to-admin-email
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Figma Reference:** `user-list-flow.png`

**Description:** Admin invites user to become sub-admin

**Request Body:**
```json
{
  "email": "newadmin@example.com",
  "name": "New Admin"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Invitation sent successfully",
  "data": {
    "email": "newadmin@example.com",
    "invitationSent": true
  },
  "success": true
}
```

---

### 6. Remove Sub-Admin
```http
PUT /users/remove-sub-admin/:id
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Figma Reference:** `user-list-flow.png`

**Description:** Admin removes sub-admin by ID

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Sub-admin user ID |

**Response:**
```json
{
  "code": 200,
  "message": "Sub-admin removed successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "role": "user"
  },
  "success": true
}
```

---

### 7. Get All Providers
```http
GET /users/paginate/for-provider?providerApprovalStatus=pending&from=2026-01-01&to=2026-01-31
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `user-list-flow.png`

**Description:** Admin views all providers with approval status filter

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `providerApprovalStatus` | string | Filter: `pending`, `approved`, `rejected` |
| `from` | date | Start date |
| `to` | date | End date |

---

### 8. Get Profiles for Admin Approval
```http
GET /users/profile/for-admin?page=1&limit=10
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Description:** Admin gets profile information to approve doctor/specialist

---

### 9. Change Approval Status
```http
PUT /users/change-approval-status
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Description:** Admin changes approval status of a doctor/specialist profile

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "providerApprovalStatus": "approved"
}
```

---

## 🏠 Public Endpoints

### 1. Get Home Page Data
```http
GET /users/home-page
Authorization: Optional
Role: public
Rate Limit: 100 requests per minute
```

**Figma Reference:** `home-flow.png`

**Description:** Get category and popular providers also banners

**Response:**
```json
{
  "code": 200,
  "message": "Home page data retrieved successfully",
  "data": {
    "categories": [...],
    "popularProviders": [...],
    "banners": [...]
  },
  "success": true
}
```

---

### 2. Get Popular Providers
```http
GET /users/home-page/popular
Authorization: Optional
Role: public
Rate Limit: 100 requests per minute
```

**Figma Reference:** `home-flow.png`

**Description:** Get only popular providers

---

### 3. Get Provider Home Page Data
```http
GET /users/home-page/for-provider
Authorization: Bearer <token>
Role: child, business (provider)
Rate Limit: 100 requests per minute
```

**Description:** Provider views earnings by category, booking count, recent job requests

**Response:**
```json
{
  "code": 200,
  "message": "Provider home page data retrieved successfully",
  "data": {
    "earningsByCategory": [...],
    "bookingCount": {...},
    "recentJobRequests": [...]
  },
  "success": true
}
```

---

## 🎯 Key Features

### 1. Support Mode System
Three motivational styles for personalized user experience:
- **Calm**: Reassuring, peaceful approach
- **Encouraging**: Enthusiastic, motivating approach
- **Logical**: Fact-based, rational approach

### 2. Notification Style Preferences
Customize how notifications are delivered:
- **Gentle**: Soft, friendly notifications
- **Firm**: Direct, clear notifications
- **XYZ**: Custom style

### 3. Profile Image Upload
- Automatic HEIC to PNG conversion
- Multiple format support (JPEG, PNG, WEBP)
- 5MB file size limit
- Stored in `/uploads/users/`

### 4. Soft Delete System
- Users marked as deleted instead of hard deletion
- Data retention for audit trails
- Can be reactivated if needed

### 5. Admin User Management
- Role-based user filtering
- Approval workflow for providers
- Sub-admin invitation system
- User statistics integration

---

## 📊 Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  profileId: ObjectId,                   // References UserProfile
  name: String,
  email: String,                         // Unique, indexed
  phoneNumber: String,
  password: String,                      // Hashed
  profileImage: String,
  role: String,                          // 'user' | 'admin' | 'student' | 'mentor' | 'provider'
  accountCreatorId: ObjectId,            // References User (who created this account)
  authProvider: String,                  // 'local' | 'google' | 'apple'
  providerApprovalStatus: String,        // 'pending' | 'approved' | 'rejected'
  isEmailVerified: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### UserProfile Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                      // References User
  location: String,
  gender: String,                        // 'male' | 'female' | 'other'
  dob: Date,
  supportMode: String,                   // 'calm' | 'encouraging' | 'logical'
  notificationStyle: String,             // 'gentle' | 'firm' | 'xyz'
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Email already exists",
  "success": false
}
```

```json
{
  "code": 400,
  "message": "Profile image is required",
  "success": false
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "You do not have permission to update this profile",
  "success": false
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "User not found",
  "success": false
}
```

```json
{
  "code": 404,
  "message": "Profile not found",
  "success": false
}
```

### 413 Payload Too Large
```json
{
  "code": 413,
  "message": "Profile image too large. Maximum size is 5MB",
  "success": false
}
```

---

## 🧪 Testing with cURL

### Get My Profile
```bash
curl -X GET http://localhost:6733/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Profile Information
```bash
curl -X PUT http://localhost:6733/api/v1/users/profile-info \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "phoneNumber": "+1234567890"
  }'
```

### Update Profile Image
```bash
curl -X PUT http://localhost:6733/api/v1/users/profile-picture \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "profileImage=@/path/to/profile.jpg"
```

### Update Support Mode
```bash
curl -X PUT http://localhost:6733/api/v1/users/support-mode \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supportMode": "encouraging"
  }'
```

### Update Notification Style
```bash
curl -X PUT http://localhost:6733/api/v1/users/notification-style \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationStyle": "firm"
  }'
```

### Get All Users (Admin)
```bash
curl -X GET "http://localhost:6733/api/v1/users/paginate?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📝 Notes

1. **Profile Image Upload**: Uses multer for file handling, automatic HEIC conversion
2. **Soft Delete**: Users marked with `isDeleted` flag instead of hard deletion
3. **Pagination**: Default limit is 10, max is 100
4. **Sorting**: Use `-` prefix for descending order (e.g., `-createdAt`)
5. **Population**: Related profile fields auto-populated in responses
6. **Rate Limiting**: All endpoints have rate limiting configured
7. **Caching**: Profile data cached with Redis (5 min TTL)
8. **Email Verification**: Users must verify email before full access
9. **Role-Based Access**: Different endpoints for different user roles

---

## 🚀 Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run start
```

---

## 📞 Support

For issues or questions:
- Check error messages
- Review server logs
- Contact backend team

---

**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team  
**Status:** ✅ Complete and Production-Ready
