// ICCP - Internal Consulting Chatbot Platform
// Database Schema v2 — bổ sung module Ticket Request
// Cập nhật: 2026-03-17

// ===== SCHEMA: auth - Authentication & User Management =====
Table auth.users {
  id uuid [primary key]
  email varchar(255) [unique, not null]
  password_hash varchar(255) [not null]
  first_name varchar(255)
  last_name varchar(255)
  phone varchar(20)
  avatar_url text
  address varchar(255)
  date_of_birth timestamp
  provider varchar(50) [default: 'local'] // local, google
  is_active boolean [default: true]
  is_verified boolean [default: false]
  email_verified_at timestamp
  last_login_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp // soft delete

  indexes {
    email
    is_active
  }
}


// ===== SCHEMA: tenant - Multi-tenant Organization Management =====
Table tenant.organizations {
  id uuid [primary key]
  name varchar(255) [not null]
  slug varchar(100) [unique, not null]
  description text
  logo_url text
  industry varchar(100)
  size varchar(50) // small, medium, large, enterprise
  owner_id uuid [ref: > auth.users.id, not null]
  subscription_plan_id uuid [ref: > billing.subscription_plans.id]
  is_active boolean [default: true]
  settings jsonb // custom org settings
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    slug
    owner_id
    is_active
  }
}

Table tenant.organization_members {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  invited_by uuid [ref: > auth.users.id]
  invitation_token varchar(255)
  invitation_accepted_at timestamp
  joined_at timestamp [default: `now()`]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id, user_id) [unique]
    organization_id
    user_id
  }
}

Table tenant.organization_invitations {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  email varchar(255) [not null]
  invited_by uuid [ref: > auth.users.id, not null]
  token varchar(255) [unique, not null]
  status enum('pending','accepted','expired','cancelled') [default: 'pending']
  expires_at timestamp [not null]
  accepted_at timestamp
  created_at timestamp [default: `now()`]

  indexes {
    organization_id
    email
    token
    status
  }
}

// ===== SCHEMA: tenant — Ticket Request Module =====

// ticket_requests: bảng chính lưu mọi yêu cầu của nhân viên
// - type: leave | wfh | overtime | advance | general
// - workflow_code: working_time | overtime_standard | overtime_opic
// - status: pending_approval | changes_requested | approved | rejected | canceled
// - delegate_id: người cần hành động TIẾP THEO (FE dùng field này để xác định ai đang giữ bóng)
// - approver_id: người được chỉ định ban đầu cho step hiện tại (thường = delegate_id)
// - effort_owner_id: người khai báo OT effort (chỉ dùng cho workflow overtime_*)
// - ot_metadata: JSONB chứa dữ liệu đặc thù OT (PM điền lúc tạo, effortOwner điền lúc declare)
Table tenant.ticket_requests {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  code varchar(40) [not null, note: 'Format: TR-YYYYMMDD-NNNNNN, unique per org']

  type enum('leave','wfh','overtime','advance','general') [not null]
  workflow_code enum('working_time','overtime_standard','overtime_opic') [not null, default: 'working_time']
  current_step_code varchar(80) [not null, note: 'Step code hiện tại trong workflow']
  current_step_order int [not null, default: 1]
  status enum('pending_approval','changes_requested','approved','rejected','canceled') [not null, default: 'pending_approval']

  title varchar(255) [not null]
  content text [not null, note: 'Mô tả / lý do request. Với OT ticket = scope field']

  requester_id uuid [ref: > auth.users.id, not null, note: 'Người tạo đơn (Employee / PM)']
  approver_id uuid [ref: > auth.users.id, not null, note: 'Người được assign approve step hiện tại']
  delegate_id uuid [ref: > auth.users.id, not null, note: 'Người cần hành động tiếp theo — FE dùng field này']
  effort_owner_id uuid [ref: > auth.users.id, note: 'Người khai báo OT effort (chỉ dùng cho overtime workflow)']

  request_type_code varchar(120) [note: 'Mã loại request, VD: annual_leave, wfh_full_day, overtime_request']
  request_type_name varchar(255) [note: 'Tên hiển thị loại request']
  reason_code varchar(255) [note: 'Mã lý do, VD: project_deadline, personal_issue']
  reason_detail text [note: 'Lý do chi tiết do người dùng nhập']

  start_at timestamp [note: 'Thời điểm bắt đầu (leave/wfh/ot)']
  end_at timestamp [note: 'Thời điểm kết thúc (leave/wfh/ot)']

  decision_note text [note: 'Ghi chú của người approve/reject ở step hiện tại']
  decided_at timestamp
  decided_by uuid [ref: > auth.users.id]

  canceled_at timestamp
  canceled_by uuid [ref: > auth.users.id]

  ot_metadata jsonb [note: '''
    Chỉ có giá trị với type = overtime. Cấu trúc:
    {
      projectId?: string,          -- PM điền lúc tạo
      plannedHours?: number,       -- PM điền lúc tạo
      effortEntries?: [            -- effortOwner điền ở bước PROJECT_MEMBER_DECLARE_OT
        { date, hours, taskDescription, workDescription? }
      ],
      totalActualHours?: number,   -- effortOwner điền
      effortDetail?: string        -- effortOwner điền
    }
  ''']

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp // soft delete

  indexes {
    (organization_id, code) [unique]
    organization_id
    requester_id
    delegate_id
    status
    type
    workflow_code
    current_step_code
  }
}

