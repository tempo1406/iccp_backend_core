// ICCP - Internal Consulting Chatbot Platform
// Database Schema Organization for Multi-tenant RAG System

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
settings jsonb // org settings + branding: { brandColor, botName, botPersona }
contact_email varchar(255) // email liên hệ công khai
timezone varchar(100) // IANA timezone, e.g. Asia/Ho_Chi_Minh
website varchar(500) // website chính thức
created_at timestamp [default: `now()`]
updated_at timestamp [default: `now()`]

indexes {
slug
owner_id
is_active
}

note: '''
  settings JSONB structure (branding):
  {
    "brandColor": "#3B82F6",   // hex color cho chatbot widget
    "botName": "ICCP Assistant", // tên hiển thị của bot
    "botPersona": "friendly"   // friendly | professional | concise
  }
  Migration: 1764100000000-AddOrgProfileColumns
'''
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

// ===== LANDING PAGE / SITE STUDIO =====
// organization_landing_pages:
// - mỗi organization có đúng 1 landing page "active"
// - public page được resolve qua organization.slug -> /v1/organizations/:slug/landing-page
// - blocks giữ lại cho backward compatibility; FE hiện chủ yếu dùng raw_html + project_data
Table tenant.organization_landing_pages {
id uuid [primary key]
organization_id uuid [ref: > tenant.organizations.id, not null, unique]
blocks jsonb [default: '[]'] // legacy block snapshot
raw_html text // HTML đầy đủ để publish/render
project_data text // serialized GrapesJS project data
is_published boolean [default: false]
created_at timestamp [default: `now()`]
updated_at timestamp [default: `now()`]

indexes {
organization_id [unique]
}

note: '''
  Module: src/modules/organization/landing-page
  Migrations:
  - 1765000000000-CreateOrganizationLandingPages
  - 1765200000000-RevertLandingPageToSinglePage
  - 1765400000000-AddRawHtmlProjectDataToLandingPage

  Current model is single active landing page per organization.
  Historical multi-page fields (slug, name per page) were reverted by migration 1765200000000.
'''
}

// organization_landing_page_templates:
// - thư viện page templates riêng của từng organization
// - dùng cho Site Studio editor khi save as template / reuse template
Table tenant.organization_landing_page_templates {
id uuid [primary key]
organization_id uuid [ref: > tenant.organizations.id, not null]
name varchar(255) [default: 'Untitled Page']
html text
project_data text
thumbnail_url text
created_at timestamp [default: `now()`]
updated_at timestamp [default: `now()`]

indexes {
organization_id
}

note: '''
  Migration: 1765500000000-CreateOrganizationLandingPageTemplates
  1 organization có thể có nhiều templates.
'''
}

// organization_landing_page_drafts:
// - draft editor theo session user trong 1 organization
// - unique theo (organization_id, user_id)
// - dùng để autosave canvas chưa publish trong Site Studio
Table tenant.organization_landing_page_drafts {
id uuid [primary key]
organization_id uuid [ref: > tenant.organizations.id, not null]
user_id uuid [ref: > auth.users.id, not null]
raw_html text
project_data text
ai_conversation jsonb [default: '[]'] // conversation messages snapshot
current_template_id uuid [ref: > tenant.organization_landing_page_templates.id]
source varchar(32) [default: 'scratch'] // active | template | scratch
pending_draft jsonb // reserved for partial AI draft metadata
created_at timestamp [default: `now()`]
updated_at timestamp [default: `now()`]

indexes {
(organization_id, user_id) [unique]
organization_id
user_id
current_template_id
}

note: '''
  Migration: 1765600000000-CreateOrganizationLandingPageDrafts
  Draft scope là per-user-per-organization để nhiều member có thể chỉnh song song mà không đè nhau.
  Table này lưu editor session state; không phải published landing page content chính thức.
'''
}

// ===== SCHEMA: rbac - Role-Based Access Control =====
Table rbac.permissions {
id uuid [primary key]
code varchar(100) [unique, not null] // e.g., "documents.create", "projects.delete"
name varchar(255) [not null]
description text
module varchar(50) [not null] // documents, projects, users, chatbot, analytics
created_at timestamp [default: `now()`]

indexes {
code
module
}
}

