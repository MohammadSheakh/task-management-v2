# 📘 Module README Generation Guideline (V4)

**Version**: 4.0  
**Last Updated**: 30-03-26  
**Status**: ✅ **PRODUCTION STANDARD**  
**Target**: New developer can understand a module in **15 minutes**

---

## 🎯 Purpose

Generate **ONE comprehensive README file per module** that contains everything a developer needs to understand the module quickly.

**Example**: `src/modules/childrenBusinessUser.module/doc/README-V4-30-03-26.md`

---

## 📑 Required Structure

### **1. Header Metadata**

```markdown
# 👨‍👧‍👦 [Module Name]

---
**Module**: [Module Name]
**Version**: 4.0
**Last Updated**: DD-MM-YY
**Maintainer**: @team-name
**Status**: ✅ Production Ready
---
```

---

### **2. Table of Contents**

```markdown
## 📑 Table of Contents

1. [Overview](#-overview)
2. [Quick Start](#-quick-start)
3. [Key Features](#-key-features)
4. [Module Structure](#-module-structure)
5. [Architecture Design](#-architecture-design)
6. [Security Notes](#-security-notes)
7. [Services & Flows](#-services--flows)
8. [Redis Caching](#-redis-caching)
9. [Events & Queues](#-events--queues)
10. [Dependencies](#-dependencies)
11. [Testing](#-testing)
12. [Troubleshooting](#-troubleshooting)
13. [Changelog](#-changelog)
```

---

### **3. Overview Section**

```markdown
## 🎯 Overview

**Purpose**: [2-3 lines about what this module does]

**Business Value**: [Why this module exists - business impact]

**Users**:
- **[User Role 1]** - [What they do]
- **[User Role 2]** - [What they do]
```

**Example**:
```markdown
## 🎯 Overview

**Purpose**: Enables business users (parents/teachers) to manage child accounts and family team members.

**Business Value**: Allows parents/teachers to create and manage multiple child accounts under one subscription, assign tasks, and monitor progress.

**Users**:
- **Business Users** (Parents/Teachers) - Create and manage child accounts
- **Child Users** - Managed accounts with task permissions
```

---

### **4. Quick Start Section**

```markdown
## 🚀 Quick Start

### For New Developers (15 minutes):
1. Read [Overview](#-overview) - 2 min
2. Check [Security Notes](#-security-notes) - 2 min
3. Study [Services & Flows](#-services--flows) - 8 min
4. Review [Redis Caching](#-redis-caching) - 2 min
5. Skim [Troubleshooting](#-troubleshooting) - 1 min

### For API Integration:
→ Jump to [Services & Flows](#-services--flows)

### For Figma Reference:
→ Check `figma-asset/[path]/` folder
```

---

### **5. Key Features**

```markdown
## ✨ Key Features

- ✅ **Feature 1** - Brief description
- ✅ **Feature 2** - Brief description
- ✅ **Feature 3** - Brief description
```

**Rules**:
- Use emoji ✅ for completed features
- Keep descriptions to 1 line
- Focus on user-facing capabilities

---

### **6. Module Structure**

```markdown
## 📂 Module Structure

```
src/modules/[module-name].module/
├── [module].route.ts          # API routes with middleware
├── [module].controller.ts     # HTTP request handlers
├── [module].service.ts        # Business logic
├── [module].model.ts          # Mongoose schema
├── [module].interface.ts      # TypeScript interfaces
├── [module].validation.ts     # Zod validation schemas
├── [module].constant.ts       # Constants & enums
│
└── doc/
    ├── README.md              # This file
    └── diagrams/              # Mermaid diagrams (if needed)
```

```

---

### **7. Architecture Design**

```markdown
## 🏗️ Architecture Design

### Design Principles

1. **Principle 1**: Description
2. **Principle 2**: Description
3. **Principle 3**: Description

### Tech Stack
- **Database**: MongoDB (Mongoose)
- **Cache**: Redis (cache-aside pattern)
- **Email**: Nodemailer (SendGrid/AWS SES)
- **Validation**: Zod
- **Auth**: JWT (from auth module)
```