// ticket_request_cc_members: danh sách member được CC vào ticket (nhận notification)
// - member_id: user được CC (thường là org admin mặc định + người dùng chọn thêm)
// - added_by: ai đã thêm CC member này
Table tenant.ticket_request_cc_members {
  id uuid [primary key]
  ticket_request_id uuid [ref: > tenant.ticket_requests.id, not null]
  member_id uuid [ref: > auth.users.id, not null]
  added_by uuid [ref: > auth.users.id, not null]
  created_at timestamp [default: `now()`]

  indexes {
    (ticket_request_id, member_id) [unique]
    ticket_request_id
    member_id
  }
}

// ticket_request_comments: comment thread trên ticket
// - hỗ trợ soft delete (xoá comment của mình)
Table tenant.ticket_request_comments {
  id uuid [primary key]
  ticket_request_id uuid [ref: > tenant.ticket_requests.id, not null]
  author_id uuid [ref: > auth.users.id, not null]
  content text [not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp // soft delete

  indexes {
    ticket_request_id
    author_id
  }
}

// ticket_request_activities: audit log mọi hành động trên ticket
// - action: created | submitted | updated | approved | rejected | changes_requested | canceled | commented | cc_added | cc_removed
// - payload: JSONB context tuỳ action (VD: fromStepCode, toStepCode, nextDelegateId)
Table tenant.ticket_request_activities {
  id uuid [primary key]
  ticket_request_id uuid [ref: > tenant.ticket_requests.id, not null]
  actor_id uuid [ref: > auth.users.id, not null]
  action enum('created','submitted','updated','approved','rejected','changes_requested','canceled','commented','cc_added','cc_removed') [not null]
  from_status enum('pending_approval','changes_requested','approved','rejected','canceled') [note: 'Status trước khi action']
  to_status enum('pending_approval','changes_requested','approved','rejected','canceled') [note: 'Status sau action']
  payload jsonb [note: '''
    Context tuỳ action:
    - submitted:  { fromStepCode, toStepCode, nextDelegateId }
    - approved:   { fromStepCode, toStepCode, note, nextApproverId }
    - rejected:   { reason }
    - cc_added:   { memberId }
    - cc_removed: { memberId }
  ''']
  created_at timestamp [default: `now()`]

  indexes {
    ticket_request_id
    actor_id
    action
    created_at
  }
}


// ===== SCHEMA: rbac - Role-Based Access Control =====
Table rbac.permissions {
  id uuid [primary key]
  code varchar(100) [unique, not null] // e.g., "documents.create", "ticket_requests.approve"
  name varchar(255) [not null]
  description text
  module varchar(50) [not null] // documents, projects, users, chatbot, analytics, ticket_requests
  created_at timestamp [default: `now()`]

  indexes {
    code
    module
  }
}

Table rbac.roles {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id] // null nếu là system role
  name varchar(100) [not null]
  description text
  is_system_role boolean [default: false]
  deleted_at timestamp // soft delete
  created_by uuid [ref: > auth.users.id]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id, name) [unique]
    organization_id
  }
}