Table rbac.roles {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id] // null if system-level role
  project_id uuid [ref: > project.projects.id] // null for org/system role; not null for project-scoped role definition
  name varchar(100) [not null]
  description text
  is_system_role boolean [default: false] // true for system_admin, org_admin, user
  created_by uuid [ref: > auth.users.id] // null if system role
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp // soft delete

  indexes {
    (organization_id, project_id)
    (organization_id, name) [unique] // only for project_id IS NULL and organization_id IS NOT NULL
    (organization_id, project_id, name) [unique] // only for project_id IS NOT NULL
    name [unique] // only for organization_id IS NULL and project_id IS NULL
    organization_id
    project_id
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
organization_id uuid [ref: > tenant.organizations.id] // null nếu là system-level role assignment
role_id uuid [ref: > rbac.roles.id, not null]
scope_type enum('organization','project') [default: 'organization'] // organization, project
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

// document_folders: cây thư mục để tổ chức tài liệu theo dạng file-system
// - organization_id null = system-level folder (chỉ system admin quản lý)
// - parent_id null = root folder
// - path = "parentId.childId.grandchildId" dùng để query subtree nhanh (materialized path)
Table knowledge.document_folders {
id uuid [primary key]
organization_id uuid [ref: > tenant.organizations.id] // nullable: null = system level
project_id uuid [ref: > project.projects.id] // nullable: scope within project
name varchar(255) [not null]
description text
parent_id uuid [ref: > knowledge.document_folders.id] // null = root folder
path text // materialized path: "uuid1.uuid2.uuid3" for fast subtree query
sort_order int [default: 0]
is_system boolean [default: false] // "Recovery" protection
original_parent_id uuid [ref: > knowledge.document_folders.id] // for restore
created_by uuid [ref: > auth.users.id, not null]
created_at timestamp [default: `now()`]
updated_at timestamp [default: `now()`]
deleted_at timestamp // soft delete
deleted_by uuid [ref: > auth.users.id]

indexes {
organization_id
project_id
parent_id
path
}
}

// document_categories: nhãn phân loại tài liệu (phẳng, không có cây)
// ví dụ: HR, IT, Finance, Legal, Policy, Technical, Other
// - organization_id null = system-level category (áp dụng cho mọi org)
Table knowledge.document_categories {
id uuid [primary key]
organization_id uuid [ref: > tenant.organizations.id] // nullable: null = system level
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
organization_id uuid [ref: > tenant.organizations.id] // nullable: null = system level (uploaded by system admin)
folder_id uuid [ref: > knowledge.document_folders.id] // thư mục chứa tài liệu, nullable = root / chưa phân loại folder
category_id uuid [ref: > knowledge.document_categories.id] // nhãn phân loại, nullable = chưa gán category
title varchar(500) [not null]
description text
file_name varchar(255)
file_path text [not null] // ImageKit URL hoặc storage path
file_size bigint // in bytes
file_type varchar(50) // pdf, docx, txt, xlsx, etc.
mime_type varchar(100)
uploaded_by uuid [ref: > auth.users.id, not null]
status varchar(50) [default: 'not_indexed'] // not_indexed, pending, processing, indexed, failed
access_scope varchar(50) [default: 'organization'] // system, organization, project, role, user
metadata jsonb // custom metadata (tags, extra info...)
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
access_id uuid [not null] // user_id, project_id or role_id
permission varchar(50) [not null, default: 'view'] // view, download, upload, edit, manage
created_at timestamp [default: `now()`]

indexes {
(document_id, access_type, access_id, permission) [unique]
document_id
(document_id, permission)
}
}

Table knowledge.folder_access_rules {
id uuid [primary key]
folder_id uuid [ref: > knowledge.document_folders.id, not null]
access_type varchar(50) [not null] // user, project, role
access_id uuid [not null] // user_id, project_id or role_id
permission varchar(50) [not null, default: 'view'] // view, download, upload, edit, manage
created_at timestamp [default: `now()`]

indexes {
(folder_id, access_type, access_id, permission) [unique]
folder_id
(folder_id, permission)
}
}

Table knowledge.document_chunks {
id uuid [primary key]
document_id uuid [ref: > knowledge.documents.id, not null]
chunk_index int [not null]
content text [not null]
embedding vector(768) // Gemini embedding dimension
token_count int
metadata jsonb // page number, section, etc.
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
title varchar(500) // auto-generated from first message
context_scope varchar(50) [default: 'organization'] // organization, project
context_id uuid // project_id if scope = 'project'
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
metadata jsonb // model info, tokens used, etc.
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
rating int // 1-5 or thumbs up/down
feedback_type varchar(50) // helpful, not_helpful, inaccurate, etc.
comment text
created_at timestamp [default: `now()`]

indexes {
(message_id, user_id) [unique]
message_id
}
}

// ===== SCHEMA: chat - Team Chat Collaboration =====
// Note 2026-03-22: Chat-box entity source files were reorganized into feature folders
// (`room-management`, `message-management`, `presence`, `core`, `realtime`,
// `notifications`) for codebase convention alignment. Database schema is unchanged.
Table chat.rooms {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_type enum('channel','dm','group_dm') [default: 'channel']
  visibility enum('public','private') [default: 'public']
  name varchar(255)
  room_key varchar(255)
  topic text
  description text
  context_scope enum('organization','project','department') [default: 'organization']
  context_id uuid
  created_by uuid [ref: > auth.users.id, not null]
  owner_id uuid [ref: > auth.users.id]
  last_message_id uuid [ref: > chat.messages.id]
  last_message_at timestamp
  is_archived boolean [default: false]
  archived_at timestamp
  archived_by_user_id uuid [ref: > auth.users.id]
  allow_member_pin_messages boolean [default: false] // dm/group_dm duoc backfill true trong migration (idempotent)
  allow_guest_pin_messages boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id, room_key) [unique]
    (organization_id, room_type, is_archived)
    (organization_id, context_scope, context_id)
    (organization_id, last_message_at)
  }
}

Table chat.room_members {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_id uuid [ref: > chat.rooms.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  member_role enum('owner','admin','member','guest') [default: 'member']
  join_source enum('manual','invite','auto','import') [default: 'manual']
  is_active boolean [default: true]
  joined_at timestamp [default: `now()`]
  left_at timestamp
  notify_level enum('all','mentions','mute') [default: 'all']
  mute_until timestamp
  is_hidden boolean [default: false]
  hidden_reason varchar(50) // mute_and_hide, manual_hide
  hidden_at timestamp
  is_starred boolean [default: false]
  starred_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (room_id, user_id) [unique]
    (organization_id, user_id, is_active)
    (organization_id, user_id, is_starred, is_active)
    (organization_id, user_id, is_hidden, is_active)
    (room_id, member_role)
  }
}

