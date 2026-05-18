export const NOTIFICATION_ACTIVITY_EVENT_TYPES = [
  'chat.mention',
  'chat.thread.reply',
  'chat.reaction',
  'chat.invitation',
  'chat.invitation.updated',
] as const;

export type NotificationFeedScopeValue = 'activity' | 'all_only';

export function resolveNotificationFeedScopeFromData(
  data?: Record<string, unknown> | null,
): NotificationFeedScopeValue {
  const eventType = typeof data?.['eventType'] === 'string' ? data.eventType : '';
  if (
    NOTIFICATION_ACTIVITY_EVENT_TYPES.includes(
      eventType as (typeof NOTIFICATION_ACTIVITY_EVENT_TYPES)[number],
    )
  ) {
    return 'activity';
  }

  return 'all_only';
}

export function decorateNotificationDataWithFeedScope(
  data?: Record<string, unknown> | null,
): Record<string, unknown> {
  return {
    ...(data ?? {}),
    feedScope: resolveNotificationFeedScopeFromData(data),
  };
}
