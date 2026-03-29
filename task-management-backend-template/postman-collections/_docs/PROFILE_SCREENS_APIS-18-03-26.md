# 🎯 **PROFILE SCREENS - API MAPPING**

**Date**: 18-03-26  
**Figma Files**:
1. `profile-permission-account-interface.png` (With "Task Manager" Badge)
2. `profile-without-permission-interface.png` (Without Badge)

---

## 📊 **SCREEN 1: With Permission (Task Manager)**

### **APIs Required & Available:**

| Screen Element | API Endpoint | Status |
|----------------|--------------|--------|
| **Check Task Manager Status** | `GET /children-business-users/secondary-user` | ✅ EXISTS |
| **Get Profile Info** | `GET /users/profile-info` | ✅ EXISTS |
| **Get Preferred Time** | `GET /users/preferred-time` | ✅ EXISTS |
| **Update Preferred Time** | `PUT /users/preferred-time` | ✅ EXISTS |
| **Get Support Mode** | `GET /users/support-mode` | ✅ EXISTS |
| **Update Support Mode** | `PUT /users/support-mode` | ✅ EXISTS |
| **Update Notification Style** | `PUT /users/notification-style` | ✅ EXISTS |
| **Update Profile Info** | `PUT /users/profile-info` | ✅ EXISTS |
| **Update Profile Picture** | `PUT /users/profile-picture` | ✅ EXISTS |

---

### **1. Check Task Manager Status (On Screen Load)**

```http
GET /children-business-users/secondary-user
Authorization: Bearer {{accessToken}}
```

**Response (Is Task Manager):**
```json
{
  "success": true,
  "data": {
    "childUserId": "user123",
    "isSecondaryUser": true,
    "businessUserId": "business456",
    "grantedAt": "2026-03-15T10:00:00.000Z"
  },
  "message": "Secondary user retrieved successfully"
}
```

**Frontend Action:**
```javascript
if (response.data.isSecondaryUser) {
  // Show "Task Manager" badge
  setShowTaskManagerBadge(true);
}
```

---

### **2. Get Profile Information**

```http
GET /users/profile-info
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user123",
    "name": "Bashar Islam",
    "email": "BH@gmail.com",
    "phoneNumber": "14164161631",
    "address": "USA",
    "gender": "male",
    "dateOfBirth": "2025-01-01",
    "age": 12,
    "profileImage": "https://...",
    "supportMode": "calm",
    "notificationStyle": "gentle",
    "preferredTime": "07:00"
  },
  "message": "Profile information retrieved successfully"
}
```

---

### **3. Get Preferred Time**

```http
GET /users/preferred-time
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "preferredTime": "07:00"
  },
  "message": "Preferred time retrieved successfully"
}
```

**Frontend Display:**
```
Preferred time
When you usually work on tasks
[07:00 AM] ⏰
```

---

### **4. Update Preferred Time**

```http
PUT /users/preferred-time
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "preferredTime": "08:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user123",
    "preferredTime": "08:00"
  },
  "message": "Preferred time updated successfully"
}
```

---

### **5. Get Support Mode**

```http
GET /users/support-mode
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supportMode": "calm"
  },
  "message": "Support mode retrieved successfully"
}
```

**Frontend Display:**
```
Support Mode

┌─────────────────────────────────────────┐
│ 💙 Calm                                 │
│ Gentle guidance with peaceful reminders │
│ and soothing encouragement.             │
│ "Take your time. Each small step matters." │
└─────────────────────────────────────────┘
```

---

### **6. Update Support Mode**

```http
PUT /users/support-mode
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "supportMode": "encouraging"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user123",
    "supportMode": "encouraging"
  },
  "message": "Support mode updated successfully"
}
```

**Available Options:**
- `calm` - Gentle guidance
- `encouraging` - Positive energy
- `logical` - Gentle guidance with reminders

---

### **7. Update Notification Style**

```http
PUT /users/notification-style
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "notificationStyle": "gentle"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user123",
    "notificationStyle": "gentle"
  },
  "message": "Notification style updated successfully"
}
```