Table chat.room_tabs {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_id uuid [ref: > chat.rooms.id, not null]
  tabs jsonb [not null, default: '[]'] // [{ id, order, hidden }]
  updated_by uuid [ref: > auth.users.id, not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id, room_id) [unique]
    (organization_id, room_id)
  }
}

Table chat.room_invitations {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_id uuid [ref: > chat.rooms.id, not null]
  email varchar(255)
  invited_user_id uuid [ref: > auth.users.id, not null]
  invited_by uuid [ref: > auth.users.id, not null]
  invite_message text
  member_role enum('owner','admin','member','guest') [default: 'member'] // role se ap dung khi user accept invitation (migration co fallback tao enum neu local DB thieu type chat_member_role_enum)
  status enum('pending','accepted','expired','cancelled','revoked') [default: 'pending']
  accepted_at timestamp
  cancelled_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (room_id, status)
    (organization_id, invited_user_id, status)
  }
}

Table chat.messages {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_id uuid [ref: > chat.rooms.id, not null]
  sender_id uuid [ref: > auth.users.id]
  message_type enum('text','system','file','image','event') [default: 'text']
  content text
  rich_content jsonb
  thread_root_message_id uuid [ref: > chat.messages.id]
  parent_message_id uuid [ref: > chat.messages.id]
  client_message_id varchar(100)
  reply_count int [default: 0]
  reaction_count int [default: 0]
  is_edited boolean [default: false]
  edited_at timestamp
  is_deleted boolean [default: false]
  deleted_at timestamp
  metadata jsonb // message metadata (mention/link-preview/forward snapshot payload)
  sent_at timestamp [default: `now()`]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (room_id, sender_id, client_message_id) [unique]
    (room_id, sent_at)
    (thread_root_message_id, sent_at)
    (organization_id, sent_at)
  }

  note: '''
    Forward payload contract update (2026-04-12, no schema change):
    - metadata.source = "forward"
    - metadata.forwardedFromMessageId / forwardedFromRoomId / forwardedFromConversationKey
    - metadata.forwardedSnapshot canonical keys:
      originalMessageId, originalContent,
      originalSenderId, originalSenderEmail, originalSenderFirstName,
      originalSenderLastName, originalSenderDisplayName, originalSenderAvatarUrl,
      originalSentAt, sourceConversationKey, sourceConversationLabel,
      sourceConversationVisibility, attachments[]
    - Forwarded text message content semantics:
      with note => content = note only
      without note => content = ""
  '''
}

Table chat.message_drafts {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_id uuid [ref: > chat.rooms.id, not null]
  author_user_id uuid [ref: > auth.users.id, not null]
  thread_root_message_id uuid [ref: > chat.messages.id]
  parent_message_id uuid [ref: > chat.messages.id]
  content text
  rich_content jsonb
  metadata jsonb
  draft_source enum('composer_autosave','cancelled_schedule','manual_save') [default: 'composer_autosave']
  last_composer_activity_at timestamp [default: `now()`]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id, author_user_id, updated_at)
    (organization_id, room_id, author_user_id, updated_at)
    (organization_id, room_id, author_user_id, thread_root_message_id, parent_message_id) [unique, note: 'uses COALESCE for nullable context columns']
  }
}

Table chat.scheduled_messages {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_id uuid [ref: > chat.rooms.id, not null]
  author_user_id uuid [ref: > auth.users.id, not null]
  thread_root_message_id uuid [ref: > chat.messages.id]
  parent_message_id uuid [ref: > chat.messages.id]
  content text
  rich_content jsonb
  metadata jsonb
  scheduled_for_utc timestamp [not null]
  scheduled_timezone varchar(100) [not null]
  scheduled_local_date varchar(20) [not null]
  scheduled_local_time varchar(20) [not null]
  status enum('pending','processing','sent','cancelled','converted_to_draft','failed') [default: 'pending']
  source_draft_id uuid [ref: > chat.message_drafts.id]
  sent_message_id uuid [ref: > chat.messages.id]
  last_error_code varchar(120)
  last_error_message text
  sent_at timestamp
  cancelled_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (status, scheduled_for_utc)
    (author_user_id, status, scheduled_for_utc)
    (room_id, status, scheduled_for_utc)
  }
}

Table chat.message_attachments {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  message_id uuid [ref: > chat.messages.id, not null]
  attachment_type enum('file','image','video','audio')
  file_name varchar(255) [not null]
  file_url text [not null]
  mime_type varchar(150)
  file_size bigint
  checksum varchar(128)
  width int
  height int
  duration_ms int
  document_type varchar(32) // word, excel, powerpoint, pdf, text, archive, unknown
  preview_status varchar(20) // pending, ready, failed
  preview_thumbnail_url text
  preview_url text
  preview_width int
  preview_height int
  preview_page int
  page_count int
  preview_error_code varchar(120)
  preview_updated_at timestamp
  created_at timestamp [default: `now()`]

  indexes {
    message_id
    (organization_id, attachment_type)
  }
}

