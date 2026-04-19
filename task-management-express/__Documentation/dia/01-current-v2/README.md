# 📊 Global Diagrams Index

**Project**: Task Management Backend  
**Last Updated**: 08-03-26  
**Total Diagrams**: 9 comprehensive diagrams

---

## 🎯 Overview

This folder contains **project-level diagrams** that show the complete system architecture, data flows, and interactions across all modules in the Task Management System.

---

## 📋 Diagram List

### 1. Complete System Schema (ER Diagram)
**File**: [`complete-system-schema.mermaid`](./complete-system-schema.mermaid)

**Description**: Entity-Relationship diagram showing all collections and their relationships across all modules.

**Entities**:
- User Module (User, UserProfile)
- Task Module (Task, SubTask)
- Group Module (Group, GroupMember, GroupInvitation)
- Notification Module (Notification, TaskReminder)
- Subscription Module (SubscriptionPlan, UserSubscription)
- Payment Module (PaymentTransaction)
- Analytics (Virtual collections)

**Relationships**: 50+ relationships mapped

---

### 2. Complete System Architecture
**File**: [`complete-system-architecture.mermaid`](./complete-system-architecture.mermaid)

**Description**: High-level system architecture showing all layers from frontend to external services.

**Layers**:
- Frontend Layer (Flutter, Website, Admin Dashboard)
- API Gateway (Load Balancer, Auth, Rate Limiter)
- Backend Services (All 10 modules)
- Async Processing (BullMQ, Workers)
- Data Layer (MongoDB, Redis, File Storage)
- External Services (Stripe, Email, Push, SMS)

---

### 3. Complete User Journey
**File**: [`complete-user-journey.mermaid`](./complete-user-journey.mermaid)

**Description**: End-to-end user journey from signup to subscription renewal.

**Phases**:
- Onboarding (Signup, Verify, Profile)
- Subscription (View Plans, Trial, Payment)
- Group Setup (Create, Invite, Join)
- Task Management (Create, Assign, Complete)
- Collaboration (Activity, Comments, Leaderboard)
- Analytics (Stats, Streak, Productivity)
- Renewal (Auto-renew, Continue)

---

### 4. Complete Data Flow
**File**: [`complete-data-flow.mermaid`](./complete-data-flow.mermaid)

**Description**: End-to-end data flow showing how data moves through the system.

**Flows**:
- User Actions → API Gateway
- Business Logic Layer
- Data Layer (MongoDB, Redis)
- Async Processing (BullMQ)
- External Services

---

### 5. Complete Sequence Diagram
**File**: [`complete-sequence-diagram.mermaid`](./complete-sequence-diagram.mermaid)

**Description**: Sequence diagram showing key operations across all modules.

**Operations**:
1. User Signup & Login
2. Create Group & Invite Members
3. Create Task
4. Complete Task
5. View Analytics
6. Subscribe to Plan
7. Stripe Webhook Processing

---

### 6. Complete Swimlane Diagram
**File**: [`complete-swimlane-diagram.mermaid`](./complete-swimlane.mermaid)

**Description**: Swimlane diagram showing responsibilities across all actors.

**Swimlanes**:
- User
- Frontend (Flutter/Website)
- Backend API
- Database (MongoDB)
- Cache (Redis)
- Queue (BullMQ)
- External Services

---

### 7. Deployment Architecture
**File**: [`deployment-architecture.mermaid`](./deployment-architecture.mermaid)

**Description**: Production deployment architecture with AWS services.

**Components**:
- CDN Layer (Cloudflare)
- Load Balancing (AWS NLB/ALB)
- Application Layer (Multiple Pods)
- Data Layer (MongoDB Atlas, Redis Cluster)
- Monitoring (CloudWatch, Sentry)
- Security (WAF, SSL, Secrets Manager)

---

### 8. Module Dependency Diagram
**File**: [`module-dependency-diagram.mermaid`](./module-dependency-diagram.mermaid)

**Description**: Module dependencies and relationships.

**Groups**:
- Core Modules (Auth, User, Token, OTP)
- Task Modules (Task, SubTask)
- Group Modules (Group, Member, Invite)
- Notification Modules (Notification, Reminder)
- Analytics Modules (User, Task, Group, Admin)
- Subscription Modules (Plan, User Subscription)
- Payment Modules (Payment, Transaction, Webhook)
- Supporting Modules (Attachments, Chat, Settings)
- Shared Components (Generic, Middleware, Helpers)
- External Dependencies (Stripe, MongoDB, Redis, BullMQ)

---

### 9. Complete State Machine
**File**: [`complete-state-machine.mermaid`](./complete-state-machine.mermaid)

**Description**: State machines for all major entities.

**State Machines**:
- User States (Unverified → Verified → Active)
- Task States (Draft → Pending → In Progress → Completed)
- Group States (Creating → Active → Deleted)
- Member States (Invited → Accepted → Active)
- Subscription States (None → Trial → Active → Renewed)
- Payment States (Pending → Processing → Completed/Failed)
- Notification States (Pending → Sent → Delivered → Read)

