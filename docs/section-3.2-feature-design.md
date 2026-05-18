# Part 3.2 Onward - Detailed Function Draft

This document is a draft for section `3.2` onward of the detailed design report, written based on:

- The entity list in section `3.1.5 Entity Relationship Diagram` that you provided.
- The modules and business flows currently implemented in the `iccp_backend_core` backend.

Usage notes:

- The "Screen layout" section is presented as a text-based mock-up so it can be inserted into the report before being replaced with actual UI screenshots or prototypes.
- Extended modules such as `daily-report`, `landing-page`, and `kpi-target` are not included in this document because they are not part of the current ERD entity list.
- You can rename features or functions to match your team's report template without changing the business meaning.

## 3.2 Account and User Management

Related entities: `users`

### 3.2.1 User Registration, Email Verification, and Login

- Function trigger: The user opens the `Register` or `Login` page from the system landing page; the session refresh function is also triggered automatically when the access token is close to expiration.
- Function description: This function allows users to create a personal account, verify their email with OTP, log in to the system, and receive an access token together with a refresh token for later API usage.
- Screen layout:

```text
[Register Screen]
Full name
Email
Password
Confirm password
[Register]

[Verify Email Modal]
Email
OTP Code
[Verify] [Resend OTP]

[Login Screen]
Email
Password
[Login]
[Forgot password]
```

- Function details:
- Main input data includes email, password, OTP verification code, and refresh token.
- The email must be valid and must not already exist in the system. The password must satisfy minimum length requirements and match the confirmation password.
- A user whose email has not yet been verified is not considered a fully active account and cannot use features that require full authentication.
- After a successful login, the system returns an access token, a refresh token, and the basic identity information of the user.
- If the OTP is invalid or expired, the system rejects the verification request and allows the user to resend the OTP.
- If the email already exists, the system returns a business error and guides the user to the login or forgot password flow.

### 3.2.2 Personal Profile Management and Password Change

- Function trigger: The user opens the account menu and selects `My Profile` or `Change Password`.
- Function description: This function allows users to update their personal profile information, avatar, display information, and password in order to maintain account security and profile accuracy.
- Screen layout:

```text
[My Profile]
Avatar
First name
Last name
Phone
Job title
[Save]

[Change Password]
Current password
New password
Confirm new password
[Update password]
```

- Function details:
- The system only allows users to update their own profile, except for special administrative user management functions.
- The new password must not be the same as the current password and must satisfy minimum password strength rules.
- After a successful password change, the system may require the user to log in again or refresh tokens depending on the security policy.
- If the current password is incorrect, the request is rejected.
- If the account is locked or banned, the system does not allow sensitive profile changes.

## 3.3 Organization and Authorization Management

Related entities: `organizations`, `organization_members`, `organization_invitations`, `permissions`, `roles`, `role_permissions`, `user_roles`, `org_settings`, `org_working_time_configs`, `org_holidays`

### 3.3.1 Create Organization, Invite Members, and Join Organization

- Function trigger: A logged-in user selects `Create Organization`; an organization administrator selects `Invite Members`; an invited user opens the invitation email and selects `Accept Invitation`.
- Function description: This function establishes a tenant organization in the system, creates the membership relationship between users and organizations, and manages the invitation flow through email.
- Screen layout:

```text
[Create Organization]
Organization name
Domain / short code
Description
[Create]

[Invite Members]
Email
Role
Invitation message
[Send invitation]

[Accept Invitation]
Invitation information
[Accept] [Decline]
```

- Function details:
- When an organization is created, the system inserts a record into `organizations` and also creates an `organization_members` record for the creator with the default owner or administrator role.
- Each invitation is stored in `organization_invitations`, including recipient email, status, expiration time, and sender information.
- The invited person may already be an existing user or may not yet have an account. If they do not have an account, they must complete registration before joining the organization.
- The system must not allow duplicate active invitations for the same email address in the same organization.
- When the invitation is accepted successfully, the system creates a new membership relation and updates the invitation status to accepted.
- If the invitation is expired, canceled, or already processed, the system returns an error and requires a new invitation.

### 3.3.2 Manage Members, Roles, and Permissions in the Organization