Table chat.message_reactions {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  message_id uuid [ref: > chat.messages.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  emoji varchar(32) [not null]
  created_at timestamp [default: `now()`]

  indexes {
    (message_id, user_id, emoji) [unique]
    message_id
    (user_id, created_at)
  }
}

Table chat.message_mentions {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  message_id uuid [ref: > chat.messages.id, not null]
  mentioned_user_id uuid [ref: > auth.users.id, not null]
  mention_type enum('user','channel','here') [default: 'user']
  is_read boolean [default: false]
  read_at timestamp
  created_at timestamp [default: `now()`]

  indexes {
    (message_id, mentioned_user_id, mention_type) [unique]
    (mentioned_user_id, is_read, created_at)
    (organization_id, mentioned_user_id)
  }
}

Table chat.message_pins {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_id uuid [ref: > chat.rooms.id, not null]
  message_id uuid [ref: > chat.messages.id, not null]
  pinned_by uuid [ref: > auth.users.id, not null]
  pinned_at timestamp [default: `now()`]
  is_active boolean [default: true]
  unpinned_at timestamp

  indexes {
    (room_id, message_id) [unique]
    (room_id, is_active, pinned_at)
  }
}

Table chat.read_states {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  room_id uuid [ref: > chat.rooms.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  last_read_message_id uuid [ref: > chat.messages.id]
  last_read_at timestamp
  unread_count_cache int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (room_id, user_id) [unique]
    (organization_id, user_id)
    (organization_id, user_id, room_id, last_read_at)
    (user_id, updated_at)
  }
}

Table chat.user_presence {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  presence_status enum('online','away','dnd','offline') [default: 'offline']
  custom_status text
  custom_emoji varchar(32)
  last_seen_at timestamp
  last_activity_at timestamp
  source varchar(50)
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id, user_id) [unique]
    (organization_id, presence_status)
    last_activity_at
  }
}

// ===== SCHEMA: project - Project Management =====
Table project.projects {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  name varchar(255) [not null]
  description text
  slug varchar(255) [not null] // auto-generated from project name initials (uppercase), unique per organization
  status enum('planning','active','on_hold','completed','cancelled') [default: 'planning']
  priority enum('low','medium','high','critical') [default: 'medium']
  start_date date
  end_date date
  manager_id uuid[] // nullable, list of project manager user ids
  created_by uuid [ref: > auth.users.id, not null]
  estimated_budget decimal(15,2)
  actual_budget decimal(15,2)
  budget_currency enum('USD','VND') [default: 'VND']
  progress int [default: 0] // 0-100%
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
  deleted_by uuid [ref: > auth.users.id]

  indexes {
    slug
    (organization_id, slug) [unique] // unique for active rows (`deleted_at IS NULL`)
  }
}
Table project.project_members {
  id uuid [primary key]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  role_id uuid [ref: > rbac.roles.id] // project-specific RBAC role, nullable
  allocated_hours_per_day decimal(4,2) // null = no specific allocation → fallback to org_working_time_configs. Valid range: 0.5..24.0
  joined_at timestamp [default: `now()`]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
  deleted_by uuid [ref: > auth.users.id]

  indexes {
    (project_id, user_id) [unique]
    project_id
    organization_id
    user_id
  }
}
Table project.tasks {
  id uuid [primary key]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  title varchar(500) [not null]
  slug varchar(80) [unique] // task slug generated from project slug counter
  parent_task_id uuid [ref: > project.tasks.id] // for subtasks
  description text
  status_id uuid [ref: > project.status_tasks.id] // source of truth for task status
  priority enum('low','medium','high','urgent') [default: 'medium']
  assigned_to uuid [ref: > auth.users.id]
  created_by uuid [ref: > auth.users.id, not null]
  due_date timestamp
  started_at timestamp
  completed_at timestamp
  estimated_point int // story points — only PM/Org Admin can set
  estimated_hours decimal(6,2) // estimated hours — only PM/Org Admin can set
  actual_start timestamp
  actual_end timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
  deleted_by uuid [ref: > auth.users.id]

  indexes {
    project_id
    organization_id
    slug
    assigned_to
    status_id
    parent_task_id
  }
}

Table project.task_comments {
  id uuid [primary key]
  task_id uuid [ref: > project.tasks.id, not null]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  parent_comment_id uuid [ref: > project.task_comments.id] // reply thread
  author_id uuid [ref: > auth.users.id, not null]
  author_role enum('manager','assignee') [not null]
  content text [not null]
  created_at timestamp [default: `now()`]
  deleted_at timestamp // soft delete
  deleted_by uuid [ref: > auth.users.id]

  indexes {
    task_id
    project_id
    organization_id
    parent_comment_id
    author_id
  }
}

Table project.task_attachments {
  id uuid [primary key]
  task_id uuid [ref: > project.tasks.id, not null]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  file_name varchar(255) [not null]
  file_url text [not null]
  mime_type varchar(150)
  file_size int
  uploaded_by uuid [ref: > auth.users.id, not null]
  created_at timestamp [default: `now()`]

  indexes {
    task_id
    project_id
    organization_id
  }
}