---

## 🎨 Diagram Conventions

### Color Coding

| Color | Meaning |
|-------|---------|
| 🔵 Blue | User/Frontend |
| 🟠 Orange | API Gateway |
| 🟢 Green | Backend Services |
| 🔴 Red | Data Layer |
| 🟣 Purple | Async Processing |
| 🟡 Yellow | Queue/External |
| ⚪ Gray | Shared Components |

### Naming Conventions

- **Modules**: `module-name/` (lowercase with hyphens)
- **Files**: `descriptive-name.mermaid` (lowercase with hyphens)
- **States**: `StateName` (PascalCase)
- **Actions**: `actionName` (camelCase)

---

## 📊 Usage

### Viewing Diagrams

1. **VS Code**: Install Mermaid extension
2. **GitHub**: Native Mermaid support
3. **Online**: [Mermaid Live Editor](https://mermaid.live/)

### Editing Diagrams

1. Open `.mermaid` file
2. Edit Mermaid syntax
3. Preview in VS Code or browser
4. Commit changes

---

## 🔗 Related Documentation

### Module-Specific Diagrams

Each module has its own `/doc/dia/` folder with 8 diagrams:

- [`task.module/doc/dia/`](../../src/modules/task.module/doc/dia/)
- [`group.module/doc/dia/`](../../src/modules/group.module/doc/dia/)
- [`analytics.module/doc/dia/`](../../src/modules/analytics.module/doc/dia/)
- [`subscription.module/doc/dia/`](../../src/modules/subscription.module/doc/dia/)
- [`payment.module/doc/dia/`](../../src/modules/payment.module/doc/dia/)

### Architecture Documentation

- [`task.module/doc/TASK_MODULE_ARCHITECTURE.md`](../../src/modules/task.module/doc/TASK_MODULE_ARCHITECTURE.md)
- [`group.module/doc/GROUP_MODULE_ARCHITECTURE.md`](../../src/modules/group.module/doc/GROUP_MODULE_ARCHITECTURE.md)
- [`analytics.module/doc/ANALYTICS_MODULE_ARCHITECTURE.md`](../../src/modules/analytics.module/doc/ANALYTICS_MODULE_ARCHITECTURE.md)
- [`subscription.module/doc/SUBSCRIPTION_MODULE_ARCHITECTURE.md`](../../src/modules/subscription.module/doc/SUBSCRIPTION_MODULE_ARCHITECTURE.md)
- [`payment.module/doc/PAYMENT_MODULE_ARCHITECTURE.md`](../../src/modules/payment.module/doc/PAYMENT_MODULE_ARCHITECTURE.md)

### System Guides

- [`task.module/doc/TASK_MODULE_SYSTEM_GUIDE.md`](../../src/modules/task.module/doc/TASK_MODULE_SYSTEM_GUIDE-08-03-26.md)
- [`group.module/doc/GROUP_MODULE_SYSTEM_GUIDE.md`](../../src/modules/group.module/doc/GROUP_MODULE_SYSTEM_GUIDE-08-03-26.md)
- [`analytics.module/doc/ANALYTICS_MODULE_SYSTEM_GUIDE.md`](../../src/modules/analytics.module/doc/ANALYTICS_MODULE_SYSTEM_GUIDE-08-03-26.md)
- [`subscription.module/doc/SUBSCRIPTION_MODULE_SYSTEM_GUIDE.md`](../../src/modules/subscription.module/doc/SUBSCRIPTION_MODULE_SYSTEM_GUIDE-08-03-26.md)
- [`payment.module/doc/PAYMENT_MODULE_SYSTEM_GUIDE.md`](../../src/modules/payment.module/doc/PAYMENT_MODULE_SYSTEM_GUIDE-08-03-26.md)

---

## 📝 Quick Reference

| Diagram | Use Case |
|---------|----------|
| **System Schema** | Database design, relationships |
| **System Architecture** | System design, infrastructure |
| **User Journey** | UX design, feature planning |
| **Data Flow** | Data pipeline, integration points |
| **Sequence** | API design, system interactions |
| **Swimlane** | Team responsibilities, workflows |
| **Deployment** | Production setup, scaling |
| **Dependencies** | Module relationships, imports |
| **State Machine** | Status transitions, validation |

---

## 🎯 Best Practices

### When to Use Which Diagram

1. **Database Design** → System Schema
2. **System Design** → System Architecture
3. **User Experience** → User Journey
4. **Data Integration** → Data Flow
5. **API Design** → Sequence Diagram
6. **Workflow Design** → Swimlane Diagram
7. **Infrastructure** → Deployment Architecture
8. **Module Planning** → Dependency Diagram
9. **Status Logic** → State Machine

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| **Total Diagrams** | 9 |
| **Total Lines** | ~2,500+ |
| **Entities Mapped** | 50+ |
| **Modules Covered** | 10 |
| **External Services** | 5 |

---

**Last Updated**: 08-03-26  
**Maintained By**: Backend Engineering Team  
**Status**: ✅ Complete
