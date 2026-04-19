# ⚙️ API Flow: Settings

**Role:** All Users (Personal Settings), Admin (System Settings)  
**Figma Reference:** `app-user/group-children-user/profile-permission-account-interface.png`  
**Module:** Settings  
**Date:** 15-03-26  
**Version:** 1.0 - Complete Flow  

---

## 🎯 User Journeys

### For Users: Personal Settings
```
┌─────────────────────────────────────────────────────────────┐
│              USER: PERSONAL SETTINGS                        │
├─────────────────────────────────────────────────────────────┤
│  1. View Settings → Current Preferences                     │
│  2. Update Notification Style → Choose Preferences          │
│  3. Set Support Mode → Calm/Encouraging/Logical             │
│  4. Set Preferred Time → Task Time Preferences              │
└─────────────────────────────────────────────────────────────┘
```

### For Admin: System Settings
```
┌─────────────────────────────────────────────────────────────┐
│              ADMIN: SYSTEM SETTINGS                         │
├─────────────────────────────────────────────────────────────┤
│  1. View System Settings → Current Config                   │
│  2. Update System Config → Modify Limits                    │
│  3. Configure Email Settings → SMTP Config                  │
│  4. Toggle Features → Enable/Disable                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Flow 1: User - Get My Settings

```http
GET /v1/settings?type=personal
Authorization: Bearer {{userToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "personal",
    "notificationStyle": "email_and_push",
    "supportMode": "encouraging",
    "preferredTime": {
      "hour": 9,
      "minute": 0,
      "timezone": "America/New_York"
    },
    "language": "en",
    "theme": "light"
  }
}
```

---

## 📍 Flow 2: User - Update Notification Style

```http
PUT /v1/users/notification-style
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "notificationStyle": "push_only"
}
```

**Options:**
- `email_and_push`
- `email_only`
- `push_only`
- `none`

---

## 📍 Flow 3: User - Set Support Mode

**Figma:** `app-user/group-children-user/response-based-on-mode.png`

```http
PUT /v1/users/support-mode
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "supportMode": "encouraging"
}
```

**Options:**
- `calm` - Calm, gentle motivation
- `encouraging` - Enthusiastic, positive reinforcement
- `logical` - Fact-based, rational motivation

---

## 📍 Flow 4: User - Set Preferred Time

```http
PUT /v1/users/preferred-time
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "preferredTime": {
    "hour": 10,
    "minute": 0,
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "preferredTime": {
      "hour": 10,
      "minute": 0,
      "timezone": "America/New_York"
    }
  },
  "message": "Preferred time updated successfully"
}
```

---

## 📍 Flow 5: User - Get Preferred Time

```http
GET /v1/users/preferred-time
Authorization: Bearer {{userToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "preferredTime": {
      "hour": 10,
      "minute": 0,
      "timezone": "America/New_York"
    }
  }
}
```

---

## 📍 Flow 6: Admin - Get System Settings

```http
GET /v1/settings?type=system
Authorization: Bearer {{adminToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "system",
    "dailyTaskLimit": 10,
    "maxGroupSize": 10,
    "enableNotifications": true,
    "maintenanceMode": false
  }
}
```

---

## 📍 Flow 7: Admin - Update System Settings

```http
POST /v1/settings
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "type": "system",
  "dailyTaskLimit": 15,
  "maxGroupSize": 15,
  "enableNotifications": true,
  "maintenanceMode": false
}
```

---

## 📊 API Endpoint Summary

| Endpoint | Method | Role | Purpose |
|----------|--------|------|---------|
| `/settings?type=personal` | GET | User | Get personal settings |
| `/users/notification-style` | PUT | User | Update notifications |
| `/users/support-mode` | PUT | User | Set support mode |
| `/users/preferred-time` | PUT | User | Set preferred time |
| `/users/preferred-time` | GET | User | Get preferred time |
| `/settings?type=system` | GET | Admin | Get system settings |
| `/settings` | POST | Admin | Update system settings |

---

**Status:** ✅ **COMPLETE**  
**Last Updated:** 15-03-26
