import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { User } from '@modules/users/entities/user.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { MaillerService } from '@modules/mail/mail.service';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import {
  INVITATION_EVENTS,
  InvitationCancelledEvent,
  InvitationResentEvent,
  InvitationSentEvent,
} from '../../invite-manager/constants/invitation-events.constant';

function toPlainText(value?: string | null): string | null {
  if (!value) return null;

  const plainText = value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText.length > 0 ? plainText : null;
}

@Injectable()
export class InvitationNotificationListener {
  constructor(
    private readonly notificationCoreService: NotificationCoreService,
    private readonly mailService: MaillerService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
  ) {}

  @OnEvent(INVITATION_EVENTS.SENT)
  async handleSent(event: InvitationSentEvent): Promise<void> {
    await this.mailService.sendMailInvitation(
      event.email,
      event.orgName,
      event.acceptUrl,
      dayjs(event.expiresAt).format('HH:mm - DD/MM/YYYY'),
      event.message,
    );

    const user = await this.userRepo.findOneBy({ email: event.email });
    if (!user) return;

    const inviter = await this.userRepo.findOneBy({ id: event.invitedBy });
    const organization = await this.organizationRepo.findOneBy({ id: event.orgId });
    const inviterName =
      [inviter?.firstName, inviter?.lastName].filter(Boolean).join(' ') ||
      inviter?.email ||
      'Ai đó';

    await this.notificationCoreService.send({
      userId: user.id,
      senderId: event.invitedBy,
      title: `${inviterName} đã mời bạn tham gia ${event.orgName}`,
      message:
        toPlainText(event.message) ||
        `Nhấn Accept để tham gia tổ chức ${event.orgName}`,
      content: event.message ?? undefined,
      type: 'invitation',
      data: {
        invitationId: event.invitationId,
        token: event.token,
        orgId: event.orgId,
        orgName: event.orgName,
        organizationSlug: organization?.slug ?? null,
        organizationWebsite: organization?.website ?? null,
        expiresAt: event.expiresAt.toISOString(),
        senderName: inviterName,
        senderAvatarUrl: inviter?.avatarUrl ?? null,
        customMessage: event.message ?? null,
      },
    });
  }

  @OnEvent(INVITATION_EVENTS.CANCELLED)
  async handleCancelled(event: InvitationCancelledEvent): Promise<void> {
    const user = await this.userRepo.findOneBy({ email: event.email });
    if (!user) return;

    await this.notificationCoreService.send({
      userId: user.id,
      title: `Lời mời vào ${event.orgName} đã bị huỷ`,
      message: `Lời mời tham gia tổ chức ${event.orgName} của bạn đã bị huỷ bởi admin.`,
      type: 'invitation_cancelled',
      data: { orgId: event.orgId, orgName: event.orgName },
    });
  }

  @OnEvent(INVITATION_EVENTS.RESENT)
  async handleResent(event: InvitationResentEvent): Promise<void> {
    await this.mailService.sendMailInvitation(
      event.email,
      event.orgName,
      event.acceptUrl,
      dayjs(event.expiresAt).format('HH:mm - DD/MM/YYYY'),
      event.message,
    );

    const user = await this.userRepo.findOneBy({ email: event.email });
    if (!user) return;

    const inviter = await this.userRepo.findOneBy({ id: event.invitedBy });
    const organization = await this.organizationRepo.findOneBy({ id: event.orgId });
    const inviterName =
      [inviter?.firstName, inviter?.lastName].filter(Boolean).join(' ') ||
      inviter?.email ||
      'Ai đó';

    await this.notificationCoreService.send({
      userId: user.id,
      senderId: event.invitedBy,
      title: `Lời mời vào ${event.orgName} đã được gửi lại`,
      message:
        toPlainText(event.message) ||
        `Lời mời tham gia tổ chức ${event.orgName} đã được làm mới.`,
      content: event.message ?? undefined,
      type: 'invitation',
      data: {
        invitationId: event.invitationId,
        token: event.token,
        orgId: event.orgId,
        orgName: event.orgName,
        organizationSlug: organization?.slug ?? null,
        organizationWebsite: organization?.website ?? null,
        expiresAt: event.expiresAt.toISOString(),
        senderName: inviterName,
        senderAvatarUrl: inviter?.avatarUrl ?? null,
        customMessage: event.message ?? null,
      },
    });
  }
}