- Function trigger: The Org Admin opens `Organization Members` or `Organization Roles`.
- Function description: This function allows administrators to view members, activate or deactivate members in the organization, create new roles, assign permissions to roles, and assign roles to each member.
- Screen layout:

```text
[Organization Members]
Search member
Filter by status / role
Table: Name | Email | Status | Role | Actions
[View detail] [Deactivate] [Remove]

[Organization Roles]
Table: Role name | Scope | Permission count | Actions
[Create role]
[Assign permissions]
[Assign role to member]
```

- Function details:
- The `permissions` table stores atomic permissions. The `roles` table stores reusable roles. The `role_permissions` table maps permissions to roles. The `user_roles` table assigns roles to users within the organization scope.
- Administrators can create custom business roles such as HR, IT, or PM Office and assign an appropriate set of permissions.
- A member may hold multiple roles if the business model allows it. Effective access is the union of all granted permissions.
- The system must prevent deletion of mandatory system roles or important roles that are still actively bound and have not yet been replaced.
- When a role is revoked or a member is removed from the organization, organization-level access rights must become invalid immediately.
- If the acting user does not have RBAC management permission, the API must return an access denied error.

### 3.3.3 Organization Settings, Working Schedule, and Holidays

- Function trigger: The Org Admin opens `Organization Settings` or `Working Time Configuration`.
- Function description: This function manages organization-level operational settings such as general configuration, standard working hours, and holiday calendars used for KPI calculation, overtime logic, or reminder rules.
- Screen layout:

```text
[Organization Settings]
General settings
Notification defaults
KPI defaults
[Save]

[Working Time]
Mon - Sun working hours
[Save schedule]

[Holiday Calendar]
Date | Holiday name | Type | Working hours override
[Add holiday] [Delete]
```

- Function details:
- `org_settings` stores organization-wide settings such as default KPI weights, notification channels, bonus rules, or reminder settings.
- `org_working_time_configs` stores the standard number of working hours for each day of the week.
- `org_holidays` stores holidays or exceptional working days that override the standard schedule.
- Only the Org Admin can update these settings. Regular members may only have view access if permission is granted.
- Project-level configuration may inherit values from organization-level settings when the project has no override.
- If working hours or holiday data is submitted in an invalid format, the system must reject the save request to avoid breaking KPI or overtime calculations.

## 3.4 Internal Request Management (Ticket Request)

Related entities: `ticket_requests`, `ticket_request_comments`, `ticket_request_activities`

### 3.4.1 Create Internal Request

- Function trigger: An employee opens the `Ticket Requests` menu and selects `Create Request`.
- Function description: This function allows employees to create internal requests such as leave requests, work from home requests, overtime requests, salary advance requests, or general requests. The system automatically determines which workflow should be applied.
- Screen layout:

```text
[Create Ticket Request]
Request type
Title
Reason
Start time
End time
Detail content
Attachment / related info
[Submit request]
```

- Function details:
- The main record is stored in `ticket_requests`, including request type, status, requester, current approver, current workflow step, and extended business data.
- For overtime requests, the system stores additional metadata such as related project, planned hours, or effort details.
- The system automatically generates a ticket code and initializes the first status as pending based on the corresponding workflow.
- Date and time fields must be valid. The start time must not be later than the end time. Required fields depend on the request type.
- If required data is missing or the requester does not belong to the current organization, the request is rejected.
- After successful creation, the system generates an initial activity record for audit and timeline display.

### 3.4.2 Approve, Reject, and Request Changes

- Function trigger: An authorized approver opens the ticket detail screen from notifications, the pending approval list, or a work dashboard.
- Function description: This function allows an approver or delegate to process a ticket by approving it, rejecting it, or requesting changes, while also moving the ticket to the next workflow step.
- Screen layout:

```text
[Ticket Request Detail]
Header: Code | Type | Status | Current approver
Body: Request information | Timeline | Comments
[Approve] [Reject] [Request changes]
Decision note
```

