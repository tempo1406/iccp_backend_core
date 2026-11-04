export const WsRooms = {
  user: (userId: string) => `user:${userId}`,
  org: (orgId: string) => `org:${orgId}`,
  project: (projectId: string) => `project:${projectId}`,
  chatRoom: (roomId: string) => `chat-room:${roomId}`,
} as const;
