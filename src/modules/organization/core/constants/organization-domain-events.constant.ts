export const ORGANIZATION_DOMAIN_EVENTS = {
  ORGANIZATION_CREATED: 'organization.domain.created',
  MEMBER_JOINED: 'organization.domain.member.joined',
} as const;

export interface OrganizationCreatedDomainEvent {
  organizationId: string;
  ownerUserId: string;
  occurredAt: string;
}

export interface OrganizationMemberJoinedDomainEvent {
  organizationId: string;
  userId: string;
  invitedBy?: string;
  occurredAt: string;
}
