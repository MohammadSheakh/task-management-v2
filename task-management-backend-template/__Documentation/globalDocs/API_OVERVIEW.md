# 📡 API Overview

**Version**: 1.0  
**Last Updated**: 08-03-26  
**Status**: ✅ Production Ready

---

## 🎯 Overview

This document provides a comprehensive overview of all API endpoints available in the Task Management Backend system.

**Total Endpoints**: 130+ across 10 modules

---

## 📊 API Statistics

| Module | Endpoints | Auth Required | Rate Limit |
|--------|-----------|---------------|------------|
| **task.module** | 17 | ✅ Yes | 100/min |
| **group.module** | 19 | ✅ Yes | 100/min |
| **notification.module** | 13 | ✅ Yes | 100/min |
| **analytics.module** | 21 | ✅ Yes | 100/min |
| **subscription.module** | 12 | ✅ Yes | 100/min |
| **payment.module** | 6 | ✅ Yes | 100/min |
| **user.module** | 15 | ✅ Yes | 100/min |
| **auth.module** | 10 | ❌ No (public) | 5/min |
| **attachments** | 5 | ✅ Yes | 50/min |
| **chatting.module** | 12 | ✅ Yes | 100/min |

---

## 🔐 Authentication

### Public Endpoints (No Auth)
```
POST /auth/signup
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/verify-email
POST /auth/resend-verification
GET  /health
GET  /api-docs
```

### Protected Endpoints (JWT Required)
```
Authorization: Bearer <jwt_token>
```

---

## 📋 Task Module APIs

### Base URL: `/tasks`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/tasks/` | Create task | ✅ |
| GET | `/tasks/` | Get my tasks | ✅ |
| GET | `/tasks/paginate` | Paginated tasks | ✅ |
| GET | `/tasks/statistics` | Task statistics | ✅ |
| GET | `/tasks/daily-progress` | Daily progress | ✅ |
| GET | `/tasks/:id` | Get task by ID | ✅ |
| PUT | `/tasks/:id` | Update task | ✅ |
| DELETE | `/tasks/:id` | Delete task | ✅ |
| PUT | `/tasks/:id/status` | Update status | ✅ |
| PUT | `/tasks/:id/subtasks/progress` | Update subtasks | ✅ |

### Subtask APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/subtasks/` | Create subtask | ✅ |
| GET | `/subtasks/task/:taskId` | Get subtasks | ✅ |
| GET | `/subtasks/task/:taskId/paginate` | Paginated subtasks | ✅ |
| GET | `/subtasks/:id` | Get subtask | ✅ |
| PUT | `/subtasks/:id` | Update subtask | ✅ |
| PUT | `/subtasks/:id/toggle-status` | Toggle completion | ✅ |
| DELETE | `/subtasks/:id` | Delete subtask | ✅ |

---

## 👥 Group Module APIs

### Base URL: `/groups`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/groups/` | Create group | ✅ |
| GET | `/groups/my` | Get my groups | ✅ |
| GET | `/groups/my/paginate` | Paginated groups | ✅ |
| GET | `/groups/:id` | Get group by ID | ✅ |
| PUT | `/groups/:id` | Update group | ✅ |
| DELETE | `/groups/:id` | Delete group | ✅ |
| GET | `/groups/search` | Search groups | ✅ |

### Group Member APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/groups/:id/members` | Add member | ✅ |
| POST | `/groups/:id/members/create` | Create member account | ✅ |
| PUT | `/groups/:id/members/:userId/role` | Update role | ✅ |
| PUT | `/groups/:id/members/:userId/profile` | Update profile | ✅ |
| DELETE | `/groups/:id/members/:userId` | Remove member | ✅ |
| GET | `/groups/:id/members` | Get members | ✅ |

### Group Invitation APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/group-invitations/` | Create invitation | ✅ |
| POST | `/group-invitations/bulk` | Bulk invitations | ✅ |
| POST | `/group-invitations/:token/accept` | Accept invitation | ✅ |
| POST | `/group-invitations/:token/decline` | Decline invitation | ✅ |
| DELETE | `/group-invitations/:token` | Cancel invitation | ✅ |
| GET | `/group-invitations/group/:id` | Get group invitations | ✅ |

---

## 🔔 Notification Module APIs

### Base URL: `/notifications`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications/my` | Get my notifications | ✅ |
| GET | `/notifications/unread-count` | Get unread count | ✅ |
| POST | `/notifications/:id/read` | Mark as read | ✅ |
| POST | `/notifications/read-all` | Mark all as read | ✅ |
| DELETE | `/notifications/:id` | Delete notification | ✅ |
| GET | `/notifications/scheduled` | Get scheduled notifications | ✅ |
| GET | `/notifications/activity-feed/:groupId` | Get activity feed | ✅ |

### Task Reminder APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/task-reminders/` | Create reminder | ✅ |
| GET | `/task-reminders/task/:taskId` | Get reminders | ✅ |
| DELETE | `/task-reminders/:id` | Delete reminder | ✅ |

---

## 📊 Analytics Module APIs

### Base URL: `/analytics`

### User Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/analytics/user/my/overview` | User overview | ✅ |
| GET | `/analytics/user/my/daily-progress` | Daily progress | ✅ |
| GET | `/analytics/user/my/weekly-streak` | Streak data | ✅ |
| GET | `/analytics/user/my/productivity-score` | Productivity score | ✅ |
| GET | `/analytics/user/my/completion-rate` | Completion rate | ✅ |
| GET | `/analytics/user/my/task-statistics` | Task statistics | ✅ |
| GET | `/analytics/user/my/trend` | Trend analytics | ✅ |