- Function details:
- `ticket_request_activities` stores the full state transition history, including actor, previous and next status, and business payload.
- The right to process a ticket depends on the current workflow step, approver or delegate relationship, and the acting user's permissions.
- `Approve` moves the ticket to the next step or completes it. `Reject` may terminate the ticket or send it back to an earlier step depending on workflow definition. `Request changes` moves the ticket into a state where revision is required.
- Each action should include a note when required by business rules, especially for rejection or change requests.
- If the user processes the wrong step, is not the current approver, or the ticket is already terminal, the system must block the action.
- After each decision, the system updates the ticket status, writes an activity log, and triggers notifications to the requester and related parties.

### 3.4.3 Commenting and Tracking Processing History

- Function trigger: A user opens the ticket detail screen and types a comment in the discussion or timeline section.
- Function description: This function supports additional communication between requester, approver, and related stakeholders, and also allows users to review the full ticket processing history.
- Screen layout:

```text
[Ticket Discussion]
Comment list
Input comment
[Send]

[Activity Timeline]
Created
Submitted
Approved / Rejected / Requested changes
Updated
```

- Function details:
- Comment content is stored in `ticket_request_comments`, linked to the ticket, author, and creation time.
- The business timeline is retrieved from `ticket_request_activities` and cannot be edited directly by users.
- Only users with permission to view the ticket can access comments and activity history. Comment permission may be narrower than view permission depending on RBAC configuration.
- The system should limit comment length, reject empty content, and always record the author clearly.
- If the ticket does not exist or the user has no access rights, the system must not return comment or activity data.

## 3.5 Document and Internal Knowledge Management

Related entities: `document_folders`, `document_categories`, `documents`, `document_versions`, `document_access_rules`, `folder_access_rules`

### 3.5.1 Manage Document Folders and Categories

- Function trigger: An organization administrator, PM, or authorized user opens the `Documents` module and selects folder creation or category creation.
- Function description: This function organizes the knowledge repository into a hierarchical folder tree and attaches categories to support classification and search.
- Screen layout:

```text
[Document Explorer]
Left panel: Folder tree
Right panel: Document list
[New folder] [New category]
[Move] [Rename] [Delete]
```

- Function details:
- `document_folders` stores the folder tree and may belong either to the organization scope or to a specific project.
- `document_categories` stores business classification labels such as HR, IT, Process, Policy, or Project.
- The system supports creating root folders, child folders, renaming, moving, and restoring from recycle state.
- The system must not allow parent-child cycles when moving folders.
- If a folder contains documents or child folders, deletion may first be performed as a soft delete before permanent deletion.
- Users can only see folders they have permission to view, either directly or through inheritance from project, role, or ownership.

### 3.5.2 Upload Documents, Update Content, and Manage Versions

- Function trigger: A user with upload permission opens `Documents` and selects `Upload Document` or `Upload New Version`.
- Function description: This function stores knowledge documents, allows metadata updates, supports uploading replacement files, tracks version history, and exposes content chunks used for knowledge retrieval.
- Screen layout:

```text
[Upload Document]
Title
Folder
Category
Access scope
File upload
Description
[Save]

[Document Detail]
Metadata
Current version
Version history
[Upload new version]
```

- Function details:
- `documents` is the main document record, storing title, folder, category, status, and uploader information.
- `document_versions` stores version history so the system can preserve and inspect document changes over time.
- When a new version is uploaded, the system must create a new version record instead of overwriting previous history.
- A document may belong to organization, project, role, user, or system scope depending on the access model.
- Unsupported file formats, oversized files, or unsafe uploads must be blocked immediately.
- If a document is soft deleted, authorized users may restore it. If it is permanently deleted, all related versions must be handled consistently.

### 3.5.3 Manage Document and Folder Access Rules

- Function trigger: A document owner or administrator opens the `Access Rules` screen for a document or folder.
- Function description: This function allows the system to grant view, download, upload, edit, or manage rights to a specific user, role, or project for a document or folder.
- Screen layout:

```text
[Access Rules]
Target type: User / Role / Project
Target value
Permission: view | download | upload | edit | manage
[Add rule]

Current rules table
[Revoke]
```