Table rbac.role_permissions {
  id uuid [primary key]
  role_id uuid [ref: > rbac.roles.id, not null]
  permission_id uuid [ref: > rbac.permissions.id, not null]
  created_at timestamp [default: `now()`]

  indexes {
    (role_id, permission_id) [unique]
    role_id
    permission_id
  }
}

Table rbac.user_roles {
  id uuid [primary key]
  user_id uuid [ref: > auth.users.id, not null]
  organization_id uuid [ref: > tenant.organizations.id]
  role_id uuid [ref: > rbac.roles.id, not null]
  scope_type enum('organization','project') [default: 'organization']
  scope_id uuid // project_id if scope_type = 'project'
  assigned_by uuid [ref: > auth.users.id]
  assigned_at timestamp [default: `now()`]

  indexes {
    (user_id, organization_id, role_id, scope_type, scope_id) [unique]
    user_id
    organization_id
    role_id
  }
}

// ===== SCHEMA: knowledge - Document & Knowledge Base Management =====

Table knowledge.document_folders {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id]
  project_id uuid [ref: > project.projects.id]
  name varchar(255) [not null]
  description text
  parent_id uuid [ref: > knowledge.document_folders.id]
  path text // materialized path: "uuid1.uuid2.uuid3"
  sort_order int [default: 0]
  is_system boolean [default: false]
  original_parent_id uuid [ref: > knowledge.document_folders.id]
  created_by uuid [ref: > auth.users.id, not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
  deleted_by uuid [ref: > auth.users.id]

  indexes {
    organization_id
    project_id
    parent_id
    path
  }
}

Table knowledge.document_categories {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id]
  name varchar(255) [not null]
  description text
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    organization_id
  }
}

Table knowledge.documents {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id]
  folder_id uuid [ref: > knowledge.document_folders.id]
  category_id uuid [ref: > knowledge.document_categories.id]
  title varchar(500) [not null]
  description text
  file_name varchar(255)
  file_path text [not null]
  file_size bigint
  file_type varchar(50)
  mime_type varchar(100)
  uploaded_by uuid [ref: > auth.users.id, not null]
  status varchar(50) [default: 'pending'] // pending, processing, indexed, failed
  access_scope varchar(50) [default: 'organization']
  metadata jsonb
  version int [default: 1]
  is_active boolean [default: true]
  indexed_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    organization_id
    folder_id
    category_id
    uploaded_by
    status
    access_scope
  }
}

Table knowledge.document_versions {
  id uuid [primary key]
  document_id uuid [ref: > knowledge.documents.id, not null]
  version int [not null]
  file_path text [not null]
  file_size bigint
  file_name varchar(255)
  uploaded_by uuid [ref: > auth.users.id, not null]
  change_notes text
  created_at timestamp [default: `now()`]

  indexes {
    (document_id, version) [unique]
    document_id
  }
}

Table knowledge.document_access_rules {
  id uuid [primary key]
  document_id uuid [ref: > knowledge.documents.id, not null]
  access_type varchar(50) [not null] // user, project, role
  access_id uuid [not null]
  created_at timestamp [default: `now()`]

  indexes {
    (document_id, access_type, access_id) [unique]
    document_id
  }
}

Table knowledge.folder_access_rules {
  id uuid [primary key]
  folder_id uuid [ref: > knowledge.document_folders.id, not null]
  access_type varchar(50) [not null]
  access_id uuid [not null]
  created_at timestamp [default: `now()`]

  indexes {
    (folder_id, access_type, access_id) [unique]
    folder_id
  }
}

Table knowledge.document_chunks {
  id uuid [primary key]
  document_id uuid [ref: > knowledge.documents.id, not null]
  chunk_index int [not null]
  content text [not null]
  embedding vector(768)
  token_count int
  metadata jsonb
  created_at timestamp [default: `now()`]

  indexes {
    (document_id, chunk_index) [unique]
    document_id
  }
}

// ===== SCHEMA: chatbot - RAG Chatbot & Conversations =====
Table chatbot.conversations {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  title varchar(500)
  context_scope varchar(50) [default: 'organization']
  context_id uuid
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id, user_id)
    organization_id
    user_id
  }
}

