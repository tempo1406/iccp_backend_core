export enum ErrorCode {
  // Common Validation
  V000 = 'common.validation.error',
  V001 = 'common.validation.is_invalid_email',
  V002 = 'common.validation.is_invalid_password',
  V003 = 'common.validation.is_invalid_string',
  V004 = 'common.validation.is_not_empty',
  V005 = 'common.validation.is_invalid_date_format',
  V006 = 'common.validation.is_invalid_time_format',
  V007 = 'common.validation.is_invalid_phone_number',

  // Validation User || Auth
  U001 = 'user.validation.is_invalid_email',
  U002 = 'user.validation.is_invalid_password',
  U003 = 'user.validation.not_found',
  U004 = 'user.validation.is_invalid_email_or_password',
  U005 = 'user.validation.email_already_exists',
  U006 = 'user.validation.create_user_error',
  U007 = 'user.validation.not_verified',
  U008 = 'user.validation.otp_invalid',
  U009 = 'user.validation.already_verified',
  U010 = 'user.validation.account_inactive',
  U011 = 'user.validation.old_password_incorrect',

  // Validation Role
  R001 = 'role.validation.not_found',
  R002 = 'role.validation.name_already_exists',
  R003 = 'role.validation.permission_not_found',

  // Validation UserRole
  UR001 = 'user_role.validation.not_found',
  UR002 = 'user_role.validation.already_assigned',

  // Validation Organization
  O001 = 'organization.validation.not_found',
  O002 = 'organization.validation.slug_already_exists',
  O003 = 'organization.validation.member_not_found',
  O004 = 'organization.validation.invitation_not_found',
  O005 = 'organization.validation.invitation_expired',
  O006 = 'organization.validation.already_member',
  O007 = 'organization.validation.cannot_remove_owner',
  O008 = 'organization.validation.invitation_invalid_status',
  O009 = 'organization.validation.plan_not_found',
  O010 = 'organization.validation.paid_plan_requires_payment',

  // Validation Document Folder
  DF001 = 'document.folder.not_found',
  DF002 = 'document.folder.has_children',
  DF003 = 'document.folder.has_documents',
  DF004 = 'document.folder.cannot_move_to_descendant',
  DF005 = 'document.folder.name_already_exists',

  // Validation Document Category
  DC001 = 'document.category.not_found',
  DC002 = 'document.category.name_already_exists',

  // Validation Document
  DOC001 = 'document.not_found',
  DOC002 = 'document.upload_failed',
  DOC003 = 'document.version_not_found',
  DOC004 = 'document.already_inactive',
  // Validation Project
  P001 = 'project.validation.not_found',
  P002 = 'project.validation.member_not_found',
  P003 = 'project.validation.not_a_member',
  P004 = 'project.validation.already_member',
  P005 = 'project.validation.permission_code_invalid',

  // Validation Org Settings
  OS001 = 'org_settings.validation.kpi_weights_partial',
  OS002 = 'org_settings.validation.kpi_weights_sum_invalid',

  // Validation KPI Target
  KPT001 = 'kpi_target.validation.period_invalid',

  // Validation Notification
  N001 = 'notification.validation.not_found',
  N002 = 'notification.validation.target_org_required',
  N003 = 'notification.validation.target_roles_required',
  N004 = 'notification.validation.target_users_required',
  N005 = 'notification.campaign.not_found',
}