// ===== SCHEMA: billing - Subscription & Billing Management =====
Table billing.subscription_plans {
  id uuid [primary key]
  name varchar(100) [not null] // Starter, Standard, Enterprise
  code varchar(50) [unique, not null]
  description text
  price_monthly decimal(10,2)
  price_yearly decimal(10,2)
  max_users int
  max_documents int
  max_storage_gb int // in GB
  max_projects int
  trial_days int [default: 0]
  features jsonb // array of features
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
  status enum('active','pending_payment','cancelled','expired','trial') [default: 'active']
  billing_cycle varchar(20) // monthly, yearly; nullable for perpetual free plan
  start_date date // nullable for perpetual free plan
  end_date date // nullable for perpetual free plan
  trial_ends_at timestamp
  // auto_renew removed in current implementation by migration 1743100000000
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

Table billing.payment_transactions {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  subscription_id uuid [ref: > billing.subscriptions.id]
  invoice_id uuid [ref: > billing.invoices.id]
  order_code bigint [unique, not null]
  amount decimal(12,2) [not null]
  currency varchar(3) [default: 'VND']
  description varchar(500)
  status enum('pending','paid','cancelled','refunded','failed') [default: 'pending']
  payos_response jsonb
  checkout_url varchar(500)
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    organization_id
    subscription_id
    invoice_id
    order_code
    status
  }
}

// Legacy note: `billing.payment_methods` is kept below as historical/planned schema only.
// Current implementation drops this table via migration 1743100000000.
Table billing.payment_methods {
id uuid [primary key]
organization_id uuid [ref: > tenant.organizations.id, not null]
type enum('credit_card','bank_transfer','e_wallet') [not null]
details jsonb [not null] // encrypted payment details
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
activity_type varchar(50) [not null] // login, document_view, chat, task_update
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
action varchar(100) [not null] // create, update, delete, login, etc.
entity_type varchar(100) // users, documents, projects, etc.
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
  content text // HTML rich content from TipTap (from campaign)
  data jsonb // extra payload, e.g. { token } for invitation type
  campaign_id uuid [ref: > system.notification_campaigns.id] // null if not from campaign
  sender_id uuid [ref: > auth.users.id] // null for system notifications
  sender_name varchar(255) // denormalized from sender at send time
  sender_avatar_url text // denormalized from sender at send time
  idempotency_key varchar(255) [unique] // dedup key, e.g. "deadline:task_overdue:{taskId}:{dueDate}"
  is_read boolean [default: false]
  created_at timestamp [default: `now()`]
  deleted_at timestamp // soft delete

  indexes {
    user_id
    is_read
    campaign_id
    created_at
    idempotency_key
  }
}

Table system.notification_campaigns {
id uuid [primary key]
sender_id uuid [ref: > auth.users.id, not null]
title varchar(255) [not null]
message text [not null] // plain-text summary shown in list
content text [not null] // HTML rich content from TipTap
type varchar(50) [not null, default: 'info'] // info, warning, success, error
target_type enum('ORG_ALL', 'ORG_ROLE', 'SPECIFIC_USERS') [not null]
target_org_id uuid [ref: > tenant.organizations.id] // required for ORG_ALL and ORG_ROLE
target_role_ids uuid[] // [ref: > rbac.roles.id] — required for ORG_ROLE
target_user_ids uuid[] // [ref: > auth.users.id] — required for SPECIFIC_USERS
send_email boolean [default: false]
status enum('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') [default: 'PENDING']
total_recipients int [default: 0]
sent_count int [default: 0]
failed_count int [default: 0]
created_at timestamp [default: `now()`]
updated_at timestamp [default: `now()`]
deleted_at timestamp // soft delete

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
source varchar(100) [not null] // service name or module
message text [not null]
context jsonb
created_at timestamp [default: `now()`]

indexes {
level
source
created_at
}
}
// ===== SCHEMA: tenant — Ticket Request Module =====

// ticket*requests: bảng chính lưu mọi yêu cầu của nhân viên
// - type: leave | wfh | overtime | advance | general
// - workflow_code: working_time | overtime_opic | overtime_standard_direct (legacy overtime_standard chi dung de migration compatibility)
// - migration compatibility note (2026-04-04): backfill migration se tu detect enum label co san
//   va fallback giua overtime_standard / overtime_standard_direct de tranh loi
//   "unsafe use of new enum value ... (55P04)" trong cung transaction
// - migration compatibility note (176320): khi migrate bo enum `overtime_standard`,
//   can map bang `workflow_code::text` trong `ALTER COLUMN ... USING` thay vi
//   so sanh enum literal truc tiep de tranh loi `22P02` tren DB da loai label cu
// - status: pending_approval | changes_requested | approved | rejected | canceled
// - delegate_id: người cần hành động TIẾP THEO (FE dùng field này để xác định ai đang giữ bóng)
// - approver_id: người được chỉ định ban đầu cho step hiện tại (thường = delegate_id)
// - effort_owner_id: người khai báo OT effort (chỉ dùng cho workflow overtime*\*)
// - ot_metadata: JSONB chứa dữ liệu đặc thù OT (PM điền lúc tạo, effortOwner điền lúc declare)
Table tenant.ticket_requests {
id uuid [primary key]
organization_id uuid [ref: > tenant.organizations.id, not null]
code varchar(40) [not null, note: 'Format: TR-YYYYMMDD-NNNNNN, unique per org']

type enum('leave','wfh','overtime','advance','general') [not null]
workflow_code enum('working_time','overtime_opic','overtime_standard_direct') [not null, default: 'working_time', note: 'Legacy value overtime_standard chi la trang thai trung gian cua migration chain']
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
projectId?: string, -- PM điền lúc tạo
plannedHours?: number, -- PM điền lúc tạo
effortEntries?: [ -- effortOwner điền ở bước PROJECT_MEMBER_DECLARE_OT
{ date, hours, taskDescription, workDescription? }
],
totalActualHours?: number, -- effortOwner điền
effortDetail?: string -- effortOwner điền
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

- submitted: { fromStepCode, toStepCode, nextDelegateId }
- approved: { fromStepCode, toStepCode, note, nextApproverId }
- rejected: { reason }
- cc_added: { memberId }
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

Table project.project_invites {
  id uuid [primary key]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  invitee_user_id uuid [ref: > auth.users.id, not null]
  inviter_user_id uuid [ref: > auth.users.id, not null]
  role enum('pm','member') [default: 'pm']
  status enum('pending','accepted','rejected','canceled') [default: 'pending']
  token varchar(255) [unique]
  expires_at timestamp
  accepted_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
  deleted_by uuid [ref: > auth.users.id]

  indexes {
    project_id
    organization_id
    invitee_user_id
    inviter_user_id
    status
    token
  }
}

Table project.status_tasks {
  id uuid [primary key]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  name varchar(120) [not null]
  order_index int [not null]
  is_default boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
  deleted_by uuid [ref: > auth.users.id]

  indexes {
    project_id
    organization_id
    order_index
  }
}

Table project.task_slug_counters {
  id uuid [primary key]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  next_value int [default: 1]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (project_id) [unique]
    project_id
  }
}