Table chatbot.messages {
  id uuid [primary key]
  conversation_id uuid [ref: > chatbot.conversations.id, not null]
  role varchar(20) [not null] // user, assistant, system
  content text [not null]
  metadata jsonb
  created_at timestamp [default: `now()`]

  indexes {
    conversation_id
    created_at
  }
}

Table chatbot.message_citations {
  id uuid [primary key]
  message_id uuid [ref: > chatbot.messages.id, not null]
  document_id uuid [ref: > knowledge.documents.id, not null]
  chunk_id uuid [ref: > knowledge.document_chunks.id, not null]
  relevance_score float
  cited_content text
  created_at timestamp [default: `now()`]

  indexes {
    message_id
    document_id
  }
}

Table chatbot.message_feedback {
  id uuid [primary key]
  message_id uuid [ref: > chatbot.messages.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  rating int
  feedback_type varchar(50)
  comment text
  created_at timestamp [default: `now()`]

  indexes {
    (message_id, user_id) [unique]
    message_id
  }
}

// ===== SCHEMA: project - Project Management =====
Table project.projects {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  name varchar(255) [not null]
  description text
  code varchar(50)
  status varchar(50) [default: 'planning']
  priority varchar(20)
  start_date date
  end_date date
  manager_id uuid [ref: > auth.users.id, not null]
  created_by uuid [ref: > auth.users.id, not null]
  budget decimal(15,2)
  progress int [default: 0]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    organization_id
    manager_id
    status
    (organization_id, code) [unique]
  }
}

Table project.project_members {
  id uuid [primary key]
  project_id uuid [ref: > project.projects.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  role_id uuid [ref: > rbac.roles.id]
  joined_at timestamp [default: `now()`]
  is_active boolean [default: true]

  indexes {
    (project_id, user_id) [unique]
    project_id
    user_id
  }
}

Table project.tasks {
  id uuid [primary key]
  project_id uuid [ref: > project.projects.id, not null]
  title varchar(500) [not null]
  description text
  status varchar(50) [default: 'todo']
  priority varchar(20)
  assigned_to uuid [ref: > auth.users.id]
  created_by uuid [ref: > auth.users.id, not null]
  parent_task_id uuid [ref: > project.tasks.id]
  estimated_hours decimal(8,2)
  actual_hours decimal(8,2)
  progress int [default: 0]
  due_date timestamp
  started_at timestamp
  completed_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    project_id
    assigned_to
    status
    parent_task_id
  }
}

Table project.task_comments {
  id uuid [primary key]
  task_id uuid [ref: > project.tasks.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  content text [not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    task_id
    user_id
  }
}

Table project.task_attachments {
  id uuid [primary key]
  task_id uuid [ref: > project.tasks.id, not null]
  file_name varchar(255) [not null]
  file_path text [not null]
  file_size bigint
  uploaded_by uuid [ref: > auth.users.id, not null]
  created_at timestamp [default: `now()`]

  indexes {
    task_id
  }
}

// ===== SCHEMA: billing - Subscription & Billing Management =====
Table billing.subscription_plans {
  id uuid [primary key]
  name varchar(100) [not null]
  code varchar(50) [unique, not null]
  description text
  price_monthly decimal(10,2)
  price_yearly decimal(10,2)
  max_users int
  max_documents int
  max_storage_gb int
  max_projects int
  features jsonb
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    code
    is_active
  }
}

Table billing.subscriptions {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  plan_id uuid [ref: > billing.subscription_plans.id, not null]
  status enum('active','cancelled','expired','trial') [default: 'active']
  billing_cycle varchar(20)
  start_date date [not null]
  end_date date [not null]
  trial_ends_at timestamp
  auto_renew boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    organization_id
    status
  }
}

Table billing.invoices {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  subscription_id uuid [ref: > billing.subscriptions.id, not null]
  invoice_number varchar(50) [unique, not null]
  amount decimal(10,2) [not null]
  tax_amount decimal(10,2) [default: 0]
  total_amount decimal(10,2) [not null]
  currency varchar(3) [default: 'VND']
  status enum('pending','paid','overdue','cancelled') [default: 'pending']
  issue_date date [not null]
  due_date date [not null]
  paid_at timestamp
  payment_method varchar(50)
  payment_reference varchar(255)
  notes text
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    organization_id
    subscription_id
    invoice_number
    status
  }
}

