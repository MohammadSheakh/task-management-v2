# Auth, User, Group Modules - Role-Based Access Control Mapping

## Overview

This document defines the role-based access control (RBAC) for auth, user, and group modules in the Task Management system based on Figma designs.

---

## Role Definitions

| Role | Description | Dashboard | Access Level |
|------|-------------|-----------|--------------|
| `business` | Group owners, parents, teachers | Teacher/Parent Dashboard | Full group & member management |
| `child` | Group members, children | Mobile App (Child Interface) | Personal data, update own progress |
| `admin` | System administrators | Main Admin Dashboard | System-wide management |

---

## Auth Module Routes

### Public Routes (No Auth Required)

#### 1. Register
```
POST /auth/register
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 10 requests per hour |
| **Description** | User registration |

#### 2. Register V2
```
POST /auth/register/v2
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 10 requests per hour |
| **Description** | Enhanced user registration |

#### 3. Login
```
POST /auth/login
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | N/A |
| **Rate Limit** | 5 attempts per 15 minutes |
| **Description** | User login with credentials |

#### 4. Login V2
```
POST /auth/login/v2
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | N/A |
| **Rate Limit** | 5 attempts per 15 minutes |
| **Description** | Enhanced login with FCM token |

#### 5. Google Login
```
POST /auth/google-login
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | N/A |
| **Rate Limit** | 5 attempts per 15 minutes |
| **Description** | Login with Google OAuth |

#### 6. Google Login V2
```
POST /auth/google-login/v2
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | N/A |
| **Rate Limit** | 5 attempts per 15 minutes |
| **Description** | Enhanced Google login |

#### 7. Google Auth Callback
```
POST /auth/google
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | N/A |
| **Description** | Google OAuth callback |

#### 8. Apple Auth Callback
```
POST /auth/apple
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | N/A |
| **Description** | Apple OAuth callback |

#### 9. Forgot Password
```
POST /auth/forgot-password
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | N/A |
| **Rate Limit** | 3 requests per hour |
| **Description** | Request password reset |

#### 10. Resend OTP
```
POST /auth/resend-otp
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Rate Limit** | 100 requests per minute |
| **Description** | Resend verification OTP |

#### 11. Reset Password
```
POST /auth/reset-password
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Rate Limit** | 100 requests per minute |
| **Description** | Reset password with OTP |

#### 12. Verify Email
```
POST /auth/verify-email
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Rate Limit** | 5 requests per hour |
| **Description** | Verify email address |

#### 13. Logout
```
GET /auth/logout
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None (optional token) |
| **Rate Limit** | 100 requests per minute |
| **Description** | Logout and clear FCM tokens |

#### 14. Refresh Token
```
POST /auth/refresh-auth
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None (requires refresh token) |
| **Rate Limit** | 100 requests per minute |
| **Description** | Refresh access token |

### Authenticated Routes

#### 15. Change Password
```
POST /auth/change-password
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Change password (logged in users) |

---

## User Module Routes

### Admin Routes

#### 1. Get All Users with Pagination
```
GET /users/paginate
```
| Attribute | Value |
|-----------|-------|
| **Role** | `admin` |
| **Auth** | `TRole.admin` |
| **Figma** | `user-list-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Admin views all users with statistics |

#### 2. Get All Students
```
GET /users/paginate/for-student
```
| Attribute | Value |
|-----------|-------|
| **Role** | `admin` |
| **Auth** | `TRole.admin` |
| **Figma** | `user-list-flow.png` |
| **Rate Limit** | 100 requests per minute |

#### 3. Get All Mentors
```
GET /users/paginate/for-mentor
```
| Attribute | Value |
|-----------|-------|
| **Role** | `admin` |
| **Auth** | `TRole.admin` |
| **Figma** | `user-list-flow.png` |
| **Rate Limit** | 100 requests per minute |

#### 4. Get All Sub-Admins
```
GET /users/paginate/for-sub-admin
```
| Attribute | Value |
|-----------|-------|
| **Role** | `admin` |
| **Auth** | `TRole.admin` |
| **Figma** | `user-list-flow.png` |
| **Rate Limit** | 100 requests per minute |

#### 5. Send Invitation to Sub-Admin
```
POST /users/send-invitation-link-to-admin-email
```
| Attribute | Value |
|-----------|-------|
| **Role** | `admin` |
| **Auth** | `TRole.admin` |
| **Figma** | `user-list-flow.png` |
| **Rate Limit** | 20 requests per minute |

#### 6. Remove Sub-Admin
```
PUT /users/remove-sub-admin/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `admin` |
| **Auth** | `TRole.admin` |
| **Figma** | `user-list-flow.png` |
| **Rate Limit** | 20 requests per minute |

#### 7. Get All Providers
```
GET /users/paginate/for-provider
```
| Attribute | Value |
|-----------|-------|
| **Role** | `admin` |
| **Auth** | `TRole.admin` |
| **Figma** | `user-list-flow.png` |
| **Rate Limit** | 100 requests per minute |

### Child/Business Routes (All Authenticated Users)

#### 8. Get Own Profile
```
GET /users/profile
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 100 requests per minute |