Table project.task_histories {
  id uuid [primary key]
  task_id uuid [ref: > project.tasks.id, not null]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  action enum(
    'create',
    'status_change',
    'description_change',
    'comment_add',
    'tag_add',
    'tag_remove',
    'attachment_add',
    'attachment_remove'
  ) [not null]
  from_value text
  to_value text
  metadata jsonb
  actor_id uuid [ref: > auth.users.id, not null]
  actor_display_name varchar(255) [not null]
  created_at timestamp [default: `now()`]

  indexes {
    task_id
    project_id
    organization_id
    action
    actor_id
  }
}

Table project.task_tags {
  id uuid [primary key]
  task_id uuid [ref: > project.tasks.id, not null]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  name varchar(50) [not null]
  normalized_name varchar(50) [not null]
  created_by uuid [ref: > auth.users.id, not null]
  created_at timestamp [default: `now()`]

  indexes {
    (task_id, normalized_name) [unique]
    task_id
  }
}

Table project.task_comment_mentions {
  id uuid [primary key]
  comment_id uuid [ref: > project.task_comments.id, not null]
  task_id uuid [ref: > project.tasks.id, not null]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  mentioned_user_id uuid [ref: > auth.users.id, not null]
  created_at timestamp [default: `now()`]

  indexes {
    (comment_id, mentioned_user_id) [unique]
    comment_id
    task_id
    mentioned_user_id
  }
}

Table project.task_comment_reactions {
  id uuid [primary key]
  comment_id uuid [ref: > project.task_comments.id, not null]
  task_id uuid [ref: > project.tasks.id, not null]
  project_id uuid [ref: > project.projects.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  reaction varchar(64) [not null]
  created_at timestamp [default: `now()`]

  indexes {
    (comment_id, user_id, reaction) [unique]
    comment_id
    task_id
    user_id
    reaction
  }
}

// ===== SCHEMA: project — KPI & Meeting Settings per Project =====
Table project.project_configs {
  id uuid [primary key]
  project_id uuid [ref: > project.projects.id, unique, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]

  // Meeting: Daily Standup
  daily_enabled boolean [default: false]
  daily_time time // HH:MM
  daily_days int[] [default: '[1,2,3,4,5]'] // 1=Mon..7=Sun
  daily_reminder_minutes int [default: 15]

  // Meeting: Weekly Review
  weekly_enabled boolean [default: false]
  weekly_day int [default: 5]
  weekly_time time
  weekly_reminder_minutes int [default: 30]

  // Reminder: Task Deadline
  task_due_reminder_enabled boolean [default: true]
  task_due_reminder_hours int[] [default: '[24,2]']
  reminder_channels text[] [default: '["push_notification","in_app"]']
  overdue_escalation_enabled boolean [default: false]
  overdue_escalation_after_hours int [default: 4]

  // Point Scale
  point_scale_type varchar(20) // fibonacci | linear | custom
  point_scale_values int[]
  max_point_per_task int

  // KPI Weights (null = inherit from tenant.org_settings)
  kpi_weight_point_completion decimal(4,3)
  kpi_weight_on_time decimal(4,3)
  kpi_weight_ot_contribution decimal(4,3)

  // Bonus Rules (null = inherit from tenant.org_settings)
  bonus_enabled boolean
  bonus_on_time_task decimal(5,2)
  bonus_early_task_hours int
  bonus_early_task decimal(5,2)
  bonus_zero_overdue decimal(5,2)
  bonus_max_cap decimal(5,2)
  bonus_ot_per_effective_hour decimal(5,2)

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (project_id) [unique]
    organization_id
  }
}

