export const PROJECT_DOMAIN_EVENTS = {
  PROJECT_CREATED: 'project.domain.created',
  MEMBER_JOINED: 'project.domain.member.joined',
} as const;

export interface ProjectCreatedDomainEvent {
  organizationId: string;
  projectId: string;
  projectSlug: string;
  ownerUserId: string;
  actorUserId: string;
  occurredAt: string;
}

export interface ProjectMemberJoinedDomainEvent {
  organizationId: string;
  projectId: string;
  userId: string;
  actorUserId: string;
  occurredAt: string;
}