### Task Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/analytics/task/overview` | Platform overview | ✅ |
| GET | `/analytics/task/status-distribution` | Status distribution | ✅ |
| GET | `/analytics/task/group/:groupId` | Group task analytics | ✅ |
| GET | `/analytics/task/daily-summary` | Daily summary | ✅ |

### Group Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/analytics/group/:groupId/overview` | Group overview | ✅ |
| GET | `/analytics/group/:groupId/members` | Member statistics | ✅ |
| GET | `/analytics/group/:groupId/leaderboard` | Leaderboard | ✅ |
| GET | `/analytics/group/:groupId/performance` | Performance metrics | ✅ |
| GET | `/analytics/group/:groupId/activity` | Activity feed | ✅ |

### Admin Analytics

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/analytics/admin/dashboard` | Complete dashboard | ✅ | Admin |
| GET | `/analytics/admin/user-growth` | User growth | ✅ | Admin |
| GET | `/analytics/admin/revenue` | Revenue analytics | ✅ | Admin |
| GET | `/analytics/admin/task-metrics` | Task metrics | ✅ | Admin |
| GET | `/analytics/admin/engagement` | Engagement metrics | ✅ | Admin |

---

## 💳 Subscription Module APIs

### Base URL: `/subscription-plans`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/subscription-plans/paginate` | Get active plans | ❌ |
| GET | `/subscription-plans/:id` | Get plan by ID | ❌ |
| POST | `/subscription-plans/` | Create plan | ✅ (Admin) |
| PUT | `/subscription-plans/:id` | Update plan | ✅ (Admin) |
| DELETE | `/subscription-plans/:id` | Delete plan | ✅ (Admin) |
| POST | `/subscription-plans/purchase/:id` | Purchase plan | ✅ |

### User Subscription APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/user-subscriptions/paginate` | Get my subscriptions | ✅ |
| GET | `/user-subscriptions/:id` | Get subscription details | ✅ |
| POST | `/user-subscriptions/create` | Create subscription | ✅ |
| POST | `/user-subscriptions/free-trial/start` | Start free trial | ✅ |
| POST | `/user-subscriptions/cancel` | Cancel subscription | ✅ |
| PUT | `/user-subscriptions/update/:id` | Update subscription | ✅ (Admin) |

---

## 💰 Payment Module APIs

### Base URL: `/payment-transactions`

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/payment-transactions/paginate` | Get all transactions | ✅ | Admin |
| GET | `/payment-transactions/paginate/dev` | Dev view | ✅ | Admin |
| GET | `/payment-transactions/overview/admin` | Earnings overview | ✅ | Admin |
| GET | `/payment-transactions/:id` | Get transaction by ID | ✅ | User |
| POST | `/payment-transactions/` | Create transaction | ✅ | System |

### Stripe Webhook

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/stripe-webhook/` | Stripe webhook | ❌ |

---

## 👤 User Module APIs

### Base URL: `/users`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/paginate` | Get users (Admin) | ✅ |
| GET | `/users/profile` | Get profile | ✅ |
| PUT | `/users/profile-info` | Update profile | ✅ |
| PUT | `/users/profile-picture` | Update profile picture | ✅ |
| GET | `/users/support-mode` | Get support mode | ✅ |
| PUT | `/users/support-mode` | Update support mode | ✅ |
| PUT | `/users/notification-style` | Update notification style | ✅ |

---

## 🔐 Auth Module APIs

### Base URL: `/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/signup` | User signup | ❌ |
| POST | `/auth/login` | User login | ❌ |
| POST | `/auth/forgot-password` | Forgot password | ❌ |
| POST | `/auth/reset-password` | Reset password | ❌ |
| POST | `/auth/verify-email` | Verify email | ❌ |
| POST | `/auth/resend-verification` | Resend verification | ❌ |
| POST | `/auth/refresh-token` | Refresh token | ✅ |
| POST | `/auth/logout` | Logout | ✅ |

---

## 📎 Attachments APIs

### Base URL: `/attachments`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/attachments/upload` | Upload single file | ✅ |
| POST | `/attachments/upload-multiple` | Upload multiple files | ✅ |
| GET | `/attachments/:id` | Get attachment | ✅ |
| DELETE | `/attachments/:id` | Delete attachment | ✅ |
| GET | `/attachments/:id/download` | Download attachment | ✅ |

---

## 💬 Chatting Module APIs

### Base URL: `/conversations`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/conversations` | Get conversations | ✅ |
| POST | `/conversations` | Create conversation | ✅ |
| GET | `/conversations/:id` | Get conversation | ✅ |
| PUT | `/conversations/:id` | Update conversation | ✅ |
| DELETE | `/conversations/:id` | Delete conversation | ✅ |

### Message APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/messages/conversation/:conversationId` | Get messages | ✅ |
| POST | `/messages/` | Send message | ✅ |
| PUT | `/messages/:id/read` | Mark message as read | ✅ |
| DELETE | `/messages/:id` | Delete message | ✅ |

---

## 🔗 Related Documentation

- [Getting Started Guide](./GETTING_STARTED.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Module Documentation](../../src/modules/)
- [Postman Collection](../postman/)

---

**Document Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Complete