// ===== SCHEMA: tenant — Org-level KPI, OT Multiplier & Bonus Defaults =====
Table tenant.org_settings {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, unique, not null]

  // KPI Weights (used when project_configs fields are null)
  default_weight_point_completion decimal(4,3) [default: 0.5]
  default_weight_on_time decimal(4,3) [default: 0.3]
  default_weight_ot_contribution decimal(4,3) [default: 0.2]

  // OT Multipliers (for KPI effective OT hours calculation)
  ot_multiplier_weekday decimal(4,2) [default: 1.0]
  ot_multiplier_saturday decimal(4,2) [default: 1.5]
  ot_multiplier_sunday decimal(4,2) [default: 2.0]
  ot_multiplier_holiday decimal(4,2) [default: 3.0]

  // Default Bonus Rules (inherited by project_configs when null)
  bonus_enabled boolean [default: false]
  bonus_on_time_task decimal(5,2) [default: 0.5]
  bonus_early_task_hours int [default: 24]
  bonus_early_task decimal(5,2) [default: 1.0]
  bonus_zero_overdue decimal(5,2) [default: 2.0]
  bonus_max_cap decimal(5,2) [default: 10.0]
  bonus_ot_per_effective_hour decimal(5,2) [default: 0.2]

  // Notification Defaults
  default_reminder_channels text[] [default: '["push_notification","in_app"]']

  // KPI Digest
  digest_enabled boolean [default: false]
  digest_day int [default: 1] // 1=Monday
  digest_time time [default: '08:00']
  digest_recipients text[] [default: '["org_admin"]']
  digest_channels text[] [default: '["email","in_app"]']

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id) [unique]
  }
}

// ===== SCHEMA: tenant — Working Hours per Day of Week =====
Table tenant.org_working_time_configs {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, unique, not null]

  monday_hours decimal(4,2) [default: 8.0]
  tuesday_hours decimal(4,2) [default: 8.0]
  wednesday_hours decimal(4,2) [default: 8.0]
  thursday_hours decimal(4,2) [default: 8.0]
  friday_hours decimal(4,2) [default: 8.0]
  saturday_hours decimal(4,2) [default: 0.0]
  sunday_hours decimal(4,2) [default: 0.0]

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id) [unique]
  }
}

// ===== SCHEMA: tenant — Org Holidays =====
// working_hours: 0 = full day off, 4 = half day
Table tenant.org_holidays {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  date date [not null] // YYYY-MM-DD
  name varchar(255) [not null]
  type enum('national_holiday','company_holiday','special_day') [default: 'national_holiday']
  working_hours decimal(4,2) [default: 0.0]

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp // soft delete

  indexes {
    (organization_id, date) [unique]
    organization_id
  }
}

// ===== SCHEMA: tenant - Landing Page Leads =====
Table tenant.organization_landing_page_leads {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  landing_page_id uuid [ref: > tenant.organization_landing_pages.id]
  form_type varchar(100) [default: 'lead']
  form_name varchar(255)
  full_name varchar(255)
  email varchar(255)
  phone varchar(50)
  message text
  page_url text
  fields jsonb
  submitted_at timestamp
  created_at timestamp [default: `now()`]

  indexes {
    organization_id
  }
}

// ===== SCHEMA: project - Daily Reports =====
Table project.daily_reports {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  project_id uuid [ref: > project.projects.id]
  user_id uuid [ref: > auth.users.id, not null]
  report_date date [not null]
  status varchar(20) [default: 'draft']
  summary text
  blockers text
  plan_tomorrow text
  total_logged_minutes int [default: 0]
  submitted_at timestamp
  seen_by uuid [ref: > auth.users.id]
  seen_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (organization_id, project_id, user_id, report_date) [unique]
    (organization_id, project_id, report_date)
  }
}

Table project.daily_report_items {
  id uuid [primary key]
  daily_report_id uuid [ref: > project.daily_reports.id, not null]
  type varchar(20) [default: 'worklog']
  worklog_id uuid [ref: > project.task_worklogs.id]
  project_id uuid [ref: > project.projects.id]
  task_id uuid [ref: > project.tasks.id]
  project_name_snapshot varchar(255)
  task_title_snapshot varchar(500)
  task_slug_snapshot varchar(80)
  content text
  work_date date [not null]
  started_at timestamp
  ended_at timestamp
  duration_minutes int [default: 0]
  progress_percent int
  is_blocker boolean [default: false]
  display_order int [default: 0]
  created_at timestamp [default: `now()`]

  indexes {
    (daily_report_id, display_order)
  }
}

Table project.daily_report_comments {
  id uuid [primary key]
  daily_report_id uuid [ref: > project.daily_reports.id, not null]
  author_id uuid [ref: > auth.users.id, not null]
  content text [not null]
  created_at timestamp [default: `now()`]

  indexes {
    (daily_report_id, created_at)
  }
}

