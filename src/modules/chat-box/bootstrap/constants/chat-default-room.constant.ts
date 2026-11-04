export const CHAT_DEFAULT_ROOM_KEYS = {
  ORGANIZATION_GENERAL: 'general',
  ORGANIZATION_ANNOUNCEMENTS: 'company-announcements',
} as const;

export const CHAT_DEFAULT_ROOM_NAMES = {
  ORGANIZATION_GENERAL: 'general',
  ORGANIZATION_ANNOUNCEMENTS: 'company-announcements',
} as const;

export function buildProjectGeneralRoomName(projectSlug: string): string {
  return `${projectSlug}-general`;
}

export function buildProjectGeneralRoomKey(projectId: string): string {
  return `project-${projectId}-general`;
}

export function isOrganizationAnnouncementsRoomKey(
  roomKey?: string | null,
): boolean {
  return (
    (roomKey ?? '').trim().toLowerCase() ===
    CHAT_DEFAULT_ROOM_KEYS.ORGANIZATION_ANNOUNCEMENTS
  );
}
