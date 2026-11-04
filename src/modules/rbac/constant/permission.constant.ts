// Prefix permissions của org_admin
export const ORG_ADMIN_MODULES = [
  'tenant',
  'documents',
  'chatbot',
  'chat',
  'projects',
  'analytics',
  'daily_reports',
  'rbac',
  'ticket_requests',
  'notifications',
  'billing',
  'org_config',
];

// Permissions cụ thể của user thường
export const USER_PERMISSIONS = [
  'chat.rooms.list',
  'chat.rooms.view',
  'chat.rooms.create',
  'chat.rooms.update',
  'chat.members.list',
  'chat.members.add',
  'chat.members.invite',
  'chat.members.update',
  'chat.messages.list',
  'chat.messages.view',
  'chat.messages.create',
  'chat.messages.update',
  'chat.messages.delete',
  'chat.reactions.add',
  'chat.reactions.remove',
  'chat.attachments.list',
  'chat.attachments.upload',
  'chat.attachments.delete',
  'chat.pins.add',
  'chat.pins.remove',
  'chat.pins.list',
  'chat.presence.view',
  'chat.presence.update',
  'chatbot.use',
  'chatbot.conversations.list',
  'chatbot.conversations.view',
  'chatbot.conversations.create',
  'chatbot.conversations.update',
  'chatbot.conversations.delete',
  'chatbot.messages.list',
  'chatbot.messages.view',
  'chatbot.messages.create',
  'chatbot.citations.view',
  'chatbot.feedback.create',
  'documents.list',
  'documents.view',
  'projects.list',
  'projects.view',
  'ticket_requests.create',
  'ticket_requests.list_own',
  'ticket_requests.view',
  'ticket_requests.update_own',
  'ticket_requests.cancel_own',
  'ticket_requests.comment',
  'daily_reports.self.view',
  'daily_reports.self.manage',
  'org_config.working_time.view',
];

export const SYSTEM_ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  ORG_ADMIN: 'org_admin',
  USER: 'user',
} as const;