**Available Options:**
- `gentle` - Soft and non-intrusive
- `firm` - Soft and non-intrusive
- `xyz` - Soft and non-intrusive

---

### **8. Update Profile Information**

```http
PUT /users/profile-info
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "Bashar Islam Updated",
  "phoneNumber": "+1234567890",
  "address": "Canada",
  "gender": "male",
  "dateOfBirth": "2025-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user123",
    "name": "Bashar Islam Updated",
    "email": "BH@gmail.com",
    "phoneNumber": "+1234567890",
    "address": "Canada",
    "gender": "male"
  },
  "message": "Profile information updated successfully"
}
```

---

### **9. Update Profile Picture**

```http
PUT /users/profile-picture
Authorization: Bearer {{accessToken}}
Content-Type: multipart/form-data

FormData:
  profileImage: <file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user123",
    "profileImage": "https://new-image-url.jpg"
  },
  "message": "Profile image updated successfully"
}
```

---

## 📊 **SCREEN 2: Without Permission**

### **APIs Required & Available:**

| Screen Element | API Endpoint | Status |
|----------------|--------------|--------|
| **Check Task Manager Status** | `GET /children-business-users/secondary-user` | ✅ EXISTS |
| **Get Profile Info** | `GET /users/profile-info` | ✅ EXISTS |
| **Get Preferred Time** | `GET /users/preferred-time` | ✅ EXISTS |
| **Update Preferred Time** | `PUT /users/preferred-time` | ✅ EXISTS |
| **Get Support Mode** | `GET /users/support-mode` | ✅ EXISTS |
| **Update Support Mode** | `PUT /users/support-mode` | ✅ EXISTS |
| **Update Notification Style** | `PUT /users/notification-style` | ✅ EXISTS |
| **Update Profile Info** | `PUT /users/profile-info` | ✅ EXISTS |
| **Update Profile Picture** | `PUT /users/profile-picture` | ✅ EXISTS |

**Note**: Same APIs as Screen 1, but "Task Manager" badge is NOT shown.

---

### **1. Check Task Manager Status (On Screen Load)**

```http
GET /children-business-users/secondary-user
Authorization: Bearer {{accessToken}}
```

**Response (No Permission):**
```json
{
  "success": true,
  "data": {
    "childUserId": null,
    "isSecondaryUser": false
  },
  "message": "No secondary user found"
}
```

**Frontend Action:**
```javascript
if (!response.data.isSecondaryUser) {
  // Hide "Task Manager" badge
  setShowTaskManagerBadge(false);
}
```

**Frontend Display:**
```
┌─────────────────────────────┐
│ 👤 Bashar Islam             │
│ BH@gmail.com                │
│                             │
│ ❌ No "Task Manager" badge  │
└─────────────────────────────┘
```

---

## 📝 **COMPLETE API LIST**

### **For Both Screens:**

1. ✅ `GET /children-business-users/secondary-user` - Check Task Manager status
2. ✅ `GET /users/profile-info` - Get profile information
3. ✅ `GET /users/preferred-time` - Get preferred working time
4. ✅ `PUT /users/preferred-time` - Update preferred time
5. ✅ `GET /users/support-mode` - Get support mode
6. ✅ `PUT /users/support-mode` - Update support mode
7. ✅ `PUT /users/notification-style` - Update notification style
8. ✅ `PUT /users/profile-info` - Update profile info
9. ✅ `PUT /users/profile-picture` - Update profile picture

---

## 🧪 **TESTING FLOW**

### **Test Screen 1 (With Permission):**

```bash
# 1. Check Task Manager status
GET /children-business-users/secondary-user
→ Should return isSecondaryUser: true

# 2. Get profile info
GET /users/profile-info
→ Should return full profile

# 3. Get preferred time
GET /users/preferred-time
→ Should return "07:00"

# 4. Update preferred time
PUT /users/preferred-time
{ "preferredTime": "08:00" }
→ Should update successfully

# 5. Update support mode
PUT /users/support-mode
{ "supportMode": "encouraging" }
→ Should update successfully

# 6. Update notification style
PUT /users/notification-style
{ "notificationStyle": "gentle" }
→ Should update successfully
```