#### 9. Get Profile Information
```
GET /users/profile-info
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 100 requests per minute |

#### 10. Update Profile Information
```
PUT /users/profile-info
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 100 requests per minute |

#### 11. Update Profile Image
```
PUT /users/profile-picture
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 100 requests per minute |

#### 12. Get Support Mode
```
GET /users/support-mode
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 100 requests per minute |

#### 13. Update Support Mode
```
PUT /users/support-mode
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 100 requests per minute |

#### 14. Update Notification Style
```
PUT /users/notification-style
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `profile-permission-account-interface.png` |
| **Rate Limit** | 100 requests per minute |

### Public Routes (No Auth)

#### 15. Get Home Page Data
```
GET /users/home-page
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | `home-flow.png` |
| **Rate Limit** | 100 requests per minute |

#### 16. Get Popular Providers
```
GET /users/home-page/popular
```
| Attribute | Value |
|-----------|-------|
| **Role** | `public` |
| **Auth** | None |
| **Figma** | `home-flow.png` |
| **Rate Limit** | 100 requests per minute |

---

## Group Module Routes

### Business Routes (Group Owners/Admins)

#### 1. Create Group
```
POST /groups/
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `dashboard-flow-01.png` |
| **Rate Limit** | 5 requests per minute |

#### 2. Get My Groups
```
GET /groups/my
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `dashboard-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 3. Get Group by ID
```
GET /groups/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `dashboard-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 4. Update Group
```
PUT /groups/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `dashboard-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 5. Delete Group
```
DELETE /groups/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `dashboard-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 6. Get Group Statistics
```
GET /groups/:id/statistics
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `dashboard-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 7. Search Groups
```
GET /groups/search
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `dashboard-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

---

## GroupMember Module Routes

### Business Routes

#### 1. Get Group Members
```
GET /groups/:id/members
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `team-member-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 2. Get Member Details
```
GET /groups/:groupId/members/:userId
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `team-member-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 3. Add Member to Group
```
POST /groups/:id/members
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `team-member-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 4. Update Member Role
```
PUT /groups/:groupId/members/:userId/role
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `team-member-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 5. Remove Member from Group
```
DELETE /groups/:groupId/members/:userId
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `team-member-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 6. Get Member Count
```
GET /groups/:id/count
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `dashboard-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 7. Check Membership
```
GET /groups/:groupId/check/:userId
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `team-member-flow-01.png` |
| **Rate Limit** | 100 requests per minute |

#### 8. Get Group Permissions
```
GET /groups/:id/permissions
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `permission-flow.png` |
| **Rate Limit** | 100 requests per minute |

#### 9. Update Group Permissions
```
PUT /groups/:id/permissions
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `permission-flow.png` |
| **Rate Limit** | 100 requests per minute |

#### 10. Toggle Task Creation Permission
```
POST /groups/:id/permissions/toggle
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `permission-flow.png` |
| **Rate Limit** | 100 requests per minute |

#### 11. Create Member Account
```
POST /groups/:id/members/create
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `create-child-flow.png` |
| **Rate Limit** | 100 requests per minute |

#### 12. Update Member Profile
```
PATCH /groups/:id/members/:userId/profile
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `edit-child-flow.png` |
| **Rate Limit** | 100 requests per minute |

### Child Routes

#### 13. Leave Group
```
POST /groups/:id/leave
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `home-flow.png` |
| **Rate Limit** | 100 requests per minute |

---

## Role Access Matrix Summary

```
┌─────────────────────────────────────┬───────┬──────────┬───────┐
│ Module                              │ Admin │ Business │ Child │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ Auth - Public (14 routes)           │  ✅   │    ✅    │   ✅  │
│ Auth - Change Password              │  ❌   │    ✅    │   ✅  │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ User - Admin Management (7 routes)  │  ✅   │    ❌    │   ❌  │
│ User - Profile (7 routes)           │  ❌   │    ✅    │   ✅  │
│ User - Public (2 routes)            │  ✅   │    ✅    │   ✅  │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ Group - Management (7 routes)       │  ❌   │    ✅    │   ❌  │
│ GroupMember - Business (12 routes)  │  ❌   │    ✅    │   ❌  │
│ GroupMember - Child (1 route)       │  ❌   │    ❌    │   ✅  │
└─────────────────────────────────────┴───────┴──────────┴───────┘
```

---

## Figma Asset References

All role assignments are based on:

```
/figma-asset/
├── main-admin-dashboard/
│   ├── dashboard-section-flow.png
│   ├── user-list-flow.png
│   └── subscription-flow.png
├── teacher-parent-dashboard/
│   ├── dashboard/
│   │   └── dashboard-flow-01.png
│   ├── team-members/
│   │   ├── create-child-flow.png
│   │   ├── edit-child-flow.png
│   │   └── team-member-flow-01.png
│   └── settings-permission-section/
│       └── permission-flow.png
└── app-user/
    └── group-children-user/
        ├── home-flow.png
        ├── profile-permission-account-interface.png
        └── profile-without-permission-interface.png
```

---

**Version:** 1.0.0  
**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team