export const PERMISSIONS = {
  // =========================
  // TENANT / ORGANIZATIONS
  // =========================
  TENANT: {
    ORGANIZATIONS: {
      LIST: 'tenant.organizations.list',
      VIEW: 'tenant.organizations.view',
      CREATE: 'tenant.organizations.create',
      UPDATE: 'tenant.organizations.update',
      DELETE: 'tenant.organizations.delete',
      MANAGE_SETTINGS: 'tenant.organizations.manage_settings', // settings jsonb
      TRANSFER_OWNERSHIP: 'tenant.organizations.transfer_ownership', // owner_id
      MANAGE_LANDING_PAGE: 'tenant.organizations.manage_landing_page',
    },

    MEMBERS: {
      LIST: 'tenant.members.list',
      VIEW: 'tenant.members.view',
      ADD: 'tenant.members.add', // add/attach user to org
      UPDATE: 'tenant.members.update', // activate/deactivate
      REMOVE: 'tenant.members.remove',
    },

    INVITATIONS: {
      LIST: 'tenant.invitations.list',
      CREATE: 'tenant.invitations.create', // invite email
      CANCEL: 'tenant.invitations.cancel',
      RESEND: 'tenant.invitations.resend',
      ACCEPT: 'tenant.invitations.accept',
    },
  },

  // =========================
  // USERS (Auth-side)
  // =========================
  USERS: {
    LIST: 'users.list',
    VIEW: 'users.view',
    CREATE: 'users.create',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    ACTIVATE: 'users.activate',
    DEACTIVATE: 'users.deactivate',
    RESET_PASSWORD: 'users.reset_password',
    VIEW_SESSIONS: 'users.sessions.view',
    REVOKE_SESSIONS: 'users.sessions.revoke',
  },

  // =========================
  // RBAC
  // =========================
  RBAC: {
    PERMISSIONS: {
      LIST: 'rbac.permissions.list',
      VIEW: 'rbac.permissions.view',
      CREATE: 'rbac.permissions.create',
      UPDATE: 'rbac.permissions.update',
      DELETE: 'rbac.permissions.delete',
      SYNC: 'rbac.permissions.sync', // chạy seed/sync idempotent
    },

    ROLES: {
      LIST: 'rbac.roles.list',
      VIEW: 'rbac.roles.view',
      CREATE: 'rbac.roles.create',
      UPDATE: 'rbac.roles.update',
      DELETE: 'rbac.roles.delete',
      ASSIGN_PERMISSIONS: 'rbac.roles.assign_permissions',
      REVOKE_PERMISSIONS: 'rbac.roles.revoke_permissions',
    },

    USER_ROLES: {
      LIST: 'rbac.user_roles.list',
      ASSIGN: 'rbac.user_roles.assign', // gán role cho user (org/project scope)
      REVOKE: 'rbac.user_roles.revoke',
      VIEW: 'rbac.user_roles.view',
    },
  },

  // =========================
  // DOCUMENTS / KNOWLEDGE
  // =========================
  DOCUMENTS: {
    FOLDERS: {
      LIST: 'documents.folders.list',
      VIEW: 'documents.folders.view',
      CREATE: 'documents.folders.create',
      UPDATE: 'documents.folders.update',
      DELETE: 'documents.folders.delete',
      MOVE: 'documents.folders.move',
    },

    CATEGORIES: {
      LIST: 'documents.categories.list',
      VIEW: 'documents.categories.view',
      CREATE: 'documents.categories.create',
      UPDATE: 'documents.categories.update',
      DELETE: 'documents.categories.delete',
    },

    DOCUMENTS: {
      LIST: 'documents.list',
      VIEW: 'documents.view',
      CREATE: 'documents.create', // record create + metadata
      UPDATE: 'documents.update',
      DELETE: 'documents.delete',
      ACTIVATE: 'documents.activate',
      DEACTIVATE: 'documents.deactivate',

      UPLOAD_FILE: 'documents.upload', // file_path/file_name
      DOWNLOAD_FILE: 'documents.download',
      VIEW_METADATA: 'documents.metadata.view',
      UPDATE_METADATA: 'documents.metadata.update',

      // pipeline/indexing
      PROCESS: 'documents.process', // chuyển pending->processing->indexed/failed
      INDEX: 'documents.index', // indexed_at / chunks
      REINDEX: 'documents.reindex',
      VIEW_CHUNKS: 'documents.chunks.view',
      EDIT_CHUNKS: 'documents.chunks.edit', // hiếm, nếu có UI chỉnh chunk
      DELETE_CHUNKS: 'documents.chunks.delete',

      // versions
      CREATE_VERSION: 'documents.versions.create',
      LIST_VERSIONS: 'documents.versions.list',
      VIEW_VERSION: 'documents.versions.view',
      RESTORE_VERSION: 'documents.versions.restore',

      // access rules: organization/project/role
      MANAGE_ACCESS: 'documents.access.manage',
      VIEW_ACCESS: 'documents.access.view',
    },
  },

  // =========================
  // CHATBOT / RAG
  // =========================
  CHATBOT: {
    CONVERSATIONS: {
      LIST: 'chatbot.conversations.list',
      VIEW: 'chatbot.conversations.view',
      CREATE: 'chatbot.conversations.create',
      UPDATE: 'chatbot.conversations.update', // title, is_active...
      DELETE: 'chatbot.conversations.delete',
      ARCHIVE: 'chatbot.conversations.archive', // is_active false
      RESTORE: 'chatbot.conversations.restore',
    },

    MESSAGES: {
      LIST: 'chatbot.messages.list',
      VIEW: 'chatbot.messages.view',
      CREATE: 'chatbot.messages.create', // gửi message user
      DELETE: 'chatbot.messages.delete', // moderation/admin cleanup
    },

    RAG: {
      USE: 'chatbot.use', // quyền “được chat”
      RETRIEVE: 'chatbot.retrieve', // được phép gọi retriever (nếu tách)
      VIEW_CITATIONS: 'chatbot.citations.view',
    },

    FEEDBACK: {
      CREATE: 'chatbot.feedback.create',
      LIST: 'chatbot.feedback.list',
      VIEW: 'chatbot.feedback.view',
      DELETE: 'chatbot.feedback.delete',
    },
  },

  // =========================
  // TEAM CHAT
  // =========================
  CHAT: {
    ROOMS: {
      LIST: 'chat.rooms.list',
      VIEW: 'chat.rooms.view',
      CREATE: 'chat.rooms.create',
      UPDATE: 'chat.rooms.update',
      ARCHIVE: 'chat.rooms.archive',
      DELETE: 'chat.rooms.delete',
    },

    MEMBERS: {
      LIST: 'chat.members.list',
      INVITE: 'chat.members.invite',
      ADD: 'chat.members.add',
      UPDATE: 'chat.members.update',
      REMOVE: 'chat.members.remove',
    },

    MESSAGES: {
      LIST: 'chat.messages.list',
      VIEW: 'chat.messages.view',
      CREATE: 'chat.messages.create',
      UPDATE: 'chat.messages.update',
      DELETE: 'chat.messages.delete',
    },

    ATTACHMENTS: {
      LIST: 'chat.attachments.list',
      UPLOAD: 'chat.attachments.upload',
      DELETE: 'chat.attachments.delete',
    },

    REACTIONS: {
      ADD: 'chat.reactions.add',
      REMOVE: 'chat.reactions.remove',
    },

    PINS: {
      ADD: 'chat.pins.add',
      REMOVE: 'chat.pins.remove',
      LIST: 'chat.pins.list',
    },

    PRESENCE: {
      VIEW: 'chat.presence.view',
      UPDATE: 'chat.presence.update',
    },
  },

  // =========================
  // PROJECTS
  // =========================
  PROJECTS: {
    PROJECTS: {
      LIST: 'projects.list',
      VIEW: 'projects.view',
      CREATE: 'projects.create',
      UPDATE: 'projects.update',
      DELETE: 'projects.delete',
      ARCHIVE: 'projects.archive', // is_active false
      RESTORE: 'projects.restore',
      MANAGE_MEMBERS: 'projects.members.manage',
    },

    MEMBERS: {
      LIST: 'projects.members.list',
      ADD: 'projects.members.add',
      UPDATE: 'projects.members.update', // role_id, is_active
      REMOVE: 'projects.members.remove',
    },

    TASKS: {
      LIST: 'projects.tasks.list',
      VIEW: 'projects.tasks.view',
      CREATE: 'projects.tasks.create',
      UPDATE: 'projects.tasks.update',
      DELETE: 'projects.tasks.delete',
      ASSIGN: 'projects.tasks.assign', // assigned_to
      CHANGE_STATUS: 'projects.tasks.change_status',
      COMMENT: 'projects.tasks.comment',
      LOG_TIME: 'projects.tasks.log_time', // estimated/actual
    },

    DAILY_REPORTS: {
      VIEW_ALL: 'projects.daily_reports.view_all',
    },

    TASK_COMMENTS: {
      LIST: 'projects.task_comments.list',
      VIEW: 'projects.task_comments.view',
      CREATE: 'projects.task_comments.create',
      UPDATE: 'projects.task_comments.update',
      DELETE: 'projects.task_comments.delete',
    },

    STATUSES: {
      LIST: 'projects.statuses.list',
      VIEW: 'projects.statuses.view',
      CREATE: 'projects.statuses.create',
      UPDATE: 'projects.statuses.update',
      DELETE: 'projects.statuses.delete',
    },

    ATTACHMENTS: {
      LIST: 'projects.attachments.list',
      VIEW: 'projects.attachments.view',
      UPLOAD: 'projects.attachments.upload',
      DOWNLOAD: 'projects.attachments.download',
      DELETE: 'projects.attachments.delete',
    },

    ROLES: {
      LIST: 'projects.roles.list',
      VIEW: 'projects.roles.view',
      CREATE: 'projects.roles.create',
      UPDATE: 'projects.roles.update',
      DELETE: 'projects.roles.delete',
      ASSIGN_PERMISSIONS: 'projects.roles.assign_permissions',
      REVOKE_PERMISSIONS: 'projects.roles.revoke_permissions',
      ASSIGN_TO_MEMBER: 'projects.roles.assign_to_member',
      REVOKE_FROM_MEMBER: 'projects.roles.revoke_from_member',
    },
  },

  // =========================
  // TICKET REQUESTS
  // =========================
  TICKET_REQUESTS: {
    CREATE: 'ticket_requests.create',
    CREATE_OVERTIME: 'ticket_requests.create_overtime',
    LIST_OWN: 'ticket_requests.list_own',
    LIST_ORG: 'ticket_requests.list_org',
    VIEW: 'ticket_requests.view',
    UPDATE_OWN: 'ticket_requests.update_own',
    CANCEL_OWN: 'ticket_requests.cancel_own',
    APPROVE: 'ticket_requests.approve',
    DELEGATE: 'ticket_requests.delegate',
    COMMENT: 'ticket_requests.comment',
  },

  // =========================
  // BILLING
  // =========================
  BILLING: {
    PLANS: {
      LIST: 'billing.plans.list',
      VIEW: 'billing.plans.view',
      CREATE: 'billing.plans.create',
      UPDATE: 'billing.plans.update',
      DELETE: 'billing.plans.delete',
      ACTIVATE: 'billing.plans.activate',
      DEACTIVATE: 'billing.plans.deactivate',
    },

    SUBSCRIPTIONS: {
      LIST: 'billing.subscriptions.list',
      VIEW: 'billing.subscriptions.view',
      CREATE: 'billing.subscriptions.create',
      UPDATE: 'billing.subscriptions.update',
      CANCEL: 'billing.subscriptions.cancel',
      RENEW: 'billing.subscriptions.renew',
      CHANGE_PLAN: 'billing.subscriptions.change_plan',
    },

    INVOICES: {
      LIST: 'billing.invoices.list',
      VIEW: 'billing.invoices.view',
      CREATE: 'billing.invoices.create',
      UPDATE: 'billing.invoices.update',
      MARK_PAID: 'billing.invoices.mark_paid',
      CANCEL: 'billing.invoices.cancel',
      DOWNLOAD: 'billing.invoices.download',
    },

  },

  // =========================
  // ANALYTICS
  // =========================
  ANALYTICS: {
    VIEW_DASHBOARD: 'analytics.dashboard.view',

    CHAT: {
      VIEW: 'analytics.chat.view',
      EXPORT: 'analytics.chat.export',
    },

    DOCUMENTS: {
      VIEW: 'analytics.documents.view',
      EXPORT: 'analytics.documents.export',
    },

    USERS: {
      VIEW_ACTIVITY: 'analytics.users.activity.view',
      EXPORT_ACTIVITY: 'analytics.users.activity.export',
    },

    QUERIES: {
      VIEW_POPULAR: 'analytics.queries.popular.view',
      EXPORT_POPULAR: 'analytics.queries.popular.export',
    },

    KPI: {
      VIEW_PROJECT: 'analytics.kpi.project.view',
      VIEW_ORG: 'analytics.kpi.org.view',
      TARGET_MANAGE: 'analytics.kpi.target.manage',
      TARGET_VIEW: 'analytics.kpi.target.view',
    },

    REPORTS: {
      VIEW: 'analytics.reports.view',
      SEND: 'analytics.reports.send',
    },
  },

  // =========================
  // DAILY REPORTS
  // =========================
  DAILY_REPORTS: {
    SELF: {
      VIEW: 'daily_reports.self.view',
      MANAGE: 'daily_reports.self.manage',
    },
    TEAM: {
      VIEW: 'daily_reports.team.view',
    },
  },

  // =========================
  // ORG CONFIG
  // =========================
  ORG_CONFIG: {
    WORKING_TIME: {
      VIEW: 'org_config.working_time.view',
      MANAGE: 'org_config.working_time.manage',
    },
    SETTINGS: {
      VIEW: 'org_config.settings.view',
      MANAGE: 'org_config.settings.manage',
    },
  },

  // =========================
  // NOTIFICATIONS (org-scoped campaigns)
  // =========================
  NOTIFICATIONS: {
    CAMPAIGNS: {
      CREATE: 'notifications.campaigns.create',
      LIST: 'notifications.campaigns.list',
      VIEW: 'notifications.campaigns.view',
    },
  },

  // =========================
  // SYSTEM / AUDIT / NOTIFICATIONS
  // =========================
  SYSTEM: {
    AUDIT_LOGS: {
      LIST: 'system.audit_logs.list',
      VIEW: 'system.audit_logs.view',
      EXPORT: 'system.audit_logs.export',
    },

    SETTINGS: {
      LIST: 'system.settings.list',
      VIEW: 'system.settings.view',
      CREATE: 'system.settings.create',
      UPDATE: 'system.settings.update',
      DELETE: 'system.settings.delete',
    },

    NOTIFICATIONS: {
      LIST: 'system.notifications.list',
      VIEW: 'system.notifications.view',
      CREATE: 'system.notifications.create',
      MARK_READ: 'system.notifications.mark_read',
      DELETE: 'system.notifications.delete',
    },

    SYSTEM_LOGS: {
      LIST: 'system.logs.list',
      VIEW: 'system.logs.view',
      EXPORT: 'system.logs.export',
    },
  },
} as const;

// ----- Types helpers (type-safe) -----

type DeepValue<T> = T extends object ? DeepValue<T[keyof T]> : T;
export type PermissionCode = DeepValue<typeof PERMISSIONS>;

/**
 * (Optional) flatten ra mảng code để seed DB
 */
export function flattenPermissions(obj: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (!v) return;
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(obj);
  return out;
}