- Function details:
- `document_access_rules` applies directly to documents. `folder_access_rules` applies to folders and may be inherited by documents inside those folders.
- Each rule contains `accessType`, `accessId`, and `permission`. The system should prevent duplicate rules to avoid redundant records.
- Effective permission is determined from ownership, project membership, organization roles, and explicit access rules.
- A user without `manage` permission must not be allowed to grant or revoke access for others.
- When revoking access, the system may remove a specific permission or all rules of a subject depending on the request.
- If a user is currently viewing a document and their permission is revoked, future access attempts must be blocked immediately.

## 3.6 Internal Chatbot Knowledge Retrieval

Related entities: `chatbot_conversations`, `chatbot_messages`, `message_citations`

### 3.6.1 Create Conversation and Send Question to the Chatbot

- Function trigger: An employee opens the chatbot widget in the system and submits a question in natural language.
- Function description: This function creates a conversation session, sends the question to the AI service, receives an answer based on internal knowledge sources, and stores the conversation history for each user within each organization.
- Screen layout:

```text
[Chatbot Widget]
Conversation list
Active conversation
Message input
[Send]
```

- Function details:
- `chatbot_conversations` stores the conversation session, including owner, organization, title, and active state.
- `chatbot_messages` stores each message turn in the conversation, including sender role, content, and timestamp.
- When the user sends the first message, the system may automatically create a new conversation.
- Only data from the current organization may be used in knowledge retrieval to preserve multi-tenant isolation.
- The user must have chatbot usage permission and an active membership in the organization.
- If the AI service fails or no suitable context is found, the system should still store the user's message and return either an error response or a fallback answer.

### 3.6.2 View Conversation History and Source Citations

- Function trigger: A user reopens a previous conversation or clicks the `Sources/Citations` section under a chatbot answer.
- Function description: This function allows users to review prior question-answer history and trace which internal documents were used by the chatbot to generate the answer.
- Screen layout:

```text
[Conversation Detail]
Question / Answer pairs

[Citation Panel]
Document title
Quoted excerpt
Link to source document
```

- Function details:
- `message_citations` links each chatbot answer to the referenced source document, quoted excerpt, page, or location.
- A user may only view citations for documents they already have permission to access.
- The system should display citations together with the related answer to improve transparency and trust.
- If a source document has been deleted or the user no longer has access, the system should show only limited citation data or hide the detailed link.
- Conversations may be listed by time, marked active or inactive, or renamed for easier management.

## 3.7 Real-Time Communication Within the Organization

Related entities: `chat_rooms`, `room_members`, `chat_messages`, `message_attachments`, `message_mentions`, `message_reactions`

### 3.7.1 Create Chat Room, Invite Members, and Join Room

- Function trigger: A user selects `Create Room`, `Join Room`, or accepts an invitation to join a chat room.
- Function description: This function organizes internal communication through rooms or channels, supporting private rooms, public rooms, project rooms, and room membership policies.
- Screen layout:

```text
[Chat Room List]
Search room
Tabs: All | Public | Private | Archived
[Create room]

[Create Room Modal]
Room name
Description
Visibility
Initial members
[Create]
```

- Function details:
- `chat_rooms` stores room information such as name, description, owner, visibility, archive status, and room policies.
- `room_members` stores the member list and role of each participant within the room.
- The system supports inviting members, discovering public rooms, accepting invitations, and transferring room ownership.
- Only users belonging to the same organization may participate in the same organization-level room.
- If a room is archived or a user has been removed from the room, that user cannot send new messages.
- The system should validate room naming and prevent conflicts with default or system room behavior.

### 3.7.2 Send Messages, Attach Files, Mention Users, and React

- Function trigger: A room member opens a chat room and uses the message input box.
- Function description: This function supports real-time message sending, file attachments, user mentions, emoji reactions, and read-state management.
- Screen layout:

```text
[Room Conversation]
Message list
Attachment button
Mention suggestion
Reaction bar
Input box
[Send]
```

- Function details:
- `chat_messages` stores the message content, sender, room, message type, and creation time.
- `message_attachments` stores file or media information attached to a message.
- `message_mentions` stores mentioned users in each message to support unread mention tracking.
- `message_reactions` stores reactions by user and message.
- The system must verify that the acting user is an active room member before allowing message creation or modification.
- Attached files must pass validation for file type, size, and download permission.
- If a message is deleted, related attachments, reactions, and mentions must be handled consistently or hidden according to the data retention policy.