---

### **8. Security Notes (REQUIRED)**

```markdown
## 🔒 Security Notes

> **⚠️ Compliance & Security Considerations**

### [Compliance Standard] (e.g., COPPA, GDPR)
- ✅ **Requirement 1**: Description
- ✅ **Requirement 2**: Description

### Data Protection
- ✅ **Security Measure 1**: Description
- ✅ **Security Measure 2**: Description

### Access Control
- ✅ **Control 1**: Description
- ✅ **Control 2**: Description
```

**Example**:
```markdown
## 🔒 Security Notes

> **⚠️ Compliance & Security Considerations**

### COPPA Compliance (Children Under 13)
- ✅ **Parental Consent Required**: Only business users can create child accounts
- ✅ **Data Minimization**: Only collect necessary information
- ✅ **Parental Control**: Parents can remove/reactivate child accounts

### Data Protection
- ✅ **Password Hashing**: bcrypt with 12 rounds (industry standard)
- ✅ **Soft Delete**: Accounts preserved (not permanently deleted)

### Access Control
- ✅ **Role-Based Access**: Only business users can manage children
- ✅ **Rate Limiting**: Strict limits prevent abuse (3/hour for create)
```

---

### **9. Services & Flows (CORE SECTION)**

**⚠️ IMPORTANT**: Everything about a service in ONE place - NO separate sections for dataflow, API, service!

```markdown
## 🔧 Services & Flows

### Service: [Service Name]

**Figma-Flow-Screenshot-File Name**: `figma-asset/[path]/[screenshot].png`

**Endpoint**: `METHOD /path`  
**Role**: [User Role]  
**Auth**: Required/None  
**Rate Limit**: [X requests/timeunit]  
**Middleware**: `middleware1`, `middleware2`, `validateRequest(schema)`

<details>
<summary>🔄 <b>Click to view Flow Diagram</b></summary>

```
[Actor]
    ↓
[HTTP Call]
    ↓
Controller: [controllerMethod]()
    ↓
Service: [serviceMethod]()
    ├─→ Step 1
    ├─→ Step 2
    ├─→ Step 3
    └─→ Return { data }
    ↓
Response: [Status Code]
```

</details>

**Redis Cache Keys [Created/Invalidated]**:
- `cache:key:pattern` (TTL: X min) → [Where to invalidate/create]

**Socket Events**: [None or list events]

<details>
<summary>📦 <b>Click to view Request/Response</b></summary>

<table>
<tr>
<th>Request</th>
<th>Response</th>
</tr>
<tr>
<td>

**Method:** `METHOD`  
**Path:** `/path`  
**Query:** `?param=value` (if applicable)  
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "key": "value"
}
```

</td>
<td>

**Status:** `200 OK`  
**Body:**
```json
{
  "success": true,
  "data": {}
}
```

</td>
</tr>
</table>

</details>

---
```

**Complete Example**:
```markdown
### Service: Create Child Account

**Figma-Flow-Screenshot-File Name**: `figma-asset/teacher-parent-dashboard/team-members/create-child-flow.png`

**Endpoint**: `POST /children-business-users/children`  
**Role**: Business User (Parent/Teacher)  
**Auth**: Required  
**Rate Limit**: 3 requests/hour (strict)  
**Middleware**: `auth(TRole.business)`, `rateLimiter('strict')`, `validateRequest(createChildValidationSchema)`

<details>
<summary>🔄 <b>Click to view Flow Diagram</b></summary>