Table billing.payment_methods {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  type enum('credit_card','bank_transfer','e_wallet') [not null]
  details jsonb [not null]
  is_default boolean [default: false]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    organization_id
  }
}

// ===== SCHEMA: analytics - Analytics & Statistics =====
Table analytics.chat_analytics {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id]
  conversation_id uuid [ref: > chatbot.conversations.id]
  message_id uuid [ref: > chatbot.messages.id]
  query_text text
  response_time_ms int
  tokens_used int
  documents_retrieved int
  feedback_rating int
  date date [not null]
  created_at timestamp [default: `now()`]

  indexes {
    organization_id
    date
    user_id
  }
}

Table analytics.document_analytics {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  document_id uuid [ref: > knowledge.documents.id, not null]
  view_count int [default: 0]
  download_count int [default: 0]
  citation_count int [default: 0]
  last_accessed_at timestamp
  date date [not null]
  created_at timestamp [default: `now()`]

  indexes {
    (organization_id, document_id, date) [unique]
    organization_id
    document_id
    date
  }
}

Table analytics.user_activity {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  activity_type varchar(50) [not null]
  metadata jsonb
  date date [not null]
  created_at timestamp [default: `now()`]

  indexes {
    organization_id
    user_id
    date
    activity_type
  }
}

Table analytics.popular_queries {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  query_text text [not null]
  query_count int [default: 1]
  avg_response_time_ms int
  avg_feedback_rating decimal(3,2)
  last_queried_at timestamp
  date date [not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    organization_id
    date
    query_count
  }
}

// ===== SCHEMA: system - System Management & Audit =====
Table system.audit_logs {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id]
  user_id uuid [ref: > auth.users.id]
  action varchar(100) [not null]
  entity_type varchar(100)
  entity_id uuid
  old_values jsonb
  new_values jsonb
  ip_address varchar(45)
  user_agent text
  created_at timestamp [default: `now()`]

  indexes {
    organization_id
    user_id
    entity_type
    action
    created_at
  }
}

Table system.settings {
  id uuid [primary key]
  key varchar(100) [unique, not null]
  value jsonb [not null]
  description text
  is_public boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    key
  }
}

Table system.notifications {
  id uuid [primary key]
  user_id uuid [ref: > auth.users.id, not null]
  type varchar(50) [not null, default: 'info'] // info, warning, success, error, invitation, campaign_result
  title varchar(255) [not null]
  message text [not null]
  content text // HTML rich content from TipTap
  data jsonb
  campaign_id uuid [ref: > system.notification_campaigns.id]
  sender_id uuid [ref: > auth.users.id]
  sender_name varchar(255)
  sender_avatar_url text
  is_read boolean [default: false]
  created_at timestamp [default: `now()`]
  deleted_at timestamp

  indexes {
    user_id
    is_read
    campaign_id
    created_at
  }
}

Table system.notification_campaigns {
  id uuid [primary key]
  sender_id uuid [ref: > auth.users.id, not null]
  title varchar(255) [not null]
  message text [not null]
  content text [not null]
  type varchar(50) [not null, default: 'info']
  target_type enum('ORG_ALL','ORG_ROLE','SPECIFIC_USERS') [not null]
  target_org_id uuid [ref: > tenant.organizations.id]
  target_role_ids uuid[]
  target_user_ids uuid[]
  send_email boolean [default: false]
  status enum('PENDING','PROCESSING','COMPLETED','FAILED') [default: 'PENDING']
  total_recipients int [default: 0]
  sent_count int [default: 0]
  failed_count int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp

  indexes {
    sender_id
    target_org_id
    status
    created_at
  }
}

Table system.system_logs {
  id uuid [primary key]
  level varchar(20) [not null] // debug, info, warning, error, critical
  source varchar(100) [not null]
  message text [not null]
  context jsonb
  created_at timestamp [default: `now()`]

  indexes {
    level
    source
    created_at
  }
}