## 3.8 Project and Task Management

Related entities: `projects`, `project_members`, `project_invites`, `status_tasks`, `tasks`, `task_comments`, `task_attachments`, `task_tags`, `project_configs`

### 3.8.1 Create Project and Invite Members to the Project

- Function trigger: A PM or Org Admin selects `Create Project` in the project management module.
- Function description: This function creates a project workspace for a group of members within an organization, configures basic project information, and sends project invitations.
- Screen layout:

```text
[Create Project]
Project name
Code / slug
Description
Start date
End date
Owner / PM
[Create]

[Project Members]
Current members
[Invite member]
```

- Function details:
- `projects` stores the core project information such as name, description, owner, start time, end time, and project status.
- `project_members` stores project membership relations. `project_invites` stores invitations that have not yet been accepted.
- Only users who already belong to the organization may be invited to that organization's projects.
- When a project is created, the system may initialize default project configuration and default task statuses.
- The system must not allow duplicate project slugs within the same organization if the slug is used for project access.
- If a project invitation is rejected or expired, the PM must send a new invitation.

### 3.8.2 Manage Task Statuses and Tasks

- Function trigger: A project member opens `Task Board`, `Task List`, or `Task Detail`.
- Function description: This function allows the creation of tasks, status updates, assignee assignment, tagging, comments, file attachments, and tracking of task change history.
- Screen layout:

```text
[Task Board]
Columns: Todo | In Progress | Review | Done
[Create task]

[Task Detail]
Title
Description
Assignee
Status
Due date
Tags
Attachments
Comments
[Save]
```

- Function details:
- `status_tasks` stores project-specific business statuses.
- `tasks` stores the main work items and may include priority, assignee, due date, estimated points, or estimated hours depending on configuration.
- `task_comments`, `task_attachments`, and `task_tags` respectively manage discussions, attached files, and classification tags.
- Important changes such as status changes, assignee changes, or content updates may be recorded in task history for audit purposes.
- Only project members with sufficient permission may create or update tasks. Users outside the project cannot access task details.
- The system must not allow transition to a non-existent status in the project or deletion of a status that still has dependent tasks unless related data is handled first.

### 3.8.3 Project Configuration and Progress Dashboard

- Function trigger: A PM opens `Project Settings` or `Project Dashboard`.
- Function description: This function allows project-specific operational rules to be configured and provides an aggregated view of progress, task distribution, task status, and execution performance.
- Screen layout:

```text
[Project Settings]
Meeting config
Reminder config
Point scale
KPI weights
[Save]

[Project Dashboard]
Summary cards
Progress chart
Member progress
Upcoming deadlines
```

- Function details:
- `project_configs` stores project-level overrides relative to the organization default configuration.
- The dashboard aggregates data from tasks, project members, task statuses, and related indicators.
- PMs can configure deadline reminders, KPI weights, point scales, or project-level notification rules.
- If the project has no custom configuration, the system uses inherited organization settings.
- Only a PM or Org Admin can update project configuration. Other members may only view the dashboard within allowed scope.

## 3.9 System Settings, Notifications, and Audit Trail

Related entities: `settings`, `audit_logs`, `notifications`, `notification_campaigns`

### 3.9.1 Personal Notifications and Notification Campaign Management

- Function trigger: A user opens `Notifications`; an administrator or Org Admin opens `Notification Campaigns`; the system may also trigger notifications automatically by schedule or business event.
- Function description: This function manages in-app notifications for individual users, supports marking notifications as read, deleting notifications, and creating scheduled bulk notification campaigns.
- Screen layout:

```text
[Notifications]
Filter: unread / all
List: title | content | time | read state
[Mark as read] [Read all]

[Notification Campaigns]
Campaign name
Audience
Message content
Schedule time
[Create campaign]
```