// ===== SCHEMA: project - Task Worklogs =====
Table project.task_worklogs {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  project_id uuid [ref: > project.projects.id, not null]
  task_id uuid [ref: > project.tasks.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  work_date date [not null]
  started_at timestamp
  ended_at timestamp
  duration_minutes int [not null]
  description text
  progress_percent int
  is_blocker boolean [default: false]
  source varchar(20) [default: 'manual']
  reported_daily_report_id uuid [ref: > project.daily_reports.id]
  is_submitted boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp

  indexes {
    (task_id, work_date)
    (organization_id, user_id, work_date)
  }
}

// ===== SCHEMA: tenant - KPI Targets =====
Table tenant.kpi_targets {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  project_id uuid [ref: > project.projects.id]
  scope_type varchar(20) [default: 'user']
  user_id uuid [ref: > auth.users.id]
  role_id uuid [ref: > rbac.roles.id]
  period varchar(20) [default: 'monthly']
  period_start date [not null]
  period_end date [not null]
  target_score decimal(5,2)
  target_point_completion_rate decimal(5,2)
  target_on_time_rate decimal(5,2)
  target_ot_hours decimal(6,2)
  target_completed_tasks int
  max_overdue_tasks int
  require_zero_overdue boolean [default: false]
  status varchar(20) [default: 'active']
  note text
  assigned_by uuid [ref: > auth.users.id]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
  deleted_by uuid [ref: > auth.users.id]

  indexes {
    (organization_id, scope_type)
    (organization_id, user_id)
    (organization_id, role_id)
    project_id
    (period_start, period_end)
  }
}

Table tenant.kpi_target_snapshots {
  id uuid [primary key]
  target_id uuid [ref: > tenant.kpi_targets.id, not null]
  actual_score decimal(5,2)
  actual_on_time_rate decimal(5,2)
  actual_point_completion_rate decimal(5,2)
  actual_ot_hours decimal(6,2)
  actual_completed_tasks int
  actual_overdue_tasks int
  actual_payload jsonb
  archived_at timestamp [default: `now()`]

  indexes {
    target_id [unique]
  }
}

// ===== SCHEMA: tenant - Periodic Reports =====
Table tenant.report_runs {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  report_type varchar(50) [not null]
  frequency varchar(20) [not null]
  period_key varchar(20) [not null]
  period_start date [not null]
  period_end date [not null]
  status varchar(30) [default: 'pending']
  scheduled_for timestamptz [not null]
  attempt_count int [default: 0]
  success_count int [default: 0]
  failed_count int [default: 0]
  next_retry_at timestamptz
  last_attempt_at timestamptz
  summary_snapshot jsonb
  artifact_snapshot jsonb
  resolved_recipient_snapshot jsonb
  successful_recipient_snapshot jsonb
  pending_recipient_snapshot jsonb
  last_error text
  sent_at timestamptz
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (report_type, status, scheduled_for)
    (report_type, next_retry_at)
    (organization_id, report_type, frequency, period_key) [unique]
  }
}

Table tenant.report_delivery_attempts {
  id uuid [primary key]
  report_run_id uuid [ref: > tenant.report_runs.id, not null]
  attempt_no int [not null]
  trigger_source varchar(20) [not null]
  status varchar(30) [not null]
  recipient_snapshot jsonb
  successful_recipient_snapshot jsonb
  failed_recipient_snapshot jsonb
  success_count int [default: 0]
  failed_count int [default: 0]
  error_summary text
  started_at timestamptz [not null]
  finished_at timestamptz
  created_at timestamp [default: `now()`]

  indexes {
    (report_run_id, attempt_no) [unique]
  }
}

// ===== SCHEMA: ai_runtime - MongoDB Collections (iccp_be_ai) =====
// Note: These are MongoDB collections represented as DBML tables for dbdiagram visualization.
Table ai_runtime.ai_model_configs {
  id uuid [primary key]
  provider varchar(50) [not null]
  transport varchar(50) [not null]
  purpose_codes jsonb [not null]
  model_name varchar(255) [not null]
  model_display_name varchar(255) [not null]
  api_key text [not null]
  api_key_masked varchar(255) [not null]
  api_base_url text
  sdk_name varchar(100)
  description text
  is_enabled boolean [default: true]
  applies_to_all_plans boolean [default: true]
  allowed_subscription_plan_codes jsonb [default: '[]']
  priority int [default: 100]
  created_by uuid [ref: > auth.users.id]
  updated_by uuid [ref: > auth.users.id]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
}

Table ai_runtime.conversations {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  title varchar(500)
  mode varchar(20) [default: 'rag']
  status varchar(20) [default: 'active']
  metadata jsonb [default: '{}']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  deleted_at timestamp
}

Table ai_runtime.messages {
  id uuid [primary key]
  conversation_id uuid [ref: > ai_runtime.conversations.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  user_id uuid [ref: > auth.users.id, not null]
  role varchar(20) [not null]
  content text [not null]
  image jsonb
  mode varchar(20)
  intent varchar(80)
  citations jsonb [default: '[]']
  web_sources jsonb [default: '[]']
  model_name varchar(255)
  model_used varchar(255)
  model_config_id uuid [ref: > ai_runtime.ai_model_configs.id]
  tokens_used int
  documents_retrieved int
  response_time_ms int
  metadata jsonb [default: '{}']
  created_at timestamp [default: `now()`]
}

Table ai_runtime.ingest_jobs {
  id uuid [primary key]
  document_id uuid [ref: > knowledge.documents.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  status varchar(30) [default: 'pending']
  chunks_count int
  error_message text
  started_at timestamp
  completed_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table ai_runtime.org_quotas {
  id uuid [primary key]
  organization_id uuid [ref: > tenant.organizations.id, not null, unique]
  monthly_message_limit int [default: 1000]
  monthly_messages_used int [default: 0]
  token_limit int [default: 10000000]
  tokens_used int [default: 0]
  monthly_ingestion_limit int [default: 100]
  monthly_ingestions_used int [default: 0]
  reset_at timestamp [not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table ai_runtime.user_quotas {
  id uuid [primary key]
  user_id uuid [ref: > auth.users.id, not null]
  organization_id uuid [ref: > tenant.organizations.id, not null]
  daily_message_limit int [default: 100]
  daily_messages_used int [default: 0]
  daily_token_limit int [default: 100000]
  daily_tokens_used int [default: 0]
  reset_at timestamp [not null]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (user_id, organization_id) [unique]
  }
}