```
Parent (Business User)
    ↓
POST /children-business-users/children
    ↓
Controller: createChild()
    ↓
Service: createChildAccount()
    ├─→ Verify business user exists
    ├─→ Check email uniqueness
    ├─→ Hash password (bcrypt 12 rounds)
    ├─→ Create UserProfile (supportMode, location, dob, gender)
    ├─→ Create User account (role: child)
    ├─→ Create relationship record
    ├─→ Send credentials email (async)
    ├─→ Invalidate Redis cache
    └─→ Return { childUser, relationship }
    ↓
Response: 201 Created
```

</details>

**Redis Cache Keys Invalidated**:
- `children:business:{userId}:children` (TTL: 10 min) → Invalidate in `createChildAccount()` after relationship creation
- `children:business:{userId}:count` (TTL: 10 min) → Invalidate in `createChildAccount()` after relationship creation

**Socket Events**: None

<details>
<summary>📦 <b>Click to view Request/Response</b></summary>

<table>
<tr>
<th>Request</th>
<th>Response</th>
</tr>
<tr>
<td>

**Method:** `POST`  
**Path:** `/children-business-users/children`  
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```
**Body:**
```json
{
  "name": "Alax Morgn",
  "email": "alax.morgn@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+1234567890",
  "location": "New York, USA",
  "gender": "male",
  "dateOfBirth": "2015-05-15",
  "supportMode": "calm"
}
```

</td>
<td>

**Status:** `201 Created`  
**Body:**
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
    },
    "message": "Child account created successfully. Login credentials have been sent to the child's email."
  }
}
```

</td>
</tr>
</table>

</details>

---
```

---

### **10. Redis Caching Summary** // make collapsible

```markdown
## 🗄️ Redis Caching

| Key Pattern | TTL | Use Case | Where to Invalidate |
|-------------|-----|----------|---------------------|
| `module:business:{userId}:data` | 10 min | Cache data list | `serviceMethod1()`, `serviceMethod2()` |
| `module:business:{userId}:count` | 10 min | Cache count | `serviceMethod1()`, `serviceMethod3()` |
| `module:token:{token}` | 24 hours | Store tokens | `activateService()` (delete after use) |

### Cache Strategy

**Pattern**: Cache-aside (lazy loading)

**On Read**:
1. Check Redis cache
2. If hit → return cached data
3. If miss → read from database
4. Cache result
5. Return data

**On Write**:
1. Perform database operation
2. Invalidate related cache keys
3. Return response
```

---

### **11. Events & Queues** // make collapsible

```markdown
## ⚡ Events & Queues

### BullMQ Queues
**None** - [Or list queues if used]

### Socket Events
**None** - [Or list events]

