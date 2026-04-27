# Z3ns Task Management Platform - Comprehensive Detailed Overview

Based on a thorough analysis of the Figma design assets across all user segments, this document provides a super-detailed overview of the Z3ns Task Management Platform. 

## 1. High-Level System Architecture & Concept
Z3ns is a multi-tier, comprehensive task management platform designed to serve individuals, families, and educational/business groups. The platform bridges the gap between task delegation and execution through a hierarchical account structure and personalized motivational systems.

The ecosystem is divided into three distinct user interfaces:
1. **Main Admin Dashboard:** For Z3ns platform owners to monitor platform health, user metrics, and revenue.
2. **Teacher / Parent Dashboard (Web):** For "Primary" account holders to delegate tasks, monitor progress, and manage their group/family.
3. **App User Interface (Mobile):** For end-users and "Secondary" account holders (students, children, team members) to execute tasks, track personal progress, and manage their day.

---

## 2. Detailed Interface & Workflow Breakdown

### A. Main Admin Dashboard (Z3ns Platform Admin)
This portal is the operational command center for the software provider, focusing on user analytics and monetization.

*   **Dashboard & Analytics:** 
    *   Visualizes key performance indicators (KPIs) such as Total Users and Monthly Income.
    *   Features a profit ring chart and monthly bar charts comparing User Ratios over the year.
*   **Earnings & Revenue Tracking:**
    *   Displays a comprehensive "Earnings Overview" with a Total Revenue bar chart.
    *   Includes a detailed "All Earning List" table capturing User Name, Email, Subscription Type (Individual/Business), Price, Buying Date, and actionable info buttons.
*   **User Management:**
    *   A robust "Manage User" section displaying the entire user base.
    *   Clicking into "User Details" reveals deep insights:
        *   **Personal Information:** Name, Email, Phone, Address, Gender, Date of Birth, and Age.
        *   **Subscription Buying Information:** Subscription Type, Buying Date, Current Period Start Date, Transaction ID, Withdraw Amount, Expiration Date, Cancellation Status, and real-time processing Status.
*   **Subscription Package Configuration:**
    *   Admins can dynamically Create, Edit, and Delete subscription tiers.
    *   The "Create Subscription" form allows setting the Subscription Name, Price, Duration (Weekly/Monthly/Yearly), Description, and granular feature limits (e.g., "Up to 5 users per group", "1 Primary account", "Up to 4 Secondary accounts").

### B. Teacher / Parent Dashboard (Primary Account Holders)
Designed for users on the "Group/Business Plan," this web interface serves as the management hub for families or teams.

*   **Team Overview (Main Dashboard):**
    *   Provides a bird's-eye view of all connected members.
    *   Individual cards for each member clearly differentiate between the "Primary account" (the manager) and "Secondary" accounts (the dependents).
    *   Displays real-time stats per user: Total Tasks, Pending Tasks, and Completed Tasks.
*   **Live Activity Feed:**
    *   A real-time notification sidebar showing exact actions taken by team members (e.g., "Jamie Chen completed 'Complete math homework' 2 minutes ago").
*   **Task Management & Monitoring:**
    *   Tasks are organized by status tabs: All, Not Started, In Progress, Completed, and Personal Task.
    *   Detailed task cards show Task Start Date & Time, Assignee, Descriptions, and an interactive checklist of Sub-Tasks with a visual completion percentage bar.
    *   **Quick Assign Module:** Managers can rapidly deploy tasks using three modes:
        1.  **Single Assignment:** Assign a task to one specific family/team member.
        2.  **Collaborative Task:** Assign a shared task to multiple members simultaneously.
        3.  **Personal Task:** Create private tasks for themselves.
*   **Team Member Management:**
    *   A table view of all team members detailing their Role Type, contact info, and overall "Tasks Progress" via progress bars.
    *   Ability to Add, Edit, or Remove members within the limits of their subscription plan.
*   **Granular Permissions:**
    *   A dedicated toggle allows the Primary user to grant or revoke the ability for Secondary users to create and assign tasks themselves.
*   **Subscription Management:**
    *   Users can view their active plan details (e.g., Business Plan at $29.99/Month), review billing cycles, and execute cancellations or renewals.

### C. App User Interface (Mobile App for End Users)
The mobile application is focused on usability, task execution, and positive reinforcement. It serves both solo users on Individual plans and dependents on Group plans.

*   **Onboarding & RevenueCat Integration:**
    *   Seamless Sign Up / Sign In with Email or Google SSO.
    *   Subscription paywalls integrated with RevenueCat, prompting users to choose between an Individual Subscription ($10.99/mo) or a Business Subscription ($29.99/mo).
*   **Personalized Support Styles (Unique Feature):**
    *   During onboarding, users choose how the app communicates with them, tailoring the psychological experience to their needs:
        *   **Calm:** Gentle guidance with peaceful reminders. ("Take your time. Each small step matters.")
        *   **Encouraging:** Positive energy with motivational reminders and uplifting support. ("You're doing great! Keep up the momentum!")
        *   **Logical:** Straightforward guidance with structured reminders.
*   **Home Screen & Execution:**
    *   A welcoming interface showing "Daily Progress" (e.g., 1/5 tasks completed) with a visual tracker.
    *   Tasks are listed by status (Pending, In Progress).
    *   Tapping a task opens the "Details" screen, allowing users to check off individual "Subtask items," driving the overall task progress bar.
    *   UI clearly indicates if a task is a "Self Task", a "Group Task", or if it was assigned by a manager (e.g., "Assigned by Mr. Tom Alax").
*   **Task Creation (If Permitted):**
    *   If the Primary account holder grants permission, the mobile app allows the creation of Single, Collaborative, or Personal tasks.
    *   The interface includes setting Task Titles, Descriptions, Date & Time, adding sub-tasks, and selecting assignees from the group roster.
*   **Task History & Filtering:**
    *   Dedicated screens to filter past tasks by date ranges, allowing users to review their historical performance.

---

## 3. Core Architectural Takeaways
1.  **Hierarchical Data Structure:** The system heavily relies on a Parent-Child (Primary-Secondary) user relationship architecture. All tasks, permissions, and visibility rules must check these hierarchical bounds.
2.  **Dynamic Feature Flags:** Permissions (like a child's ability to create a task) are dynamic and controlled via the Parent's dashboard.
3.  **Real-Time Synchronization:** The "Live Activity" feed on the Teacher/Parent dashboard implies a requirement for real-time data syncing (WebSockets/Server-Sent Events) when mobile users update task statuses.
4.  **Granular Task Tracking:** The fundamental unit of progress is the "Sub-Task." The completion of a parent task is directly tied to the ratio of completed sub-tasks.
5.  **Monetization First:** Subscription management is deeply integrated into both the Super Admin and the End-User flows, dictating account limits and feature access from the moment of registration.