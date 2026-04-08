# Development Plan

## Task Management Platform — askfemi

---

**Document Version:** 1.0  
**Date:** April 8, 2026  
**Prepared By:** Senior Backend Engineer  
**Based On:** Comprehensive Project Analysis + Product Requirements Document (PRD)  
**Current Status:** 85% Complete — Production Readiness Phase  
**Scale Targets:** 100,000+ concurrent users | 10M+ tasks | <200ms reads | 99.9% uptime

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Development Phases Overview](#3-development-phases-overview)
4. [Phase 1: Production Readiness (Weeks 1-2)](#4-phase-1-production-readiness-weeks-1-2)
5. [Phase 2: Figma-to-Backend Alignment (Weeks 3-4)](#5-phase-2-figma-to-backend-alignment-weeks-3-4)
6. [Phase 3: Scalability & Performance (Weeks 5-6)](#6-phase-3-scalability--performance-weeks-5-6)
7. [Phase 4: Security & Compliance (Weeks 7-8)](#7-phase-4-security--compliance-weeks-7-8)
8. [Phase 5: Testing & Quality Assurance (Weeks 9-10)](#8-phase-5-testing--quality-assurance-weeks-9-10)
9. [Phase 6: Documentation & Developer Experience (Weeks 11-12)](#9-phase-6-documentation--developer-experience-weeks-11-12)
10. [Phase 7: Deployment & Rollout (Weeks 13-14)](#10-phase-7-deployment--rollout-weeks-13-14)
11. [Sprint Breakdown](#11-sprint-breakdown)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Risk Management](#14-risk-management)
15. [Success Metrics & KPIs](#15-success-metrics--kpis)
16. [Post-Launch Roadmap](#16-post-launch-roadmap)

---

## 1. Executive Summary

### 1.1 Project Status

The **askfemi** backend is **85% complete** with a solid architectural foundation. All core modules (Auth, User, Task, Notification, Subscription, Payment, Analytics) are implemented and functional. The system is designed for horizontal scaling with Redis caching, BullMQ async processing, and Socket.IO real-time communication.

### 1.2 Remaining Work

The remaining **15%** focuses on:
- **Production hardening** (cache consistency, error handling, monitoring)
- **Figma-to-backend alignment** (verify all UI screens have matching APIs)
- **Performance optimization** (indexing, query optimization, load testing)
- **Security & compliance** (PII protection, rate limiting headers, COPPA)
- **Testing coverage** (unit, integration, E2E, load testing)
- **Documentation** (module docs, performance reports, API reference)

### 1.3 Development Timeline

```
Total Duration: 14 Weeks (3.5 months)
├── Phase 1: Production Readiness (Weeks 1-2)
├── Phase 2: Figma-to-Backend Alignment (Weeks 3-4)
├── Phase 3: Scalability & Performance (Weeks 5-6)
├── Phase 4: Security & Compliance (Weeks 7-8)
├── Phase 5: Testing & QA (Weeks 9-10)
├── Phase 6: Documentation & DX (Weeks 11-12)
└── Phase 7: Deployment & Rollout (Weeks 13-14)
```

### 1.4 Key Deliverables

| Deliverable | Phase | Priority | Status |
|-------------|-------|----------|--------|
| Production-ready backend | Phase 1 | P0 (Critical) | ⏸️ Pending |
| Figma-aligned APIs | Phase 2 | P0 (Critical) | ⏸️ Pending |
| Load test results (100K users) | Phase 3 | P0 (Critical) | ⏸️ Pending |
| Security audit pass | Phase 4 | P0 (Critical) | ⏸️ Pending |
| Test coverage >80% | Phase 5 | P0 (Critical) | ⏸️ Pending |
| Complete documentation | Phase 6 | P1 (High) | ⏸️ Pending |
| Staging → Production rollout | Phase 7 | P0 (Critical) | ⏸️ Pending |

---

## 2. Current State Assessment

### 2.1 Module Completion Matrix

|          Module           |   Status   | Completion | Production Ready? |                                     Notes                                     |
| ------------------------- | ---------- | ---------- | ----------------- | ----------------------------------------------------------------------------- |
| Auth                      | ✅ Complete | 100%       | ✅ Yes             | JWT, Redis sessions, OAuth, rate limiting                                     |
| User                      | ✅ Complete | 100%       | ✅ Yes             | 5 models, pagination, soft deletes                                            |
| Task                      | ✅ Complete | 95%        | ⚠️ Mostly         | Missing `.lean()` audit, cache invalidation                                   |
| Task Progress             | ✅ Complete | 100%       | ✅ Yes             | Per-user tracking on collaborative tasks                                      |
| Notification              | ✅ Complete | 100%       | ✅ Yes             | BullMQ workers, V2 (fixed duplicates)                                         |
| Children/Business User    | ✅ Complete | 95%        | ⚠️ Mostly         | Permission endpoints need verification                                        |
| Analytics                 | ✅ Complete | 90%        | ⚠️ Mostly         | Needs BullMQ for heavy queries, read replica                                  |
| Chatting                  | ✅ Complete | 100%       | ❌ Not in Figma    | Backend exists, but not aligned with UI — **DECIDE: Archive or Add to Figma** |
| Payment                   | ✅ Complete | 95%        | ⚠️ Mostly         | Missing proration, refund handling                                            |
| Subscription              | ✅ Complete | 95%        | ⚠️ Mostly         | Missing upgrade/downgrade logic                                               |
| Settings                  | ✅ Complete | 100%       | ✅ Yes             | Singleton pattern, CRUD complete                                              |
| Attachments               | ✅ Complete | 100%       | ✅ Yes             | Cloudinary/S3 upload, metadata tracking                                       |
| OTP                       | ✅ Complete | 100%       | ✅ Yes             | TTL indexes, verification flow                                                |
| Token                     | ✅ Complete | 100%       | ✅ Yes             | Refresh token rotation, reuse detection                                       |
| Generic Module            | ✅ Template | N/A        | ✅ Yes             | GenericController, GenericService, module generator                           |
| **Service Booking Route** | ❌ Legacy   | 0%         | ❌ No              | **REMOVE:** Not registered, not needed                                        |

### 2.2 Infrastructure Readiness

| Infrastructure | Status | Production Ready? | Gaps |
|----------------|--------|-------------------|------|
| Node.js Clustering | ✅ Implemented | ✅ Yes | All CPU cores utilized |
| Redis Caching | ✅ Implemented | ⚠️ Mostly | Inconsistent key naming, missing invalidation |
| BullMQ Queues | ✅ Implemented | ⚠️ Mostly | Not all heavy ops queued, missing job failure logging |
| MongoDB Connection Pooling | ✅ Implemented | ⚠️ Mostly | No monitoring, no read replica |
| Socket.IO (Real-time) | ✅ Implemented | ⚠️ Mostly | Missing auth middleware, rate limiting |
| Payment Integration | ✅ Implemented | ⚠️ Mostly | Missing proration, refunds, reconciliation |
| File Upload (Cloudinary/S3) | ✅ Implemented | ✅ Yes | Missing size validation, virus scanning |
| Logging (Winston) | ✅ Implemented | ⚠️ Mostly | Missing metrics, APM integration |
| Health Check | ✅ Implemented | ✅ Yes | DB, Redis, Queue status |
| Rate Limiting | ✅ Implemented | ⚠️ Mostly | Missing headers, inconsistent application |
| Error Handling | ✅ Implemented | ✅ Yes | Global handler for all error types |
| i18n (English/Bengali) | ✅ Implemented | ⚠️ Mostly | Not all strings externalized |

### 2.3 Technical Debt Inventory

| Debt Item | Impact | Effort | Priority | Phase |
|-----------|--------|--------|----------|-------|
| Remove legacy files (`serviceBooking.route.ts`, old notification module) | Low | 1 hour | P2 | Phase 1 |
| Complete cache invalidation audit | High | 2 days | P0 | Phase 1 |
| Add `.lean()` to all read-only queries | Medium | 1 day | P1 | Phase 1 |
| Add missing indexes (partial, text, compound) | High | 1 day | P0 | Phase 1 |
| Implement BullMQ for analytics queries | Medium | 2 days | P1 | Phase 3 |
| Add rate limiting headers (`X-RateLimit-*`) | Medium | 0.5 days | P1 | Phase 4 |
| Add ETags for cacheable responses | Low | 1 day | P2 | Phase 3 |
| Remove unused payment gateways (AmarPay, Nagad, SurjoPay) | Low | 0.5 days | P2 | Phase 1 |
| Implement distributed locks for cron jobs | Medium | 1 day | P1 | Phase 3 |
| Add connection pool monitoring | Medium | 1 day | P1 | Phase 3 |
| Implement Redis sorted sets for counts | Medium | 2 days | P1 | Phase 3 |
| Add APM integration (Datadog/New Relic) | High | 1 day | P0 | Phase 3 |
| Implement field-level encryption for PII | High | 2 days | P0 | Phase 4 |
| Complete Chat module decision (Archive or Align) | Medium | 0.5 days | P1 | Phase 2 |
| Expand i18n coverage (externalize all strings) | Low | 1 day | P2 | Phase 6 |
| Add webhook retry logic | Medium | 1 day | P1 | Phase 1 |
| Implement subscription proration | High | 2 days | P0 | Phase 2 |
| Add refund/chargeback handling | High | 2 days | P0 | Phase 2 |
| Implement unit tests (>80% coverage) | High | 5 days | P0 | Phase 5 |
| Implement integration tests | High | 5 days | P0 | Phase 5 |
| Implement load testing (100K users) | High | 3 days | P0 | Phase 5 |
| Complete module documentation | Medium | 3 days | P1 | Phase 6 |
| Generate performance reports | Medium | 2 days | P1 | Phase 6 |
| Create Postman collection | Medium | 1 day | P1 | Phase 6 |

---

## 3. Development Phases Overview

### 3.1 Phase Dependencies

```
Phase 1: Production Readiness (Weeks 1-2)
    ↓
Phase 2: Figma-to-Backend Alignment (Weeks 3-4)
    ↓
Phase 3: Scalability & Performance (Weeks 5-6)
    ↓
Phase 4: Security & Compliance (Weeks 7-8)
    ↓
Phase 5: Testing & QA (Weeks 9-10)
    ↓
Phase 6: Documentation & DX (Weeks 11-12)
    ↓
Phase 7: Deployment & Rollout (Weeks 13-14)
```

**Dependency Rules:**
- Each phase depends on previous phase completion
- Phases 1-4 can have parallel workstreams (different modules)
- Phase 5 (Testing) requires Phases 1-4 complete
- Phase 6 (Documentation) can start during Phase 5
- Phase 7 (Deployment) requires all previous phases complete

### 3.2 Phase Summary Matrix

| Phase | Duration | Focus | Key Deliverables | Success Criteria |
|-------|----------|-------|------------------|------------------|
| 1. Production Readiness | 2 weeks | Bug fixes, cache consistency, indexing | Clean codebase, consistent caching, all indexes defined | No cache inconsistencies, all queries use indexes |
| 2. Figma Alignment | 2 weeks | API completeness, UI-backend sync | All Figma screens have matching APIs, subscription proration, refund handling | 100% Figma coverage, payment flows complete |
| 3. Scalability | 2 weeks | Performance, monitoring, async processing | APM configured, BullMQ for heavy ops, load test results | <200ms reads, <500ms writes, 100K concurrent users |
| 4. Security & Compliance | 2 weeks | PII protection, rate limiting, COPPA | Field encryption, rate limit headers, COPPA compliance audit pass | Security audit pass, no critical vulnerabilities |
| 5. Testing & QA | 2 weeks | Unit, integration, E2E, load testing | >80% test coverage, load test report, bug fixes | All tests pass, load targets met |
| 6. Documentation & DX | 2 weeks | Module docs, API reference, Postman | Complete `/doc` folders, performance reports, Postman collection | 100% modules documented, developer onboarding <1 day |
| 7. Deployment & Rollout | 2 weeks | Staging → Production, monitoring, rollback plan | Production deployment, monitoring dashboards, runbooks | 99.9% uptime, incident response <5 min |

---

## 4. Phase 1: Production Readiness (Weeks 1-2)

### 4.1 Objectives

Transform the codebase from "functional" to "production-ready" by:
- Removing legacy/unused code
- Ensuring cache consistency
- Adding missing database indexes
- Implementing `.lean()` on all read-only queries
- Completing webhook retry logic
- Removing unused payment gateways

### 4.2 Tasks Breakdown

#### Week 1: Code Cleanup & Cache Consistency

| Task | File(s) | Effort | Priority | Dependencies |
|------|---------|--------|----------|--------------|
| Remove `serviceBooking.route.ts` | `src/modules/serviceBooking.route.ts` | 1 hour | P2 | None |
| Remove legacy `notification/` module | `src/modules/notification/` | 1 hour | P2 | None |
| Remove unused payment gateways | `src/config/paymentGateways/` | 2 hours | P2 | None |
| Audit cache invalidation logic | All service files | 1 day | P0 | None |
| Fix cache key naming convention | All modules | 1 day | P0 | Cache invalidation audit |
| Add cache invalidation on write operations | Task, User, Subscription services | 1 day | P0 | Cache key naming |

**Deliverables:**
- ✅ Clean codebase (no legacy files)
- ✅ Consistent cache key naming: `<module>:<id>:<datatype>`
- ✅ Cache invalidation on all write operations
- ✅ Cache invalidation test suite

#### Week 2: Database Indexing & Query Optimization

| Task | File(s) | Effort | Priority | Dependencies |
|------|---------|--------|----------|--------------|
| Add `.lean()` to all read-only queries | All service files | 1 day | P1 | None |
| Add partial indexes for active tasks | `task.model.ts` | 2 hours | P0 | None |
| Add text index for task search | `task.model.ts` | 1 hour | P0 | None |
| Add compound index for messages | `message.model.ts` | 1 hour | P1 | None |
| Add missing indexes (from Section 4.2 of analysis) | All model files | 0.5 days | P0 | None |
| Verify indexes with `.explain('executionStats')` | MongoDB shell | 0.5 days | P0 | Indexes added |

**Deliverables:**
- ✅ `.lean()` on all read-only queries (2-3x memory reduction)
- ✅ All queries use indexes (no COLLSCAN)
- ✅ Partial indexes for active tasks: `{ status: 1, isDeleted: 1 }, { partialFilterExpression: { status: { $ne: 'completed' } } }`
- ✅ Text index for task search: `{ title: 'text', description: 'text' }`
- ✅ Message compound index: `{ conversationId: 1, createdAt: -1 }`

### 4.3 Cache Invalidation Audit

**Current State:** Inconsistent — some write operations invalidate cache, others don't.

**Target State:** All write operations invalidate related cache keys immediately.

**Audit Checklist:**

| Write Operation | Cache Key to Invalidate | Status |
|-----------------|------------------------|--------|
| Create Task | `parent:{parentId}:tasks:list`, `child:{childId}:tasks:home` | ⏸️ To Do |
| Update Task | `task:{taskId}:detail`, `parent:{parentId}:tasks:list`, `child:{childId}:tasks:home` | ⏸️ To Do |
| Delete Task | `task:{taskId}:detail`, `parent:{parentId}:tasks:list`, `child:{childId}:tasks:home` | ⏸️ To Do |
| Update Task Status | `task:{taskId}:detail`, `parent:{parentId}:dashboard:overview`, `child:{childId}:tasks:home` | ⏸️ To Do |
| Create SubTask Progress | `task:{taskId}:detail`, `parent:{parentId}:tasks:list` | ⏸️ To Do |
| Update User Profile | `user:{userId}:profile`, `parent:{parentId}:dashboard:overview` | ⏸️ To Do |
| Create Notification | `child:{childId}:notifications:unread` | ⏸️ To Do |
| Mark Notification Read | `child:{childId}:notifications:unread` | ⏸️ To Do |
| Create ChildrenBusinessUser | `parent:{parentId}:team:members`, `parent:{parentId}:dashboard:overview` | ⏸️ To Do |
| Update Permissions | `child:{childId}:permissions` | ⏸️ To Do |
| Create Payment | `admin:dashboard:overview`, `parent:{parentId}:subscription:details` | ⏸️ To Do |
| Update Subscription | `parent:{parentId}:subscription:details`, `user:{userId}:subscription` | ⏸️ To Do |

### 4.4 Index Implementation Plan

**Task Collection:**
```typescript
// Existing indexes
taskSchema.index({ ownerUserId: 1, status: 1, isDeleted: 1 });
taskSchema.index({ assignedUserIds: 1, isDeleted: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ createdById: 1, isDeleted: 1 });

// NEW indexes to add
taskSchema.index({ title: 'text', description: 'text' });  // Text search
taskSchema.index({ status: 1, isDeleted: 1 }, { partialFilterExpression: { status: { $ne: 'completed' } } });  // Partial index
taskSchema.index({ priority: 1, status: 1, isDeleted: 1 });  // Priority-based queries
taskSchema.index({ updatedAt: -1, isDeleted: 1 });  // Recently updated tasks
```

**Message Collection:**
```typescript
// NEW index
messageSchema.index({ conversationId: 1, createdAt: -1 });  // Chat history queries
```

### 4.5 Acceptance Criteria

| Criteria | Verification Method | Status |
|----------|---------------------|--------|
| No legacy files in codebase | `git status`, manual review | ⏸️ Pending |
| All write operations invalidate cache | Code review, test suite | ⏸️ Pending |
| All queries use indexes (no COLLSCAN) | `.explain('executionStats')` on all queries | ⏸️ Pending |
| `.lean()` on all read-only queries | Code review, grep for `.find(` without `.lean()` | ⏸️ Pending |
| No unused payment gateways | Config folder review | ⏸️ Pending |

---

## 5. Phase 2: Figma-to-Backend Alignment (Weeks 3-4)

### 5.1 Objectives

Ensure every Figma screen has a matching backend API:
- Verify all Figma screens have required data from APIs
- Implement missing endpoints (permission checks, subscription proration, refunds)
- Align response schemas with UI expectations
- Decide Chat module fate (Archive or Align with Figma)

### 5.2 Tasks Breakdown

#### Week 3: API Completeness & Chat Decision

| Task | Effort | Priority | Dependencies | Decision/Notes |
|------|--------|----------|--------------|----------------|
| **DECIDE: Chat module** | 1 hour | P1 | None | **If not in Figma → Archive** |
| Map all Figma screens to APIs | 1 day | P0 | None | Create mapping document |
| Implement missing permission check endpoints | 1 day | P0 | Figma mapping | `GET /children-business-users/me/permissions` |
| Implement support mode API | 0.5 days | P1 | Figma mapping | `PUT /users/me/profile` with `supportMode` field |
| Implement notification preferences API | 0.5 days | P1 | Figma mapping | `PUT /users/me/profile` with `notificationStyle` |
| Implement quick assign endpoint | 0.5 days | P1 | Figma mapping | Optimized task creation for parent dashboard |

**Decision Point: Chat Module**

**Options:**
1. **Archive:** Remove from active routes, document for future use
2. **Align:** Add chat screens to Figma, complete integration
3. **Feature Flag:** Keep backend, disable in UI until needed

**Recommendation:** Archive (unless product team explicitly requests chat feature).

**Rationale:**
- Not in Figma assets
- Adds complexity to maintenance
- Can be re-enabled later if needed
- Reduces attack surface

#### Week 4: Subscription & Payment Enhancements

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Implement subscription proration logic | 2 days | P0 | None | Upgrade: immediate, prorate remaining balance |
| Implement refund/chargeback handling | 2 days | P0 | None | Stripe refunds, RevenueCat refunds |
| Implement webhook retry logic | 0.5 days | P1 | None | Retry failed webhooks with exponential backoff |
| Implement subscription upgrade flow | 1 day | P0 | Proration logic | Stripe Checkout Session update |
| Implement subscription downgrade flow | 1 day | P0 | Proration logic | Effective next billing cycle |
| Add Figma-missing features to backend | 1 day | P1 | Figma mapping | Support mode, notification preferences, etc. |

### 5.3 Subscription Proration Logic

**Upgrade Flow:**
```typescript
// Example: User upgrades from Group Plan ($29.99) to Business Level 1 ($49.99)
// Mid-billing cycle (15 days into 30-day month)

const currentPlanPrice = 29.99;
const newPlanPrice = 49.99;
const daysRemaining = 15;
const totalDays = 30;

// Calculate unused value of current plan
const unusedValue = currentPlanPrice * (daysRemaining / totalDays);  // $14.995

// Calculate cost of new plan for remaining days
const newPlanCost = newPlanPrice * (daysRemaining / totalDays);  // $24.995

// Prorated amount to charge
const proratedCharge = newPlanCost - unusedValue;  // $10.00

// Steps:
// 1. Create Stripe Invoice for prorated amount ($10.00)
// 2. Update UserSubscription to new plan (immediate effect)
// 3. Update renewal date (keep same renewal date)
// 4. Send notification to user
```

**Downgrade Flow:**
```typescript
// Example: User downgrades from Business Level 1 ($49.99) to Group Plan ($29.99)
// Mid-billing cycle (15 days into 30-day month)

// No proration — downgrade effective next billing cycle
// User keeps current plan until renewal date
// Steps:
// 1. Set subscription.status = 'downgrade_pending'
// 2. Set subscription.nextPlanId = 'group_plan_id'
// 3. On renewal date → Switch to new plan
// 4. Send notification confirming downgrade
```

### 5.4 Refund/Chargeback Handling

**Stripe Refund:**
```typescript
// Admin initiates refund
POST /payments/:id/refund
Body: { amount: 29.99, reason: 'duplicate_charge' | 'fraudulent' | 'requested_by_customer' }

// Steps:
// 1. Create Stripe refund
// 2. Update PaymentTransaction status = 'refunded'
// 3. If full refund → Cancel subscription
// 4. Send notification to user
```

**Stripe Chargeback:**
```typescript
// Webhook: charge.dispute.created
// Steps:
// 1. Log dispute in PaymentTransaction
// 2. Notify admin (email + in-app)
// 3. Suspend subscription (pending dispute resolution)
// 4. If dispute won → Reinstate subscription
// 5. If dispute lost → Cancel subscription, log loss
```

### 5.5 Figma-to-Backend Mapping Verification

**Verification Process:**
1. Open each Figma screen
2. List all data displayed on screen
3. Verify each data point has corresponding API field
4. If missing → Add field to API response
5. Test with Postman/Insomnia

**Example Verification:**

| Figma Screen | Data Displayed | API Field | Status |
|--------------|----------------|-----------|--------|
| Parent Dashboard — Member Card | Avatar, name, task completion %, active tasks count | `avatar`, `name`, `taskCompletion.percentage`, `activeTasks` | ✅ Exists |
| Parent Dashboard — Activity Feed | Recent completions, task title, member name, timestamp | `type`, `taskTitle`, `userName`, `timestamp` | ✅ Exists |
| Child Home — Task List | Title, description, due date, status, subtask progress | `title`, `description`, `dueDate`, `status`, `subtaskProgress` | ✅ Exists |
| Child Profile — Support Mode | Calm/Encouraging/Logical selector | `profile.supportMode` | ✅ Exists (needs UI alignment) |
| Child Profile — Permissions | canCreateTask, canAssignTask, canViewOtherTasks | `permissions.canCreateTask`, etc. | ✅ Exists (needs UI alignment) |

### 5.6 Acceptance Criteria

| Criteria | Verification Method | Status |
|----------|---------------------|--------|
| 100% Figma screens have matching APIs | Figma-to-backend mapping document | ⏸️ Pending |
| Subscription proration implemented | Manual testing (upgrade mid-cycle) | ⏸️ Pending |
| Refund/chargeback handling implemented | Stripe test mode, webhook simulation | ⏸️ Pending |
| Chat module decision made & executed | Code review (archived or aligned) | ⏸️ Pending |
| Support mode API functional | Postman test collection | ⏸️ Pending |
| Notification preferences API functional | Postman test collection | ⏸️ Pending |

---

## 6. Phase 3: Scalability & Performance (Weeks 5-6)

### 6.1 Objectives

Ensure system meets scale targets (100K concurrent users, 10M tasks, <200ms reads):
- Configure APM (Application Performance Monitoring)
- Implement BullMQ for heavy operations (analytics, bulk updates)
- Add Redis sorted sets for counts (replace DB COUNT queries)
- Implement distributed locks for cron jobs
- Add connection pool monitoring
- Implement ETags for cacheable responses
- Run load tests

### 6.2 Tasks Breakdown

#### Week 5: Monitoring & Async Processing

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Configure APM (Datadog/New Relic) | 1 day | P0 | None | Track response times, error rates, throughput |
| Implement BullMQ for analytics queries | 2 days | P0 | APM configured | Queries >10K records → async job |
| Implement BullMQ for bulk task updates | 1 day | P0 | APM configured | Updates >100 tasks → async job |
| Add Redis sorted sets for counts | 2 days | P1 | None | User counts, task counts, activity counts |
| Add connection pool monitoring | 1 day | P1 | APM configured | Track MongoDB/Redis active connections |
| Implement ETags for cacheable GET responses | 1 day | P2 | None | Reduces server load, improves client caching |

#### Week 6: Load Testing & Performance Tuning

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Write load test scripts | 1 day | P0 | APM configured | k6 or Artillery framework |
| Run load test (10K concurrent users) | 0.5 days | P0 | Load test scripts | Baseline measurement |
| Run load test (50K concurrent users) | 0.5 days | P0 | 10K test passed | Mid-scale measurement |
| Run load test (100K concurrent users) | 0.5 days | P0 | 50K test passed | Target scale measurement |
| Analyze bottlenecks | 1 day | P0 | Load tests complete | APM dashboards, DB profiling |
| Optimize slow queries | 1 day | P0 | Bottleneck analysis | Add indexes, rewrite queries |
| Retest after optimization | 0.5 days | P0 | Optimizations applied | Verify improvements |

### 6.3 APM Configuration

**Recommended:** Datadog (commercial) or Prometheus + Grafana (open-source)

**Datadog Setup:**
```typescript
// Install dd-trace
npm install dd-trace

// Initialize in serverV2.ts
const tracer = require('dd-trace').init({
  service: 'askfemi-backend',
  env: process.env.NODE_ENV || 'development',
  version: '1.0.0',
  logInjection: true,  // Correlate logs with traces
  profiling: true      // CPU/memory profiling
});
```

**Metrics to Track:**
| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Request rate per endpoint | >10K req/min | Scale horizontally |
| Response time (p95) | >500ms (reads), >1000ms (writes) | Investigate bottleneck |
| Error rate | >5% | Investigate errors |
| Cache hit rate | <70% | Review cache strategy |
| Queue depth (critical-queue) | >1000 jobs | Scale workers |
| Job failure rate | >5% | Review job logic |
| MongoDB active connections | >40 (of 50 max) | Increase pool size or optimize queries |
| Redis active connections | >100 | Review connection reuse |

### 6.4 BullMQ for Heavy Operations

**Operations to Queue:**

| Operation | Current State | Target State | Queue | SLA |
|-----------|---------------|--------------|-------|-----|
| Analytics queries (>10K records) | Synchronous | 202 Accepted → BullMQ | `standard-queue` | <30 seconds |
| Bulk task updates (>100 tasks) | Synchronous | 202 Accepted → BullMQ | `standard-queue` | <60 seconds |
| User export (CSV) | Not implemented | 202 Accepted → BullMQ | `low-queue` | <30 seconds |
| Report generation | Not implemented | 202 Accepted → BullMQ | `low-queue` | <60 seconds |
| Batch notification sending | BullMQ (partial) | All notifications via BullMQ | `critical-queue` | <10 seconds |
| Preferred time calculation | BullMQ (partial) | Complete implementation | `low-queue` | <5 seconds |

**Job Response Pattern:**
```typescript
// Endpoint
POST /analytics/tasks/export
Auth: admin only
Response: {
  code: 202,
  message: 'Export job queued',
  data: {
    jobId: 'abc123',
    status: 'queued',
    estimatedCompletionTime: '30 seconds'
  }
}

// Job completion notification
{
  type: 'job_completed',
  jobId: 'abc123',
  result: {
    downloadUrl: 'https://...',
    expiresAt: '2026-04-09T10:00:00Z'
  }
}
```

### 6.5 Load Testing Strategy

**Tool:** k6 (open-source, scriptable, supports 100K+ VUs)

**Test Scenarios:**

| Scenario | Concurrent Users | Duration | Target |
|----------|------------------|----------|--------|
| Smoke test | 100 | 5 min | Verify system works |
| Load test | 10,000 | 15 min | Baseline performance |
| Load test | 50,000 | 15 min | Mid-scale performance |
| Load test | 100,000 | 15 min | Target scale performance |
| Stress test | 150,000 | 10 min | Breaking point |
| Endurance test | 50,000 | 2 hours | Memory leaks, stability |

**k6 Script Example:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10000 },   // Ramp up to 10K users
    { duration: '10m', target: 10000 },  // Stay at 10K users
    { duration: '2m', target: 50000 },   // Ramp up to 50K users
    { duration: '10m', target: 50000 },  // Stay at 50K users
    { duration: '2m', target: 0 },       // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests < 200ms
    http_req_failed: ['rate<0.05'],    // Error rate < 5%
  },
};

export default function () {
  // Login
  const loginRes = http.post('http://localhost:3000/api/v1/auth/login', {
    email: 'user@example.com',
    password: 'password123',
  });
  check(loginRes, { 'login successful': (r) => r.status === 200 });
  const token = loginRes.json('data.accessToken');

  // Get tasks (authenticated)
  const tasksRes = http.get('http://localhost:3000/api/v1/tasks/paginate?page=1&limit=20', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(tasksRes, { 'tasks retrieved': (r) => r.status === 200 });

  sleep(1);  // Wait 1 second between iterations
}
```

**Success Criteria:**
- 95% of requests < 200ms (reads), < 500ms (writes)
- Error rate < 5%
- No memory leaks (memory stable over 2-hour endurance test)
- No database connection pool exhaustion
- No queue overflow

### 6.6 Acceptance Criteria

| Criteria | Verification Method | Status |
|----------|---------------------|--------|
| APM configured and tracking metrics | Datadog/Grafana dashboard visible | ⏸️ Pending |
| Heavy operations use BullMQ | Code review, queue monitoring | ⏸️ Pending |
| Redis sorted sets replace DB COUNT queries | Code review, Redis monitoring | ⏸️ Pending |
| Distributed locks for cron jobs | Code review, Redis key inspection | ⏸️ Pending |
| Load test (100K users) passes all thresholds | k6 test report | ⏸️ Pending |
| Response times meet targets (<200ms reads, <500ms writes) | APM dashboard, load test report | ⏸️ Pending |

---

## 7. Phase 4: Security & Compliance (Weeks 7-8)

### 7.1 Objectives

Harden security posture and ensure compliance:
- Add rate limiting headers to all responses
- Implement field-level encryption for PII
- Complete COPPA compliance (children's privacy)
- Implement API key security for service-to-service calls
- Conduct security audit (penetration testing)
- Add webhook signature verification

### 7.2 Tasks Breakdown

#### Week 7: Security Hardening

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Add rate limiting headers | 0.5 days | P1 | Phase 1 cache work | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` |
| Implement field-level encryption for PII | 2 days | P0 | None | Encrypt phone, email at rest |
| Implement API key security for service-to-service calls | 1 day | P0 | None | Generate, store (hashed), validate API keys |
| Add webhook signature verification | 0.5 days | P1 | None | Verify Stripe/RevenueCat webhook signatures |
| Implement brute force protection improvements | 1 day | P1 | Phase 1 rate limiting | 5 failed attempts → 15 min lockout (Redis) |
| Security headers audit | 0.5 days | P1 | None | Helmet.js configuration review |

#### Week 8: Compliance & Audit

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| COPPA compliance audit | 2 days | P0 | None | Parental consent flow, data retention policies |
| GDPR compliance review | 1 day | P0 | None | Right to access, rectification, erasure |
| CCPA compliance review | 1 day | P0 | None | Data export, opt-out of sale |
| Penetration testing | 2 days | P0 | All security hardening complete | External or internal security audit |
| Fix critical vulnerabilities | 1 day | P0 | Penetration test results | Address findings |

### 7.3 Field-Level Encryption for PII

**Fields to Encrypt:**
- `User.phone`
- `User.email` (optional — depends on compliance requirements)
- `UserProfile.address`

**Encryption Strategy:**
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;  // 32-byte key
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Mongoose middleware
userSchema.pre('save', function (next) {
  if (this.isModified('phone')) {
    this.phone = encrypt(this.phone);
  }
  next();
});

userSchema.methods.getPhone = function (): string {
  return decrypt(this.phone);
};
```

**Key Management:**
- Encryption key stored in environment variable (not code)
- Key rotation: Generate new key, re-encrypt all data on rotation
- Backup key securely (AWS KMS, HashiCorp Vault)

### 7.4 COPPA Compliance

**Requirements (Children's Online Privacy Protection Act):**

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Parental consent before collecting child's data | Parent creates account, invites children → Implicit consent | ⚠️ Needs explicit consent flow |
| Clear privacy policy | `/settings` endpoint stores privacy policy | ✅ Implemented |
| Right to delete child's data | Soft delete on User model | ✅ Implemented |
| No conditioning participation on data collection | Only collect necessary data (email, name) | ⏸️ Needs review |
| Data retention limits | TTL indexes on OTP, Token, old notifications | ✅ Implemented |

**Recommended Enhancements:**
1. Add explicit parental consent checkbox during child account creation
2. Log parental consent (timestamp, IP, user agent)
3. Provide parent with data export for their children
4. Add age gate (verify child is under 13 before applying COPPA rules)

### 7.5 Rate Limiting Headers

**Implementation:**
```typescript
// Middleware: addRateLimitHeaders.ts
function addRateLimitHeaders(req, res, rateLimitResult) {
  res.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  res.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  res.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
  
  if (rateLimitResult.remaining === 0) {
    res.set('Retry-After', (rateLimitResult.resetTime - Date.now()) / 1000);
  }
}

// Apply in rateLimiter middleware
const rateLimitResult = await rateLimiter.consume(userId);
addRateLimitHeaders(req, res, rateLimitResult);
```

### 7.6 Penetration Testing Checklist

**Tools:**
- OWASP ZAP (open-source)
- Burp Suite (commercial)
- Manual testing

**Test Areas:**
| Area | Test | Expected Result |
|------|------|-----------------|
| Authentication | Brute force login (100 attempts) | Locked out after 5 attempts |
| Authentication | JWT token tampering | Rejected (signature verification) |
| Authorization | Access admin endpoint as child | 403 Forbidden |
| Authorization | Access another user's tasks | 403 Forbidden |
| Input Validation | NoSQL injection in filters | Rejected (Zod validation) |
| Input Validation | XSS in task title/description | Sanitized (Helmet.js) |
| Rate Limiting | Exceed rate limit (200 req/min) | 429 Too Many Requests |
| File Upload | Upload malicious file (virus) | Rejected (size/type validation) |
| Session Management | Reuse expired refresh token | Rejected (token rotation) |
| Webhook | Send fake Stripe webhook | Rejected (signature verification) |

### 7.7 Acceptance Criteria

| Criteria | Verification Method | Status |
|----------|---------------------|--------|
| Rate limiting headers on all responses | HTTP response inspection | ⏸️ Pending |
| PII encrypted at rest | Database inspection (phone, email unreadable) | ⏸️ Pending |
| API key security implemented | Code review, service-to-service call test | ⏸️ Pending |
| Webhook signature verified | Fake webhook test (should reject) | ⏸️ Pending |
| COPPA compliance audit passed | Audit checklist complete | ⏸️ Pending |
| Penetration test passed (no critical vulnerabilities) | Pen test report | ⏸️ Pending |

---

## 8. Phase 5: Testing & Quality Assurance (Weeks 9-10)

### 8.1 Objectives

Achieve >80% test coverage across unit, integration, and E2E tests:
- Write unit tests for all services
- Write integration tests for all API endpoints
- Write E2E tests for critical user journeys
- Run load tests (from Phase 3)
- Fix all bugs found during testing

### 8.2 Tasks Breakdown

#### Week 9: Unit & Integration Tests

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Write unit tests for Auth service | 1 day | P0 | None | Register, login, OAuth, password reset |
| Write unit tests for Task service | 1 day | P0 | None | CRUD, status updates, collaborative tasks |
| Write unit tests for Notification service | 1 day | P0 | None | Create, send, queue jobs |
| Write unit tests for Subscription service | 1 day | P0 | None | Create, update, proration logic |
| Write unit tests for Payment service | 1 day | P0 | None | Create, refund, webhook handling |
| Write integration tests for Auth endpoints | 1 day | P0 | Auth unit tests | Full request/response cycle |
| Write integration tests for Task endpoints | 1 day | P0 | Task unit tests | Full request/response cycle |
| Write integration tests for User endpoints | 1 day | P0 | User unit tests | Full request/response cycle |

#### Week 10: E2E Tests & Load Testing

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Write E2E test: Admin user journey | 1 day | P0 | Integration tests complete | Login → Dashboard → User list → User details |
| Write E2E test: Parent user journey | 1 day | P0 | Integration tests complete | Login → Dashboard → Create task → Monitor |
| Write E2E test: Child user journey (with permission) | 1 day | P0 | Integration tests complete | Login → Home → Create task → Complete → Profile |
| Write E2E test: Child user journey (without permission) | 1 day | P0 | Integration tests complete | Login → Home → View tasks → Complete → Profile |
| Write E2E test: Subscription flow | 1 day | P0 | Integration tests complete | Select plan → Pay → Webhook → Subscription active |
| Run load tests (from Phase 3) | 0.5 days | P0 | All E2E tests pass | 10K, 50K, 100K concurrent users |
| Fix bugs found during testing | 1 day | P0 | Load tests complete | Prioritize critical bugs |
| Final test coverage report | 0.5 days | P1 | All tests pass | Coverage >80% |

### 8.3 Testing Framework

**Tool:** Vitest (already configured in project)

**Test Structure:**
```
src/modules/task.module/
├── task.service.ts
├── task.controller.ts
├── task.model.ts
└── __tests__/
    ├── unit/
    │   ├── task.service.test.ts
    │   └── task.controller.test.ts
    └── integration/
        └── task.endpoints.test.ts
```

**Test Database:**
- Use MongoDB Memory Server for unit tests
- Use test MongoDB instance for integration tests
- Clean database before each test suite

**Test Mocking:**
- Mock Redis (ioredis-mock)
- Mock BullMQ (bullmq-mock)
- Mock Stripe (stripe-mock)
- Mock FCM (firebase-admin-mock)

### 8.4 Test Coverage Targets

| Module | Target Coverage | Current Coverage | Gap |
|--------|-----------------|------------------|-----|
| Auth | >90% | Unknown | ⏸️ To Measure |
| User | >85% | Unknown | ⏸️ To Measure |
| Task | >90% | Unknown | ⏸️ To Measure |
| Task Progress | >85% | Unknown | ⏸️ To Measure |
| Notification | >85% | Unknown | ⏸️ To Measure |
| Children/Business User | >80% | Unknown | ⏸️ To Measure |
| Analytics | >75% | Unknown | ⏸️ To Measure |
| Payment | >85% | Unknown | ⏸️ To Measure |
| Subscription | >85% | Unknown | ⏸️ To Measure |
| Settings | >80% | Unknown | ⏸️ To Measure |
| Attachments | >80% | Unknown | ⏸️ To Measure |
| **Overall** | **>80%** | **Unknown** | **⏸️ To Measure** |

### 8.5 E2E Test Scenarios

**Admin User Journey:**
```
1. Login as admin
2. View dashboard analytics → Verify data matches seed data
3. Navigate to user list → Verify pagination, search, filter
4. Click user → View user details → Verify all sections populated
5. Navigate to subscription plans → Create new plan → Verify plan appears in list
6. Update plan → Verify changes reflected
7. Deactivate plan → Verify blocked for new signups
8. Update settings → Verify public endpoint returns updated content
```

**Parent User Journey:**
```
1. Login as parent
2. View dashboard → Verify member cards, task summary, activity feed
3. Create task (Single Assignment) → Verify task created, notification sent
4. Create task (Collaborative) → Verify task created, TaskProgress records created
5. Navigate to task monitoring → Filter by status → Verify filtered list
6. View activity charts → Verify data matches task completions
7. Navigate to team members → Add member → Verify invitation sent
8. Update member permissions → Verify permissions updated, cache invalidated
9. Navigate to subscription → View plan → Verify details correct
10. Upgrade plan → Verify proration charged, plan updated immediately
```

**Child User Journey (With Permission):**
```
1. Login as child (secondary user)
2. View home → Verify task list, daily progress, support mode
3. Create task (Personal) → Verify task created, visible to parent
4. Create task (Single Assignment) → Verify task created, assigned user notified
5. Create task (Collaborative) → Verify task created, TaskProgress records created
6. Navigate to status → Filter by pending → Verify filtered list
7. Complete subtask → Verify subtask progress updated, parent notified
8. Complete task → Verify task status updated, parent notified
9. Navigate to profile → Update support mode → Verify updated
10. View permissions → Verify correct permissions displayed
```

**Child User Journey (Without Permission):**
```
1. Login as child (regular user)
2. View home → Verify task list, daily progress
3. Attempt to create task for others → Verify blocked (403 Forbidden)
4. Create task (Personal) → Verify task created
5. Navigate to status → Filter by completed → Verify filtered list
6. Complete subtask → Verify progress updated
7. Navigate to profile → Update notification style → Verify updated
8. View permissions → Verify "no permission" state displayed
```

### 8.6 Acceptance Criteria

| Criteria | Verification Method | Status |
|----------|---------------------|--------|
| Unit test coverage >80% | Vitest coverage report | ⏸️ Pending |
| Integration tests pass for all endpoints | Vitest test suite | ⏸️ Pending |
| E2E tests pass for all user journeys | Vitest E2E test suite | ⏸️ Pending |
| Load tests pass (100K users, all thresholds met) | k6 test report | ⏸️ Pending |
| No critical bugs open | Bug tracker (all P0 bugs resolved) | ⏸️ Pending |
| No memory leaks detected | Endurance test (2 hours, stable memory) | ⏸️ Pending |

---

## 9. Phase 6: Documentation & Developer Experience (Weeks 11-12)

### 9.1 Objectives

Ensure complete documentation for current and future developers:
- Complete `/doc` folder for all modules
- Generate performance reports for all modules
- Create API reference (Postman collection)
- Create developer onboarding guide
- Generate Mermaid diagrams for all modules
- Externalize remaining i18n strings

### 9.2 Tasks Breakdown

#### Week 11: Module Documentation

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Create `/doc` folder for all modules | 0.5 days | P1 | None | README.md, diagrams, perf report |
| Generate Mermaid diagrams for Auth module | 0.5 days | P1 | None | Schema, system flow, swimlane, sequence |
| Generate Mermaid diagrams for Task module | 0.5 days | P1 | None | Schema, system flow, swimlane, sequence |
| Generate Mermaid diagrams for Notification module | 0.5 days | P1 | None | Schema, system flow, swimlane, sequence |
| Generate Mermaid diagrams for Subscription module | 0.5 days | P1 | None | Schema, system flow, swimlane, sequence |
| Generate Mermaid diagrams for Payment module | 0.5 days | P1 | None | Schema, system flow, swimlane, sequence |
| Write performance report for each module | 2 days | P1 | None | Time complexity, cache strategy, index strategy |
| Create Postman collection (all endpoints) | 1 day | P1 | Phase 5 tests pass | Organized by role → feature → endpoint |

#### Week 12: Developer Experience & i18n

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Write developer onboarding guide | 1 day | P1 | Module docs complete | Setup, architecture, coding standards |
| Create API reference document | 1 day | P1 | Postman collection complete | All endpoints, request/response examples |
| Generate database schema diagram | 0.5 days | P1 | All model files finalized | ERD (Entity Relationship Diagram) |
| Externalize remaining i18n strings | 1 day | P2 | None | Move hardcoded strings to locale files |
| Write runbook for common issues | 1 day | P1 | Phase 7 deployment plan | Queue overflow, DB connection loss, etc. |
| Create troubleshooting guide | 0.5 days | P1 | Runbook complete | Common errors, resolution steps |
| Write architecture decision records (ADRs) | 1 day | P2 | None | Document key architectural decisions |

### 9.3 Module Documentation Structure

**Required Files in `/doc` folder:**

```
src/modules/task.module/doc/
├── README.md                          # Module overview, responsibilities, API examples
├── dia/
│   ├── task-schema.mermaid            # Database schema diagram
│   ├── task-system-flow.mermaid       # System flow diagram
│   ├── task-swimlane.mermaid          # Swimlane diagram (roles vs actions)
│   ├── task-user-flow.mermaid         # User journey flow
│   ├── task-system-architecture.mermaid  # System architecture
│   ├── task-state-machine.mermaid     # Task status state machine
│   ├── task-sequence.mermaid          # Sequence diagram (API calls)
│   └── task-component-architecture.mermaid  # Component breakdown
├── perf/
│   └── task-performance-report.md     # Time/space complexity, cache strategy, index strategy
└── docs/
    └── (any additional documentation)
```

**README.md Template:**
```markdown
# Task Module

## Purpose
Manage tasks (personal, single assignment, collaborative) with subtask tracking and per-user progress.

## Responsibilities
- Task CRUD operations
- Subtask management
- Collaborative task progress (per-user tracking)
- Task status updates
- Task filtering and pagination

## Models
- Task
- SubTask
- SubTaskProgress

## API Endpoints
### POST /tasks
Create task (personal, single assignment, collaborative)

Request:
{
  "title": "Complete homework",
  "taskType": "collaborative",
  "assignedUserIds": ["child1", "child2"],
  "dueDate": "2026-04-10T23:59:59Z",
  "subtasks": [...]
}

Response: 201 Created
{
  "code": 201,
  "message": "Task created successfully",
  "data": { "attributes": { /* task object */ } },
  "success": true
}

## System Flow
[Link to task-system-flow.mermaid]

## Performance
[Link to task-performance-report.md]

## Cache Strategy
- `task:{taskId}:detail` — TTL: 5 min
- `user:{userId}:tasks:list` — TTL: 2 min
- Invalidate on: create, update, delete, status change

## Index Strategy
- `{ ownerUserId: 1, status: 1, isDeleted: 1 }`
- `{ assignedUserIds: 1, isDeleted: 1 }`
- `{ dueDate: 1, status: 1 }`
- `{ createdById: 1, isDeleted: 1 }`
- Text index: `{ title: 'text', description: 'text' }`
```

### 9.4 Performance Report Template

**Location:** `doc/perf/<module>-performance-report.md`

**Template:**
```markdown
# Task Module — Performance Report

## Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Create Task | O(1) | Single document insert + subtask inserts |
| Get Task (by ID) | O(1) | Indexed lookup |
| List Tasks (paginated) | O(log N) | Index scan + limit |
| Update Task | O(1) | Single document update + cache invalidation |
| Delete Task | O(1) | Soft delete (update isDeleted flag) |
| Get Task Stats | O(N) | Aggregation pipeline (cached) |

## Space Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Create Task | O(M) | M = number of subtasks |
| List Tasks | O(P) | P = page size (default 20) |
| Cache (per task) | O(1) | Fixed-size JSON object |
| Cache (per user list) | O(P) | P = page size |

## Memory Efficiency
- `.lean()` used on all read-only queries (2-3x memory reduction)
- Projection used to return only needed fields
- No unbounded arrays in documents

## Redis Cache Strategy
| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `task:{taskId}:detail` | 5 min | Update, delete, status change |
| `user:{userId}:tasks:list` | 2 min | Create, update, delete any task for user |

## MongoDB Index Strategy
[All indexes listed above]

## Horizontal Scaling Considerations
- Stateless: No in-memory state, safe to run on multiple instances
- Cache: Redis cache shared across instances (consistent key naming)
- Queue: BullMQ workers distributed across instances (concurrency: 10 per worker)
- Socket.IO: Redis adapter for cross-instance messaging
```

### 9.5 Postman Collection Structure

```
askfemi API
├── Admin
│   ├── Analytics
│   │   └── GET /analytics/admin/overview
│   ├── Users
│   │   ├── GET /users/paginate
│   │   ├── GET /users/:id/details
│   │   └── PUT /users/:id
│   ├── Subscription Plans
│   │   ├── POST /subscription-plans
│   │   ├── GET /subscription-plans/paginate
│   │   ├── PUT /subscription-plans/:id
│   │   └── PUT /subscription-plans/:id/status
│   └── Settings
│       ├── GET /settings
│       └── PUT /settings
├── Teacher/Parent
│   ├── Dashboard
│   │   └── GET /analytics/group/dashboard
│   ├── Tasks
│   │   ├── POST /tasks
│   │   ├── GET /tasks/paginate
│   │   ├── GET /tasks/:id
│   │   ├── PUT /tasks/:id
│   │   └── PUT /tasks/:id/status
│   ├── Task Monitoring
│   │   └── GET /analytics/tasks/monitoring
│   ├── Team Members
│   │   ├── POST /children-business-users
│   │   ├── GET /children-business-users/parent/:id
│   │   ├── PUT /children-business-users/:id
│   │   ├── PUT /children-business-users/:id/permissions
│   │   └── DELETE /children-business-users/:id
│   └── Subscription
│       └── GET /user-subscriptions/me
├── App User (Child)
│   ├── Tasks
│   │   ├── POST /tasks
│   │   ├── GET /tasks/paginate
│   │   ├── GET /tasks/:id
│   │   ├── PUT /tasks/:id/status
│   │   └── PUT /subtasks/:id/progress
│   ├── Profile
│   │   ├── GET /users/me/profile
│   │   └── PUT /users/me/profile
│   ├── Permissions
│   │   └── GET /children-business-users/me/permissions
│   └── Notifications
│       ├── GET /notifications/paginate
│       └── PUT /notifications/:id/read
└── Public / Guest
    ├── Auth
    │   ├── POST /auth/register
    │   ├── POST /auth/login
    │   ├── POST /auth/refresh-token
    │   ├── POST /auth/forgot-password
    │   ├── POST /auth/verify-otp
    │   ├── POST /auth/reset-password
    │   ├── POST /auth/google
    │   └── POST /auth/apple
    └── Health
        └── GET /health
```

### 9.6 Acceptance Criteria

| Criteria | Verification Method | Status |
|----------|---------------------|--------|
| All modules have `/doc` folder with README.md | File system check | ⏸️ Pending |
| All modules have Mermaid diagrams | File system check | ⏸️ Pending |
| All modules have performance report | File system check | ⏸️ Pending |
| Postman collection covers all endpoints | Postman import + test | ⏸️ Pending |
| Developer onboarding guide complete | Document review | ⏸️ Pending |
| i18n coverage complete (no hardcoded strings) | Code review (grep for hardcoded strings) | ⏸️ Pending |

---

## 10. Phase 7: Deployment & Rollout (Weeks 13-14)

### 10.1 Objectives

Deploy to production with zero downtime:
- Configure production environment
- Deploy to staging → Test → Deploy to production
- Set up monitoring dashboards
- Create runbooks for common issues
- Implement rollback plan
- Announce launch

### 10.2 Tasks Breakdown

#### Week 13: Staging Deployment & Testing

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Configure production environment variables | 0.5 days | P0 | None | MongoDB Atlas, Redis, Stripe, FCM, etc. |
| Deploy to staging | 0.5 days | P0 | Env config complete | Docker Compose or Kubernetes |
| Run smoke tests on staging | 0.5 days | P0 | Staging deployed | Verify all critical endpoints |
| Run integration tests on staging | 0.5 days | P0 | Smoke tests pass | Full test suite |
| Run load tests on staging | 1 day | P0 | Integration tests pass | 10K, 50K concurrent users |
| Fix staging issues | 1 day | P0 | Load tests complete | Address any environment-specific bugs |
| Create production deployment plan | 0.5 days | P1 | Staging stable | Step-by-step deployment checklist |
| Create rollback plan | 0.5 days | P1 | Deployment plan complete | Steps to rollback if issues |

#### Week 14: Production Deployment & Monitoring

| Task | Effort | Priority | Dependencies | Notes |
|------|--------|----------|--------------|-------|
| Deploy to production | 1 day | P0 | Staging stable, deployment plan ready | Blue-green or canary deployment |
| Verify production health | 0.5 days | P0 | Production deployed | Smoke tests, monitoring dashboards |
| Set up monitoring dashboards | 0.5 days | P0 | Production deployed | APM, error tracking, queue monitoring |
| Set up alerting | 0.5 days | P0 | Monitoring dashboards ready | Email/Slack alerts for critical issues |
| Create runbooks | 1 day | P1 | Production stable | Queue overflow, DB connection loss, high error rate |
| Announce launch | 0.5 days | P1 | Production stable, monitoring active | Internal team, stakeholders |
| Monitor for 48 hours | 2 days | P0 | Production deployed | On-call rotation, rapid response |

### 10.3 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
│                  (AWS ALB / Nginx)                      │
└────────┬───────────────────┬───────────────────┬────────┘
         │                   │                   │
┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐
│   Instance 1    │ │   Instance 2   │ │   Instance 3   │
│  (Express.js)   │ │  (Express.js)  │ │  (Express.js)  │
└────────┬────────┘ └───────┬────────┘ └───────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐
│  MongoDB Atlas  │ │  Redis Cluster │ │  BullMQ Workers │
│  (Primary +     │ │  (Cache +      │ │  (Distributed   │
│   Replica)       │ │   Sessions)    │ │   across all)   │
└─────────────────┘ └────────────────┘ └────────────────┘
```

**Deployment Method:** Blue-Green Deployment

**Steps:**
1. Deploy new version to "green" environment (parallel to "blue")
2. Run smoke tests on "green"
3. Switch load balancer to "green"
4. Monitor "green" for 30 minutes
5. If stable → Decommission "blue"
6. If issues → Switch back to "blue" (rollback)

### 10.4 Production Environment Configuration

**Environment Variables:**
```bash
NODE_ENV=production
PORT=3000

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/askfemi

# Redis
REDIS_URI=redis://redis-cluster:6379

# JWT
JWT_ACCESS_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>
JWT_ACCESS_EXPIRES_IN=5d
JWT_REFRESH_EXPIRES_IN=365d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# RevenueCat
REVENUECAT_API_KEY=...
REVENUECAT_WEBHOOK_SECRET=...

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email (Nodemailer)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>

# Encryption
ENCRYPTION_KEY=<random-32-byte-string>

# Client URLs (CORS whitelist)
CLIENT_URLS=https://admin.askfemi.com,https://parent.askfemi.com

# Monitoring
DATADOG_API_KEY=...
SENTRY_DSN=...
```

### 10.5 Monitoring Dashboards

**Datadog Dashboard:**
| Widget | Metric | Alert Threshold |
|--------|--------|-----------------|
| Request Rate | `http.request.rate` | >10K req/min |
| Response Time (p95) | `http.request.duration` | >500ms (reads), >1000ms (writes) |
| Error Rate | `http.error.rate` | >5% |
| Cache Hit Rate | `redis.cache.hit_rate` | <70% |
| Queue Depth | `bullmq.queue.depth` | >1000 jobs (critical-queue) |
| Job Failure Rate | `bullmq.job.failure_rate` | >5% |
| MongoDB Connections | `mongodb.connections.active` | >40 (of 50 max) |
| Redis Connections | `redis.connections.active` | >100 |
| Memory Usage | `process.memory.rss` | >80% of available |
| CPU Usage | `process.cpu.percent` | >80% |

### 10.6 Runbook: Common Issues

**Issue 1: Queue Overflow (Critical Queue > 1000 Jobs)**

```
Symptoms: Notifications delayed, users not receiving task assignments
Cause: Workers not processing fast enough, or workers crashed

Resolution:
1. Check worker logs: `docker logs bullmq-workers`
2. If workers crashed → Restart workers: `docker-compose restart bullmq-workers`
3. If workers healthy but overloaded → Scale workers: `docker-compose scale bullmq-workers=5`
4. Monitor queue depth: Datadog dashboard → BullMQ widget
5. If still overflowing → Check for stuck jobs: Redis CLI → `LRANGE bull:critical-queue 0 -1`
6. If stuck jobs found → Investigate job logs, manually retry or remove
```

**Issue 2: MongoDB Connection Pool Exhausted**

```
Symptoms: API requests timing out, "connection pool exhausted" errors
Cause: Too many concurrent queries, connection leak

Resolution:
1. Check active connections: MongoDB shell → `db.serverStatus().connections`
2. If connections near max (50) → Check for connection leak:
   - Review recent deployments (new code may not be closing connections)
   - Check for long-running queries blocking connections
3. Kill long-running queries: MongoDB shell → `db.currentOp().inprog.filter(op => op.secs_running > 30)`
4. If legitimate traffic increase → Increase pool size: `MONGODB_MAX_POOL_SIZE=100` (requires restart)
5. If connection leak → Rollback recent deployment, fix leak
```

**Issue 3: High Error Rate (>5%)**

```
Symptoms: Datadog alert "Error rate > 5%"
Cause: Code bug, downstream service failure, database issue

Resolution:
1. Check error logs: Datadog → Logs → Filter by `status:error`
2. Identify top error types (Zod validation, MongoDB timeout, etc.)
3. If Zod validation errors → Check recent API changes, fix validation schema
4. If MongoDB timeout errors → Check database health, slow queries
5. If Redis connection errors → Check Redis health, restart Redis client
6. If downstream service failure (Stripe, FCM) → Check service status, implement fallback
7. If code bug → Rollback deployment, fix bug, redeploy
```

### 10.7 Rollback Plan

**Trigger:** Any critical issue not resolved within 15 minutes of production deployment

**Steps:**
1. **Stop deployment** (if still in progress)
2. **Switch load balancer** to previous version (blue-green rollback)
3. **Verify health** of previous version (smoke tests)
4. **Notify team** of rollback (Slack/email)
5. **Investigate root cause** (logs, APM dashboards)
6. **Fix issue** in development environment
7. **Redeploy** after fix verified in staging

**Rollback Time:** < 5 minutes (blue-green deployment allows instant switch)

### 10.8 Acceptance Criteria

| Criteria | Verification Method | Status |
|----------|---------------------|--------|
| Production deployment successful | Health check endpoint returns "healthy" | ⏸️ Pending |
| All smoke tests pass on production | Manual test execution | ⏸️ Pending |
| Monitoring dashboards configured | Datadog/Grafana dashboards visible | ⏸️ Pending |
| Alerting configured | Test alert triggered and received | ⏸️ Pending |
| Runbooks created | Runbook document reviewed by team | ⏸️ Pending |
| Rollback plan tested | Mock rollback executed successfully | ⏸️ Pending |
| 48-hour monitoring period passed | No critical issues during monitoring | ⏸️ Pending |

---

## 11. Sprint Breakdown

### 11.1 Sprint Structure

```
Total: 14 Weeks = 7 Sprints (2 weeks each)

Sprint 1: Production Readiness (Phase 1, Week 1-2)
Sprint 2: Figma Alignment (Phase 2, Week 3-4)
Sprint 3: Scalability (Phase 3, Week 5-6)
Sprint 4: Security (Phase 4, Week 7-8)
Sprint 5: Testing (Phase 5, Week 9-10)
Sprint 6: Documentation (Phase 6, Week 11-12)
Sprint 7: Deployment (Phase 7, Week 13-14)
```

### 11.2 Sprint 1: Production Readiness (Weeks 1-2)

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1 | Remove legacy files, remove unused payment gateways | Clean codebase |
| Day 2-3 | Cache invalidation audit | Cache invalidation checklist complete |
| Day 4-5 | Fix cache key naming, add missing invalidation | All write operations invalidate cache |
| Day 6 | Add `.lean()` to all read-only queries | Memory usage reduced 2-3x |
| Day 7-8 | Add missing database indexes | All queries use indexes |
| Day 9 | Verify indexes with `.explain()` | No COLLSCAN in production queries |
| Day 10 | Sprint review, acceptance criteria check | Phase 1 complete ✅ |

### 11.3 Sprint 2: Figma Alignment (Weeks 3-4)

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1 | Decide Chat module fate, map all Figma screens to APIs | Decision document, Figma-to-backend mapping |
| Day 2-3 | Implement missing permission check endpoints, support mode API, notification preferences API | All Figma screens have matching APIs |
| Day 4-5 | Implement subscription proration logic | Upgrade/downgrade with proration |
| Day 6-7 | Implement refund/chargeback handling | Refund flow, chargeback handling |
| Day 8 | Implement webhook retry logic | Failed webhooks retried automatically |
| Day 9 | Sprint review, acceptance criteria check | Phase 2 complete ✅ |

### 11.4 Sprint 3: Scalability (Weeks 5-6)

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1-2 | Configure APM (Datadog/New Relic) | APM dashboards visible |
| Day 3-4 | Implement BullMQ for analytics queries, bulk task updates | Heavy operations async |
| Day 5-6 | Add Redis sorted sets for counts, connection pool monitoring | DB COUNT queries replaced |
| Day 7 | Implement ETags for cacheable responses | Client-side caching enabled |
| Day 8-9 | Write load test scripts, run load tests (10K, 50K, 100K) | Load test report |
| Day 10 | Sprint review, acceptance criteria check | Phase 3 complete ✅ |

### 11.5 Sprint 4: Security (Weeks 7-8)

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1 | Add rate limiting headers | Headers visible in HTTP responses |
| Day 2-3 | Implement field-level encryption for PII | Phone, email encrypted at rest |
| Day 4 | Implement API key security, webhook signature verification | Service-to-service auth secure |
| Day 5 | Brute force protection improvements | Account lockout after 5 failed attempts |
| Day 6-7 | COPPA compliance audit, GDPR review | Compliance checklist complete |
| Day 8-9 | Penetration testing | Pen test report |
| Day 10 | Sprint review, acceptance criteria check | Phase 4 complete ✅ |

### 11.6 Sprint 5: Testing (Weeks 9-10)

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1-2 | Write unit tests (Auth, Task, Notification, Subscription, Payment) | Unit test coverage >80% |
| Day 3-4 | Write integration tests (Auth, Task, User endpoints) | Integration tests pass |
| Day 5-7 | Write E2E tests (Admin, Parent, Child journeys) | E2E tests pass |
| Day 8-9 | Run load tests, fix bugs | Load tests pass, no critical bugs |
| Day 10 | Sprint review, acceptance criteria check | Phase 5 complete ✅ |

### 11.7 Sprint 6: Documentation (Weeks 11-12)

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1-2 | Create `/doc` folders, write READMEs for all modules | All modules documented |
| Day 3-4 | Generate Mermaid diagrams for all modules | Diagrams in `/doc/dia/` |
| Day 5-6 | Write performance reports for all modules | Performance reports in `/doc/perf/` |
| Day 7 | Create Postman collection | Postman collection exported |
| Day 8 | Write developer onboarding guide, API reference | Developer docs complete |
| Day 9 | Externalize i18n strings, write runbooks | i18n complete, runbooks ready |
| Day 10 | Sprint review, acceptance criteria check | Phase 6 complete ✅ |

### 11.8 Sprint 7: Deployment (Weeks 13-14)

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Day 1 | Configure production environment | Environment variables set |
| Day 2 | Deploy to staging, run smoke tests | Staging deployed, smoke tests pass |
| Day 3-4 | Run integration + load tests on staging | Staging tests pass |
| Day 5 | Fix staging issues, create deployment plan | Staging stable, deployment plan ready |
| Day 6 | Deploy to production (blue-green) | Production deployed |
| Day 7 | Verify production health, set up monitoring | Monitoring dashboards active |
| Day 8 | Set up alerting, create runbooks | Alerting configured, runbooks complete |
| Day 9-10 | Monitor for 48 hours, announce launch | Production stable, launch announced |

---

## 12. Testing Strategy

### 12.1 Testing Pyramid

```
                    ┌───────────┐
                    │    E2E    │    ← 10% of tests (critical journeys)
                   ┌┴───────────┴┐
                  │ Integration  │  ← 30% of tests (API endpoints)
                 ┌┴─────────────┴┐
                │     Unit       │ ← 60% of tests (services, utilities)
                └────────────────┘
```

### 12.2 Test Types

| Test Type | Scope | Tools | Coverage Target | Execution Time |
|-----------|-------|-------|-----------------|----------------|
| Unit | Individual functions/methods | Vitest, MongoDB Memory Server | >80% | <5 seconds per test |
| Integration | API endpoints (request → response) | Vitest, Supertest, test MongoDB | >75% | <10 seconds per test |
| E2E | Complete user journeys | Vitest, Playwright (if UI testing) | All critical journeys | <30 seconds per test |
| Load | Concurrent user simulation | k6, staging environment | Meets scale targets | 15 minutes per scenario |
| Security | Vulnerability scanning | OWASP ZAP, manual testing | No critical vulnerabilities | 2-3 hours |

### 12.3 Test Data Management

**Seed Data:**
```typescript
// test/seed-data.ts
export const seedData = {
  users: {
    admin: { email: 'admin@test.com', password: 'Admin123!', role: 'admin' },
    parent: { email: 'parent@test.com', password: 'Parent123!', role: 'business' },
    childWithPermission: { email: 'child1@test.com', password: 'Child123!', role: 'child', isSecondaryUser: true },
    childWithoutPermission: { email: 'child2@test.com', password: 'Child123!', role: 'child', isSecondaryUser: false },
    individual: { email: 'individual@test.com', password: 'Individual123!', role: 'individual' },
  },
  tasks: {
    personal: { title: 'Personal task', taskType: 'personal' },
    singleAssignment: { title: 'Single assignment', taskType: 'single_assignment' },
    collaborative: { title: 'Collaborative task', taskType: 'collaborative' },
  },
  subscriptionPlans: {
    individual: { name: 'Individual', type: 'individual', price: 10.99 },
    group: { name: 'Group Plan', type: 'business_starter', price: 29.99 },
  }
};
```

**Test Cleanup:**
```typescript
// Clean database before each test suite
beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await seedDatabase(seedData);
});
```

### 12.4 Continuous Integration

**CI/CD Pipeline (GitHub Actions):**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          REDIS_URI: redis://localhost:6379
      
      - name: Upload coverage
        run: npm run coverage:upload
      
      - name: Build
        run: npm run build
```

---

## 13. Deployment Strategy

### 13.1 Environment Hierarchy

```
Development → Staging → Production
     ↓            ↓          ↓
  Local machine   AWS/GCP    AWS/GCP
  (Docker Compose) (EKS/GKE) (EKS/GKE)
```

| Environment | Purpose | Data | Access |
|-------------|---------|------|--------|
| Development | Local development, feature testing | Seed data | Developers |
| Staging | Pre-production testing, load testing | Anonymized production data | Developers, QA team |
| Production | Live users | Real user data | Production ops team |

### 13.2 Deployment Checklist

**Pre-Deployment:**
- [ ] All tests pass (unit, integration, E2E, load)
- [ ] Code reviewed and approved
- [ ] Database migrations tested (if any)
- [ ] Environment variables configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

**Deployment:**
- [ ] Deploy to staging
- [ ] Run smoke tests on staging
- [ ] Run load tests on staging (if major changes)
- [ ] Verify staging health (monitoring dashboards)
- [ ] Deploy to production (blue-green)
- [ ] Run smoke tests on production
- [ ] Verify production health
- [ ] Monitor for 30 minutes

**Post-Deployment:**
- [ ] Monitor for 48 hours
- [ ] Check error rates, response times, queue depth
- [ ] Verify all cron jobs running
- [ ] Verify all webhooks receiving events
- [ ] Notify team of successful deployment
- [ ] Update deployment log

### 13.3 Database Migrations

**Migration Strategy:**
- Use versioned migration scripts
- Run migrations before deploying new code
- Test migrations on staging first
- Always have rollback migration

**Example Migration:**
```typescript
// migrations/2026-04-08-add-text-index-to-tasks.ts
export async function up(db: mongoose.Connection) {
  await db.collection('tasks').createIndex(
    { title: 'text', description: 'text' },
    { name: 'text_search_index' }
  );
}

export async function down(db: mongoose.Connection) {
  await db.collection('tasks').dropIndex('text_search_index');
}
```

**Migration Execution:**
```bash
# Run migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down
```

---

## 14. Risk Management

### 14.1 Risk Matrix

| Risk | Likelihood | Impact | Mitigation | Contingency |
|------|------------|--------|------------|-------------|
| Load test fails (can't handle 100K users) | Medium | High | Optimize queries, scale horizontally | Reduce scale target, plan capacity increase |
| Security vulnerability found in pen test | Medium | Critical | Proactive security audit, code review | Immediate patch, hotfix deployment |
| Production deployment causes downtime | Low | Critical | Blue-green deployment, rollback plan | Rollback within 5 minutes |
| MongoDB Atlas outage | Low | Critical | Multi-region deployment, read replica | Failover to replica, monitor status |
| Redis cluster failure | Low | High | Redis persistence, cache rebuild on miss | Temporary increased DB load, monitor |
| BullMQ queue overflow | Medium | High | Monitor queue depth, auto-scale workers | Manual queue purge, retry failed jobs |
| Payment gateway failure (Stripe down) | Low | High | Retry logic, fallback to manual processing | Notify users, process manually when restored |
| COPPA compliance failure | Low | Critical | Legal review, explicit consent flow | Suspend child accounts until compliant |
| Team member unavailable | Medium | Medium | Cross-training, documentation | Reassign tasks, extend timeline |
| Scope creep (new features requested) | High | Medium | Change control process, defer to backlog | Re-prioritize, adjust timeline |

### 14.2 Risk Mitigation Strategies

**Technical Risks:**
- Load test failure → Pre-emptive optimization (Phase 3)
- Security vulnerability → Penetration testing (Phase 4)
- Deployment downtime → Blue-green deployment (Phase 7)

**Operational Risks:**
- Database outage → Multi-region MongoDB Atlas
- Redis failure → Cache rebuild on miss, DB fallback
- Queue overflow → Monitoring alerts, auto-scale workers

**Business Risks:**
- COPPA non-compliance → Legal review, explicit consent flow
- Payment gateway failure → Retry logic, manual fallback
- Scope creep → Strict change control process

### 14.3 Escalation Path

```
Developer → Tech Lead → Engineering Manager → CTO
     ↓           ↓              ↓              ↓
  Fix code   Approve fix   Approve rollback  Executive decision
```

**Escalation Triggers:**
- Critical bug in production → Immediate escalation to Tech Lead
- Security vulnerability → Immediate escalation to Engineering Manager
- Production downtime > 15 minutes → Immediate escalation to CTO
- Compliance failure → Immediate escalation to Legal + CTO

---

## 15. Success Metrics & KPIs

### 15.1 Development KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test coverage | >80% | Vitest coverage report |
| Code quality (lint errors) | 0 | ESLint report |
| Technical debt items resolved | 100% of P0 items | Task tracker |
| Documentation completeness | 100% modules documented | File system check |
| Sprint velocity | 100% of planned tasks completed | Sprint review |

### 15.2 Performance KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (reads, p95) | <200ms | APM dashboard |
| API response time (writes, p95) | <500ms | APM dashboard |
| Cache hit rate | >80% | Redis monitoring |
| Queue depth (critical-queue) | <1000 jobs | BullMQ monitoring |
| Job failure rate | <5% | BullMQ monitoring |
| Error rate | <5% | APM dashboard |
| Uptime | 99.9% | Health check monitoring |

### 15.3 Business KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| User registration rate | >100/day (first month) | Analytics dashboard |
| Task completion rate | >70% within due date | Task analytics |
| Parent dashboard engagement | >80% WAU | Analytics dashboard |
| Mobile app DAU | >60% | Analytics dashboard |
| Subscription conversion rate | >20% free trial → paid | Payment analytics |
| Churn rate | <5% monthly | Subscription analytics |

---

## 16. Post-Launch Roadmap

### 16.1 Immediate Post-Launch (Weeks 15-16)

| Initiative | Priority | Effort | Notes |
|------------|----------|--------|-------|
| Monitor production metrics | P0 | Ongoing | APM dashboards, error tracking |
| Fix critical bugs | P0 | As needed | Hotfix deployment within 24 hours |
| Gather user feedback | P1 | 1 week | Surveys, support tickets analysis |
| Optimize slow endpoints | P1 | 1 week | Based on APM data |
| Scale infrastructure if needed | P0 | As needed | Add instances, increase pool sizes |

### 16.2 Short-Term Enhancements (Months 2-3)

| Initiative | Priority | Effort | Notes |
|------------|----------|--------|-------|
| Implement gamification (badges, streaks) | P2 | 2 weeks | Increases engagement |
| Add Google Calendar sync | P2 | 2 weeks | Tasks → calendar events |
| Implement advanced analytics (ML predictions) | P2 | 3 weeks | Predictive task completion time |
| Add Slack/Discord notifications | P2 | 1 week | Third-party integrations |
| Implement multi-language support (beyond English/Bengali) | P3 | 2 weeks | Based on user demographics |

### 16.3 Long-Term Vision (Months 4-12)

| Initiative | Priority | Effort | Notes |
|------------|----------|--------|-------|
| Multi-tenancy (organizations/workspaces) | P1 | 3 months | Enterprise feature |
| AI-powered task suggestions | P2 | 2 months | Natural language processing |
| Advanced reporting (custom reports, exports) | P2 | 1 month | Power user feature |
| API for third-party developers | P2 | 2 months | Developer platform |
| Mobile app feature parity with web | P1 | Ongoing | Align Flutter app with backend |
| White-label solution | P3 | 3 months | Reseller/enterprise licensing |

---

**Document Generated:** April 8, 2026  
**Next Step:** Generate `gap-analysis.md`  
**Status:** Awaiting permission to proceed ⏸️

---

**Appendix A: File Creation Checklist**

| Document | Location | Status |
|----------|----------|--------|
| `comprehensive-project-analysis.md` | `figma-asset/` | ✅ Created |
| `product-requirement-document-PRD.md` | `figma-asset/` | ✅ Created |
| `development-plan.md` | `figma-asset/` | ✅ Created |
| `gap-analysis.md` | `figma-asset/` | ⏸️ Pending |
| `project-overview.md` (enhanced) | `figma-asset/` | ⏸️ Pending |

---

**Appendix B: Quick Reference — All Phases**

| Phase | Duration | Focus | Key Deliverable | Success Criteria |
|-------|----------|-------|-----------------|------------------|
| 1. Production Readiness | Weeks 1-2 | Cache consistency, indexing, `.lean()`, legacy cleanup | Clean codebase, consistent caching, all indexes | No cache inconsistencies, no COLLSCAN |
| 2. Figma Alignment | Weeks 3-4 | API completeness, subscription proration, refunds | 100% Figma coverage, payment flows complete | All Figma screens have matching APIs |
| 3. Scalability | Weeks 5-6 | APM, BullMQ, Redis sorted sets, load testing | APM dashboards, load test report | <200ms reads, 100K concurrent users |
| 4. Security | Weeks 7-8 | PII encryption, rate limit headers, COPPA, pen test | Security audit pass | No critical vulnerabilities |
| 5. Testing | Weeks 9-10 | Unit, integration, E2E, load tests | Test coverage >80%, load tests pass | All tests pass, targets met |
| 6. Documentation | Weeks 11-12 | Module docs, performance reports, Postman | 100% modules documented | Developer onboarding <1 day |
| 7. Deployment | Weeks 13-14 | Staging → Production, monitoring, runbooks | Production deployed, 99.9% uptime | 48-hour monitoring passed |

---

**END OF DOCUMENT**