### **Test Screen 2 (Without Permission):**

```bash
# 1. Check Task Manager status
GET /children-business-users/secondary-user
→ Should return isSecondaryUser: false

# 2. Get profile info (still works)
GET /users/profile-info
→ Should return full profile

# 3. All other profile APIs work the same
# Only difference: No "Task Manager" badge shown
```

---

## 📁 **BACKEND FILES**

### **Routes:**
- `src/modules/user.module/user/user.route.ts`
  - `GET /users/profile-info` (line 190)
  - `PUT /users/profile-info` (line 202)
  - `PUT /users/profile-picture` (line 232)
  - `GET /users/support-mode` (line 244)
  - `PUT /users/support-mode` (line 255)
  - `PUT /users/notification-style` (line 267)
  - `GET /users/preferred-time` (line 281)
  - `PUT /users/preferred-time` (line 295)

- `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts`
  - `GET /children-business-users/secondary-user` (line 128)

### **Controllers:**
- `src/modules/user.module/user/user.controller.ts`
  - `getProfileInformationOfAUser()` (line 157)
  - `updateProfileInformationOfAUser()` (line 286)
  - `updateProfileImageSeparately()` (line 350)
  - `getSupportMode()` (line 890)
  - `updateSupportMode()` (line 925)
  - `updateNotificationStyle()` (line 946)
  - `getPreferredTime()` (line 960)
  - `updatePreferredTime()` (line 975)

- `src/modules/childrenBusinessUser.module/childrenBusinessUser.controller.ts`
  - `getSecondaryUser()` (line 332)

### **Services:**
- `src/modules/user.module/user/user.service.ts`
  - `getProfileInformationOfAUser()` (line 157)
  - `updateProfileInformationOfAUser()` (line 286)
  - `getSupportMode()` (line 890)
  - `updateSupportMode()` (line 925)
  - `updateNotificationStyle()` (line 946)
  - `getPreferredTime()` (line 960)
  - `updatePreferredTime()` (line 975)

### **Validations:**
- `src/modules/user.module/user/user.validation.ts`
  - `updateSupportModeValidationSchema` (line 46)
  - `updateNotificationStyleValidationSchema` (line 59)
  - `updatePreferredTimeValidationSchema` (line 74)

---

## ✅ **STATUS**

| Feature | API Exists? | Tested? | Production Ready? |
|---------|-------------|---------|-------------------|
| Check Task Manager Status | ✅ | ✅ | ✅ |
| Get Profile Info | ✅ | ✅ | ✅ |
| Get Preferred Time | ✅ | ✅ | ✅ |
| Update Preferred Time | ✅ | ✅ | ✅ |
| Get Support Mode | ✅ | ✅ | ✅ |
| Update Support Mode | ✅ | ✅ | ✅ |
| Update Notification Style | ✅ | ✅ | ✅ |
| Update Profile Info | ✅ | ✅ | ✅ |
| Update Profile Picture | ✅ | ✅ | ✅ |

**All APIs for both screens are IMPLEMENTED and READY!** 🎉

---

## 🎨 **FRONTEND INTEGRATION**

### **Screen 1: With Task Manager Badge**

```javascript
// On screen load
useEffect(() => {
  const checkPermission = async () => {
    const response = await api.get('/children-business-users/secondary-user');
    
    if (response.data.isSecondaryUser) {
      setShowTaskManagerBadge(true);
    } else {
      setShowTaskManagerBadge(false);
    }
  };
  
  checkPermission();
}, []);
```

### **Screen 2: Without Badge**

Same code, but badge won't show because `isSecondaryUser` is `false`.

---

**Date**: 18-03-26  
**Status**: ✅ **COMPLETE**

---