### Email Events (Async)
- **Sends**: [What emails are sent]
- **Pattern**: Fire-and-forget (doesn't block response)
```

---

### **12. Dependencies** // make collapsible

```markdown
## 🔗 Dependencies

**Uses Modules**:
- ✅ **[Module 1]** - [What it's used for]
- ✅ **[Module 2]** - [What it's used for]

**External Services**:
- ✅ **[Service 1]** - [What it's used for]
- ✅ **[Service 2]** - [What it's used for]

**Middleware Used**:
- ✅ `auth(TRole)` - Role-based authentication
- ✅ `rateLimiter(tier)` - Rate limiting
- ✅ `validateRequest(schema)` - Zod validation
```

---

### **13. Testing**

```markdown
## 🧪 Testing

### Manual Testing

#### [Test Case 1]
```bash
curl -X POST http://localhost:5000/endpoint \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "value"
  }'
```

### Automated Testing

```bash
# Run all tests
npm test -- module.test.ts

# Run specific test
npm test -- module.test.ts -t "should [action]"

# Run with coverage
npm run test:coverage -- module.test.ts
```

```

---

### **14. Troubleshooting** // make each troubleshooting section collapsible

```markdown
## 🐛 Troubleshooting

### Issue: [Problem name]

**Symptom**: [What you see]

**Solution**: [How to fix]

```bash
# Commands to diagnose/fix
command here
```

---
```

**Example**:
```markdown
## 🐛 Troubleshooting

### Issue: Email not sent after account creation

**Symptom**: Account created but user doesn't receive email

**Solution**: Check SMTP configuration in `.env` and error logs

```bash
# Check SMTP configuration
cat .env | grep SMTP

# Check error logs
tail -f logs/error.log | grep "email"
```

---

### Issue: Redis cache not invalidated

**Symptom**: Updated data not reflected in list views

**Solution**: Check Redis connection and manually clear cache

```bash
# Check Redis connection
redis-cli ping  # Should return: PONG

# Check cache keys
redis-cli
KEYS module:*

# Manually clear cache
redis-cli
FLUSHDB
```
```

---

### **15. Changelog (REQUIRED)** // make collapsible

```markdown
## 📜 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 30-03-26 | [Major changes in this version] |
| 3.0 | 30-03-26 | [Previous version changes] |
| 2.0 | 30-03-26 | [Older changes] |
| 1.0 | 01-03-26 | Initial release |
```

**Example**:
```markdown
## 📜 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 30-03-26 | Added HTML table format for Request/Response with proper markdown code blocks, collapsible flow diagrams |
| 3.0 | 30-03-26 | Added Security Notes callout, collapsible flow diagrams, Redis invalidation locations |
| 2.0 | 30-03-26 | Added invitation flow, Redis caching v2, unified Services & Flows section |
| 1.1 | 15-03-26 | Fixed cache invalidation bug in `updateChildProfile()` |
| 1.0 | 01-03-26 | Initial release with basic CRUD operations |
```

---

## 🎯 Key Rules  // make collapsible

### **DO ✅**:
1. Keep everything about a service in ONE place (endpoint + flow + cache + request/response)
2. Use collapsible sections for flow diagrams and request/response
3. Include Figma screenshot file names for each service
4. Specify WHERE to invalidate Redis cache (which service/function)
5. Add Security Notes section (shows compliance thinking)
6. Include Changelog with version tracking
7. Use HTML `<table>` for Request/Response with proper markdown code blocks
8. Keep descriptions concise and actionable

### **DON'T ❌**:
1. Don't create separate sections for dataflow, API endpoint, and service
2. Don't use inline code for multi-line JSON (use ```json blocks)
3. Don't forget to mention which service invalidates which cache key
4. Don't skip Security Notes section
5. Don't create multiple-row tables for Request/Response (single row with full content)
6. Don't scatter related information across different sections

---

## 📊 Template Files  // make collapsible

**Reference Implementation**:
- `src/modules/childrenBusinessUser.module/doc/README-V4-30-03-26.md`

**Location**:
- Each module's `doc/` folder
- Filename: `README-V[version]-[date].md`

---

## 🎓 Quick Reference // make collapsible

### Service Documentation Template

```markdown
### Service: [Service Name]

**Figma-Flow-Screenshot-File Name**: `figma-asset/[path]/[file].png`

**Endpoint**: `METHOD /path`  
**Role**: [User Role]  
**Auth**: Required/None  
**Rate Limit**: [X/timeunit]  
**Middleware**: `middleware1`, `middleware2`

<details>
<summary>🔄 <b>Click to view Flow Diagram</b></summary>

```
[Flow diagram with arrows]
```

</details>

**Redis Cache Keys**:
- `key:pattern` (TTL: X min) → [Where to invalidate]

**Socket Events**: [None or list]

<details>
<summary>📦 <b>Click to view Request/Response</b></summary>

<table>
<tr>
<th>Request</th>
<th>Response</th>
</tr>
<tr>
<td>

**Method:** `METHOD`  
**Path:** `/path`  
**Headers:**
```json
{}
```
**Body:**
```json
{}
```

</td>
<td>

**Status:** `200 OK`  
**Body:**
```json
{}
```

</td>
</tr>
</table>

</details>

---
```

---

**Document Generated**: 30-03-26  
**Maintainer**: @task-management-team  
**Status**: ✅ **PRODUCTION STANDARD FOR ALL MODULES**