- Function details:
- `notifications` stores personalized notifications for users or organizations together with read state.
- `notification_campaigns` stores bulk campaign definitions such as campaign name, target audience, content, and scheduled send time.
- The system may create notifications from many sources such as ticket requests, project deadlines, billing, chat mentions, or proactive campaigns.
- Users can only view and manipulate their own notifications.
- For scheduled campaigns, the system must verify send time, avoid duplicate sends, and store campaign execution progress.
- If a recipient is no longer eligible to receive a notification at send time, the system should skip delivery or record a controlled error log.

### 3.9.2 System Configuration and Audit Logging

- Function trigger: The Platform Admin opens `System Settings` or `Audit Logs`; audit logging is also triggered automatically whenever sensitive actions occur in the system.
- Function description: This function stores platform-wide configuration parameters and records full administrative action history for monitoring, traceability, and compliance.
- Screen layout:

```text
[System Settings]
Module
Key
Value
Description
[Save]

[Audit Logs]
Filter: actor | module | action | date
Table: time | actor | target | result
[View detail]
```

- Function details:
- `settings` stores shared platform configuration such as system limits, feature flags, or operational parameters.
- `audit_logs` stores actor, action, module, affected object, change payload, and timestamp.
- Actions such as role updates, plan changes, document deletion, payment handling, or settings updates should be recorded in the audit trail.
- Regular users must not be allowed to modify system settings. This scope is reserved for the Platform Admin or system accounts.
- Audit logs are immutable data. They may be viewed, filtered, and exported, but not edited directly.
- Even when an operation fails because of a business or security error, the system should still record audit information at an appropriate level for later investigation.

## 3.10 Subscription and Payment Management

Related entities: `subscription_plans`, `subscriptions`, `payment_methods`, `invoices`, `payment_transactions`

### 3.10.1 Subscribe to a Plan, Change Plan, and Manage Payment Method

- Function trigger: The Org Owner or Org Admin opens `Billing`, selects a new plan, or updates the payment method.
- Function description: This function allows the organization to view subscription plans, subscribe to a new plan, change plans, cancel a subscription, and configure payment methods for renewal or manual payment.
- Screen layout:

```text
[Plans]
Plan cards: Free | Standard | Enterprise
[Select plan]

[Subscription Detail]
Current plan
Billing cycle
Renewal date
Payment method
[Change plan] [Cancel subscription]
```

- Function details:
- `subscription_plans` stores the definition of each plan, including features, billing cycle, and price.
- `subscriptions` stores the organization's current subscription together with states such as active, canceled, expired, or trial.
- `payment_methods` stores registered payment method information such as type, reference code, or required metadata.
- When changing a plan, the system must calculate the impact on billing period, resource entitlements, and effective time.
- Only organization representatives with billing permission may manage subscriptions and payment methods.
- If the organization has unpaid fees or an invalid payment method, the system may block upgrade or renewal requests until payment is completed.

### 3.10.2 Track Invoices and Payment Transactions

- Function trigger: A user with billing permission opens `Invoices` or `Transactions`; the system may also generate invoices automatically on each billing cycle.
- Function description: This function manages all payment records for the organization, including invoices, payment status, and transaction history with the payment gateway.
- Screen layout:

```text
[Invoices]
Invoice no | Period | Amount | Status | Due date
[View invoice]

[Transactions]
Order code | Method | Amount | Status | Created at
```

- Function details:
- `invoices` stores billing documents linked to subscriptions and billing cycles, including amount, due date, status, and related metadata.
- `payment_transactions` stores interactions with the payment gateway such as payment link creation, successful confirmation, cancellation, or failure.
- Invoice status and transaction status must remain consistent to avoid incorrect payment recognition.
- The system should support transaction history lookup for reconciliation and customer complaints.
- If payment gateway webhooks arrive late or are sent repeatedly, the system must process them idempotently to avoid duplicate transaction records.
- If payment fails, the subscription may remain unchanged, be downgraded, or move to an overdue state depending on billing policy.

## Suggested Use in the Report

- If the report needs to be shorter, you can keep the `3.2`, `3.3`, `3.4` structure and select only the two most important functions in each feature.
- If the report needs to be closer to the actual backend or API, you can add a `Related API` line under each function.
- If the report requires UI visuals, replace the `Screen layout` blocks with Figma mockups or actual frontend screenshots.
