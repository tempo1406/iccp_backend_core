import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  TicketRequestActivity,
  TicketRequestActivityAction,
} from '../core/entities/ticket-request-activity.entity';
import { TicketRequestComment } from '../core/entities/ticket-request-comment.entity';
import { CreateTicketCommentRequest } from './dto/request/create-ticket-comment.request';
import { TicketRequestCommentResponse } from '../core/dto/response/ticket-request.response';
import { TicketRequestCoreService } from '../core/core.service';

@Injectable()
export class TicketRequestCommentService {
  constructor(
    @InjectRepository(TicketRequestComment)
    private readonly commentRepo: Repository<TicketRequestComment>,

    private readonly dataSource: DataSource,
    private readonly coreService: TicketRequestCoreService,
  ) {}

  async getComments(
    ticketId: string,
    orgId: string,
    callerId: string,
  ): Promise<TicketRequestCommentResponse[]> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    await this.coreService.ensureUserCanViewTicket(ticket, callerId, orgId);

    const comments = await this.commentRepo.find({
      where: { ticketRequestId: ticket.id },
      order: { createdAt: 'ASC' },
    });

    const authorMap = await this.coreService.loadUserMap(
      comments.map((item) => item.authorId),
    );

    return comments.map((item) => ({
      id: item.id,
      content: item.content,
      author: authorMap.get(item.authorId)!,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async addComment(
    ticketId: string,
    orgId: string,
    authorId: string,
    dto: CreateTicketCommentRequest,
  ): Promise<TicketRequestCommentResponse> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    await this.coreService.ensureUserCanViewTicket(ticket, authorId, orgId);

    const comment = await this.dataSource.transaction(async (manager) => {
      const created = manager.create(TicketRequestComment, {
        ticketRequestId: ticket.id,
        authorId,
        content: dto.content,
      });
      const saved = await manager.save(created);

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId: authorId,
          action: TicketRequestActivityAction.COMMENTED,
          payload: {
            commentId: saved.id,
          },
        }),
      );

      return saved;
    });

    const authorMap = await this.coreService.loadUserMap([authorId]);

    const watcherIds = await this.coreService.getWatcherIds(ticket, ticket.id);
    const recipients = watcherIds.filter((userId) => userId !== authorId);

    void this.coreService.notifyUsers(
      recipients,
      `[Ticket ${ticket.code}] New comment`,
      `A new comment was added to this ticket request.`,
      {
        ticket,
        actorId: authorId,
        action: TicketRequestActivityAction.COMMENTED,
      },
    );

    return {
      id: comment.id,
      content: comment.content,
      author: authorMap.get(authorId)!,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
